/*
 *  WeMoMotion.js
 *
 *  David Janes
 *  IOTDB
 *  2015-03-01
 *
 *  NOTE: NOT TESTED
 */

var iotdb = require("iotdb");

exports.Model = iotdb.make_model('WeMoMotion')
    .facet(":sensor.motion")
    .product("http://www.belkin.com/us/p/P-F5Z0340/")
    .name("WeMo Motion")
    .description("Belkin WeMo Motion")
    .i("motion", iotdb.sensor.boolean.motion)
    .make();

exports.binding = {
    bridge: require('../WeMoBridge').Bridge,
    model: exports.Model,
    matchd: {
        'iot:vendor/type': 'urn:Belkin:device:sensor:1',
    },
    connectd: {
        subscribes: [
            'urn:Belkin:service:basicevent:1',
        ],

        data_in: function(paramd) {
            var valued = paramd.rawd['urn:Belkin:service:basicevent:1'];
            if (valued !== undefined) {
                if (valued.BinaryState === '1') {
                    paramd.cookd.motion = true;
                } else if (valued.BinaryState === '0') {
                    paramd.cookd.motion = false;
                }
            }
        },
    },
};
