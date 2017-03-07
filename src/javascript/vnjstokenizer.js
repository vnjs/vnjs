"use strict";

function isWhitespace(ch) {
  switch (ch) {
    case ' ':
    case '\t':
    case '\n':
    case '\r':
    case '\v':
    case '\f':
      return true;
      break;
    default:
      return false;
  }
}

function isLetter(ch) {
  return ( (ch >= 'a' && ch <= 'z') ||
           (ch >= 'A' && ch <= 'Z') ||
           ch === '_' );
}

function isLetterOrNumber(ch) {
  return ( (ch >= 'a' && ch <= 'z') ||
           (ch >= 'A' && ch <= 'Z') ||
           (ch >= '0' && ch <= '9') ||
           ch === '_' );
}

function isNumber(ch) {
  return (ch >= '0' && ch <= '9');
}


function Tokenizer( source_code ) {
  
  let i = 0;
  let len = source_code.length;
  let state = 0;
  
  let tokens = [];
  
  function pushToken(type, content) {
    tokens.push( [ type, content, i ] );
  };
  
  
  function consumeWhitespace(n) {
    while (n < len && isWhitespace(source_code.charAt(n))) {
      ++n;
    }
    if (n > i) {
      pushToken('ws', source_code.substring(i, n));
    }
    i = n;
  }

  function lookupToken(max_tok) {
    let p = 1;
    for (; p < max_tok.length; ++p) {
      if (source_code.charAt(i + p) !== max_tok[p]) {
        break;
      }
    }
    pushToken('s', source_code.substring(i, i + p));
    return p;
  }
  
  
  function consumeLineComment(n) {
    n += 2;
    for (; n < len; ++n) {
      if (source_code.charAt(n) === '\n') {
        // Terminate here,
        ++n;
        if (source_code.charAt(n) === '\r') {
          ++n;
        }
        break;
      }
    }
    pushToken('c', source_code.substring(i, n));
    i = n;
  }
  
  function consumeBlockComment(n) {
    n += 2;
    for (; n < len; ++n) {
      if (source_code.charAt(n) === '*') {
        ++n;
        if (source_code.charAt(n) === '/') {
          // Terminate here,
          ++n;
          break;
        }
      }
    }
    // Comment token,
    pushToken('c', source_code.substring(i, n));
    i = n;
  }

  // Consume inline code,
  function consumeInlineCode(n) {
    n += 2;
    for (; n < len; ++n) {
      if (source_code.charAt(n) === '%') {
        ++n;
        if (source_code.charAt(n) === '}') {
          // Terminate here,
          ++n;
          break;
        }
      }
    }
    // Inline code token,
    pushToken('ic', source_code.substring(i + 2, n - 2));
    i = n;
  }
  
  // Integer number only,
  function consumeNumber(n) {
    ++n;
    while (n < len && isNumber(source_code.charAt(n))) {
      ++n;
    }
    pushToken('n', source_code.substring(i, n));
    i = n;
  }
  
  function consumeWord(n) {
    ++n;
    while (n < len && isLetterOrNumber(source_code.charAt(n))) {
      ++n;
    }
    pushToken('i', source_code.substring(i, n));
    i = n;
  }
  
  function consumeString(n, terminating_char) {
    ++n;
    while (n < len) {

      const ch = source_code.charAt(n);
      // escape code,
      if (ch === '\\') {
        const nc = source_code.charAt(n + 1);
        switch (nc) {
          case '\\':
          case '\'':
          case '"':
          case '/':
          case 'b':
          case 'f':
          case 'n':
          case 'r':
          case 't':
          case 'v':
          case '0':
          case 'u':
            ++n;
            break;
          default:
        }
      }
      else if (ch === '\n' || ch === '\r') {
        // Oops, can't tokenize,
        break;
      }
      else if (ch === terminating_char) {
        ++n;
        pushToken('sv', source_code.substring(i, n));
        i = n;
        return;
      }
      
      ++n;
    }
    const e = Error("Unterminated string");
    e.offset = i;
    throw e;
  }
  
  
  function consumeToken(n) {
    if (n < len) {
      const ch = source_code.charAt(n);
      // All single character only tokens,
      switch (ch) {
        case '.':
        case ',':
        case '(':
        case ')':
        case '}':
        case '%':
        case '[':
        case ']':
        case ':':
        case ';':
        case '+':
        case '-':
        case '*':
        case '$':
        case '^':
        case '~':
        case '@':
        case '?':
          pushToken('s', ch);
          i += 1;
          return;

        case '>':
          i += lookupToken('>=');
          return;
        case '<':
          i += lookupToken('<=');
          return;
        case '=':
          i += lookupToken('===');
          return;
        case '!':
          i += lookupToken('!==');
          return;
        case '&':
          i += lookupToken('&&');
          return;
        case '|':
          i += lookupToken('||');
          return;
        case '{':
          // {% production
          if (source_code.charAt(n + 1) === '%') {
            consumeInlineCode(n);
            return;
          }
          // Consume '{'
          pushToken('s', ch);
          i += 1;
          return;
          
        case '/':
          const nc = source_code.charAt(n + 1);
          // // production
          if (nc === '/') {
            consumeLineComment(n);
            return;
          }
          // /* production
          else if (nc === '*') {
            consumeBlockComment(n);
            return;
          }
          // Consume '/'
          pushToken('s', ch);
          i += 1;
          return;

        case '\'':
          consumeString(n, '\'');
          return;
        case '"':
          consumeString(n, '\"');
          return;
        
        default:
      }

      // Integer?
      if (isNumber(ch)) {
        consumeNumber(n);
        return;
      }
      // Word?
      else if (isLetter(ch)) {
        consumeWord(n);
        return;
      }
      else {
        // Otherwise we produce an unknown char token,
        pushToken('u', ch);
        i += 1;
        return;
      }
    }
  }
  
  while (i < len) {
    consumeWhitespace(i);
    consumeToken(i);
  }


  function getTokens() {
    return tokens;
  }

  return {
    getTokens
  };

}

exports.Tokenizer = Tokenizer;
