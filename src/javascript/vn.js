"use strict";

// External libs,  
import VNScreen from './vnlib';
import TextTrail from './TextTrail';
import { roundedRect, roundedShadowedRect } from './graphics';
import { loadFile, mergeConfig } from './utils';


// We use 'require' for import here so that these libraries also work in node.js
let SceneComposer = require('./SceneComposer').SceneComposer;
let Context = require('./Context').Context;
let Interpreter = require('./Interpreter').Interpreter;

// Is this self-invoking function necessary with the babel transform?
(function() {

const handleCriticalError = (msg, args) => {
  console.log("Stopped because of critical error(s):", args);
};

// Find the right method, call on correct element
const launchIntoFullscreen = (element) => {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  }
  else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  }
  else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  }
  else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}

const exitFullscreen = () => {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  }
  else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  }
  else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }
}


// Event for when the document is loaded,
// ISSUE: Does this work on all browsers that support HTML5 Canvas?
document.addEventListener('DOMContentLoaded', () => {
  
  const main_div = document.getElementById("main");
  
  const btn = document.createElement('button');
  btn.innerHTML = 'Launch Game Fullscreen (Recommended for Mobile)';
  const btn2 = document.createElement('button');
  btn2.innerHTML = 'Launch Game Windowed';
  
  btn.addEventListener('click', () => {
    console.log("LAUNCH THE GAME!");
    launchIntoFullscreen(document.documentElement);
    gameLaunch();
  }, false);
  
  btn2.addEventListener('click', () => {
    console.log("LAUNCH THE GAME!");
    gameLaunch();
  }, false);

  main_div.appendChild(document.createElement('br'));
  main_div.appendChild(btn);
  main_div.appendChild(document.createElement('br'));
  main_div.appendChild(document.createElement('br'));
  main_div.appendChild(btn2);

});



function loadAndParseScene(filenames, callback) {

  // Load a .vnjs file using the web Javascript API,
  function sourceLoader(filename, cb) {

    const resolvedfn = 'scripts/' + filename;
    loadFile(resolvedfn, function(status) {
      if (status.fail) {
        cb(status.fail);
      }
      else {
        const data = status.req.responseText;
        cb(null, data);
      }
    })

  };

  // Create a composer,
  const composer = SceneComposer();
  // Compile the scenes,
  composer.prepareCodebase(
          sourceLoader, filenames, function(err, parsed_vn) {

    if (err) {
      // PENDING: Handle error here,
      throw err;
//      console.error(err);
    }
    else {
      callback(parsed_vn);
    }

  });

}





