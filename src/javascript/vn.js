"use strict";

/* globals document */

const { loadFile, mergeConfig } = require('./utils');
const Loader = require('./vnjsloader.js');
const MachineState = require('./vnjsstate.js');



function handleCriticalError(msg, args) {
    console.log("Stopped because of critical error(s):", args);
}

// Find the right method, call on correct element
function launchIntoFullscreen(element) {
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

function exitFullscreen() {
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

    const page_div = document.createElement('div');
    page_div.id = 'page';

    const fullscreen = document.createElement('button');
    fullscreen.innerHTML = 'Launch Game Fullscreen (Recommended for Mobile)';
    const windowed = document.createElement('button');
    windowed.innerHTML = 'Launch Game Windowed';

    fullscreen.addEventListener('click', () => {
        console.log("LAUNCH THE GAME!");
        launchIntoFullscreen(document.documentElement);
        gameLaunch();
    }, false);

    windowed.addEventListener('click', () => {
        console.log("LAUNCH THE GAME!");
        gameLaunch();
    }, false);

    page_div.appendChild(fullscreen);
    page_div.appendChild(document.createElement('br'));
    page_div.appendChild(document.createElement('br'));
    page_div.appendChild(windowed);

    main_div.appendChild(page_div);

});



// NOTE: Inline parser of script files.

function gameLaunch() {

    // NOTE: In a client/server system this will wait listening for instruction
    //   for the server and dispatch on the messages as appropriate.

//    // Load and parse the scene file,
//    const file_set = [ 'start.vnjs' ];

    // Clear the DOM,
    const main_div = document.getElementById("main");
    main_div.innerHTML = '';

    function loadConvert(file, cb) {
        return loadFile('scripts/' + file, (req) => {
            if (req.fail !== void 0) {
                return cb(Error(req.statusText));
            }
            const loaded_text = req.req.responseText;
//            console.log(req);
            return cb(undefined, loaded_text);
        });
    }


    const loader = Loader(loadConvert);
    const machine_state = MachineState(loader);

    loader.prepare('start.vnjs', (err) => {
        if (err) {
            console.error(err);
            return;
        }

        // Call the 'run' function in 'start.vnjs'
        const vnc_frame = machine_state.createFrame();

        let start_time = (new Date()).getTime();

        loader.call('start.vnjs', 'main', [], vnc_frame, (err, ret) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log("SCRIPT COMPLETED...");
            console.log("RETURNED: ", ret);

            if (ret !== void 0 && ret.getInnerFrame) {
                console.log("INNER FRAME: ", ret.getInnerFrame());
            }

            let end_time = (new Date()).getTime();
            console.log("TOOK: %s", ((end_time - start_time) / 1000));

            console.log(vnc_frame.getDebugState());

        });

    });






}
