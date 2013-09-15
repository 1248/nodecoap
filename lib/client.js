var dgram = require('dgram');
var coap = require('./coap');
var URI = require('URIjs');

function get(options, coap_url, cb) {
    var rsppkt = {FIXME:"FIXME"};
    var uri = URI(coap_url);
    var port = 5683;
    var listeners = this.listeners;

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

    // FIXME, add retries and timeouts
    this.bearer.send(outpkt.raw, 0, outpkt.raw.length, port, uri.hostname(), function() {
        console.log("client sent req");
        listeners.push({
            handler: function(rsppkt) {
                console.log(rsppkt);
                if (coap.codeClass(rsppkt.hdr.code) == 2)   // 2xx status
                    cb.success(rsppkt, rsppkt.payload);
                else
                    cb.error(rsppkt, rsppkt.payload);
            },
            id: outpkt.id,
            tok: outpkt.tok
        });
    });

//    cb(null, rsppkt, "payload");
}

function receive(msg, rinfo) {
    var endpoints = this.endpoints;
    console.log("client got: " + msg.toString('hex') + " from " + rinfo.address + ":" + rinfo.port);
    var inpkt = coap.parse(msg);
    if (inpkt instanceof Error) {
        console.log(inpkt);
        return;
    }

    // do multiple dispatch to everyone in listeners list who matches
    for (var i=0;i<this.listeners.length;i++) {
        if (inpkt.id == this.listeners[i].id && inpkt.tok == this.listeners[i].tok)
            this.listeners[i].handler(inpkt);
    }
}

function createApplication() {
    return {
        bearer: undefined,
        receiveHandler: receive,
        get: get,
        listeners: []   // list of in flight reqs
    };
}

exports = module.exports = createApplication;

