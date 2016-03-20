var app = require('./functions')
	,host = '127.0.0.1' // or localhost
	,port = 1883
	,keepalive =10000;
	
	
app.newConection(port, host, keepalive);  

app.getModel_Meta();
app.request_daemon();
app.clean_daemon();
app.averageLatency_daemon();
app.query_daemon();
app.time_daemon();