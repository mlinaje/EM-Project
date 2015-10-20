var mqtt = require('./functions')
	,host = '127.0.0.1' // or localhost
	,port = 1883
	,keepalive =10000;
	
	
mqtt.newConection(port, host, keepalive);  
mqtt.checkStatus('istate', 'Nodo_1', function (message){
		var jsonObj = JSON.parse(message.toString());
		console.log ("Temperatura: ");
		console.log(jsonObj.Temperature);
		console.log ("Humedad: ");
		console.log(jsonObj.Humidity);
		console.log ("Segundos: ");
		console.log(jsonObj.Segundos);
});
  
mqtt.updateStatus('meta', 'Raspberry','HelloBro');
