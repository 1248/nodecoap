var udpBearer = require('./udp.js');
var coap = require('./coap');
var server = require('./server');
var client = require('./client');

var coapServerApp = server();
var coapClientApp = client();

var udpApp = udpBearer();

udpApp.start(5683, coapClientApp, coapServerApp, function(err) {
    console.log(err);
    coapServerApp.start();
    test_client();
});

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


////////////////////////

function test_client() {
    var options = {};
    coapClientApp.get(options, 'coap://127.0.0.1:5683/hello/bob', function(err, rsp, payload) {
//    coapClientApp.get(options, 'coap://lab.smelly/.well-known/core', function(err, rsp, payload) {
        console.log("** TEST RSP ", err, rsp, payload);
    });
}
