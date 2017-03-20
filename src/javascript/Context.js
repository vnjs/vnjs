
// An implementation of Context. This object is designed for state
// persistence and forward and backwards transitions.

function Context(frontend) {

  let idefine = '';
  let ipos = -1;  
  
  let cur_src_filename = '';
  let cur_src_pos = -1;

  let constants;
  
  // The global variables object (hidden and public),
  const global_vars = {};
  // Used to access values from 'global_vars'
  const accessor = {
    getV: function(prop) {
      // Is it a global constant?
      const cvalue = constants.global_varset[prop];
      if (cvalue === void 0) {
        // No, so return from global variables,
        return global_vars[prop];
      }
      else {
        // Yes, so...
        // If it's a 'function' then it can only be accessed in the frontend,
        // therefore we have to fail.
        // Otherwise, it's a static value so we can resolve it.
        if (cvalue[1][0] === 'value') {
          return cvalue[1][1];
        }
        else {
          throw Error("Asset '" + prop + "' is only available to the front end");
        }
      }
    }
  };
  
  
  
  // Map of global objects registered into the frontend.
  const loaded_constants_cache = {};

  // Map of function source code loaded into the frontend.
  //   function_id -> function_source_code
  const loaded_functions_cache = {};
  
  // Map of compiled function expressions.
  // Maps from 'function id' to the compiled version of the function code.
  const compiled_fun_cache = {};  
  
  // Resolves the function given function id and the source code. Returns
  // the JavaScript function object. Once the function is compiled it's
  // put into the cache.
  function resolveFunction(fun_id, fun_source) {
    let fcompiled = compiled_fun_cache[fun_id];
    if (fcompiled !== void 0) {
      return fcompiled;
    }
    fcompiled = eval.call(null, fun_source);
    compiled_fun_cache[fun_id] = fcompiled;
    return fcompiled;
  }
  
  
  
  // Given an argument object from the abstract syntax tree, converts it
  // into a more convenient form for javascript, including sending any
  // functions that have constant dependents to the front end.
  function convertArgs( args, no_global_vars ) {
    const argv = {};
    for (let arg_ident in args) {
      const expr = args[arg_ident];
      if (expr[0] === 'function') {
        const dependents = expr[2];
        const has_constants = loadConstants(dependents, no_global_vars);
        if (has_constants) {
          const function_id = expr[3];
          loadFunction(function_id, expr[1]);
          argv[arg_ident] = { f: function_id };
        }
        else {
          // Doesn't have global constants so we evaluate it here
          // and pass the result to the front end,
          argv[arg_ident] = { v: resolveExpression(expr) };
        }
      }
      else {
        // Static value, so just pass it to the front end,
        argv[arg_ident] = { v: resolveExpression(expr) };
      }
    }
    return argv;
  }

  function doLoadConstant(v) {
    // Is it already loaded?
    if (loaded_constants_cache[v] === void 0) {
      loaded_constants_cache[v] = -1;

      const { var_dependencies, global_varset } = constants;
      // Recurse over the constant dependencies,
      const deps = var_dependencies[v];
      for (let i = 0; i < deps.length; ++i) {
        doLoadConstant(deps[i][0]);
      }
      // Load this one,
      const out = [];
      const varset = global_varset[v];

      const vtype = varset[1][0];
      
      if (vtype === 'call') {
        // The constructor call,
        const constr = varset[1];
        out.push( [ 'c', constr[1], convertArgs(constr[2], true) ] );
        for (let i = 2; i < varset.length; ++i) {
          // Mutators,
          const mutat = varset[i][1];
          out.push( [ 'f', mutat[1], convertArgs(mutat[2], true) ] );
        }
      }
      else if (vtype === 'inline') {
        const inline = varset[1];
        out.push( ['i', inline[1], inline[2] ] );
        for (let i = 2; i < varset.length; ++i) {
          // Mutators,
          const mutat = varset[i][1];
          out.push( [ 'f', mutat[1], convertArgs(mutat[2], true) ] );
        }
      }
      else if (vtype === 'value') {
        // Static,
        out.push( [ 'v', varset[1][1] ] );
      }
      else {
        throw Error(vtype);
      }
      frontend.loadConstant(v, out);
    }
  }

  // Iterates through the list of variables, and for each variable that's
  // a global constant, load the dependents and the variable to the front
  // end.
  function loadConstants(var_list, no_global_vars) {
    let gc_count = 0;
    const len = var_list.length;
    const to_load = [];
    for (let i = 0; i < len; ++i) {
      const v = var_list[i];
      const cvalue = constants.global_varset[v];
      if (cvalue !== void 0) {
        // This is a global constant!
        ++gc_count;
        // Load it into the front end,
        to_load.push(v);
      }
      else if (no_global_vars) {
        // NOTE: Parser should already report this as an error, so
        //   consider this an assertion.
        throw Error("Assert failed: Reference to global variable from constant '" + v + "'");
      }
    }
    to_load.forEach( (v) => {
      doLoadConstant(v);
    });
    return gc_count > 0;

  }
  
  function loadFunction(function_id, function_source_code) {
    if (loaded_functions_cache[function_id] === void 0) {
      loaded_functions_cache[function_id] = function_source_code;
      frontend.loadFunction(function_id, function_source_code);
    }
  }
  
  function setIDefine(idef) {
    idefine = idef;
  }
  function setIPos(ip) {
    ipos = ip;
  }
  function getIDefine() {
    return idefine;
  }
  function getIPos() {
    return ipos;
  }
  
  function initialize(cb) {
    frontend.initialize(cb);
  }
  
  // Sets the current source location of the statement being processed. This
  // is used for debugging and error reporting.
  function setSourceLocation(filename, src_pos) {
    cur_src_filename = filename;
    cur_src_pos = src_pos;
  }
  
  // The VNJS interpretation of truth, with respect to conditional branching
  function isTruthCondition(v) {
    return v === true;
  }
  
  function resolveExpression(expr) {
    const t = expr[0];
    if (t === 'value') {            // static value
      return expr[1];
    }
    else if (t === 'function') {    // function value,
      const unique_fun_id = expr[3];
      // Transform the function into an executable form,
      const fun = resolveFunction(unique_fun_id, expr[1]);
      return fun.call(null, accessor);
    }
    else {
      throw Error('Unexpected conditional type: ' + t);
    }
  }


  function isConditionalTrue(expr) {
    return isTruthCondition( resolveExpression(expr) );
  }

  // -----

  // Executes an 'assignment' operation.
  function execAssign(ident, expr) {

    const val = resolveExpression(expr);
    // Set the value,
    global_vars[ident] = val;
    frontend.execAssign(ident, val);

  }
  
  // Executes a function call operation.
  function execCall(ident, args, cb) {

    // For function calls, we attempt to resolve all argument values, however if
    // it's not possible because of a dependency on a static, the function is
    // passed to the front end to be executed there.

    const argv = convertArgs(args); 
    frontend.execCall(ident, argv, cb);

  }
  
  // Evaluates the set of conditions in 'condition_set' and returns an index
  // to the first condition that evaluates to true, or -1 if no conditions
  // evaluate to true.
  function orMatch(condition_set) {
    for (let i = 0; i < condition_set.length; ++i) {
      // null matches all,
      if (condition_set[i] === null) {
        return i;
      }
      else {
        const res = isConditionalTrue(condition_set[i]);
        if (res) {
          return i;
        }
      }
    }
    return -1;
  }

  // Constants info,
  function setConstantsInfo(constants_in) {
    constants = constants_in;
  }




  return {

    setIDefine,
    setIPos,
    getIDefine,
    getIPos,

    initialize,
    setSourceLocation,
    setConstantsInfo,

    execAssign,
    execCall,
    orMatch,

  }

}



exports.Context = Context;
