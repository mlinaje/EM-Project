
/*
Author: Alfonso Galán Benítez

Description: Main fuctions that the application democratic and distributed storage in sensor networks run
This app belongs to Alfonso's End Master Proyect

*/
"use strict";

// Global variables
global.config = require('./conf/config');

// Import the required packages
var mqtt = require('mqtt'); // Comunication protocol to comunicate with the nodes
var path = require('path'); // This package is usefull to create the mqtt topcis
var bunyan = require('bunyan'); // This package is used like debugger
var MongoClient = require('mongodb').MongoClient; // to storage the information it is used a mongodb database

 
// Global variables

create_conf();

var logger = bunyan.createLogger({name:'EMProyect'});
var prefix = global.config.node.prefix;
var client;
var topic_model = "Home/+/model";
var topic_meta = "Home/+/meta";
var topic_reply = "Home/+/reply";
var topic_query = "Home/+/query";
var topic_r_query = "Home/+/q_reply";
var NodosModel = [];
var Nodos_gl = [];
var NodosMeta = [];
var Queries = [];
var r_Queries = [];
var query_attempt = [];
var currentStgNodes = [];
var requests = [];
var latency = [];
var latency_avg = [];
var eof = [];

var Mem = []; //array that contains the memory param for every node

var Proc = []; //array that contains the process capability param for every node

var Batt = []; //array that contains the battery param for every node

var Lat = []; //array that contains the latency param for every node

var Power = []; // array that contains the power param for every node

var FreeRAM = []; // array that contains the free RAM param for every node


var parameters = global.config.parameters;
// This function create the connection to a MQTT Broker and show error message if needed
// Port: tcp port that is listening the requests
// Host: broker name or ip address 
// Keepalive: number of miliseconds to recheck the conecction with the subscribers

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

// This fuction obtains the data model and the meta data for each node in the network
// That information is used after to calculate the storage nodes

