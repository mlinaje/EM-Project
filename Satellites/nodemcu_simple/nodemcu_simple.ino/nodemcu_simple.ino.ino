#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

#include "DHT.h" //cargamos la librería DHT
#define DHTPIN 5 //Seleccionamos el pin en el que se //conectará el sensor
#define DHTTYPE DHT11 //Se selecciona el DHT11 (hay //otros DHT)
DHT dht(DHTPIN, DHTTYPE, 20); //Se inicia una variable que será usada por Arduino para comunicarse con el sensor

int count = 0;
float h;
float t;
long local_time = 0;
long real_time = 0;
String fixed_time;

const char* ssid = "My_AP";
const char* password = "raspberry";

const char* mqtt_server = "192.168.42.1";
WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  delay(10);

  // We start by connecting to a WiFi network

  Serial.println();
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");  
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  dht.begin(); //Se inicia el sensor
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
   pinMode(16, OUTPUT);
   digitalWrite(16, LOW);
   pinMode(4, OUTPUT);
   digitalWrite(4, LOW);
}
void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    // Attempt to connect
    if (client.connect("Nodo_6")) {
      // ... and resubscribe
      Serial.println("conectado....");
      client.subscribe("Home/nodo_central/time");
      client.subscribe("Home/6/ostate");
    } else {
      delay(5000);
    }
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
  

    if (channel == "time"){
      fixed_time = payload_str.substring(0,6);
      String var_time = payload_str.substring (6);
     real_time = var_time.toInt();
     local_time = millis();
     return;
  }
  if (channel == "ostate"){
      StaticJsonBuffer<200> jsonBuffer;
      JsonObject& root = jsonBuffer.parseObject(payload_char);
      if (!root.success()) {;
        return;
      }
      const char* act = root["act"];
      String act_str(act);
      const char* val = root["val"];
      String val_str(val);
          if (act_str == "led_rojo"){
              if (val_str == "on"){
                Serial.println("led rojo on");
                  digitalWrite(16, HIGH);
              }
              else {
                if (val_str == "off"){
                  Serial.println("led rojo off");
                  digitalWrite(16, LOW);
                }                 
              }
          }else {
            if (act_str == "led_azul"){
               if (val_str == "on"){
                Serial.println("led azul on");
                  digitalWrite(4, HIGH);
              }
              else {
                if (val_str == "off"){
                  Serial.println("led azul off");
                  digitalWrite(4, LOW);
                }                 
              }           
            }
          }
     return;
  }
  
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
  Serial.println(cstr);
  client.publish("Home/6/istate",cstr, 1);
  delete [] cstr;
  client.publish("Home/6/istate","{\"nodo\":\"6\",\"timestamp\":\"msec\",\"temp\":\"C\",\"hum\":\"%\"}", 1); 
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

