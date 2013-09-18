console.log('TD_COAP_LINK_01 Access to well-known interface for resource discovery');

var common = require('./common.js');
erbium = require('node-erbium');
udpApp = common.udpBearer();
coapServerApp = common.server();
coapClientApp = common.client();

common.TEST_ENDPOINT = '/.well-known/core';

function check1(raw) {
    common.checkStep(2);
    var pkt = new erbium.Erbium(raw);
    if (pkt.getHeaderType() != 0)
        throw new Error('Wrong type');
    if (pkt.getHeaderStatusCode() != 1)
        throw new Error('Wrong code');
}

function check2(raw) {
    common.checkStep(3);
    var pkt = new erbium.Erbium(raw);
    if (pkt.getHeaderStatusCode() != 69)
        throw new Error('Wrong code');
    if (pkt.getHeaderContentType() != erbium.APPLICATION_LINK_FORMAT)
        throw new Error('Wrong type');
    if (pkt.getHeaderMID() != 0x1234)
        throw new Error('Wrong MID '+pkt.getHeaderMID());
}

coapServerApp.get('/discoverme', function(req, res) {
    res.setContentType('text/plain');
    res.send(erbium.CONTENT_2_05, 'I am discovered!');
}, {
    rt:'bob',
    title: "It's Bob!"
});

coapServerApp.get('/mystery', function(req, res) {
    res.setContentType('text/plain');
    res.send(erbium.CONTENT_2_05, '...');
}, {
    rt:'alice',
    title: "It's Alice!"
});

coapServerApp.get(common.TEST_ENDPOINT, function(req, res) {
    res.setContentType('application/linkformat');
    res.send(erbium.CONTENT_2_05, coapServerApp.getRD(req.query));
});

function stimulus1() {
    common.checkStep(1);
    coapClientApp.get(erbium.COAP_TYPE_CON, common.TEST_URL_BASE + common.TEST_ENDPOINT + '?rt=bob', {
        mid: 0x1234,
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


