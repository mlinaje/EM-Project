
"use strict";

var mqtt = require('mqtt');
var path = require('path');
var bunyan = require('bunyan');


var logger = bunyan.createLogger({name:'EMProyect'});
var prefix = 'Home';
var client;
var topic_model = "Home/+/model";
var topic_meta = "Home/+/meta";
var topic_reply = "Home/+/reply";
var NodosModel = [];
var Nodos_gl = [];
var NodosMeta = [];
var currentStgNodes = [];
var requests = [];

var Mem = []; //array that contains the memory param for every node

var Proc = []; //array that contains the process capability param for every node

var Batt = []; //array that contains the battery param for every node

var Lat = []; //array that contains the latency param for every node

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
	
		client.subscribe(topic);

	
		client.on('message', function (topic, message) {
			callback (topic, message);
		});
		
		
}

function getModel_Meta (){
	client.subscribe(topic_model);
	client.subscribe(topic_meta);
	client.subscribe(topic_reply);
	
	client.on('message', function (topic_aux, message) {
		
		var nodos = [];
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
			
			for (var i = 0; i<NodosModel.length; i++){
				var obj = JSON.parse(NodosModel[i]);
				var nodo_aux = Object.keys(obj)[0];
				nodos.push(nodo_aux);
			}

			if (nodos.indexOf(nodo) != -1){
				NodosModel[nodos.indexOf(nodo)] = nodo_obj;
			}else{
				NodosModel.push(nodo_obj);
			}
			nodos = [];
		}
		
		if (channel == "meta"){
			
			for (var i = 0; i<NodosModel.length; i++){
				var obj = JSON.parse(NodosModel[i]);
				var nodo_aux = Object.keys(obj)[0];
				nodos.push(nodo_aux);
			}	
			if (nodos.indexOf(nodo) == -1){
				var topic = 'Home/';
				topic = topic.concat(nodo);
				topic = topic.concat('/model_req');	
				client.publish(topic, "req");
			}
			var nodo_obj = '';
			nodo_obj = '{"';
			nodo_obj = nodo_obj.concat(nodo);
			nodo_obj = nodo_obj.concat('":');
			nodo_obj = nodo_obj.concat(message.toString());
			nodo_obj = nodo_obj.concat('}');

			if(NodosMeta.length == 0){
				NodosMeta.push(nodo_obj);
			}
			
			for (var i = 0; i<NodosMeta.length; i++){
				var obj = JSON.parse(NodosMeta[i]);
				var nodo_aux = Object.keys(obj)[0];
				nodos.push(nodo_aux);
			}

			if (nodos.indexOf(nodo) != -1){
				NodosMeta[nodos.indexOf(nodo)] = nodo_obj;
			}else{
				NodosMeta.push(nodo_obj);			
			}
			
			nodos = [];
			Nodes();
		}
		
		if (channel == "reply"){
			var token_aux = message.toString();
			for (var i = 0; i<requests.length; i++){
				var obj = JSON.parse(requests[i]);
				var token = obj.token;
				
				if (token_aux == token){
					var time = obj.time;
					var nodo = obj.nodo;
					var now = new Date();
					var milis = now.getTime();
					var dif = milis - time;
					//add the dif param to meta array
					requests.splice(i,1);
				}
			}
		}
	});
	
	

}

function Nodes (){

	for (var i = 0; i<NodosMeta.length; i++){
		var obj = JSON.parse(NodosMeta[i]);
		var keys_nodes = Object.keys(obj);
		for (var j = 0; j < keys_nodes.length; j++) {
			var nodes = obj[keys_nodes[j]];
			var keys_params = Object.keys(nodes);
				for (var k = 0; k < keys_params.length; k++) {
					var val = nodes[keys_params[k]];
					var unit = searchUnit (keys_nodes[j],keys_params[k]);
					addParam (keys_params[k], val, unit);
					
				}
		}
		
	}
	
		getNodes (0.4, 0.25, 0.15, 0.2, 2);	
		
		Mem = []; 
		Proc = []; 
		Batt = []; 
		Lat = []; 
};

function searchUnit (nodo,param){
	for (var i = 0; i<NodosModel.length; i++){
		var obj = JSON.parse(NodosModel[i]);
		if (Object.keys(obj) == nodo ){
		var unit = obj[nodo][param];
		}
	}
	
	return unit;
};

function addParam (param, valu, unit){
	switch(param)
		{
		case "mem":
			switch(unit)
			{
			case "Gb":
				valu = valu*1024;
				break;
			case "Mb":
				valu = parseFloat (valu); //By default the unit for the memory is Mb
				break;
			case "Kb":
				valu = valu/1024;
				break;
			default:
				console.log("Erro to convert the memory param")
			}
			
			Mem.push(valu);
			
		  break;
		case "proc":
		
			valu = parseFloat (valu);
			Proc.push(valu);
			
		  break;
		case "batt":
		
			valu = parseFloat (valu);
			Batt.push(valu);
			
		  break;
		case "lat":
		switch(unit)
			{
		  case "seg":
				valu = parseFloat (valu); 
				break;
			case "mseg":
				valu = valu/1000;
				break;
			default:
				console.log("Erro to convert the latency param")
			}
		  Lat.push(valu);
		  
		  break;
		default:
		  console.log("Erro to add the param")
		}
			
	
};


