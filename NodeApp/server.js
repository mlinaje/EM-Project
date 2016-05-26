// Global variables
global.config = require('./conf/config');

//import express package
var express = require("express");

//lets require/import the mongodb native drivers.
var mongodb = require('mongodb');

//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;

// Connection URL. This is where your mongodb server is running.
var url = 'mongodb://localhost:27017/nodo_ctl_db';
var responseArray = [];
var numberOfNodes = 0;
//DB Object
var dbObject;


MongoClient.connect(url, function(err, db){
  if ( err ) throw err;
  dbObject = db;
});

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

//create express app
var app = express();

//NPM Module to integrate Handlerbars UI template engine with Express
var exphbs  = require('express-handlebars');

//Declaring Express to use Handlerbars template engine with main.handlebars as
//the default layout
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

//Defining middleware to serve static files
app.use('/public', express.static('public'));

app.get("/", function(req, res){
  res.render("chart");
});

app.get("/nodes", function(req, res){
  getData(res);
});

app.get("/prueba", function(req, res){
  console.log(req.query);
  console.log(req.query.init);
  console.log(req.query.fin);
  res = "";
});


app.listen("8080", function(){
  console.log('Server up: http://localhost:8080');
});
