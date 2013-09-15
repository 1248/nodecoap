//client.get(options, 'coap://127.0.0.1:5683/hello', function(err, rsp, payload) {
var dgram = require('dgram');
var coap = require('./coap');
var URI = require('URIjs');



function get(options, coap_url, cb) {
    var rsppkt = {FIXME:"FIXME"};
    var uri = URI(coap_url);
    var port = 5683;

    if (uri.scheme() !== 'coap') {
        cb(new Error("Only scheme coap:// supported"));
        return;
    }
    if (uri.port() !== undefined)
        port = uri.port();

    var outpkt = coap.make_request(coap.COAP_METHOD_GET, 1234, "TOK");
    uri.segment().map(function(e) {
        coap.addOption(outpkt, coap.COAP_OPTION_URI_PATH, e);
    });

    coap.build(outpkt);

    // FIXME add options for URI PATH

    console.log(outpkt);
    socket = dgram.createSocket('udp4');  // FIXME
    socket.send(outpkt.raw, 0, outpkt.raw.length, port, uri.hostname(), function() {
        console.log("sent");
        socket.close();
    });

    cb(null, rsppkt, "payload");
}

function createApplication() {
    return {
        get: get,
        //udpServer: undefined,
    };
}

exports = module.exports = createApplication;