function getNodes (weightMem, weigthProc, weigthBatt, weigthLat, numberNodes){
	var aux =[];
	var result = [];
	
	for(var i = 0; i < Mem.length; i++){
		aux[i] = (Mem[i]/Math.max.apply(null,Mem))*weightMem;
		result [i] = 0 + aux[i];
	}
	
	for(var i = 0; i < Proc.length; i++){
		aux[i] = (Proc[i]/Math.max.apply(null,Proc))*weigthProc;	
		result [i] = result [i] + aux[i];
	}
	for(var i = 0; i < Batt.length; i++){
		aux[i] = (Batt[i]/Math.max.apply(null,Batt))*weigthBatt;
		result [i] = result [i] + aux[i];		
	}
	for(var i = 0; i < Lat.length; i++){
		aux[i] = (Lat[i]/Math.max.apply(null,Lat))*weigthLat;
		result [i] = result [i] - aux[i];
	}
	
		for (var i = 0; i<NodosModel.length; i++){
			var obj = JSON.parse(NodosModel[i]);
			var nodo_aux = Object.keys(obj)[0];
			Nodos_gl.push(nodo_aux);
		}
		
	var nextStgNodes = [];
	var resultLength = result.length;
	if (numberNodes <= result.length){
		for (var i = 0; i < numberNodes; i++){
			nextStgNodes.push(Nodos_gl[result.indexOf(Math.max.apply(null,result))]);
			Nodos_gl.splice(result.indexOf(Math.max.apply(null,result)), 1);
			result.splice(result.indexOf(Math.max.apply(null,result)), 1);
		}
	}
	else {
		for (var i = 0; i < resultLength; i++){
			nextStgNodes.push(Nodos_gl[result.indexOf(Math.max.apply(null,result))]);
			Nodos_gl.splice(result.indexOf(Math.max.apply(null,result)), 1);
			result.splice(result.indexOf(Math.max.apply(null,result)), 1);
		}
	}
	

	updateStgNodes(nextStgNodes);
	
	Nodos_gl = [];
	nextStgNodes = [];	
};


function updateStgNodes (nextStgNodes){

	for(var i = 0; i < nextStgNodes.length; i++){
		if(currentStgNodes.indexOf(nextStgNodes[i]) == -1){
			currentStgNodes.push(nextStgNodes[i]);
			
			var msg = '{"nodo" : "';
			msg = msg.concat(nextStgNodes[i]);
			msg = msg.concat('", "op" : "subs" }');
			
			client.publish("/Home/nodo_central/ctrl", msg);
		}
	}
	

	for(var i = 0; i < currentStgNodes.length; i++){		
		if(nextStgNodes.indexOf(currentStgNodes[i]) == -1){
			
			var msg = '{"nodo" : "';
			msg = msg.concat(nextStgNodes[i]);
			msg = msg.concat('", "op" : "unsubs" }');
			
			client.publish("/Home/nodo_central/ctrl", msg);
			currentStgNodes.splice(i,1);
		}
	}

	
}

function updateStatus (channel, nodeID, message){
	var topic = path.join(prefix, nodeID, channel);
	client.publish(topic, message);
	
	
}

function request_daemon (){

	var interval = setInterval(function() {
		for (var i = 0; i<NodosMeta.length; i++){
			var obj = JSON.parse(NodosMeta[i]);
			var keys_nodes = Object.keys(obj);

			
			var topic = 'Home/';
			topic = topic.concat(keys_nodes[0]);
			topic = topic.concat('/reply');			
			client.subscribe(topic);

			//crear el json con la hora, el nodo y el token y meterlo en el array
			var token = getRandomInt(100,1000);	
			var now = new Date();
			var milis = now.getTime();
			
			var json_req = '{"nodo" : "';
			json_req = json_req.concat(keys_nodes[0]);
			json_req = json_req.concat('", "token" : "');
			json_req = json_req.concat(token);
			json_req = json_req.concat('", "time" : "');
			json_req = json_req.concat(milis);
			json_req = json_req.concat('"}');
			requests.push(json_req);
			topic = 'Home/';
			topic = topic.concat(keys_nodes[0]);
			topic = topic.concat('/request');
			client.publish(topic, token.toString());
		}
	}, 5000);
		


}

function clean_daemon(){
	var interval = setInterval(function() {
		for (var i = 0; i<requests.length; i++){
			var obj = JSON.parse(requests[i]);
			var time = obj.time;
			var nodo = obj.nodo;
			var now = new Date();
			var milis = now.getTime();
			var dif = milis - time;
			if (dif > 10000){
				
				for (var j = 0; j<NodosMeta.length; j++){
					var obj_meta = JSON.parse(NodosMeta[i]);
					var keys_nodes = Object.keys(obj_meta);
					if (nodo == keys_nodes[0]){					
						NodosMeta.splice(i,1);
					}
				}
				requests.splice(i,1);
			}
		}
	}, 10000);
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

exports.clean_daemon = clean_daemon;
exports.getModel_Meta = getModel_Meta;
exports.request_daemon = request_daemon;
exports.newConection = newConection;
exports.checkStatus = checkStatus;
exports.updateStatus = updateStatus;
exports.Nodes = Nodes;