var app = require('./functions')

// Global variables
global.config = require('./conf/config');	
	
app.newConection(parseInt(global.config.mqtt.port), global.config.mqtt.host, parseInt(global.config.mqtt.keepalive)); 

app.getModel_Meta();
app.request_daemon();
app.clean_daemon();
app.averageLatency_daemon();
app.query_daemon();
app.time_daemon();