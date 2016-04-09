var app = require('./functions')
	,host = '192.168.1.3' 
	,port = 1883
	,keepalive =10000;
	
	
app.newConection(port, host, keepalive);
 
app.main_callback();
app.main_loop();
app.loop_model();


