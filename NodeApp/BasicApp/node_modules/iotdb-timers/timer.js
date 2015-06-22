/*
 *  timer.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-03
 *
 *  Base class for timers
 *
 *  Copyright [2013-2014] [David P. Janes]
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

var moment = require('moment');
var util = require('util');
var events = require('events');

var _ = require("./helpers");
var DateTime = require("./datetime").DateTime;

var logger = _.make_logger({
    name: 'iotdb-timer',
    module: 'timer',
});

var event_sorter = function(a, b) {
    return a.compare(b);
}

var format2 = function(d) {
    d = Math.abs(d) % 100
    if (d < 10) {
        return "0" + d
    } else {
        return "" + d
    }
}

/**
 *  Internal for package ... mainly
 */
var defaults = {
    latitude: 43.7, 
    longitude: -79.4,
    max_delta: 60,
};

/**
 */
var setLocation = function(latitude, longitude) {
    defaults.latitude = latitude;
    defaults.longitude = longitude;
};

var unique_id = 0;

/**
 */
var Timer = function () {
    var self = this;

    self.events = [];
    self.when = null;
    self._timer_id = null;
    self.__unique_id = unique_id++;

    // console.log("EVENTS", self._events);
    self._events = undefined
    events.EventEmitter.call(this);
    self._events.__unique_id = self.__unique_id;
};

util.inherits(Timer, events.EventEmitter);

/**
 */
Timer.prototype.schedule = function(event) {
    this._schedule(event);
}

Timer.prototype.getWhen = function() {
    var self = this;

    if (!self.when) {
        return null;
    }

    return self._scrub(self.when);
}

Timer.prototype.getDate = function() {
    var self = this;

    if (!self.when) {
        return null;
    }

    return self.when.getDate();
}

Timer.prototype.isBefore = function() {
    var self = this;

    if (!self.when) {
        return null;
    }

    return self.when.compare() > 0;
}

Timer.prototype.isAfter = function() {
    var self = this;

    if (!self.when) {
        return null;
    }

    return self.when.compare() <= 0;
}


/**
 *  Reschedule the event to the next interval. If
 *  not rescheduable, return false
 */
Timer.prototype._reschedule = function(event) {
    var self = this;

    var dd = event.get()
    var dt_old = event.getDate();
    var dt_new = null;

    if (dd.year_repeat) {
        dt_new = moment(dt_old).add(dd.year_repeat, 'hours').toDate();
    } else if (dd.month_repeat) {
        dt_new = moment(dt_old).add(dd.month_repeat, 'months').toDate();
    } else if (dd.day_repeat) {
        dt_new = moment(dt_old).add(dd.day_repeat, 'days').toDate();
    } else if (dd.hour_repeat) {
        dt_new = moment(dt_old).add(dd.hour_repeat, 'hours').toDate();
    } else if (dd.minute_repeat) {
        dt_new = moment(dt_old).add(dd.minute_repeat, 'minutes').toDate();
    } else if (dd.second_repeat) {
        dt_new = moment(dt_old).add(dd.second_repeat, 'seconds').toDate();
    } else {
        return false;
    }

    event.set(dt_new);

    return true;
};

/**
 *  Add an event to the queue
 *  <p>
 *  Lots of rules built into the code need to be documented
 */
Timer.prototype._schedule = function(paramd) {
    var self = this;

    var event = new DateTime(paramd);

    if ((event.compare() < 0) && !self._reschedule(event)) {
        logger.error({
            method: "_schedule",
            cause: "likely the programmer or data, often not serious",
            event: event.get(),
            unique_id: self.__unique_id,
            initd: paramd.initd,
            driverd: paramd.driverd
        }, "date is in the past any this does not repeat -- not scheduling");
        return
    }

    if (paramd.id) {
        for (var ei in self.events) {
            var e = self.events[ei];
            var id = e.get().id;
            if (e.get().id === paramd.id) {
                self.events.splice(ei, 1);
                break;
            }
        }

        if (paramd.id === "timer") {
            self.when = event;
        }
    }

    self.events.push(event);
    self._scheduler();
};

/**
 */
Timer.prototype._scrub = function(event) {
    var dd = event.get()

    for (var key in dd) {
        if (key.indexOf('_') > -1) {
            delete dd[key];
        }
    }

    return dd;
}

/**
 *  Run the event
 */
Timer.prototype._execute = function(event) {
    var self = this;

    var dd = self._scrub(event);

    // dd.__unique_id = self.__unique_id;
    self.emit(dd.id ? dd.id : 'timer', dd);

    logger.info({
        method: "_execute",
        event: dd,
        unique_id: self.__unique_id,
    }, "timer change")
};

/**
 *  This will run any events that are ready AND
 *  it will set the timer to wakeup at the next event
 */
Timer.prototype._scheduler = function() {
    var self = this;

    if (self.timer_id) {
        clearTimeout(self.timer_id);
    }

    if (self.events.length === 0) {
        return;
    }

    self.events.sort(event_sorter);

    // console.log("HERE:A", self.events.length, self.__unique_id);
    while (true) {
        var event = self.events[0]
        if (event.compare() > 0) {
            break;
        }

        self._execute(event);

        if (!self._reschedule(event)) {
            self.events.shift();
        }
    }

    if (self.events.length === 0) {
        return;
    }

    self.events.sort(event_sorter);

    var delta = self.events[0].compare()
    logger.info({
        method: "_scheduler",
        next_run: delta,
        unique_id: self.__unique_id,
    }, "schedule updated");


    /*
     *  Because the computer can sleep, the process can be stopped,
     *  &c, we don't let sleeps go to long. It might be worth
     *  investigating setting up SIGTSTP handlers too, or listenable (?)
     *  events about the computer going to sleep and waking up
     */
    if (self._timer_id) {
        clearTimeout(self._timer_id);
        self._timer_id = null;
    }

    var again = function() {
        var delta = self.events[0].compare()
        if (delta > defaults.max_delta) {
            self._timer_id = setTimeout(again, defaults.max_delta * 1000);
        } else {
            self._timer_id = setTimeout(function() {
                self._scheduler();
            }, delta * 1000);
        }
    };
    again();
};

/*
 *  API
 */
exports.Timer = Timer;
exports.defaults = defaults;
exports.setLocation = setLocation;
