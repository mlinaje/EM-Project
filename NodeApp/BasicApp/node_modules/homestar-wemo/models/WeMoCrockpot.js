/*
 *  WeMoCrockpot.js
 *
 *  David Janes
 *  IOTDB
 *  2014-03-01
 *
 *  NOT TESTED
 */

var iotdb = require("iotdb");

exports.Model = iotdb.make_model('WeMoCrockpot')
    .product("http://www.belkin.com/us/support-product?pid=01t80000003ddEuAAI")
    .name("WeMo Crockpot")
    .description("Belkin WeMo Crockpot")
    .io("on", iotdb.boolean.on)
    .make();

exports.binding = {
    bridge: require('../WeMoBridge').Bridge,
    model: exports.Model,
    matchd: {
        'iot:vendor/type': 'urn:Belkin:device:crockpot:1',
    },
    connectd: {
        subscribes: [
            'urn:Belkin:service:basicevent:1',
        ],

        data_in: function(paramd) {
            var valued = paramd.rawd['urn:Belkin:service:basicevent:1'];
            if (valued !== undefined) {
                if (valued.BinaryState === '1') {
                    paramd.cookd.on = true;
                } else if (valued.BinaryState === '0') {
                    paramd.cookd.on = false;
                }
            }
        },

        data_out: function(paramd) {
            if (paramd.cookd.on !== undefined) {
                paramd.rawd['urn:Belkin:service:basicevent:1'] = {
                    'SetBinaryState': {
                        'BinaryState': paramd.cookd.on ? 1 : 0
                    },
                };
            }
        },
    },
};