function getModel_Meta (){
	
	client.subscribe(topic_model);	// subscription to the topic that receive the data model from every node
	client.subscribe(topic_meta);	// subscription to the topic that receive the information parameters from every node
	client.subscribe(topic_reply);	// this subscriptin is used to receive the replies to the requests to calculate the delay param
	client.subscribe(topic_query);  // subscription to query topic
	client.subscribe(topic_r_query); // subscription to receive the replies to the queries

	// If the app recevie a mqtt message from one of the topics above
	client.on('message', function (topic_aux, message) {
		topic_aux = topic_aux.substring(1);	
		var nodo = topic_aux.substring(topic_aux.indexOf('/') + 1, topic_aux.lastIndexOf('/')); //parsing the node
		var channel = topic_aux.substring(topic_aux.lastIndexOf('/') + 1 );	//parsing the channel
		//Connect to the db to storage the data
		MongoClient.connect(url, function(err, db) {
			if(err) { return console.dir(err); }
			var nodos = [];
			//var topic_str = topic_aux.toString(); //byte to string topic change
			

			//if the communication channel is "model"
			if (channel == "model"){
			
				// creation the json object that contains the data model for a specific nodeID
				// it is included the node name to the json object
				var nodo_obj = '';
				nodo_obj = '{"';
				nodo_obj = nodo_obj.concat(nodo);
				nodo_obj = nodo_obj.concat('":');
				nodo_obj = nodo_obj.concat(message.toString());
				nodo_obj = nodo_obj.concat('}');
				
				// it is included the unit to the latency param
				var obj = JSON.parse(nodo_obj);
				obj[nodo]["lat"] = "mseg";
				nodo_obj = JSON.stringify(obj); // create the json object
				// the time it is included just to the database storage
				var millis = new Date().getTime();
				obj[nodo]["time"] = millis;
				
				var document= "model_";
				document = document.concat(nodo);  // document creation
				db.collection(document).insert(obj[nodo]); //inset the json object in the document
				
			
				
				// if there is not any object in the model array, push the first one
				if(NodosModel.length == 0){
					NodosModel.push(nodo_obj);
				}
				
				else {
					
					for (var i = 0; i<NodosModel.length; i++){ // this loop get all node names in the array to check if the currect node already exist in it
						var obj = JSON.parse(NodosModel[i]);
						var nodo_aux = Object.keys(obj)[0];
						nodos.push(nodo_aux); // "nodos" param has all the node names
					}

					if (nodos.indexOf(nodo) != -1){ //if the node already exists, the app replace the objetc
						NodosModel[nodos.indexOf(nodo)] = nodo_obj;
					}else{ // else, push a new json object
						NodosModel.push(nodo_obj);
					}
				}
				nodos = []; // cleaning variables
			}
			
			//if the communication channel is "meta"
			if (channel == "meta"){
				for (var i = 0; i<NodosModel.length; i++){ // get all the node names in "model" array
					var obj = JSON.parse(NodosModel[i]);
					var nodo_aux = Object.keys(obj)[0];
					nodos.push(nodo_aux);
				}	
				if (nodos.indexOf(nodo) == -1){ // if the node exists in "model" array but does not in meta, request the meta data
					var topic = 'Home/';
					topic = topic.concat(nodo);
					topic = topic.concat('/model_req');	
					client.publish(topic, "req");
					return; // go out the function
					
				}
				nodos = []; //cleaning the "nodos" variable to use it later
				
				// create the json objetc to meta data
				var nodo_obj = '';
				nodo_obj = '{"';
				nodo_obj = nodo_obj.concat(nodo);
				nodo_obj = nodo_obj.concat('":');
				nodo_obj = nodo_obj.concat(message.toString());
				nodo_obj = nodo_obj.concat('}');
			
				// "latency_avg" contains the latency param for all of the nodes so the app search the current node to obtain its latency param
				for (var j = 0; j<latency_avg.length; j++){
					var obj = JSON.parse(latency_avg[j]);
					var nodo_aux1 = obj.nodo;
					var lat = obj.lat_avg;

					if (nodo == nodo_aux1){ // if the param it is no ready for the node still, the meta data object won't be created
					
						var obj = JSON.parse(nodo_obj);
						obj[nodo]["lat"] = lat.toString();
						nodo_obj = JSON.stringify(obj); // creation of the json object
						
						var millis = new Date().getTime();
						obj[nodo]["time"] = millis; //addes the timestamp to database storage

						var document= "meta_";
						document = document.concat(nodo); // name of the document
						db.collection(document).insert(obj[nodo]);	// insert the metadata	in database				


					}
				}
				
				// if there is not any object in the model array, push the first one
				if(NodosMeta.length == 0){
					NodosMeta.push(nodo_obj);
				}
				else{
					for (var i = 0; i<NodosMeta.length; i++){ // this loop get all node names in the array to check if the currect node already exist in it
						var obj = JSON.parse(NodosMeta[i]);
						var nodo_aux = Object.keys(obj)[0];
						nodos.push(nodo_aux);
					}

					if (nodos.indexOf(nodo) != -1){ //if the node already exists, the app replace the objetc
						NodosMeta[nodos.indexOf(nodo)] = nodo_obj;
					}else{ // else, push a new json object
						NodosMeta.push(nodo_obj);			
				}
				}
				
				//cleaning the variables
				nodos = [];
				// call the function to calculate the storage nodes
				Nodes();
			}
			
			// if the replies to the request are received. It is used to calculate the latency param
			if (channel == "reply"){
				
				var token_aux = message.toString(); //this token it is used like request-reply identification
				
				for (var i = 0; i<requests.length; i++){ // search in the request array the specific request
					
					var obj = JSON.parse(requests[i]);
					var token = obj.token;
					
					if (token_aux == token){ // now the token is used
						var time = obj.time; //time when the request was send
						var _nodo = obj.nodo;
						var now = new Date();
						var milis = now.getTime(); //current time
						var dif = milis - time;	// latency 
						
						//the latency array is used to calculate the latency average in averageLatency_daemon function
						if(latency.length == 0){ // if the array is empty, push the node latency data the very first time
							var nodo_obj = '';
							nodo_obj = '{"nodo" : "';
							nodo_obj = nodo_obj.concat(_nodo);
							nodo_obj = nodo_obj.concat('", "lat" : "'); 
							nodo_obj = nodo_obj.concat(dif); // latency for one reply
							nodo_obj = nodo_obj.concat('", "tot" : "1" }'); //number of the replies to calculate the average
							latency.push(nodo_obj);
						}
						else { // if the node already exists, the values are updated

							for (var j = 0; j<latency.length; j++){ // get the  node names to seach the specific one
								var obj = JSON.parse(latency[j]);
								var nodo_aux = obj.nodo;
								nodos.push(nodo_aux);
							}
							if (nodos.indexOf(_nodo) != -1){ // the node exists so the values are updated

								var obj = JSON.parse(latency[nodos.indexOf(_nodo)]);
								var lat = obj.lat;
								var lat_total = parseInt(lat) + dif; // the app added all the latency param to calculate the average with "tot" param
								var tot = parseInt(obj.tot) + 1; // add by one each time a new latency value is added
								
								latency.splice(nodos.indexOf(_nodo),1); //delete the current data and create the new one
								nodo_obj = '{"nodo" : "';
								nodo_obj = nodo_obj.concat(_nodo);
								nodo_obj = nodo_obj.concat('", "lat" : "'); 
								nodo_obj = nodo_obj.concat(lat_total);
								nodo_obj = nodo_obj.concat('", "tot" : "');
								nodo_obj = nodo_obj.concat(tot);
								nodo_obj = nodo_obj.concat('" }');
								latency.push(nodo_obj);
							}else{ // if the node does not exist, just push the new one
								var nodo_obj = '';
								nodo_obj = '{"nodo" : "';
								nodo_obj = nodo_obj.concat(_nodo);
								nodo_obj = nodo_obj.concat('", "lat" : "'); 
								nodo_obj = nodo_obj.concat(dif);
								nodo_obj = nodo_obj.concat('", "tot" : "1" }');
								latency.push(nodo_obj);		
							}
						}
						//delete the current request in "requests" array
						requests.splice(i,1);
					}
				}
				
				//cleaning the variables
				nodos = [];
			}
			
		db.close();
		});
		
		if (channel == "query"){
			console.log(message.toString());
			var nodo_src = nodo;
			var q_obj = JSON.parse(message.toString());
			var query_id = q_obj.query_id;	
			var param = q_obj.param;			
			var nodo_dst = q_obj.nodo;			
			var gt = parseInt(q_obj.timeInit);			
			var lt = parseInt(q_obj.timeEnd);

			//	Use connect method to connect to the Server
				MongoClient.connect(url, function (err, db) {
				if (err) {
					console.log('Unable to connect to the mongoDB server. Error:', err);
				} else {
				//	HURRAY!! We are connected. :)
					console.log('Connection established to', url);

				//	Get the documents collection
				var collection = db.collection('nodes');

				//Insert some users
				collection.find({"time" : {$gt: gt, $lt: lt }}).toArray(function (err, result) {
				
					var total_stg_nodes = [];
				
				  if (err) {
					console.log(err);
				  } else if (result.length) {
					//console.log('Found:', result);
				 
				 for (var i = 0; i<result.length; i++){
				
					var json = result[i];
					var stg_nodes = json.stg_nodes;
					for (var j = 0; j<stg_nodes.length; j++){
				
					if(total_stg_nodes.indexOf(stg_nodes[j]) == -1){ // If the node is not in the list of current storage nodes, it is included
						total_stg_nodes.push(stg_nodes[j]);
					}
						
					}
				 }
				   var nodes = "";
				   var nodes_array = [];
				   for (var i = 0; i<total_stg_nodes.length; i++){
					   nodes = nodes.concat("<");
					   nodes = nodes.concat(total_stg_nodes[i]);
					   nodes = nodes.concat(">");
					   nodes_array.push(total_stg_nodes[i]);
				   }

					var topic = 'Home/'; // topic is created with the node name
					topic = topic.concat(nodes);
					topic = topic.concat('/r_query');
					var stg_query = JSON.stringify(q_obj); // creation of the json object
					var query_obj = '';
					query_obj = '{"nodo" : "';
					query_obj = query_obj.concat(nodo_dst);
					query_obj = query_obj.concat('", "param" : "'); 
					query_obj = query_obj.concat(param);
					query_obj = query_obj.concat('", "q_nodes" : "'); 
					query_obj = query_obj.concat(nodes_array);					
					query_obj = query_obj.concat('", "q_id" : "'); 
					query_obj = query_obj.concat(query_id);
					query_obj = query_obj.concat('", "nodo_src" : "'); 
					query_obj = query_obj.concat(nodo_src); 					
					query_obj = query_obj.concat('"}'); 
					Queries.push(query_obj);
					client.publish(topic,stg_query); // the query is published
					var now = new Date();
					var milis = now.getTime();
					r_Queries.push(stg_query);
					
					for (var i = 0; i < nodes_array.length; i++ ) {
						
					query_obj = '{"nodo" : "';
					query_obj = query_obj.concat(nodes_array[i]);
					query_obj = query_obj.concat('", "timestamp" : "'); 
					query_obj = query_obj.concat(milis);					
					query_obj = query_obj.concat('", "q_id" : "'); 
					query_obj = query_obj.concat(query_id);
					query_obj = query_obj.concat('", "attempt" : "0"}'); 	
					
					query_attempt.push(query_obj);
					
					}
				   
				  } else {
					console.log('No document(s) found with defined "find" criteria!');
				  }
				  
				 // Close connection
				  db.close();
				});
			  }
			});
		}
		
		if (channel == "q_reply"){
			
			var q_obj = JSON.parse(message.toString());
			var q_id = q_obj.query_id;
			var timestamp = q_obj.timestamp;
			var val = q_obj.val;
			var collection_name = "coll_";
			collection_name = collection_name.concat(q_id);
			//delete q_obj["query_id"];

			if(val == "eof"){
				var node_r = q_obj.node;
				var query = searchQuery(q_id);
				var r_nodes = query[2];
				var nodo_src = query[3];
				var n = r_nodes.indexOf(nodo);
				var nodes_array = [];
				nodes_array = r_nodes.split(",");

				if (n !== -1){
	
					var s_eof = '{"nodo" : "'; 
					s_eof = s_eof.concat(nodo);
					s_eof = s_eof.concat('", "q_id" : "');
					s_eof = s_eof.concat(q_id);
					s_eof = s_eof.concat('"}');
					eof.push(s_eof);
					deleteAttempt(q_id,nodo);
				}
				
				var eoq = false;
				for(var i = 0; i<nodes_array.length; i++){
					
					var _eof = searchEof(q_id,nodes_array[i])
					if (_eof === false){break;}
					else{eoq = true};
				}
				
				if (eoq == true){
					console.log("end of file");
					var topic = 'Home/'; // topic is created with the node name
					topic = topic.concat(nodo_src);
					topic = topic.concat('/response');
					//	Use connect method to connect to the Server
					MongoClient.connect(url, function (err, db) {
						if (err) {
							console.log('Unable to connect to the mongoDB server. Error:', err);
						} else {

						//	Get the documents collection
						var collection = db.collection(collection_name);

						collection.find().sort({"timestamp": 1}).toArray(function (err, result) {
					
						  if (err) {
							console.log(err);
						  } else if (result.length) {
							for (var i=0; i<result.length; i++){
								delete result[i]._id;
								var stg_result = JSON.stringify(result[i]);
								client.publish(topic,stg_result);
								
							}
							var msg_eoq = '{"val" : "eof",  "query_id" : "'+q_id+'"}';
							client.publish(topic,msg_eoq);
							collection.drop();
						  } else {
							console.log('No document(s) found with defined "find" criteria!');
						  }
						  
						 // Close connection
						  db.close();
						});
					  }
					});
					cleanUp(q_id);	
				}
			
			}
			else{
				var query = searchQuery(q_id);
				var r_nodo = query[0];
				var param = query[1];
				var unit = searchUnit (r_nodo,param); // unit for that param
				q_obj["nodo"] = r_nodo;
				q_obj["param"] = param;
				q_obj["unit"] = unit;
				
				//console.log(q_obj);
				MongoClient.connect(url, function (err, db) {
					if (err) {
						console.log('Unable to connect to the mongoDB server. Error:', err);
					} else {
						//HURRAY!! We are connected. :)
						//console.log('Connection established to', url);
						db.collection(collection_name).update({"timestamp": timestamp}, q_obj, {upsert: true});
					}
					
				db.close();
				});
			}
		}
	});
	
}

