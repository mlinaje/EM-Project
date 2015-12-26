
"use strict";

var mqtt = require('mqtt');
var path = require('path');
var bunyan = require('bunyan');
var exec = require('child_process').exec,
child;

var logger = bunyan.createLogger({name:'EMProyect'});
var prefix = 'Home';
var nodeID = "nodo_1_1"
var client;
var topic_ctrl = "Home/nodo_central/ctrl";
var topic_model_req = "Home/nodo_1_1/model_req";
var topic_request = "Home/nodo_1_1/request";
var topic_reply = "Home/nodo_1_1/reply";
var topic_model = "Home/nodo_1_1/model";
var model_stg = "{\"mem\":\"Kb\",\"proc\":\"noUnit\",\"batt\":\"mV\"}";


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


function main_callback (){
	client.subscribe(topic_ctrl);
	client.subscribe(topic_model_req);
	client.subscribe(topic_request);
	client.publish(topic_model, model_stg);
	
	client.on('message', function (topic_aux, message) {
		
		var nodos = [];
		var topic_str = topic_aux.toString();
		topic_aux = topic_aux.substring(1);
		var nodo = topic_aux.substring(topic_aux.indexOf('/') + 1, topic_aux.lastIndexOf('/'));
		var channel = topic_aux.substring(topic_aux.lastIndexOf('/') + 1 );
		
		if (channel == "ctrl"){

		var msg = JSON.parse(message.toString());
		if (msg.nodo == nodeID){
			if (msg.op == "sub"){
				client.subscribe("Home/storage");
			}
			else{
				if (msg.op == "unsub"){
					client.unsubscribe("Home/storage");
				}
			}
		}
			
		}
		
		if (channel == "request"){
			
			client.publish(topic_reply, message);
		}
		
		if (channel == "model_req"){
			
			client.publish(topic_model, model_stg);
		}
	});

}




function updateStatus (channel, nodeID, message){
	var topic = path.join(prefix, nodeID, channel);
	client.publish(topic, message);
	
	
}



function main_loop(){
	var interval = setInterval(function() {
		var memTotal;
		//check temperatura y humedad
		//updateStatus("istate", nodeID, "")
		//check metadatos
		updateStatus("meta", nodeID, "{\"mem\":\"989\",\"proc\":\"1000\",\"batt\":\"1352\"}")
	
		  // Function for checking memory
    child = exec("egrep --color 'MemTotal' /proc/meminfo | egrep '[0-9.]{4,}' -o", function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    } else {
      memTotal = stdout;
      console.log(memTotal);
    }
  });
	
	
	}, 5000);
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

exports.main_loop = main_loop;
exports.main_callback = main_callback;
exports.newConection = newConection;
