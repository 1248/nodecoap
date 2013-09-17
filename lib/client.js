var dgram = require('dgram');
var erbium = require('node-erbium');
var URI = require('URIjs');
require('buffertools');

function get(options, coap_url, cb) {
    var rsppkt = {FIXME:"FIXME"};
    var uri = URI(coap_url);
    var port = 5683;
    var listeners = this.listeners;
    var FIXME_MID = 1;
    var FIXME_TOK = new Buffer("GGG");

//http://tools.ietf.org/html/draft-ietf-core-coap-18#section-6.4
//FIXME

    if (uri.scheme() !== 'coap') {
        cb(new Error("Only scheme coap:// supported"));
        return;
    }
    if (uri.port() !== "")
        port = uri.port();

    var outpkt = new erbium.Erbium(erbium.COAP_TYPE_CON, erbium.COAP_GET, FIXME_MID);
    outpkt.setHeaderUriHost(uri.hostname());
    outpkt.setHeaderUriPath(uri.path());
    outpkt.setHeaderToken(FIXME_TOK);

    var raw = outpkt.serialize();

    // FIXME, add retries and timeouts
    this.bearer.send(raw, 0, raw.length, port, uri.hostname(), function() {
        console.log("client sent req");
        listeners.push({
            handler: function(rsppkt) {
                if (erbium.codeClass(rsppkt.getHeaderStatusCode()) == 2)   // 2xx status
                    cb.success(rsppkt, rsppkt.getPayload());
                else
                    cb.error(rsppkt, rsppkt.getPayload());
            },
            id: outpkt.getHeaderMID(),
            tok: outpkt.getHeaderToken()
        });
    });
//    cb(null, rsppkt, "payload");
}

function receive(msg, rinfo) {
    var endpoints = this.endpoints;
    console.log("client got: " + msg.toString('hex') + " from " + rinfo.address + ":" + rinfo.port);
    var inpkt = new erbium.Erbium(msg);

    // do multiple dispatch to everyone in listeners list who matches
    for (var i=0;i<this.listeners.length;i++) {
        if (inpkt.getHeaderMID() == this.listeners[i].id && 0 == this.listeners[i].tok.compare(inpkt.getHeaderToken())) {
            this.listeners[i].handler(inpkt);
        }
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

