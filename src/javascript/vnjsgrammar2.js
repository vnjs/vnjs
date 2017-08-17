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
    'var':-1,
    'define':-1,
    'and':-1,
    'or':-1,
    'goto':-1,
    'preserve':-1,
    'evaluate':-1,
    'from':-1,
    'install':-1,
    'function':-1,
    'wait':-1,
    'while':-1
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
  var COLON =   isSymbol(':');
  var PERIOD =  isSymbol('.');
  var COMMA =   isSymbol(',');
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

  var PLUS =  isSymbol('+');
  var MINUS = isSymbol('-');
  var MULT =  isSymbol('*');
  var DIV =   isSymbol('/');

  var NOT =    isSymbol('!');
  var ASSIGN = isSymbol('=');

  var CONST =    isWord('const');
  var LET =      isWord('let');
  var TRUE =     isWord('true');
  var FALSE =    isWord('false');
  var NULL =     isWord('null');
  var IF =       isWord('if');
  var ELSE =     isWord('else');
  var IMPORT =   isWord('import');
  var FROM =     isWord('from');
  var GOTO =     isWord('goto');
  var DEFINE =   isWord('define');
  var AND =      isWord('and');
  var OR =       isWord('or');
  var FUNCTION = isWord('function');
  var WAIT =     isWord('wait');
  var WHILE =    isWord('while');

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



  var toLocalIdent = function(d, loc, reject) {
    var str = d[0];
    // Reject keywords,
    if ( KEYWORDS[str] === -1 ) {
      return reject;
    }
    return str;
  };


  var toArray = function(v1, v2) {
    // v1 will always be a single value.
    // v2 will be an array or undefined
    return function(d, loc, reject) {

      var val1 = d[v1];
      const varr = [ { loc:loc, d:val1 } ];
      if (v2 === undefined) {
          return varr;
      }
      else {
        var val2 = d[v2];
        return varr.concat(d[v2]);
      }

    }
  }
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
    {"name": "namespaced_ident", "symbols": ["identifier"], "postprocess": function(d) { return d[0] }},
    {"name": "namespaced_ident", "symbols": ["identifier", "_", PERIOD, "_", "namespaced_ident"], "postprocess": function(d) { return d[0] + '#' + d[4] }},
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
    {"name": "unaryOp", "symbols": ["dotRef"], "postprocess": id},
    {"name": "dotRef", "symbols": ["dotRef", "_", PERIOD, "_", "funcCall"], "postprocess": function(d, loc) { return {loc:loc, f:'.', l:d[0], r:d[4] } }},
    {"name": "dotRef", "symbols": ["funcCall"], "postprocess": id},
    {"name": "funcCall", "symbols": ["valueOrPareth", "_", OPENP, "_", CLOSEP], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'call', name:d[0], params:[] }
        }
        },
    {"name": "funcCall", "symbols": ["valueOrPareth", "_", OPENP, "_", "commaArgSet", "_", CLOSEP], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'call', name:d[0], params:d[4] }
        }
        },
    {"name": "funcCall", "symbols": ["valueOrPareth"], "postprocess": id},
    {"name": "valueOrPareth", "symbols": ["value"], "postprocess": id},
    {"name": "valueOrPareth", "symbols": ["local_ident"], "postprocess": id},
    {"name": "valueOrPareth", "symbols": ["parenthOp"], "postprocess": id},
    {"name": "expression", "symbols": ["binaryOp"], "postprocess": id},
    {"name": "local_ident", "symbols": ["identifier"], "postprocess": toLocalIdent},
    {"name": "ns_local_ident", "symbols": ["namespaced_ident"], "postprocess": toLocalIdent},
    {"name": "block", "symbols": [OPENB, "_", "nestedStatements", "_", CLOSEB], "postprocess": nth(2)},
    {"name": "block", "symbols": [OPENB, "_", CLOSEB], "postprocess": function(d, loc) { return [] }},
    {"name": "inlineCode", "symbols": [INLINECODE], "postprocess": function(d, loc) { return { loc:loc, t:'INLINE', v:d[0][1] } }},
    {"name": "assignment", "symbols": ["ns_local_ident", "_", ASSIGN, "_", "expression", "_", SEMICOLON], "postprocess": 
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
    {"name": "reservedOp", "symbols": [GOTO], "postprocess": id},
    {"name": "reservedOp", "symbols": [EVALUATE], "postprocess": id},
    {"name": "reservedOp", "symbols": [PRESERVE], "postprocess": id},
    {"name": "waitStatement", "symbols": [WAIT, "_", SEMICOLON], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'wait' };
        }
        },
    {"name": "whileStatement", "symbols": [WHILE, "_", OPENP, "_", "expression", "_", CLOSEP, "_", "block"], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'while', expr:d[4], block:d[8] };
        }
        },
    {"name": "commaArgSet", "symbols": ["expression"], "postprocess": toArray(0)},
    {"name": "commaArgSet", "symbols": ["expression", "_", COMMA, "_", "commaArgSet"], "postprocess": toArray(0, 4)},
    {"name": "functionCall", "symbols": ["ns_local_ident", "_", OPENP, "_", CLOSEP], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'call', name:d[0], params:[] }
        }
        },
    {"name": "functionCall", "symbols": ["ns_local_ident", "_", OPENP, "_", "commaArgSet", "_", CLOSEP], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'call', name:d[0], params:d[4] }
        }
        },
    {"name": "expressionStatement", "symbols": ["expression", "_", SEMICOLON], "postprocess": nth(0)},
    {"name": "nestedStatement", "symbols": ["assignment"], "postprocess": id},
    {"name": "nestedStatement", "symbols": ["waitStatement"], "postprocess": id},
    {"name": "nestedStatement", "symbols": ["letStatement"], "postprocess": id},
    {"name": "nestedStatement", "symbols": ["constStatement"], "postprocess": id},
    {"name": "nestedStatement", "symbols": ["whileStatement"], "postprocess": id},
    {"name": "nestedStatement", "symbols": ["expressionStatement"], "postprocess": id},
    {"name": "nestedStatements", "symbols": ["nestedStatement"], "postprocess": toArray(0)},
    {"name": "nestedStatements", "symbols": ["nestedStatement", "_", "nestedStatements"], "postprocess": toArray(0, 2)},
    {"name": "functionParams", "symbols": ["local_ident"], "postprocess": toArray(0)},
    {"name": "functionParams", "symbols": ["local_ident", "_", COMMA, "_", "functionParams"], "postprocess": toArray(0, 4)},
    {"name": "functionParamsB", "symbols": [OPENP, "_", "functionParams", "_", CLOSEP], "postprocess": nth(2)},
    {"name": "functionParamsB", "symbols": [OPENP, "_", CLOSEP], "postprocess": function(d, loc) { return []; }},
    {"name": "functionStatement", "symbols": [FUNCTION, "_", "local_ident", "_", "functionParamsB", "_", "block"], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'function', name:d[2], params:d[4], block:d[6] }
        }
        },
    {"name": "assignRightSide", "symbols": ["expression", "_", SEMICOLON], "postprocess": nth(0)},
    {"name": "letStatement", "symbols": [LET, "_", "local_ident", "_", ASSIGN, "_", "assignRightSide"], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'let', var:d[2], expr:d[4] }
        }
        },
    {"name": "constStatement", "symbols": [CONST, "_", "local_ident", "_", ASSIGN, "_", "assignRightSide"], "postprocess": 
        function(d, loc) {
          return { loc:loc, f:'const', var:d[2], expr:d[6] }
        }
        },
    {"name": "baseStatement", "symbols": ["constStatement"], "postprocess": nth(0)},
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
