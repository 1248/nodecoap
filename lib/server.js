var dgram = require('dgram');
var erbium = require('node-erbium');
require('buffertools');
var URI = require('URIjs');

function getRD() {
    var links = ""
    var keys = Object.keys(this.endpoints);
    for (var i=0;i<keys.length;i++) {
        var href = keys[i];
        links += '<'+href+'>\n';
    }
    return links;
}

function routeAddGet(path, handler) {
    if (this.endpoints[path] === undefined)
        this.endpoints[path] = {};
    this.endpoints[path].get = handler;
}
function routeAddPut(path, handler) {
    if (this.endpoints[path] === undefined)
        this.endpoints[path] = {};
    this.endpoints[path].put = handler;
}
function routeAddPost(path, handler) {
    if (this.endpoints[path] === undefined)
        this.endpoints[path] = {};
    this.endpoints[path].post = handler;
}
function routeAddDel(path, handler) {
    if (this.endpoints[path] === undefined)
        this.endpoints[path] = {};
    this.endpoints[path].del = handler;
}

function handle(endpoints, ackwaiters, inpkt, sendfunc) {
    var ep;
    var f;
    var method;
    var type;
    var deferred = false;
    var outpkt;
    var query;

    try {
        method = erbium.methodToString(inpkt.getHeaderStatusCode());
    } catch(e) {}

    var req = {
        path: '/'+inpkt.getHeaderUriPath().toString(),
        method: method,
        payload: inpkt.getPayload()
    };

    query = inpkt.getHeaderUriQuery().toString();
    if (query.length > 0) {
        req.query = URI('?'+query).search(true);
    }

    // got an ack, is it being waited for?
    if (inpkt.getHeaderType() == erbium.COAP_TYPE_ACK) {
        for (var i=0;i<ackwaiters.length;i++) {
            if (ackwaiters[i].mid == inpkt.getHeaderMID()) {
                if (0 === ackwaiters[i].token.compare(inpkt.getHeaderToken())) {
                    ackwaiters[i].cb(inpkt);
                    // remove it from list
                    ackwaiters.splice(i, 1);
                }
            }
        }
        return;
    }

    // response type
    if (inpkt.getHeaderType() == erbium.COAP_TYPE_CON)
        type = erbium.COAP_TYPE_ACK;
    if (inpkt.getHeaderType() == erbium.COAP_TYPE_NON)
        type = erbium.COAP_TYPE_NON;

    ep = endpoints[req.path];
    // routing
    if (undefined === ep || undefined === method) {
        outpkt = new erbium.Erbium(type, erbium.NOT_FOUND_4_04, inpkt.getHeaderMID());
        outpkt.setHeaderToken(inpkt.getHeaderToken());  // echo
        sendfunc(outpkt);
    } else
    if (undefined === (f = ep[req.method])) {
        outpkt = new erbium.Erbium(type, erbium.METHOD_NOT_ALLOWED_4_05, inpkt.getHeaderMID());
        outpkt.setHeaderToken(inpkt.getHeaderToken());  // echo
        sendfunc(outpkt);
    }
    else {
        outpkt = new erbium.Erbium(type, erbium.CONTENT_2_05, inpkt.getHeaderMID());
        outpkt.setHeaderToken(inpkt.getHeaderToken());  // echo
        var res = {
            setContentType: function(type) {
                outpkt.setHeaderContentType(erbium.contentStringToType(type));
            },
            send: function(code, payload, onack) {
                if (deferred) {
                    outpkt.setHeaderType(inpkt.getHeaderType());
                }
                outpkt.setHeaderStatusCode(code);
                outpkt.setPayload(new Buffer(payload));
                sendfunc(outpkt, onack);
            },
            defer: function() {
                deferred = true;
                sendfunc(new erbium.Erbium(erbium.COAP_TYPE_ACK, 0/*empty*/, inpkt.getHeaderMID()));
            }
        };
        f(req, res);
    }
}

function appStart() {
    
}

function receive(msg, rinfo) {
    var endpoints = this.endpoints;
    var bearer = this.bearer;
    var ackwaiters = this.ackwaiters;
    //console.log("server got: " + msg.toString('hex') + " from " + rinfo.address + ":" + rinfo.port);
    var inpkt = new erbium.Erbium(msg);

    var outpkt = handle(endpoints, ackwaiters, inpkt, function(outpkt, onack) {
        var raw = outpkt.serialize();
        if (onack !== undefined) {
            ackwaiters.push({
                cb: onack,
                mid: outpkt.getHeaderMID(),
                token: outpkt.getHeaderToken()
            });
        }
        bearer.send(raw, 0, raw.length, rinfo.port, rinfo.address, function() {
//            console.log("server sent rsp ", raw, "to ", rinfo.port, rinfo.address);
        });
    });
}

function createApplication() {
    return {
        bearer: undefined,
        receiveHandler: receive,
        get: routeAddGet,
        put: routeAddPut,
        post: routeAddPost,
        del: routeAddDel,
        getRD: getRD,
        start: appStart,
        endpoints: {},
        ackwaiters: []
    };
}

exports = module.exports = createApplication;

