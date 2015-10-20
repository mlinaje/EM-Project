#include <Ethernet.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
// include the SD library:
#include <SPI.h>
#include <SD.h>

#include "DHT.h" //cargamos la librería DHT
#define DHTPIN 5 //Seleccionamos el pin en el que se //conectará el sensor
#define DHTTYPE DHT11 //Se selecciona el DHT11 (hay //otros DHT)
DHT dht(DHTPIN, DHTTYPE); //Se inicia una variable que será usada por Arduino para comunicarse con el sensor
char *status_sensors;

// set up variables using the SD utility library functions:
Sd2Card card;
SdVolume volume;
SdFile root;

// Update these with values suitable for your network.

// Update these with values suitable for your network.
byte mac[]    = {  0xDE, 0xED, 0xBA, 0xFE, 0xFE, 0xED };
IPAddress ip(192, 168, 1, 100);
IPAddress server(192, 168, 1, 3);

File myFile;
EthernetClient ethClient;
PubSubClient client(ethClient);

long lastMsg = 0;
char status_aux[50];
int value = 0;
float h;
float t;
String prefix = "Home";
String nodeID = "Nodo_1";

void setup() {
  Serial.begin(115200);
  dht.begin(); //Se inicia el sensor
  client.setServer(server, 1883);
  client.setCallback(callback);

  Ethernet.begin(mac, ip);
  // Allow the hardware to sort itself out
  delay(1500);
  
  if (!SD.begin(4)) {
    return;
  }
}

void writeSD (char* topic, String msg){
  myFile = SD.open("test.txt", FILE_WRITE);
   
// if the file opened okay, write to it:
  if (myFile) {
  // make a string for assembling the data to log:
  String dataString = "";
  Serial.println("Writting in SD...");
  dataString += "Message arrived [";
  dataString += topic;
  dataString += "] ";
  dataString += msg;
  myFile.println(dataString);
  myFile.close();
  } else {
    // if the file didn't open, print an error:
    Serial.println("error opening test.txt");
  }
  
  }
void callback(char* topic_in, byte* payload, unsigned int length) {

 String topic_str(topic_in);
  Serial.println(topic_str);
  
  payload[length] = '\0';
  String payload_str = String((char*)payload);
  char payload_char[payload_str.length()+1];
  payload_str.toCharArray (payload_char, payload_str.length()+1);

  
  if (topic_str == "/Home/Nodo_central/ctrl"){
      Serial.println ("dentro del if");
//      StaticJsonBuffer<200> jsonBuffer;
//      JsonObject& root = jsonBuffer.parseObject(payload_char);
//      
//      if (!root.success()) {;
//        return;
//      }
//    
//      const char* type = root["type"];
//      String type_str(type);
//      const char* topic_out = root["topic"];
//      const char* op = root["op"];
//      String op_str(op);
//          if (type_str == "mqtt"){
//              if (op_str == "sub"){
//                  client.subscribe(topic_out);
//              }
//              else {
//                  client.unsubscribe(topic_out);
//              }
//          }
//    }
//  else {  
//  //writeSD (topic_in, payload_str);
    }
}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    // Attempt to connect
    if (client.connect("Nodo_Ethernet")) {
      // ... and resubscribe
      client.subscribe("Home/Nodo_central/ctrl");
    } else {
      delay(5000);
    }
  }
}

//void updateStatus (String channel, String nodeID, char *message){
// String topicbuff = prefix +"/"+ nodeID +"/"+ channel;
// char topic[topicbuff.length()+1];
// topicbuff.toCharArray (topic,topicbuff.length()+1);
//  client.publish(topic, message);
//  }

void checkTempAndHum (){
  h = dht.readHumidity(); //Se lee la humedad
  t = dht.readTemperature(); //Se lee la temperatura
  long now = millis();
  now = now/1000;
  snprintf (status_aux, 52, "{\"Temp\":\"%1d\", \"Hum\":\"%2d\", \"Seg\":\"%3d\"}", int (t), int (h), now);

  status_sensors = status_aux;
  
  }

void loop() {

  if (!client.connected()) {
    reconnect();
  }
  client.loop();

   //checkTempAndHum();
   //updateStatus ("istate",nodeID,status_sensors); 
   delay (3000);
 
}
