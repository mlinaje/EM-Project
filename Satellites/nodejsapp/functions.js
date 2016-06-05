
"use strict";
// Global variables
global.config = require('./conf/config');

var mqtt = require('mqtt');
var bunyan = require('bunyan');
var path = require('path'); // This package is usefull to create the mqtt topcis
var MongoClient = require('mongodb').MongoClient;
var exec = require('child_process').exec,
child, child1;
var sensorLib = require('node-dht-sensor');
var gpio = require("pi-gpio"); 
var logger = bunyan.createLogger({name:'EMProyect'});
var prefix = global.config.node.prefix;
var nodeID = global.config.node.nodeID;
var proc = parseInt(global.config.parameters.proc);

create_conf();

var client;
var topic_ctrl = "Home/nodo_central/ctrl";
var model_stg = global.config.model;
var topic_query = "Home/+/r_query";

var free_stg;
var memFree;
var swapcached;
var timestamp;
var loadaverage;
var cpu_usage;
var temp;
var hum;


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
	client.subscribe(topic_query);
	client.subscribe(topic_ostate);
	client.publish(topic_model, model_stg);
	check_ram();
	check_mem();
	check_swap();
	check_loadaverage();
	check_timestamp();
	check_cpu();
	check_temp_hum();
	
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
				console.log("seleccionado");
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
			MongoClient.connect(url_database, function(err, db) {
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
		
		if (channel == "r_query"){
			
			var pos = topic_aux.indexOf(topic_id);
			
			if (pos != -1){
				
				var q_obj = JSON.parse(message.toString());
				var nodo = q_obj.nodo;
				var par = q_obj.param;
				var gt = q_obj.timeInit;
				var lt = q_obj.timeEnd;
				var q_id = q_obj.query_id;
				var collection_name = "meta_";
				collection_name = collection_name.concat(nodo);
				MongoClient.connect(url_database, function (err, db) {
						if (err) {
							console.log('Unable to connect to the mongoDB server. Error:', err);
						} else {

						//	Get the documents collection
						var collection = db.collection(collection_name);

						collection.find({"timestamp" : {$gt: gt, $lt: lt }}).toArray(function (err, result) {
					
						  if (err) {
							console.log(err);
						  } else if (result.length) {
							//console.log('Found:', result);
										
							for (var i=0; i<result.length; i++){
								
								switch(par)
								{
								case "mem":
									var val = result[i].mem;
									break;
								case "temp":
									var val = result[i].temp;
									break;
								case "hum":
									var val = result[i].hum;
									break;
								case "swap":
									var val = result[i].swap;
									break;
								case "cpu_usage":
									var val = result[i].cpu_usage;
									break;
								case "loadavg":
									var val = result[i].loadavg;
									break;
								case "freeRAM":
									var val = result[i].freeRAM;
									break;
								default:
									console.log("Parameter not found");
								}
								
								var timestamp = result[i].timestamp;
								var msg = '{"val" : "';
								msg = msg.concat(val);
								msg = msg.concat('", "timestamp" : "'); 
								msg = msg.concat(timestamp);					
								msg = msg.concat('", "query_id" : "'); 
								msg = msg.concat(q_id);
								msg = msg.concat('"}'); 
					
								client.publish(topic_query_reply,msg);
								
							}
							
							var msg_eof = '{"val" : "eof", "node" : "11", "query_id" : "';
							msg_eof = msg_eof.concat(q_id);
							msg_eof = msg_eof.concat('"}'); 
							client.publish(topic_query_reply,msg_eof);

						  } else {
							console.log('No document(s) found with defined "find" criteria!');
						  }
						  
						 // Close connection
						  db.close();
						});
					  }
					});
			}
		}		
		if (channel == "ostate"){
			
			var obj = JSON.parse(message.toString());
			var act = obj.act;
			var val = obj.val;	
			console.log (obj);
			if (act == "led_rojo"){

				if (val == "on"){
					

					child1 = exec("echo 17 > /sys/class/gpio/export", function (error, stdout, stderr) {
						if (error !== null) {
							console.log('exec error: ' + error);
						} else {
							
							child1 = exec("echo out > /sys/class/gpio/gpio17/direction", function (error, stdout, stderr) {
								if (error !== null) {
									console.log('exec error: ' + error);
								} else {
									
									child1 = exec("echo 1 > /sys/class/gpio/gpio17/value", function (error, stdout, stderr) {
										if (error !== null) {
											console.log('exec error: ' + error);
										}
									});
								}
							});

						}
					});

				}else{
					
					if (val == "off"){
						
						child1 = exec("echo 0 > /sys/class/gpio/gpio17/value", function (error, stdout, stderr) {
							if (error !== null) {
								console.log('exec error: ' + error);
							}else{
								child1 = exec("echo 17 > /sys/class/gpio/unexport", function (error, stdout, stderr) {
									if (error !== null) {
										console.log('exec error: ' + error);
									}
								});	
							}
						});						
					
					}
				}

			}else{
				if (act == "led_azul"){
					if (val == "on"){
					

						child1 = exec("echo 27 > /sys/class/gpio/export", function (error, stdout, stderr) {
							if (error !== null) {
								console.log('exec error: ' + error);
							} else {
								
								child1 = exec("echo out > /sys/class/gpio/gpio27/direction", function (error, stdout, stderr) {
									if (error !== null) {
										console.log('exec error: ' + error);
									} else {
										
										child1 = exec("echo 1 > /sys/class/gpio/gpio27/value", function (error, stdout, stderr) {
											if (error !== null) {
												console.log('exec error: ' + error);
											}
										});
									}
								});

							}
						});

					}else{
					
						if (val == "off"){
							child1 = exec("echo 0 > /sys/class/gpio/gpio27/value", function (error, stdout, stderr) {
								if (error !== null) {
									console.log('exec error: ' + error);
								}else{
									
									child1 = exec("echo 27 > /sys/class/gpio/unexport", function (error, stdout, stderr) {
										if (error !== null) {
											console.log('exec error: ' + error);
										}
									});
								}
							});
						
						}
					}
				}
			}	
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
		resources = resources.concat('","temp":"');
		resources = resources.concat(temp);
		resources = resources.concat('","hum":"');
		resources = resources.concat(hum);
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
		
		child1 = exec("grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'", function (error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		} else {
			cpu_usage = parseFloat(stdout);		
		}
	  });  	 
	  
	},1000);
	
}