//this function search all meta data and the units and group them to call the function that calculate the storage nodes
function Nodes (){
	//console.log(NodosMeta);
	//console.log(NodosModel);

	for (var i = 0; i<NodosMeta.length; i++){ //loop to get the node names
		var obj = JSON.parse(NodosMeta[i]);
		var keys_nodes = Object.keys(obj);
		for (var j = 0; j < keys_nodes.length; j++) { //for each node, get the parameters names
			var nodes = obj[keys_nodes[j]];
			var keys_params = Object.keys(nodes);
			for (var k = 0; k < keys_params.length; k++) { //for each param, get the value and search its unit in "model" array
				var val = nodes[keys_params[k]]; // value for a specific param
				var unit = searchUnit (keys_nodes[j],keys_params[k]); // unit for that param
				addParam (keys_params[k], val, unit); // this function group all the values to compare with the other nodes parameters
				
			}
		}
		
	}
	
	getNodes (parameters);	// calling to the function that really calculates the nodes
	
};

// this fuction search the unit for a specific parameter that belongs to a specific node
function searchUnit (nodo,param){
	
	for (var i = 0; i<NodosModel.length; i++){
		var obj = JSON.parse(NodosModel[i]);
		if (Object.keys(obj) == nodo ){
			var unit = obj[nodo][param];
		}
	}
	
	return unit;
};

