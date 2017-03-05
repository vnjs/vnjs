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
    'import':-1,
    'const':-1,
    'if':-1,
    'then':-1,
    'else':-1,
    'let':-1,
    'define':-1,
    'and':-1,
    'or':-1,
    'goto':-1
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
  function toNull(d) {
    return null;
  }


//  var ws = {literal: " "};
//  var number = {test: function(n) {
//      return n.constructor === Number;
//  }};
  
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
  
  var STRING_CONST = isToken('sv');
  var IDENT_CONST = isToken('i');
  var WHITESPACE = isToken('ws');
  var NUMBER = isToken('n');
  var COMMENT = isToken('c');
  
  var SEMICOLON = isSymbol(';');
  var COLON =  isSymbol(':');
  var PERIOD = isSymbol('.');
  var COMMA =  isSymbol(',');
  var OPENP =  isSymbol('(');
  var CLOSEP = isSymbol(')');
  var OPENB =  isSymbol('{');
  var CLOSEB = isSymbol('}');
  var ORSYM =  isSymbol('||');
  var ANDSYM = isSymbol('&&');
  var LT =   isSymbol('<');
  var GT =   isSymbol('>');
  var LTE =  isSymbol('<=');
  var GTE =  isSymbol('>=');
  var EQ =   isSymbol('==');
  var EEQ =  isSymbol('===');
  var NEQ =  isSymbol('!=');
  var NNEQ = isSymbol('!==');
  
  var PLUS =  isSymbol('+');
  var MINUS = isSymbol('-');
  var MULT =  isSymbol('*');
  var DIV =   isSymbol('/');
  
  var NOT =    isSymbol('!');
  var ASSIGN = isSymbol('=');

  var LET =    isWord('let');
  var TRUE =   isWord('true');
  var FALSE =  isWord('false');
  var NULL =   isWord('null');
  var IF =     isWord('if');
  var ELSE =   isWord('else');
  var IMPORT = isWord('import');
  var GOTO =   isWord('goto');
  var DEFINE = isWord('define');
  var AND =    isWord('and');
  var OR =     isWord('or');
  
  var EXPONENT = {
    test: function(n) { return n[0] === 'i' && (n[1] === 'E' || n[1] === 'e') }
  };
  
  var INLINECODE = {
    test: function(n) { return n[0] === 'ic' }
  };
  
