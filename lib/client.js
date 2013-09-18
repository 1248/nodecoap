var dgram = require('dgram');
var erbium = require('node-erbium');
var URI = require('URIjs');
require('buffertools');

var RETRY_TIME_MS = 1000;
var TIMEOUT_TIME_MS = 6000;
var MAX_TRIES = 4;

//http://tools.ietf.org/html/draft-ietf-core-coap-18#section-6.4 (TBD)

var global_mid = 0;

var inflight = [];  // All requests in flight for all clients, one day this
// could be a bottleneck. May need refactoring to make lookups fast

function findFlightRecord(id, tok) {    // speedup, TBD
    for (var i=0;i<inflight.length;i++) {
        if (inflight[i].id == id && 0 === inflight[i].tok.compare(tok))
            return inflight[i];
    }
    return -1;
}

function removeFlightRecord(id, tok) {
    for (var i=0;i<inflight.length;i++) {
        if (inflight[i].id == id && 0 === inflight[i].tok.compare(tok)) {
            if (undefined !== inflight[i].retryTimer)
                clearInterval(inflight[i].retryTimer);
            if (undefined !== inflight[i].timeoutTimer)
                clearTimeout(inflight[i].timeoutTimer);
            // find and remove from listeners
            for (var j=0;j<inflight[i].app.listeners.length;j++) {
                var listener = inflight[i].app.listeners[j];
                if (listener.id == id && 0==listener.tok.compare(tok))
                    inflight[i].app.listeners.splice(j, 1);
            }
            // remove from inflight
            inflight.splice(i, 1);
        }
    }
}

function callback_error_or_success(pkt, opts) {
    if (erbium.codeClass(pkt.getHeaderStatusCode()) == 2) {   // 2xx status
        if (opts.success !== undefined)
            opts.success(pkt, pkt.getPayload());
    }
    else {
        if (opts.error !== undefined)
            opts.error(pkt, pkt.getPayload());
    }
}

function sendPacket(app, raw, port, host, opts, cb) {
    if (opts.beforeSend !== undefined) {
        opts.beforeSend(new Buffer(raw));    // copy of
    }
    app.bearer.send(raw, 0, raw.length, port, host, function() {
        if (cb !== undefined)
            cb();
    });
}

function sendRequest(app, reqpkt, reqraw, opts, host, port) {
    app.listeners.push({
        id: reqpkt.getHeaderMID(),
        tok: reqpkt.getHeaderToken(),
        handler: function(rsppkt, rspraw) {
            var flightRecord = findFlightRecord(rsppkt.getHeaderMID(), rsppkt.getHeaderToken());
            if (flightRecord == -1) {
                console.log("WARNING: unexpected packet", rspraw);
                return;
            }
            //console.log("CLIENT RX");
            if (opts.beforeReceive !== undefined) {
                opts.beforeReceive(new Buffer(rspraw));    // copy
            }
            if (rsppkt.getHeaderType() == erbium.COAP_TYPE_ACK) {
                if (rsppkt.getHeaderStatusCode() == 0) {  // empty
                    // stop sending request, wait for reply
                    clearInterval(flightRecord.retryTimer);
                    //console.log("ACK");
                } else {    // piggy backed response
                    //console.log("ACKRSP");
                    removeFlightRecord(flightRecord.id, flightRecord.tok);
                    callback_error_or_success(rsppkt, opts);
                }
            } else
            if (rsppkt.getHeaderType() == erbium.COAP_TYPE_NON) {
                //console.log("NONRSP");
                removeFlightRecord(flightRecord.id, flightRecord.tok);
                callback_error_or_success(rsppkt, opts);
            } else
            if (rsppkt.getHeaderType() == erbium.COAP_TYPE_CON) {
                //console.log("CONRSP");
                var ackpkt = new erbium.Erbium(erbium.COAP_TYPE_ACK, 0, rsppkt.getHeaderMID());
                sendPacket(app, ackpkt.serialize(), port, host, opts, function() {
                    //console.log("CONRSP ACK sent");
                });
                removeFlightRecord(flightRecord.id, flightRecord.tok);
                callback_error_or_success(rsppkt, opts);
            }
        }
    });

    var flightRecord = {
        app: app,
        pkt: reqpkt,
        raw: reqraw,
        opts: opts,
        host: host,
        port: port,
        id: reqpkt.getHeaderMID(),
        tok: reqpkt.getHeaderToken(),
    };

    flightRecord.timeoutTimer = setTimeout(function(flightRecord) {
        console.log("TIMEOUT");
        removeFlightRecord(flightRecord.id, flightRecord.tok);
        if (opts.timeout !== undefined)
            opts.timeout();
    }, TIMEOUT_TIME_MS, flightRecord);

    if (reqpkt.getHeaderType() == erbium.COAP_TYPE_CON) {
        // setup retry system
        flightRecord.tries = MAX_TRIES;
        flightRecord.retryTimer = setInterval(function(flightRecord) {
            if (flightRecord.tries--) {
                console.log("RETRY");
                sendPacket(app, reqraw, port, host, opts, function() {
                    // console.log("CON REQ RETRY sent");
                });
            } else {
                console.log("BAIL");
                removeFlightRecord(flightRecord.id, flightRecord.tok);
                if (opts.timeout !== undefined)
                    opts.timeout();
            }
        }, RETRY_TIME_MS, flightRecord);
    }

    inflight.push(flightRecord);    // remember this request
    sendPacket(app, reqraw, port, host, opts, function() {
        // console.log("CON REQ sent");
    });
}

function request(app, code, type, coap_url, opts) {
    var uri = URI(coap_url);
    var port = 5683;
    var mid;

    //console.log("REQ ", code, type, coap_url, opts);

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
    outpkt.setHeaderUriQuery(uri.query());

    if (opts.token !== undefined)
        outpkt.setHeaderToken(new Buffer(opts.token));
    if (opts.payload !== undefined)
        outpkt.setPayload(new Buffer(opts.payload));

    sendRequest(app, outpkt, outpkt.serialize(), opts, uri.hostname(), port);
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

