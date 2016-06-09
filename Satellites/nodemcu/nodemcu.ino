#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// include the SD library:
#include <SPI.h>
#include <SD.h>

#include "DHT.h" //cargamos la librería DHT
#define DHTPIN 5 //Seleccionamos el pin en el que se //conectará el sensor
#define DHTTYPE DHT11 //Se selecciona el DHT11 (hay //otros DHT)
DHT dht(DHTPIN, DHTTYPE, 20); //Se inicia una variable que será usada por Arduino para comunicarse con el sensor


// set up variables using the SD utility library functions:
Sd2Card card;
SdVolume volume;
SdFile root;

// Update these with values suitable for your network.

const char* ssid = "My_AP";
const char* password = "raspberry";
const char* mqtt_server = "192.168.42.1";
File myFile;
File myFileRead;
WiFiClient espClient;
PubSubClient client(espClient);
char *status_sensors;
char meta_aux[50];
char sen_aux[40];
char *status_meta;
float h;
float t;
String prefix = "Home";
String nodeID = "5";
int capacity = 7753728;
int busy = 0;
File root_2;
int freeSpace = 0;
long local_time = 0;
long real_time = 0;
int count = 0;
String fixed_time;

void setup() {
  Serial.begin(115200);
  dht.begin(); //Se inicia el sensor
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
  
  if (!SD.begin(4)) {
     Serial.println("initialization failed!");
    return;
  }
   Serial.println("initialization done.");
  
   root_2 = SD.open("/");
}

void setup_wifi() {

  delay(10);
  // We start by connecting to a WiFi network

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
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
          if (nodo_str == nodeID){
              if (op_str == "sub"){
                  client.subscribe("Home/+/istate", 1);
              }
              else {
                if (op_str == "unsub"){
                  client.unsubscribe("Home/+/istate");
                }                 
              }
          }
    return;
    }
  if (channel == "request"){
     client.publish("Home/5/reply",payload_char);
     return;
  }
    if (channel == "time"){
      fixed_time = payload_str.substring(0,6);
      String var_time = payload_str.substring (6);
     real_time = var_time.toInt();
     local_time = millis();
     return;
  }
  if (channel == "model_req"){
     client.publish("Home/5/model","{\"nodo\":\"5\",\"timestamp\":\"msec\",\"mem\":\"Mb\",\"temp\":\"C\",\"hum\":\"%\",\"proc\":\"noUnit\",\"batt\":\"mV\",\"power\":\"noUnit\"}");
     return; 
  }    
  if (channel == "istate")
  {
      StaticJsonBuffer<500> jsonBuffer2;
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
          const String &docu = document;    
         myFile = SD.open(docu, FILE_WRITE);
          if (myFile) {
            root2.printTo(myFile);
            myFile.println();
            }
        myFile.close();
        }
      else{
         String document = "model_";
          document = document + nodoTopic;
          document = document + ".txt";
          const String &docu = document; 
         root2["time"]= getTime();

         myFile = SD.open(docu, FILE_WRITE);
          if (myFile) {
            root2.printTo(myFile);
            myFile.println();
            }
            myFile.close();
      }
  }
  if (channel == "r_query"){
    int pos = nodoTopic.indexOf("<5>");
    if ( pos == -1 ){
      }else{
         StaticJsonBuffer<200> jsonBuffer3;
        JsonObject& root3 = jsonBuffer3.parseObject(payload_char);
        
        if (!root3.success()) {
        return;
      }
      const char* nodo = root3["nodo"];
      String nodo_str(nodo);
      const char* par = root3["param"];
      String par_str(par);
      const char* gt = root3["timeInit"];
      String gt_str(gt);
      const char* lt = root3["timeEnd"];
      String lt_str(lt);
      const char* q_id = root3["query_id"];
      String q_id_str(q_id);

      String filename = "META_";
      filename = filename + nodo_str;
      filename = filename + ".TXT";

        char *cstr_name = new char[filename.length()];
        strcpy(cstr_name, filename.c_str());
        if (SD.exists(cstr_name)) {
          Serial.println("it exists.");
           myFileRead = SD.open(cstr_name);
           if (myFileRead) {
           while (myFileRead.available()) {
            String line = myFileRead.readStringUntil('\n');
            
                StaticJsonBuffer<200> jsonBuffer4;
                JsonObject& root4 = jsonBuffer4.parseObject(line);
                if (!root4.success()) {
                continue;
                }
                const char* tmp_v = root4["timestamp"];
                String tmp_v_str(tmp_v);
                if(tmp_v_str.toInt()>= gt_str.toInt() && tmp_v_str.toInt()<= lt_str.toInt()){
                    const char* param_v = root4[par];
                    String param_v_str(param_v);
                    
                    String msg = "{\"val\":\"";
                      msg = msg + param_v_str;
                      msg = msg + "\",\"timestamp\":\"";
                      msg = msg + tmp_v_str;
                      msg = msg + "\",\"query_id\":\"";
                      msg = msg + q_id_str;
                      msg = msg + "\"}";
                      char *cstr_msg = new char[msg.length() + 1];
                      strcpy(cstr_msg, msg.c_str());
                      client.publish("Home/5/q_reply",cstr_msg);
                      delete [] cstr_msg;

                }
           }

            String msg = "{\"val\":\"eof\",\"node\":\"5\",\"query_id\":\"";
            msg = msg + q_id_str;
            msg = msg + "\"}";
            char *cstr_msg = new char[msg.length() + 1];
            strcpy(cstr_msg, msg.c_str());
            client.publish("Home/5/q_reply",cstr_msg);
            delete [] cstr_msg;
                      
          }
          
        } else {
          Serial.println("it doesn't exist.");
        }
          delete [] cstr_name;
        }
    }
}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    // Attempt to connect
    if (client.connect("Nodo_5")) {
      // ... and resubscribe
      client.subscribe("Home/nodo_central/ctrl");
      client.subscribe("Home/5/request");
      client.subscribe("Home/nodo_central/time");
      client.subscribe("Home/5/model_req");
      client.publish("Home/5/model","{\"nodo\":\"5\",\"timestamp\":\"msec\",\"mem\":\"Mb\",\"temp\":\"C\",\"hum\":\"%\",\"proc\":\"noUnit\",\"batt\":\"mV\",\"power\":\"noUnit\"}");
      client.subscribe("Home/+/r_query");
    } else {
      delay(5000);
    }
  }
}

  
int getFreeSpace(File dir, int numTabs) {
   while(true) {
     
     File entry =  dir.openNextFile();
     if (! entry) {
       // no more files
      busy = 0;
      return freeSpace;
       break;
     }
      busy = busy + entry.size();
    freeSpace = capacity-(busy/1024);

}
}

