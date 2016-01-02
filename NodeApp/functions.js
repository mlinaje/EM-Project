
"use strict";

var mqtt = require('mqtt');
var path = require('path');
var bunyan = require('bunyan');
var MongoClient = require('mongodb').MongoClient;

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
var latency = [];
var latency_avg = [];

var Mem = []; //array that contains the memory param for every node

var Proc = []; //array that contains the process capability param for every node

var Batt = []; //array that contains the battery param for every node

var Lat = []; //array that contains the latency param for every node

var Power = [];

var FreeRAM = [];

var parameters = {
	weightMem :"0.2",
	weigthProc :"0.2",
	weigthBatt :"0.1",
	weigthLat :"0.2",
	weigthPower :"0.2",
	weigthRAM: "0.1",
	numberNodes: "2"
};

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
			
			var obj = JSON.parse(nodo_obj);
			obj[nodo]["lat"] = "mseg";
			nodo_obj = JSON.stringify(obj);
			var now = new Date();
			var milis = now.getTime();
			obj[nodo]["time"] = milis;
			//Connect to the db
			MongoClient.connect("mongodb://localhost:27017/nodo_1_db", function(err, db) {
			  if(err) { return console.dir(err); }
			  
				db.collection('model').insert(obj[nodo]);

			});			
			
			if(NodosModel.length == 0){
				NodosModel.push(nodo_obj);
			}
			
			else {
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
				return; //salimos de la funcion
				
			}
			nodos = [];
			var nodo_obj = '';
			nodo_obj = '{"';
			nodo_obj = nodo_obj.concat(nodo);
			nodo_obj = nodo_obj.concat('":');
			nodo_obj = nodo_obj.concat(message.toString());
			nodo_obj = nodo_obj.concat('}');
		
			for (var j = 0; j<latency_avg.length; j++){
				var obj = JSON.parse(latency_avg[j]);
				var nodo_aux1 = obj.nodo;
				var lat = obj.lat_avg;

				if (nodo == nodo_aux1){
					var obj = JSON.parse(nodo_obj);
					obj[nodo]["lat"] = lat.toString();
					nodo_obj = JSON.stringify(obj);
					var now = new Date();
					var milis = now.getTime();
					obj[nodo]["time"] = milis;
					//Connect to the db
					MongoClient.connect("mongodb://localhost:27017/nodo_1_db", function(err, db) {
						if(err) { return console.dir(err); }

						db.collection(nodo).insert(obj[nodo]);					


					});	
				}
			}
			
			if(NodosMeta.length == 0){
				NodosMeta.push(nodo_obj);
			}
			else{
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
					
					if(latency.length == 0){
						var nodo_obj = '';
						nodo_obj = '{"nodo" : "';
						nodo_obj = nodo_obj.concat(nodo);
						nodo_obj = nodo_obj.concat('", "lat" : "'); 
						nodo_obj = nodo_obj.concat(dif);
						nodo_obj = nodo_obj.concat('", "tot" : "1" }');
						latency.push(nodo_obj);
					}
					else {

						for (var j = 0; j<latency.length; j++){
							var obj = JSON.parse(latency[j]);
							var nodo_aux = obj.nodo;
							nodos.push(nodo_aux);
						}
						if (nodos.indexOf(nodo) != -1){ //existe ya en el array

							var obj = JSON.parse(latency[nodos.indexOf(nodo)]);
							var lat = obj.lat;
							var lat_total = parseInt(lat) + dif;
							var tot = parseInt(obj.tot) + 1;
							latency.splice(nodos.indexOf(nodo),1);
							nodo_obj = '{"nodo" : "';
							nodo_obj = nodo_obj.concat(nodo);
							nodo_obj = nodo_obj.concat('", "lat" : "'); 
							nodo_obj = nodo_obj.concat(lat_total);
							nodo_obj = nodo_obj.concat('", "tot" : "');
							nodo_obj = nodo_obj.concat(tot);
							nodo_obj = nodo_obj.concat('" }');
							latency.push(nodo_obj);
						}else{
							var nodo_obj = '';
							nodo_obj = '{"nodo" : "';
							nodo_obj = nodo_obj.concat(nodo);
							nodo_obj = nodo_obj.concat('", "lat" : "'); 
							nodo_obj = nodo_obj.concat(dif);
							nodo_obj = nodo_obj.concat('", "tot" : "1" }');
							latency.push(nodo_obj);		
						}
					}
					requests.splice(i,1);
				}
			}
			nodos = [];
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
	
		getNodes (parameters);	
		
		Mem = []; 
		Proc = []; 
		Batt = []; 
		Lat = []; 
		Power = [];
		FreeRAM = [];
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
		
			var error;
			
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
				error = true;
			}
			
			if (!error){
				
				Mem.push(valu);
				
			}
			error = false;
			break;
		  
		case "proc":
			
			valu = parseFloat (valu);
			Proc.push(valu);
			
		  break;
		  
		case "batt":
		
			switch(unit)
			{
				case "V":
					valu = parseFloat (valu); //By default the unit for the battery is V
					break;
				case "mV":
					valu = valu/1000;
					break;
				case "noUnit":
					valu = valu;
					break;	

				default:
					error = true;
				}
				
				if (!error){
					
					Batt.push(valu);
					
				}
				error = false;
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
					error = true;
				}
				
				if (!error){
					
					Lat.push(valu);
					
				}
				error = false;
				break;
				
		case "power":
				
			Power.push(valu);
			
			break;

		case "freeRAM":
		
			var error;
			
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
				error = true;
			}
			
			if (!error){
				
				FreeRAM.push(valu);
				
			}
			error = false;
			break;
			
		default:
		  console.log("Erro to add the param")
		}
		
	
};