function searchQuery (query_id){
	
	for (var i = 0; i<Queries.length; i++){
		var obj = JSON.parse(Queries[i]);
		if (obj.q_id == query_id ){
			var nodo = obj.nodo;
			var param = obj.param;
			var nodes = obj.q_nodes;
			var nodo_src = obj.nodo_src;
		}
	}
	
	return [nodo, param, nodes, nodo_src];
};


function searchOriginalQuery (query_id) {
	var query = '';
	var index = 0;
	for (var i = 0; i<r_Queries.length; i++){
		var obj = JSON.parse(r_Queries[i]);
		if (obj.query_id == query_id){
			query = r_Queries[i];
			index = i;
			break;
		}
		
	}
	
	return [query,index];
	
}
function searchEof (query_id, nodo){
	var _eof = false;
	
	for (var i = 0; i<eof.length; i++){
		var obj = JSON.parse(eof[i]);
		if (obj.q_id == query_id && obj.nodo == nodo){
			_eof = true;
			break;
		}
	}
	
	return _eof;
};

function deleteAttempt(query_id,nodo){
	
	for (var i = 0; i<query_attempt.length; i++){
		var obj = JSON.parse(query_attempt[i]);
		if (obj.q_id == query_id && obj.nodo == nodo){
			query_attempt.splice(i,1);
			break;
		}
	}
}

