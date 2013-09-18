console.log('TD_COAP_CORE_14 Interoperate in lossy context (CON mode, piggybacked response)');

var common = require('./common.js');
erbium = require('node-erbium');
udpApp = common.udpBearer();
coapServerApp = common.server();
coapClientApp = common.client();

var reqDrops = 7;   // drop this many consecutive requests
var rspDrops = 7;   // drop this many consecutive responses

function check1(raw) {
    if (reqDrops > 0) {    // simulate some packet loss
        reqDrops--;
        return false;
    }
    common.checkStep(2, true);
    var pkt = new erbium.Erbium(raw);
    if (pkt.getHeaderType() != 0)
        throw new Error('Wrong type');
    if (pkt.getHeaderStatusCode() != 1)
        throw new Error('Wrong code');
}

function check2(raw) {
    if (rspDrops > 0) {    // simulate some packet loss
        rspDrops--;
        return false;
    }
    common.checkStep(3, true);
    var pkt = new erbium.Erbium(raw);
    if (pkt.getHeaderStatusCode() != 69)
        throw new Error('Wrong code');
    if (pkt.getHeaderContentType() != erbium.TEXT_PLAIN)
        throw new Error('Wrong type');
}

coapServerApp.get(common.TEST_ENDPOINT, function(req, res) {
    res.setContentType('text/plain');
    res.send(erbium.CONTENT_2_05, 'Hello world');
});

function stimulus1() {
    common.checkStep(1);
    coapClientApp.get(erbium.COAP_TYPE_CON, common.TEST_URL_BASE + common.TEST_ENDPOINT, {
        beforeSend: check1,
        beforeReceive: check2,
        success: function(inpkt, payload) {
            common.checkStep(4);
            console.log(payload.toString());
            common.checkStep(5);
            if (reqDrops == 0 && rspDrops == 0)
                process.exit(0);
            else
                throw new Error('Packet loss problem');
        },
        error: function() {
            console.log("Error");
        },
        timeout: function() {
            console.log("Timeout");
        }
    });
}

udpApp.start(5683, coapClientApp, coapServerApp, function(err) {
    if (err) {
        console.log(err);
        process.exit(1);
    }
    coapServerApp.start();
    stimulus1();
});