function FrontEnd() {
  
  // All the system calls,
  const system_calls = {};

  // System object constructors,
  const sys_obj_constructors = {};

  // The public global variables object,
  const global_vars = {};

  // The public constant variables given by the backend,
  const constant_vars = {};
  // The public constant variable definitions given by the backend,
  const constant_var_defs = {};
  
  // The compiled functions given us by the backend,
  const function_load_map = {};

  let vn_screen;
  let display_canvas;
  const config = {};
  
  
  
  const property_resolver = {
    getV: function(ident) {
      // Is it a constant?
      const constant_v_def = constant_var_defs[ident];
      if (constant_v_def !== void 0) {
        let constant_v = constant_vars[ident];
        if (constant_v === void 0) {
          // Construct the constant variable,
          constant_v = constructConstantDef(ident, constant_v_def);
          console.log("CREATED CONSTANT: ", ident, "=", constant_v, "(", typeof constant_v, ")");
        }
        return constant_v;
      }
      else {
        return global_vars[ident];
      }
    }
  };
  
  // Resolve the function parameters,
  function toJSObject(params) {
    const out = {};
    for (let ident in params) {
      out[ident] = toValue(params[ident]);
    }
    return out;
  }
  
  // Creates an object from the given constructor name.
  function constantConstruction(name, params) {
    const sys_constr = sys_obj_constructors[name];
    if (sys_constr !== void 0) {
      return sys_constr(params);
    }
    else {
      throw Error("Constructor '" + name + "' not found");
    }
  }
  
  function constructConstantDef(ident, def) {
    
    const type = def[0][0];
    let constant_ob;
    // Static value,
    if (type === 'v') {
      constant_ob = def[0][1];
    }
    // Inline JavaScript code,
    else if (type === 'i') {
      const func_factory = eval.call(null, def[0][1]);
//      console.log(func_factory);
//      console.log(typeof func_factory);
      constant_ob = func_factory;
    }
    // Object constructor and mutators,
    else if (type === 'c') {
      const constant_fun_name = def[0][1];
      const constant_params = toJSObject(def[0][2]);
      constant_ob = constantConstruction(constant_fun_name, constant_params);
      for (let i = 1; i < def.length; ++i) {
        // Mutator functions,
        const fname = def[i][1];
        const fun = constant_ob[fname];
        if (fun === void 0) {
          throw Error("Method not found: " + constant_fun_name + "." + fname);
        }
        fun(toJSObject(def[i][2]));
      }
    }
    else {
      throw Error(type);
    }

    constant_vars[ident] = constant_ob;
    return constant_ob;
//    return 'a';
  }
  
  // Returns a JavaScript typed value given the value from the
  // back end.
  function toValue(vob) {
    if (vob.v !== void 0) {
      return vob.v;
    }
    else {
      return function_load_map[vob.f](property_resolver);
    }
  }
  
  
  function doProportional(desc, clos) {
    if (typeof desc === 'string') {
      desc = desc.trim();
      if (desc.length > 1) {
        const len = desc.length;
        if (desc.charAt(len - 1) === '%') {
          return clos(parseFloat(desc.substring(0, len - 1)));
        }
      }
    }
    return desc;
  }

  // Returns radians of either a string '[num]deg' or a number (as radians).
  function convertRotational(v) {
    if (typeof v === 'string') {
      v = v.trim();
      if (v.length > 3) {
        const len = v.length;
        const ty = v.substring(len - 3, len);
        if (ty === 'deg') {
          const degrees = parseFloat( v.substring(0, len - 3) );
          return (degrees * (Math.PI / 180));
        }
        else if (ty === 'rad') {
          return parseFloat(v.substring(0, len - 3));
        }
      }
    }
    return v;
  }

  
  // Converts the input styles into a raw format (converts degrees to radians,
  // proportional positioning, etc)
  function convertToRawStyles(styles, ignore_keys) {
    const raw_out = {};
    for (let sk in styles) {
      if (ignore_keys[sk]) {
        continue;
      }
      const style = styles[sk];
      switch(sk) {
//        case 'alpha':
//          raw_out.alpha = style;
//          break;
        case 'rotation':
          raw_out.rotation = convertRotational(style);
          break;
        case 'x':
          // PENDING: Deal with multi-orientation display dimensions,
          const xval = doProportional(style, (percent) => {
            return 1280 * (percent / 100);
          });
          raw_out.x = xval;
          break;
        case 'y':
          // PENDING: Deal with multi-orientation display dimensions,
          const yval = doProportional(style, (percent) => {
            return 720 * (percent / 100);
          });
          raw_out.y = yval;
          break;
        case 'scale_x':
          const sx = doProportional(style, (percent) => {
            return (percent / 100);
          });
          raw_out.scale_x = sx;
          break;
        case 'scale_y':
          const sy = doProportional(style, (percent) => {
            return (percent / 100);
          });
          raw_out.scale_y = sy;
          break;

        default:
          raw_out[sk] = style;
      }
    }
    return raw_out;
  }


  function setElementStyle(out, styles, ignore_keys) {
    // Convert the styles to a raw format,
    const raw_styles = convertToRawStyles(styles, ignore_keys);
    // Move the styles (in specified format) to 'out.args'
    for (let sk in styles) {
      if (!ignore_keys[sk]) {
        const style = styles[sk];
        out.args[sk] = style;
      }
    }
    // Move the styles to the canvas element,
    out.el.setRawStyles(raw_styles);
  }

  
  function copyFields(to_obj, from_obj) {
    for (let f in from_obj) {
      if (f !== 'default') {
        to_obj[f] = from_obj[f];
      }
    }
    return to_obj;
  }


  function Interpolation(type, ms_to, canvas_element) {
    let time_start = performance.now();
    return {
      type,
      time_start,
      ms_to,
      canvas_element
    };
  };

  // t = current time
  // d = total time
  // b = beginning value
  // c = difference of value
  function noEasing(t, d, b, c) {
    return c * ( t / d ) + b;
  };

  // http://www.timotheegroleau.com/Flash/experiments/easing_function_generator.htm

  function easeOut(t, d, b, c) {
    var ts = (t/=d) * t;
    var tc = ts * t;
    return b + c * (-1 * tc * ts + 4 * ts * ts + -5 * tc + ts + 2 * t);
  };

  function easeIn(t, d, b, c) {
    var ts=(t/=d)*t;
    var tc=ts*t;
    return b+c*(0.5*tc*ts + -1.5*ts*ts + 2*tc);
  };

  function easingFunction(easing, t, d, b, c) {
    // NOTE: duck typing,
    if (typeof easing === 'function') {
      return easing(t, b, c, d);
    }
    // Assume string,
    else {
      switch (easing) {
        case 'no-ease':
          return noEasing(t, d, b, c);
        case 'ease-out':
          return easeOut(t, d, b, c);
        case 'ease-in':
          return easeIn(t, d, b, c);
        default:
          throw new Error('Unknown easing: ' + easing);
      }
    }
  };


  // Works out the animation interpolation of transitioning from the element's
  // current style to the styles specified by 'target_styles'. The animation lasts
  // for 'time' seconds and uses the given easing function.
  function addInterpolations(el, target_styles, time, easing) {
    
    console.log("ANIMATE:", el, target_styles, time, easing);
    
    if (easing === void 0) {
      easing = 'no-ease';
    }

    // Record the applicable current state of the element,
    const cur_styles = {};
    for (let k in target_styles) {
      cur_styles[k] = el[k];
    }

    const ms_to = time * 1000;
    const i = Interpolation('styles', ms_to, el);
    i.interpolate = function(ts) {
      for (let k in target_styles) {
        const from_v = cur_styles[k];
        const to_v = target_styles[k];
        const ts_av = easingFunction(
                          easing, ts - i.time_start, ms_to, from_v, to_v - from_v);
        el[k] = ts_av;
      }
    };
    i.complete = function() {
      el.setRawStyles(target_styles);
    };

    vn_screen.addInterpolation(i, ms_to);

  }
  
  
  
  // ---- System API calls ----

  // Prints a debug message to console,
  system_calls.debug = function(args, cb) {
    console.log(args.default);
    cb();
  };
  system_calls.preloadAssets = function(args, cb) {
    const to_preload = args.default;
    console.log("PENDING: preloadAssets for: ", to_preload);
    
    
    
    cb();
  };
  
  
  // Set the default text trail (where announcements go)
  system_calls.setDefaultTextTrail = function(args, cb) {
    const text_trail = args.default;
    console.log("PENDING: setDefaultTextTrail: ", text_trail);
    cb();
  };
  
  // Sets the style properties of a screen element,
  system_calls.setStyle = function(args, cb) {
    const element = args.default;
    
    setElementStyle(element, args, { 'default':-1 } );
    
    // Repaint the screen,
    vn_screen.repaint();

    cb();
  };

  // Sets the target style of the given element in the next 'animate' call,
  system_calls.setTargetStyle = function(args, cb) {
    const element = args.default;
    const target_style = convertToRawStyles(args, { 'default':-1 } );

    element.target_style = target_style;

    cb();
  };
  
  
  // Animate one or more style properties of an element,
  system_calls.animate = function(args, cb) {
    const element = args.default;
    const { time, easing } = args;

    addInterpolations(element.el, element.target_style, time, easing);

    cb();
  };
  
  
  
  // Preloads fonts,
  system_calls.preloadFont = function(args, cb) {
    const font_family = args.default;
    vn_screen.preloadFont(font_family, cb);
  };


  // ---- Constructors ----

  // TextTrail object.
  const DEFAULT_TTRAIL_CONFIG = {
    default_font_family: 'sans-serif',
    default_font_size: '25px',
    default_font_color: '#ffffff',
    pixels_between_words: 7,
    line_height: 30
  };
  sys_obj_constructors.TextTrail = function(args) {
    let ttconfig = mergeConfig({}, DEFAULT_TTRAIL_CONFIG);
    if (args.font_family !== void 0) ttconfig.default_font_family = args.font_family;
    if (args.font_size !== void 0) ttconfig.default_font_size = args.font_size;
    if (args.font_color !== void 0) ttconfig.default_font_color = args.font_color;
    if (args.width !== void 0) ttconfig.buffer_width = args.width;
    if (args.height !== void 0) ttconfig.buffer_height = args.height;
    
    ttconfig = mergeConfig(ttconfig, args);
    console.log(ttconfig);
    const text_trail = TextTrail(vn_screen, ttconfig);
    vn_screen.addCanvasElement(text_trail);
    
    text_trail.time = 10000;
    text_trail.measureAndLayoutText('Hello World!');
    
    return {
      ob: 'TextTrail',
      args,
      el: text_trail,
    };
  };

  // Rectangle object.
  sys_obj_constructors.Rectangle = function(args) {
    const out = {
      ob: 'Rectangle',
      args,
    }
    const rectangle = vn_screen.createPaintingCanvasElement(args.width, args.height);
    copyFields(rectangle, args);
    rectangle.draw = function(ctx, vns) {
      const { width, height, fill_style, stroke_style, line_width, corner_radius } = rectangle;
      
      roundedRect(ctx, -(width / 2), -(height / 2), width, height, corner_radius );
      
      const fill_style_type = typeof fill_style;
      if (fill_style_type !== 'undefined') {
        if (fill_style_type === 'string') {
          ctx.fillStyle = fill_style;
        }
        else {
          // This must be an object of type LinearGradient or RadialGradient,
          // Check object type?
          ctx.fillStyle = fill_style.val;
        }
        ctx.fill();
      }
      if (stroke_style !== void 0) {
        ctx.strokeStyle = stroke_style;
        if (line_width !== void 0) {
          ctx.lineWidth = line_width;
        }
        else {
          ctx.lineWidth = 1;
        }
        ctx.stroke();
      }
    };
    out.el = rectangle;
    // Set initial canvas style properties,
    setElementStyle(out, args, {});
    return out;
  };

  // Linear gradient object.
  sys_obj_constructors.LinearGradient = function(args) {
    const out = {
      ob: 'LinearGradient',
      args,
    }
    const fill_style = vn_screen.get2DContext().createLinearGradient(
                          args.x1, args.y1, args.x2, args.y2);
    out.addColorStop = function(args) {
      fill_style.addColorStop(args.stop, args.color);
    };
    out.val = fill_style;
    return out;
  };

  // Radial gradient object.
  sys_obj_constructors.RadialGradient = function(args) {
    const out = {
      ob: 'RadialGradient',
      args,
    }
    const fill_style = vn_screen.get2DContext().createRadialGradient(
                          args.x1, args.y1, args.r1, args.x2, args.y2, args.r2);
    out.addColorStop = function(args) {
      fill_style.addColorStop(args.stop, args.color);
    };
    out.val = fill_style;
    return out;
  };

  
  
  
  // ---- System API calls ----
  
  // Initialize the context VNJS javascript API,
  function initialize(cb) {

    // Create the canvas element,
    const main_div = document.getElementById("main");

    // PENDING: Handle narrow and wide orientations and different aspect ratios,
    const std_wid = (1280 * 1.1).toFixed(0);
    const std_hei = (720  * 1.1).toFixed(0);
      
    // Make the canvas element,
    main_div.innerHTML = '<canvas id="vnBodyCanvas" width="' + std_wid + '" height="' + std_hei + '" ></canvas>';

    display_canvas = document.getElementById("vnBodyCanvas");
    vn_screen = VNScreen(display_canvas, config);

    cb( null, { status:'initializeret' } );

  }
  
  function loadConstant(varname, fcode) {
    constant_var_defs[varname] = fcode;
  }
  
  function loadFunction(function_id, function_source_code) {
    const compiled_fun = eval(function_source_code);
    function_load_map[function_id] = compiled_fun;
  }

  function execAssign(ident, val) {
    // Assign the value in the global vars object,
    global_vars[ident] = val;
  }

  function execCall(ident, args, cb) {

    // Dispatch the command,
    
    // Is it a system API call?
    const syscall = system_calls[ident];
    if (syscall !== void 0) {
      // Yes, it's a system call,
      syscall(toJSObject(args), cb);
    }
    else {
      console.log("frontend.execCall ", ident, args);
      cb( null, { status:'callret' } );
    }

  }

  return {
    initialize,
    loadConstant,
    loadFunction,
    execAssign,
    execCall,
  };
}









