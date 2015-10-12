/*
 Basic ESP8266 MQTT example

 This sketch demonstrates the capabilities of the pubsub library in combination
 with the ESP8266 board/library.

 It connects to an MQTT server then:
  - publishes "hello world" to the topic "outTopic" every two seconds
  - subscribes to the topic "inTopic", printing out any messages
    it receives. NB - it assumes the received payloads are strings not binary
  - If the first character of the topic "inTopic" is an 1, switch ON the ESP Led,
    else switch it off

 It will reconnect to the server if the connection is lost using a blocking
 reconnect function. See the 'mqtt_reconnect_nonblocking' example for how to
 achieve the same result without blocking the main loop.

 To install the ESP8266 board, (using Arduino 1.6.4+):
  - Add the following 3rd party board manager under "File -> Preferences -> Additional Boards Manager URLs":
       http://arduino.esp8266.com/stable/package_esp8266com_index.json
  - Open the "Tools -> Board -> Board Manager" and click install for the ESP8266"
  - Select your ESP8266 in "Tools -> Board"

*/

#include <ESP8266WiFi.h>
#include <PubSubClient.h>

// include the SD library:
#include <SPI.h>
#include <SD.h>

#include "DHT.h" //cargamos la librería DHT
#define DHTPIN 5 //Seleccionamos el pin en el que se //conectará el sensor
#define DHTTYPE DHT11 //Se selecciona el DHT11 (hay //otros DHT)
DHT dht(DHTPIN, DHTTYPE, 30); //Se inicia una variable que será usada por Arduino para comunicarse con el sensor
char *status_sensors;

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
long lastMsg = 0;
char status_aux[50];
int value = 0;

String prefix = "Home";
String nodeID = "Nodo_1";

void setup() {
  pinMode(BUILTIN_LED, OUTPUT);     // Initialize the BUILTIN_LED pin as an output
  Serial.begin(115200);
  dht.begin(); //Se inicia el sensor
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
  
 Serial.print("Initializing SD card...");
  if (!SD.begin(4)) {
    Serial.println("initialization failed!");
    return;
  }
  Serial.println("initialization done.");
 
}

void setup_wifi() {

  delay(10);
  // We start by connecting to a WiFi network
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
void callback(char* topic, byte* payload, unsigned int length) {
  char* msg;
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
 //el error esta aquí
  msg[i] = (char)payload[i];
  }
  Serial.println();
  if (topic == "Home/Nodo_central/ctrl"){
    Serial.println("estoy dentro");
   //client.subscribe(msg);
    }
  else {  
  writeSD (topic, msg);
    }
}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Attempt to connect
    if (client.connect("ESP8266Client")) {
      Serial.println("connected");
      // ... and resubscribe
      client.subscribe("Home/Nodo_central/ctrl");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // Wait 5 seconds before retrying
      delay(5000);
    }
  }
}

void updateStatus (String channel, String nodeID, char *message){
 String topicbuff = prefix +"/"+ nodeID +"/"+ channel;
 char topic[topicbuff.length()+1];
 topicbuff.toCharArray (topic,topicbuff.length()+1);
  client.publish(topic, message);
  Serial.println("Published message:");
  Serial.print("Topic: ");
  Serial.println(topic);
  Serial.print("Message: ");
  Serial.println(message);
  }

void checkTempAndHum (){
  float h = dht.readHumidity(); //Se lee la humedad
  float t = dht.readTemperature(); //Se lee la temperatura
  Serial.println("Humedad: "); 
  Serial.println(h);
  Serial.println("Temperatura: ");
  Serial.println(t);
  long now = millis();
  now = now/1000;
  Serial.println("Segundos: ");
  Serial.println(now);
  snprintf (status_aux, 75, "{\"Temperature\":\"%1d\", \"Humidity\":\"%2d\", \"Segundos\":\"%3d\"}", int (t), int (h), now);
  status_sensors = status_aux;
  
  }

void loop() {

  if (!client.connected()) {
    reconnect();
  }
  client.loop();

   checkTempAndHum();
   //updateStatus ("istate",nodeID,status_sensors); 
   delay (1000);
 
}
