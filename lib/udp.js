var dgram = require('dgram');
var events = require('events');
var coap = require('./coap.js');

/*
function send(buf, offset, length, port, address, cb) {
console.log(this);
    return udpServer.send(buf, offset, length, port, address, cb);
}
*/

function appStart(port, client, server, cb) {
    var udpServer = this.udpServer = dgram.createSocket("udp4");

    client.bearer = udpServer;
    server.bearer = udpServer;

    udpServer.on("error", function (err) {
        console.log("udpServer error:\n" + err.stack);
        udpServer.close();
        cb(err);
    });

    udpServer.on("message", function (msg, rinfo) {
        console.log("UDP got: " + msg.toString('hex') + " from " + rinfo.address + ":" + rinfo.port);
        // FIXME, could just parse header and save some effort
        var inpkt = coap.parse(msg);
        if (inpkt.hdr.code == coap.COAP_METHOD_GET ||
            inpkt.hdr.code == coap.COAP_METHOD_PUT ||
            inpkt.hdr.code == coap.COAP_METHOD_POST ||
            inpkt.hdr.code == coap.COAP_METHOD_DELETE) {
            console.log("for server");
            server.receiveHandler(msg, rinfo);
        }
        else {
            console.log("for client");
            client.receiveHandler(msg, rinfo);
        }
    });

    udpServer.on("listening", function () {
        var address = udpServer.address();
        console.log("listening " +
        address.address + ":" + address.port);
        cb(null);
    });

    udpServer.bind(port, undefined);
}

function createApplication() {
    return {
        start: appStart,
        udpServer: undefined,
    };
}

exports = module.exports = createApplication;

