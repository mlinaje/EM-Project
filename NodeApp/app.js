var app = require('./functions')
	,host = '127.0.0.1' // or localhost
	,port = 1883
	,keepalive =10000;
	
	
app.newConection(port, host, keepalive);  
// app.checkStatus('istate', 'Nodo_mcu', function (topic, message){
		// var jsonObj = JSON.parse(message.toString());
		// console.log ("Temperatura: ");
		// console.log(jsonObj.Temp);
		// console.log ("Humedad: ");
		// console.log(jsonObj.Hum);
		// console.log ("Segundos: ");
		// console.log(jsonObj.Time);
// });
  
app.getModel_Meta();
app.request_daemon();
app.clean_daemon();
app.averageLatency_daemon();

