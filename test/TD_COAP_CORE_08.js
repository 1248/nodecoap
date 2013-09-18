console.log('TD_COAP_CORE_08 Perform DELETE transaction (NON mode)');

var common = require('./common.js');
erbium = require('node-erbium');
udpApp = common.udpBearer();
coapServerApp = common.server();
coapClientApp = common.client();

function check1(raw) {
    console.log('2');
    var pkt = new erbium.Erbium(raw);
    if (pkt.getHeaderType() != 1)
        throw new Error('Wrong type');
    if (pkt.getHeaderStatusCode() != 4)
        throw new Error('Wrong code');
}

function check2(raw) {
    console.log('3');
    var pkt = new erbium.Erbium(raw);
    if (pkt.getHeaderType() != 1)
        throw new Error('Wrong type');
    if (pkt.getHeaderStatusCode() != 66)
        throw new Error('Wrong code '+pkt.getHeaderStatusCode());
}

coapServerApp.del(common.TEST_ENDPOINT, function(req, res) {
    res.setContentType('text/plain');
    res.send(erbium.DELETED_2_02, "You deleted");
});

function stimulus1() {
    console.log('1');
    coapClientApp.del(erbium.COAP_TYPE_NON, common.TEST_URL_BASE + common.TEST_ENDPOINT, {
        beforeSend: check1,
        beforeReceive: check2,
        success: function(inpkt, payload) {
            console.log('4 '+payload.toString());
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


