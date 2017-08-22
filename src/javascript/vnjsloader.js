"use strict";

const fs = require('fs');
const util = require('util');
const path = require('path');

const Compiler = require('./vnjscompiler.js');
const VNJSFunction = require('./vnjsfunction.js');


function evalInContext(js, context) {
    // Return the results of the in-line anonymous function we .call with the passed context
    return function() {
        return eval(js);
    }.call(context);
}

const base_context = {};


function Loader() {

    // Maps unique script file name to object that describes it.

    const scripts = {};

    function loadFile(file_name, callback) {
        // Load from file,
        fs.readFile(path.join('.', 'web', 'scripts', file_name), "utf8",
                                                        (err, content) => {
            if (err) {
                return callback(err);
            }
            return callback(undefined, content);
        });
    }


    function resolveFunction(script_file, func_name) {
        return scripts[script_file].vis_functions[func_name];
    }

    function resolveUserFunction(script_file, func_name) {
        return scripts[script_file].user_functions[func_name];
    }



    // Prepares a .vnjs file by compiling it and all its dependants.

    function prepare(script_file, callback) {

        // Check this script hasn't already been processed,
        if (scripts[script_file] !== undefined) {
            return callback();
        }

        // Load the .vnjs file content,
        loadFile(script_file, (err, content) => {
            if (err) {
                return callback(err);
            }

            // Create compiler object,
            const compiler = Compiler();

            // Generate the code,
            const generated_code = compiler.compile(content);

            // Wrap the function for evaluation,
            const wrap_fun = '(function () {\n' +
                        generated_code.toSource() +
                        '})\n';

            console.log(wrap_fun);

            // Evaluate it,
            const execFunc = evalInContext(wrap_fun, base_context);

            // Create the script descriptor for this file,
            const compiled_functions = execFunc();

            // The list of user functions,
            const user_functions = {};
            const vis_functions = {};
            for (let fname in compiled_functions) {
                const vnjs_function_decl = VNJSFunction(script_file, fname);
                if (fname.startsWith('u_')) {
                    user_functions[fname.substring(2)] = vnjs_function_decl;
                }
                vis_functions[fname] = vnjs_function_decl;
            }

            const script_descriptor = {
                compiled_functions,
                vis_functions,
                user_functions
            };

            // Store it,
            scripts[script_file] = script_descriptor;

            console.log(scripts);

            return callback();
        });
    }



    function getFunction(func_decl) {
        const script_name = func_decl.getScriptFile();
        const function_name = func_decl.getRawFunctionName();
        const script_descriptor = scripts[script_name];
        if (script_descriptor === undefined) {
            throw Error('Script not found: ' + script_name);
        }
        const ufun = script_descriptor.compiled_functions[function_name];
        if (ufun === undefined) {
            throw Error('Function not found: ' + function_name);
        }
        return ufun;
    }



    // Calls the given function in the script,

    function call(script_file, function_name, args, vnc_frame, callback) {
        // Fetch the descriptor,

        let cmd = {
            f: 'CALL',
            args,
            v: resolveUserFunction(script_file, function_name),
            method: null,
            then: callback
        };

        try {

            while (true) {

                const nf = cmd.f;
                if (nf === 'CALL') {
                    // Function decl to call,
                    const v = cmd.v;
                    // Method if applicable (or null),
                    const method = cmd.method;
                    // Next fun
                    const then = cmd.then;
                    // Call Arguments,
                    const args = cmd.args;

                    let to_call = v;
                    if (method !== null) {
                        to_call = v[method];
                    }

                    // If 'v' is a JavaScript function,
                    if (to_call instanceof Function) {
                        // Push context,
                        vnc_frame.pushContext(undefined, undefined, then);
//                        console.log("GOTO (.js): ", v);
                        const ret = to_call.apply(v, args);
                        cmd = { f: 'RET', v: ret };
                    }
                    else {
                        const ufun = getFunction(to_call);
                        const call_script = to_call.getScriptFile();
                        const inner_frame = to_call.getInnerFrame();
                        vnc_frame.pushContext(call_script, inner_frame, then);

                        // Call the function,
//                        console.log("GOTO: ", v.getRawFunctionName());
                        cmd = ufun.apply(v, [vnc_frame].concat(args));
                    }
                }

                else if (nf === 'GOTO') {
                    // The goto label function,
                    let ufun;
                    if (cmd.ufun === undefined) {
                        const label = cmd.v;
                        const script_context = vnc_frame.getScriptContext();
                        ufun = getFunction(resolveFunction(
                                        script_context.script_file, label));
                        cmd.ufun = ufun;
                    }
                    else {
                        ufun = cmd.ufun;
                    }
                    cmd = ufun.call(undefined, vnc_frame);
                }

                else if (nf === 'RET') {
                    // Return value,
                    const ret_v = cmd.v;

                    const c = vnc_frame.popContext();
                    const call_next = c.call_next;

                    // Special case handling of callback,
                    if (call_next === callback) {
                        return callback(undefined, ret_v);
                    }

                    const ufun = getFunction(call_next);

//                    console.log("RETURNING: ", call_next.getRawFunctionName());
                    cmd = ufun.call(undefined, vnc_frame, undefined, ret_v);
                }
                else {
                    console.log(cmd);
                    return callback(Error('Unknown command: ' + nf));
                }

            }

        }
        catch (e) {
            return callback(e);
        }

    }





    return {

        resolveFunction,
        resolveUserFunction,

        prepare,
        call
    };

}


module.exports = Loader;