function getNodes (param){
	var aux =[];
	var result = [];
	
	var weightMem = param.weightMem;
	var weigthProc = param.weigthProc;
	var weigthBatt = param.weigthBatt;
	var weigthLat = param.weigthLat;
	var weigthPower = param.weigthPower;
	var weigthRAM = param.weigthRAM;
	var numberNodes = param.numberNodes;
	
	if(weightMem != undefined)
	{
		for(var i = 0; i < Mem.length; i++){
			aux[i] = (Mem[i]/Math.max.apply(null,Mem))*weightMem;
			result [i] = 0;
			result [i] = result [i] + aux[i];
		}
	}
	  
	if(weigthProc != undefined)
	{
		for(var i = 0; i < Proc.length; i++){
			aux[i] = (Proc[i]/Math.max.apply(null,Proc))*weigthProc;
			result [i] = result [i] + aux[i];
		}
	}
	
	if(weigthBatt != undefined)
	{
		for(var i = 0; i < Batt.length; i++){
			if (Batt[i] == "-1"){
				aux[i] = parseFloat(weigthBatt);
				result [i] = result [i] + aux[i];

			}
			else {
				aux[i] = (Batt[i]/Math.max.apply(null,Batt))*weigthBatt;
				result [i] = result [i] - aux[i];

			}
		}
	}

	if(weigthLat != undefined)
	{
		for(var i = 0; i < Lat.length; i++){
			aux[i] = (Lat[i]/Math.max.apply(null,Lat))*weigthLat;
			result [i] = result [i] - aux[i];
		}
	}	

	if(weigthPower != undefined)
	{
		for(var i = 0; i < Power.length; i++){
			aux[i] = Power[i]*weigthPower;	
			result [i] = result [i] + aux[i];

		}
	}	

	if(weigthRAM != undefined)
	{	
		for(var i = 0; i < FreeRAM.length; i++){
			aux[i] = (FreeRAM[i]/Math.max.apply(null,FreeRAM))*weigthRAM;
			result [i] = result [i] + aux[i];
		}
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
}


function updateStgNodes (nextStgNodes){
	
	for(var i = 0; i < nextStgNodes.length; i++){
		
			var msg = '{"nodo" : "';
			msg = msg.concat(nextStgNodes[i]);
			msg = msg.concat('", "op" : "sub" }');
			
		if(currentStgNodes.indexOf(nextStgNodes[i]) == -1){ // No esta en la lista actual de nodos de almacenamiento, por tanto lo mete en la lista
			currentStgNodes.push(nextStgNodes[i]);			
		}

		client.publish("Home/nodo_central/ctrl", msg);
	
	}
	

	for(var i = 0; i < currentStgNodes.length; i++){		
		if(nextStgNodes.indexOf(currentStgNodes[i]) == -1){
			
			var msg = '{"nodo" : "';
			msg = msg.concat(nextStgNodes[i]);
			msg = msg.concat('", "op" : "unsub" }');
			
			client.publish("Home/nodo_central/ctrl", msg);
			currentStgNodes.splice(i,1);
		}
	}

	//Connect to the db
	MongoClient.connect("mongodb://localhost:27017/nodo_1_db", function(err, db) {
		if(err) { return console.dir(err); }
		var obj = JSON.parse('{}');
		var now = new Date();
		var milis = now.getTime();
		obj["time"] = milis;
		obj["stg_nodes"] = currentStgNodes;
		db.collection('nodes').insert(obj);					


	});		
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

function averageLatency_daemon(){
	var nodos = [];
	var interval = setInterval(function() {
		for (var i = 0; i<latency.length; i++){
			var nodos = [];
			var obj = JSON.parse(latency[i]);
			var nodo =obj.nodo;
			var lat = parseInt(obj.lat);
			var tot = parseInt(obj.tot);
			var lat_avg = lat/tot;
			latency.splice(i,1);
			
			
			if(latency_avg.length == 0){
						var nodo_obj = '';
						nodo_obj = '{"nodo" : "';
						nodo_obj = nodo_obj.concat(nodo);
						nodo_obj = nodo_obj.concat('", "lat_avg" : "'); 
						nodo_obj = nodo_obj.concat(lat_avg);
						nodo_obj = nodo_obj.concat('"}');
						latency_avg.push(nodo_obj);
					}
					else {

						for (var j = 0; j<latency_avg.length; j++){
							var obj = JSON.parse(latency_avg[j]);
							var nodo_aux = obj.nodo;
							nodos.push(nodo_aux);
						}
						if (nodos.indexOf(nodo) != -1){ //existe ya en el array

							latency_avg.splice(nodos.indexOf(nodo),1);
							var nodo_obj = '';
							nodo_obj = '{"nodo" : "';
							nodo_obj = nodo_obj.concat(nodo);
							nodo_obj = nodo_obj.concat('", "lat_avg" : "'); 
							nodo_obj = nodo_obj.concat(lat_avg);
							nodo_obj = nodo_obj.concat('"}');
							latency_avg.push(nodo_obj);
						}else{
							var nodo_obj = '';
							nodo_obj = '{"nodo" : "';
							nodo_obj = nodo_obj.concat(nodo);
							nodo_obj = nodo_obj.concat('", "lat_avg" : "'); 
							nodo_obj = nodo_obj.concat(lat_avg);
							nodo_obj = nodo_obj.concat('"}');
							latency_avg.push(nodo_obj);	
						}
					}
		}
	
		
	}, 30000);
}



function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

exports.averageLatency_daemon = averageLatency_daemon;
exports.clean_daemon = clean_daemon;
exports.getModel_Meta = getModel_Meta;
exports.request_daemon = request_daemon;
exports.newConection = newConection;
exports.updateStatus = updateStatus;
exports.Nodes = Nodes;