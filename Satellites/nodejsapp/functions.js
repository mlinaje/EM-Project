
"use strict";

var mqtt = require('mqtt');
var path = require('path');
var bunyan = require('bunyan');
var MongoClient = require('mongodb').MongoClient;
var exec = require('child_process').exec,
child, child1;

var logger = bunyan.createLogger({name:'EMProyect'});
var prefix = 'Home';
var nodeID = "11"
var proc = 1000;
var client;
var topic_ctrl = "Home/nodo_central/ctrl";
var topic_model_req = "Home/11/model_req";
var topic_request = "Home/11/request";
var topic_reply = "Home/11/reply";
var topic_model = "Home/11/model";
var model_stg = "{\"nodo\":\"11\",\"mem\":\"Kb\",\"proc\":\"noUnit\",\"timestamp\":\"s\",\"cpu_usage\":\"%\",\"swap\":\"Kb\",\"loadavg\":\"noUnit\",\"batt\":\"noUnit\",\"power\":\"noUnit\",\"freeRAM\":\"Kb\"}";


var free_stg;
var memFree;
var swapcached;
var timestamp;
var loadaverage;
var cpu_usage;


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
	check_ram();
	check_mem();
	check_swap();
	check_loadaverage();
	check_timestamp();
	check_cpu();
	
	client.on('message', function (topic_aux, message) {
		
		var nodos = [];
		var topic_str = topic_aux.toString();
		var nodo = topic_aux.substring(topic_aux.indexOf('/') + 1, topic_aux.lastIndexOf('/'));
		var channel = topic_aux.substring(topic_aux.lastIndexOf('/') + 1 );
		
		if (channel == "ctrl"){
		var msg = JSON.parse(message.toString());		
		if (msg.nodo == nodeID){
			if (msg.op == "sub"){
			client.subscribe({"Home/+/istate" : 1});
			}
			else{
				if (msg.op == "unsub"){
					client.unsubscribe("Home/+/istate");
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
		
		if (channel == "istate"){
			//Connect to the db
			MongoClient.connect("mongodb://localhost:27017/nodo_1_1_db", function(err, db) {
			  if(err) { return console.dir(err); }
				var obj = JSON.parse(message.toString());
				if (obj.nodo == undefined){
					var document= "meta_";
					document = document.concat(nodo);
					//insert document
					db.collection(document).insert(obj);		
				}else{
					var document= "model_";
					document = document.concat(nodo);
					var milis = new Date().getTime();
					obj["time"] = milis;
					db.collection(document).insert(obj);				
				}
				db.close();
			});
			
		}
	});

}




function updateStatus (channel, nodeID, message, _qos){
	var topic = path.join(prefix, nodeID, channel);
	client.publish(topic, message, {qos:_qos});
	
	
}


function checkMetadata(){

	var metadata = '';

    metadata = '{"mem":"';
	metadata = metadata.concat(free_stg);
	metadata = metadata.concat('","proc":"');
	metadata = metadata.concat(proc);
	metadata = metadata.concat('","batt":"-1","power":"1","freeRAM":"');
	metadata = metadata.concat(memFree);
	metadata = metadata.concat('"}');
	
	return metadata;
}


function checkResources(){
	var resources = '';
	    resources = '{"timestamp":"';
		resources = resources.concat(timestamp);
		resources = resources.concat('","cpu_usage":"');
		resources = resources.concat(cpu_usage);
		resources = resources.concat('","mem":"');
		resources = resources.concat(free_stg);
		resources = resources.concat('","swap":"');
		resources = resources.concat(swapcached);
		resources = resources.concat('","loadavg":"');
		resources = resources.concat(loadaverage);
		resources = resources.concat('","freeRAM":"');
		resources = resources.concat(memFree);
		resources = resources.concat('"}');
		
		return resources;
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

function check_cpu (){
	var interval = setInterval (function(){
		var max_stg = 1048576; // 1G en kb
		var stg;
		
		child1 = exec("grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'", function (error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		} else {
			cpu_usage = parseFloat(stdout);		
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

function check_swap (){
	var interval = setInterval (function(){
		
		child = exec("egrep 'SwapCached' /proc/meminfo | awk '{print $2}'", function (error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		} else {
			swapcached = parseFloat(stdout);
		
		}
	  });	 
		  
	},1000);	
}

function check_timestamp (){
	var interval = setInterval (function(){
		
		child = exec("date +%s", function (error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		} else {
			timestamp = parseInt(stdout);
		
		}
	  });	 
		  
	},1000);	
}

function check_loadaverage (){
	var interval = setInterval (function(){
		
		child = exec("uptime | tail -n 1 | awk '{print $10}'", function (error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		} else {		
			loadaverage = stdout.replace(",", ".");
			loadaverage = parseFloat(loadaverage).toFixed(2);
		}
	  });	 
		  
	},1000);	
}

function main_loop(){
	var interval = setInterval(function() {

		updateStatus("meta", nodeID, checkMetadata(), 0);
		updateStatus("istate", nodeID, checkResources(), 1);

	}, 5000);
}

function loop_model(){
	var interval = setInterval(function() {
		
		updateStatus("istate", nodeID, model_stg, 1);
	
	}, 20000);
}


exports.main_loop = main_loop;
exports.loop_model = loop_model;
exports.main_callback = main_callback;
exports.newConection = newConection;
