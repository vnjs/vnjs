"use strict";

const fs = require('fs');
const util = require('util');
const path = require('path');
const nearley = require("nearley");

const { Tokenizer } = require('./vnjstokenizer.js');
const grammar = require("./vnjsgrammar2.js");

// Compiles a pg.nvjs into a series of JavaScript functions.


function GeneratedSource() {

    let gen_fun_num = 0;
    let gen_var_num = 0;

    let indent = 0;

    const var_gen_set = [];
    const function_stack = [];
    const function_map = {};

    const exported_functions = [];


    function getGenVarNum() {
        return gen_var_num;
    }

    function getGenFunNum() {
        return gen_fun_num;
    }


    function indentStr(str, v) {
        let indent = '';
        for (let i = 0; i < v; ++i) {
            indent += '    ';
        }
        return indent + str;
    }

    function genVar() {
        ++gen_var_num;
        var_gen_set.push(gen_var_num);
        return gen_var_num;
    }

    function genFun() {
        ++gen_fun_num;
        return gen_fun_num;
    }

    function clearGenVarSet() {
        const co = var_gen_set.slice();
        var_gen_set.length = 0;
        gen_var_num = 0;
        return co;
    }

    function getFunctionObj(name) {
        let finfo = function_map[name];
        if (finfo === undefined) {
            finfo = {
                lines: [],
                ref_count: 0
            };
            function_map[name] = finfo;
        }
        return finfo;
    }

    function pushLine(code, meta) {
        const line_ob = {
            indent: indent,
            code: code,
            meta: meta
        };
        if (function_stack.length > 0) {
            const top_fun = function_stack[function_stack.length - 1];
            line_ob.function = top_fun;
            let finfo = getFunctionObj(top_fun);
            finfo.lines.push(line_ob);
        }
        if (meta !== undefined && meta.call_to !== undefined) {
            getFunctionObj(meta.call_to).ref_count += 1;
        }
    }

    function pushAssign(right_code) {
        const vname = genVar();
        pushLine('_vnc.setR(' + vname + ', ' + right_code + ');');
        return '_vnc.getR(' + vname + ')';
    }

    function pushCall(right_code, meta) {
        pushLine(right_code + ';', meta);
    }

    function pushGenVarCleanup(tc) {
        if (tc) {
            pushLine('_vnc.clear();');
            return tc;
        }
        else {
            const cu = clearGenVarSet();
            if (cu.length > 0) {
                pushLine('_vnc.clear();');
            }
            return cu;
        }
    }

    function addIndent() {
        ++indent;
    }

    function subIndent() {
        --indent;
    }

    function assignCode(n) {
        switch (n.f) {
            case ('IDENT'):
                // Identifier,
                return '_vnc.getU("' + n.v + '")';
            case ('NUMBER'):
            case ('STRING'):
            case ('BOOLEAN'):
            case ('NULL'):
            case ('UNDEFINED'):
                // Pull from 'v' property in node,
                return n.v;
            default:
                throw Error('Unknown function type: ' + n.f);
        }
    }

    function toSource() {
        let out = '';
        for (let fname in function_map) {
            const f = function_map[fname];
            const lines = f.lines;
            for (let i = 0; i < lines.length; ++i) {
                const cl = lines[i];
                // out += '//' + JSON.stringify({ fun: cl.function, meta: cl.meta }) + '\n';
                out += indentStr(cl.code, cl.indent) + '\n';

            }
        }

        // Return the exported functions from the generated source.
        out += '\n';
        out += '\n';
        out += 'return {\n';
        exported_functions.forEach((func_name) => {
            out += '    ' + func_name + ',\n';
        });
        out += '};\n';
        return out;
    }

    function openFunction(func_name) {
        function_stack.push(func_name);
    }

    function closeFunction() {
        subIndent();
        pushLine('}');
        function_stack.pop();
    }


    function inlineLines(lines, i, inline_lines) {

        const orig_line = lines[i];
        const base_indent = orig_line.indent;

        const in_lines = [];
        for (let i = 1; i < inline_lines.length - 1; ++i) {
            const il = inline_lines[i];
            in_lines.push({
                indent: base_indent + il.indent - 1,
                meta: il.meta,
                code: il.code
            });
        }

        return lines.slice(0, i).concat(in_lines).concat(lines.slice(i + 1));

    }

    function inlineFunction(to_inline, inline_lines) {
        const inlined_functions = { updated: false, updates: {} };
        // Find the reference,
        for (let fname2 in function_map) {
            const f2 = function_map[fname2];
            let lines = f2.lines;
            let updated = false;
            for (let i = 0; i < lines.length; ++i) {
                const line = lines[i];
                if (line.meta && line.meta.call_to === to_inline) {
                    // Inline here,
                    lines = inlineLines(lines, i, inline_lines);
                    updated = true;
                }
            }
            if (updated) {
                inlined_functions.updated = true;
                inlined_functions.updates[fname2] = lines;
            }
        }

        return inlined_functions;
    }

    function exportFunction(func_name) {
        exported_functions.push(func_name);
    }

    function inlineRefs() {
        // First with only 1 ref,
        for (let fname in function_map) {
            const f = function_map[fname];
            if (f.ref_count === 1) {
                const fm = inlineFunction(fname, f.lines);
                if (fm.updated) {
                    for (let updated_fname in fm.updates) {
                        const to_update = updated_fname;
                        const lines = fm.updates[updated_fname];

                        function_map[to_update].lines = lines;
                    }
                    delete function_map[fname];
                    return inlineRefs();
                }
            }
        }
    }


    // Exported API,
    return {

        getGenVarNum,
        getGenFunNum,

        pushLine,
        pushAssign,
        pushCall,

        pushGenVarCleanup,

        genFun,

        addIndent,
        subIndent,

        assignCode,

        toSource,

        openFunction,
        closeFunction,

        exportFunction,

        inlineRefs,

    };

}


