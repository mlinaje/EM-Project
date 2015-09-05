var mqtt = require('./functions')
	,host = '127.0.0.1' // or localhost
	,port = 1883
	,keepalive =10000;
	
	
mqtt.newConection(port, host, keepalive);  
mqtt.checkStatus('meta', 'arduino1', function (message){
		var jsonObj = JSON.parse(message.toString());
		console.log ("Nombre: ");
		console.log(jsonObj.first);
		console.log ("Apellido: ");
		console.log(jsonObj.last);
});
  
mqtt.updateStatus('meta', 'Raspberry','HelloBro');
