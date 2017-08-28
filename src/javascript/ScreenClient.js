"use strict";


function ScreenClient(main_div) {

    const server_comms = [];

    function addServerCommunicator(comm_function) {
        server_comms.push(comm_function);
    }





    // Sends a command to the screen client.

    function sendCommand(cmd, args) {
        console.log("Process Client Command: %s %s", cmd, JSON.stringify(args));

    }



    // Set up the component,

    function setup() {

    }
    setup();

    return {
        addServerCommunicator,
        sendCommand,
    };

}


module.exports = ScreenClient;
