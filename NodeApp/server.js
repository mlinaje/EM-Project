// Global variables
global.config = require('./conf/config');

//import express package
var express = require("express");

//lets require/import the mongodb native drivers.
var mongodb = require('mongodb');

var path = require('path'); // This package is usefull to create the mqtt topcis

var bunyan = require('bunyan'); // This package is used like debugger

var mqtt = require('mqtt'); // Comunication protocol to comunicate with the nodes

//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;

//NPM Module to integrate Handlerbars UI template engine with Express
var exphbs  = require('express-handlebars');

// Global variables
create_conf();
var logger = bunyan.createLogger({name:'EMProyect'});
var client;
var responseArray = [];
var NodosModel = [];
var responses = [];
var eof = [];
var rtValues = [];
var numberOfNodes = 0;
//DB Object
var dbObject;
var prefix = global.config.node.prefix;
var topic_response = "Home/server/response";

MongoClient.connect(url, function(err, db){
  if ( err ) throw err;
  dbObject = db;
});

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
	
	client.subscribe(topic_response);
	
	client.on('message', function (topic_aux, message) {
		topic_aux = topic_aux.substring(1);	
		var nodo = topic_aux.substring(topic_aux.indexOf('/') + 1, topic_aux.lastIndexOf('/')); //parsing the node
		var channel = topic_aux.substring(topic_aux.lastIndexOf('/') + 1 );	//parsing the channel
	
		if (channel == "model"){
			var nodos = [];
			// if there is not any object in the model array, push the first one
			if(NodosModel.length == 0){
				NodosModel.push(message.toString());
			}
			
			else {
			
				for (var i = 0; i<NodosModel.length; i++){ // this loop get all node names in the array to check if the currect node already exist in it
					var obj = JSON.parse(NodosModel[i]);
					var nodo_aux = obj.nodo;
					nodos.push(nodo_aux); // "nodos" param has all the node names
				}
				
				if (nodos.indexOf(nodo) != -1){ //if the node already exists, the app replace the objetc
					NodosModel[nodos.indexOf(nodo)] = message.toString();
				}else{ // else, push a new json object
					NodosModel.push(message.toString());
				}
			}
			nodos = []; // cleaning variables
		}
		
		if (channel == "response"){
			var obj = JSON.parse(message.toString());
			var val = obj.val;
			var queries = [];
			var q_id = obj.query_id;
			
			if (val === "eof"){
				for (var i = 0; i<responses.length; i++){ 

						if (responses[i]["q_id"] === q_id){
								eof.push(q_id);
							break;
						}
					}
					
			}else{
				
				if(responses.length == 0){
					
					var values = [];
					var obj_aux = {};
					values.push(message.toString());
					obj_aux["q_id"] = q_id;
					obj_aux["values"] = values;
					responses.push(obj_aux);
					
				}else{
					
					for (var i = 0; i<responses.length; i++){ 
						var q_id_aux = responses[i]["q_id"];
						queries.push(q_id_aux); 
					}
					
					if (queries.indexOf(q_id) != -1){
						
						var values_aux = responses[queries.indexOf(q_id)]["values"];
						values_aux.push(message.toString());
						responses[queries.indexOf(q_id)]["values"] = values_aux;
						
					}else{
						
						var values = [];
						var obj_aux = {};
						values.push(message.toString());
						obj_aux["q_id"] = q_id;
						obj_aux["values"] = values;
						responses.push(obj_aux);
						
					}
				}
				queries = [];
			}
		}		
		
		if (channel == "istate"){
			var obj = JSON.parse(message.toString());
			var nodos = [];
			if (obj.nodo == undefined){
				
				if(rtValues.length == 0){
					var values = [];
					values.push(message.toString());
					var rtVal_aux = {"node":nodo,"values":values};
					rtValues.push(rtVal_aux);
				}else{
					for (var i = 0; i<rtValues.length; i++){ 
						var obj = rtValues[i];
						var nodo_aux = obj.node;
						nodos.push(nodo_aux);
					}
					if (nodos.indexOf(nodo) != -1){ 
						var obj_val = rtValues[nodos.indexOf(nodo)];
						var array_val = obj_val.values;
						if (array_val.length == 20){
							array_val.shift();
						}
						array_val.push(message.toString());
						var rtVal_aux = {"node":nodo,"values":array_val};
						rtValues[nodos.indexOf(nodo)] = rtVal_aux;
						
					}else{
						var values = [];
						values.push(message.toString());
						var rtVal_aux = {"node":nodo,"values":values};
						rtValues.push(rtVal_aux);
					}
					nodos = []; 
				}
			}
		}
		
	});	
}



