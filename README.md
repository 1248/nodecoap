CoAP client and server library for Node.js
==========================================

Toby Jaffey <toby@1248.io>

https://github.com/1248/nodecoap

http://1248.io


This package is an attempt at a CoAP client and server implementation for node.js. It is based on node-erbium, which in turn is based on the Contiki Erbium CoAP parser/generator library.

This is alpha software.
Although it has been tested against itself, it has not been well tested against any other CoAP implementations. Block is not supported, observe is partially supported.

The API needs much improvement to be more node-ish, using common idioms, etc.

The test directory contains an attempt to implement the ETSI plugtest scripts. These show uses of the API.


Client example

    var common = require('../test/common.js');
    erbium = require('node-erbium');
    udpApp = common.udpBearer();
    coapClientApp = common.client();

    udpApp.start(5683, coapClientApp, undefined, function(err) {
        if (err) {
            console.log("Error: "+err);
            process.exit(1);
        }
        coapClientApp.put(erbium.COAP_TYPE_CON, "coap://10.0.1.120/light", {
            payload: "1",
            contentType: "text/plain",
            success: function(inpkt, payload) {
                console.log("Got: "+payload.toString());
                process.exit(0);
            },
            error: function(inpkt, payload) {
                console.log("Error");
                process.exit(1);
            }
        });
    });
 

Server example

    var common = require('./common.js');
    erbium = require('node-erbium');
    udpApp = common.udpBearer();
    coapServerApp = common.server();

    coapServerApp.get('/hello', function(req, res) {
        res.setContentType('text/plain');
        res.send(erbium.CONTENT_2_05, 'Hello world');
    });

    udpApp.start(5683, undefined, coapServerApp, function(err) {
        if (err) {
            console.log(err);
            process.exit(1);
        }
        coapServerApp.start();
    });



MIT license.

