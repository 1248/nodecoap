var dgram = require('dgram');
var erbium = require('node-erbium');

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

function handle(endpoints, inpkt) {
    var outpkt;
    var ep;
    var f;
    var method;

    try {
        method = erbium.methodToString(inpkt.getHeaderStatusCode());
    } catch(e) {}

    var req = {
        path: '/'+inpkt.getHeaderUriPath().toString(),
        method: method,
        payload: inpkt.getPayload()
    };

    ep = endpoints[req.path];
    // routing
    if (undefined === ep || undefined === method)
        outpkt = new erbium.Erbium(erbium.COAP_TYPE_ACK, erbium.NOT_FOUND_4_04, inpkt.getHeaderMID());
    else
    if (undefined === (f = ep[req.method]))
        outpkt = new erbium.Erbium(erbium.COAP_TYPE_ACK, erbium.METHOD_NOT_ALLOWED_4_05, inpkt.getHeaderMID());
    else {
        outpkt = new erbium.Erbium(erbium.COAP_TYPE_ACK, erbium.CONTENT_2_05, inpkt.getHeaderMID());
        outpkt.setHeaderContentType(erbium.TEXT_PLAIN); // default
        var res = {
            setContentType: function(type) {
                console.log(type);
                console.log(erbium.contentStringToType(type));
                outpkt.setHeaderContentType(erbium.contentStringToType(type));
            },
            send: function(code, payload) {
                outpkt.setHeaderStatusCode(code);
                outpkt.setPayload(new Buffer(payload));
            }
        };
        f(req, res);
    }

    // echo back token
    outpkt.setHeaderToken(inpkt.getHeaderToken());

    return outpkt;
}

function appStart() {
    
}

function receive(msg, rinfo) {
    var endpoints = this.endpoints;
    console.log("server got: " + msg.toString('hex') + " from " + rinfo.address + ":" + rinfo.port);
    var inpkt = new erbium.Erbium(msg);
    var outpkt = handle(endpoints, inpkt);
    var raw = outpkt.serialize();
    this.bearer.send(raw, 0, raw.length, rinfo.port, rinfo.address, function() {
        console.log("server sent rsp ", raw, "to ", rinfo.port, rinfo.address);
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
        start: appStart,
        endpoints: {}
    };
}

exports = module.exports = createApplication;

