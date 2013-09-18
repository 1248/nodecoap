console.log('TD_COAP_CORE_15 Interoperate in a lossy context (CON mode, delayed response)');

var common = require('./common.js');
erbium = require('node-erbium');
udpApp = common.udpBearer();
coapServerApp = common.server();
coapClientApp = common.client();

var reqDrops = 16;   // drop this many consecutive requests
var reqACKDrops = 16;   // drop this many consecutive requests
var rspDrops = 16;   // drop this many consecutive responses
var rspACKDrops = 16;   // drop this many consecutive responses

var firstTimeA = true;
function check1(raw) {
    if (reqDrops > 0) {    // simulate some packet loss
        reqDrops--;
        return false;
    }
    var pkt = new erbium.Erbium(raw);
    if (firstTimeA) {
    /*
        common.checkStep(2, true);
        if (pkt.getHeaderType() != 0)
            throw new Error('Wrong type');
        if (pkt.getHeaderStatusCode() != 1)
            throw new Error('Wrong code');
        if (pkt.getHeaderMID() != 0x1234)
            throw new Error('Wrong MID');
        firstTimeA = false;
    */
    } else {
        if (reqACKDrops > 0) {    // simulate some packet loss
            reqACKDrops--;
            return false;
        }
/*
        common.checkStep(5, true);
        if (pkt.getHeaderType() != 2)
            throw new Error('Wrong type');
        if (pkt.getHeaderMID() != 0x1234)
            throw new Error("Wrong MID");
        if (pkt.getPayload().length != 0)
            throw new Error('Wrong payload');
*/
    }
}

var firstTimeB = true;
function check2(raw) {
    if (rspDrops > 0) {    // simulate some packet loss
        rspDrops--;
        return false;
    }
    var pkt = new erbium.Erbium(raw);
    if (firstTimeB) {
    /*
        common.checkStep(3, true);
        if (pkt.getHeaderType() != 2)
            throw new Error('Wrong type');
        if (pkt.getHeaderMID() != 0x1234)
            throw new Error('Wrong MID '+pkt.getHeaderMID());
        if (pkt.getPayload().length != 0)
            throw new Error('Wrong payload');
        firstTimeB = false;
    */
    } else {
        if (rspACKDrops > 0) {    // simulate some packet loss
            rspACKDrops--;
            return false;
        }
    /*
        common.checkStep(4, true);
        if (pkt.getHeaderType() != 0)
            throw new Error('Wrong type');
        if (pkt.getHeaderStatusCode() != 69)
            throw new Error('Wrong code');
        if (pkt.getPayload().length == 0)
            throw new Error('Wrong payload');
    */
    }
}

coapServerApp.get(common.TEST_ENDPOINT, function(req, res) {
    setTimeout(function() {
        res.setContentType('text/plain');
        res.send(erbium.CONTENT_2_05, 'Hello world', function(pkt) {
            // got ack
        });
    }, 100);
    res.defer();
});

function stimulus1() {
    common.checkStep(1);
    coapClientApp.get(erbium.COAP_TYPE_CON, common.TEST_URL_BASE + common.TEST_ENDPOINT, {
        mid: 0x1234,
        beforeSend: check1,
        beforeReceive: check2,
        success: function(inpkt, payload) {
//            common.checkStep(6, true);
            console.log(payload.toString());
            process.exit(0);
        },
        error: function(inpkt, payload) {
            throw new Error("hit error");
        },
        timeout: function() {
            throw new Error("timeout");
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


