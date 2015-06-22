# homestar-wemo

Connect and control WeMo products with HomeStar and IOTDB.

<img src="https://github.com/dpjanes/iotdb-homestar/blob/master/docs/HomeStar.png" align="right" />

See <a href="samples/">the samples</a> for details how to add to your project.
particularly <code>model.js</code> for "standalone" and <code>iotdb.js</code>
for use in IOTDB / HomeStar projects.

# Installation

Install Home☆Star first. 
See: https://github.com/dpjanes/iotdb-homestar#installation

Then

    $ homestar install homestar-wemo

# Quick Start

Turn off all WeMo sockets

	$ npm install -g homestar ## with 'sudo' if error
	$ homestar setup
	$ homestar install homestar-wemo
	$ node
	>>> iotdb = require('iotdb')
	>>> iot = iotdb.iot()
	>>> things = iot.connect("WeMoSocket")
	>>> things.set(":on", false)

# Models
## WeMoSocket

This controls WeMo Sockets.

Functionality:

* discover WeMo Sockets
* turn on and off
* get same (including notifications)

### Attributes

* <code>on</code>: true or false, purpose <code>iot-attribute:on</code>

e.g.

    {
        "on": true
    }

the socket is on / turn the socket on

## WeMoInsight

NOT TESTED

### Attributes

* <code>on</code>: true or false, purpose <code>iot-attribute:on</code>

e.g.

    {
        "on": true
    }

## WeMoLightSwitch

NOT TESTED

### Attributes

* <code>on</code>: true or false, purpose <code>iot-attribute:on</code>

e.g.

    {
        "on": true
    }

## WeMoMotion

NOT TESTED

### Attributes

* <code>motion</code>: true or false, purpose <code>iot-attribute:sensor.motion</code>

e.g.

    {
        "motion": true
    }

## WeMoCrockpot

NOT TESTED

### Attributes

* <code>on</code>: true or false, purpose <code>iot-attribute:on</code>

e.g.

    {
        "on": true
    }
