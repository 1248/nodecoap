var common = require('../test/common.js');
erbium = require('node-erbium');
udpApp = common.udpBearer();
coapClientApp = common.client();

udpApp.start(5683, coapClientApp, undefined, function(err) {
    if (err) {
        console.log("Error: "+err);
        process.exit(1);
    }
    coapClientApp.put(erbium.COAP_TYPE_CON, "coap://10.0.1.120/light", {
        payload: process.argv[2],
        contentType: "text/plain",
        success: function(inpkt, payload) {
            console.log("Got: "+payload.toString());
            process.exit(0);
        },
        error: function(inpkt, payload) {
            console.log("Error");
            process.exit(1);
        }
    });

});


