var dgram = require('dgram');
var events = require('events');

/*
function send(buf, offset, length, port, address, cb) {
console.log(this);
    return udpServer.send(buf, offset, length, port, address, cb);
}
*/

function appStart(port, client, server, cb) {
    var udpServer = this.udpServer = dgram.createSocket("udp4");
    var udpClient = this.udpClient = dgram.createSocket("udp4");

    client.bearer = udpClient;
    server.bearer = udpServer;

    udpServer.on("error", function (err) {
        console.log("udpServer error:\n" + err.stack);
        udpServer.close();
        cb(err);
    });
    udpClient.on("error", function (err) {
        console.log("udpClient error:\n" + err.stack);
        udpClient.close();
        cb(err);
    });

    udpServer.on("message", function (msg, rinfo) {
        console.log("UDP server got: " + msg.toString('hex') + " from " + rinfo.address + ":" + rinfo.port);
        server.receiveHandler(msg, rinfo);
    });

    udpClient.on("message", function (msg, rinfo) {
        console.log("UDP client got: " + msg.toString('hex') + " from " + rinfo.address + ":" + rinfo.port);
        client.receiveHandler(msg, rinfo);
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
        udpClient: undefined
    };
}

exports = module.exports = createApplication;

