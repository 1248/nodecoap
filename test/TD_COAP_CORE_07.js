console.log('TD_COAP_CORE_07 Perform PUT transaction (NON mode)');

var common = require('./common.js');
erbium = require('node-erbium');
udpApp = common.udpBearer();
coapServerApp = common.server();
coapClientApp = common.client();

function check1(raw) {
    common.checkStep(2);
    var pkt = new erbium.Erbium(raw);
    if (pkt.getHeaderType() != 1)
        throw new Error('Wrong type');
    if (pkt.getHeaderStatusCode() != 3)
        throw new Error('Wrong code');
}

function check2(raw) {
    common.checkStep(4);
    var pkt = new erbium.Erbium(raw);
    if (pkt.getHeaderStatusCode() != 68)
        throw new Error('Wrong code '+pkt.getHeaderStatusCode());
    if (pkt.getHeaderType() != 1)
        throw new Error('Wrong type');
    if (pkt.getHeaderContentType() != erbium.TEXT_PLAIN)
        throw new Error('Wrong type');
}

coapServerApp.put(common.TEST_ENDPOINT, function(req, res) {
    common.checkStep(3);
    console.log(req.payload.toString());
    res.setContentType('text/plain');
    res.send(erbium.CHANGED_2_04, req.payload);
});

function stimulus1() {
    common.checkStep(1);
    coapClientApp.put(erbium.COAP_TYPE_NON, common.TEST_URL_BASE + common.TEST_ENDPOINT, {
        payload: "Hello world",
        contentType: "text/plain",
        beforeSend: check1,
        beforeReceive: check2,
        success: function(inpkt, payload) {
            common.checkStep(5);
            console.log(payload.toString());
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