function check_temp_hum (){
	
	var sensor = {
    initialize: function () {
        return sensorLib.initialize(11, 4);
    },
    read: function () {
        var readout = sensorLib.read();
		temp = readout.temperature.toFixed(2);
		hum = readout.humidity.toFixed(2);
        setTimeout(function () {
            sensor.read();
        }, 1000);
    }
};
 
if (sensor.initialize()) {
    sensor.read();
} else {
    console.warn('Failed to initialize sensor');
}

	
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
		
		timestamp = new Date().getTime(); 
	
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

function loop_meta(){
	var interval = setInterval(function() {

		updateStatus("meta", nodeID, checkMetadata(), 0);

	}, parseInt(global.config.node.update_meta));
}
function loop_istate(){
	var interval = setInterval(function() {

		updateStatus("istate", nodeID, checkResources(), 1);

	}, parseInt(global.config.node.update_istate));
}
function loop_model(){
	var interval = setInterval(function() {
		
		updateStatus("istate", nodeID, model_stg, 1);
		client.publish(topic_model, model_stg);
		
	}, parseInt(global.config.node.update_model));
}

function create_conf (){
global.topic_model_req = path.join(prefix,nodeID,'model_req');
global.topic_request = path.join(prefix,nodeID,'request');
global.topic_reply = path.join(prefix,nodeID,'reply');
global.topic_model = path.join(prefix,nodeID,'model');
global.topic_query_reply = path.join(prefix,nodeID,'q_reply');
global.topic_ostate = path.join(prefix,nodeID,'ostate');

global.topic_id = "<";
topic_id = topic_id.concat(nodeID);
topic_id = topic_id.concat(">");

global.url_database = "mongodb://";
url_database = url_database.concat(global.config.db.host);
url_database = url_database.concat(":");
url_database = url_database.concat(global.config.db.port);
url_database = url_database.concat("/");
url_database = url_database.concat(global.config.db.database);
}

exports.loop_meta = loop_meta;
exports.loop_istate = loop_istate;
exports.loop_model = loop_model;
exports.main_callback = main_callback;
exports.newConection = newConection;
