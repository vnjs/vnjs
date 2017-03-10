"use strict";

function Interpreter(parsed_vn) {

//  console.log(parsed_vn);

  const global_defineset = parsed_vn.global_defineset;

  
  // Finds the block of statements (as entry at top of stack) of the statement
  // with the given position. Returns the index within the array of the position.
  function findPosition(stmts, ipos, stack) {
    stack.push(stmts);
    // Search for the first statement to process,
    let p = 0;
    const len = stmts.length;
    for (; p < len; ++p) {
      const stmt = stmts[p];
      const pos = stmt[0];
      if (ipos < pos) {
        // This is the current instruction pointer location,
        return p;
      }
      // Is it an 'if' branch?
      if (stmt[1] === 'if') {
        for (let i = 3; i < stmt.length; i += 2) {
          // Recursively look for position within this 'if' statement,
          const rv = findPosition(stmt[i].stmts, ipos, stack);
          // Found position in this block,
          if (rv !== void 0) {
            return rv;
          }
        }
      }
    }
    stack.pop();
  }
  
  
  // The main statement processing function. Pulls a statement to execute.
  function executeStatements(context, cb) {

    // The current instuction location,
    const idefine = context.getIDefine();
    const ipos = context.getIPos();

    const gd_info = global_defineset[idefine];
    if (gd_info === void 0) {
      log.error('Unable to find define: "', idefine, '"');
      return 'finished';
    }
    const filename = gd_info[0];  // The source code filename of the define,
    const define_in = gd_info[1]; // The define object (the array of statements),

    const branch_stack = [];
    const p = findPosition(define_in, ipos, branch_stack);
    
    function nextStatement(cpos) {
      for (let sp = branch_stack.length - 1; sp >= 0; --sp) {
        const block = branch_stack[sp];
        for (let p = 0; p < block.length; ++p) {
          const pos = block[p][0];
          // Return first position found that's larger, working backwards on the
          // branch stack.
          if (pos > cpos) {
            return pos - 1;
          }
        }
      }
    }
    
    // If branch stack is empty then the position wasn't found (the define ended)
    if (branch_stack.length === 0) {

      // PENDING: Okay, we exited a 'define' which means either the program
      //   finished or we need to return after a call.

      // Signify program finished.
      cb(null, { status:'finished' });

    }
    else {

      // Execute the statement,
      const stmt = branch_stack[branch_stack.length - 1][p];
      
      const src_pos = stmt[0];
      const type = stmt[1];

      context.setSourceLocation(filename, src_pos);

      // Assigning a global value,
      if (type === 'assign') {
        const lhs = stmt[2];
        const rhs = stmt[3];
        context.execAssign(lhs, rhs);
        context.setIPos( nextStatement(src_pos) );

        cb();
      }
      // Branch,
      else if (type === 'if') {
        // Add all the branch statements to match into 'or_set' list,
        const or_set = [];
        for (let i = 2; i < stmt.length; i += 2) {
          or_set.push(stmt[i]);
        }
        // Find the first branch that matches,
        const matched = context.orMatch(or_set);
        // No match,
        if (matched === -1) {
          // So go to next statement after branch,
          context.setIPos( nextStatement(src_pos) );
        }
        // Found a branch that matches,
        else {
          // The statements block,
          const matched_branch = stmt[(matched * 2) + 3].stmts;
          if (matched_branch.length === 0) {
            // The block is empty, so move to next statement,
            context.setIPos( nextStatement(src_pos) );
          }
          else {
            // Source position of first entry of branch,
            context.setIPos( matched_branch[0][0] - 1 );
          }
        }

        cb();
      }
      // Function call,
      else if (type === 'nbcall') {
        const call_cmd = stmt[2];

        if (call_cmd[0] !== 'call') {
          throw Error('Expecting call');
        }

        // Move IP to next statement,
        context.setIPos( nextStatement(src_pos) );

        const call_ident = call_cmd[1];
        const call_args = call_cmd[2];
        context.execCall(call_ident, call_args, cb);

      }
      // Goto,
      else if (type === 'goto') {
        const goto_target = stmt[2];

        gotoDefine(context, goto_target, cb);
      }
      else {
        cb( Error("Unknown type to execute: " + stmt.toString()) );
      }

    }

  }
  
  
  
  // Initialize the context state.
  function initializeState(context, cb) {
    context.setConstantsInfo( { global_varset: parsed_vn.global_varset,
                                var_dependencies: parsed_vn.var_dependencies } );
    context.initialize(cb);
  }

  // Sets up IP for the start of the given define,
  function gotoDefine(context, define_name, cb) {

    // The define instructions,
    const define_ins = global_defineset[define_name];
    if (define_ins === void 0) {
      // Not found.
      cb( Error('Define not found: ' + define_name) );
    }
    else {
      // Set the current instruction define/position,
      context.setIDefine(define_name);
      context.setIPos(-1);
      cb();
    }

  }


  // Public API,
  return {
    initializeState,
    gotoDefine,
    executeStatements,
  };
  
}

exports.Interpreter = Interpreter;
