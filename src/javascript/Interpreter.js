"use strict";

function Interpreter(parsed_vn) {




  
  // Creates a dependency set for resolving the given variable name in the given
  // file,
  function resolveDependency(context) {

    

  }
  
  
  
  // Initialize the context state. This validates and interprets all the
  // definition operations (global variables, etc). This should only happen
  // once. Any errors here will generally be show stopping.
  //
  // Each vnjs file defines a set of exported identified values.
  function initializeState(context) {

    console.log("INITIALIZE");
    console.log(parsed_vn);

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
