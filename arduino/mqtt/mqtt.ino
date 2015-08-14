/**
 * \file
 *       ESP8266 MQTT Bridge example
 * \author
 *       Tuan PM <tuanpm@live.com>
 */
#include <SoftwareSerial.h>
#include <espduino.h>
#include <mqtt.h>

int i = 0;
char buf[10];

SoftwareSerial debugPort(2, 3); // RX, TX
ESP esp(&Serial, &debugPort, 4);
MQTT mqtt(&esp);
boolean wifiConnected = false;

void wifiCb(void* response)
{
  uint32_t status;
  RESPONSE res(response);

  if(res.getArgc() == 1) {
    res.popArgs((uint8_t*)&status, 4);
    if(status == STATION_GOT_IP) {
      debugPort.println("WIFI CONNECTED");
     // mqtt.connect("broker.mqtt-dashboard.com", 1883);
      mqtt.connect("192.168.42.1", 1883);
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
  debugPort.println("Connected");
  

}
void mqttDisconnected(void* response)
{

}
void mqttData(void* response)
{
  RESPONSE res(response);

  debugPort.print("Received: topic=");
  String topic = res.popString();
  debugPort.println(topic);

  debugPort.print("data=");
  String data = res.popString();
  debugPort.println(data);

}
void mqttPublished(void* response)
{

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
  if(!mqtt.begin("alfonso", "alfonsouser", "123456", 120, 1)) {
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
    //sprintf(buf, "{id:\"MyThingID\", band:\"meta\", value:{first:\"Alfonso\", last:\"Galan\", iter:\"%d\"}}", i);
    //debugPort.println(buf);
    debugPort.println("{\"first\":\"Alfonso\", \"last\":\"Galan\"}");
    mqtt.publish("mqtt-transport/MyThingID/meta", "{\"first\":\"Alfonso\", \"last\":\"Galan\"}");
    delay (5000);
    i++;
  }
}
