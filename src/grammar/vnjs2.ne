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
        'undefined':-1,
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

    var PLUS =  isSymbol('+');
    var MINUS = isSymbol('-');
    var MULT =  isSymbol('*');
    var DIV =   isSymbol('/');

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
    var FROM =      isWord('from');
    var GOTO =      isWord('goto');
    var DEFINE =    isWord('define');
    var AND =       isWord('and');
    var OR =        isWord('or');
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

%}

vnjs -> baseStatements _ {% nth(0) %}

general_expression -> _ expression _ {% nth(1) %}


# Whitespace: `_` is optional, `__` is mandatory.
_  -> (%WHITESPACE | %COMMENT):* {% toNull %}
__ -> (%WHITESPACE | %COMMENT):+ {% toNull %}

stringval -> %STRING_CONST {% function(d, loc) { return { loc:loc, f:'STRING', v:d[0][1] } } %}


plusorminus -> %MINUS {% function(d) { return '-' } %}
             | %PLUS  {% function(d) { return '+' } %}

number -> plusorminus:? %NUMBER (%PERIOD %NUMBER):? (%EXPONENT plusorminus:? %NUMBER):?
{%
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
%}
        | plusorminus:? %PERIOD %NUMBER (%EXPONENT plusorminus:? %NUMBER):?
{%
    function(d, loc) {
        return {
            loc:loc,
            f:'NUMBER',
            v:(d[0] || "") +
            "." + d[2][1] +
            (d[3] ? "e" + (d[3][1] || "+") + d[3][2][1] : "")
        }
    }
%}


boolean -> %TRUE           {% function(d, loc) { return { loc:loc, f:'BOOLEAN', v:true } } %}
         | %FALSE          {% function(d, loc) { return { loc:loc, f:'BOOLEAN', v:false } } %}

nullval -> %NULL           {% function(d, loc) { return { loc:loc, f:'NULL', v:null } } %}

undefinedval -> %UNDEFINED {% function(d, loc) { return { loc:loc, f:'UNDEFINED', v:undefined } } %}

identifier -> %IDENT_CONST {% function(d) { return d[0][1] } %}


##### TOKENS END



OR_TOKS -> %ORSYM {% toNull %}
         | %OR    {% toNull %}
AND_TOKS -> %ANDSYM {% toNull %}
          | %AND    {% toNull %}





@{%
    function stdF(ftype) {
        return function(d, loc, reject) {
            return { loc:loc, f:ftype, l:d[0], r:d[4] };
        }
    }
%}


# Comma separated expression list

expressionList -> expression                            {% toArray(0) %}
                | expression _ %COMMA _ expressionList  {% toArray(0, 4) %}


inassign -> local_ident _ %COLON _ expression
{%
    function(d, loc) {
        const ob = {};
        ob[d[0].v] = d[4];
        return ob;
    }
%}
          | local_ident
{%
  function(d, loc) {
      const ob = {};
      ob[d[0].v] = d[0];
      return ob;
  }
%}


assignList -> assignList _ %COMMA _ inassign  {% toObject(0, 4) %}
            | inassign                        {% id %}


array -> %OPENS _ %CLOSES
                    {% function(d, loc) { return { loc:loc, f:'[', l:[] } } %}
       | %OPENS _ expressionList (_ %COMMA):? _ %CLOSES
                    {% function(d, loc) { return { loc:loc, f:'[', l:d[2] } } %}

object -> %OPENB _ %CLOSEB
                    {% function(d, loc) { return { loc:loc, f:'{', l:{} } } %}
        | %OPENB _ assignList (_ %COMMA):? _ %CLOSEB
                    {% function(d, loc) { return { loc:loc, f:'{', l:d[2] } } %}


parenthOp -> %OPENP _ binaryOp _ %CLOSEP  {% function(d, loc) { return { loc:loc, f:'(', l:d[2] } } %}

binaryOp -> orOp {% id %}

orOp -> orOp _ OR_TOKS _ andOp {% stdF('||') %}
      | andOp {% id %}

andOp -> andOp _ AND_TOKS _ compareOp {% stdF('&&') %}
       | compareOp {% id %}

