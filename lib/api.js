var udpBearer = require('./udp.js');
var coap = require('./coap');
var server = require('./server');
var client = require('./client');

var coapServerApp = server();
var coapClientApp = client();

var udpApp = udpBearer();

coapServerApp.get('/.well-known/core', function(req, res) {
    res.addOption(coap.COAP_OPTION_CONTENT_FORMAT, coap.COAP_CONTENTTYPE_coapServerAppLICATION_LINKFORMAT);
    res.send(coap.COAP_RSPCODE_CONTENT, "</hello>");
});

coapServerApp.get('/hello', function(req, res) {
    res.addOption(coap.COAP_OPTION_CONTENT_FORMAT, coap.COAP_CONTENTTYPE_TEXT_PLAIN);
    res.send(coap.COAP_RSPCODE_CONTENT, "hello");
});

coapServerApp.put('/hello', function(req, res) {
    res.addOption(coap.COAP_OPTION_CONTENT_FORMAT, coap.COAP_CONTENTTYPE_TEXT_PLAIN);
    res.send(coap.COAP_RSPCODE_CONTENT, "hello " + req.payload);
});


udpApp.start(5683, coapClientApp, coapServerApp, function(err) {
    console.log(err);
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
