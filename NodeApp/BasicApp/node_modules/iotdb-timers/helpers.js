/*
 *  helpers.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-04
 *
 *  Helper functions 
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

var _ = exports;

var bunyan;
try {
    var bunyan = require('bunyan');
} catch (x) {
}

exports.isString = function(o) {
    return typeof o === 'string';
};

exports.isDate = function(o) {
    return o instanceof Date;
};

exports.isDateTime = function(o) {
    return o && o._isDateTime;
};

exports.isObject = function(o) {
    return typeof o === 'object';
};

exports.isFunction = function(o) {
    return typeof o === 'function';
};

exports.isArray = function(o) {
    return Array.isArray(o);
};

exports.isNumber = function(o) {
    return typeof o === 'number';
};

exports.is = {
	Date: exports.isDate,
	Function: exports.isFunction,
	Number: exports.isNumber,
	Object: exports.isObject,
	String: exports.isString,
};

exports.clone = function(o) {
    if (!exports.isObject(o)) return o;
    if (exports.isArray(o)) return o.slice();

    var n = {}
    for (var key in o) {
        n[key] = o[key];
    }

    return n;
};

exports.defaults = function(paramd, defaultd) {
    if (!paramd) {
        paramd = {}
    }

    for (var key in defaultd) {
        var pvalue = paramd[key]
        if (pvalue === undefined) {
            paramd[key] = defaultd[key]
        }
    }

    return paramd;
};

/**
 *  Used by timers to turn classes into functions
 */
exports.make_function = function(_cls, _number) {
    return function(paramd, callback) {
        if (_.is.Function(paramd)) {
            callback = paramd;
            paramd = {};
        } else if (_.is.Number(paramd)) {
            var d = {}
            d[_number] = paramd;

            paramd = d;
        }

        var timer = new _cls(paramd);

        if (callback !== undefined) {
            timer.on('timer', callback);
        }

        return timer;
    }
}

exports.make_logger = function(d) {
    if (bunyan) {
        return bunyan.createLogger({
            name: 'iotdb-timer',
            module: 'timer',
        });
    } else {
        var l = function() {
            console.log("--");
            for (var ai in arguments) {
                console.log(JSON.stringify(arguments[ai], null, 2).replace(/^/gm, '  '));
            }
        };

        return {
            debug: l,
            trace: l,
            info: l,
            error: l,
        };
    }
}


