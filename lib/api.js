var udpBearer = require('./udp.js');
var erbium = require('node-erbium');
var server = require('./server');
var client = require('./client');

var coapServerApp = server();
var coapClientApp = client();

var udpApp = udpBearer();

coapServerApp.get('/.well-known/core', function(req, res) {
    res.setContentType('application/linkformat');
    res.send(erbium.CONTENT_2_05, "</hello>;title=\"Hello sayer\"");
});

coapServerApp.get('/hello', function(req, res) {
    res.send(erbium.CONTENT_2_05, "Hello world");
});

coapServerApp.put('/hello', function(req, res) {
    res.send(erbium.CONTENT_2_05, "Hello " + req.payload);
});


udpApp.start(5683, coapClientApp, coapServerApp, function(err) {
    if (err) {
        console.log(err);
        process.exit(1);
    }
    coapServerApp.start();
    test_client();
});

////////////////////////

function test_client() {
    var opts = {};
    coapClientApp.get(opts, 'coap://127.0.0.1:5683/hello', {
        success: function(inpkt, payload) {
            console.log("TEST RSP OK: ", payload.toString());
        },
        error: function(inpkt, payload) {
            console.log("TEST RSP ERR: ", inpkt.hdr.code, payload);
        }
    });
}
