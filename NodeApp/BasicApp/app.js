/*
 *  app.js
 *
 */
//var iotdbTransportMqtt = require('iotdb-transport-mqtt');
//var Transport = iotdbTransportMqtt.MQTTTransport;
var Transport = require('iotdb-transport-mqtt/MQTTTransport').MQTTTransport;

var transport = new Transport({
    //host: "mqtt.iotdb.org",
    host: "127.0.0.1",
    prefix: 'mqtt-transport',
});
transport.updated({
    id: "MyThingID", 
    band: "meta", 
}, function(ud) {
    console.log(ud.value);
    if (ud.value === undefined) {
        transport.get(ud, function(gd) {
            console.log("+", gd.id, gd.band, gd.value);
        });
    } else {
        console.log("+", ud.id, ud.band, ud.value);
    }
});