function cleanUp (query_id){
	
	for (var i = 0; i<Queries.length; i++){
		var obj = JSON.parse(Queries[i]);
		if (obj.q_id == query_id ){
			Queries.splice(i,1);
		}
	}
	for (var i = 0; i<eof.length; i++){
		var obj = JSON.parse(eof[i]);
		if (obj.q_id == query_id ){
			eof.splice(i,1);
		}
	}
};
// this function change the values to a default value and group them in specific array to each parameter that is used in the app to calculate the sorage nodes
function addParam (param, valu, unit){
	switch(param)
	{
	case "mem": // this case is for the memory parameter
		
		switch(unit) // the value is going to be in Mb.
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
			valu = 0;
		}
		Mem.push(valu);
		break;
	  
	case "proc": // this case is for the proccess capacity parameter. This param hasn't unit
		
		valu = parseFloat (valu);
		Proc.push(valu);
		
	  break;
	  
	case "batt": // this case is for the battery level parameter
	
		switch(unit) // the value is going to be in Volts.
		{
		case "V":
			valu = parseFloat (valu); //By default the unit for the battery is V
			break;
		case "mV":
			valu = valu/1000;
			break;
		case "noUnit": // this case is for the nodes thant has no battery
			valu = valu;
			break;	

		default:
			valu = 0;
		}
		Batt.push(valu);
		break;
	  
	case "lat": //this case is for the latency parameter
		switch(unit) // the value is going to be in seconds
			{
			case "seg":
				valu = parseFloat (valu); // by default the unit for the latency is seconds
				break;
			case "mseg":
				valu = valu/1000;
				break;
			default:
				valu = 0;
			}
			Lat.push(valu);
			break;
			
	case "power": // case for the power parameter. It indicates if the nodes is feed directly or not
			
		Power.push(valu);
		
		break;

	case "freeRAM": // case for the free RAM memory in the node
		
		switch(unit) // the value is going to be in Mb
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
			valu = 0;
		}
		FreeRAM.push(valu);
		break;
		
	default:
	  console.log("Erro to add the parameters")
	}	

};

