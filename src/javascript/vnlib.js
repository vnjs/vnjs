"use strict";

import { isUndefined, mergeConfig, polyfill2DCanvas, Rectangle } from './utils';

import TextFormatter from './TextFormatter';
import CanvasElement from './CanvasElement';
import Scene         from './Scene';
import TextTrail     from './TextTrail';

// Visual Novel engine base library script.
//
// Exports;
//    NVScreen(canvas, config)
//
// Instantiate the function with the display canvas element of the desired
// size.

// Polyfills,
polyfill2DCanvas();



// Default configuration,
const DEF_CONFIG = {

  // For a shadow effect around the text.
  // Fast on Chrome and Edge. Slow on other browsers.
  text_shadow: true,
  enable_dirty_clipping: false,
  ms_per_word: 25,

  default_font_family: 'Montserrat, sans-serif',
  default_font_size: '25px',
  default_font_color: '#fffff0',

  pixels_between_words: 7,
  line_height: 30,
  
};

// VNScreen factory function,
function VNScreen(canvas_element, config) {
  
  if (this instanceof VNScreen) throw new Error("Not a class");
  
  if (isUndefined(config)) {
    config = DEF_CONFIG.slice();
  }
  else {
    mergeConfig(config, DEF_CONFIG);
  }
  
  // The VNScreen object output,
  let out_vnscreen;

  const overall_scale = canvas_element.height / 720;

  // The height of the text trail buffer.
  const TEXT_TRAIL_BUFFER_HEIGHT = 200;

  // The current set of active elements to draw on the canvas, sorted by z depth.
  const canvas_elements = [];
  
  // When this is set to true, the canvas elements are sorted by depth on the
  // next draw call.
  let sort_depth_before_draw = false;
  
  // The action queue is a list of animation actions to perform on elements on the
  // canvas.
  const active_interpolations = [];

  // The set of active text trails currently running,
  const active_text_trails = [];
  
  // True when the dialog text trail is being displayed,
  let is_displaying_dialog_trail = false;

  // Text trail dialog coordinates and dimensions,
  let diag_x = 25;
  let diag_y = 720 - 20 - 130;
  let diag_width = 1280 - 50;
  let diag_height = 134;

  // The dialog text trail that's traditionally drawn at the bottom of the
  // screen.
  const dialog_text_trail = TextTrail({
    
    default_font_family:    config.default_font_family,
    default_font_size:      config.default_font_size,
    default_font_color:     config.default_font_color,

    trail_width:            diag_width - 100 - 100,
    trail_height:           diag_height,
    pixels_between_words:   config.pixels_between_words,

    line_height:            config.line_height,
    first_line_indent:      0,

    draw_text_shadow:       config.text_shadow,

    buffer_width:           1280,
    buffer_height:          TEXT_TRAIL_BUFFER_HEIGHT,
    draw_scale:             overall_scale,
    dx:                     100,
    dy:                     40,
    ms_per_word:            config.ms_per_word,

  });

  
  
  
  
  let frame_needs_repaint = true;
  
  let scaling_factor = 720 / (1024 * 1.1);
//  console.log("Scaling Factor: ", scaling_factor);
  
  
  
  // Maps image id to Image object,
  const images_map = {};
  
  // The HTML5 Canvas 2D context,
  const canvas_2dctx = canvas_element.getContext("2d");
  
  function resetTransform(ctx) {
    ctx.globalAlpha = 1.0;
    ctx.resetTransform();
    ctx.scale(overall_scale, overall_scale);
  };

  function resetToRawTransform(ctx) {
    ctx.globalAlpha = 1.0;
    ctx.resetTransform();
  };



  // Paints the view layer,
  function paintViewLayer(ctx, time, dirty_areas) {

    // Interpolate all elements,
    // Note; this provides us details about where the element was and where
    //  it's going between frames.
    const ai_len = active_interpolations.length;
    
    const ENABLE_DIRTY_CLIPPING = config.enable_dirty_clipping;
    
    active_interpolations.forEach((ai) => {
      if (ENABLE_DIRTY_CLIPPING) dirty_areas.push(ai.canvas_element.getBounds());
      ai.interpolate(time);
      if (ENABLE_DIRTY_CLIPPING) dirty_areas.push(ai.canvas_element.getBounds());
    });
    
    if (ENABLE_DIRTY_CLIPPING) {
      // Clear the canvas,
      resetToRawTransform(ctx);
      // Clip,
      ctx.beginPath();

      dirty_areas.forEach((r) => {
        ctx.rect(Math.floor(r.x * overall_scale), Math.floor(r.y * overall_scale),
                            Math.ceil(r.wid * overall_scale), Math.ceil(r.hei * overall_scale));
      });

      ctx.clip();
      ctx.closePath();
    }
    
    resetTransform(ctx);
    // Clear the buffer,
    ctx.fillStyle = '#f0f1f6';
    ctx.fillRect(0, 0, 1280, 720);

    // Make sure the elements are sorted by depth, and add order,
    const len = canvas_elements.length;
    if (sort_depth_before_draw) {
      // Stable sort of canvas_elements by depth,
      canvas_elements.forEach( (ce, i) => { ce.sort_i = i } );
      canvas_elements.sort( (el1, el2) => {
        const c = el1.depth - el2.depth;
        if (c === 0) return el1.sort_i - el2.sort_i;
        return c;
      });
      sort_depth_before_draw = false;
    }

    // Cycle over the canvas elements,
    canvas_elements.forEach( (el) => {
      // Do we draw the element?
      if (el.drawAlpha > 0) {
        // Yup,
        // Translate the context to the element midpoint,
        resetTransform(ctx);
        ctx.translate(el.x, el.y);
        ctx.scale(el.scale_x, el.scale_y);
        ctx.globalAlpha = el.drawAlpha;
        // Then call the draw function,
        el.draw(ctx, out_vnscreen);
      }
    });

  };

  
  
  // Called each refresh. This will look at any visual events that are in the queue and
  // paint the canvas as appropriate.
  function drawCall(time) {

    // This is the render pipeline.
  
    // Does the dialog trail need a repaint?
    const repaint_for_dialog_trail = dialog_text_trail.isRepaintNeeded(time);
  
    // Exit early if a repaint isn't forced, there's no interpolation anims pending,
    // and the text trail hasn't advanced,
    if (!repaint_for_dialog_trail &&
        !frame_needs_repaint &&
        active_interpolations.length === 0) {
      // Request again for the next frame,
      window.requestAnimationFrame(drawCall);
      return;
    }
    
    // Dirty areas that need to be repainted,
    const dirty_areas = [];

    // If 'force_repaint' is true then we do a full repaint,
    const force_repaint = frame_needs_repaint;

    // Reset the 'repaint' flag,
    frame_needs_repaint = false;

    // Start painting,
    canvas_2dctx.save();
    try {

      if (config.enable_dirty_clipping) {
        if (force_repaint) {
          dirty_areas.push( Rectangle(0, 0, 1280, 720) );
        }
        if (repaint_for_text_trail) {
          // The text trial area needs repainting,
          dirty_areas.push( Rectangle(diag_x, diag_y, diag_width, diag_height) );
        }
        // Paint the view layer,
        if (active_interpolations.length != 0 || dirty_areas.length > 0) {
          paintViewLayer(canvas_2dctx, time, dirty_areas);
        }
      }
      else {
        paintViewLayer(canvas_2dctx, time, dirty_areas);
      }

      if (!dialog_text_trail.isEmpty()) {
        // Paint the text trail UI element,
        dialog_text_trail.paintToBuffer(time);

        // Paint the buffer to the displayed screen,
        resetToRawTransform(canvas_2dctx);
        // Paint the text trail buffer,
        canvas_2dctx.drawImage(dialog_text_trail.getBufferCanvas(),
                        (0 * overall_scale).toFixed(0),
                        ((diag_y - 10) * overall_scale).toFixed(0));

      }

    }
    catch (e) {
      console.log(e);
    }
    finally {
      canvas_2dctx.restore();
      // Request draw call again on the next frame,
      window.requestAnimationFrame(drawCall);
    }

  };
  
  // Start the requestAnimationFrame draw call chain,
  window.requestAnimationFrame(drawCall);
  
  
  
  
  // ----- Init -----
  
  // This function preloads the default font. This is necessary so text measurements can be
  // accurately discovered before rendering.
  // Best attempt to call 'cb' when the fonts are loaded.
  function preloadFonts(cb) {

    // A canvas element we use for font metrics
    const ctx = document.createElement('canvas').getContext('2d');
    const styles = ['', 'italic ', 'bold ', 'italic bold '];
    
    styles.forEach( (style) => {
      ctx.font = style + '10px ' + config.default_font_family;
      const m = ctx.measureText('Hello');
      console.log('PRELOAD ', ctx.font);
    });

    // HACK: We need to find a way to listen for the event of a font being loaded.
    //   There may be some sort of CSS .display hack to do this.
    //   At the moment we just wait a reasonable time for the font to load.
    setTimeout( () => {
      cb( null, { status:'fontloaded' } );
    }, 500);

  };

  // ----- Functions -----
  
  // Returns a dialog text trail formatter for the dialog bar.
  function getDialogTextTrailFormatter() {
    return dialog_text_formatter;
  };




  
  // Returns the image with the given id. The image must have been successfully
  // loaded.
  function getImage(img_id) {
    return images_map[img_id];
  };
  
  // Loads a set of image resources from URLs. When all the images in the set are
  // successfully loaded 'onload_cb' is called.
  //   img_set = [ { id:'', url:'' }, {}, ... ]
  function loadImages(img_set, onload_cb) {
    
    let completed = 0;
    const errors = [];
    function complete(id, img_url, img_el, valid) {
      if (valid) {
        // Update the image DB,
        images_map[id] = img_el;
      }
      else {
        // Oops, failed to load this image,
        errors.push( { id, error:'Failed to load image: ' + img_url} );
      }
      
      console.log("LOADED:", img_url);
      
      // Callback on complete,
      ++completed;
      if (completed == img_set.length) {
        onload_cb(errors);
      }
    };

    // For each image being loaded,
    img_set.forEach( (imgv) => {
      const { id, url } = imgv;

      // Is the image already in the map?
      const from_map = images_map[id];
      if (from_map) {
        complete(id, url, from_map, true);
      }

      // Load the image,
      const img_el = new Image();
      img_el.addEventListener('load', function() {
        complete(id, url, img_el, true);
      });
      img_el.addEventListener('error', function() {
        complete(id, url, null, false);
      }, false);

      img_el.src = url;
    });

  };
  
  
  function repaint() {
    frame_needs_repaint = true;
  };
  
  // ----- Text displays -----

  // Starts drawing the given text in the dialog area. If the dialog area is
  // currently not displaying then it is shown.
  function printDialogText(source_name, text) {
    if (isUndefined(text)) {
      text = source_name;
      source_name = null;
    }
    // Measure the text and layout over the config rectangle,
    dialog_text_trail.measureAndLayoutText(text);
    dialog_text_trail.resetAnimationPoint();
  };

  // Clears the current dialog text,
  function clearDialogText() {
    dialog_text_trail.clearAnimation();
  };

  


  
  // ----- Transition animations -----

  function addInterpolation(i, ms_to) {
    // On timeout then set interpolation final result,
    const timeout_function = function() {
      // Final result interpolation,
      active_interpolations.find( (ai, n) => {
        if (ai === i) {
          active_interpolations.splice(n, 1);
          i.complete();
//          console.log('Complete Interpolation', i);
          frame_needs_repaint = true;
          return true;
        }
      });
    };
    i.timeout_function = timeout_function;
    active_interpolations.push(i);
    setTimeout(timeout_function, ms_to);
//    console.log('Add Interpolation:', i);
//    console.log('', canvas_elements);
  };

  
  
  // ----- Support classes -----


  function notifyDoSortDepthBeforeDraw() {
    sort_depth_before_draw = true;
  };
  
  // Creates a new canvas element and adds it to the list of all elements currently
  // active on the current canvas.
  function createCanvasElement() {
    const el = CanvasElement();
    canvas_elements.push(el);
    notifyDoSortDepthBeforeDraw();
    // Force full repaint when we add and remove canvas elements,
    repaint();
    return el;
  };
  
  const NOOP_DRAW = function(ctx, vnscreen) { };
  
  function createPaintingCanvasElement(width, height) {
    const el = createCanvasElement();
    el.type = 'PAINTING';
    el.width = width;
    el.height = height;
    el.mid_x = width / 2;
    el.mid_y = height / 2;
    el.draw = NOOP_DRAW;
    return el;
  };
  
  // Create a static image canvas element.
  function createStaticImageCanvasElement(img_id) {
    const el = createCanvasElement();
    el.type = 'STATIC';
    el.img_id = img_id;
    const img_obj = images_map[img_id];
    el.img_obj = img_obj;
    el.width = img_obj.width;
    el.height = img_obj.height;
    el.mid_x = el.width / 2;
    el.mid_y = el.height / 2;
    el.draw = function(ctx) {
      ctx.rotate(el.rotation);
      if (el.noScaleFactor) {
        // No scale factor on this image,
      }
      else {
        ctx.scale(scaling_factor, scaling_factor);
      }
      ctx.drawImage(el.img_obj, -el.mid_x, -el.mid_y);
    };
    return el;
  };
  
  
  
  
  
  
//  // ----- Scene handling -----
//  
//  let timout_function = null;
//
//  
//  
//
//  function playScene(scene_function, props) {
//    const scene = Scene(out_vnscreen, scene_function);
//    
//    function process_scene_frame() {
//      // Clear the frame state for the user code,
//      scene.clearFrame();
//
//      // Go to user code,
//      scene_function(scene, props);
//
//      if (is_displaying_dialog_trail) {
//        if (!scene.isDisplayingTextTrail()) {
//          config.text_trail_exit(scene, props);
//          clearDialogText();
//          is_displaying_dialog_trail = false;
//        }
//      }
//      else {
//        if (scene.isDisplayingTextTrail()) {
//          config.text_trail_enter(scene, props);
//          is_displaying_dialog_trail = true;
//        }
//      }
//      
//      // Get the next frame transition type,
//      const next_ftt = scene.getNextFrameTransitionType();
//      const next_ftp = scene.getNextFrameTransitionParams();
//      
//      if (next_ftt === Scene.STATICS.INTERRUPTABLE_PAUSE) {
//        setTimeout(process_scene_frame, next_ftp[0]);
//      }
//      else if (next_ftt === Scene.STATICS.WAIT_UNTIL_INTERACT) {
//        
//      }
//      else {
//        console.log("Unknown frame transition type: ", next_ftt);
//      }
//
//    };
//    
//    setTimeout(process_scene_frame, 10);
//  };




  // Public API,
  out_vnscreen = {
    preloadFonts,
    getDialogTextTrailFormatter,
    getImage,
    loadImages,
    repaint,

    printDialogText,
    clearDialogText,

    addInterpolation,
    notifyDoSortDepthBeforeDraw,
    createCanvasElement,
    createPaintingCanvasElement,
    createStaticImageCanvasElement,
//    playScene,
  };
  return out_vnscreen;

};






export default VNScreen;
