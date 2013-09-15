var dgram = require('dgram');
var coap = require('./coap');
var URI = require('URIjs');

function get(options, coap_url, cb) {
    var rsppkt = {FIXME:"FIXME"};
    var uri = URI(coap_url);
    var port = 5683;

//http://tools.ietf.org/html/draft-ietf-core-coap-18#section-6.4
//FIXME

    if (uri.scheme() !== 'coap') {
        cb(new Error("Only scheme coap:// supported"));
        return;
    }
    if (uri.port() !== "")
        port = uri.port();

    var outpkt = coap.make_request(coap.COAP_METHOD_GET, 1234, "TOK");
    uri.segment().map(function(e) {
        coap.addOption(outpkt, coap.COAP_OPTION_URI_PATH, e);
    });

    coap.build(outpkt);

    console.log(outpkt);

    this.bearer.send(outpkt.raw, 0, outpkt.raw.length, port, uri.hostname(), function() {
        console.log("client sent req");
    });

//    cb(null, rsppkt, "payload");
}

function receive(msg, rinfo) {
    var endpoints = this.endpoints;
    console.log("client got: " + msg.toString('hex') + " from " + rinfo.address + ":" + rinfo.port);
    var inpkt = coap.parse(msg);
    console.log(inpkt);
}

function createApplication() {
    return {
        bearer: undefined,
        receiveHandler: receive,
        get: get
    };
}

exports = module.exports = createApplication;

