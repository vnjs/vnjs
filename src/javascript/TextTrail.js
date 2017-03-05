"use strict";

import { isUndefined, createBufferCanvas } from './utils';

import TextFormatter from './TextFormatter';

// A text trail that is rendered into a buffer and can be
// animated in various ways.
//
// config = {
//
//   default_font_family:       'sans-serif'
//   default_font_size:         '25px'
//   default_font_color:        '#ffffff'
//   trail_width:               (The dimension of area text can be drawn)
//   trail_height:
//   pixels_between_words:      7
//   line_height:               30
//   first_line_indent:         0
//   draw_text_shadow:          true
//
//   buffer_width:
//   buffer_height:
//   dx:
//   dy:
//   draw_scale:
//   draw_context:              (optional)
//
// }

function TextTrail(config) {

  let { draw_context, draw_scale, dx, dy, buffer_width, buffer_height, ms_per_word } = config;
  const { words_painter } = config;

  if (isUndefined(buffer_width) || isUndefined(buffer_height)) {
    throw Error('Must specify width and height');
  }
  if (isUndefined(draw_scale)) draw_scale = 1;
  if (isUndefined(dx)) dx = 0;
  if (isUndefined(dy)) dy = 0;
  if (isUndefined(ms_per_word)) ms_per_word = 50;
  
  let buffer_canvas;

  // Make a new draw context,
  if (isUndefined(draw_context)) {
    buffer_canvas = createBufferCanvas(buffer_width * draw_scale, buffer_height * draw_scale);
    draw_context = buffer_canvas.getContext('2d');
  }

  // Create the text formatter for this text trail,
  const text_measurer = TextFormatter(config);
  
  // Populated when the text is measured,
  let text_layout = null;
  let time_start = -1;
  let drawn_to = -1;
  
  // Measure and layout the text into the area specified by:
  //    [ trail_width, trail_height ]
  function measureAndLayoutText(text) {
    text_layout = text_measurer.measureAndLayout(text);
    clearBufferCanvas();
  };
  
  // Paints the text trail from the given word to the destination word, either to
  // the buffer canvas or to 'draw_context' in the config.
  function paintTextTrail(from_point, to_point) {

    const ctx = draw_context;
    // Reset transform,
    ctx.resetTransform();
    ctx.scale(draw_scale, draw_scale);
  
    if (from_point == -1) from_point = 0;
    
    let i = from_point;
    for (; i < to_point; ++i) {
      // WordLayout word
      const word = text_layout.words_ar[i];
      // Breaker or Unbreakable
      const v = word.word;

      const { text, style } = v;

      let drawx = dx + word.x;
      let drawy = dy + word.y;

      // Alternative words painter?
      if (words_painter) {
        words_painter(ctx, text, style, drawx, drawy, config);
      }
      // Default text paint function,
      else {

        ctx.font = style.fontSizeAndFamily;
        ctx.strokeStyle = '#000010';
        if (!config.draw_text_shadow) {
          ctx.lineWidth = 1.75;
          ctx.strokeText(text, drawx, drawy);
          ctx.fillStyle = style.fontColor ? style.fontColor : '#fffff0';
          ctx.fillText(text, drawx, drawy);
        }
        else {
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#000008';

          ctx.fillStyle = '#000010';
          ctx.fillText(text, drawx, drawy);
          ctx.fillStyle = '#000010';
          ctx.fillText(text, drawx, drawy);
          ctx.fillStyle = style.fontColor ? style.fontColor : '#fffff0';
          ctx.fillText(text, drawx, drawy);
          ctx.shadowBlur = 0;
        }

      }

    }

  };

  // Paints the text trail buffer. If there's nothing new to paint to
  // it then does nothing.
  function paintToBuffer(time) {
    const next_word_point = calcInterpolatedAnimationPoint(time);
    if (next_word_point > drawn_to) {
      paintTextTrail(drawn_to, next_word_point);
      drawn_to = next_word_point;
    }
  };

  // Returns the canvas buffer where the text is painted in the
  // 'paintTextTrail' method.
  function getBufferCanvas() {
    return buffer_canvas;
  };

  function clearBufferCanvas() {
    const ctx = draw_context;
    ctx.resetTransform();
    ctx.scale(draw_scale, draw_scale);
    ctx.clearRect(0, 0, buffer_width, buffer_height);
  };
  
  // If there's no text to display then returns true.
  function isEmpty() {
    return text_layout === null;
  };
  
  // Given a time value, returns the last word that should be displayed by
  // interpolation, or the last word in the trail.
  function calcInterpolatedAnimationPoint(time) {
    if ( isEmpty() ) return -1;
    return Math.min(  Math.floor((time - time_start) / ms_per_word),
                      text_layout.words_ar.length);
  };
  
  function isRepaintNeeded(time) {
    return (drawn_to < calcInterpolatedAnimationPoint(time));
  };
  
  // Sets the animation point to the first word of the trail.
  // This causes the buffer to be redrawn in the next paint cycle.
  function resetAnimationPoint() {
    time_start = performance.now();
    drawn_to = -1;
  };

  // Clears the animation so that the buffer is cleared during the
  // next paint cycle.
  function clearAnimation() {
    text_layout = null;
    time_start = -1;
    drawn_to = -1;
    clearBufferCanvas();
  };



  // Public API,
  return {
    measureAndLayoutText,
    paintTextTrail,
    paintToBuffer,
    getBufferCanvas,
    clearBufferCanvas,
    isEmpty,
    
    isRepaintNeeded,
    resetAnimationPoint,
    clearAnimation,

  };
  
}

export default TextTrail;