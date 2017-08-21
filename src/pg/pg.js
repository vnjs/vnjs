"use strict";

const Loader = require('../javascript/vnjsloader.js');
const MachineState = require('../javascript/vnjsstate.js');



function pg() {

    const loader = Loader();
    const machine_state = MachineState(loader);

    // Prepare the 'start.vnjs' script,
    loader.prepare('start.vnjs', (err) => {
        if (err) {
            console.error(err);
            process.exit(-1);
            return;
        }

        // Call the 'run' function in 'start.vnjs'
        const vnc_frame = machine_state.createFrame();
        loader.call('start.vnjs', 'run', [], vnc_frame, (err) => {
            if (err) {
                console.error(err);
                process.exit(-1);
                return;
            }
            console.log("SCRIPT COMPLETED...");
        });

    });

}

pg();
