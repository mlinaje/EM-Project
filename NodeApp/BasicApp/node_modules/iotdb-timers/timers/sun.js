/*
 *  timers/sun.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-03
 *
 *  Timer based on solar events
 *
 *  Copyright [2013-2015] [David P. Janes]
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

"use strict";

var _ = require("../helpers");
var timer = require('../timer');
var DateTime = require("../datetime").DateTime;
var suncalc = require('suncalc');

/**
 *  Fire an event every day
 */
var Sun = function (paramd) {
    timer.Timer.call(this);
};

Sun.prototype = new timer.Timer();

Sun.prototype._setup = function(paramd) {
    var self = this;

    self.paramd = _.defaults(paramd, {});
    self.paramd = _.defaults(self.paramd, {
        latitude: timer.defaults.latitude,
        longitude: timer.defaults.longitude,
    });
    self.when = null;

    // heartbeat
    self._schedule({
        id: "recalcuate",
        hour: 0,
        day_repeat: 1
    })

    self.on("recalculate", self._recalculate);
    self._recalculate();
}

Sun.prototype._recalculate = function() {
    var self = this;

    var td = suncalc.getTimes(new Date(), self.paramd.latitude, self.paramd.longitude);
    var dt_when = td[self.paramd.what];

    self.when = new DateTime(dt_when);
    self.when.id = "timer";

    self._schedule(self.when)
}

/* make all the functions */
var _make = function(name_what, name_class, name_function) {
    exports[name_class] = function(paramd) {
        Sun.call(this);
        var self = this;
        
        paramd = _.defaults(paramd, {
            what: name_what
        });

        self._setup(paramd);
    }

    exports[name_class].prototype = new Sun();
    exports[name_function] = _.make_function(exports[name_class], "delta");
}

var whatss = [
	[ "solarNoon", "SolarNoon", "solar_noon" ],
	[ "nadir", "Nadir", "nadir" ],
	[ "sunrise", "Sunrise", "sunrise" ],
	[ "sunset", "Sunset", "sunset" ],
	[ "sunriseEnd", "SunriseEnd", "sunrise_end" ],
	[ "sunsetStart", "SunsetStart", "sunset_start" ],
	[ "dawn", "Dawn", "dawn" ],
	[ "dusk", "Dusk", "dusk" ],
	[ "nauticalDawn", "NauticalDawn", "nautical_dawn" ],
	[ "nauticalDusk", "NauticalDusk", "nautical_dusk" ],
	[ "nightEnd", "NightEnd", "night_end" ],
	[ "night", "Night", "night" ],
	[ "goldenHourEnd", "GoldenHourEnd", "golden_hour_end" ],
	[ "goldenHour", "GoldenHour", "golden_hour" ],
];

for (var wi in whatss) {
    var whats = whatss[wi];
    var name_what = whats[0];
    var name_class = whats[1];
    var name_function = whats[2];

    _make(name_what, name_class, name_function);
}