// This function makes calculations for the storage nodes
function getNodes (param){
	var aux =[];
	var result = [];
	
	// takes json objetct parameters
	var weightMem = param.weightMem;
	var weigthProc = param.weigthProc;
	var weigthBatt = param.weigthBatt;
	var weigthLat = param.weigthLat;
	var weigthPower = param.weigthPower;
	var weigthRAM = param.weigthRAM;
	var numberNodes = param.numberNodes;
	
	if(weightMem != undefined) //check if there weight for this parameter
	{
		for(var i = 0; i < Mem.length; i++){ // through the loop to get the part that provides memory
			aux[i] = (Mem[i]/Math.max.apply(null,Mem))*weightMem; // calculates the percentage and multiply it by the weight
			result [i] = 0; // because of it is the fist one
			result [i] = result [i] + aux[i]; //added to the result for this specific node
		}
	}

	if(weigthProc != undefined) //check if there weight for this parameter
	{
		for(var i = 0; i < Proc.length; i++){ // through the loop to get the part that provides the process capacity
			aux[i] = (Proc[i]/Math.max.apply(null,Proc))*weigthProc; // calculates the percentage and multiply it by the weight
			result [i] = result [i] + aux[i]; //added to the result for this specific node
		}
	}
	
	if(weigthBatt != undefined) //check if there weight for this parameter
	{
		for(var i = 0; i < Batt.length; i++){ // through the loop to get the part that provides the battery
			if (Batt[i] == "-1"){ // if the node is feeded directly
				aux[i] = parseFloat(weigthBatt);
				result [i] = result [i] + aux[i]; //added to the result for this specific node

			}
			else { // we proceed as usual
				aux[i] = (Batt[i]/Math.max.apply(null,Batt))*weigthBatt;  // calculates the percentage and multiply it by the weight
				result [i] = result [i] - aux[i]; //added to the result for this specific node

			}
		}
	}

	if(weigthLat != undefined) //check if there weight for this parameter
	{
		for(var i = 0; i < Lat.length; i++){ // through the loop to get the part that provides the latency
			aux[i] = (Lat[i]/Math.max.apply(null,Lat))*weigthLat; // calculates the percentage and multiply it by the weight
			result [i] = result [i] - aux[i]; //added to the result for this specific node
		}
	}	

	if(weigthPower != undefined) //check if there weight for this parameter
	{
		for(var i = 0; i < Power.length; i++){  // through the loop to get the part that provides the power parameter
			aux[i] = Power[i]*weigthPower;	  // calculates the percentage and multiply it by the weight
			result [i] = result [i] + aux[i]; //added to the result for this specific node

		}
	}	

	if(weigthRAM != undefined) //check if there weight for this parameter
	{	
		for(var i = 0; i < FreeRAM.length; i++){ // through the loop to get the part that provides the free RAM parameter
			aux[i] = (FreeRAM[i]/Math.max.apply(null,FreeRAM))*weigthRAM;  // calculates the percentage and multiply it by the weight
			result [i] = result [i] + aux[i]; //added to the result for this specific node
		}
	}
	
	
	for (var i = 0; i<NodosModel.length; i++){ // get the node names
		var obj = JSON.parse(NodosModel[i]);
		var nodo_aux = Object.keys(obj)[0];
		Nodos_gl.push(nodo_aux);
	}
	var totalNodes = Nodos_gl.slice(0, Nodos_gl.length);
	var nextStgNodes = []; // next storage nodes
	if (numberNodes <= result.length){ // we want to have less number of storage nodes than we have
		for (var i = 0; i < numberNodes; i++){
			nextStgNodes.push(Nodos_gl[result.indexOf(Math.max.apply(null,result))]); // adds the node with better punctuation to nextStgNodes
			Nodos_gl.splice(result.indexOf(Math.max.apply(null,result)), 1); // delete the previous node for nodos_gl array 
			result.splice(result.indexOf(Math.max.apply(null,result)), 1); // delete the previus node for result array 
		}
	}
	else { // we want to have grater number of storage nodes than we have
		for (var i = 0; i < result.length; i++){
			nextStgNodes.push(Nodos_gl[result.indexOf(Math.max.apply(null,result))]); // adds the node with better score
			Nodos_gl.splice(result.indexOf(Math.max.apply(null,result)), 1); // delete the previous node for nodos_gl array 
			result.splice(result.indexOf(Math.max.apply(null,result)), 1); // delete the previus node for result array 
		}
	}
	updateStgNodes(nextStgNodes, totalNodes); // communicates  which nodes have to store and which have not
	Nodos_gl = [];
	nextStgNodes = [];
	totalNodes = [];
	// cleaning the parameter array
	Mem = []; 
	Proc = []; 
	Batt = []; 
	Lat = []; 
	Power = [];
	FreeRAM = [];
}


