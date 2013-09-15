//http://tools.ietf.org/html/draft-ietf-core-coap-18#section-12.2
exports.COAP_OPTION_IF_MATCH = 1;
exports.COAP_OPTION_URI_HOST = 3;
exports.COAP_OPTION_ETAG = 4;
exports.COAP_OPTION_IF_NONE_MATCH = 5;
exports.COAP_OPTION_URI_PORT = 7;
exports.COAP_OPTION_LOCATION_PATH = 8;
exports.COAP_OPTION_URI_PATH = 11;
exports.COAP_OPTION_CONTENT_FORMAT = 12;
exports.COAP_OPTION_MAX_AGE = 14;
exports.COAP_OPTION_URI_QUERY = 15;
exports.COAP_OPTION_ACCEPT = 17;
exports.COAP_OPTION_LOCATION_QUERY = 20;
exports.COAP_OPTION_PROXY_URI = 35;
exports.COAP_OPTION_PROXY_SCHEME = 39;

//http://tools.ietf.org/html/draft-ietf-core-coap-18#section-12.1.1
exports.COAP_METHOD_GET = 1;
exports.COAP_METHOD_POST = 2;
exports.COAP_METHOD_PUT = 3;
exports.COAP_METHOD_DELETE = 4;

exports.methodToString = function(code) {
    switch(code) {
        case exports.COAP_METHOD_GET: return 'get';
        case exports.COAP_METHOD_POST: return 'post';
        case exports.COAP_METHOD_PUT: return 'put';
        case exports.COAP_METHOD_DELETE: return 'del';
    }
    return null;
};

//http://tools.ietf.org/html/draft-ietf-core-coap-18#section-12.1.1
exports.COAP_TYPE_CON = 0;
exports.COAP_TYPE_NONCON = 1;
exports.COAP_TYPE_ACK = 2;
exports.COAP_TYPE_RESET = 3;

//http://tools.ietf.org/html/draft-ietf-core-coap-18#section-5.2
//http://tools.ietf.org/html/draft-ietf-core-coap-18#section-12.1.2
function MAKE_RSPCODE(clas, det) { return ((clas << 5) | (det)); }
exports.COAP_RSPCODE_CONTENT = MAKE_RSPCODE(2, 5);
exports.COAP_RSPCODE_NOT_FOUND = MAKE_RSPCODE(4, 4);
exports.COAP_RSPCODE_METHOD_NOT_ALLOWED = MAKE_RSPCODE(4, 5);
exports.codeClass = function(code) {
    return (code & 0xE0) >> 5;
}

//http://tools.ietf.org/html/draft-ietf-core-coap-18#section-12.3
exports.COAP_CONTENTTYPE_TEXT_PLAIN = 0;
exports.COAP_CONTENTTYPE_APPLICATION_LINKFORMAT = 40;

///////////////////////


function coap_parseHeader(pkt) {
    var hdr = {};
    if (pkt.raw.length < 4)
        return new Error("COAP_ERR_HEADER_TOO_SHORT");
    hdr.ver = (pkt.raw[0] & 0xC0) >> 6;
    if (hdr.ver != 1)
        return new Error("COAP_ERR_VERSION_NOT_1");
    hdr.t = (pkt.raw[0] & 0x30) >> 4;
    hdr.tkl = pkt.raw[0] & 0x0F;
    hdr.code = pkt.raw[1];
    hdr.id = (pkt.raw[2] << 8) | pkt.raw[3];
    return hdr;
}

function coap_parseToken(pkt) {
    if (pkt.hdr.tkl === 0)
        return null;
    else
    if (pk.thdr.tkl <= 8) {
        if (4 + pkt.hdr.tkl > pkt.raw.length)
            return new Error("COAP_ERR_TOKEN_TOO_SHORT");   // tok bigger than packet
        return pkt.raw.slice(4, 4 + pkt.hdr.tkl);   // from header
    }
    else
    return new Error("COAP_ERR_TOKEN_TOO_SHORT");
}

function coap_parseOption(pkt, parser_state, buflen) {
    var len;
    var delta;
    var opt = {};

    if (buflen < 1) // too small
        return new Error(COAP_ERR_OPTION_TOO_SHORT_FOR_HEADER);

    delta = (pkt.raw[parser_state.p + 0] & 0xF0) >> 4;
    len = pkt.raw[parser_state.p + 0] & 0x0F;

    // These are untested and may be buggy
    if (len == 13) {
        if (buflen < 2)
            return new Error("COAP_ERR_OPTION_TOO_SHORT_FOR_HEADER");
        delta = pkt.raw[parser_state.p + 1] + 13;
        parser_state.p++;
    }
    else
    if (len == 14) {
        if (buflen < 3)
            return new Error("COAP_ERR_OPTION_TOO_SHORT_FOR_HEADER");
        delta = ((pkt.raw[parser_state.p + 1] << 8) | pkt.raw[parser_state.p + 2]) + 269;
        parser_state.p += 2;
    }
    else
    if (len == 15)
        return new Error("COAP_ERR_OPTION_LEN_INVALID");
    else
    if (len > 12)
        return new Error("COAP_ERR_OPTION_TOO_BIG");

    if ((1 + len) > buflen)
        return new Error("COAP_ERR_OPTION_TOO_BIG");

    opt.num = delta + parser_state.delta;
    opt.buf = pkt.raw.slice(parser_state.p+1, parser_state.p+1+len);

    // advance
    parser_state.p += 1 + len;
    parser_state.delta += delta;
    return opt;
}

