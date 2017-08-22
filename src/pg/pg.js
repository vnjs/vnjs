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

        let start_time = (new Date()).getTime();

        loader.call('start.vnjs', 'run', [], vnc_frame, (err, ret) => {
            if (err) {
                console.error(err);
                process.exit(-1);
                return;
            }
            console.log("SCRIPT COMPLETED...");
            console.log("RETURNED: ", ret);

            if (ret.getInnerFrame) {
                console.log("INNER FRAME: ", ret.getInnerFrame());
            }


            let end_time = (new Date()).getTime();
            console.log("TOOK: %s", ((end_time - start_time) / 1000));

            console.log(vnc_frame.getDebugState());

        });

    });

}

pg();
