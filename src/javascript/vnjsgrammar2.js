// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
(function () {
function id(x) {return x[0]; }

function nth(n) {
    return function(d) {
        return d[n];
    };
}


function $(o) {
    return function(d) {
        var ret = {};
        Object.keys(o).forEach(function(k) {
            ret[k] = d[o[k]];
        });
        return ret;
    };
}


    var KEYWORDS = {
        'true':-1,
        'false':-1,
        'null':-1,
        'undefined':-1,
        'import':-1,
        'const':-1,
        'if':-1,
        'then':-1,
        'else':-1,
        'let':-1,
        'var':-1,
        'define':-1,
        'goto':-1,
        'preserve':-1,
        'evaluate':-1,
        'from':-1,
        'install':-1,
        'function':-1,
        'for':-1,
        'in':-1,
        'while':-1,
        'return':-1,
    };

    function toList(n, m) {
        return function(d) {
            var s = [];
            var f = d[n];
            if (f) {
                for (var i = 0; i < f.length; ++i) {
                    var st = f[i][m];
                    if (st !== null) {
                        s.push(st);
                    }
                }
            }
            return s;
        }
    }

    // Concatenates a single value (v1) with an array (v2) and returns a new
    // array.
    function toArray(v1, v2) {
        // v1 will always be a single value.
        // v2 will be an array or undefined
        return function(d, loc, reject) {

            var val1 = d[v1];
            const varr = [ val1 ];
            if (v2 === undefined) {
                return varr;
            }
            else {
                var val2 = d[v2];
                return varr.concat(d[v2]);
            }

        }
    }

    // Concatenates a single object assignment with an existing map and returns
    // a new map.
    function toObject(v1, v2) {
        // v1 will always be a single value.
        // v2 will be an array or undefined
        return function(d, loc, reject) {

            var ob = {};
            var val1 = d[v1];
            for (var key in val1) {
                ob[key] = val1[key];
            }
            if (v2 !== undefined) {
                var val2 = d[v2];
                for (var key in val2) {
                    ob[key] = val2[key];
                }
            }
            return ob;

        }
    }

    function toNull(d) {
        return null;
    }

    var isToken = function (tok) {
        return {
            test: function(n) { return n[0] === tok }
        }
    };
    var isSymbol = function (sym) {
        return {
            test: function(n) { return n[0] === 's' && n[1] === sym }
        }
    };
    var isWord = function (word) {
        return {
            test: function(n) { return n[0] === 'i' && n[1] === word }
        }
    };

    /* TOKENS START */

    var STRING_CONST = isToken('sv');
    var IDENT_CONST = isToken('i');
    var WHITESPACE = isToken('ws');
    var NUMBER = isToken('n');
    var COMMENT = isToken('c');

    var SEMICOLON = isSymbol(';');
    var COLON =   isSymbol(':');
    var PERIOD =  isSymbol('.');
    var COMMA =   isSymbol(',');
    var OPENS =   isSymbol('[');
    var CLOSES =  isSymbol(']');
    var OPENP =   isSymbol('(');
    var CLOSEP =  isSymbol(')');
    var OPENB =   isSymbol('{');
    var CLOSEB =  isSymbol('}');
    var PERCENT = isSymbol('$');
    var ORSYM =   isSymbol('||');
    var ANDSYM =  isSymbol('&&');
    var LT =   isSymbol('<');
    var GT =   isSymbol('>');
    var LTE =  isSymbol('<=');
    var GTE =  isSymbol('>=');
    var EQ =   isSymbol('==');
    var EEQ =  isSymbol('===');
    var NEQ =  isSymbol('!=');
    var NNEQ = isSymbol('!==');

    var ARROWFUNC = isSymbol('=>');

    var PLUS =   isSymbol('+');
    var MINUS =  isSymbol('-');
    var MULT =   isSymbol('*');
    var DIV =    isSymbol('/');
    var REMAIN = isSymbol('%');

    var PLUSEQ =  isSymbol('+=');
    var MINUSEQ = isSymbol('-=');
    var MULTEQ =  isSymbol('*=');
    var DIVEQ =   isSymbol('/=');

    var PLUSPLUS   = isSymbol('++');
    var MINUSMINUS = isSymbol('--');

    var NOT =    isSymbol('!');
    var ASSIGN = isSymbol('=');

    var CONST =     isWord('const');
    var LET =       isWord('let');
    var TRUE =      isWord('true');
    var FALSE =     isWord('false');
    var NULL =      isWord('null');
    var UNDEFINED = isWord('undefined');
    var IF =        isWord('if');
    var ELSE =      isWord('else');
    var IMPORT =    isWord('import');
    var FOR =       isWord('for');
    var IN =        isWord('in');
    var FROM =      isWord('from');
    var GOTO =      isWord('goto');
    var FUNCTION =  isWord('function');
    var WHILE =     isWord('while');
    var RETURN =    isWord('return');

    var VAR =      isWord('var');
    var PRESERVE = isWord('preserve');
    var EVALUATE = isWord('evaluate');
    var INSTALL  = isWord('install');

    var EXPONENT = {
        test: function(n) { return n[0] === 'i' && (n[1] === 'E' || n[1] === 'e') }
    };

    var INLINECODE = {
        test: function(n) { return n[0] === 'ic' }
    };



    function stdF(ftype) {
        return function(d, loc, reject) {
            return { loc:loc, f:ftype, l:d[0], r:d[4] };
        }
    }

    function debugId() {
        return function(d, loc, reject) {
            console.log("  DBG => ", d[0]);
            return d[0];
        }
    }

    function assignF() {
        return function(d, loc, reject) {
            var l = d[0];
            if (l.f === '{' || l.f === '[') {
                return reject;
            }
            return { loc:loc, f:'=', l:l, r:d[4] };
        }
    }



    var toLocalIdent = function(d, loc, reject) {
        var str = d[0];
        // Reject keywords,
        if ( KEYWORDS[str] === -1 ) {
            return reject;
        }
        return { loc:loc, f:'IDENT', v:str };
    };
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "vnjs", "symbols": ["baseStatements", "_"], "postprocess": nth(0)},
    {"name": "general_expression", "symbols": ["_", "expression", "_"], "postprocess": nth(1)},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1$subexpression$1", "symbols": [WHITESPACE]},
    {"name": "_$ebnf$1$subexpression$1", "symbols": [COMMENT]},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "_$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": toNull},
    {"name": "__$ebnf$1$subexpression$1", "symbols": [WHITESPACE]},
    {"name": "__$ebnf$1$subexpression$1", "symbols": [COMMENT]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1$subexpression$1"]},
    {"name": "__$ebnf$1$subexpression$2", "symbols": [WHITESPACE]},
    {"name": "__$ebnf$1$subexpression$2", "symbols": [COMMENT]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "__$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": toNull},
    {"name": "stringval", "symbols": [STRING_CONST], "postprocess": function(d, loc) { return { loc:loc, f:'STRING', v:d[0][1] } }},
    {"name": "plusorminus", "symbols": [MINUS], "postprocess": function(d) { return '-' }},
    {"name": "plusorminus", "symbols": [PLUS], "postprocess": function(d) { return '+' }},
    {"name": "number$ebnf$1", "symbols": ["plusorminus"], "postprocess": id},
    {"name": "number$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "number$ebnf$2$subexpression$1", "symbols": [PERIOD, NUMBER]},
    {"name": "number$ebnf$2", "symbols": ["number$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "number$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "number$ebnf$3$subexpression$1$ebnf$1", "symbols": ["plusorminus"], "postprocess": id},
    {"name": "number$ebnf$3$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "number$ebnf$3$subexpression$1", "symbols": [EXPONENT, "number$ebnf$3$subexpression$1$ebnf$1", NUMBER]},
    {"name": "number$ebnf$3", "symbols": ["number$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "number$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "number", "symbols": ["number$ebnf$1", NUMBER, "number$ebnf$2", "number$ebnf$3"], "postprocess": 
        function(d, loc) {
            return {
                loc:loc,
                f:'NUMBER',
                v:(d[0] || "") +
                d[1][1] +
                (d[2] ? "." + d[2][1][1] : "") +
                (d[3] ? "e" + (d[3][1] || "+") + d[3][2][1] : "")
            }
        }
        },
    {"name": "number$ebnf$4", "symbols": ["plusorminus"], "postprocess": id},
    {"name": "number$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "number$ebnf$5$subexpression$1$ebnf$1", "symbols": ["plusorminus"], "postprocess": id},
    {"name": "number$ebnf$5$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "number$ebnf$5$subexpression$1", "symbols": [EXPONENT, "number$ebnf$5$subexpression$1$ebnf$1", NUMBER]},
    {"name": "number$ebnf$5", "symbols": ["number$ebnf$5$subexpression$1"], "postprocess": id},
    {"name": "number$ebnf$5", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "number", "symbols": ["number$ebnf$4", PERIOD, NUMBER, "number$ebnf$5"], "postprocess": 
        function(d, loc) {
            return {
                loc:loc,
                f:'NUMBER',
                v:(d[0] || "") +
                "." + d[2][1] +
                (d[3] ? "e" + (d[3][1] || "+") + d[3][2][1] : "")
            }
        }
        },
    {"name": "boolean", "symbols": [TRUE], "postprocess": function(d, loc) { return { loc:loc, f:'BOOLEAN', v:true } }},
    {"name": "boolean", "symbols": [FALSE], "postprocess": function(d, loc) { return { loc:loc, f:'BOOLEAN', v:false } }},
    {"name": "nullval", "symbols": [NULL], "postprocess": function(d, loc) { return { loc:loc, f:'NULL', v:null } }},
    {"name": "undefinedval", "symbols": [UNDEFINED], "postprocess": function(d, loc) { return { loc:loc, f:'UNDEFINED', v:undefined } }},
    {"name": "identifier", "symbols": [IDENT_CONST], "postprocess": function(d) { return d[0][1] }},
    {"name": "OR_TOKS", "symbols": [ORSYM], "postprocess": toNull},
    {"name": "AND_TOKS", "symbols": [ANDSYM], "postprocess": toNull},
    {"name": "expressionList", "symbols": ["expression"], "postprocess": toArray(0)},
    {"name": "expressionList", "symbols": ["expression", "_", COMMA, "_", "expressionList"], "postprocess": toArray(0, 4)},
    {"name": "inassign", "symbols": ["local_ident", "_", COLON, "_", "expression"], "postprocess": 
        function(d, loc) {
            const ob = {};
            ob[d[0].v] = d[4];
            return ob;
        }
        },
    {"name": "inassign", "symbols": ["local_ident"], "postprocess": 
        function(d, loc) {
            const ob = {};
            ob[d[0].v] = d[0];
            return ob;
        }
        },
    {"name": "assignList", "symbols": ["assignList", "_", COMMA, "_", "inassign"], "postprocess": toObject(0, 4)},
    {"name": "assignList", "symbols": ["inassign"], "postprocess": id},
    {"name": "array", "symbols": [OPENS, "_", CLOSES], "postprocess": function(d, loc) { return { loc:loc, f:'[', l:[] } }},
    {"name": "array$ebnf$1$subexpression$1", "symbols": ["_", COMMA]},
    {"name": "array$ebnf$1", "symbols": ["array$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "array$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "array", "symbols": [OPENS, "_", "expressionList", "array$ebnf$1", "_", CLOSES], "postprocess": function(d, loc) { return { loc:loc, f:'[', l:d[2] } }},
    {"name": "object", "symbols": [OPENB, "_", CLOSEB], "postprocess": function(d, loc) { return { loc:loc, f:'{', l:{} } }},
    {"name": "object$ebnf$1$subexpression$1", "symbols": ["_", COMMA]},
    {"name": "object$ebnf$1", "symbols": ["object$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "object$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "object", "symbols": [OPENB, "_", "assignList", "object$ebnf$1", "_", CLOSEB], "postprocess": function(d, loc) { return { loc:loc, f:'{', l:d[2] } }},
    {"name": "parenthOp", "symbols": [OPENP, "_", "declareOp", "_", CLOSEP], "postprocess": function(d, loc) { return { loc:loc, f:'(', l:d[2] } }},
    {"name": "declareOp", "symbols": ["functionStatement"], "postprocess": id},
    {"name": "declareOp", "symbols": ["arrowFunctionStatement"], "postprocess": id},
    {"name": "declareOp", "symbols": ["manipOp"], "postprocess": id},
    {"name": "manipOp", "symbols": ["manipOp", "_", PLUSEQ, "_", "orOp"], "postprocess": stdF('+=')},
    {"name": "manipOp", "symbols": ["manipOp", "_", MINUSEQ, "_", "orOp"], "postprocess": stdF('-=')},
    {"name": "manipOp", "symbols": ["manipOp", "_", MULTEQ, "_", "orOp"], "postprocess": stdF('*=')},
    {"name": "manipOp", "symbols": ["manipOp", "_", DIVEQ, "_", "orOp"], "postprocess": stdF('/=')},
    {"name": "manipOp", "symbols": ["manipOp", "_", ASSIGN, "_", "orOp"], "postprocess": assignF()},
    {"name": "manipOp", "symbols": ["destructure", "_", ASSIGN, "_", "orOp"], "postprocess": stdF('=')},
    {"name": "manipOp", "symbols": ["orOp"], "postprocess": id},
    {"name": "orOp", "symbols": ["orOp", "_", "OR_TOKS", "_", "andOp"], "postprocess": stdF('||')},
    {"name": "orOp", "symbols": ["andOp"], "postprocess": id},
    {"name": "andOp", "symbols": ["andOp", "_", "AND_TOKS", "_", "eqcompareOp"], "postprocess": stdF('&&')},
    {"name": "andOp", "symbols": ["eqcompareOp"], "postprocess": id},
    {"name": "eqcompareOp", "symbols": ["eqcompareOp", "_", EQ, "_", "vcompareOp"], "postprocess": stdF('==')},
    {"name": "eqcompareOp", "symbols": ["eqcompareOp", "_", EEQ, "_", "vcompareOp"], "postprocess": stdF('===')},
    {"name": "eqcompareOp", "symbols": ["eqcompareOp", "_", NEQ, "_", "vcompareOp"], "postprocess": stdF('!=')},
    {"name": "eqcompareOp", "symbols": ["eqcompareOp", "_", NNEQ, "_", "vcompareOp"], "postprocess": stdF('!==')},
    {"name": "eqcompareOp", "symbols": ["vcompareOp"], "postprocess": id},
    {"name": "vcompareOp", "symbols": ["vcompareOp", "_", LT, "_", "additionOp"], "postprocess": stdF('<')},
    {"name": "vcompareOp", "symbols": ["vcompareOp", "_", GT, "_", "additionOp"], "postprocess": stdF('>')},
    {"name": "vcompareOp", "symbols": ["vcompareOp", "_", LTE, "_", "additionOp"], "postprocess": stdF('<=')},
    {"name": "vcompareOp", "symbols": ["vcompareOp", "_", GTE, "_", "additionOp"], "postprocess": stdF('>=')},
    {"name": "vcompareOp", "symbols": ["additionOp"], "postprocess": id},
    {"name": "additionOp", "symbols": ["additionOp", "_", PLUS, "_", "multOp"], "postprocess": stdF('+')},
    {"name": "additionOp", "symbols": ["additionOp", "_", MINUS, "_", "multOp"], "postprocess": stdF('-')},
    {"name": "additionOp", "symbols": ["multOp"], "postprocess": id},
    {"name": "multOp", "symbols": ["multOp", "_", MULT, "_", "unaryOp"], "postprocess": stdF('*')},
    {"name": "multOp", "symbols": ["multOp", "_", DIV, "_", "unaryOp"], "postprocess": stdF('/')},
    {"name": "multOp", "symbols": ["multOp", "_", REMAIN, "_", "unaryOp"], "postprocess": stdF('%')},
    {"name": "multOp", "symbols": ["unaryOp"], "postprocess": id},
    {"name": "unaryOp", "symbols": [NOT, "_", "unaryOp"], "postprocess": function(d, loc) { return { loc:loc, f:'!u', l:d[2] } }},
    {"name": "unaryOp", "symbols": [MINUS, "__", "unaryOp"], "postprocess": function(d, loc) { return { loc:loc, f:'-u', l:d[2] } }},
    {"name": "unaryOp", "symbols": [PLUS, "__", "unaryOp"], "postprocess": function(d, loc) { return { loc:loc, f:'+u', l:d[2] } }},
    {"name": "unaryOp", "symbols": [MINUS, "unaryOp"], "postprocess": 
        function(d, loc, reject) {
            // Reject if there's a number immediately after
            if (d[1].f === 'NUMBER') return reject;
            return { loc:loc, f:'-u', l:d[1] }
        }
        },
    {"name": "unaryOp", "symbols": [PLUS, "unaryOp"], "postprocess": 
        function(d, loc, reject) {
            // Reject if there's a number immediately after
            if (d[1].f === 'NUMBER') return reject;
            return { loc:loc, f:'+u', l:d[1] }
        }
        },
    {"name": "unaryOp", "symbols": [PLUSPLUS, "_", "unaryOp"], "postprocess": function(d, loc) { return { loc:loc, f:'++u', l:d[2] } }},
    {"name": "unaryOp", "symbols": [MINUSMINUS, "_", "unaryOp"], "postprocess": function(d, loc) { return { loc:loc, f:'--u', l:d[2] } }},
    {"name": "unaryOp", "symbols": ["prefPostOp"], "postprocess": id},
    {"name": "prefPostOp", "symbols": ["prefPostOp", "_", PLUSPLUS], "postprocess": function(d, loc) { return { loc:loc, f:'u++', l:d[0] } }},
    {"name": "prefPostOp", "symbols": ["prefPostOp", "_", MINUSMINUS], "postprocess": function(d, loc) { return { loc:loc, f:'u--', l:d[0] } }},
    {"name": "prefPostOp", "symbols": ["valueOrRef"], "postprocess": id},
    {"name": "valueOrRef", "symbols": ["nonRefs"], "postprocess": id},
    {"name": "valueOrRef", "symbols": ["allRef"], "postprocess": id},
    {"name": "dotRef", "symbols": ["allRef", "_", PERIOD, "_", "local_ident"], "postprocess": stdF('.')},
    {"name": "funRef", "symbols": ["allRef", "_", OPENP, "_", CLOSEP], "postprocess": function(d, loc) { return { loc:loc, f:'call', name:d[0], params:[]   } }},
    {"name": "funRef", "symbols": ["allRef", "_", OPENP, "_", "expressionList", "_", CLOSEP], "postprocess": function(d, loc) { return { loc:loc, f:'call', name:d[0], params:d[4] } }},
    {"name": "arrayRef", "symbols": ["allRef", "_", OPENS, "_", CLOSES], "postprocess": function(d, loc) { return { loc:loc, f:'arrayref', name:d[0], l:[]   } }},
    {"name": "arrayRef", "symbols": ["allRef", "_", OPENS, "_", "expression", "_", CLOSES], "postprocess": function(d, loc) { return { loc:loc, f:'arrayref', name:d[0], l:d[4] } }},
    {"name": "allRef", "symbols": ["dotRef"], "postprocess": id},
    {"name": "allRef", "symbols": ["funRef"], "postprocess": id},
    {"name": "allRef", "symbols": ["arrayRef"], "postprocess": id},
    {"name": "allRef", "symbols": ["parenthOp"], "postprocess": id},
    {"name": "allRef", "symbols": ["array"], "postprocess": id},
    {"name": "allRef", "symbols": ["object"], "postprocess": id},
    {"name": "allRef", "symbols": ["local_ident"], "postprocess": id},
    {"name": "allRef", "symbols": ["stringval"], "postprocess": id},
    {"name": "allRef", "symbols": ["boolean"], "postprocess": id},
    {"name": "nonRefs", "symbols": ["number"], "postprocess": id},
    {"name": "nonRefs", "symbols": ["nullval"], "postprocess": id},
    {"name": "nonRefs", "symbols": ["undefinedval"], "postprocess": id},
    {"name": "expression", "symbols": ["declareOp"], "postprocess": id},
    {"name": "local_ident", "symbols": ["identifier"], "postprocess": toLocalIdent},
    {"name": "block", "symbols": [OPENB, "_", "nestedStatements", "_", CLOSEB], "postprocess": nth(2)},
    {"name": "block", "symbols": [OPENB, "_", CLOSEB], "postprocess": function(d, loc) { return [] }},
    {"name": "inlineCode", "symbols": [INLINECODE], "postprocess": function(d, loc) { return { loc:loc, f:'INLINE', v:d[0][1] } }},
    {"name": "assignRef", "symbols": ["dotRef"], "postprocess": id},
    {"name": "assignRef", "symbols": ["local_ident"], "postprocess": id},
    {"name": "elseblock", "symbols": [ELSE, "_", "block"], "postprocess": 
        function(d, loc) {
            return { loc:loc, f:'elseb', block:d[2] }
        }
        },
    {"name": "elseifblock", "symbols": [ELSE, "_", IF, "_", OPENP, "_", "expression", "_", CLOSEP, "_", "block"], "postprocess": 
        function(d, loc) {
            return { loc:loc, f:'elseb', expr:d[6], block:d[10] }
        }
        },
    {"name": "ifStatement$ebnf$1", "symbols": []},
    {"name": "ifStatement$ebnf$1$subexpression$1", "symbols": ["_", "elseifblock"]},
    {"name": "ifStatement$ebnf$1", "symbols": ["ifStatement$ebnf$1", "ifStatement$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ifStatement$ebnf$2$subexpression$1", "symbols": ["_", "elseblock"]},
    {"name": "ifStatement$ebnf$2", "symbols": ["ifStatement$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "ifStatement$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ifStatement", "symbols": [IF, "_", OPENP, "_", "expression", "_", CLOSEP, "_", "block", "ifStatement$ebnf$1", "ifStatement$ebnf$2"], "postprocess": 
        function(d, loc) {
            var s = [ { loc:loc, f:'ifb', expr:d[4], block:d[8] } ];
            var s = s.concat(toList(9, 1)(d));
            if (d[10]) {
                s.push(d[10][1]);
            }
            return { loc:loc, f:'if', bc:s }
        }
        },
    {"name": "reservedOp", "symbols": [GOTO], "postprocess": id},
    {"name": "reservedOp", "symbols": [EVALUATE], "postprocess": id},
    {"name": "reservedOp", "symbols": [PRESERVE], "postprocess": id},
    {"name": "whileStatement", "symbols": [WHILE, "_", OPENP, "_", "expression", "_", CLOSEP, "_", "block"], "postprocess": 
        function(d, loc) {
            return { loc:loc, f:'while', expr:d[4], block:d[8] };
        }
        },
    {"name": "forInitOp", "symbols": ["expression"], "postprocess": id},
    {"name": "forInitOp", "symbols": ["letStatement"], "postprocess": id},
    {"name": "forInitOp", "symbols": ["constStatement"], "postprocess": id},
    {"name": "forStatement$ebnf$1$subexpression$1", "symbols": ["_", "forInitOp"]},
    {"name": "forStatement$ebnf$1", "symbols": ["forStatement$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "forStatement$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "forStatement$ebnf$2$subexpression$1", "symbols": ["_", "expression"]},
    {"name": "forStatement$ebnf$2", "symbols": ["forStatement$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "forStatement$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "forStatement$ebnf$3$subexpression$1", "symbols": ["_", "expression"]},
    {"name": "forStatement$ebnf$3", "symbols": ["forStatement$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "forStatement$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "forStatement", "symbols": [FOR, "_", OPENP, "forStatement$ebnf$1", "_", SEMICOLON, "forStatement$ebnf$2", "_", SEMICOLON, "forStatement$ebnf$3", "_", CLOSEP, "_", "block"], "postprocess": 
        function(d, loc) {
            var n = { loc:loc, f:'for', block:d[13] };
            if (d[3] !== null) {
                n.init = d[3][1];
            }
            if (d[6] !== null) {
                n.cond = d[6][1];
            }
            if (d[9] !== null) {
                n.iter = d[9][1];
            }
            return n;
        }
        },
    {"name": "expressionStatement$ebnf$1$subexpression$1", "symbols": ["_", SEMICOLON]},
    {"name": "expressionStatement$ebnf$1", "symbols": ["expressionStatement$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "expressionStatement$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "expressionStatement", "symbols": ["expression", "expressionStatement$ebnf$1"], "postprocess": 
        function(d, loc, reject) {
            var f = d[0];
            if (d[1] === null) {
                // Only permitted no semicolon if expression is a function
                // declaration.
                if (f.f !== 'function') {
                    return reject;
                }
            }
            return f;
        }
        },
    {"name": "nestedStatement", "symbols": ["letStatement", "_", SEMICOLON], "postprocess": nth(0)},
    {"name": "nestedStatement", "symbols": ["constStatement", "_", SEMICOLON], "postprocess": nth(0)},
    {"name": "nestedStatement", "symbols": ["whileStatement"], "postprocess": id},
    {"name": "nestedStatement", "symbols": ["forStatement"], "postprocess": id},
    {"name": "nestedStatement", "symbols": ["ifStatement"], "postprocess": id},
    {"name": "nestedStatement", "symbols": ["returnStatement"], "postprocess": id},
    {"name": "nestedStatement", "symbols": ["expressionStatement"], "postprocess": id},
    {"name": "nestedStatements", "symbols": ["nestedStatement"], "postprocess": toArray(0)},
    {"name": "nestedStatements", "symbols": ["nestedStatement", "_", "nestedStatements"], "postprocess": toArray(0, 2)},
    {"name": "destructure", "symbols": ["localIdentSetB"], "postprocess": function(d, loc) { return { loc:loc, f:'DESTRUCTOBJ', l:d[0] } }},
    {"name": "destructure", "symbols": ["localIdentSetS"], "postprocess": function(d, loc) { return { loc:loc, f:'DESTRUCTARRAY', l:d[0] } }},
    {"name": "identOrDestructure", "symbols": ["local_ident"], "postprocess": id},
    {"name": "identOrDestructure", "symbols": ["destructure"], "postprocess": id},
    {"name": "funcIdentSet", "symbols": ["identOrDestructure"], "postprocess": toArray(0)},
    {"name": "funcIdentSet", "symbols": ["identOrDestructure", "_", COMMA, "_", "funcIdentSet"], "postprocess": toArray(0, 4)},
    {"name": "funcParamSet", "symbols": [OPENP, "_", "funcIdentSet", "_", CLOSEP], "postprocess": nth(2)},
    {"name": "funcParamSet", "symbols": [OPENP, "_", CLOSEP], "postprocess": function(d, loc) { return []; }},
    {"name": "localIdentSet", "symbols": ["local_ident"], "postprocess": toArray(0)},
    {"name": "localIdentSet", "symbols": ["local_ident", "_", COMMA, "_", "localIdentSet"], "postprocess": toArray(0, 4)},
    {"name": "localIdentSetB$ebnf$1$subexpression$1", "symbols": ["_", COMMA]},
    {"name": "localIdentSetB$ebnf$1", "symbols": ["localIdentSetB$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "localIdentSetB$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "localIdentSetB", "symbols": [OPENB, "_", "localIdentSet", "localIdentSetB$ebnf$1", "_", CLOSEB], "postprocess": nth(2)},
    {"name": "localIdentSetB", "symbols": [OPENB, "_", CLOSEB], "postprocess": function(d, loc) { return []; }},
    {"name": "localIdentSetS$ebnf$1$subexpression$1", "symbols": ["_", COMMA]},
    {"name": "localIdentSetS$ebnf$1", "symbols": ["localIdentSetS$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "localIdentSetS$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "localIdentSetS", "symbols": [OPENS, "_", "localIdentSet", "localIdentSetS$ebnf$1", "_", CLOSES], "postprocess": nth(2)},
    {"name": "localIdentSetS", "symbols": [OPENS, "_", CLOSES], "postprocess": function(d, loc) { return []; }},
    {"name": "functionStatement$ebnf$1$subexpression$1", "symbols": ["_", "local_ident"]},
    {"name": "functionStatement$ebnf$1", "symbols": ["functionStatement$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "functionStatement$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "functionStatement", "symbols": [FUNCTION, "functionStatement$ebnf$1", "_", "funcParamSet", "_", "block"], "postprocess": 
        function(d, loc) {
            if (d[1] !== null) {
                return { loc:loc, f:'function', name:d[1][1], params:d[3], block:d[5] }
            }
            // Anonymous function declaration,
            return { loc:loc, f:'function', params:d[3], block:d[5] }
        }
        },
    {"name": "arrowrhs", "symbols": ["block"], "postprocess": id},
    {"name": "arrowrhs", "symbols": ["expression"], "postprocess": 
        function(d, loc, reject) {
            var expr = d[0];
            if (expr.f === '{') {
                return reject;
            }
            return expr;
        }
        },
    {"name": "arrowFunctionStatement", "symbols": ["funcParamSet", "_", ARROWFUNC, "_", "arrowrhs"], "postprocess": 
        function(d, loc) {
            return { loc:loc, f:'function', params:d[0], block:d[4] }
        }
        },
    {"name": "assignRightSide", "symbols": ["expression"], "postprocess": nth(0)},
    {"name": "assignOp", "symbols": ["identOrDestructure", "_", ASSIGN, "_", "assignRightSide"], "postprocess": 
        function(d, loc) {
            return { loc:loc, f:'=', l:d[0], r:d[4] }
        }
        },
    {"name": "letStatement", "symbols": [LET, "_", "assignOp"], "postprocess": 
        function(d, loc) {
            return { loc:loc, f:'let', l:d[2] }
        }
        },
    {"name": "constStatement", "symbols": [CONST, "_", "assignOp"], "postprocess": 
        function(d, loc) {
            return { loc:loc, f:'const', l:d[2] }
        }
        },
    {"name": "returnStatement", "symbols": [RETURN, "_", "expression", "_", SEMICOLON], "postprocess": 
        function(d, loc) {
            return { loc:loc, f:'return', expr:d[2] }
        }
        },
    {"name": "returnStatement", "symbols": [RETURN, "_", SEMICOLON], "postprocess": 
        function(d, loc) {
            return { loc:loc, f:'return' }
        }
        },
    {"name": "baseStatement", "symbols": ["constStatement", "_", SEMICOLON], "postprocess": nth(0)},
    {"name": "baseStatement", "symbols": ["functionStatement"], "postprocess": nth(0)},
    {"name": "baseStatements$ebnf$1", "symbols": []},
    {"name": "baseStatements$ebnf$1$subexpression$1", "symbols": ["_", "baseStatement"]},
    {"name": "baseStatements$ebnf$1", "symbols": ["baseStatements$ebnf$1", "baseStatements$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "baseStatements", "symbols": ["baseStatements$ebnf$1"], "postprocess": toList(0, 1)}
]
  , ParserStart: "vnjs"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();