"use strict";

// PENDING: ES6 imports for this?
const grammar = require("./vnjsgrammar.js");
const nearley = require("nearley");
const sourceMap = require("source-map");

const Tokenizer = require('./vnjstokenizer').Tokenizer;


// HACK: Ugly eval hack to provide a node.js and browser 'encode64'
//   function without causing browserify to shim a Buffer implementation in
//   the generated package.
const encode64 = eval(
"( function() {" +
"  if (typeof window !== 'undefined' && window.btoa !== void 0) return window.btoa;" +
"  else return function(ascii) { return new Buffer(ascii).toString('base64') }" +
"})")();

const INCLUDE_SOURCEMAP_FOR_FUNCTIONS = true;
const EVAL_GEN_POS = { line: 1, column: 0 };



function assert(condition, msg) {
  if (!condition) {
    throw Error(msg || "Assert failed");
  }
}



/**
 * Calculate a 32 bit FNV-1a hash
 * Found here: https://gist.github.com/vaiorabbit/5657561
 * Ref.: http://isthe.com/chongo/tech/comp/fnv/
 *
 * @param {string} str the input value
 * @param {boolean} [asString=false] set to true to return the hash value as 
 *     8-digit hex string instead of an integer
 * @param {integer} [seed] optionally pass the hash of the previous chunk
 * @returns {integer | string}
 */
function hashFnv32a(str, asString, seed) {
  /*jshint bitwise:false */
  var i, l,
      hval = (seed === undefined) ? 0x811c9dc5 : seed;

  for (i = 0, l = str.length; i < l; i++) {
    hval ^= str.charCodeAt(i);
    hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
  }
  if( asString ){
    // Convert to 8 digit hex string
    return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
  }
  return hval >>> 0;
}



// Calculates the line and column of the given offset,
function calculateScriptPosition(code_string, offset) {
  let line = 1;
  let column = 0;
  let found_col = false;
  while (offset >= 0) {
    const ch = code_string.charAt(offset);
    --offset;
    if (ch === '\n') {
      ++line;
      found_col = true;
    }
    if (!found_col) {
      if (ch !== '\r') {
        ++column;
      }
    }
  }
  return { line, column };
}

// Generates a base64 encoded sourceMappingURL,
function toInlineBase64Inline(generator, nl_separator) {
  if (nl_separator === void 0) {
    nl_separator = '\n';
  }
  const encoding =
      ( nl_separator +
        "//# sourceMappingURL=data:application/json;charset=utf-8;base64," +
        encode64(generator.toString()) + nl_separator );
  return encoding;
}


// Evaluates and composes a scene script.

