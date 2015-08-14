var mqtt = require('./functions')
	,host = '127.0.0.1' // or localhost
	,port = 1883
	,keepalive =10000;
	
	
mqtt.newConection(port, host, keepalive);  
mqtt.updated('meta', 'arduino1');
  
/* client.subscribe('mqtt-transport/MyThingID/meta');
client.on('message', function(topic, message) {
  var jsonObj = JSON.parse(message.toString());
  console.log(jsonObj.first);
  console.log(jsonObj.last);
}); */
