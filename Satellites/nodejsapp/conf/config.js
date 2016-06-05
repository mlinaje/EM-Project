var config = {
  db: {
    host: '192.168.1.3',
    user: 'root',
    password: '123456',
    database: 'nodo_1_db',
    port: 27017
  },
  mqtt: {
    host: '192.168.1.3',
    user: 'alfonso',
    password: 'admin',
	port: 1883,
    keepalive: 10000  
  },
  node: {
	nodeID: '1',
    prefix: 'Home',
	update_model: 20000,
	update_meta: 5000,
	update_istate: 5000
  },
  model: '{"nodo":"1","mem":"Kb","proc":"noUnit","timestamp":"s","cpu_usage":"%","swap":"Kb","loadavg":"noUnit","batt":"noUnit","power":"noUnit","freeRAM":"Kb"}',
  parameters: {
	proc: 956,
	power: 1
  }	
  };
 
module.exports = config;