function SceneComposer() {

  // Creates a unique function id,
  let unique_function_id = 1;
  function createUniqueFunctionID() {
    ++unique_function_id;
    return unique_function_id;
  }


  // Tokenize and parse the file using Nearley
  function parseScene(code_string, filename) {

    // Tokenize the string,
    const tokenizer = Tokenizer(code_string);
    const tokens = tokenizer.getTokens();

//    console.log(tokens);

//    // Assert the token set can be reconstructed into the code string,
//    let recons = '';
//    for (let m = 0; m < tokens.length; ++m) {
//      recons += tokens[m][1];
//    }
//    assert(recons === code_string);

    // Create a Parser object from our grammar.
    const p = new nearley.Parser(grammar.ParserRules, grammar.ParserStart);
    // HACK: Attach vn_tokens to the nearley parser object,
    p.vn_tokens = tokens;
    try {
      p.feed(tokens);
    }
    catch (parse_e) {
      const coffset = parse_e.offset;
      let position;
      if (coffset) {
        position = calculateScriptPosition(code_string, tokens[coffset][2]);

        let error_str = "Parse error; ";
        if (!filename) {
          filename = '[EVAL]';
        }
        error_str += filename + ":" + position.line + ":" + position.column;

        throw Error(error_str);

      }
      throw parse_e;
    }
    if (p.results.length === 0) {
      // Not terminated,
      throw Error("Parse error; Unexpected end of file");
    }
    return p;
  }

  // Expose all these functions to parser and code_source,
  function CodeParser(filename, parser, code_source) {
    
    const tokens = parser.vn_tokens;
    
    function calcAddress(loc) {
      return tokens[loc][2];
    }

    // Converts string into string expression if necessary. For example,
    // 'Hello ${player_name}.' converts to ('Hello ' + p.getV('player_name') + '.')
    function toStringExpr(in_tok, stats, reference_qualifier) {
      let out = '';
      const str = in_tok.v;
      const len = str.length;
      let ignore_next = false;
      let str_quotes = str.charAt(0);
      let sp = 1;
      let block_start = -1;
      for (let i = 1; i < len - 1; ++i) {
        const ch = str.charAt(i);
        if (ch === '\\') {
          ignore_next = true;
        }
        else if (ignore_next === false && ch === '$') {
          if (str.charAt(i + 1) === '{') {
            block_start = i;
          }
        }
        else if (ch === '}' && block_start >= 0) {
          // Process the expression,
          const lhs = str_quotes + str.substring(sp, block_start) + str_quotes;
          const expression_str = str.substring(block_start + 2, i);

          // Tokenize and parse the expression.
          // If there's an error, we report the string location as the error.
          const st = Tokenizer(expression_str);
          const tokens = st.getTokens();
          // Create a Parser object from our grammar.
          // PERFORMANCE: Couldn't we reuse a 'nearley.Parser' instance for parsing
          //   these (usually) very small expression strings?
          const expression_parser =
                        new nearley.Parser(grammar.ParserRules, 'general_expression');
          try {
            expression_parser.feed(tokens);
            if (expression_parser.results.length === 0) {
              // Not terminated,
              throw Error("Parse error; Unexpected end of expression");
            }
          }
          catch (parse_e) {
            const position = calculateScriptPosition(code_source, calcAddress(in_tok.loc));
            let error_str = "Parse error; ";
            if (!filename) {
              filename = '[EVAL]';
            }
            error_str += filename + ":" + position.line + ":" + position.column;
            throw Error(error_str);
          }

          // Form the expression,
          const res = expression_parser.results[0];
          out += lhs + " + (" + expr(res, stats, reference_qualifier) + ") + ";

          sp = i + 1;
          block_start = -1;
        }
        ignore_next = false;
      }

      // If no expressions found,
      if (sp === 1) {
        return str;
      }
      else {
        out += str_quotes + str.substring(sp, len);
        return out;
      }

    }

    function expr(p, stats, reference_qualifier) {
      // NOTE: Duck typing,
      if (typeof p === 'string') {
        const qualified_ident = reference_qualifier(p);
        // Local ident
        stats.ids.push(qualified_ident);
        return "p.getV('" + qualified_ident + "')";
      }
      // If token,
      else if (p.t) {
        const { t, v } = p;
        switch (t) {
          case 'NUMBER':
            return v;
          case 'BOOLEAN':
            return v.toString();
          case 'STRING':
            return toStringExpr(p, stats, reference_qualifier);
          case 'NULL':
            return "null";
          case '(':
            return '( ' + expr(v, stats, reference_qualifier) + ' )';
          default:
            throw Error("Unknown token:" + t);
        }
      }
      // If function,
      else {
        const { f, l, r } = p;
        let s = expr(l, stats, reference_qualifier);

        switch (f) {

          case '+':
            s += " + ";
            break;
          case '-':
            s += " - ";
            break;
          case '*':
            s += " * ";
            break;
          case '/':
            s += " / ";
            break;

          case '>':
            s += " > ";
            break;
          case '<':
            s += " < ";
            break;
          case '>=':
            s += " >= ";
            break;
          case '<=':
            s += " <= ";
            break;
          case '==':
            s += " == ";
            break;
          case '===':
            s += " === ";
            break;
          case '!=':
            s += " != ";
            break;
          case '!==':
            s += " !== ";
            break;

          case '&&':
            s += " && ";
            break;
          case '||':
            s += " || ";
            break;

          case 'u!':
            s = '! ' + s;
            return s;
          case 'u-':
            s = '- ' + s;
            return s;
          
          default:
            throw Error("Unknown function:", f);
        }
        s += expr(r, stats, reference_qualifier);
        return s;
      }
    }
    
    // Compiles a function expression,
    function compileFunctionExpression(pt, src_loc, stats, ref_qualifier, no_source_map) {

      // Create the JavaScript that executes the operation,
      let evaluation_string = expr(pt, stats, ref_qualifier);

      // Generate the function using 'eval',
      let gen_function_source = '(function (p) { return ' + evaluation_string + ' })';

      // Otherwise we have to evaluate at runtime.
      if ( !no_source_map && INCLUDE_SOURCEMAP_FOR_FUNCTIONS ) {
        if (src_loc !== void 0) {
          // Embed a url encoded source map for this function,
          // This helps us with debugging. If this function generates an exception
          // then the stacktrace will reference the true source of the error.
          const pos = calculateScriptPosition(code_source, calcAddress(src_loc));
          const generator = new sourceMap.SourceMapGenerator({});
          generator.addMapping({
            source: filename,
            original: pos,
            generated: EVAL_GEN_POS
          });
          gen_function_source += toInlineBase64Inline(generator, '\n');
        }
        else {
          console.error(pt);
          throw Error("Unable to generate source map for expression");
        }
      }
      return gen_function_source;
    }

    // Converts parse tree of an expression to an anonymous javascript function, or
    // a constant. If this method returns a function then it can be used when
    // necessary by the interpreter.
    function toJSValue(pt, parent_loc, ref_array) {
      if (pt === null) {
        return null;
      }

      // The "don't qualify" qualifier,
      const no_qualifier = (p) => { return p };
      const stats = { ids:[] };

      const src_loc = (typeof pt === 'string') ? parent_loc : pt.loc;

      // Compile the expression into source code so we can work out dependencies
      // and possibly execute it if we know it produces a static result,
      const gen_function_source =
              compileFunctionExpression(pt, src_loc, stats, no_qualifier, true);
      
      // If there are no idents used in the expression then it's safe to execute it
      // here to produce a constant,
      // For example '(10 * 20)',
      if (stats.ids.length === 0) {
        let generated_function = eval(gen_function_source);
        return [ 'value', generated_function() ];
      }
      else {
        // Otherwise we return a function that creates the source code to be
        // qualified later,
        const sourceGenerator = function sourceGenerator(ref_qualifier, stats) {
          if (stats === void 0) {
            stats = { ids:[] };
          }
          return compileFunctionExpression(pt, src_loc, stats, ref_qualifier, false);
        };
        const fun_a = [ 'function', [ calcAddress(src_loc), sourceGenerator ], stats.ids, createUniqueFunctionID() ];
        ref_array.push(fun_a);
        return fun_a;
      }

    }
    
    // Parse the args set,
    function toArgs(pt, ref_array) {
      // Assert,
      assert(pt.t === 'ARGS');
      
      const d = pt.d;
      const out = {};
      for (let k in d) {
        out[k] = toJSValue(d[k], pt.loc, ref_array);
      }

      return out;
    }

    function convertInlineCodeString(tok) {
      // The function string wrapped as a single expression,
      const function_string = '(' + tok.v + ')';
      // The starting location,
      let start_loc = tok.loc;
      let pos = calculateScriptPosition(code_source, calcAddress(start_loc));
      // PENDING: We could tokenize function_string here and remove comments or
      //   do other minification/obfuscation.
      
      // Do a simple line by line source map,
      // Count the number of lines,
      let line_count = 1;
      let i;
      for(i = 0; i < function_string.length; ++i){
        if(function_string[i] === '\n') {
          ++line_count;
        }
      }

      // Map all lines,
      let gen = { line: 1, column: 0 };
      const generator = new sourceMap.SourceMapGenerator({});
      for (i = 0; i < line_count; ++i) {
        generator.addMapping({
          source: filename,
          original: pos,
          generated: gen
        });
        pos.line += 1;
        pos.column = 0;
        gen.line += 1;
      }

      // Windows or Unix line separator in the source code?
      let nl_separator = '\n';
      if (function_string.indexOf("\r\n") >= 0) {
        nl_separator = '\r\n';
      }
      // Encode and inline the source map,
      return function_string + toInlineBase64Inline(generator, nl_separator);
    }
    
    function prepareFunction(func, ref_array) {
      const ident = func.l;
      const args = toArgs(func.r, ref_array);
      return [ 'call', ident, args ];
    }
    
    // Given a block of code, produces the functional code to be executed,
    function prepareBlock(block, ref_array, nb_call_array) {
      // Assert,
      assert(block.t === 'BLOCK');
      
      // The statements array,
      const nested_stmts = block.v;
      
      // We group statements into an execution block,
      const exec_block = {
        stmts:[]
      };
      
      // Using 'for' loop for performance,
      const len = nested_stmts.length;
      for (let i = 0; i < len; ++i) {
        const stmt = nested_stmts[i];

        if (stmt.f) {
          // A function call,
          const fun = stmt.f;
          
          if (fun === '=') {          // Assignment,
            const ident = stmt.l;
            const jsf = toJSValue(stmt.r, stmt.loc, ref_array);
            exec_block.stmts.push( [ calcAddress(stmt.loc), 'assign', ident, jsf ] );
          }
          else if (fun === 'call') {  // Function call
            const nbcall = [ calcAddress(stmt.loc), 'nbcall', prepareFunction(stmt, ref_array) ];
            nb_call_array.push(nbcall);
            exec_block.stmts.push(nbcall);
          }
          // Language operations,
          else if (fun === 'goto' || fun === 'preserve' || fun === 'evaluate') {
            const ident = stmt.l;
            exec_block.stmts.push( [ calcAddress(stmt.loc), fun, ident ] );
          }
          else {
            console.error("PENDING statement: ", stmt);
            throw Error("PENDING statement");
          }
          
        }
        else {
          // Must be a token, such as 'IF',
          const tok = stmt.t;
          
          if (tok === 'IF') {       // Conditional,
            const {e, b, o} = stmt;
            // e = expression
            // b = block
            // o = other array (eg, else, elseif)
            const conditional = toJSValue(e, stmt.loc, ref_array);
            const block = prepareBlock(b, ref_array, nb_call_array);

            const if_prod = [ calcAddress(stmt.loc), 'if', conditional, block ];
            o.forEach( (s) => {
              if_prod.push(toJSValue(s.e, s.loc, ref_array));
              if_prod.push(prepareBlock(s.b, ref_array, nb_call_array));
            });
            
            exec_block.stmts.push( if_prod );
            
          }
          else {
            console.error("PENDING token: ", stmt);
            throw Error("PENDING token");
          }
        }
        
      }
      
      return exec_block;
      
    }


    function prepareBaseStatement(base_stmt, ref_array) {

      const ls = base_stmt.f;
      if (ls === 'const') {

        // The identifier,
        const identifier = base_stmt.l;
        // The function or expression,
        const expression = base_stmt.r;
        const src_loc = base_stmt.loc;
        
        let e;
        if (expression.f === 'call') {
          e = prepareFunction(expression, ref_array);
        }
        else if (expression.t === 'INLINE') {
          // Convert to inline code string.
          const inline_source = convertInlineCodeString(expression);
          e = [ 'inline', inline_source, createUniqueFunctionID() ];
        }
        else {
          e = toJSValue(expression, src_loc, ref_array);
        }
        
        return [ calcAddress(src_loc), 'const', identifier, e ];
        
      }
      else if (ls === 'refcall') {
        
        // The identifier,
        const identifier = base_stmt.l;

        return [ calcAddress(base_stmt.loc),
                 'refcall', identifier, prepareFunction(base_stmt.r, ref_array) ];
        
      }
      else {
        console.error(base_stmt);
        throw Error("Unknown op type");
      }
    
    }

    function prepareDefine(define_stmt, ref_array, nb_call_array) {
      
      // The define identifier,
      const identifier = define_stmt.l;
      // The define block of statements,
      const block = define_stmt.r;
      
      // Prepare the block code,
      const pb = prepareBlock(block, ref_array, nb_call_array);
      
      return { label:identifier, block:pb };

    }
    
    
    // Prepares a scene tree. This transforms the parser output into a form that
    // is trivially interpretable. Expressions are turned into anonymous JavaScript
    // functions.
    function prepareSceneTree(parser, base) {
      
      const statements = [];
      const defines = [];
      const imports = [];
      const installs = [];
      
      // Converts the tree to a series of js functions to be evaluated,
      base.forEach( (base_stmt) => {
        // base_stmt can only be one of the following functions;
        //   'const':  Assigns an identifier to an asset.
        //   'define': Defines a scene execution.
        
        const stmt_type = base_stmt.f;
        switch(stmt_type) {
          case 'const':
            // Add to list,
            statements.push(base_stmt);
            break;
          case 'refcall':
            // Add to list,
            statements.push(base_stmt);
            break;
          case 'define':
            defines.push(base_stmt);
            break;
          case 'import':
            imports.push(base_stmt);
            break;
          case 'install':
            installs.push(base_stmt);
            break;
          default:
            console.error(stmt_type);
            throw Error('PENDING base statement');
        }
        
      });

      // Create a package name from filename,
      const pparts = filename.split('/');
      let namespace_name = '';
      for (const i = 0; i < pparts.length; ++i) {
        if (i > 0) {
          namespace_name += '#';
        }
        let nsp = pparts[i];
        const dl = nsp.indexOf('.');
        if (dl == 0) {
          throw Error('Invalid file path for .vnjs package: ' + filename);
        }
        if (dl > 0) {
          nsp = nsp.substring(0, dl);
        }
        namespace_name += nsp;
      }

      const ref_array = [];
      const nb_call_array = [];

      const out = {
        namespace:namespace_name,
        imports:[],
        installs:[],
        base_stmts:[],
        defines:{},
        ref_array,
        nb_call_array
      };
      
      // Process the base statement blocks,
      statements.forEach( (base_stmt) => {
        const prepared_stmt = prepareBaseStatement(base_stmt, ref_array);
        out.base_stmts.push( prepared_stmt );
      });
      
      // Process the define blocks,
      defines.forEach( (define_stmt) => {
        const prepared_define = prepareDefine(define_stmt, ref_array, nb_call_array);
        out.defines[prepared_define.label] = prepared_define.block;
      });

      imports.forEach( (import_stmt) => {
        const istmt_loc = import_stmt.loc;

        // Assert,
        if (import_stmt.r.t !== 'STRING') {
          throw Error('Assert failed: Expecting a STRING tok');
        }

        const to_import = import_stmt.l;
        // NOTE: This is a bit of a nasty 'eval'. I hope there's no security issues
        //   by doing this. However, if there are then it'll also be a security
        //   issue with the usual function execution system.
        const import_from = eval.call(null, import_stmt.r.v);
        
        out.imports.push( [ calcAddress(istmt_loc), to_import, import_from ] );
      });

      installs.forEach( (install_stmt) => {
        const install_stmt_loc = install_stmt.loc;
        
        // The install target (either a string or an inline),
        const target_expr = install_stmt.l;

        let e;
        if (target_expr.t === 'INLINE') {
          // Convert to inline code string.
          const inline_source = convertInlineCodeString(target_expr);
          e = [ 'inline', inline_source, createUniqueFunctionID() ];
        }
        else {
          e = toJSValue(target_expr, install_stmt_loc, ref_array);
        }

        out.installs.push( [ calcAddress(install_stmt_loc), 'install', e ] );
      });

      return out;
      
    }

    // Output API,
    return {
      prepareSceneTree
    };

  };
  
  
  


  function prepareSource(code_string, filename) {

    let tree;
    (function() {
      
      // Create a Parser object from our grammar.
      const p = parseScene(code_string, filename);
    
      if (p.results.length > 1) {
        console.error("WARNING: Ambiguous grammar detected!");
        console.error("There's ", p.results.length, " possibilities.");
      }
    
      const code_parser = CodeParser(filename, p, code_string);
      tree = code_parser.prepareSceneTree( p, p.results[0] );

    })();
    
    // Returns an object that references the prepared code tree, the source tokens,
    // and a function that calculates the line and column given an offset value.
    const out = {
      hash: hashFnv32a(code_string, false),
      tree: tree,
      calcLineColumn: function(offset) {
        return calculateScriptPosition(code_string, offset);
      }
    };
    return out;

  }
  
  
  // Final stage of codebase process. This performs some static analysis of the
  // tree to help with dependency tracking.
  function processCodebase(codebase, input_filenames) {

    const errors = [];
    const exported_vars = {};
    const globals = {};
    const global_defineset = {};
    const var_dependencies = {};
    const import_stack = [];

    function sourceLoc(filename, src_pos) {
      const p = codebase[filename].calcLineColumn(src_pos);
      return '(' + filename + ':' + p.line + ':' + p.column + ')';
    }

    function syntaxError(msg, filename, src_pos) {
      errors.push(msg + ' ' + sourceLoc(filename, src_pos));
    }

    // Calls closure for every variable assigned,
    function forEachReference(closure) {
      for (let filename in exported_vars) {
        const { assign_order, varops } = exported_vars[filename];
        assign_order.forEach( (local_var) => {
          const varop = varops[local_var];
          closure(filename, local_var, varop);
        });
      }
    }

    // Attempts to qualify the variable reference,
    function qualifyIdentifier(filename, v, src_pos) {
      const { namespace, depends } = exported_vars[filename];

      // Qualify the input variable. If the input variable doesn't qualify
      // against the local namespace then tries to qualify it against the
      // dependants.
      const in_v = v;
      // If it's not already qualified?
      if (v.indexOf('#') < 0) {
        // Does it quality locally?
        let tv = namespace + '#' + v;
        if (globals[tv] === void 0) {
          tv = v;
          // No, so try and resolve it against the imports,
          depends.forEach( (d) => {
            const import_var = d[1];
            const import_fname = d[2];
            // Catch all,
            if (import_var === '*' || import_var === v) {
              const qual_v = exported_vars[import_fname].namespace + '#' + v;
              if (qual_v in globals) {
                if (tv === v || tv === qual_v) {
                  tv = qual_v;
                }
                else {
                  errors.push( 'Ambiguous reference \'' + v + '\'. Resolves to ' + qual_v + ' and ' + tv + '. ' + sourceLoc(filename, src_pos) );
                }
              }
            }
          });
          
        }

        v = tv;
      }
      return v;
    }

    // Checks there are no duplicated global variables.
    // Also checks there are no circular references. For example;
    //   a = b; b = c; c = a;
    //
    // Populates the 'globals' object with details of all global objects.
    // Populates the 'var_dependencies' object.
    //
    function checkReferences() {
      
      // Build set of all global variables,
      
      for (let filename in exported_vars) {
        const { exports, varops } = exported_vars[filename];

        // Add all exports to global set,
        exports.forEach( (e) => {
          // Ok, variable clash here.
          const te = [ filename, varops[e][0] ];
          if (globals[e] !== void 0) {
            const g1 = globals[e];
            errors.push( 'Duplicate declared global \'' + e + '\' found. At ' + sourceLoc(g1[0], g1[1]) + ' and ' + sourceLoc(te[0], te[1]) );
          }
          globals[e] = te;
        });
        
      }

      // Closure called on every reference,
      forEachReference( (filename, v, varop) => {
        const src_pos = varop[0];
        const vop = varop[1];
        
        // Attempts to qualify the variable reference,
        function addDependent(var_refs, v, src_pos) {
          const qualified_v = qualifyIdentifier(filename, v, src_pos);
          var_refs.push( [ qualified_v, src_pos, v ] );
          return qualified_v;
        }

        function addCallRefs(callop, src_pos, var_refs) {
          if (callop[0] !== 'call') throw Error("Assert failed: " + callop[0]);

          // The argument map,
          const arg_map = callop[2];
          for (let ak in arg_map) {
            const argv = arg_map[ak];
            if (argv[0] === 'function') {
              const varr = argv[2];
              for (const nn = 0; nn < varr.length; ++nn) {
                varr[nn] = addDependent(var_refs, varr[nn], src_pos);
              }
            }
          }
        }

        function checkNoRefCalls() {
          // Syntax error if there's call references here,
          if (varop.length > 2) {
            const nsrc_pos = varop[2][0];
            syntaxError("Context call not allowed ", filename, nsrc_pos);
          }
        }

        const var_refs = [];
        const ttype = vop[0];
        if (ttype === 'function') {
          // Syntax error if there are ref calls on this constant,
          checkNoRefCalls();

          // The list of variables this function references,
          const varr = vop[2];
          for (const nn = 0; nn < varr.length; ++nn) {
            varr[nn] = addDependent(var_refs, varr[nn], src_pos);
          }
        }
        else if (ttype === 'call') {
          // Add the call id as a dependence,
          vop[1] = addDependent(var_refs, vop[1], src_pos);
          // Handle ref calls,
          addCallRefs(vop, src_pos, var_refs);
          for (let i = 2; i < varop.length; ++i) {
            addCallRefs(varop[i][1], varop[i][0], var_refs);
          }
        }
        else if (ttype === 'inline') {
          // Inline function may have ref calls,
          for (let i = 2; i < varop.length; ++i) {
            addCallRefs(varop[i][1], varop[i][0], var_refs);
          }
        }
        else {
          if (ttype === 'value') {
            // Syntax error if there are ref calls on this constant,
            checkNoRefCalls();
          }
          else {
            throw new Error('Unhandled type: ' + ttype);
          }
        }
        
        // Build the dependency map,
        var_dependencies[v] = var_refs;

      });

      function checkNotCircular(var_filename, src_pos, v, var_deps, stack, var_pruner) {
        // We've already checked this variable, so exit early.
        if (var_pruner[v] === -1) {
          return;
        }
        
        const globv = globals[v];
        if (globv === void 0) {
          // Variable not found,
          syntaxError("'" + v + "' not found ", var_filename, src_pos);
        }
        else {
          
          if (stack.indexOf(v) >= 0) {
            syntaxError("Circular dependency on variable '" + v + "' [" + stack.toString() + "] ", var_filename, src_pos);
            return;
          }
          stack.push(v);

          const filename = globv[0];

          const dependants = var_deps[v];
          dependants.forEach((dep) => {
            const dep_v = dep[0];
            const dep_src_pos = dep[1];
            checkNotCircular(filename, dep_src_pos, dep_v, var_deps, stack, var_pruner);
          });

        }

        var_pruner[v] = -1;
        stack.pop();
      }
      
      // Check for circular dependencies,
      const stack = [];
      const pruner = {};
      for (let v in var_dependencies) {
        checkNotCircular('', 0, v, var_dependencies, stack, pruner);
      }

    }

    // Resolve all exported variables, creates a map with a key for each file
    // which references an object with the following fields;
    //
    //   const { depends, exports, assign_order, varops } = exported_vars[filename]
    //
    function resolveExports(filename) {

      // Check for circular import dependencies,
      if (import_stack.indexOf(filename) >= 0) {
        return;
      }

      // Push to the import stack,
      import_stack.push(filename);

      // If the exports already resolved for file,
      if (exported_vars[filename] !== void 0) {
        return;
      }

      // The prepared file object,
      const { hash, tree, calcLineColumn } = codebase[filename];

      // The imports for this file,
      const imports = tree.imports;

      const thisvnjs_varnames = {};
      const thisvnjs_exports = [];
      const thisvnjs_var_assign_order = [];

      const thisvnjs_namespace = tree.namespace;

      // Resolve the exports for this file,
      // The base statements,
      const base_stmts = tree.base_stmts;
      for (let i = 0; i < base_stmts.length; ++i) {
        const stmt = base_stmts[i];
        const src_pos = stmt[0];
        const type = stmt[1];

        if (type === 'const') {
          const ident = thisvnjs_namespace + '#' + stmt[2];
          const rhs = stmt[3];  // Either 'call', 'function' or 'value'

          if (thisvnjs_varnames[ident] === void 0) {
            thisvnjs_varnames[ident] = [ src_pos, rhs ];
            thisvnjs_var_assign_order.push(ident);
            // NOTE: Currently all variables are exported into global space,
            thisvnjs_exports.push(ident);
          }
          else {
            // Oops, multiple of the same definition,
            syntaxError("'" + ident + "' duplicate declaration", filename, src_pos);
            import_stack.pop();
            return;
          }
        }
        else if (type === 'refcall') {
          // Mutator call,
          const ident = thisvnjs_namespace + '#' + stmt[2];
          const rhs = stmt[3];  // Always a 'call'

          const varop = thisvnjs_varnames[ident];
          if (varop === void 0) {
            syntaxError("'" + ident + "' not found", filename, src_pos);
            import_stack.pop();
            return;
          }
          else {
            // Make a list of all operations to execute on this,
            varop.push( [ src_pos, rhs ] );
          }
        }
        else {
          throw Error("Unexpected type: " + type);
        }
      }

      // Process the defines map,
      const defines = tree.defines;
      for (let define in defines) {
        const def_stmts = defines[define].stmts;
        // Put them in the global define set,
        global_defineset[define] = [ filename, def_stmts ];
      }

      exported_vars[filename] = { namespace: thisvnjs_namespace,
                                  depends: imports,
                                  exports: thisvnjs_exports,
                                  assign_order : thisvnjs_var_assign_order,
                                  varops : thisvnjs_varnames };

      for (let i = 0; i < imports.length; ++i) {
        // Resolve all the exports for the files we import first,
        resolveExports(imports[i][2]);
      }

      // Pop from the import stack,
      import_stack.pop();

    }

    // Resolve the exports,
    input_filenames.forEach( (ifn) => {
      resolveExports(ifn);
    });
    if (errors.length === 0) {
      checkReferences();
      
      // Qualify,
      if (errors.length === 0) {

        for (const fn in codebase) {
          // Qualify all references,
          const ref_array = codebase[fn].tree.ref_array;
          for (const i = 0; i < ref_array.length; ++i) {
            const vop = ref_array[i];
            const src_loc = vop[1][0];
            const sourceGenerator = vop[1][1];
            const stats = { ids:[] };
            // Compile it and overwrite the code,
            vop[1] = sourceGenerator( (v) => {
              return qualifyIdentifier(fn, v, src_loc);
            }, stats);
            vop[2] = stats.ids;
          }
          // Qualify all calls,
          const nb_call_array = codebase[fn].tree.nb_call_array;
          for (const i = 0; i < nb_call_array.length; ++i) {
            const call_op = nb_call_array[i];
            const src_pos = call_op[0];
            const call_identifier = call_op[2][1];
            const qualified_call_id = qualifyIdentifier(fn, call_identifier, src_pos);
//            console.log("Qualified ", call_identifier, " to ", qualified_call_id);
            // Check this global exists,
            if (!qualified_call_id in globals) {
              syntaxError('Function not found: ' + call_identifier, fn, src_pos);
            }
            call_op[2][1] = qualified_call_id;
          }
          
        }

      }
      
    }

    const installs_map = {};
    if (errors.length === 0) {
      // The install code,
      // Maps codebase namespace to static installs necessary to support those
      // functions.
      for (const fn in codebase) {
        const fn_tree = codebase[fn].tree;
        const fn_installs = fn_tree.installs;
        const namespace = fn_tree.namespace;
        const fn_iarr = [];
        fn_installs.forEach( (ifnc) => {
          const src_pos = ifnc[0];
          const fn_inst_val = ifnc[2];
          // PENDING: Support installing file scripts (eg. './system.js')
          if (fn_inst_val[0] !== 'inline') {
            syntaxError('Currently only inline installs are supported', fn, src_pos);
          }
          fn_iarr.push(fn_inst_val);
        } );
        installs_map[namespace] = fn_iarr;
      }
    }

    if (errors.length > 0) {
      errors.forEach( (error) => {
        console.error(error);
      });
      throw Error("There were errors. See the console.")
    }
    else {
      const global_varset = {};
      
      // Clean up codebase,
      for (const fn in codebase) {
        const fn_tree = codebase[fn].tree;
        delete fn_tree.imports;
        delete fn_tree.base_stmts;
        delete fn_tree.defines;
        delete fn_tree.installs;
        delete fn_tree.ref_array;
        delete fn_tree.nb_call_array;
        codebase[fn].tree.depends = exported_vars[fn].depends;
        codebase[fn].tree.exports = exported_vars[fn].exports;

        const m = exported_vars[fn].varops;
        for (const v in m) {
          global_varset[v] = m[v];
        }
      }

      const out = {
        assign_location: globals,
        var_dependencies : var_dependencies,
        global_varset : global_varset,
        global_defineset : global_defineset,
        installs_map : installs_map,
        codebase : codebase
      };
      
      return out;
    }

  }


  // Prepares the entire codebase given the base file and a source loader. Once
  // all files are prepared then calls 'callback'.
  //
  //   sourceLoader = function(filename, cb)
  //       where cb = function(err, data)
  //
  // Produces an object with the following structure;
  //
  //   codebase = {
  //       [filename]: {
  //           hash: (unique id),
  //           tree: (JSONable parse tree),
  //           calcLineColumn: (function that computes line/column given address)
  //       },
  //       ... next file ...
  //   }
  //
  function prepareCodebase(sourceLoader, filenames, callback) {
    
    const input_filenames = filenames;
    
    // Only callback error one time,
    let error_reported = false;
    function callbackError(err) {
      if (!error_reported) {
        callback(err);
        error_reported = true;
      }
    }

    // Track scripts being imported,
    const loading = {};
    // The result codebase,
    const codebase = {};
    
    function loadAndResolve(filenames) {

      filenames.forEach( (filename) => {
        loading[filename] = -1;
      });
    
      filenames.forEach( (filename) => {
        
        sourceLoader(filename, (err, data) => {

          loading[filename] = 1;
          // Failed to load file,
          if (err) {
            callbackError(err);
            return;
          }
          try {
            const code = prepareSource(data, filename);
            codebase[filename] = code;
            
            const nimports = code.tree.imports;
            const to_load = [];
            nimports.forEach( (nimport) => {
              const fn = nimport[2];
              // If this import hasn't been loaded yet,
              if (loading[fn] === void 0 && to_load.indexOf(fn) < 0) {
                to_load.push(fn);
              }
            });
            loadAndResolve(to_load);
            
            // If everything is loaded,
            let all_loaded = true;
            for (let key in loading) {
              if (loading[key] === -1) {
                all_loaded = false;
                break;
              }
            }
            if (all_loaded) {
              // Final process stage of the codebase,
              try {
                callback(null, processCodebase(codebase, input_filenames));
              }
              catch (err) {
                callback(err);
              }
            }
          }
          catch (e) {
            callbackError(e);
          }
          
        });

      });
    }
    
    loadAndResolve(filenames);
    
  }



  // Public API
  return {
    prepareSource,
    prepareCodebase
  }
  
}

exports.SceneComposer = SceneComposer;