function realTimereq(node, responseObj){
	var topic_model = path.join(prefix,node,'model');
	client.subscribe(topic_model);	
	var topic_model_req = path.join(prefix,node,'model_req');
	client.publish(topic_model_req, "req");
	var topic_istate = path.join(prefix,node,'istate');
	client.subscribe(topic_istate);
	console.log("peticion realizada");
	var response = {"res":"ok"};
	responseObj.json(response);
}


function realTime(node,param, responseObj){
	var nodos = [];
	var params = [];
	
	for (var i = 0; i<rtValues.length; i++){ 
		var obj = rtValues[i];
		var nodo_aux = obj.node;
		nodos.push(nodo_aux);
	}

	if (nodos.indexOf(node) != -1){
		var timestamp = [];
		var data = [];
		var unit = "";
		
		for (var i = 0; i<rtValues.length; i++){
			var obj = rtValues[i];
			var nodo_aux = obj.node;
			if (nodo_aux == node){
				params = Object.keys(JSON.parse(obj.values[0]));
				break;
			}
		}
		if (params.indexOf(param) != -1){
				
			for (var i = 0; i<NodosModel.length; i++){
				var obj = JSON.parse(NodosModel[i]);
				var nodo_aux = obj.nodo;
				if (nodo_aux == node){
					unit = obj[param];
					break;
				}
			}
			
			for (var i = 0; i<rtValues.length; i++){ 
				var obj = rtValues[i];
				var nodo_aux = obj.node;
				if (nodo_aux == node){
					var val_aux = obj.values;
					for (var j = 0; j<val_aux.length; j++){
						obj_dat = JSON.parse(val_aux[j]);
						var time = obj_dat.timestamp;				
						var dat = obj_dat[param];
						timestamp.push({"label":time.toString()});
						data.push({"value":dat.toString()});
					}
					var seriename = ""+param+"("+unit+")";
					
					var dataset = [{
					"seriesname" : seriename,
					"data" : data
					}];
					
					var response = {
						"dataset":dataset,
						"categories":timestamp
					};
					break;
				}
			}
		}else{
			var response = {"error":"param not available"}
		}
	}else{
		var response = {"error":"node not available"}
	}
	nodos = [];
	responseObj.json(response);
}
function getData(responseObj){
    // Get the documents collection
   dbObject.listCollections().toArray(function(err,collections){
	for (index in collections){
		var col = collections[index].name;
		if (col.indexOf("model_") != -1) {
			numberOfNodes = numberOfNodes +1;
		}
	}
	for ( index in collections){ 
		var col = collections[index].name;
		if (col.indexOf("model_") != -1) {
        	dbObject.collection(col).find().sort({"time":-1}).limit(1).toArray(function(err, docs){
   		if ( err ) throw err;
		var nodo = docs[0].nodo;
		var colMeta = "meta_";
		colMeta = colMeta.concat(nodo);
		dbObject.collection(colMeta).find().sort({"time":-1}).limit(1).toArray(function(err, docsMeta){
                if ( err ) throw err;
		var valMem = docsMeta[0].mem;
		var valProc = docsMeta[0].proc;
		var _valBatt = docsMeta[0].batt;
		var valPow = docsMeta[0].power;
		var valRAM = docsMeta[0].freeRAM;
		var valLat = docsMeta[0].lat;
		if (_valBatt == '-1'){
			var valBatt = "noBatt";
		}
		var unitBatt = docs[0].batt;
		var unitMem = docs[0].mem;
		var unitRAM = docs[0].freeRAM;
		var unitLat = docs[0].lat;
		var data = {"nodo" : nodo,
		"data":[{"param":"mem","val":valMem,"unit":unitMem},
			{"param":"proc","val":valProc,"unit":"noUnit"},
			{"param":"batt","val":valBatt,"unit":unitBatt},
			{"param":"power","val":valPow,"unit":"noUnit"},
			{"param":"freeRAM","val":valRAM,"unit":unitRAM},
			{"param":"lat","val":parseFloat(valLat).toFixed(3),"unit":unitLat}]};
		responseArray.push(data);
        	if ( numberOfNodes == responseArray.length){
			dbObject.collection("nodes").find().sort({"time":-1}).limit(1).toArray(function(err, docsStg){
			if ( err ) throw err;
			global.stgNodes = docsStg[0].stg_nodes;
			global.totNodes = docsStg[0].total_nodes;
			});
			
			responseArray.sort(function (a, b) {
				  if (a.nodo > b.nodo) {
					return 1;
				  }
				  if (a.nodo < b.nodo) {
					return -1;
				  }
				  // a must be equal to b
				  return 0;
			});
			
			var response = {"nodes":responseArray,
					"weigths":global.config.parameters,
					"stgNodes":global.stgNodes,
					"totNodes":global.totNodes};
			responseArray = [];
			numberOfNodes = 0;
			responseObj.json(response);
    	    };
	});
	});
        }
    }
  })
}

