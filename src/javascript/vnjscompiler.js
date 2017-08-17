"use strict";

const fs = require('fs');
const util = require('util');
const path = require('path');
const nearley = require("nearley");

const { Tokenizer } = require('./vnjstokenizer.js');
const grammar = require("./vnjsgrammar2.js");

// Compiles a pg.nvjs into a series of JavaScript functions.

function Compiler() {


    function parseError(msg, loc) {
        const err = Error(msg);
        err.loc = loc;
        return err;
    }


    function funcEnter(name, params) {
        let out = 'return function ' + name + '(';
        const len = params.length;
        // Exit early,
        if (len === 0) {
            out += ') {\n';
            return out;
        }
        let fset = '    __vnc.pushVars({ ';
        let first = true;
        for (let i = 0; i < len; ++i) {
            if (!first) {
                out += ', ';
                fset += ', ';
            }
            const pvar = params[i].d;
            out += pvar;
            fset += pvar + ':' + pvar;
            first = false;
        }
        out += ') {\n';
        out += fset + ' });\n';
        return out;
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


        console.log(util.inspect(pob,
           { showHidden: false,
             depth: null
           }));



        // Compile each of the functions,
        pob.members.forEach((func) => {

            let src_code = '';

            const name = func.name;
            const params = func.params;
            const block = func.block;

            // Make the declaration block,
            src_code += funcEnter(name, params);


            src_code += '}';


            console.log(src_code);

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
            // PENDING: Pick the first one?
            throw Error("Ambiguous grammar detected; Oops");
        }

        const pob = {
            constants: [],
            members: [],
            members_src: {}
        };

        processTree(tree, pob, callback);

//        console.log(util.inspect(tree,
//            { showHidden: false,
//              depth: null
//            }));

    }

    return {
        compile,
    };

}


module.exports = Compiler;
