exports.udpBearer = require('../lib/udp.js');
exports.server = require('../lib/server');
exports.client = require('../lib/client');
exports.TEST_URL_BASE = 'coap://127.0.0.1:5683';
exports.TEST_ENDPOINT = '/test';


var step = 1;
exports.checkStep = function (shouldbe, allowRestart) {
    var pass = false;
    if (allowRestart === true) {
        if (shouldbe <= step)
            pass = true;
    } else {
        if (step == shouldbe)
            pass = true;
    }
    if (!pass)
        throw new Error("Wrong step, expected "+step+" got "+shouldbe);
    else
        console.log("Step "+step+" OK");
    step = shouldbe+1;
}