// NOTE: Inline parser of script files.

function gameLaunch() {

  // NOTE: In a client/server system this will wait listening for instruction
  //   for the server and dispatch on the messages as appropriate.

  // Load and parse the scene file,
  const file_set = [ 'sys/init.vnjs', 'start.vnjs' ];
  loadAndParseScene(file_set, function(parsed_vn) {
    
    const front_end = FrontEnd();
    const context = Context(front_end);
    
    // Create interpreter,
    const interpreter = Interpreter(parsed_vn);

    // Initialize state (evaluates all the global variables)
    interpreter.initializeState(context, ( err, retval ) => {
      interpreter.gotoDefine(context, 'start', ( err, retval ) => {

        // Execute the next statement,
        function execNext(err, code) {
          if (err) {
            throw err;
          }
          if (code) {
            if (code.status === 'finished') {
              console.log("Interpreter finished");
              return;
            }
          }
          interpreter.executeStatements(context, execNext);
        }
        // Start the interpreter loop,
        execNext();

      });
    });

  });

}


// Called after the initial script is loaded and verified
function startupFunction() {
  
  const main_div = document.getElementById("main");

  const std_wid = (1280 * 1.0).toFixed(0);
  const std_hei = (720  * 1.0).toFixed(0);
  
  // Make the canvas element,
  main_div.innerHTML = '<canvas id="vnBodyCanvas" width="' + std_wid + '" height="' + std_hei + '" ></canvas>';

  const display_canvas = document.getElementById("vnBodyCanvas");
  
  // VNScreen config,
  let config = {
    // Scene transition that happens when a text trail starts,
    text_trail_enter:function(scene, props) {
//      scene.transitionAlphaFadeIn('text_trail_ui', 200, 'easeout1');
      scene.transitionPosition('text_trail_ui', 200, 1280 / 2, 640, 'easeout1');
    },
    // Scene transition that happens when a text trail ends,
    text_trail_exit:function(scene, props) {
//      scene.transitionAlphaFadeOut('text_trail_ui', 200, 'easein1');
      scene.transitionPosition('text_trail_ui', 200, 1280 / 2, 640 + 300, 'easein1');
    }
  };
  const vn_screen = VNScreen(display_canvas, config);
  vn_screen.preloadFonts();

  // Load initial resources,
  let image_resources = [];
  image_resources.push( { id:'test_char', url:'Assets/characters/test_character_wilma.png' },
                        { id:'test_bg', url:'Assets/backgrounds/NOIP_TEST_BG_01.jpg' }
                      );
  
  vn_screen.loadImages(image_resources, (errors) => {
    // If startup resources not available then it's a critical error,
    if (errors.length !== 0) {
      handleCriticalError("Unable to load startup resources.", errors);
      return;
    }

    // The text trial UI area,
    const text_trail_ui = vn_screen.createPaintingCanvasElement('text_trail_ui', 1280, 150);
    text_trail_ui.setLocation(1280 / 2, 640 + 300);
    text_trail_ui.draw = function(ctx, vns) {
      if (!text_trail_gradient) {
        text_trail_gradient = ctx.createLinearGradient(0, -95, 0, -95 + 38);
        text_trail_gradient.addColorStop(0,   'hsla(208, 60%, 9%, 0.0 )');
        text_trail_gradient.addColorStop(1,   'hsla(208, 60%, 9%, 0.65 )');
      }
      ctx.fillStyle = text_trail_gradient;
      ctx.fillRect( -(1280 / 2), -95, 1280, 175);
//      roundedShadowedRect(ctx, -640 + 25, -70, 1280 - 50, 136, 16, {});
    };
    text_trail_ui.setDrawAlpha(1);
    text_trail_ui.setDepth(100);

    const background = vn_screen.createStaticImageCanvasElement('background', 'test_bg');
    background.setLocation(1280 / 2, 720 / 2);
    background.setDrawAlpha(0);
    background.setNoScaleFactor(true);

    // Create static image,
    const tchar = vn_screen.createStaticImageCanvasElement('tchar', 'test_char');
    tchar.setLocation(1100, 450);
    tchar.setDrawAlpha(0);

    let text_trail_gradient = null;
    
    // The scene function is executed at the end of each part,
    const scene_function = (scene, props) => {
      
      switch (props.frame) {
        case 1:
          var FADE_IN_MS = 500;
          scene.transitionAlphaFadeIn('background', FADE_IN_MS, 'easeout1');
          scene.interruptablePause(FADE_IN_MS);
          break;
        case 2:
          // Fade and move in the character,
          scene.setLocation('tchar', 1100 - 100, 450);
          scene.transitionAlphaFadeIn('tchar', 700, 'easeout1');
          scene.transitionPosition('tchar', 1300, 950 - 100, 450, 'easeout1');
          scene.interruptablePause(1500);
          break;
        case 3:
          // Fade and move in the character,
          scene.printDialogText("There <font color='#ffa0a8'>once</font> was a person who lived in a street. The person looked like a pear.");
          scene.interruptablePause(5000);
          break;
        case 4:
          // Fade and move in the character,
          scene.printDialogText("Hey, I gotta go...");
          scene.interruptablePause(2000);
          break;
        case 5:
          // Fade and move in the character,
          scene.transitionAlphaFadeOut('tchar', 1200, 'easein1');
          scene.transitionPosition('tchar', 1800, 1050 - 100, 450, 'easein1');
          scene.waitOnInteract();
          break;
        default:
      };
      
      props.frame = props.frame + 1;

    };
    // Play the scene,
    vn_screen.playScene(scene_function, { frame:1 });

  });

}
  
})();




