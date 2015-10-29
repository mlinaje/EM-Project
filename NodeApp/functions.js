
"use strict";

var mqtt = require('mqtt');
var path = require('path');
var bunyan = require('bunyan');



var logger = bunyan.createLogger({name:'EMProyect'});
var prefix = 'Home';
var client;
var topic_model = "Home/+/model";
var NodosModel = [];
var nodos = [];

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
		var nodo_obj = '';

		nodo_obj = '{"';
		nodo_obj = nodo_obj.concat(nodo);
		nodo_obj = nodo_obj.concat('":');
		nodo_obj = nodo_obj.concat(message.toString());
		nodo_obj = nodo_obj.concat('}');
		


		if(NodosModel.length == 0){
			NodosModel.push(nodo_obj);
		}

		console.log(NodosModel.length);
		
		for (var i = 0; i<NodosModel.length; i++){
			var obj = JSON.parse(NodosModel[i]);
			var nodo_aux = Object.keys(obj)[0];
			nodos.push(nodo_aux);
		}
		console.log(nodos);
		
		if (nodos.indexOf(nodo) != -1){
			console.log(nodos.indexOf(nodo));
			NodosModel[nodos.indexOf(nodo)] = nodo_obj;
		}else{
			NodosModel.push(nodo_obj);			
		}
		
		nodos = [];
		console.log(NodosModel);
		// if (obj["Nodos"][nodo] == undefined){
			// console.log("Indefinido");
			// jsonModel = JSON.stringify(obj);
		// }else{
			// console.log("Definido");
			// }	
		
		//jsonModel = JSON.stringify(obj);
		// var string_prueba = obj['Nodos'][0];
		// console.log(string_prueba);
		// obj['Nodos'].push(JSON.parse(nodo_obj));
		// jsonModel = JSON.stringify(obj);
		 // jsonModel = jsonModel.replace('[','');
		 // jsonModel = jsonModel.replace(']','');
		// console.log(jsonModel);
		


		
		}
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