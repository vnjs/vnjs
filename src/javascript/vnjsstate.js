"use strict";

const VNJSFunction = require('./vnjsfunction.js');

function MachineState(loader) {




    function Frame() {

        const frame_stack = [];
        const context_stack = [];

        // Current scope,
        let user_frame = {};
        let register_frame = [];
        let script_context = {};





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


        function pushBlock(varob) {
            frame_stack.push(user_frame);
            frame_stack.push(register_frame);
            if (varob) {
                user_frame = varob;
            }
            else {
                user_frame = {};
            }
            register_frame = [];
        }

        function popBlock(ret) {
            register_frame = frame_stack.pop();
            user_frame = frame_stack.pop();
            return { f:'RET', v:ret };
        }

        function getU(varname) {
            // Visible in user frame?
            if (Object.prototype.hasOwnProperty.call(user_frame, varname)) {
                return user_frame[varname];
            }
            // Check visible functions,
            else {
                const own_function =
                        loader.resolveUserFunction(script_context.script_file, varname);
                if (own_function !== undefined) {
                    return own_function;
                }
                throw Error('Reference not found: ' + varname);
            }
        }

        function setU(varname, val) {
            user_frame[varname] = val;
            return val;
        }

        function setUConst(varname, val) {
            // PENDING: Const checks,
            return setU(varname, val);
        }

        function setULet(varname, val) {
            return setU(varname, val);
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


        function callU(func_fdecl, next_fun, args) {
            // Resolve the next function,
            const next_fdecl =
                        loader.resolveFunction(script_context.script_file, next_fun);
            return { f: 'CALL', v: func_fdecl, args, then: next_fdecl };
        }



        return {

            pushContext,
            popContext,

            pushBlock,
            popBlock,
            getU,
            setU,
            setUConst,
            setULet,

            setR,
            getR,
            clearR,

            callU,

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
