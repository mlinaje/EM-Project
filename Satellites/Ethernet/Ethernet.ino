#include <Ethernet.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
//#include <SD.h>
#include <SdFat.h>
SdFat sd;

// Update these with values suitable for your network.
byte mac[] = { 0xDE, 0xED, 0xBA, 0xFE, 0xFE, 0xED };
IPAddress ip(192, 168, 1, 100);
IPAddress server(192, 168, 1, 3);

SdFile file;
EthernetClient ethClient;
PubSubClient client(ethClient);


int count = 0;
//String fixed_time;
const char model[] PROGMEM  = {"{\"nodo\":\"4\",\"timestamp\":\"msec\",\"mem\":\"Mb\",\"proc\":\"noUnit\",\"batt\":\"mV\",\"power\":\"noUnit\"}"};
const char istate[] PROGMEM  = {"Home/+/istate"};
const char reply[] PROGMEM  = {"Home/4/reply"};
const char meta[] PROGMEM  = {"Home/4/meta"};
const char ctrl[] PROGMEM  = {"Home/nodo_central/ctrl"};
const char req[] PROGMEM  = {"Home/4/request"};
const char mreq[] PROGMEM  = {"Home/4/model_req"};
const char req_ch[] PROGMEM  = {"Home/4/model_req"};

const char* const string_table[] PROGMEM = {model, istate, reply, meta, ctrl, req, mreq, req_ch};
char buffer[100];

void setup() {
  client.setServer(server, 1883);
  client.setCallback(callback);

  Ethernet.begin(mac, ip);
  // Allow the hardware to sort itself out
  delay(1500);
  
  if (!sd.begin(4)) {
    return;
  }
}

void callback(char* topic_in, byte* payload, unsigned int length) {

 payload[length] = '\0';
  String payload_str = String((char*)payload);
  char payload_char[payload_str.length()+1];
  payload_str.toCharArray (payload_char, payload_str.length()+1);
  String topic_str(topic_in);
  String nodoTopic = topic_str.substring(topic_str.indexOf("/") + 1 ,topic_str.lastIndexOf("/"));
  String channel = topic_str.substring(topic_str.lastIndexOf("/") + 1);
  
  if (channel == "ctrl"){
      StaticJsonBuffer<200> jsonBuffer;
      JsonObject& root = jsonBuffer.parseObject(payload_char);
      
      if (!root.success()) {;
        return;
      }
    
      const char* nodo = root["nodo"];
      String nodo_str(nodo);
      const char* op = root["op"];
      String op_str(op);
          if (nodo_str == "4"){
              if (op_str == "sub"){
                   strcpy_P(buffer, (char*)pgm_read_word(&(string_table[1])));
                  client.subscribe(buffer, 1);
              }
              else {
                if (op_str == "unsub"){
                  strcpy_P(buffer, (char*)pgm_read_word(&(string_table[1])));
                  client.unsubscribe(buffer);
                }                 
              }
          }
    return;
    }
  
  if (channel == "request"){
     strcpy_P(buffer, (char*)pgm_read_word(&(string_table[2])));
     client.publish(buffer,payload_char);
     return;
  }
//
  if (channel == "model_req"){
     strcpy_P(buffer, (char*)pgm_read_word(&(string_table[0])));
     client.publish("Home/4/model",buffer);
     return; 
  }    
  if (channel == "istate")
  {
      StaticJsonBuffer<200> jsonBuffer2;
      JsonObject& root2 = jsonBuffer2.parseObject(payload_char);

      if (!root2.success()) {;
        return;
      }
      const char* nodo = root2["nodo"];
      String nodo_str(nodo);
      if(nodo_str.length() == 0){
         String document = "meta_";
          document = document + nodoTopic;
          document = document + ".txt";
            char *cstr = new char[document.length() + 1];
             strcpy(cstr, document.c_str());
            if (file.open(cstr, O_CREAT | O_WRITE | O_EXCL)) {
              
            root2.printTo(file);
            file.println();
            }
        delete [] cstr;    
        file.close();
        }
      else{
         String document = "model_";
          document = document + nodoTopic;
          document = document + ".txt";

            char *cstr = new char[document.length() + 1];
             strcpy(cstr, document.c_str());
            if (file.open(cstr, O_CREAT | O_WRITE | O_EXCL)) {
              
            root2.printTo(file);
            file.println();
            }
        delete [] cstr;    
        file.close();
      }
  }
}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    // Attempt to connect
    if (client.connect("Nodo_4")) {
      // ... and resubscribe
      strcpy_P(buffer, (char*)pgm_read_word(&(string_table[4])));
      client.subscribe(buffer);
      strcpy_P(buffer, (char*)pgm_read_word(&(string_table[5])));
      client.subscribe(buffer);
      strcpy_P(buffer, (char*)pgm_read_word(&(string_table[6])));
      client.subscribe(buffer);
      strcpy_P(buffer, (char*)pgm_read_word(&(string_table[0])));
      client.publish("Home/4/model",buffer);
    } else {
      delay(5000);
    }
  }
}

uint32_t getFreeSpace() {

  uint32_t freeKB = sd.vol()->freeClusterCount();
  freeKB *= sd.vol()->blocksPerCluster()/2;
  return freeKB;
}


void checkData (){

  String msg = "{\"mem\":\"";

  msg = msg + getFreeSpace();
  msg = msg + "\",\"proc\":\"531\",\"power\":\"1\",\"batt\":\"-1\"}";
  char *cstr = new char[msg.length() + 1];
  strcpy(cstr, msg.c_str());
  strcpy_P(buffer, (char*)pgm_read_word(&(string_table[3])));
  client.publish(buffer,cstr);
  delete [] cstr;
    
  }

  
void loop() {

  if (!client.connected()) {
    reconnect();
  }
  client.loop();

 if (count == 9999){
  checkData ();
  count = 0;
  }

  count = count + 1;
   delay (1);
 
}
