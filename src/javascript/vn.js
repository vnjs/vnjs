"use strict";

// External libs,  
import VNScreen from './vnlib';
import { roundedShadowedRect } from './graphics';
import { loadFile } from './utils';

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
      console.error(err);
    }
    else {
      callback(parsed_vn);
    }

  });

}





function FrontEnd() {
  
  // All the system calls,
  const system_calls = {};
  
  // The public global variables object,
  const global_vars = {};

  
  
  system_calls.debug = function(args, cb) {
    console.log(args.default);
    cb();
  };
  
  
  // Initialize the context VNJS javascript API,
  function initialize(cb) {

    // Create the canvas element,
    const main_div = document.getElementById("main");

    // PENDING: Handle narrow and wide orientations and different aspect ratios,
    const std_wid = (1280 * 1).toFixed(0);
    const std_hei = (720  * 1).toFixed(0);
      
    let vn_screen;
    let display_canvas;
    let config = {};

    // Make the canvas element,
    main_div.innerHTML = '<canvas id="vnBodyCanvas" width="' + std_wid + '" height="' + std_hei + '" ></canvas>';

    display_canvas = document.getElementById("vnBodyCanvas");
    vn_screen = VNScreen(display_canvas, config);

    cb( null, { status:'initializeret' } );

  }
  
  function prepareExpression(expr) {
    console.log('prepareExpression: ' + expr);
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
      syscall(args, cb);
    }
    else {
      console.log("frontend.execCall ", ident, args);
      cb( null, { status:'callret' } );
    }

  }

  return {
    initialize,
    prepareExpression,
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

  const std_wid = (1280 * 1).toFixed(0);
  const std_hei = (720  * 1).toFixed(0);
  
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