compareOp -> compareOp _ %LT _ manipOp   {% stdF('<') %}
           | compareOp _ %GT _ manipOp   {% stdF('>') %}
           | compareOp _ %LTE _ manipOp  {% stdF('<=') %}
           | compareOp _ %GTE _ manipOp  {% stdF('>=') %}
           | compareOp _ %EQ _ manipOp   {% stdF('==') %}
           | compareOp _ %EEQ _ manipOp  {% stdF('===') %}
           | compareOp _ %NEQ _ manipOp  {% stdF('!=') %}
           | compareOp _ %NNEQ _ manipOp {% stdF('!==') %}
           | manipOp {% id %}

manipOp -> manipOp _ %PLUSEQ _ additionOp  {% stdF('+=') %}
         | manipOp _ %MINUSEQ _ additionOp {% stdF('-=') %}
         | manipOp _ %MULTEQ _ additionOp  {% stdF('*=') %}
         | manipOp _ %DIVEQ _ additionOp   {% stdF('/=') %}
         | additionOp {% id %}

additionOp -> additionOp _ %PLUS _ multOp   {% stdF('+') %}
            | additionOp _ %MINUS _ multOp  {% stdF('-') %}
            | multOp {% id %}

multOp -> multOp _ %MULT _ unaryOp    {% stdF('*') %}
        | multOp _ %DIV _ unaryOp     {% stdF('/') %}
        | unaryOp {% id %}

unaryOp -> %NOT _ unaryOp       {% function(d, loc) { return { loc:loc, f:'!u', l:d[2] } } %}
         | %MINUS __ unaryOp    {% function(d, loc) { return { loc:loc, f:'-u', l:d[2] } } %}
         | %PLUS __ unaryOp     {% function(d, loc) { return { loc:loc, f:'+u', l:d[2] } } %}
         | %MINUS unaryOp
{%
    function(d, loc, reject) {
        // Reject if there's a number immediately after
        if (d[1].f === 'NUMBER') return reject;
        return { loc:loc, f:'-u', l:d[1] }
    }
%}
         | %PLUS unaryOp
{%
    function(d, loc, reject) {
        // Reject if there's a number immediately after
        if (d[1].f === 'NUMBER') return reject;
        return { loc:loc, f:'+u', l:d[1] }
    }
%}
         | prefPostOp {% id %}

prefPostOp -> %PLUSPLUS _ prefPostOp    {% function(d, loc) { return { loc:loc, f:'++u', l:d[2] } } %}
            | prefPostOp _ %PLUSPLUS    {% function(d, loc) { return { loc:loc, f:'u++', l:d[0] } } %}
            | %MINUSMINUS _ prefPostOp  {% function(d, loc) { return { loc:loc, f:'--u', l:d[2] } } %}
            | prefPostOp _ %MINUSMINUS  {% function(d, loc) { return { loc:loc, f:'u--', l:d[0] } } %}
            | valueOrRef {% id %}


valueOrRef -> nonRefs {% id %}
            | allRef {% id %}


dotRef -> allRef _ %PERIOD _ local_ident {% stdF('.') %}


funRef -> allRef _ %OPENP _ %CLOSEP                  {% function(d, loc) { return { loc:loc, f:'call', name:d[0], params:[]   } } %}
        | allRef _ %OPENP _ expressionList _ %CLOSEP {% function(d, loc) { return { loc:loc, f:'call', name:d[0], params:d[4] } } %}

arrayRef -> allRef _ %OPENS _ %CLOSES                {% function(d, loc) { return { loc:loc, f:'arrayref', name:d[0], l:[]   } } %}
          | allRef _ %OPENS _ expression _ %CLOSES   {% function(d, loc) { return { loc:loc, f:'arrayref', name:d[0], l:d[4] } } %}


allRef -> dotRef {% id %}
        | funRef {% id %}
        | arrayRef {% id %}
        | parenthOp {% id %}
        | array {% id %}
        | object {% id %}
        | local_ident {% id %}
        | stringval {% id %}
        | boolean {% id %}


nonRefs -> number {% id %}
         | nullval {% id %}
         | undefinedval {% id %}













expression -> binaryOp {% id %}


# ---------------

@{%
    var toLocalIdent = function(d, loc, reject) {
        var str = d[0];
        // Reject keywords,
        if ( KEYWORDS[str] === -1 ) {
            return reject;
        }
        return { loc:loc, f:'IDENT', v:str };
    };
%}

local_ident -> identifier           {% toLocalIdent %}


# ---------------

