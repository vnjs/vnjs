"use strict";

// PENDING: ES6 imports for this?
const grammar = require("./vnjsgrammar.js");
const nearley = require("nearley");

const Tokenizer = require('./vnjstokenizer').Tokenizer;



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
  let col = 0;
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
        ++col;
      }
    }
  }
  return { line, col };
}

function calcAddress(parser, loc) {
  return parser.vn_tokens[loc][2];
}



// Evaluates and composes a scene script.

function SceneComposer() {


  function parseScene(code_string, filename) {

    // Tokenize the string,
    const tokenizer = Tokenizer(code_string);
    const tokens = tokenizer.getTokens();

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
//        console.error("Parse error at line:", position.line, " column:", position.col);

        let error_str = "Parse error; ";
        if (!filename) {
          filename = '[EVAL]';
        }
        error_str += filename + ":" + position.line + ":" + position.col;

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


  
  function expr(p, stats) {
    // NOTE: Duck typing,
    if (typeof p === 'string') {
      // Local ident
      stats.ids.push(p);
      return "p.getV('" + p + "')";
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
          return v;
        case 'NULL':
          return "null";
        case '(':
          return '( ' + expr(v, stats) + ' )';
        default:
          throw Error("Unknown token:" + t);
      }
    }
    // If function,
    else {
      const { f, l, r } = p;
      let s = expr(l, stats);

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
      s += expr(r, stats);
      return s;
    }
  }
  
  // Converts parse tree of an expression to an anonymous javascript function, or
  // a constant. If this method returns a function then it can be used when
  // necessary by the interpreter.
  function toJSValue(pt) {
    if (pt === null) {
      return null;
    }
  
    let stats = { ids:[] };
  
    // Create the JavaScript that executes the operation,
    let evaluation_string = expr(pt, stats);
  
    // Generate the function using 'eval',
    const generated_function = eval('(function (p) { return ' + evaluation_string + ' })');
    
    // If there are no idents used in the expression then it's safe to execute it
    // here to produce a constant,
    if (stats.ids.length === 0) {
      return ['value', generated_function()];
    }
    else {
      // Otherwise we have to evaluate this at runtime,
      return ['function', evaluation_string];
    }

  }
  
  // Parse the args set,
  function toArgs(pt) {
    // Assert,
    assert(pt.t === 'ARGS');
    
    const d = pt.d;
    const out = {};
    for (let k in d) {
      out[k] = toJSValue(d[k]);
    }

    return out;
  }

  function prepareFunction(func) {
    const ident = func.l;
    const args = toArgs(func.r);
    return [ 'call', ident, args ];
  }
  
  // Given a block of code, produces the functional code to be executed,
  function prepareBlock(parser, block) {
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
          const jsf = toJSValue(stmt.r);
          exec_block.stmts.push( [ calcAddress(parser, stmt.loc), 'assign', ident, jsf ] );
        }
        else if (fun === 'call') {  // Function call
          exec_block.stmts.push( [ calcAddress(parser, stmt.loc), 'nbcall', prepareFunction(stmt) ] );
        }
        // Language operations,
        else if (fun === 'goto' || fun === 'preserve' || fun === 'evaluate') {
          const ident = stmt.l;
          exec_block.stmts.push( [ calcAddress(parser, stmt.loc), fun, ident ] );
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
          const conditional = toJSValue(e);
          const block = prepareBlock(parser, b);

          const if_prod = [ calcAddress(parser, stmt.loc), 'if', conditional, block ];
          o.forEach( (s) => {
            if_prod.push(toJSValue(s.e));
            if_prod.push(prepareBlock(parser, s.b));
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


  function prepareBaseStatement(parser, base_stmt) {

    const ls = base_stmt.f;
    if (ls === 'let') {

      // The identifier,
      const identifier = base_stmt.l;
      // The function or expression,
      const expression = base_stmt.r;
      
      let e;
      if (expression.f === 'call') {
        e = prepareFunction(expression);
      }
      else if (expression.t === 'INLINE') {
        e = [ 'inline', expression.v ];
      }
      else {
        e = toJSValue(expression);
      }
      
      return [ calcAddress(parser, base_stmt.loc), 'let', identifier, e ];
      
    }
    else if (ls === 'refcall') {
      
//      console.log("----");
//      console.log(base_stmt);
//      console.log("----");
//      throw Error("PENDING");
      
      // The identifier,
      const identifier = base_stmt.l;

      return [ calcAddress(parser, base_stmt.loc),
               'refcall', identifier, prepareFunction(base_stmt.r) ];
      
    }
    else {
      console.error(base_stmt);
      throw Error("Unknown op type");
    }
  
  }

  function prepareDefine(parser, define_stmt) {
    
    // The define identifier,
    const identifier = define_stmt.l;
    // The define block of statements,
    const block = define_stmt.r;
    
    // Prepare the block code,
    const pb = prepareBlock(parser, block);
    
    return { label:identifier, block:pb };

  }
  
  // Prepares a scene tree. This transforms the parser output into a form that
  // is trivially interpretable. Expressions are turned into anonymous JavaScript
  // functions.
  function prepareSceneTree(parser, base) {
    
    const statements = [];
    const defines = [];
    const imports = [];
    
    // Converts the tree to a series of js functions to be evaluated,
    base.forEach( (base_stmt) => {
      // base_stmt can only be one of the following functions;
      //   'let':    Assigns an identifier to an asset.
      //   'define': Defines a scene execution.
      
      const stmt_type = base_stmt.f;
      switch(stmt_type) {
        case 'let':
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
        default:
          console.error(stmt_type);
          throw Error('PENDING base statement');
      }
      
    });

    const out = {
      imports:[],
      base_stmts:[],
      defines:{}
    };
    
    // Process the base statement blocks,
    statements.forEach( (base_stmt) => {
      const prepared_stmt = prepareBaseStatement(parser, base_stmt);
      out.base_stmts.push( prepared_stmt );
    });
    
    // Process the define blocks,
    defines.forEach( (define_stmt) => {
      const prepared_define = prepareDefine(parser, define_stmt);
      out.defines[prepared_define.label] = prepared_define.block;
    });

    imports.forEach( (import_stmt) => {
      out.imports.push( [ calcAddress(parser, import_stmt.loc),
                          toJSValue(import_stmt.l)[1] ]);
    });


    return out;
    
  }


  function prepareSource(code_string, filename) {

    let tree;
    (function() {
      // Create a Parser object from our grammar.
      const p = parseScene(code_string, filename);
    
      if (p.results.length > 1) {
        console.error("WARNING: Ambiguous grammar detected!");
        console.error("There's ", p.results.length, " possibilities.");
      }
    
      tree = prepareSceneTree( p, p.results[0] );

    })();
    
    // Returns an object that references the prepared code tree, the source tokens,
    // and a function that calculates the line and column given an offset value.
    const out = {
      hash:hashFnv32a(code_string, false),
      tree:tree,
      calcLineColumn: function(offset) {
        return calculateScriptPosition(code_string, offset);
      }
    };
    return out;

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
  //           calcLineColumn: (function that computes line/col given address)
  //       },
  //       ... next file ...
  //   }
  //
  function prepareCodebase(sourceLoader, filename, callback) {
    
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
    
    function loadAndResolve(filename) {

      loading[filename] = -1;
    
      function scriptLoadCallback(err, data) {
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
          nimports.forEach( (nimport) => {
            const fn = nimport[1];
            // If this import hasn't been loaded yet,
            if (loading[fn] === void 0) {
              loadAndResolve(fn);
            }
          });
          
          // If everything is loaded,
          let all_loaded = true;
          for (let key in loading) {
            if (loading[key] === -1) {
              all_loaded = false;
              break;
            }
          }
          if (all_loaded) {
            callback(null, codebase);
          }
        }
        catch (e) {
          callbackError(e);
        }
      }

      sourceLoader(filename, scriptLoadCallback);
    }
    
    loadAndResolve(filename);
    
  }



  // Public API
  return {
    prepareSource,
    prepareCodebase
  }
  
}

exports.SceneComposer = SceneComposer;
