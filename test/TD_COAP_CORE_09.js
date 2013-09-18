console.log('TD_COAP_CORE_09 Perform GET transaction with a separate response');

var common = require('./common.js');
erbium = require('node-erbium');
udpApp = common.udpBearer();
coapServerApp = common.server();
coapClientApp = common.client();

var firstTimeA = true;
function check1(raw) {
    var pkt = new erbium.Erbium(raw);
    if (firstTimeA) {
        console.log('2');
        if (pkt.getHeaderType() != 0)
            throw new Error('Wrong type');
        if (pkt.getHeaderStatusCode() != 1)
            throw new Error('Wrong code');
        if (pkt.getHeaderMID() != 0x1234)
            throw new Error('Wrong MID');
        firstTimeA = false;
    } else {
        console.log('5');
        if (pkt.getHeaderType() != 2)
            throw new Error('Wrong type');
        if (pkt.getHeaderMID() != 0x1234)
            throw new Error("Wrong MID");
        if (pkt.getPayload().length != 0)
            throw new Error('Wrong payload');
    }
}

var firstTimeB = true;
function check2(raw) {
    var pkt = new erbium.Erbium(raw);
    if (firstTimeB) {
        console.log('3');
        if (pkt.getHeaderType() != 2)
            throw new Error('Wrong type');
        if (pkt.getHeaderMID() != 0x1234)
            throw new Error('Wrong MID '+pkt.getHeaderMID());
        if (pkt.getPayload().length != 0)
            throw new Error('Wrong payload');
        firstTimeB = false;
    } else {
        console.log('4');
        if (pkt.getHeaderType() != 0)
            throw new Error('Wrong type');
        if (pkt.getHeaderStatusCode() != 69)
            throw new Error('Wrong code');
        if (pkt.getPayload().length == 0)
            throw new Error('Wrong payload');
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
    console.log('1');
    coapClientApp.get(erbium.COAP_TYPE_CON, common.TEST_URL_BASE + common.TEST_ENDPOINT, {
        mid: 0x1234,
        beforeSend: check1,
        beforeReceive: check2,
        success: function(inpkt, payload) {
            console.log('6 '+payload.toString());
            process.exit(0);
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


