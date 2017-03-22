
# Parser Generator for the Visual Novel scene language.
#
# Compile using 'nearley';
#   npm install -g nearley

@builtin "postprocessors.ne"


@{%
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
    'evaluate':-1
  };
%}

@{%
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
%}

vnjs -> baseStatements _ {% nth(0) %}

general_expression -> _ expression _ {% nth(1) %}




##### TOKENS START


@{%
  
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

  var CONST =  isWord('const');
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

  var VAR =      isWord('var');
  var PRESERVE = isWord('preserve');
  var EVALUATE = isWord('evaluate');

  var EXPONENT = {
    test: function(n) { return n[0] === 'i' && (n[1] === 'E' || n[1] === 'e') }
  };
  
  var INLINECODE = {
    test: function(n) { return n[0] === 'ic' }
  };
  
%}





# Whitespace: `_` is optional, `__` is mandatory.
_  -> (%WHITESPACE | %COMMENT):* {% toNull %}
__ -> (%WHITESPACE | %COMMENT):+ {% toNull %}

stringval -> %STRING_CONST {% function(d, loc) { return { loc:loc, t:'STRING', v:d[0][1] } } %}


plusorminus -> %MINUS {% function(d) { return '-' } %}
             | %PLUS  {% function(d) { return '+' } %}

number -> plusorminus:? %NUMBER (%PERIOD %NUMBER):? (%EXPONENT plusorminus:? %NUMBER):? {%
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
%}
        | plusorminus:? %PERIOD %NUMBER (%EXPONENT plusorminus:? %NUMBER):? {%
  function(d, loc) {
    return {
      loc:loc,
      t:'NUMBER',
      v:(d[0] || "") +
         "." + d[2][1] +
        (d[3] ? "e" + (d[3][1] || "+") + d[3][2][1] : "")
    }
  }

%}


boolean -> %TRUE  {% function(d, loc) { return { loc:loc, t:'BOOLEAN', v:true } } %}
         | %FALSE {% function(d, loc) { return { loc:loc, t:'BOOLEAN', v:false } } %}

nullval -> %NULL  {% function(d, loc) { return { loc:loc, t:'NULL', v:null } } %}


identifier -> %IDENT_CONST             {% function(d) { return d[0][1] } %}

namespaced_ident -> identifier       {% function(d) { return d[0] } %}
                  | identifier _ %PERIOD _ namespaced_ident
                                     {% function(d) { return d[0] + '#' + d[4] } %}


comment -> %COMMENT {% toNull %}


##### TOKENS END



OR_TOKS -> %ORSYM {% toNull %}
         | %OR    {% toNull %}
AND_TOKS -> %ANDSYM {% toNull %}
          | %AND    {% toNull %}






value -> boolean   {% id %}
       | number    {% id %}
       | stringval {% id %}
       | nullval   {% id %}

parenthOp -> %OPENP _ binaryOp _ %CLOSEP  {% function(d, loc) { return { loc:loc, t:'(', v:d[2] } } %}

binaryOp -> orOp {% id %}

orOp -> orOp _ OR_TOKS _ andOp {% function(d, loc) { return { loc:loc, f:'||', l:d[0], r:d[4] } } %}
      | andOp {% id %}

andOp -> andOp _ AND_TOKS _ compareOp {% function(d, loc) { return { loc:loc, f:'&&', l:d[0], r:d[4] } } %}
       | compareOp {% id %}

compareOp -> compareOp _ %LT _ additionOp   {% function(d, loc) { return { loc:loc, f:'<', l:d[0], r:d[4] } } %}
           | compareOp _ %GT _ additionOp   {% function(d, loc) { return { loc:loc, f:'>', l:d[0], r:d[4] } } %}
           | compareOp _ %LTE _ additionOp  {% function(d, loc) { return { loc:loc, f:'<=', l:d[0], r:d[4] } } %}
           | compareOp _ %GTE _ additionOp  {% function(d, loc) { return { loc:loc, f:'>=', l:d[0], r:d[4] } } %}
           | compareOp _ %EQ _ additionOp   {% function(d, loc) { return { loc:loc, f:'==', l:d[0], r:d[4] } } %}
           | compareOp _ %EEQ _ additionOp  {% function(d, loc) { return { loc:loc, f:'===', l:d[0], r:d[4] } } %}
           | compareOp _ %NEQ _ additionOp  {% function(d, loc) { return { loc:loc, f:'!=', l:d[0], r:d[4] } } %}
           | compareOp _ %NNEQ _ additionOp {% function(d, loc) { return { loc:loc, f:'!==', l:d[0], r:d[4] } } %}
           | additionOp {% id %}

