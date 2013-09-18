exports.udpBearer = require('../lib/udp.js');
exports.server = require('../lib/server');
exports.client = require('../lib/client');
exports.TEST_URL_BASE = 'coap://127.0.0.1:5683';
exports.TEST_ENDPOINT = '/test';


var step = 1;
exports.checkStep = function (shouldbe) {
    if (step !== shouldbe)
        throw new Error("Wrong step, expected "+shouldbe+" got "+step);
    else
        console.log("Step "+step+" OK");
    step++;
}


