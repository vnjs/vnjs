"use strict";

function Interpreter(codebase) {


  function syntaxError(msg, filename, errorat) {
    throw Error(msg + " (" + filename + ":" + errorat.line + ":" + errorat.column + ")");
  }

  function sourceLoc(filename, src_pos) {
    const p = codebase[filename].calcLineColumn(src_pos);
    return '(' + filename + ':' + p.line + ':' + p.column + ')';
  }
  
  

  function resolveExports(exported_vars, filename, import_stack) {

    // Check for circular import dependencies,
    if (import_stack.indexOf(filename) >= 0) {
      return;
//      throw Error("Circular import dependency: " + import_stack.toString());
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

    // Resolve the exports for this file,
    // The base statements,
    const base_stmts = tree.base_stmts;
    for (let i = 0; i < base_stmts.length; ++i) {
      const stmt = base_stmts[i];
      const src_pos = stmt[0];
      const type = stmt[1];

      if (type === 'const') {
        const ident = stmt[2];
        const rhs = stmt[3];  // Either 'call', 'function' or 'value'

        if (thisvnjs_varnames[ident] === void 0) {
          thisvnjs_varnames[ident] = [ src_pos, rhs ];
          thisvnjs_var_assign_order.push(ident);
          // NOTE: Currently all variables are exported into global space,
          thisvnjs_exports.push(ident);
        }
        else {
          // Oops, multiple of the same definition,
          syntaxError("'" + ident + "' duplicate declaration",
                      filename, calcLineColumn(src_pos));
        }
      }
      else if (type === 'refcall') {
        // Refcalls can only reference identifiers that are defined in the local scope,
        const ident = stmt[2];
        const rhs = stmt[3];  // Always a 'call'

        const varop = thisvnjs_varnames[ident];
        if (varop === void 0) {
          syntaxError("'" + ident + "' not found", filename, calcLineColumn(src_pos));
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

    exported_vars[filename] = { depends: imports,
                                exports: thisvnjs_exports,
                                assign_order : thisvnjs_var_assign_order,
                                varops : thisvnjs_varnames };

    for (let i = 0; i < imports.length; ++i) {
      // Resolve all the exports for the files we import first,
      resolveExports(exported_vars, imports[i][1], import_stack);
    }

    // Pop from the import stack,
    import_stack.pop();

  }


////  Checks all references to make sure they resolve against their dependencies
////  only.  
//  function checkReferences(exported_vars) {
//    
//    // Is this variable exported in the dependencies?
//    function findFirstResolve(v, depends) {
//      for (let i = 0; i < depends.length; ++i) {
//        const fn = depends[i][1];
//        const fob = exported_vars[fn];
//        // Check exported vars,
//        if (fob.exports.indexOf(v) >= 0) {
//          return { filename:fn };
//        }
//        // Check resolved vars,
//        else {
//          const r = findFirstResolve(v, fob.depends);
//          if (r !== null) {
//            return r;
//          }
//        }
//      }
//      return null;
//    }
//
//    for (let filename in exported_vars) {
//      
//      const { calcLineColumn } = codebase[filename];
//      
//      function checkFunctionVarsResolve(src_pos, op, local_set, depends) {
//        const dvars = op[2];
//        if (dvars !== void 0) {
//          for (let i = 0; i < dvars.length; ++i) {
//            // Check local set,
//            if (local_set.indexOf(dvars[i]) === -1) {
//              // Check dependencies,
//              const resolved_at = findFirstResolve(dvars[i], depends);
//              if (resolved_at === null) {
//                // Local variable clobbers an imported variable,
//                syntaxError("'" + dvars[i] + "' not found", filename, calcLineColumn(src_pos));
//              }
//            }
//          }
//        }
//      }
//
//      function checkCallVarsResolve(src_pos, op, local_set, depends) {
//        const args_map = op[2];
//        for (let k in args_map) {
//          const arg_val = args_map[k];
//          if (arg_val[0] === 'function') {
//            checkFunctionVarsResolve(src_pos, arg_val, local_set, depends);
//          }
//        }
//      }
//      
//      const fob = exported_vars[filename];
//      const depends = fob.depends;
//      const varops = fob.varops;
//      // Local vars in assign order,
//      const local_vars = fob.assign_order;
//      
//      const local_set = [];
//      
//      for (let i = 0; i < local_vars.length; ++i) {
//        const local_v = local_vars[i];
//        const vara = varops[local_v];
//        const src_pos = vara[0];
//        const vop = vara[1];
//        const resolved_at = findFirstResolve(local_v, depends);
//        if (resolved_at !== null) {
//          // Local variable clobbers an imported variable,
//          syntaxError("'" + local_v + "' already declared in " + resolved_at.filename, filename, calcLineColumn(src_pos));
//        }
//        
//        // Now check the varops,
//        // vop is either 'function' or 'call'
//        if (vop[0] === 'function') {
//          checkFunctionVarsResolve(src_pos, vop, local_set, depends);
//        }
//        else if (vop[0] === 'call') {
//          checkCallVarsResolve(src_pos, vop, local_set, depends);
//          for (let n = 2; n < vara.length; ++n) {
//            const nop = vara[n];
//            const nsrc_pos = nop[0];
//            const nvop = nop[1];
//            checkCallVarsResolve(nsrc_pos, nvop, local_set, depends);
//          }
//        }
//        
//        local_set.push(local_v);
//        
//      }
//
//    }
//    
//  }


  // Calls closure for every variable assigned,
  function forEachReference(exported_vars, closure) {
    for (let filename in exported_vars) {
      const { depends, exports, assign_order, varops } = exported_vars[filename];
      assign_order.forEach( (local_var) => {
        const varop = varops[local_var];
        closure(filename, local_var, varop, assign_order);
      });
    }
  }

  // Checks there are no duplicated global variables.
  // Also checks there are no circular references. For example;
  //   a = b; b = c; c = a;
  function checkReferences(exported_vars, errors) {
    
    // Build set of all global variables,
    
    const globals = {};

    for (let filename in exported_vars) {
      const { depends, exports, assign_order, varops } = exported_vars[filename];

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

    const var_dependencies = {};

    // Closure called on every reference,
    forEachReference(exported_vars, (filename, v, varop, local_set) => {
      const src_pos = varop[0];
      const vop = varop[1];

      function addCallRefs(callop, src_pos, var_refs) {
        if (callop[0] !== 'call') throw Error("Assert failed: " + callop[0]);

        // The argument map,
        const arg_map = callop[2];
        for (let ak in arg_map) {
          const argv = arg_map[ak];
          if (argv[0] === 'function') {
            argv[2].forEach( (v) => {
              var_refs.push( [v, src_pos] );
            });
          }
        }

      }

      const var_refs = [];
      if (vop[0] === 'function') {
        // The list of variables this function references,
        vop[2].forEach( (v) => {
          var_refs.push( [v, src_pos] );
        });
        
      }
      else if (vop[0] === 'call') {
        addCallRefs(vop, src_pos, var_refs);
        for (let i = 2; i < varop.length; ++i) {
          addCallRefs(varop[i][1], varop[i][0], var_refs);
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
        errors.push("'" + v + "' not found " + sourceLoc(var_filename, src_pos));
      }
      else {
        
        if (stack.indexOf(v) >= 0) {
          errors.push("Circular dependency on variable '" + v + "' [" + stack.toString() + "] " + sourceLoc(var_filename, src_pos));
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
    
//    console.log("GLOBALS");
//    console.log(globals);
//    console.log("DEPS");
//    console.log(var_dependencies);
    
    // Check for circular dependencies,
    const stack = [];
    const pruner = {};
//    console.log(var_dependencies);
    for (let v in var_dependencies) {
      checkNotCircular('', 0, v, var_dependencies, stack, pruner);
    }

    
  }


  
  // Creates a dependency set for resolving the given variable name in the given
  // file,
  function resolveDependency(exported_vars, filename, varname) {

    const fob = exported_vars[filename];
    const vop = fob.varops[varname];
    // Fetch all the dependant variables,
    

  }
  
  
  
  // Initialize the context state. This validates and interprets all the
  // definition operations (global variables, etc). This should only happen
  // once. Any errors here will generally be show stopping.
  //
  // Each vnjs file defines a set of exported identified values.
  function initializeState(context, filename) {
    
    // The map of exported vars per file,
    const exported_vars = {};
    const import_stack = [];
    
    const errors = [];
    
    // Resolve the exported variables from each vnjs file,
    resolveExports(exported_vars, filename, import_stack);
    
    // Now check that all references can be resolved,
    checkReferences(exported_vars, errors);
    
    
    if (errors.length > 0) {
      errors.forEach( (err) => {
        console.error("ERROR: " + err);
      });
      throw Error("There were errors");
    }
    
    
    
    
    return exported_vars;
    
  }

  function runDefine(context, defineName) {
    
  }


  // Public API,
  return {
    initializeState,
    runDefine
  };
  
}

exports.Interpreter = Interpreter;