//This function is responsible for communicating to the nodes what to do
function updateStgNodes (nextStgNodes, totalNodes){
	console.log("...................................");
	console.log(nextStgNodes);
	console.log("..........DE..............");
	console.log (totalNodes);
	console.log("...................................");
	//first, the application informs the nodes that they have to subscribe to the channel to which you all the information must be stored
	for(var i = 0; i < nextStgNodes.length; i++){ 

			var msg = '{"nodo" : "'; // the message is created
			msg = msg.concat(nextStgNodes[i]);
			msg = msg.concat('", "op" : "sub" }');
			
		if(currentStgNodes.indexOf(nextStgNodes[i]) == -1){ // If the node is not in the list of current storage nodes, it is included
			currentStgNodes.push(nextStgNodes[i]);
		}

		client.publish("Home/nodo_central/ctrl", msg); // the order is published
	
	}
	

	for(var i = 0; i < currentStgNodes.length; i++){

		if(nextStgNodes.indexOf(currentStgNodes[i]) == -1){ // If the node is not in the list of next storage nodes, it is deleted and send the unpublish message
			
			var msg = '{"nodo" : "'; // the unsubscribe order is create
			msg = msg.concat(currentStgNodes[i]);
			msg = msg.concat('", "op" : "unsub" }');
			client.publish("Home/nodo_central/ctrl", msg); //the order is published
			currentStgNodes.splice(i,1); //the node is deleted for the current storage nodes list
		}
	}

	//Connects to the db to store the current storage nodes and the timestamp associated
	MongoClient.connect(url, function(err, db) {
		if(err) { return console.dir(err); }
		
		var obj = JSON.parse('{}');
		var now = new Date();
		var milis = now.getTime();
		obj["time"] = milis;
		obj["stg_nodes"] = currentStgNodes;
		obj["total_nodes"] = totalNodes;
		db.collection('nodes').insert(obj);					
		db.close();
	});		
}

// this fuctin is responsible to send request to every single node to calculate, later, the latency parameter
function request_daemon (){

	var interval = setInterval(function() { // it sends a request for every node
		for (var i = 0; i<NodosMeta.length; i++){
			var obj = JSON.parse(NodosMeta[i]);
			var keys_nodes = Object.keys(obj);

			var token = getRandomInt(100,1000);	// a token is created to identify the request when the reply come back
			var now = new Date();
			var milis = now.getTime(); // keeps the current timestamp to calculate the difference with the reply
			
			var json_req = '{"nodo" : "'; // this json object store the request status to compare with the reply
			json_req = json_req.concat(keys_nodes[0]);
			json_req = json_req.concat('", "token" : "');
			json_req = json_req.concat(token);
			json_req = json_req.concat('", "time" : "');
			json_req = json_req.concat(milis);
			json_req = json_req.concat('", "attempt" : "0"}');
			requests.push(json_req); // the json object is pushed to "request" array
			
			var topic = 'Home/'; // topic is created with the node name
			topic = topic.concat(keys_nodes[0]);
			topic = topic.concat('/request');
			client.publish(topic, token.toString()); // the request is published
		}
	}, 5000); // every 5 seconds a request is sended

}

// this function is responsible to clean the request that has not been replied or has been replied too late. If there is not 
// reply, the metadata that belongs to that node is removed to recalculate the storage nodes
function clean_daemon(){
	var interval = setInterval(function() {
		for (var i = 0; i<requests.length; i++){ // for every request, checks if the difference with the current time is greater than a certain value
			var obj = JSON.parse(requests[i]);
			var time = obj.time;
			var nodo = obj.nodo;
			var token = obj.token;
			var attempt = obj.attempt;
			var now = new Date();
			var milis = now.getTime();
			var dif = milis - time;
			if (dif >= 2000){
				
				if (attempt == 0){
					obj.attempt = 1;
					var now = new Date();
					var milis = now.getTime();
					obj.time = milis;
					requests[i] = JSON.stringify(obj);
					var topic = 'Home/'; // topic is created with the node name
					topic = topic.concat(nodo);
					topic = topic.concat('/request');
					client.publish(topic, token.toString()); // the request is published
					
				}else{
					for (var j = 0; j<NodosMeta.length; j++){
						var obj_meta = JSON.parse(NodosMeta[j]);
						var keys_nodes = Object.keys(obj_meta);
						if (nodo == keys_nodes[0]){					
							NodosMeta.splice(j,1); // the metadata for this node is removed
							break;
						}
					}
					
					for (var j = 0; j<NodosModel.length; j++){
						var obj_model = JSON.parse(NodosModel[j]);
						var keys_nodes = Object.keys(obj_model);
						if (nodo == keys_nodes[0]){					
							NodosModel.splice(j,1); // the model for this node is removed
							break;
						}
					}
					Nodes ();
					requests.splice(i,1); // this specific request is deleted
				}
			}
		}
	}, 2000);
}

