 var app = require('./functions');
 
// Global variables
global.config = require('./conf/config');	
	
app.newConection(parseInt(global.config.mqtt.port), global.config.mqtt.host, parseInt(global.config.mqtt.keepalive));
 
app.main_callback();
app.loop_meta();
app.loop_istate();
app.loop_model();


