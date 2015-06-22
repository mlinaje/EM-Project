iotdb-timers
============

Clever timers, such as alarm clocks, on-offs, sunrise / sunset, etc.

## Notes

* mostly second oriented, not millisecond like Javascript
* if <code>bunyan</code> is installed logging will look a lot better
* time offset related stuff doesn't work yet, sorry

## Examples

### once per minute (on the minute)

	var timers = require('iotdb-timers')
	
    timers.minute_timer(function(event) {
        console.log(event);
    })
	
The <code>event</code> dictionary is full of goodies:

    {
      "year": 2014,
      "month": 12,
      "day": 4,
      "hour": 11,
      "minute": 22,
      "second": 0,
      "tz": -300,
      "epoch": 1417710120,
      "isoweekday": 4,
      "isodatetime": "2014-12-04T16:22:00.000Z",
      "id": "timer",
      "name": "once per minute"
    }

## every 5 minutes (on the minute)

    timers.minute_timer(5, function(event) {
    })
 
## every 5 minutes at #:30 seconds

    timers.minute_timer({
        minute_repeat: 5,
        second: 30
    }, function(eventd) {
    })


## once per hour (on the hour)

    timers.hour_timer(function(event) {
    })

## once per day (at midnight)

    timers.day_timer(function(event) {
    })

## at sunset

    timers.setLocation(43.7, -79.4);

    timers.sunset(function(event) {
    })

or if you need to specify the different lat/lons

    timers.sunset({
        latitude: 43.7,
        longitude: -79.4
    }, function(event) {
    })

## at sunrise

    timers.sunrise(function(event) {
    })
    
## 5 minutes before sunrise

    timers.sunset(-5 * 50, function(event) {
    })
    
or

    timers.sunset({
    	delta: -5 * 50
    }, function(event) {
    })
    
## is it after sunrise?

	var sunrise = new timers.Sunrise();
	console.log("is-after", sunrise.isAfter());
	console.log("sunrise @", sunrise.getDate());
	console.log("sunrise (d)", sunrise.getWhen());

## other solar events

See [SunCalc](https://github.com/mourner/suncalc) for more definutions.

* dawn
* dusk
* golden_hour_end
* nadir
* nautical_dawn
* nautical_dusk
* night
* night_end
* solar_noon
* sunrise
* sunrise_end
* sunset
* sunset_start

## lunar events

Tell me if you need these and I'll add them.

## run once in 30 seconds

    timers.once(30, function(when) {
    });

or 

    timers.once({
        second_delta: 30
    }, function(when) {
    });

Also try <code>minute\_delta</code> and <code>hour\_delta</code>.

