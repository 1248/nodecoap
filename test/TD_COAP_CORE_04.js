console.log('TD_COAP_CORE_04 Perform DELETE transaction (CON mode)');

var common = require('./common.js');
erbium = require('node-erbium');
udpApp = common.udpBearer();
coapServerApp = common.server();
coapClientApp = common.client();

function check1(raw) {
    console.log('2');
    var pkt = new erbium.Erbium(raw);
    if (pkt.getHeaderType() != 0)
        throw new Error('Wrong type');
    if (pkt.getHeaderStatusCode() != 4)
        throw new Error('Wrong code');
}

function check2(raw) {
    console.log('3');
    var pkt = new erbium.Erbium(raw);
    if (pkt.getHeaderStatusCode() != 66)
        throw new Error('Wrong code '+pkt.getHeaderStatusCode());
    if (pkt.getHeaderMID() != 0x1234)
        throw new Error('Wrong MID '+pkt.getHeaderMID());
}

coapServerApp.del(common.TEST_ENDPOINT, function(req, res) {
    console.log('3');
    res.setContentType('text/plain');
    res.send(erbium.DELETED_2_02, "You deleted");
});

function stimulus1() {
    console.log('1');
    coapClientApp.del(erbium.COAP_TYPE_CON, common.TEST_URL_BASE + common.TEST_ENDPOINT, {
        mid: 0x1234,
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


