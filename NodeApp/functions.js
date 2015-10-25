
"use strict";

var mqtt = require('mqtt');
var path = require('path');
var bunyan = require('bunyan');



var logger = bunyan.createLogger({name:'EMProyect'});
var prefix = 'Home';
var client;
var topic_model = "Home/+/model";
var jsonModel = '{"Nodos":[]}';

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
			callback (topic, message);
		});
		
		
}

function main (){
	
	client.subscribe(topic_model, function () {
        /* maybe reset _subscribed on mqtt.open? */

		logger.info({
			method: "checkStatus",
			info: "suscribed to:",
			topic: topic_model
		});
		
	});

	client.on('message', function (topic_aux, message) {
		var topic_str = topic_aux.toString();
		topic_aux = topic_aux.substring(1);
		var nodo = topic_aux.substring(topic_aux.indexOf('/') + 1, topic_aux.lastIndexOf('/'));
		var channel = topic_aux.substring(topic_aux.lastIndexOf('/') + 1 );
		
		if (channel == "model"){
		
		var model = JSON.parse(message.toString());

		var nodo_obj = '{"';
		nodo_obj = nodo_obj.concat(nodo);
		nodo_obj = nodo_obj.concat('":[]}');
		
		var nodo_obj_json = JSON.parse(nodo_obj);
		nodo_obj_json[nodo].push(model);
		nodo_obj = JSON.stringify(nodo_obj_json);
		console.log(nodo_obj_json["nodomcu"].tmp);	
		
		var obj = JSON.parse(jsonModel);
		obj['Nodos'].push(nodo_obj);
		jsonModel = JSON.stringify(obj);
		console.log(jsonModel);
		}

		obj = JSON.parse(jsonModel);
		console.log(obj.Nodos.nodomcu);

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

exports.main = main;
exports.newConection = newConection;
exports.checkStatus = checkStatus;
exports.updateStatus =updateStatus;