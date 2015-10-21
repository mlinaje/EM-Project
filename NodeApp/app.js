var mqtt = require('./functions')
	,host = '127.0.0.1' // or localhost
	,port = 1883
	,keepalive =10000;
	
	
mqtt.newConection(port, host, keepalive);  
mqtt.checkStatus('istate', 'Nodo_mcu', function (topic, message){
		var jsonObj = JSON.parse(message.toString());
		console.log ("Temperatura: ");
		console.log(jsonObj.Temp);
		console.log ("Humedad: ");
		console.log(jsonObj.Hum);
		console.log ("Segundos: ");
		console.log(jsonObj.Time);
});
  
mqtt.checkStatus('model', '+', function (topic, message){
		var topic_str = topic.toString();
		var jsonObj = JSON.parse(message.toString());
		console.log ("Topic: ");
		console.log(topic_str);
		console.log ("Temperatura: ");
		console.log(jsonObj.Temp);
		console.log ("Humedad: ");
		console.log(jsonObj.Hum);
		console.log ("Segundos: ");
		console.log(jsonObj.Time);
});  
mqtt.updateStatus('meta', 'Raspberry','HelloBro');
