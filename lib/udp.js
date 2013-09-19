var dgram = require('dgram');
var events = require('events');

function appStart(port, client, server, cb) {
    if (server !== undefined) {
        var udpServer = dgram.createSocket("udp4");
        this.udpServer = udpServer;
        server.bearer = udpServer;
        udpServer.on("error", function (err) {
            console.log("udpServer error:\n" + err.stack);
            udpServer.close();
            cb(err);
        });
        udpServer.on("message", function (msg, rinfo) {
            //console.log("UDP server got: " + msg.toString('hex') + " from " + rinfo.address + ":" + rinfo.port);
            server.receiveHandler(msg, rinfo);
        });
        udpServer.on("listening", function () {
            var address = udpServer.address();
            //console.log("listening " +
            //address.address + ":" + address.port);
            cb(null);
        });

        udpServer.bind(port, undefined);
    }
    if (client !== undefined) {
        var udpClient = dgram.createSocket("udp4");
        this.udpClient = udpClient;
        client.bearer = udpClient;
        udpClient.on("error", function (err) {
            console.log("udpClient error:\n" + err.stack);
            udpClient.close();
            cb(err);
        });
        udpClient.on("message", function (msg, rinfo) {
            //console.log("UDP client got: " + msg.toString('hex') + " from " + rinfo.address + ":" + rinfo.port);
            client.receiveHandler(msg, rinfo);
        });
        if (server === undefined)
            cb(null);
    }
}

function createApplication() {
    return {
        start: appStart,
        udpServer: undefined,
        udpClient: undefined
    };
}

exports = module.exports = createApplication;

