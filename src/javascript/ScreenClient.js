"use strict";


function ScreenClient(main_div) {

    const server_comms = [];

    function addServerCommunicator(comm_function) {
        server_comms.push(comm_function);
    }


    // Puts an element on the screen. The element is described by the 'style'
    // object.

    function pushElement(element_id, style) {
        console.log("PENDING");
        console.log("push Element %s %o", element_id, style);
    }


    // Pops an element from the screen.

    function popElement(element_id) {
        console.log("PENDING");
        console.log("pop Element %s", element_id);
    }


    // Clears the screen of all elements. When this returns the screen will
    // be blank.

    function clearAllElements() {
        console.log("PENDING");
        console.log("clear all elements");
    }


    // Performs an animation action on the element with the given id.

    function animateElement(element_id, next_style, time, transform) {
        console.log("PENDING");
        console.log("animateElement %s %o %o %o", element_id, next_style, time, transform);
    }



    // The map of all element commands,
    const ELEMENT_CMDS = {
        "animate": animateElement
    };


    // Sends a command to the screen client.

    function sendCommand(args) {

        const cmd = args[0];

        switch (cmd) {
            case 'pushElement': {
                const ele_id = args[1];
                const style = args[2];
                return pushElement(ele_id, style);
            }
            case 'popElement': {
                const ele_id = args[1];
                return popElement(ele_id);
            }
            case 'clearAllElements': {
                return clearAllElements();
            }
            case 'eleMsg': {

                const ele_id = args[1];
                const ele_cmd = args[2];
                const msg_args = args[3];

                const pargs = [ ele_id ].concat(msg_args);

                const cmdFunction = ELEMENT_CMDS[ele_cmd];
                if (cmdFunction !== void 0) {
                    return cmdFunction.apply(null, pargs);
                }
                else {
                    throw Error('Unknown element command: ' + ele_cmd);
                }

            }
            default: {
                throw Error('Unknown screen command: ' + cmd);
            }
        }

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
