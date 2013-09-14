var coap = require('./coap');
var server = require('./server');
var app = server();

var PORT = 5683;

app.get('/hello', function(req, res) {
    console.log(req.path);
    res.addOption(coap.COAP_OPTION_CONTENT_FORMAT, coap.COAP_CONTENTTYPE_TEXT_PLAIN);
    res.send(coap.COAP_RSPCODE_CONTENT, "hello");
});

console.log(app);

app.start(PORT);    // FIXME, replace with UDP bearer code