additionOp -> additionOp _ %PLUS _ multOp   {% function(d, loc) { return { loc:loc, f:'+', l:d[0], r:d[4] } } %}
            | additionOp _ %MINUS _ multOp  {% function(d, loc) { return { loc:loc, f:'-', l:d[0], r:d[4] } } %}
            | multOp {% id %}

multOp -> multOp _ %MULT _ unaryOp      {% function(d, loc) { return { loc:loc, f:'*', l:d[0], r:d[4] } } %}
        | multOp _ %DIV _ unaryOp       {% function(d, loc) { return { loc:loc, f:'/', l:d[0], r:d[4] } } %}
        | unaryOp {% id %}

unaryOp -> %NOT _ valueOrPareth       {% function(d, loc) { return { loc:loc, f:'u!', l:d[2] } } %}
         | %MINUS __ valueOrPareth    {% function(d, loc) { return { loc:loc, f:'u-', l:d[2] } } %}
         | %MINUS valueOrPareth       {%
  function(d, loc, reject) {
    // Reject if there's a number immediately after
    if (d[1].t === 'NUMBER') return reject;
    return { loc:loc, f:'u-', l:d[1] }
  }
%}
         | valueOrPareth {% id %}

valueOrPareth -> value {% id %}
               | ns_local_ident {% id %}
               | parenthOp {% id %}

expression -> binaryOp {% id %}


# ---------------

@{%
  var toLocalIdent = function(d, loc, reject) {
    var str = d[0];
    // Reject keywords,
    if ( KEYWORDS[str] === -1 ) {
      return reject;
    }
    return str;
//    return { loc:loc, t:'LOCAL', v:str };
  };
%}

local_ident -> identifier           {% toLocalIdent %}

ns_local_ident -> namespaced_ident  {% toLocalIdent %}

# ---------------

simpleArgAssign -> valueOrPareth {%
  function(d, loc) {
    return { loc:loc, t:'ARG_ASSIGN', l:'default', r:d[0] }
  }
%}
                 | local_ident _ %COLON _ valueOrPareth {%
  function(d, loc) {
    return { loc:loc, t:'ARG_ASSIGN', l:d[0], r:d[4] }
  }
%}



argAssign -> expression {%
  function(d, loc) {
    return { loc:loc, t:'ARG_ASSIGN', l:'default', r:d[0] }
  }
%}
           | local_ident _ %COLON _ expression {%
  function(d, loc) {
    return { loc:loc, t:'ARG_ASSIGN', l:d[0], r:d[4] }
  }
%}



argSetTree -> simpleArgAssign {% id %}
            | simpleArgAssign __ argSetTree
    {% function(d, loc) { return { loc:loc, t:'ARGF', l:d[0], r:d[2] } } %}

commaArgSetTree -> argAssign {% id %}
            | argAssign _ %COMMA _ commaArgSetTree
    {% function(d, loc) { return { loc:loc, t:'ARGF', l:d[0], r:d[4] } } %}

