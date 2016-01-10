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
WiFiClient espClient;
PubSubClient client(espClient);
char *status_sensors;
char meta_aux[50];
char sen_aux[40];
char *status_meta;
float h;
float t;
String prefix = "Home";
String nodeID = "2";
int capacity = 7753728;
int busy = 0;
File root_2;
int freeSpace = 0;
int local_time = 0;
int real_time = 0;
int count = 0;

void setup() {
  Serial.begin(115200);
  dht.begin(); //Se inicia el sensor
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
  
  if (!SD.begin(4)) {
    return;
  }
   root_2 = SD.open("/");
   // user_init();
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
                  client.subscribe("Home/+/istate");
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
     client.publish("Home/2/reply",payload_char);
     return;
  }
    if (channel == "time"){
     real_time = payload_str.toInt();
     local_time = millis();
     return;
  }
  if (channel == "model_req"){
     client.publish("Home/2/model","{\"nodo\":\"2\",\"time\":\"s\",\"mem\":\"Mb\",\"proc\":\"noUnit\",\"batt\":\"mV\",\"power\":\"noUnit\"}");
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
}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    // Attempt to connect
    if (client.connect("ESP8266Client")) {
      // ... and resubscribe
      client.subscribe("Home/nodo_central/ctrl");
      client.subscribe("Home/2/request");
      client.subscribe("Home/nodo_central/time");
      client.subscribe("Home/2/model_req");
      client.publish("Home/2/model","{\"nodo\":\"2\",\"time\":\"s\",\"mem\":\"Gb\",\"proc\":\"noUnit\",\"batt\":\"mV\",\"power\":\"noUnit\"}");
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

int getTime(){
 int timestamp; 
 int current = millis();
 timestamp = real_time+(current-local_time);
 return (timestamp);

}
  
void checkData (){
  
  h = dht.readHumidity(); //Se lee la humedad
  t = dht.readTemperature(); //Se lee la temperatura
  String msg = "{\"temp\":\"";
  msg = msg + t;
  msg = msg + "\",\"tmpU\":\"C\",\"hum\":\"";
  msg = msg + h;
  msg = msg + "\",\"humU\":\"%\",\"time\":\"";
  msg = msg + getTime();
  msg = msg + "\",\"timeU\":\"msec\"}";

  char *cstr = new char[msg.length() + 1];
  strcpy(cstr, msg.c_str());
  client.publish("Home/2/istate",cstr);
  delete [] cstr;

  msg = "{\"mem\":\"";
  msg = msg + getFreeSpace(root_2,0);
  msg = msg + "\",\"proc\":\"531\",\"power\":\"0\",\"batt\":\"";
  msg = msg + leer_voltios();
  msg = msg + "\"}";
  char *cstr_1 = new char[msg.length() + 1];
  strcpy(cstr_1, msg.c_str());
  client.publish("Home/2/meta",cstr_1);
  delete [] cstr_1;
  
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
