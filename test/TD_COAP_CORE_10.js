console.log('TD_COAP_CORE_10 Handle request containing Token option');

var common = require('./common.js');
erbium = require('node-erbium');
udpApp = common.udpBearer();
coapServerApp = common.server();
coapClientApp = common.client();

function check1(raw) {
    common.checkStep(2);
    var pkt = new erbium.Erbium(raw);
    if (pkt.getHeaderType() != 0)
        throw new Error('Wrong type');
    if (pkt.getHeaderStatusCode() != 1)
        throw new Error('Wrong code');
    if (pkt.getHeaderToken().length < 1 || pkt.getHeaderToken().length > 8)
        throw new Error('Wrong token size');
}

function check2(raw) {
    common.checkStep(3);
    var pkt = new erbium.Erbium(raw);
    if (pkt.getHeaderStatusCode() != 69)
        throw new Error('Wrong code');
    if (pkt.getHeaderToken().length < 1 || pkt.getHeaderToken().length > 8)
        throw new Error('Wrong token size');
    if (pkt.getHeaderToken().toString() !== 'myToken')
        throw new Error('Wrong token');
    if (pkt.getHeaderContentType() != erbium.TEXT_PLAIN)
        throw new Error('Wrong type');
    if (pkt.getPayload().length === 0)
        throw new Error('Bad payload');
}

coapServerApp.get(common.TEST_ENDPOINT, function(req, res) {
    res.setContentType('text/plain');
    res.send(erbium.CONTENT_2_05, 'Hello world');
});

function stimulus1() {
    common.checkStep(1);
    coapClientApp.get(erbium.COAP_TYPE_CON, common.TEST_URL_BASE + common.TEST_ENDPOINT, {
        token: "myToken",
        beforeSend: check1,
        beforeReceive: check2,
        success: function(inpkt, payload) {
            common.checkStep(4);
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