block -> %OPENB _ nestedStatements _ %CLOSEB {% nth(2) %}
       | %OPENB _ %CLOSEB                    {% function(d, loc) { return [] } %}


inlineCode -> %INLINECODE
      {% function(d, loc) { return { loc:loc, f:'INLINE', v:d[0][1] } } %}



assignRef -> dotRef      {% id %}
           | local_ident {% id %}


assignment -> assignRef _ %ASSIGN _ expression _ %SEMICOLON
{%
    function(d, loc) {
        return { loc:loc, f:'=', l:d[0], r:d[4] }
    }
%}

elseblock -> %ELSE _ block
{%
    function(d, loc) {
        return { loc:loc, f:'elseb', block:d[2] }
    }
%}

elseifblock -> %ELSE _ %IF _ %OPENP _ expression _ %CLOSEP _ block
{%
    function(d, loc) {
        return { loc:loc, f:'elseb', expr:d[6], block:d[10] }
    }
%}

ifStatement -> %IF _ %OPENP _ expression _ %CLOSEP _ block ( _ elseifblock ):* ( _ elseblock ):?
{%
    function(d, loc) {
        var s = [ { loc:loc, f:'ifb', expr:d[4], block:d[8] } ];
        var s = s.concat(toList(9, 1)(d));
        if (d[10]) {
            s.push(d[10][1]);
        }
        return { loc:loc, f:'if', bc:s }
    }
%}


reservedOp -> %GOTO {% id %}
            | %EVALUATE {% id %}
            | %PRESERVE {% id %}



whileStatement -> %WHILE _ %OPENP _ expression _ %CLOSEP _ block
{%
    function(d, loc) {
        return { loc:loc, f:'while', expr:d[4], block:d[8] };
    }
%}




#commaArgSet -> expression {% toArray(0) %}
#             | expression _ %COMMA _ commaArgSet {% toArray(0, 4) %}



expressionStatement -> expression _ %SEMICOLON {% nth(0) %}



nestedStatement ->
                   assignment {% id %}
                 | letStatement {% id %}
                 | constStatement {% id %}
                 | whileStatement {% id %}
                 | ifStatement {% id %}
                 | functionStatement {% id %}
                 | returnStatement {% id %}
                 | expressionStatement {% id %}

nestedStatements -> nestedStatement {% toArray(0) %}
                  | nestedStatement _ nestedStatements
                                {% toArray(0, 2) %}


localIdentSet -> local_ident {% toArray(0) %}
               | local_ident _ %COMMA _ localIdentSet {% toArray(0, 4) %}

localIdentSetP -> %OPENP _ localIdentSet _ %CLOSEP {% nth(2) %}
                | %OPENP _ %CLOSEP {% function(d, loc) { return []; } %}

localIdentSetB -> %OPENB _ localIdentSet ( _ %COMMA ):? _ %CLOSEB {% nth(2) %}
                | %OPENB _ %CLOSEB {% function(d, loc) { return []; } %}


functionStatement -> %FUNCTION _ local_ident
                     _ localIdentSetP
                     _ block
{%
    function(d, loc) {
        return { loc:loc, f:'function', name:d[2], params:d[4], block:d[6] }
    }
%}


assignRightSide -> expression _ %SEMICOLON   {% nth(0) %}

assignLeftSide -> local_ident {% id %}
                | localIdentSetB
        {% function(d, loc) { return { loc:loc, f:'ASSIGNMAP', l:d[0] } } %}


letStatement -> %LET _ assignLeftSide _ %ASSIGN _ assignRightSide {%
    function(d, loc) {
        return { loc:loc, f:'let', var:d[2], expr:d[6] }
    }
%}


constStatement -> %CONST _ assignLeftSide _ %ASSIGN _ assignRightSide {%
    function(d, loc) {
        return { loc:loc, f:'const', var:d[2], expr:d[6] }
    }
%}


returnStatement -> %RETURN _ assignRightSide
{%
    function(d, loc) {
        return { loc:loc, f:'return', expr:d[2] }
    }
%}
                 | %RETURN _ %SEMICOLON
{%
    function(d, loc) {
        return { loc:loc, f:'return' }
    }
%}



# Base statements,
baseStatement -> constStatement {% nth(0) %}
               | functionStatement {% nth(0) %}


baseStatements -> ( _ baseStatement ):* {% toList(0, 1) %}







# -----------