//this function calculates the average latency for a specific node to avoid punctual fluctuations
function averageLatency_daemon(){
	var nodos = [];
	var interval = setInterval(function() {
		for (var i = 0; i<latency.length; i++){ // goes through the latency array to calculate the average for a specific node
			var nodos = [];
			var obj = JSON.parse(latency[i]);
			var nodo =obj.nodo;
			var lat = parseInt(obj.lat);
			var tot = parseInt(obj.tot);
			var lat_avg = lat/tot; // this value will be used to include it in metadata object for this node
			latency.splice(i,1);
			
			
			if(latency_avg.length == 0){ // if it is the very fist nodo, just push the "latency_avg" param
				var nodo_obj = '';
				nodo_obj = '{"nodo" : "';
				nodo_obj = nodo_obj.concat(nodo);
				nodo_obj = nodo_obj.concat('", "lat_avg" : "');
				nodo_obj = nodo_obj.concat(lat_avg);
				nodo_obj = nodo_obj.concat('"}');
				latency_avg.push(nodo_obj);
			}
			else { // check if the nodo already exists and update the value or push a new object

				for (var j = 0; j<latency_avg.length; j++){
					var obj = JSON.parse(latency_avg[j]);
					var nodo_aux = obj.nodo;
					nodos.push(nodo_aux);
				}
				if (nodos.indexOf(nodo) != -1){ // already exists

					latency_avg.splice(nodos.indexOf(nodo),1);
					var nodo_obj = '';
					nodo_obj = '{"nodo" : "';
					nodo_obj = nodo_obj.concat(nodo);
					nodo_obj = nodo_obj.concat('", "lat_avg" : "'); 
					nodo_obj = nodo_obj.concat(lat_avg);
					nodo_obj = nodo_obj.concat('"}');
					latency_avg.push(nodo_obj);
				}else{ // add new object to "latency_avg" param
				
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
	
	}, 30000); // the average is calculated in a 30 seconds period
}

function time_daemon (){

	var interval = setInterval(function() {
		
			var millis = new Date().getTime();;
			client.publish("Home/nodo_central/time", millis.toString());

		
	}, parseInt(global.config.node.send_time)); 

}

function query_daemon (){

	var interval = setInterval(function() {
		
	for (var i = 0; i<query_attempt.length; i++){
		var obj = JSON.parse(query_attempt[i]);
			var time = parseInt(obj.timestamp);
			var attempt = parseInt(obj.attempt);
			var nodo = obj.nodo;
			var q_id = obj.q_id;
			var now = new Date();
			var milis = now.getTime();
			var dif = milis - time;

			if (dif > 4000){
				var aux = searchOriginalQuery (q_id);
				var query = aux [0];
				var index = aux [1];
				if (attempt < 1){
					obj.attempt = attempt + 1;
					var aux_obj = JSON.stringify(obj);
					query_attempt[i]=aux_obj;										
					var topic = 'Home/<'; // topic is created with the node name
					topic = topic.concat(nodo);
					topic = topic.concat('>/r_query');
					client.publish(topic, query);
				}else{
					var s_eof = '{"nodo" : "'; 
					s_eof = s_eof.concat(nodo);
					s_eof = s_eof.concat('", "q_id" : "');
					s_eof = s_eof.concat(q_id);
					s_eof = s_eof.concat('"}');
					eof.push(s_eof);
					query_attempt.splice(i,1);
					r_Queries.splice(index,1);
				}
			}
		}
		
	}, 5000); 

}

function getRandomInt(min, max) { // just a function to calculate a random integer
  return Math.floor(Math.random() * (max - min)) + min;
}

function create_conf (){

global.url = "mongodb://";
url = url.concat(global.config.db.host);
url = url.concat(":");
url = url.concat(global.config.db.port);
url = url.concat("/");
url = url.concat(global.config.db.database);

}

// export the functions that are being used in app.js program

exports.averageLatency_daemon = averageLatency_daemon;
exports.time_daemon = time_daemon;
exports.query_daemon = query_daemon;
exports.clean_daemon = clean_daemon;
exports.getModel_Meta = getModel_Meta;
exports.request_daemon = request_daemon;
exports.newConection = newConection;
exports.Nodes = Nodes;