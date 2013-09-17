var dgram = require('dgram');
var erbium = require('node-erbium');
var URI = require('URIjs');
require('buffertools');

//http://tools.ietf.org/html/draft-ietf-core-coap-18#section-6.4 (TBD)

var global_mid = 0;

// opts = {mid:123, token:"abc"}
function get(type, coap_url, opts) {
    var uri = URI(coap_url);
    var port = 5683;
    var listeners = this.listeners;
    var mid;

    if (opts === undefined)
        opts = {};
    if (opts.mid === undefined)
        mid = global_mid++;
    else
        mid = opts.mid;

    if (uri.scheme() !== 'coap') {
        throw new Error("Only scheme coap:// supported");
    }
    if (uri.port() !== "")
        port = uri.port();

    var outpkt = new erbium.Erbium(type, erbium.COAP_GET, mid);
    outpkt.setHeaderUriHost(uri.hostname());
    outpkt.setHeaderUriPath(uri.path());
    if (opts.token !== undefined)
        outpkt.setHeaderToken(new Buffer(opts.token));

    var raw = outpkt.serialize();

    if (opts.beforeSend !== undefined) {
        opts.beforeSend(raw);
    }
    this.bearer.send(raw, 0, raw.length, port, uri.hostname(), function() {
        //console.log("client sent req");
        listeners.push({
            handler: function(rsppkt, raw) {
                if (opts.beforeReceive !== undefined) {
                    opts.beforeReceive(raw);
                }
                if (erbium.codeClass(rsppkt.getHeaderStatusCode()) == 2)   // 2xx status
                    opts.success(rsppkt, rsppkt.getPayload());
                else
                    opts.error(rsppkt, rsppkt.getPayload());
            },
            id: outpkt.getHeaderMID(),
            tok: outpkt.getHeaderToken()
        });
    });
}

function receive(msg, rinfo) {
    var endpoints = this.endpoints;
    //console.log("client got: " + msg.toString('hex') + " from " + rinfo.address + ":" + rinfo.port);
    var inpkt = new erbium.Erbium(msg);

    // do multiple dispatch to everyone in listeners list who matches
    for (var i=0;i<this.listeners.length;i++) {
        if (inpkt.getHeaderMID() == this.listeners[i].id && 0 == this.listeners[i].tok.compare(inpkt.getHeaderToken())) {
            this.listeners[i].handler(inpkt, msg);
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