var grammar = {
    ParserRules: [
    {"name": "vnjs", "symbols": ["baseStatements", "_"], "postprocess": nth(0)},
    {"name": "_$ebnf$1", "symbols": [WHITESPACE], "postprocess": id},
    {"name": "_$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": toNull},
    {"name": "__", "symbols": [WHITESPACE], "postprocess": toNull},
    {"name": "stringval", "symbols": [STRING_CONST], "postprocess": function(d, loc) { return { loc:loc, t:'STRING', v:d[0][1] } }},
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
            t:'NUMBER',
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
            t:'NUMBER',
            v:(d[0] || "") +
               "." + d[2][1] +
              (d[3] ? "e" + (d[3][1] || "+") + d[3][2][1] : "")
          }
        }
        
        },
    {"name": "boolean", "symbols": [TRUE], "postprocess": function(d, loc) { return { loc:loc, t:'BOOLEAN', v:true } }},
    {"name": "boolean", "symbols": [FALSE], "postprocess": function(d, loc) { return { loc:loc, t:'BOOLEAN', v:false } }},
    {"name": "nullval", "symbols": [NULL], "postprocess": function(d, loc) { return { loc:loc, t:'NULL', v:null } }},
    {"name": "identifier", "symbols": [IDENT_CONST], "postprocess": function(d) { return d[0][1] }},
    {"name": "comment", "symbols": [COMMENT], "postprocess": toNull},
    {"name": "OR_TOKS", "symbols": [ORSYM], "postprocess": toNull},
    {"name": "OR_TOKS", "symbols": [OR], "postprocess": toNull},
    {"name": "AND_TOKS", "symbols": [ANDSYM], "postprocess": toNull},
    {"name": "AND_TOKS", "symbols": [AND], "postprocess": toNull},
    {"name": "value", "symbols": ["boolean"], "postprocess": id},
    {"name": "value", "symbols": ["number"], "postprocess": id},
    {"name": "value", "symbols": ["stringval"], "postprocess": id},
    {"name": "value", "symbols": ["nullval"], "postprocess": id},
    {"name": "parenthOp", "symbols": [OPENP, "_", "binaryOp", "_", CLOSEP], "postprocess": function(d, loc) { return { loc:loc, t:'(', v:d[2] } }},
    {"name": "binaryOp", "symbols": ["orOp"], "postprocess": id},
    {"name": "orOp", "symbols": ["orOp", "_", "OR_TOKS", "_", "andOp"], "postprocess": function(d, loc) { return { loc:loc, f:'||', l:d[0], r:d[4] } }},
    {"name": "orOp", "symbols": ["andOp"], "postprocess": id},
    {"name": "andOp", "symbols": ["andOp", "_", "AND_TOKS", "_", "compareOp"], "postprocess": function(d, loc) { return { loc:loc, f:'&&', l:d[0], r:d[4] } }},
    {"name": "andOp", "symbols": ["compareOp"], "postprocess": id},
    {"name": "compareOp", "symbols": ["compareOp", "_", LT, "_", "additionOp"], "postprocess": function(d, loc) { return { loc:loc, f:'<', l:d[0], r:d[4] } }},
    {"name": "compareOp", "symbols": ["compareOp", "_", GT, "_", "additionOp"], "postprocess": function(d, loc) { return { loc:loc, f:'>', l:d[0], r:d[4] } }},
    {"name": "compareOp", "symbols": ["compareOp", "_", LTE, "_", "additionOp"], "postprocess": function(d, loc) { return { loc:loc, f:'<=', l:d[0], r:d[4] } }},
    {"name": "compareOp", "symbols": ["compareOp", "_", GTE, "_", "additionOp"], "postprocess": function(d, loc) { return { loc:loc, f:'>=', l:d[0], r:d[4] } }},
    {"name": "compareOp", "symbols": ["compareOp", "_", EQ, "_", "additionOp"], "postprocess": function(d, loc) { return { loc:loc, f:'==', l:d[0], r:d[4] } }},
    {"name": "compareOp", "symbols": ["compareOp", "_", EEQ, "_", "additionOp"], "postprocess": function(d, loc) { return { loc:loc, f:'===', l:d[0], r:d[4] } }},
    {"name": "compareOp", "symbols": ["compareOp", "_", NEQ, "_", "additionOp"], "postprocess": function(d, loc) { return { loc:loc, f:'!=', l:d[0], r:d[4] } }},
    {"name": "compareOp", "symbols": ["compareOp", "_", NNEQ, "_", "additionOp"], "postprocess": function(d, loc) { return { loc:loc, f:'!==', l:d[0], r:d[4] } }},
    {"name": "compareOp", "symbols": ["additionOp"], "postprocess": id},
    {"name": "additionOp", "symbols": ["additionOp", "_", PLUS, "_", "multOp"], "postprocess": function(d, loc) { return { loc:loc, f:'+', l:d[0], r:d[4] } }},
    {"name": "additionOp", "symbols": ["additionOp", "_", MINUS, "_", "multOp"], "postprocess": function(d, loc) { return { loc:loc, f:'-', l:d[0], r:d[4] } }},
    {"name": "additionOp", "symbols": ["multOp"], "postprocess": id},
    {"name": "multOp", "symbols": ["multOp", "_", MULT, "_", "unaryOp"], "postprocess": function(d, loc) { return { loc:loc, f:'*', l:d[0], r:d[4] } }},
    {"name": "multOp", "symbols": ["multOp", "_", DIV, "_", "unaryOp"], "postprocess": function(d, loc) { return { loc:loc, f:'/', l:d[0], r:d[4] } }},
    {"name": "multOp", "symbols": ["unaryOp"], "postprocess": id},
    {"name": "unaryOp", "symbols": [NOT, "_", "valueOrPareth"], "postprocess": function(d, loc) { return { loc:loc, f:'u!', l:d[2] } }},
    {"name": "unaryOp", "symbols": [MINUS, "__", "valueOrPareth"], "postprocess": function(d, loc) { return { loc:loc, f:'u-', l:d[2] } }},
    {"name": "unaryOp", "symbols": [MINUS, "valueOrPareth"], "postprocess": 
        function(d, loc, reject) {
          // Reject if there's a number immediately after
          if (d[1].t === 'NUMBER') return reject;
          return { loc:loc, f:'u-', l:d[1] }
        }
        },
    {"name": "unaryOp", "symbols": ["valueOrPareth"], "postprocess": id},
    {"name": "valueOrPareth", "symbols": ["value"], "postprocess": id},
    {"name": "valueOrPareth", "symbols": ["local_ident"], "postprocess": id},
    {"name": "valueOrPareth", "symbols": ["parenthOp"], "postprocess": id},
    {"name": "expression", "symbols": ["binaryOp"], "postprocess": id},
    {"name": "local_ident", "symbols": ["identifier"], "postprocess": 
          function(d, loc, reject) {
            var str = d[0];
            // Reject keywords,
            if ( KEYWORDS[str] === -1 ) {
              return reject;
            }
            return str;
        //    return { loc:loc, t:'LOCAL', v:str };
          }
        },
    {"name": "argAssign", "symbols": ["expression"], "postprocess": 
        function(d, loc) {
          return { loc:loc, t:'ARG_ASSIGN', l:'default', r:d[0] }
        }
        },
    {"name": "argAssign", "symbols": ["local_ident", "_", COLON, "_", "expression"], "postprocess": 
        function(d, loc) {
          return { loc:loc, t:'ARG_ASSIGN', l:d[0], r:d[4] }
        }
        },
    {"name": "argSetTree", "symbols": ["argAssign"], "postprocess": id},
    {"name": "argSetTree", "symbols": ["argAssign", "__", "argSetTree"], "postprocess": function(d, loc) { return { loc:loc, t:'ARGF', l:d[0], r:d[2] } }},
    {"name": "argSetTree", "symbols": ["argAssign", "_", COMMA, "_", "argSetTree"], "postprocess": function(d, loc) { return { loc:loc, t:'ARGF', l:d[0], r:d[4] } }},
    {"name": "argSet", "symbols": ["argSetTree"], "postprocess": 
        function(d, loc, reject) {
          // Flatten argument tree,
          var map = {};
          var tree = d[0];
          function flatten(n) {
            if (n.t === 'ARG_ASSIGN') {
              if (map[n.l] === void 0) {
                map[n.l] = n.r;
              }
              else {
                return reject;
              }
            }
            else {
              // Recurse left and right, and reject if necessary
              if (flatten(n.l) === reject || flatten(n.r) === reject) return reject;
            }
          }
          if (flatten(d[0]) === reject) {
            return reject;
          }
          else {
            return { loc:loc, t:'ARGS', d:map }
          }
        }
        },
    {"name": "block", "symbols": [OPENB, "nestedStatements", "_", CLOSEB], "postprocess": function(d, loc) { return { loc:loc, t:'BLOCK', v:d[1] } }},
    {"name": "block", "symbols": [OPENB, "_", CLOSEB], "postprocess": function(d, loc) { return { loc:loc, t:'BLOCK', v:[] } }},
    {"name": "nbFunctionCall", "symbols": ["local_ident"], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'call', l:d[0], r:{ loc:loc, t:'ARGS', d:{} } }
        }
        },
    {"name": "nbFunctionCall", "symbols": ["local_ident", "__", "argSet"], "postprocess": 
        function(d, loc, reject) {
          var argSet = d[2];
          // This rejects grammar where the default argument is a parethizied
          // expression.
          var st = Object.keys(argSet.d);
          if (st.length === 1 && st[0] === 'default' && argSet.d.default.t === '(') {
            return reject;
          }
          return { loc:loc, f:'call', l:d[0], r:argSet }
        }
        },
    {"name": "functionCall", "symbols": ["local_ident", "_", OPENP, "_", CLOSEP], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'call', l:d[0], r:{ loc:loc, t:'ARGS', d:{} } }
        }
        },
    {"name": "functionCall", "symbols": ["local_ident", "_", OPENP, "_", "argSet", "_", CLOSEP], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'call', l:d[0], r:d[4] }
        }
        },
    {"name": "baseFunctionCall", "symbols": ["local_ident", "_", PERIOD, "_", "functionCall"], "postprocess": function(d, loc) { return { loc:loc, f:'refcall', l:d[0], r:d[4] } }},
    {"name": "inlineCode", "symbols": [INLINECODE], "postprocess": function(d, loc) { return { loc:loc, t:'INLINE', v:d[0][1] } }},
    {"name": "letRightSide", "symbols": ["expression"], "postprocess": id},
    {"name": "letRightSide", "symbols": ["functionCall"], "postprocess": id},
    {"name": "letRightSide", "symbols": ["inlineCode"], "postprocess": id},
    {"name": "assignment", "symbols": ["local_ident", "_", ASSIGN, "_", "expression", "_", SEMICOLON], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'=', l:d[0], r:d[4] }
        }
        },
    {"name": "elseblock", "symbols": [ELSE, "_", "block"], "postprocess": 
        function(d, loc) {
          return { loc:loc, t:'ELSE', e:null, b:d[2] }
        }
        },
    {"name": "elseifblock", "symbols": [ELSE, "_", IF, "_", "expression", "_", "block"], "postprocess": 
        function(d, loc) {
          return { loc:loc, t:'ELSE', e:d[4], b:d[6] }
        }
        },
    {"name": "ifstatement$ebnf$1", "symbols": []},
    {"name": "ifstatement$ebnf$1$subexpression$1", "symbols": ["_", "elseifblock"]},
    {"name": "ifstatement$ebnf$1", "symbols": ["ifstatement$ebnf$1", "ifstatement$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ifstatement$ebnf$2$subexpression$1", "symbols": ["_", "elseblock"]},
    {"name": "ifstatement$ebnf$2", "symbols": ["ifstatement$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "ifstatement$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ifstatement", "symbols": [IF, "_", "expression", "_", "block", "ifstatement$ebnf$1", "ifstatement$ebnf$2"], "postprocess": 
        function(d, loc) {
          var s = toList(5, 1)(d);
          if (d[6]) {
            s.push(d[6][1]);
          }
          return { loc:loc, t:'IF', e:d[2], b:d[4], o:s }
        }
        },
    {"name": "gotostatement", "symbols": [GOTO, "_", "local_ident", "_", SEMICOLON], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'goto', l:d[2] }
        }
        },
    {"name": "importstatement", "symbols": [IMPORT, "__", "stringval", "_", SEMICOLON], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'import', l:d[2] }
        }
        },
    {"name": "letstatement", "symbols": [LET, "__", "local_ident", "_", ASSIGN, "_", "letRightSide", "_", SEMICOLON], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'let', l:d[2], r:d[6] }
        }
        },
    {"name": "definestatement", "symbols": [DEFINE, "__", "local_ident", "_", "block"], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'define', l:d[2], r:d[4] }
        }
        },
    {"name": "nestedStatement", "symbols": ["assignment"], "postprocess": nth(0)},
    {"name": "nestedStatement", "symbols": ["functionCall", "_", SEMICOLON], "postprocess": nth(0)},
    {"name": "nestedStatement", "symbols": ["nbFunctionCall", "_", SEMICOLON], "postprocess": nth(0)},
    {"name": "nestedStatement", "symbols": ["ifstatement"], "postprocess": nth(0)},
    {"name": "nestedStatement", "symbols": ["gotostatement"], "postprocess": nth(0)},
    {"name": "nestedStatement", "symbols": ["comment"], "postprocess": nth(0)},
    {"name": "baseStatement", "symbols": ["letstatement"], "postprocess": nth(0)},
    {"name": "baseStatement", "symbols": ["baseFunctionCall", "_", SEMICOLON], "postprocess": nth(0)},
    {"name": "baseStatement", "symbols": ["definestatement"], "postprocess": nth(0)},
    {"name": "baseStatement", "symbols": ["importstatement"], "postprocess": nth(0)},
    {"name": "baseStatement", "symbols": ["comment"], "postprocess": nth(0)},
    {"name": "nestedStatements$ebnf$1$subexpression$1", "symbols": ["_", "nestedStatement"]},
    {"name": "nestedStatements$ebnf$1", "symbols": ["nestedStatements$ebnf$1$subexpression$1"]},
    {"name": "nestedStatements$ebnf$1$subexpression$2", "symbols": ["_", "nestedStatement"]},
    {"name": "nestedStatements$ebnf$1", "symbols": ["nestedStatements$ebnf$1", "nestedStatements$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "nestedStatements", "symbols": ["nestedStatements$ebnf$1"], "postprocess": toList(0, 1)},
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