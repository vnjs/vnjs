"use strict";



// Removes all \n, \t and \r and all double or more whitespace,
const cleanupWhitespace = (s) => s.replace(/\s/g, ' ').replace(/  +/g, ' ');

// A canvas element we use for font metrics
const font_metrics_canvas_ctx = document.createElement('canvas').getContext('2d');



const UNBREAKABLE_STR = 'unbreakable';
const BREAKER_STR = 'breaker';

function Unbreakable(text, style) {
  return {
    binstance: UNBREAKABLE_STR,
    text, style
  };
};

function Breaker() {
  return {
    binstance: BREAKER_STR
  };
};

function WordLayout(word, x, y) {
  return { word, x, y };
};

const isUnbreakable = (ob) => ( ob.binstance === UNBREAKABLE_STR );
const isBreaker = (ob) => ( ob.binstance === BREAKER_STR );



function TextFormatter(config) {

  // Generate a style object depending on the styles currently on the stack.
  function genStyleObject(style_stack) {
    // Base text_style info,
    const style = {
      font: config.default_font_family,
      fontSize: config.default_font_size,
      fontColor: config.default_font_color
    };
    
    // Look for any styles on the stack,
    style_stack.forEach( (el) => {
      if (el.tagName === 'I') {
        style.fontType = 'italic';
      }
      else if (el.tagName === 'B') {
        style.fontWeight = 'bold';
      }
      else if (el.tagName === 'FONT') {
        var face = el.getAttribute('face');
        if (face) style.font = face;
        var size = el.getAttribute('size');
        if (size) style.fontSize = size;
        var color = el.getAttribute('color');
        if (color) style.fontColor = color;
      }
    });
    
    style.fontSizeAndFamily = (style.fontType ? style.fontType + ' ' : '') +
                              (style.fontWeight ? style.fontWeight + ' ' : '') +
                              style.fontSize + ' ' + style.font;
    
    return style;
  };

  function measureFormattedText(text) {
    text = cleanupWhitespace(text);

    const text_el = document.createElement('div');
    text_el.innerHTML = text;

    // Generate a flattened array of unbreakable text strips together with style information.
    let flattened_ar = [];
    const style_stack = [];
    
    function addToFlattened(text) {
      // Measure the text using information on the style stack,
      // Break the text into measurable parts,
      
      // Copy the style stack,
      const ss_copy = genStyleObject(style_stack);
      
      // If the text starts with whitespace then add a breaker,
      if (text.length > 0) {
        if (text.charAt(0) === ' ') {
          flattened_ar.push(Breaker());
          text = text.substring(1);
        }
        let end_with_breaker = false;
        if (text.length > 1 && text.charAt(text.length - 1) === ' ') {
          end_with_breaker = true;
          text = text.substring(0, text.length - 1);
        }

        // Parse out any breakable characters,
        let sp = 0, p = 0;
        for (; p < text.length; ++p) {
          const c = text.charAt(p);
          if (c === ' ') {
            if (sp != p) {
              if (sp > 0) flattened_ar.push(Breaker());
              flattened_ar.push(Unbreakable(text.substring(sp, p), ss_copy));
              sp = p + 1;
            }
            else {
              ++sp;
            }
          }
          else if (c === '.' || c === '-' || c === ',') {
            for (; p < text.length - 1 && text.charAt(p + 1) === c; ++p) { }
            if (sp > 0) flattened_ar.push(Breaker());
            flattened_ar.push(Unbreakable(text.substring(sp, p + 1), ss_copy));
            sp = p + 1;
          }
        }
        
        if (sp < p) {
          if (sp > 0) flattened_ar.push(Breaker());
          flattened_ar.push(Unbreakable(text.substring(sp, p), ss_copy));
        }

        if (end_with_breaker) {
          flattened_ar.push(Breaker());
        }
        
      }
    };
    
    function processNodes(nodes) {

      // NOTE: Can't use 'forEach' here because 'nodes' is a DOM node list, not an
      //   array.
      for (let i = 0; i < nodes.length; ++i) {
        const node = nodes[i];
        const nodeType = node.nodeType;
        if (nodeType === Node.COMMENT_NODE) {
          // Ignore this one,
        }
        else if (nodeType === Node.TEXT_NODE) {
          // Process the text and add to 'flattened_ar',
          const raw_text = node.data;
          addToFlattened(raw_text);
        }
        else {
          // Otherwise we assume it's a style node,
          const tag_name = node.tagName;
          if (tag_name === 'B' ||
              tag_name === 'I' ||
              tag_name === 'FONT') {

            // Push the node onto the stack,
            style_stack.push(node);

            // Recurse onto children,
            processNodes(node.childNodes);
            
            // Pop when we finished,
            style_stack.pop();
            
          }
          // We don't want to be handling any other tag types,
          else {
            console.log("IGNORING TAG:", tag_name);
          }
        }
      }

    };
    
    processNodes(text_el.childNodes);

    // Now 'flattened_ar' contains a set of styled unbreakable words that we can measure.

    // Cleanup,
    // If the flattened set starts with a Breaker then remove it,
    if (flattened_ar.length > 0) {
      if (isBreaker(flattened_ar[0])) {
        flattened_ar = flattened_ar.slice(0, 1);
      }
    }
    // Make sure we end with a breaker instance,
    if (!(isBreaker(flattened_ar[flattened_ar.length - 1]))) {
      flattened_ar.push(Breaker());
    }
    
    // Fill out measurements of unbreakable word sequences,
    const ctx = font_metrics_canvas_ctx;
    ctx.textBaseline = 'hanging';
    flattened_ar.forEach( (v) => {
      if (isUnbreakable(v)) {
        const fstyle = v.style.fontSizeAndFamily;
        ctx.font = fstyle;
        const measure1 = ctx.measureText(v.text);
        v.measure = measure1.width;
//        console.log("MEASURING;", ctx.font,'=(', measure1.width, ")");
      }
    });

    return flattened_ar;

  };

  // Lays out the given flattened text measures into the given box. If it's impossible to
  // flow all the text into the area then the remaining array is included in the returned
  // object.
  function layoutTextTrail(text_measures, width, height) {

    const out = {};
    const words_ar = [];
    out.words_ar = words_ar;
    let line = 0;
    let x = 0;
    let y = 0;
    let line_start = true;

    const line_height = config.line_height ? config.line_height : 30;
    const first_line_indent = config.first_line_indent ? config.first_line_indent : 0;

    for (let i = 0; i < text_measures.length; ++i) {

      const v = text_measures[i];
      if (isBreaker(v)) {
        x += config.pixels_between_words;
      }
      else {
        const measure_width = v.measure;

        if (x + measure_width > width && !line_start) {
          // New line,
          x = first_line_indent;
          y += line_height;
          line_start = true;

          if (y + line_height > height) {
            out.text_measures = text_measures.slice(i);
            return out;
          }

        }
        else {
          line_start = false;
        }

        words_ar.push( WordLayout(v, x, y) );
        x += measure_width;

      }

    }
    out.text_measures = [];
    return out;
  };




  // Measure and layout the given text string within the bounded area specified
  // in the config.
  function measureAndLayout(text) {
    // Split the text into unbreakable spans of text and measure each.
    const flattened_ar = measureFormattedText(text);
    // Lays out the text trail animation,
    return layoutTextTrail(flattened_ar, config.trail_width, config.trail_height);
  };



  // Public API
  return Object.freeze({
    measureFormattedText,
    layoutTextTrail,
    measureAndLayout,
  });

};

export default TextFormatter;
