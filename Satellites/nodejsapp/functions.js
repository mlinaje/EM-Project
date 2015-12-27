
"use strict";

var mqtt = require('mqtt');
var path = require('path');
var bunyan = require('bunyan');
var MongoClient = require('mongodb').MongoClient;
var exec = require('child_process').exec,
child, child1;

var logger = bunyan.createLogger({name:'EMProyect'});
var prefix = 'Home';
var nodeID = "nodo_1_1"
var proc = 1000;
var client;
var topic_ctrl = "Home/nodo_central/ctrl";
var topic_model_req = "Home/nodo_1_1/model_req";
var topic_request = "Home/nodo_1_1/request";
var topic_reply = "Home/nodo_1_1/reply";
var topic_model = "Home/nodo_1_1/model";
var model_stg = "{\"mem\":\"Kb\",\"proc\":\"noUnit\",\"freeRAM\":\"kb\"}";

var free_stg;
var memFree;


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
	
	// Connect to the db
	MongoClient.connect("mongodb://localhost:27017/test", function(err, db) {
	  if(!err) {
		console.log("We are connected");
	  }
	});
	
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

function checkMetadata(){

	var metadata = '';

    metadata = '{"mem":"';
	metadata = metadata.concat(free_stg);
	metadata = metadata.concat('","proc":"');
	metadata = metadata.concat(proc);
	metadata = metadata.concat('","freeRAM":"');
	metadata = metadata.concat(memFree);
	metadata = metadata.concat('"}');
	
	return metadata;
}
function check_mem (){
	var interval = setInterval (function(){
		var max_stg = 1048576; // 1G en kb
		var stg;
		
		child1 = exec("du -s | tail -n 1 | awk '{print $1}'", function (error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		} else {
			stg = stdout;
			free_stg = max_stg - stg;			
		}
	  });  	 
	  
	},1000);
	
}	
function check_ram (){
	var interval = setInterval (function(){
		
		child = exec("egrep 'MemFree' /proc/meminfo | awk '{print $2}'", function (error, stdout, stderr) {
		if (error !== null) {
		console.log('exec error: ' + error);
		} else {
		memFree = parseInt(stdout);
		
		}
	  });	 
		  
	},1000);	
}
function main_loop(){
	var interval = setInterval(function() {
		//check temperatura y humedad
		//updateStatus("istate", nodeID, "")
		//check metadatos
		updateStatus("meta", nodeID, checkMetadata());
		
	}, 5000);
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

exports.main_loop = main_loop;
exports.check_ram = check_ram;
exports.check_mem = check_mem;
exports.main_callback = main_callback;
exports.newConection = newConection;