int leer_voltios(){ 
  float  batLevel;
  int batLevelInt;
  batLevel = (analogRead(A0)*3.7)/321;
  batLevelInt =  batLevel*1000;

 return (batLevelInt);
}

String getTime(){
 String timestamp = fixed_time;
 long time_aux;
 long current = millis();
 time_aux = real_time+(current-local_time);
 timestamp = timestamp + time_aux;
 return (timestamp);

}
  
void checkData (){
  
  h = dht.readHumidity(); //Se lee la humedad
  t = dht.readTemperature(); //Se lee la temperatura
  String msg = "{\"temp\":\"";
  msg = msg + t;
  msg = msg + "\",\"hum\":\"";
  msg = msg + h;
  msg = msg + "\",\"timestamp\":\"";
  msg = msg + getTime();
  msg = msg + "\"}";

  char *cstr = new char[msg.length() + 1];
  strcpy(cstr, msg.c_str());
  client.publish("Home/5/istate",cstr, 1);
  delete [] cstr;

  msg = "{\"mem\":\"";
  msg = msg + getFreeSpace(root_2,0);
  msg = msg + "\",\"proc\":\"531\",\"power\":\"0\",\"batt\":\"";
  msg = msg + leer_voltios();
  msg = msg + "\"}";
  char *cstr_1 = new char[msg.length() + 1];
  strcpy(cstr_1, msg.c_str());
  client.publish("Home/5/meta",cstr_1);
  delete [] cstr_1;
  client.publish("Home/5/istate","{\"nodo\":\"5\",\"timestamp\":\"msec\",\"mem\":\"Mb\",\"temp\":\"C\",\"hum\":\"%\",\"proc\":\"noUnit\",\"batt\":\"mV\",\"power\":\"noUnit\"}", 1);
  }


void loop() {

  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  if (count == 100000){
  checkData ();
  count = 0;
  }

  count = count + 1;
   delay (0);
 
}
