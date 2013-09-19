console.log('TD_COAP_OBS_02 Stop resource observation');

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
    if (pkt.getHeaderObserve() != 0)
        throw new Error('Wrong observe');
}

var firstTimeA = true;
function check2(raw) {
    if (firstTimeA) {
        firstTimeA = false;
        common.checkStep(3);
        var pkt = new erbium.Erbium(raw);
        if (pkt.getHeaderStatusCode() != 69)
            throw new Error('Wrong code');
        if (pkt.getHeaderContentType() != erbium.TEXT_PLAIN)
            throw new Error('Wrong type');
        if (pkt.getHeaderMID() != 0x1234)
            throw new Error('Wrong MID '+pkt.getHeaderMID());
        if (pkt.getHeaderObserve() != 0)
            throw new Error('Wrong observe');
    } else {
        firstTimeA = false;
        common.checkStep(5);
        var pkt = new erbium.Erbium(raw);
        if (pkt.getHeaderStatusCode() != 69)
            throw new Error('Wrong code');
        if (pkt.getHeaderContentType() != erbium.TEXT_PLAIN)
            throw new Error('Wrong type');
        if (pkt.getHeaderMID() != 0x1234)
            throw new Error('Wrong MID '+pkt.getHeaderMID());
        if (pkt.getHeaderObserve() != 1)
            throw new Error('Wrong observe');
    }
}

coapServerApp.get(common.TEST_ENDPOINT, function(req, res) {
    var x = 0;
    var t;
    res.setContentType('text/plain');

    res.onReset(function() {
        console.log("SERVER was told to stop");
        process.exit(0);
    });

    res.send(erbium.CONTENT_2_05, 'INITIAL Hello world '+x);
    t = setInterval(function() {
        x++;
        res.send(erbium.CONTENT_2_05, 'Hello world '+x);
        if (x == 3) {
            clearInterval(t);
            res.close();    // promise not to send any more
        }
    }, 1000);
});

function stimulus1() {
    common.checkStep(1);
    var firstTimeB = true;
    coapClientApp.get(erbium.COAP_TYPE_CON, common.TEST_URL_BASE + common.TEST_ENDPOINT, {
        observe: true,
        mid: 0x1234,
//        beforeSend: check1,
//        beforeReceive: check2,
        success: function(inpkt, payload) {
            if (firstTimeB) {
                firstTimeB = false;
//                common.checkStep(4);
                console.log(payload.toString());
            } else {
//                common.checkStep(6);
                console.log(payload.toString());
//                process.exit(0);
                return false;   // send an RST
            }
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


