"use strict";

const VNJSFunction = require('./vnjsfunction.js');

function MachineState(loader) {




    function Frame() {

        const globals = {
            console: console,
        };


        const frame_stack = [];
        const context_stack = [];

        // Current scope,
        let user_frame = {};
        let register_frame = [];
        let script_context = {};
        let parent_a = false;


        // Returns the current script context,

        function getScriptContext() {
            return script_context;
        }

        // Push a new context for the execution of a function,

        function pushContext(script_file, call_next) {
            context_stack.push(script_context);
            script_context = { script_file, call_next };
        }

        function popContext() {
            const r = script_context;
            script_context = context_stack.pop();
            return r;
        }


        function pushBlock(varob, pframe_visible) {
            frame_stack.push(user_frame);
            frame_stack.push(register_frame);
            frame_stack.push(parent_a);
            if (varob) {
                user_frame = varob;
            }
            else {
                user_frame = {};
            }
            register_frame = [];
            parent_a = pframe_visible;
        }

        function popBlock() {
            parent_a = frame_stack.pop();
            register_frame = frame_stack.pop();
            user_frame = frame_stack.pop();
        }

        function popBlockRet(ret) {
            popBlock();
            return { f:'RET', v:ret };
        }


        function getFrameWithVar(varname) {
            let frame = user_frame;
            let vis = parent_a;
            let i = frame_stack.length - 3;
            while (!Object.prototype.hasOwnProperty.call(frame, varname)) {
                if (vis === false) {
                    return;
                }

                frame = frame_stack[i];
                vis = frame_stack[i + 2];
                i -= 3;
            }
            return frame;
        }



        function getU(varname) {
            // Visible in user frame?
            const frame = getFrameWithVar(varname);

            if (frame) {
                return frame[varname];
            }
            // Check visible functions,
            else {
                const own_function =
                        loader.resolveUserFunction(script_context.script_file, varname);
                if (own_function !== undefined) {
                    return own_function;
                }

                // Finally, check against globals,
                const global_val = globals[varname];
                if (global_val !== undefined) {
                    return global_val;
                }

                throw Error('Reference error: ' + varname);
            }
        }

        function opOnVar(varname, op) {
            const frame = getFrameWithVar(varname);
            if (frame) {
                return op(frame, varname);
            }
            throw Error('Reference error: ' + varname);
        }

        function setU(varname, val) {
            opOnVar(varname, (frame, varname) => {
                frame[varname] = val;
                return val;
            });
        }

        function setUConst(varname, val) {
            if (!Object.prototype.hasOwnProperty.call(user_frame, varname)) {
                user_frame[varname] = val;
                return val;
            }
            throw Error('Already defined: ' + varname);
        }

        function setULet(varname, val) {
            if (!Object.prototype.hasOwnProperty.call(user_frame, varname)) {
                user_frame[varname] = val;
                return val;
            }
            throw Error('Already defined: ' + varname);
        }

        function setR(i, val) {
            register_frame[i] = val;
            return val;
        }

        function getR(i) {
            return register_frame[i];
        }

        function clearR() {
            register_frame.length = 0;
        }


        function preIncU(varname) {
            opOnVar(varname, (frame, varname) => {
                return ++frame[varname];
            });
        }
        function preDecU(varname) {
            opOnVar(varname, (frame, varname) => {
                return --frame[varname];
            });
        }
        function postIncU(varname) {
            opOnVar(varname, (frame, varname) => {
                return frame[varname]++;
            });
        }
        function postDecU(varname) {
            opOnVar(varname, (frame, varname) => {
                return frame[varname]--;
            });
        }

        function addU(varname, v) {
            opOnVar(varname, (frame, varname) => {
                return (frame[varname] += v);
            });
        }
        function subU(varname, v) {
            opOnVar(varname, (frame, varname) => {
                return (frame[varname] -= v);
            });
        }
        function multU(varname, v) {
            opOnVar(varname, (frame, varname) => {
                return (frame[varname] *= v);
            });
        }
        function divU(varname, v) {
            opOnVar(varname, (frame, varname) => {
                return (frame[varname] /= v);
            });
        }



        function callU(func_fdecl, method, next_fun, args) {
            // Resolve the next function,
            const next_fdecl =
                        loader.resolveFunction(script_context.script_file, next_fun);
            return { f: 'CALL', v: func_fdecl, method, args, then: next_fdecl };
        }


        function gotoCall(goto_label) {
//            const goto_fdecl =
//                        loader.resolveFunction(script_context.script_file, goto_label);
//            return { f: 'GOTO', v: goto_fdecl };
            return { f: 'GOTO', v: goto_label };
        }




        return {

            getScriptContext,

            pushContext,
            popContext,

            pushBlock,
            popBlock,
            popBlockRet,
            getU,
            setU,
            setUConst,
            setULet,

            setR,
            getR,
            clearR,

            preIncU,
            preDecU,
            postIncU,
            postDecU,

            addU,
            subU,
            multU,
            divU,

            callU,
            gotoCall,

        };

    }

    function createFrame() {
        return Frame();
    }


    return {
        createFrame,
    };

}

module.exports = MachineState;
