var dgram = require('dgram');
var erbium = require('node-erbium');
var URI = require('URIjs');
require('buffertools');

//http://tools.ietf.org/html/draft-ietf-core-coap-18#section-6.4 (TBD)

var global_mid = 0;

function request(app, code, type, coap_url, opts) {
    var uri = URI(coap_url);
    var port = 5683;
    var listeners = app.listeners;
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

    var outpkt = new erbium.Erbium(type, code, mid);
    outpkt.setHeaderUriHost(uri.hostname());
    outpkt.setHeaderUriPath(uri.path());

    if (opts.token !== undefined)
        outpkt.setHeaderToken(new Buffer(opts.token));
    if (opts.payload !== undefined)
        outpkt.setPayload(new Buffer(opts.payload));

    var raw = outpkt.serialize();

    if (opts.beforeSend !== undefined) {
        opts.beforeSend(raw);
    }
    app.bearer.send(raw, 0, raw.length, port, uri.hostname(), function() {
        listeners.push({
            handler: function(rsppkt, raw) {
                if (opts.beforeReceive !== undefined) {
                    opts.beforeReceive(raw);
                }
                // if needs acking, ack it
                if (rsppkt.getHeaderType() == erbium.COAP_TYPE_CON) {
                    var ackpkt = new erbium.Erbium(erbium.COAP_TYPE_ACK, 0/*empty*/, rsppkt.getHeaderMID());
                    var ackraw = ackpkt.serialize();
                    if (opts.beforeSend !== undefined) {
                        opts.beforeSend(ackraw);
                    }
                    app.bearer.send(ackraw, 0, ackraw.length, port, uri.hostname(), function() {
                        // console.log("ACK sent");
                    });
                }

                // if is non-empty ack
                if (outpkt.getHeaderType() == erbium.COAP_TYPE_CON) {
                    if ((rsppkt.getHeaderType() == erbium.COAP_TYPE_ACK || rsppkt.getHeaderType() == erbium.COAP_TYPE_CON) && rsppkt.getHeaderStatusCode() !== 0) {
                        if (erbium.codeClass(rsppkt.getHeaderStatusCode()) == 2) {   // 2xx status
                            if (opts.success !== undefined)
                                opts.success(rsppkt, rsppkt.getPayload());
                        }
                        else {
                            if (opts.error !== undefined)
                                opts.error(rsppkt, rsppkt.getPayload());
                        }
                    }
                }
                if (outpkt.getHeaderType() == erbium.COAP_TYPE_NON) {
                    if (rsppkt.getHeaderType() == erbium.COAP_TYPE_NON && rsppkt.getHeaderStatusCode() !== 0) {
                        if (erbium.codeClass(rsppkt.getHeaderStatusCode()) == 2) {   // 2xx status
                            if (opts.success !== undefined)
                                opts.success(rsppkt, rsppkt.getPayload());
                        }
                        else {
                            if (opts.error !== undefined)
                                opts.error(rsppkt, rsppkt.getPayload());
                        }
                    }
                }

            },
            id: outpkt.getHeaderMID(),
            tok: outpkt.getHeaderToken()
        });
    });
}


function receive(msg, rinfo) {
    var endpoints = this.endpoints;
    var inpkt = new erbium.Erbium(msg);
    // do multiple dispatch to everyone in listeners list who matches
    for (var i=0;i<this.listeners.length;i++) {
        if (inpkt.getHeaderMID() == this.listeners[i].id && 0 === this.listeners[i].tok.compare(inpkt.getHeaderToken())) {
            this.listeners[i].handler(inpkt, msg);
        }
    }
}

function createApplication() {
    return {
        bearer: undefined,
        receiveHandler: receive,
        get: function(type, coap_url, opts) {
            request(this, erbium.COAP_GET, type, coap_url, opts);
        },
        put: function(type, coap_url, opts) {
            request(this, erbium.COAP_PUT, type, coap_url, opts);
        },
        post: function(type, coap_url, opts) {
            request(this, erbium.COAP_POST, type, coap_url, opts);
        },
        del: function(type, coap_url, opts) {
            request(this, erbium.COAP_DELETE, type, coap_url, opts);
        },
        listeners: []   // list of in flight reqs
    };
}

exports = module.exports = createApplication;