function specific(node,param,max,min, responseObj){
		var timestamp = [];
		var data = [];
		var unit = "";
	
	var topic_query = "Home/server/query";
	var query_id = getRandomInt(1000,10000);
	var msg = '{"nodo":"'+node+'","query_id":"'+query_id+'","param":"'+param+'","timeInit":"'+max+'","timeEnd":"'+min+'"}';
	client.publish(topic_query,msg);
	var interval;
	interval = setInterval(function() {
		if (eof.indexOf(query_id.toString()) != -1){
			for (var i = 0; i<responses.length; i++){ 
				var q_id_aux = responses[i]["q_id"];
				if (q_id_aux == query_id){
					var values_aux = responses[i]["values"];
					for (var j = 0; j < values_aux.length; j++){
						obj_dat = JSON.parse(values_aux[j]);
						var time = obj_dat.timestamp;				
						var dat = obj_dat.val;
						unit = obj_dat.unit;
						timestamp.push({"label":time.toString()});
						data.push({"value":dat.toString()});
					}
					var seriename = ""+param+"("+unit+")";
					
					var dataset = [{
					"seriesname" : seriename,
					"data" : data
					}];
					
					var response = {
						"dataset":dataset,
						"categories":timestamp
					};
					responses.splice(i,1);
					responseObj.json(response);
					clearInterval(interval);
					break;
				}
			}
		}
	},20);
}

//create express app
var app = express();

//Declaring Express to use Handlerbars template engine with main.handlebars as
//the default layout
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

//Defining middleware to serve static files
app.use('/public', express.static('public'));

app.get("/nodesview", function(req, res){
  res.render("display_nodes");
});

app.get("/nodes", function(req, res){
  getData(res);
});

app.get("/realtimereq/:node", function(req, res){
	
	realTimereq(req.params.node, res);

});
app.get("/realtime/:node/:param", function(req, res){
	
	realTime(req.params.node,req.params.param,res);
});

app.get("/specific/:node/:param/:max/:min", function(req, res){
	
	specific(req.params.node,req.params.param,req.params.max,req.params.min,res);
});

app.listen("8080", function(){
  console.log('Server up: port 8080');
});


function create_conf (){
global.url = "mongodb://";
url = url.concat(global.config.db.host);
url = url.concat(":");
url = url.concat(global.config.db.port);
url = url.concat("/");
url = url.concat(global.config.db.database);
}
function getRandomInt(min, max) { // just a function to calculate a random integer
  return Math.floor(Math.random() * (max - min)) + min;
}
exports.newConection = newConection;