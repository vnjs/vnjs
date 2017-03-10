
// An implementation of Context. This object is designed for state
// persistence and forward and backwards transitions.

function Context(frontend) {

  let idefine = '';
  let ipos = -1;  
  
  let cur_src_filename = '';
  let cur_src_pos = -1;

  // The global variables object (hidden and public),
  const global_vars = {};
  // Used to access values from 'global_vars'
  const accessor = {
    getV: function(prop) {
      return global_vars[prop];
    }
  };
  
  
  
  
  
  
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
    fcompiled = eval(fun_source);
    compiled_fun_cache[fun_id] = fcompiled;
    return fcompiled;
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
  
//  // Returns a soft version of the expression. Either an array starting with
//  // 's' indicating a static value, or starting with 'f' indicating a function with the
//  // unique function id.
//  function softExpression(expr) {
//    const t = expr[0];
//    if (t === 'value') {            // static value
//      return [ 's', expr[1] ];
//    }
//    else if (t === 'function') {    // function value,
//      return [ 'f', expr[3] ];
//    }
//    else {
//      throw Error('Unexpected conditional type: ' + t);
//    }
//  }
  
  
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

    const argv = {};
    for (let arg_ident in args) {
      const expr = args[arg_ident];
      argv[arg_ident] = resolveExpression(expr);
    }
    
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
  
  
  
  return {
    
    setIDefine,
    setIPos,
    getIDefine,
    getIPos,
    
    initialize,
    setSourceLocation,
    
    execAssign,
    execCall,
    orMatch,
    
  }

}



exports.Context = Context;
