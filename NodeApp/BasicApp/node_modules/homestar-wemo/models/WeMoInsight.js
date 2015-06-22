/*
 *  WeMoInsight.js
 *
 *  David Janes
 *  IOTDB
 *  2014-03-01
 *
 *  NOT TESTED
 */

var iotdb = require("iotdb");
var _ = iotdb._;

exports.Model = iotdb.make_model('WeMoInsight')
    .facet(":plug")
    .facet(":switch")
    .facet(":sensor")
    .product("http://www.belkin.com/us/support-product?pid=01t80000003JS3FAAW")
    .name("WeMo Insight")
    .description("Belkin WeMo Insight")
    .io("on", iotdb.boolean.on)
    .i("today-power", iotdb.number, {
        "iot:unit": "iot-unit:energy.si.joule",
    })
    .i("total-power", iotdb.number, {
        "iot:unit": "iot-unit:energy.si.joule",
    })
    .i("today-uptime", iotdb.integer, {
        "iot:unit": "iot-unit:time.si.second",
    })
    .i("total-uptime", iotdb.integer, {
        "iot:unit": "iot-unit:time.si.second",
    })
    .make();

exports.binding = {
    bridge: require('../WeMoBridge').Bridge,
    model: exports.Model,
    matchd: {
        'iot:vendor/type': 'urn:Belkin:device:insight:1',
        'iot:vendor/model': 'Insight',
    },
    connectd: {
        subscribes: [
            'urn:Belkin:service:basicevent:1',
        ],

        data_in: function(paramd) {
            var valued = paramd.rawd['urn:Belkin:service:basicevent:1'];
            if (valued !== undefined) {
                var state = valued.BinaryState;
                if (state !== undefined) {
                    parts = state.split("|")
                    parts = _.map(parts, function(part) {
                        try {
                            return parseInt(part);
                        } catch (x) {
                            return part;
                        }
                    });

                    var names = [
                        "on", // State
                        "", // Seconds Since 1970 of Last State Change
                        "", // Last On Seconds
                        "today-uptime", // Seconds On Today
                        "", // Unknown – Unit is Seconds
                        "total-uptime", // Total Seconds
                        "", // Unknown – Units are Watts
                        "today-power", // Energy Used Today in mW * minutes
                        "total-power", // Energy Used Total in mW * minutes
                        "", // Unknown
                    ];

                    var d = _.object(names, parts);

                    /* - boolean */
                    if (d["on"] !== undefined) {
                        paramd.cookd.on = d["on"] ? true : false;
                    }

                    /* time in seconds - as is */
                    if (d["today-uptime"] !== undefined) {
                        paramd.cookd.on = d["today-uptime"];
                    }
                    if (d["total-uptime"] !== undefined) {
                        paramd.cookd.on = d["total-uptime"];
                    }

                    /* mW*m -> joules */
                    if (d["today-power"] !== undefined) {
                        paramd.cookd.on = d["today-power"] / 1000.0 * 60.0;
                    }
                    if (d["total-power"] !== undefined) {
                        paramd.cookd.on = d["total-power"] / 1000.0 * 60.0;
                    }
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
