/**
 * \file
 *       ESP8266 MQTT Bridge example
 * \author
 *       Tuan PM <tuanpm@live.com>
 */
#include <SoftwareSerial.h>
#include <espduino.h>
#include <mqtt.h>

SoftwareSerial debugPort(2, 3); // RX, TX
ESP esp(&Serial, &debugPort, 4);
MQTT mqtt(&esp);
boolean wifiConnected = false;
String BUFF;
bool received_smth = false;
bool send_msg = false;


char buf[10];
String prefix = "Home";
String nodeID = "arduino1";
String meta = "meta";
 
void wifiCb(void* response)
{
  uint32_t status;
  RESPONSE res(response);

  if(res.getArgc() == 1) {
    res.popArgs((uint8_t*)&status, 4);
    if(status == STATION_GOT_IP) {
      debugPort.println("WIFI CONNECTED");
      mqtt.connect("192.168.1.3", 1883, false);
      wifiConnected = true;
      //or mqtt.connect("host", 1883); /*without security ssl*/
    } else {
      wifiConnected = false;
      mqtt.disconnect();
    }
    
  }
}

void mqttConnected(void* response)
{
  debugPort.println("mqttconnected");
  debugPort.println("Connected");
  mqtt.subscribe("Home/arduino1/management"); //or mqtt.subscribe("topic"); /*with qos = 0*/
  mqtt.publish("Home/arduino1/management", "Reset");

  debugPort.println("mqttdata_FAKE");
  RESPONSE res(response);

  debugPort.print("Received: topic=");
  String topic = res.popString();
  debugPort.println(topic);

  debugPort.print("data=");
  String data = res.popString();
  debugPort.println(data);
}
void mqttDisconnected(void* response)
{
debugPort.println("mqttdisconnected");
}
void mqttData(void* response)
{
  debugPort.println("mqttdata");
  RESPONSE res(response);

  debugPort.print("Received: topic=");
  String topic = res.popString();
  debugPort.println(topic);

  debugPort.print("data=");
  String data = res.popString();
  debugPort.println(data);
  received_smth = true;
  BUFF = data;
}
void mqttPublished(void* response)
{
debugPort.println("mqttpublished");
}

void updateStatus (String channel, String nodeID, char *message){
 String topicbuff = prefix +"/"+ nodeID +"/"+ channel;
 char topic[topicbuff.length()+1];
 topicbuff.toCharArray (topic,topicbuff.length()+1);
  mqtt.publish(topic, message);
  debugPort.println("Published message:");
  debugPort.print("Topic: ");
  debugPort.println(topic);
  debugPort.print("Message: ");
  debugPort.println(message);
  }

  
void setup() {
  Serial.begin(19200);
  debugPort.begin(19200);
  esp.enable();
  delay(500);
  esp.reset();
  delay(500);
  while(!esp.ready());

  debugPort.println("ARDUINO: setup mqtt client");
  if(!mqtt.begin("Arduino1", "Alfonso", "password", 120, 1)) {
    debugPort.println("ARDUINO: fail to setup mqtt");
    while(1);
  }


  debugPort.println("ARDUINO: setup mqtt lwt");
  mqtt.lwt("/lwt", "offline", 0, 0); //or mqtt.lwt("/lwt", "offline");

/*setup mqtt events */
  mqtt.connectedCb.attach(&mqttConnected);
  mqtt.disconnectedCb.attach(&mqttDisconnected);
  mqtt.publishedCb.attach(&mqttPublished);
  mqtt.dataCb.attach(&mqttData);

  /*setup wifi*/
  debugPort.println("ARDUINO: setup wifi");
  esp.wifiCb.attach(&wifiCb);

  esp.wifiConnect("My_AP","raspberry");
  debugPort.println("ARDUINO: system started");
}

void loop() {
  esp.process();
  if(wifiConnected) {
      if (received_smth) {
          debugPort.println("En el loop");
          debugPort.println(BUFF);
          if (BUFF == "Meta"){send_msg = true;}
          received_smth = false;
          BUFF = "";
          }
      if (send_msg){   
      char *message = "{\"first\":\"Alfonso\", \"last\":\"Galan\"}";
      debugPort.println(message);
      updateStatus (meta,nodeID,message); 
      delay (500);
      mqtt.publish("Home/arduino1/management", "Reset");
      send_msg = false;
       }     
  }
}