@{%
  var flattenArgumentTree = function(d, loc, reject) {
    // Flatten argument tree,
    var map = {};
    var tree = d[0];
    function flatten(n) {
      if (n !== null) {
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
    }
    if (flatten(d[0]) === reject) {
      return reject;
    }
    else {
      return { loc:loc, t:'ARGS', d:map }
    }
  }
%}

argSet -> argSetTree {% flattenArgumentTree %}

commaArgSet -> commaArgSetTree (_ %COMMA):? {% flattenArgumentTree %}






# ---------------

block -> %OPENB nestedStatements _ %CLOSEB {% function(d, loc) { return { loc:loc, t:'BLOCK', v:d[1] } } %}
       | %OPENB _ %CLOSEB                  {% function(d, loc) { return { loc:loc, t:'BLOCK', v:[] } } %}

# Array call, for example;
#   fadeIn( background );

# No bracket function call (only valid within nested statements)
nbFunctionCall -> ns_local_ident {%
  function(d, loc) {
    return { loc:loc, f:'call', l:d[0], r:{ loc:loc, t:'ARGS', d:{} } }
  }
%}
                | ns_local_ident __ argSet {%
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
%}

# Function call with parenthese (valid everywhere)
functionCall -> ns_local_ident _ %OPENP _ %CLOSEP {%
  function(d, loc) {
    return { loc:loc, f:'call', l:d[0], r:{ loc:loc, t:'ARGS', d:{} } }
  }
%}
              | ns_local_ident _ %OPENP _ commaArgSet _ %CLOSEP {%
  function(d, loc) {
    return { loc:loc, f:'call', l:d[0], r:d[4] }
  }
%}

# Mutator function call,
mutatorFunctionCall -> local_ident _ %OPENP _ %CLOSEP {%
  function(d, loc) {
    return { loc:loc, f:'call', l:d[0], r:{ loc:loc, t:'ARGS', d:{} } }
  }
%}
                     | local_ident _ %OPENP _ commaArgSet _ %CLOSEP {%
  function(d, loc) {
    return { loc:loc, f:'call', l:d[0], r:d[4] }
  }
%}


baseFunctionCall -> ns_local_ident _ %PERIOD _ mutatorFunctionCall
      {% function(d, loc) { return { loc:loc, f:'refcall', l:d[0], r:d[4] } } %}


inlineCode -> %INLINECODE
      {% function(d, loc) { return { loc:loc, t:'INLINE', v:d[0][1] } } %}



constRightSide -> expression _ %SEMICOLON       {% nth(0) %}
                | functionCall _ %SEMICOLON     {% nth(0) %}
                | inlineCode ( _ %SEMICOLON ):? {% nth(0) %}


assignment -> ns_local_ident _ %ASSIGN _ expression _ %SEMICOLON {%
  function(d, loc) {
    return { loc:loc, f:'=', l:d[0], r:d[4] }
  }
%}

elseblock -> %ELSE _ block {%
  function(d, loc) {
    return { loc:loc, t:'ELSE', e:null, b:d[2] }
  }
%}

elseifblock -> %ELSE _ %IF _ expression _ block {%
  function(d, loc) {
    return { loc:loc, t:'ELSE', e:d[4], b:d[6] }
  }
%}

ifstatement -> %IF _ expression _ block ( _ elseifblock ):* ( _ elseblock ):? {%
  function(d, loc) {
    var s = toList(5, 1)(d);
    if (d[6]) {
      s.push(d[6][1]);
    }
    return { loc:loc, t:'IF', e:d[2], b:d[4], o:s }
  }
%}


reservedOp -> %GOTO {% id %}
            | %EVALUATE {% id %}
            | %PRESERVE {% id %}

langstatement -> reservedOp _ ns_local_ident _ %SEMICOLON {%
  function(d, loc) {
    return { loc:loc, f:d[0][1], l:d[2] }
  }
%}


importstatement -> %IMPORT __ stringval _ %SEMICOLON {%
  function(d, loc) {
    return { loc:loc, f:'import', l:d[2] }
  }
%}

conststatement -> %CONST __ ns_local_ident _ %ASSIGN _ constRightSide {%
  function(d, loc) {
    return { loc:loc, f:'const', l:d[2], r:d[6] }
  }
%}

definestatement -> %DEFINE __ ns_local_ident _ block {%
  function(d, loc) {
    return { loc:loc, f:'define', l:d[2], r:d[4] }
  }
%}


nestedStatement -> assignment {% nth(0) %}
                 | functionCall _ %SEMICOLON {% nth(0) %}
                 | nbFunctionCall _ %SEMICOLON {% nth(0) %}
                 | ifstatement {% nth(0) %}
                 | langstatement {% nth(0) %}


baseStatement -> conststatement {% nth(0) %}
               | baseFunctionCall _ %SEMICOLON {% nth(0) %}
               | definestatement {% nth(0) %}
               | importstatement {% nth(0) %}

nestedStatements -> ( _ nestedStatement ):+ {% toList(0, 1) %}

baseStatements -> ( _ baseStatement ):* {% toList(0, 1) %}


# -----------

