/*
 *  upnp.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-01-06
 *
 *  Manage UPnP communications 
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

var iotdb = require("iotdb");
var _ = iotdb._;
var bunyan = iotdb.bunyan;
var logger = bunyan.createLogger({
    name: 'iotdb-upnp',
    module: 'upnp',
});

var DELTA_SCRUB = 60 * 1000;
var DELTA_SEARCH = 20 * 1000;

var UpnpControlPoint = require("./upnp/upnp-controlpoint").UpnpControlPoint;

var _cp;
var control_point = function () {
    if (_cp === undefined) {
        logger.info({
            method: "cp"
        }, "made UpnpControlPoint");

        _cp = new UpnpControlPoint();

        // we periodically kick off a new search to find devices that have come online
        setInterval(function () {
            _cp.search();
            _cp.scrub(DELTA_SCRUB);
        }, DELTA_SEARCH);
    }

    return _cp;
};

var initialized = function () {
    return _cp !== undefined;
};

var devices = function () {
    var ds = [];

    var cp = control_point();
    for (var dkey in cp.devices) {
        var device = cp.devices[dkey];
        if (_.is.Object(device)) {
            ds.push(device);
        }
    }

    return ds;
};

/*
 *  API
 */
exports.control_point = control_point;
exports.initialized = initialized;
exports.devices = devices;
