
"use strict";

var mqtt = require('mqtt');
var path = require('path');
var bunyan = require('bunyan');





var logger = bunyan.createLogger({name:'EMProyect'});
var prefix = 'Home';
var client;

function newConection (port, host, keepalive) {
		
		
	client = mqtt.connect({ port: port, host: host, keepalive: keepalive});

	
	client.on('error', function () {
        logger.error({
            method: "connect(error)",
            arguments: arguments,
            cause: "likely MQTT issue - will automatically reconnect soon",
        }, "unexpected error");
    });
    client.on('close', function () {
        logger.error({
            method: "connect(close)",
            arguments: arguments,
            cause: "likely MQTT issue - will automatically reconnect soon",
        }, "unexpected close");
    });
	

}

function checkStatus (channel, nodeID, callback){
	
	var topic = path.join(prefix, nodeID, channel);
	
		client.subscribe(topic, function () {
            /* maybe reset _subscribed on mqtt.open? */

            logger.info({
                method: "checkStatus",
                info: "suscribed to:",
                topic: topic
            });


        });
	
		client.on('message', function (topic, message) {
			callback (message);
		});
		
		
}

function updateStatus (channel, nodeID, message){
	var topic = path.join(prefix, nodeID, channel);
	client.publish(topic, message, function(){
		
		logger.info ({
			method: "updateStatus",
			info: "published message",
			message: message,
			topic: topic
		});
	});
	
	
}

exports.newConection = newConection;
exports.checkStatus = checkStatus;
exports.updateStatus =updateStatus;