// http://tools.ietf.org/html/draft-ietf-core-coap-18#section-3.1
function coap_parseOptions(pkt, parser_state) {
    var opts = [];
    parser_state.delta = 0;
    parser_state.p = 4 + pkt.hdr.tkl;

    if (parser_state.p > pkt.raw.length)
        return new Error("COAP_ERR_OPTION_OVERRUNS_PACKET");   // out of bounds
    
    // 0xFF is payload marker
    while((parser_state.p < pkt.raw.length) && (pkt.raw[parser_state.p] != 0xFF))
    {
        var opt;
        if ((opt = coap_parseOption(pkt, parser_state, pkt.raw.length - parser_state.p)) instanceof Error)
            return opt;
        opts.push(opt);
    }
    return opts;
}

function coap_parsePayload(pkt, parser_state) {
    if (parser_state.p+1 < pkt.raw.length && pkt.raw[parser_state.p] == 0xFF)  // payload marker
        return pkt.raw.slice(parser_state.p+1, pkt.raw.length);
    else
        return null;
}

exports.parse = function(msg) {
    var pkt = {};
    var parser_state = {};
    pkt.raw = new Buffer(msg);  // take a copy
    if ((pkt.hdr = coap_parseHeader(pkt)) instanceof Error)
        return pkt.hdr;
    if ((pkt.tok = coap_parseToken(pkt)) instanceof Error)
        return pkt.tok;
    if ((pkt.opts = coap_parseOptions(pkt, parser_state)) instanceof Error)
        return pkt.opts;
    if ((pkt.payload = coap_parsePayload(pkt, parser_state)) instanceof Error)
        return pkt.payload;
    return pkt;
};

exports.make_response = function(payload, msgid, rspcode, content_type) {
    var pkt = { hdr:{}, opts:[] };
    pkt.hdr.ver = 0x01;
    pkt.hdr.t = exports.COAP_TYPE_ACK;
    pkt.hdr.tkl = 0;
    pkt.hdr.code = rspcode;
    pkt.hdr.id = msgid;

    if (content_type !== null) {
        var opt = {
            num: exports.COAP_OPTION_CONTENT_FORMAT,
            buf: new Buffer([(content_type & 0xFF00) >> 8, (content_type & 0x00FF)])
        };
        pkt.opts.push(opt);
    }

    if (typeof payload === 'string')
        pkt.payload = new Buffer(payload);
    else
        pkt.payload = payload;
    return pkt;
};

exports.make_request = function(reqcode, msgid, tok) { // bare
    var pkt = { hdr:{}, opts:[] };
    pkt.hdr.ver = 0x01;
    pkt.hdr.t = exports.COAP_TYPE_CON;
    pkt.hdr.tkl = 0;
    pkt.hdr.code = reqcode;
    pkt.hdr.id = msgid;
    return pkt;
};

exports.build = function(pkt) {
    var opts_len = 0;
    var i;
    var p;
    var running_delta = 0;
    var buf = [];
    var x;

    // build header
    buf[0] = (pkt.hdr.ver & 0x03) << 6;
    buf[0] |= (pkt.hdr.t & 0x03) << 4;
    buf[0] |= (pkt.hdr.tkl & 0x0F);

    buf[1] = pkt.hdr.code;

    buf[2] = (pkt.hdr.id & 0xFF00) >> 8;
    buf[3] = (pkt.hdr.id & 0x00FF);

    // inject options
    p = 4;
    for (i=0;i<pkt.opts.length;i++)
    {
        var delta;
        delta = pkt.opts[i].num - running_delta;
        if (delta > 12)
            return new Error("COAP_ERR_UNSUPPORTED");    // FIXME
        if (pkt.opts[i].buf.len > 12)
            return new Error("COAP_ERR_UNSUPPORTED");    // FIXME
        buf[p] = (delta << 4) | (pkt.opts[i].buf.length & 0x0F);
        p++;
        //FIXME
//        memcpy(p, pkt.opts[i].buf.p, pkt.opts[i].buf.len);
        for (x=0;x<pkt.opts[i].buf.length;x++) {
            buf[p+x] = pkt.opts[i].buf[x];
        }
        p += pkt.opts[i].buf.length;
        running_delta = delta;
    }
    opts_len = p - 4;   // number of bytes used by options

    if (pkt.payload !== null && pkt.payload !== undefined) {
        buf[4 + opts_len] = 0xFF;  // payload marker
        //FIXME
        //memcpy(buf+5 + opts_len, pkt.payload.p, pkt.payload.len);
        for (x=0;x<pkt.payload.length;x++) {
            buf[5 + opts_len + x] = pkt.payload[x];
        }
    }
    pkt.raw = new Buffer(buf);
    return pkt.raw;
};

exports.findOptions = function(pkt, num) {
    var opts = [];
    // FIXME, can do this better, as options are sorted
    for (var i=0;i<pkt.opts.length;i++) {
        if (pkt.opts[i].num == num)
            opts.push(pkt.opts[i].buf);
    }
    return opts;
};


exports.addOption = function(pkt, num, val) {
    switch(num) {
        case exports.COAP_OPTION_CONTENT_FORMAT:
            pkt.opts.push({
                num: num,
                buf: new Buffer([(val & 0xFF00) >> 8, (val & 0x00FF)])
            });
        break;
        default:
            pkt.opts.push({
                num: num,
                buf: new Buffer(val)
            });
        break;
    }
};
