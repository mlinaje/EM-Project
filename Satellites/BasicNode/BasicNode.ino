#include <Ethernet.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include "DHT.h" //cargamos la librería DHT
#define DHTPIN 5 //Seleccionamos el pin en el que se //conectará el sensor
#define DHTTYPE DHT11 //Se selecciona el DHT11 (hay //otros DHT)
DHT dht(DHTPIN, DHTTYPE); //Se inicia una variable que será usada por Arduino para comunicarse con el sensor

// Update these with values suitable for your network.
byte mac[] = { 0xDE, 0xED, 0xBA, 0xFE, 0xFE, 0xED };
IPAddress ip(192, 168, 1, 100);
IPAddress server(192, 168, 1, 3);

EthernetClient ethClient;
PubSubClient client(ethClient);


int count = 0;
String fixed_time;
long local_time = 0;
long real_time = 0;
float h;
float t;

void setup() {
   pinMode(9, OUTPUT);
   digitalWrite(9, LOW);
   pinMode(8, OUTPUT);
   digitalWrite(8, LOW);
   dht.begin();
  client.setServer(server, 1883);
  client.setCallback(callback);
  Ethernet.begin(mac, ip);
  // Allow the hardware to sort itself out
  delay(1500);
  
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
                  digitalWrite(9, HIGH);
              }
              else {
                if (val_str == "off"){
                  digitalWrite(9, LOW);
                }                 
              }
          }else {
            if (act_str == "led_azul"){
               if (val_str == "on"){
                  digitalWrite(8, HIGH);
              }
              else {
                if (val_str == "off"){
                  digitalWrite(8, LOW);
                }                 
              }           
            }
          }
     return;
  }

}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    // Attempt to connect
    if (client.connect("Nodo_4")) {
      // ... and resubscribe
      Serial.println("conectado....");
      client.subscribe("Home/nodo_central/time");
      client.subscribe("Home/4/ostate");
    } else {
      delay(5000);
    }
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
  client.publish("Home/4/istate",cstr, 1);
  delete [] cstr;
  client.publish("Home/4/istate","{\"nodo\":\"4\",\"timestamp\":\"msec\",\"temp\":\"C\",\"hum\":\"%\"}", 1); 
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
