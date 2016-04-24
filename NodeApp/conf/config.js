var config = {
  db: {
    host: '127.0.0.1',
    user: 'root',
    password: '123456',
    database: 'nodo_ctl_db',
    port: 27017
  },
  mqtt: {
    host: 'localhost',
    user: 'alfonso',
    password: 'admin',
	port: 1883,
    keepalive: 10000
  },
  node: {
	nodeID: 'ctl',
    prefix: 'Home',
	send_time: 5000
  },
  parameters: {
	weightMem :"0.1",
	weigthProc :"0.5",
	weigthBatt :"0.1",
	weigthLat :"0.1",
	weigthPower :"0.1",
	weigthRAM: "0.1",
	numberNodes: "2"
  }	
  };
 
module.exports = config;