function Compiler() {






    function parseError(msg, loc) {
        const err = Error(msg);
        err.loc = loc;
        return err;
    }






    function funcEnter(gen_code, name, params) {
        const uname_function = 'u_' + name.v;
        gen_code.openFunction(uname_function);
        gen_code.exportFunction(uname_function);
        let out = 'function ' + uname_function + '(';
        const len = params.length;
        // Exit early,
        if (len === 0) {
            out += ') {';
            gen_code.pushLine(out);
            gen_code.addIndent();
            gen_code.pushLine('_vnc.pushBlock();');
            return;
        }
        let fset = '_vnc.pushBlock({ ';
        let first = true;
        for (let i = 0; i < len; ++i) {
            if (!first) {
                out += ', ';
                fset += ', ';
            }
            const pvar = params[i].v;
            out += '___' + pvar;
            fset += pvar + ':___' + pvar;
            first = false;
        }
        out += !first ? ', cb' : 'cb';
        out += ') {';
        fset += ' });';

        gen_code.pushLine(out);
        gen_code.addIndent();
        gen_code.pushLine(fset);

        return;
    }


    function funcLeave(gen_code, name) {
        gen_code.pushLine('return _vnc.popBlock();');
        gen_code.closeFunction();
        return;
    }



    function standardOp(gen_code, fun, resolver) {
        const l = fun.l;
        const r = fun.r;

        const v1 = resolver(gen_code, l);
        const v2 = resolver(gen_code, r);

        return v1 + ' ' + fun.f + ' ' + v2;
    }

    function manipulatorOp(gen_code, fun, resolver, func_call) {
        const l = fun.l;
        const r = fun.r;

        const v2 = resolver(gen_code, r);

        if (l.f === 'IDENT') {
            return func_call + '("' + l.v + '", ' + v2 + ')';
        }
        else if (l.f === '.') {
            const v1 = resolver(gen_code, l.l);
            return v1 + '.' + l.r.v + ' ' + fun.f + ' ' + v2;
        }
        else {
            throw parseError('Invalid left hand side', l.loc);
        }
    }

    function unaryManipOp(gen_code, fun, resolver, func_call) {
        const l = fun.l;

        if (l.f === 'IDENT') {
            return func_call + '("' + l.v + '")';
        }
        else if (l.f === '.') {
            const v1 = resolver(gen_code, l.l);
            const vref = v1 + '.' + l.r.v;
            return fun.f.replace('u', vref);
        }
        else {
            throw parseError('Invalid reference', l.loc);
        }
    }


    function asSourceLine(gen_code, fun, is_statement) {

        switch (fun.f) {
            case ('('): {
                const l = fun.l;
                const v1 = asSourceLine(gen_code, l);

                return ('( ' + v1 + ' )');
            }
            case ('-u'): {
                const l = fun.l;
                const v1 = asSourceLine(gen_code, l);
                return ('-( ' + v1 + ' )');
            }
            case ('+u'): {
                const l = fun.l;
                const v1 = asSourceLine(gen_code, l);
                return ('+( ' + v1 + ' )');
            }
            case ('!u'): {
                const l = fun.l;
                const v1 = asSourceLine(gen_code, l);
                return ('!( ' + v1 + ' )');
            }

            case ('.'): {
                const l = fun.l;
                const r = fun.r;

                const v1 = asSourceLine(gen_code, l);

                // If right is an identifier,
                if (r.f === 'IDENT') {
                    return v1 + '.' + r.v;
                }

                const v2 = asSourceLine(gen_code, r);
                return v1 + '.' + v2;
            }

            case ('+'):
            case ('-'):
            case ('*'):
            case ('/'):
            case ('<'):
            case ('>'):
            case ('<='):
            case ('>='):
            case ('=='):
            case ('==='):
            case ('!='):
            case ('!=='):
            case ('||'):
            case ('&&'):
                return standardOp(gen_code, fun, asSourceLine);

            // Manipulators
            case ('+='):
                return manipulatorOp(gen_code, fun, asSourceLine, '_vnc.addU');
            case ('-='):
                return manipulatorOp(gen_code, fun, asSourceLine, '_vnc.subU');
            case ('*='):
                return manipulatorOp(gen_code, fun, asSourceLine, '_vnc.multU');
            case ('/='):
                return manipulatorOp(gen_code, fun, asSourceLine, '_vnc.divU');

            case ('++u'):
                return unaryManipOp(gen_code, fun, asSourceLine, '_vnc.preIncU');
            case ('u++'):
                return unaryManipOp(gen_code, fun, asSourceLine, '_vnc.postIncU');
            case ('--u'):
                return unaryManipOp(gen_code, fun, asSourceLine, '_vnc.preDecU');
            case ('u--'):
                return unaryManipOp(gen_code, fun, asSourceLine, '_vnc.postDecU');

            case ('='): {
                const l = fun.l;
                const r = fun.r;

                const v2 = asSourceLine(gen_code, r);

                if (l.f === 'IDENT') {
                    return '_vnc.setU("' + l.v + '", ' + v2 + ')';
                }
                else if (l.f === '.') {
                    const v1 = asSourceLine(gen_code, l.l);
                    return v1 + '.' + l.r.v + ' = ' + v2;
                }
                else {
                    throw Error();
                }

            }
            case ('const'): {
                const vr = fun.var.v;
                const expr = fun.expr;

                const v1 = asSourceLine(gen_code, expr);

                return '_vnc.setUConst("' + vr + '", ' + v1 + ')';
            }
            case ('let'): {
                const vr = fun.var.v;
                const expr = fun.expr;

                const v1 = asSourceLine(gen_code, expr);

                return '_vnc.setULet("' + vr + '", ' + v1 + ')';
            }

            case ('IDENT'):
            case ('NUMBER'):
            case ('STRING'):
            case ('BOOLEAN'):
            case ('NULL'):
            case ('UNDEFINED'):
                return gen_code.assignCode(fun);

            case ('while') : {
                // Optimized 'while' can be turned into same JavaScript code,

                const continue_condition = fun.expr;
                const block = fun.block;

                const cev = asSourceLine(gen_code, continue_condition);
                gen_code.pushLine('while (' + cev + ') {');
                gen_code.addIndent();
                block.forEach((stmt) => {
                    processStatement(gen_code, stmt);
                });
                gen_code.subIndent();
                gen_code.pushLine('}');

                return;
            }

            case ('if') : {
                // Optimized 'if' can be turned into same JavaScript code,

                const blocks_arr = fun.bc;

                blocks_arr.forEach((ifb, i) => {
                    const condition_expr = ifb.expr;
                    const block = ifb.block;

                    if (condition_expr) {
                        const cev = processFunction(gen_code, condition_expr);
                        let ftype = 'if';
                        if (i > 0) {
                            ftype = 'else if';
                        }
                        gen_code.pushLine(ftype + ' (' + cev + ') {');
                        gen_code.addIndent();

                        block.forEach((stmt) => {
                            processStatement(gen_code, stmt);
                        });

                        gen_code.subIndent();
                        gen_code.pushLine('}');
                    }
                    else {
                        gen_code.pushLine('else {');
                        gen_code.addIndent();

                        block.forEach((stmt) => {
                            processStatement(gen_code, stmt);
                        });

                        gen_code.subIndent();
                        gen_code.pushLine('}');
                    }
                });

                return;
            }



            default:
//                return "OPTIMIZED";
                console.error(fun);
                throw Error("Unknown function type: " + fun.f);
        }

    }



    function processFunction(gen_code, fun, is_statement) {

        // No calls in this branch so we can return straight source code,
        if (fun.has_call === false) {
            return asSourceLine(gen_code, fun, is_statement);
        }

        // Either pushAssign if this isn't a root statement, or pushCall if is.
        const linePush = is_statement ? gen_code.pushCall : gen_code.pushAssign;

        switch (fun.f) {
            case ('('): {
                const l = fun.l;
                return processFunction(gen_code, l);
            }

            case ('-u'): {
                const l = fun.l;
                const v1 = processFunction(gen_code, l);
                return linePush('-( ' + v1 + ' )');
            }
            case ('+u'): {
                const l = fun.l;
                const v1 = processFunction(gen_code, l);
                return linePush('+( ' + v1 + ' )');
            }
            case ('!u'): {
                const l = fun.l;
                const v1 = processFunction(gen_code, l);
                return linePush('!( ' + v1 + ' )');
            }

            case ('.'): {
                const l = fun.l;
                const r = fun.r;

                const v1 = processFunction(gen_code, l);

                // If right is an identifier,
                if (r.f === 'IDENT') {
                    return linePush(v1 + '.' + r.v);
                }

                const v2 = processFunction(gen_code, r);
                return linePush(v1 + '.' + v2);

            }

            case ('+'):
            case ('-'):
            case ('*'):
            case ('/'):
            case ('<'):
            case ('>'):
            case ('<='):
            case ('>='):
            case ('=='):
            case ('==='):
            case ('!='):
            case ('!=='):
            case ('||'):
            case ('&&'):
                return linePush(standardOp(gen_code, fun, processFunction));

            // Manipulators
            case ('+='):
                return linePush(manipulatorOp(
                            gen_code, fun, processFunction, '_vnc.addU'));
            case ('-='):
                return linePush(manipulatorOp(
                            gen_code, fun, processFunction, '_vnc.subU'));
            case ('*='):
                return linePush(manipulatorOp(
                            gen_code, fun, processFunction, '_vnc.multU'));
            case ('/='):
                return linePush(manipulatorOp(
                            gen_code, fun, processFunction, '_vnc.divU'));

            case ('='): {
                const l = fun.l;
                const r = fun.r;

                const v2 = processFunction(gen_code, r);

                if (l.f === 'IDENT') {
                    return gen_code.pushCall('_vnc.setU("' + l.v + '", ' + v2 + ')');
                }
                else if (l.f === '.') {
                    const v1 = processFunction(gen_code, l.l);
                    return gen_code.pushCall(v1 + '.' + l.r.v + ' = ' + v2);
                }
                else {
                    throw Error();
                }

            }
            case ('const'): {
                const vr = fun.var.v;
                const expr = fun.expr;

                const v1 = processFunction(gen_code, expr);

                return gen_code.pushCall('_vnc.setUConst("' + vr + '", ' + v1 + ')');
            }
            case ('let'): {
                const vr = fun.var.v;
                const expr = fun.expr;

                const v1 = processFunction(gen_code, expr);

                return gen_code.pushCall('_vnc.setULet("' + vr + '", ' + v1 + ')');
            }

            case ('IDENT'):
            case ('NUMBER'):
            case ('STRING'):
                return gen_code.pushAssign(gen_code.assignCode(fun));

            case ('call'): {
                const name = fun.name;
                const params = fun.params;

                const pvars = [];
                params.forEach((param) => {
                    pvars.push(processFunction(gen_code, param));
                });

                const v1 = processFunction(gen_code, name);

                const nf = 'nf_' + gen_code.genFun();

                let ccode = 'return _vnc.call(' + v1 + ', "' + nf + '"';

                pvars.forEach((v) => {
                    ccode += ', ' + v;
                });
                ccode += ')';

                gen_code.pushCall(ccode);
                gen_code.closeFunction();

                gen_code.openFunction(nf);
                gen_code.exportFunction(nf);
                gen_code.pushLine('function ' + nf + '(err, ret) {');
                gen_code.addIndent();

                if (is_statement) {
                    return;
                }
                else {
                    return gen_code.pushAssign('ret');
                }

            }

            case ('if') : {
                // This is an 'if' with a call somewhere inside it.

                const blocks_arr = fun.bc;
                const names_arr = [];

                const complete_fname = 'ifend_' + gen_code.genFun();

                let end_done = false;

                blocks_arr.forEach((ifb) => {
                    const condition_expr = ifb.expr;

                    if (condition_expr) {
                        const cev = processFunction(gen_code, condition_expr);
                        const block_fname = 'cond_' + gen_code.genFun();
                        names_arr.push(block_fname);

                        gen_code.pushLine('if (' + cev + ') {');
                        gen_code.addIndent();
                        const cleared = gen_code.pushGenVarCleanup();
                        gen_code.pushCall('return ' + block_fname + '()',
                                            { call_to: block_fname });
                        gen_code.subIndent();
                        gen_code.pushLine('}');
                        if (cleared.length > 0) {
                            gen_code.pushGenVarCleanup(cleared);
                        }
                    }
                    else {
                        const block_fname = 'cond_' + gen_code.genFun();
                        names_arr.push(block_fname);
                        gen_code.pushGenVarCleanup();
                        gen_code.pushCall('return ' + block_fname + '()',
                                            { call_to: block_fname });
                        end_done = true;
                    }
                });

                if (!end_done) {
                    gen_code.pushGenVarCleanup();
                    gen_code.pushCall('return ' + complete_fname + '()',
                                        { call_to: complete_fname });
                }

                gen_code.closeFunction();

                blocks_arr.forEach((ifb, i) => {
                    const block = ifb.block;
                    gen_code.openFunction(names_arr[i]);
                    gen_code.pushLine('function ' + names_arr[i] + '() {');
                    gen_code.addIndent();

                    block.forEach((stmt) => {
                        processStatement(gen_code, stmt);
                    });

                    gen_code.pushGenVarCleanup();
                    gen_code.pushCall('return ' + complete_fname + '()',
                                        { call_to: complete_fname });
                    gen_code.closeFunction();
                });

                gen_code.openFunction(complete_fname);
                gen_code.pushLine('function ' + complete_fname + '() {');
                gen_code.addIndent();

                return;

            }

            case ('while') : {
                // This is a 'while' with a call inside it, so it needs to be
                // turned into a recursive call.

                const continue_condition = fun.expr;
                const block = fun.block;

                const loop_f = 'loop_' + gen_code.genFun();

                gen_code.pushGenVarCleanup();
                gen_code.pushCall('return _vnc.loopCall("' + loop_f + '")');
//                gen_code.pushCall('return ' + loop_f + '()',
//                                    { call_to: loop_f });
                gen_code.closeFunction();

                gen_code.openFunction(loop_f);
                gen_code.exportFunction(loop_f);
                gen_code.pushLine('function ' + loop_f + '() {');
                gen_code.addIndent();

                const cev = processFunction(gen_code, continue_condition);
                const nf = 'nf_' + gen_code.genFun();
                gen_code.pushLine('if (!(' + cev + ')) {');
                gen_code.addIndent();
                const cleared = gen_code.pushGenVarCleanup();
                gen_code.pushCall('return ' + nf + '()',
                                    { call_to: nf });
                gen_code.subIndent();
                gen_code.pushLine('}');

                if (cleared.length > 0) {
                    gen_code.pushGenVarCleanup(cleared);
                }

                block.forEach((stmt) => {
                    processStatement(gen_code, stmt);
                });

                gen_code.pushGenVarCleanup();
                gen_code.pushCall('return _vnc.loopCall("' + loop_f + '")');
//                gen_code.pushCall('return ' + loop_f + '()',
//                                    { call_to: loop_f });
                gen_code.closeFunction();

                gen_code.openFunction(nf);
                gen_code.pushLine('function ' + nf + '() {');
                gen_code.addIndent();

                return;
            }

            default:
                console.error(fun);
                throw Error("Unknown function type: " + fun.f);
        }

    }



    function processStatement(gen_code, stmt) {

        const code = processFunction(gen_code, stmt, true);
        if (code !== undefined && stmt.f !== 'call') {
            gen_code.pushLine(code + ';');
        }
        gen_code.pushGenVarCleanup();

    }


    function markUpTree(node) {
        let node_has_call = false;
        if (Array.isArray(node)) {
            node.forEach((n) => {
                markUpTree(n);
                if (n.has_call === true) {
                    node_has_call = true;
                }
            });
        }
        else {
            if (node.f === 'call') {
                node_has_call = true;
            }
            for (let k in node) {
                if (k !== 'f' && k !== 'v' && k !== 'loc') {
                    markUpTree(node[k]);
                    if (node[k].has_call === true) {
                        node_has_call = true;
                    }
                }
            }
        }
        node.has_call = node_has_call;
    }



    function processTree(tree, pob, callback) {

        // Top level is either const or function declarations and nothing else.
        tree.forEach((top_decl) => {
            const decl_func = top_decl.f;
            if (decl_func === 'const') {
                pob.constants.push(top_decl);
            }
            else if (decl_func === 'function') {
                pob.members.push(top_decl);
            }
            else {
                callback(parseError('Unknown statement', top_decl.loc));
            }
        });


        markUpTree(tree);

        // console.log(util.inspect(pob,
        //    { showHidden: false,
        //      depth: null
        //    }));

        // Compile each of the functions,
        pob.members.forEach((func) => {

            let gen_code = GeneratedSource();

            const name = func.name;
            const params = func.params;
            const block = func.block;

            // Make the declaration block,
            funcEnter(gen_code, name, params);

            block.forEach((stmt) => {

                processStatement(gen_code, stmt);

            });

            funcLeave(gen_code, name);

            // Inline code that can be inlined,
            gen_code.inlineRefs();
            // Print out source,
            console.log(gen_code.toSource());

        });

    }




    function compile(src_code, callback) {

        const tokenizer = Tokenizer(src_code);
        const tokens = tokenizer.getTokens();

        const p = new nearley.Parser(grammar.ParserRules, grammar.ParserStart);
        try {
            p.feed(tokens);
        }
        catch (parse_e) {
              const coffset = parse_e.offset;
              if (coffset) {
                  console.error('%j', tokens);
                  console.error("Parse error at: %s", coffset);
              }
              throw parse_e;
        }
        if (p.results.length === 0) {
            // Not terminated,
            throw Error("Parse error; Unexpected end of file");
        }

        const tree = p.results[0];

        if (p.results.length > 1) {
            console.log(util.inspect(p.results,
                    { showHidden: false,
                      depth: null
                    }));
            // PENDING: Pick the first one?
            throw Error("Ambiguous grammar detected; Oops");
        }

//        console.log(util.inspect(p.results,
//                { showHidden: false,
//                  depth: null
//                }));

        const pob = {
            constants: [],
            members: [],
            members_src: {}
        };

        processTree(tree, pob, callback);

    }

    return {
        compile,
    };

}


module.exports = Compiler;
