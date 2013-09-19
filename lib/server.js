var dgram = require('dgram');
var erbium = require('node-erbium');
require('buffertools');
var URI = require('URIjs');

function getRD(query) {
    var lines = [];
    var links = Object.keys(this.endpoints);
    if (query === undefined)
        query = {};
    for (var i=0;i<links.length;i++) {
        var skip = false;
        if (query.href !== undefined && query.href != links[i])
            continue;
        var str = '<'+links[i]+'>';
        if (this.endpoints[links[i]].hints !== undefined) {
            var hints = Object.keys(this.endpoints[links[i]].hints);
            for (var j=0;j<hints.length;j++) {
                var name = hints[j];
                var val = this.endpoints[links[i]].hints[name];
                if (query[name] !== undefined) {
                    if (query[name] != val) {
                        skip = true;
                        break;
                    }
                }
                if (typeof val === 'string' || typeof val === 'number')
                    str += ';'+name+'='+JSON.stringify(val);
                else
                    throw new Error("rd val not number or string");
            }
        }
        if (!skip)
            lines.push(str);
    }
    return lines.join(',\n');
}

function routeAddGet(path, handler, hints) {
    if (this.endpoints[path] === undefined)
        this.endpoints[path] = {};
    this.endpoints[path].get = handler;
    this.endpoints[path].hints = hints;
}
function routeAddPut(path, handler, hints) {
    if (this.endpoints[path] === undefined)
        this.endpoints[path] = {};
    this.endpoints[path].put = handler;
    this.endpoints[path].hints = hints;
}
function routeAddPost(path, handler, hints) {
    if (this.endpoints[path] === undefined)
        this.endpoints[path] = {};
    this.endpoints[path].post = handler;
    this.endpoints[path].hints = hints;
}
function routeAddDel(path, handler, hints) {
    if (this.endpoints[path] === undefined)
        this.endpoints[path] = {};
    this.endpoints[path].del = handler;
    this.endpoints[path].hints = hints;
}

function handle(endpoints, ackwaiters, observers, inpkt, sendfunc, host, port) {
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

    if (inpkt.getHeaderObserve() !== undefined)
        req.observe = 0;

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

    // got a RST, is it being waited for?
    if (inpkt.getHeaderType() == erbium.COAP_TYPE_RST) {
        // console.log("SRV GOT RST");
        for(var i=0;i<observers.length;i++) {
            if (observers[i].id == inpkt.getHeaderMID() &&
                0==observers[i].tok.compare(inpkt.getHeaderToken()) &&
                observers[i].host == host &&
                observers[i].port == port) {
                observers[i].onReset();
                observers.splice(i, 1);
                break;
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
            close: function() {
                console.log("CLOSE");
                // find item in observers and kill it
                for(var i=0;i<observers.length;i++) {
                    if (observers[i].id == inpkt.getHeaderMID() &&
                        0==observers[i].tok.compare(inpkt.getHeaderToken()) &&
                        observers[i].host == host &&
                        observers[i].port == port) {
                        observers.splice(i, 1);
                        break;
                    }
                }
            },
            onReset: function(cb) {
                console.log("SETTING UP ONRESET");
                // FIXME, add some timeout so we cleanup and remove the observers entry
                observers.push({
                    id: inpkt.getHeaderMID(),
                    tok: inpkt.getHeaderToken(),
                    host: host,
                    port: port,
                    onReset: cb
                });
            },
            setContentType: function(type) {
                outpkt.setHeaderContentType(erbium.contentStringToType(type));
            },
            send: function(code, payload, onack) {
                if (deferred)
                    outpkt.setHeaderType(inpkt.getHeaderType());
                if (req.observe !== undefined)
                    outpkt.setHeaderObserve(req.observe++);
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
    var observers = this.observers;
    //console.log("server got: " + msg.toString('hex') + " from " + rinfo.address + ":" + rinfo.port);
    var inpkt = new erbium.Erbium(msg);

    var outpkt = handle(endpoints, ackwaiters, observers, inpkt, function(outpkt, onack) {
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
    }, rinfo.address, rinfo.port);
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
        ackwaiters: [],
        observers: []
    };
}

exports = module.exports = createApplication;

