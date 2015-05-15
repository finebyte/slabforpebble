(function() {
    function require(path, parent, orig) {
        var resolved = require.resolve(path);
        if (null == resolved) {
            orig = orig || path;
            parent = parent || "root";
            var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
            err.path = orig;
            err.parent = parent;
            err.require = true;
            throw err;
        }
        var module = require.modules[resolved];
        if (!module.exports) {
            module.exports = {};
            module.client = module.component = true;
            module.call(this, module.exports, require.relative(resolved), module);
        }
        return module.exports;
    }
    require.modules = {};
    require.aliases = {};
    require.resolve = function(path) {
        if (path.charAt(0) === "/") path = path.slice(1);
        var index = path + "/index.js";
        var paths = [ path, path + ".js", path + ".json", path + "/index.js", path + "/index.json" ];
        for (var i = 0; i < paths.length; i++) {
            var path = paths[i];
            if (require.modules.hasOwnProperty(path)) return path;
        }
        if (require.aliases.hasOwnProperty(index)) {
            return require.aliases[index];
        }
    };
    require.normalize = function(curr, path) {
        var segs = [];
        if ("." != path.charAt(0)) return path;
        curr = curr.split("/");
        path = path.split("/");
        for (var i = 0; i < path.length; ++i) {
            if (".." == path[i]) {
                curr.pop();
            } else if ("." != path[i] && "" != path[i]) {
                segs.push(path[i]);
            }
        }
        return curr.concat(segs).join("/");
    };
    require.register = function(path, definition) {
        require.modules[path] = definition;
    };
    require.alias = function(from, to) {
        if (!require.modules.hasOwnProperty(from)) {
            throw new Error('Failed to alias "' + from + '", it does not exist');
        }
        require.aliases[to] = from;
    };
    require.relative = function(parent) {
        var p = require.normalize(parent, "..");
        function lastIndexOf(arr, obj) {
            var i = arr.length;
            while (i--) {
                if (arr[i] === obj) return i;
            }
            return -1;
        }
        function localRequire(path) {
            var resolved = localRequire.resolve(path);
            return require(resolved, parent, path);
        }
        localRequire.resolve = function(path) {
            var c = path.charAt(0);
            if ("/" == c) return path.slice(1);
            if ("." == c) return require.normalize(p, path);
            var segs = parent.split("/");
            var i = lastIndexOf(segs, "deps") + 1;
            if (!i) i = 0;
            path = segs.slice(0, i + 1).join("/") + "/deps/" + path;
            return path;
        };
        localRequire.exists = function(path) {
            return require.modules.hasOwnProperty(localRequire.resolve(path));
        };
        return localRequire;
    };
    require.register("component-indexof/index.js", function(exports, require, module) {
        var indexOf = [].indexOf;
        module.exports = function(arr, obj) {
            if (indexOf) return arr.indexOf(obj);
            for (var i = 0; i < arr.length; ++i) {
                if (arr[i] === obj) return i;
            }
            return -1;
        };
    });
    require.register("component-emitter/index.js", function(exports, require, module) {
        var index = require("indexof");
        module.exports = Emitter;
        function Emitter(obj) {
            if (obj) return mixin(obj);
        }
        function mixin(obj) {
            for (var key in Emitter.prototype) {
                obj[key] = Emitter.prototype[key];
            }
            return obj;
        }
        Emitter.prototype.on = function(event, fn) {
            this._callbacks = this._callbacks || {};
            (this._callbacks[event] = this._callbacks[event] || []).push(fn);
            return this;
        };
        Emitter.prototype.once = function(event, fn) {
            var self = this;
            this._callbacks = this._callbacks || {};
            function on() {
                self.off(event, on);
                fn.apply(this, arguments);
            }
            fn._off = on;
            this.on(event, on);
            return this;
        };
        Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = function(event, fn) {
            this._callbacks = this._callbacks || {};
            if (0 == arguments.length) {
                this._callbacks = {};
                return this;
            }
            var callbacks = this._callbacks[event];
            if (!callbacks) return this;
            if (1 == arguments.length) {
                delete this._callbacks[event];
                return this;
            }
            var i = index(callbacks, fn._off || fn);
            if (~i) callbacks.splice(i, 1);
            return this;
        };
        Emitter.prototype.emit = function(event) {
            this._callbacks = this._callbacks || {};
            var args = [].slice.call(arguments, 1), callbacks = this._callbacks[event];
            if (callbacks) {
                callbacks = callbacks.slice(0);
                for (var i = 0, len = callbacks.length; i < len; ++i) {
                    callbacks[i].apply(this, args);
                }
            }
            return this;
        };
        Emitter.prototype.listeners = function(event) {
            this._callbacks = this._callbacks || {};
            return this._callbacks[event] || [];
        };
        Emitter.prototype.hasListeners = function(event) {
            return !!this.listeners(event).length;
        };
    });
    require.register("RedVentures-reduce/index.js", function(exports, require, module) {
        module.exports = function(arr, fn, initial) {
            var idx = 0;
            var len = arr.length;
            var curr = arguments.length == 3 ? initial : arr[idx++];
            while (idx < len) {
                curr = fn.call(null, curr, arr[idx], ++idx, arr);
            }
            return curr;
        };
    });
    require.register("superagent/lib/client.js", function(exports, require, module) {
        var Emitter = require("emitter");
        var reduce = require("reduce");
        var root = "undefined" == typeof window ? this : window;
        function noop() {}
        function isHost(obj) {
            var str = {}.toString.call(obj);
            switch (str) {
              case "[object File]":
              case "[object Blob]":
              case "[object FormData]":
                return true;

              default:
                return false;
            }
        }
        function getXHR() {
            if (root.XMLHttpRequest && ("file:" != root.location.protocol || !root.ActiveXObject)) {
                return new XMLHttpRequest();
            } else {
                try {
                    return new ActiveXObject("Microsoft.XMLHTTP");
                } catch (e) {}
                try {
                    return new ActiveXObject("Msxml2.XMLHTTP.6.0");
                } catch (e) {}
                try {
                    return new ActiveXObject("Msxml2.XMLHTTP.3.0");
                } catch (e) {}
                try {
                    return new ActiveXObject("Msxml2.XMLHTTP");
                } catch (e) {}
            }
            return false;
        }
        var trim = "".trim ? function(s) {
            return s.trim();
        } : function(s) {
            return s.replace(/(^\s*|\s*$)/g, "");
        };
        function isObject(obj) {
            return obj === Object(obj);
        }
        function serialize(obj) {
            if (!isObject(obj)) return obj;
            var pairs = [];
            for (var key in obj) {
                pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]));
            }
            return pairs.join("&");
        }
        request.serializeObject = serialize;
        function parseString(str) {
            var obj = {};
            var pairs = str.split("&");
            var parts;
            var pair;
            for (var i = 0, len = pairs.length; i < len; ++i) {
                pair = pairs[i];
                parts = pair.split("=");
                obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
            }
            return obj;
        }
        request.parseString = parseString;
        request.types = {
            html: "text/html",
            json: "application/json",
            urlencoded: "application/x-www-form-urlencoded",
            form: "application/x-www-form-urlencoded",
            "form-data": "application/x-www-form-urlencoded"
        };
        request.serialize = {
            "application/x-www-form-urlencoded": serialize,
            "application/json": JSON.stringify
        };
        request.parse = {
            "application/x-www-form-urlencoded": parseString,
            "application/json": JSON.parse
        };
        function parseHeader(str) {
            var lines = str.split(/\r?\n/);
            var fields = {};
            var index;
            var line;
            var field;
            var val;
            lines.pop();
            for (var i = 0, len = lines.length; i < len; ++i) {
                line = lines[i];
                index = line.indexOf(":");
                field = line.slice(0, index).toLowerCase();
                val = trim(line.slice(index + 1));
                fields[field] = val;
            }
            return fields;
        }
        function type(str) {
            return str.split(/ *; */).shift();
        }
        function params(str) {
            return reduce(str.split(/ *; */), function(obj, str) {
                var parts = str.split(/ *= */), key = parts.shift(), val = parts.shift();
                if (key && val) obj[key] = val;
                return obj;
            }, {});
        }
        function Response(xhr, options) {
            options = options || {};
            this.xhr = xhr;
            this.text = xhr.responseText;
            this.setStatusProperties(xhr.status);
            this.header = this.headers = parseHeader(xhr.getAllResponseHeaders());
            this.header["content-type"] = xhr.getResponseHeader("content-type");
            this.setHeaderProperties(this.header);
            this.body = this.parseBody(this.text);
        }
        Response.prototype.get = function(field) {
            return this.header[field.toLowerCase()];
        };
        Response.prototype.setHeaderProperties = function(header) {
            var ct = this.header["content-type"] || "";
            this.type = type(ct);
            var obj = params(ct);
            for (var key in obj) this[key] = obj[key];
        };
        Response.prototype.parseBody = function(str) {
            var parse = request.parse[this.type];
            return parse ? parse(str) : null;
        };
        Response.prototype.setStatusProperties = function(status) {
            var type = status / 100 | 0;
            this.status = status;
            this.statusType = type;
            this.info = 1 == type;
            this.ok = 2 == type;
            this.clientError = 4 == type;
            this.serverError = 5 == type;
            this.error = 4 == type || 5 == type ? this.toError() : false;
            this.accepted = 202 == status;
            this.noContent = 204 == status || 1223 == status;
            this.badRequest = 400 == status;
            this.unauthorized = 401 == status;
            this.notAcceptable = 406 == status;
            this.notFound = 404 == status;
            this.forbidden = 403 == status;
        };
        Response.prototype.toError = function() {
            var msg = "got " + this.status + " response";
            var err = new Error(msg);
            err.status = this.status;
            return err;
        };
        request.Response = Response;
        function Request(method, url) {
            var self = this;
            Emitter.call(this);
            this._query = this._query || [];
            this.method = method;
            this.url = url;
            this.header = {};
            this._header = {};
            this.set("X-Requested-With", "XMLHttpRequest");
            this.on("end", function() {
                var res = new Response(self.xhr);
                if ("HEAD" == method) res.text = null;
                self.callback(null, res);
            });
        }
        Request.prototype = new Emitter();
        Request.prototype.constructor = Request;
        Request.prototype.timeout = function(ms) {
            this._timeout = ms;
            return this;
        };
        Request.prototype.clearTimeout = function() {
            this._timeout = 0;
            clearTimeout(this._timer);
            return this;
        };
        Request.prototype.abort = function() {
            if (this.aborted) return;
            this.aborted = true;
            this.xhr.abort();
            this.clearTimeout();
            this.emit("abort");
            return this;
        };
        Request.prototype.set = function(field, val) {
            if (isObject(field)) {
                for (var key in field) {
                    this.set(key, field[key]);
                }
                return this;
            }
            this._header[field.toLowerCase()] = val;
            this.header[field] = val;
            return this;
        };
        Request.prototype.getHeader = function(field) {
            return this._header[field.toLowerCase()];
        };
        Request.prototype.type = function(type) {
            this.set("Content-Type", request.types[type] || type);
            return this;
        };
        Request.prototype.auth = function(user, pass) {
            var str = btoa(user + ":" + pass);
            this.set("Authorization", "Basic " + str);
            return this;
        };
        Request.prototype.query = function(val) {
            if ("string" != typeof val) val = serialize(val);
            if (val) this._query.push(val);
            return this;
        };
        Request.prototype.send = function(data) {
            var obj = isObject(data);
            var type = this.getHeader("Content-Type");
            if (obj && isObject(this._data)) {
                for (var key in data) {
                    this._data[key] = data[key];
                }
            } else if ("string" == typeof data) {
                if (!type) this.type("form");
                type = this.getHeader("Content-Type");
                if ("application/x-www-form-urlencoded" == type) {
                    this._data = this._data ? this._data + "&" + data : data;
                } else {
                    this._data = (this._data || "") + data;
                }
            } else {
                this._data = data;
            }
            if (!obj) return this;
            if (!type) this.type("json");
            return this;
        };
        Request.prototype.callback = function(err, res) {
            var fn = this._callback;
            if (2 == fn.length) return fn(err, res);
            if (err) return this.emit("error", err);
            fn(res);
        };
        Request.prototype.crossDomainError = function() {
            var err = new Error("Origin is not allowed by Access-Control-Allow-Origin");
            err.crossDomain = true;
            this.callback(err);
        };
        Request.prototype.timeoutError = function() {
            var timeout = this._timeout;
            var err = new Error("timeout of " + timeout + "ms exceeded");
            err.timeout = timeout;
            this.callback(err);
        };
        Request.prototype.withCredentials = function() {
            this._withCredentials = true;
            return this;
        };
        Request.prototype.end = function(fn) {
            var self = this;
            var xhr = this.xhr = getXHR();
            var query = this._query.join("&");
            var timeout = this._timeout;
            var data = this._data;
            this._callback = fn || noop;
            if (this._withCredentials) xhr.withCredentials = true;
            xhr.onreadystatechange = function() {
                if (4 != xhr.readyState) return;
                if (0 == xhr.status) {
                    if (self.aborted) return self.timeoutError();
                    return self.crossDomainError();
                }
                self.emit("end");
            };
            if (xhr.upload) {
                xhr.upload.onprogress = function(e) {
                    e.percent = e.loaded / e.total * 100;
                    self.emit("progress", e);
                };
            }
            if (timeout && !this._timer) {
                this._timer = setTimeout(function() {
                    self.abort();
                }, timeout);
            }
            if (query) {
                query = request.serializeObject(query);
                this.url += ~this.url.indexOf("?") ? "&" + query : "?" + query;
            }
            xhr.open(this.method, this.url, true);
            if ("GET" != this.method && "HEAD" != this.method && "string" != typeof data && !isHost(data)) {
                var serialize = request.serialize[this.getHeader("Content-Type")];
                if (serialize) data = serialize(data);
            }
            for (var field in this.header) {
                if (null == this.header[field]) continue;
                xhr.setRequestHeader(field, this.header[field]);
            }
            xhr.send(data);
            return this;
        };
        request.Request = Request;
        function request(method, url) {
            if ("function" == typeof url) {
                return new Request("GET", method).end(url);
            }
            if (1 == arguments.length) {
                return new Request("GET", method);
            }
            return new Request(method, url);
        }
        request.get = function(url, data, fn) {
            var req = request("GET", url);
            if ("function" == typeof data) fn = data, data = null;
            if (data) req.query(data);
            if (fn) req.end(fn);
            return req;
        };
        request.head = function(url, data, fn) {
            var req = request("HEAD", url);
            if ("function" == typeof data) fn = data, data = null;
            if (data) req.send(data);
            if (fn) req.end(fn);
            return req;
        };
        request.del = function(url, fn) {
            var req = request("DELETE", url);
            if (fn) req.end(fn);
            return req;
        };
        request.patch = function(url, data, fn) {
            var req = request("PATCH", url);
            if ("function" == typeof data) fn = data, data = null;
            if (data) req.send(data);
            if (fn) req.end(fn);
            return req;
        };
        request.post = function(url, data, fn) {
            var req = request("POST", url);
            if ("function" == typeof data) fn = data, data = null;
            if (data) req.send(data);
            if (fn) req.end(fn);
            return req;
        };
        request.put = function(url, data, fn) {
            var req = request("PUT", url);
            if ("function" == typeof data) fn = data, data = null;
            if (data) req.send(data);
            if (fn) req.end(fn);
            return req;
        };
        module.exports = request;
    });
    require.alias("component-emitter/index.js", "superagent/deps/emitter/index.js");
    require.alias("component-emitter/index.js", "emitter/index.js");
    require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");
    require.alias("RedVentures-reduce/index.js", "superagent/deps/reduce/index.js");
    require.alias("RedVentures-reduce/index.js", "reduce/index.js");
    require.alias("superagent/lib/client.js", "superagent/index.js");
    if (typeof exports == "object") {
        module.exports = require("superagent");
    } else if (typeof define == "function" && define.amd) {
        define(function() {
            return require("superagent");
        });
    } else {
        this["superagent"] = require("superagent");
    }
})();

var MessageQueue = function() {
    var RETRY_MAX = 5;
    var queue = [];
    var sending = false;
    var timer = null;
    return {
        reset: reset,
        sendAppMessage: sendAppMessage,
        size: size
    };
    function reset() {
        queue = [];
        sending = false;
    }
    function sendAppMessage(message, ack, nack) {
        if (!isValidMessage(message)) {
            return false;
        }
        queue.push({
            message: message,
            ack: ack || null,
            nack: nack || null,
            attempts: 0
        });
        setTimeout(function() {
            sendNextMessage();
        }, 1);
        return true;
    }
    function size() {
        return queue.length;
    }
    function isValidMessage(message) {
        if (message !== Object(message)) {
            return false;
        }
        var keys = Object.keys(message);
        if (!keys.length) {
            return false;
        }
        for (var k = 0; k < keys.length; k += 1) {
            var validKey = /^[0-9a-zA-Z-_]*$/.test(keys[k]);
            if (!validKey) {
                return false;
            }
            var value = message[keys[k]];
            if (!validValue(value)) {
                return false;
            }
        }
        return true;
        function validValue(value) {
            switch (typeof value) {
              case "string":
                return true;

              case "number":
                return true;

              case "object":
                if (Object.toString.call(value) === "[object Array]") {
                    return true;
                }
            }
            return false;
        }
    }
    function sendNextMessage() {
        if (sending) {
            return;
        }
        var message = queue.shift();
        if (!message) {
            return;
        }
        message.attempts += 1;
        sending = true;
        Pebble.sendAppMessage(message.message, ack, nack);
        timer = setTimeout(function() {
            timeout();
        }, 1e3);
        function ack() {
            clearTimeout(timer);
            setTimeout(function() {
                sending = false;
                sendNextMessage();
            }, 200);
            if (message.ack) {
                message.ack.apply(null, arguments);
            }
        }
        function nack() {
            clearTimeout(timer);
            if (message.attempts < RETRY_MAX) {
                queue.unshift(message);
                setTimeout(function() {
                    sending = false;
                    sendNextMessage();
                }, 200 * message.attempts);
            } else {
                if (message.nack) {
                    message.nack.apply(null, arguments);
                }
            }
        }
        function timeout() {
            setTimeout(function() {
                sending = false;
                sendNextMessage();
            }, 1e3);
            if (message.ack) {
                message.ack.apply(null, arguments);
            }
        }
    }
}();

var GColor = function() {
    return {
        fromHex: GColorFromHex,
        toName: GColorName,
        ArmyGreen: 212,
        BabyBlueEyes: 235,
        Black: 192,
        Blue: 195,
        BlueMoon: 199,
        Brass: 233,
        BrightGreen: 220,
        BrilliantRose: 246,
        BulgarianRose: 208,
        CadetBlue: 218,
        Celeste: 239,
        ChromeYellow: 248,
        CobaltBlue: 198,
        Cyan: 207,
        DarkCandyAppleRed: 224,
        DarkGray: 213,
        DarkGreen: 196,
        DukeBlue: 194,
        ElectricBlue: 223,
        ElectricUltramarine: 211,
        FashionMagenta: 242,
        Folly: 241,
        Green: 204,
        Icterine: 253,
        ImperialPurple: 209,
        Inchworm: 237,
        Indigo: 210,
        IslamicGreen: 200,
        JaegerGreen: 201,
        JazzberryJam: 225,
        KellyGreen: 216,
        LavenderIndigo: 231,
        Liberty: 214,
        LightGray: 234,
        Limerick: 232,
        Magenta: 243,
        Malachite: 205,
        MayGreen: 217,
        MediumAquamarine: 222,
        MediumSpringGreen: 206,
        Melon: 250,
        MidnightGreen: 197,
        MintGreen: 238,
        Orange: 244,
        OxfordBlue: 193,
        PastelYellow: 254,
        PictonBlue: 219,
        Purple: 226,
        Purpureus: 230,
        Rajah: 249,
        Red: 240,
        RichBrilliantLavender: 251,
        RoseVale: 229,
        ScreaminGreen: 221,
        ShockingPink: 247,
        SpringBud: 236,
        SunsetOrange: 245,
        TiffanyBlue: 202,
        VeryLightBlue: 215,
        VividCerulean: 203,
        VividViolet: 227,
        White: 255,
        WindsorTan: 228,
        Yellow: 252
    };
    function GColorFromHex(hex) {
        var hexNum = parseInt(hex, 16);
        var a = 192;
        var r = (hexNum >> 16 & 255) >> 6 << 4;
        var g = (hexNum >> 8 & 255) >> 6 << 2;
        var b = (hexNum >> 0 & 255) >> 6 << 0;
        return a + r + g + b;
    }
    function GColorName(color) {
        var names = Object.keys(GColor);
        for (var n = 0; n < names.length; n += 1) {
            if (GColor[names[n]] == color) {
                return names[n];
            }
        }
        return null;
    }
}();

"use strict";

(function(root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof exports === "object") {
        module.exports = factory();
    } else {
        root.store = factory();
    }
})(this, function() {
    var store = {}, win = window, doc = win.document, localStorageName = "localStorage", scriptTag = "script", storage;
    store.disabled = false;
    store.version = "1.3.17";
    store.set = function(key, value) {};
    store.get = function(key, defaultVal) {};
    store.has = function(key) {
        return store.get(key) !== undefined;
    };
    store.remove = function(key) {};
    store.clear = function() {};
    store.transact = function(key, defaultVal, transactionFn) {
        if (transactionFn == null) {
            transactionFn = defaultVal;
            defaultVal = null;
        }
        if (defaultVal == null) {
            defaultVal = {};
        }
        var val = store.get(key, defaultVal);
        transactionFn(val);
        store.set(key, val);
    };
    store.getAll = function() {};
    store.forEach = function() {};
    store.serialize = function(value) {
        return JSON.stringify(value);
    };
    store.deserialize = function(value) {
        if (typeof value != "string") {
            return undefined;
        }
        try {
            return JSON.parse(value);
        } catch (e) {
            return value || undefined;
        }
    };
    function isLocalStorageNameSupported() {
        try {
            return localStorageName in win && win[localStorageName];
        } catch (err) {
            return false;
        }
    }
    if (isLocalStorageNameSupported()) {
        storage = win[localStorageName];
        store.set = function(key, val) {
            if (val === undefined) {
                return store.remove(key);
            }
            storage.setItem(key, store.serialize(val));
            return val;
        };
        store.get = function(key, defaultVal) {
            var val = store.deserialize(storage.getItem(key));
            return val === undefined ? defaultVal : val;
        };
        store.remove = function(key) {
            storage.removeItem(key);
        };
        store.clear = function() {
            storage.clear();
        };
        store.getAll = function() {
            var ret = {};
            store.forEach(function(key, val) {
                ret[key] = val;
            });
            return ret;
        };
        store.forEach = function(callback) {
            for (var i = 0; i < storage.length; i++) {
                var key = storage.key(i);
                callback(key, store.get(key));
            }
        };
    } else if (doc.documentElement.addBehavior) {
        var storageOwner, storageContainer;
        try {
            storageContainer = new ActiveXObject("htmlfile");
            storageContainer.open();
            storageContainer.write("<" + scriptTag + ">document.w=window</" + scriptTag + '><iframe src="/favicon.ico"></iframe>');
            storageContainer.close();
            storageOwner = storageContainer.w.frames[0].document;
            storage = storageOwner.createElement("div");
        } catch (e) {
            storage = doc.createElement("div");
            storageOwner = doc.body;
        }
        var withIEStorage = function(storeFunction) {
            return function() {
                var args = Array.prototype.slice.call(arguments, 0);
                args.unshift(storage);
                storageOwner.appendChild(storage);
                storage.addBehavior("#default#userData");
                storage.load(localStorageName);
                var result = storeFunction.apply(store, args);
                storageOwner.removeChild(storage);
                return result;
            };
        };
        var forbiddenCharsRegex = new RegExp("[!\"#$%&'()*+,/\\\\:;<=>?@[\\]^`{|}~]", "g");
        var ieKeyFix = function(key) {
            return key.replace(/^d/, "___$&").replace(forbiddenCharsRegex, "___");
        };
        store.set = withIEStorage(function(storage, key, val) {
            key = ieKeyFix(key);
            if (val === undefined) {
                return store.remove(key);
            }
            storage.setAttribute(key, store.serialize(val));
            storage.save(localStorageName);
            return val;
        });
        store.get = withIEStorage(function(storage, key, defaultVal) {
            key = ieKeyFix(key);
            var val = store.deserialize(storage.getAttribute(key));
            return val === undefined ? defaultVal : val;
        });
        store.remove = withIEStorage(function(storage, key) {
            key = ieKeyFix(key);
            storage.removeAttribute(key);
            storage.save(localStorageName);
        });
        store.clear = withIEStorage(function(storage) {
            var attributes = storage.XMLDocument.documentElement.attributes;
            storage.load(localStorageName);
            while (attributes.length) {
                storage.removeAttribute(attributes[0].name);
            }
            storage.save(localStorageName);
        });
        store.getAll = function(storage) {
            var ret = {};
            store.forEach(function(key, val) {
                ret[key] = val;
            });
            return ret;
        };
        store.forEach = withIEStorage(function(storage, callback) {
            var attributes = storage.XMLDocument.documentElement.attributes;
            for (var i = 0, attr; attr = attributes[i]; ++i) {
                callback(attr.name, store.deserialize(storage.getAttribute(attr.name)));
            }
        });
    }
    try {
        var testKey = "__storejs__";
        store.set(testKey, testKey);
        if (store.get(testKey) != testKey) {
            store.disabled = true;
        }
        store.remove(testKey);
    } catch (e) {
        store.disabled = true;
    }
    store.enabled = !store.disabled;
    return store;
});

(function(window) {
    var re = {
        not_string: /[^s]/,
        number: /[dief]/,
        json: /[j]/,
        not_json: /[^j]/,
        text: /^[^\x25]+/,
        modulo: /^\x25{2}/,
        placeholder: /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fijosuxX])/,
        key: /^([a-z_][a-z_\d]*)/i,
        key_access: /^\.([a-z_][a-z_\d]*)/i,
        index_access: /^\[(\d+)\]/,
        sign: /^[\+\-]/
    };
    function sprintf() {
        var key = arguments[0], cache = sprintf.cache;
        if (!(cache[key] && cache.hasOwnProperty(key))) {
            cache[key] = sprintf.parse(key);
        }
        return sprintf.format.call(null, cache[key], arguments);
    }
    sprintf.format = function(parse_tree, argv) {
        var cursor = 1, tree_length = parse_tree.length, node_type = "", arg, output = [], i, k, match, pad, pad_character, pad_length, is_positive = true, sign = "";
        for (i = 0; i < tree_length; i++) {
            node_type = get_type(parse_tree[i]);
            if (node_type === "string") {
                output[output.length] = parse_tree[i];
            } else if (node_type === "array") {
                match = parse_tree[i];
                if (match[2]) {
                    arg = argv[cursor];
                    for (k = 0; k < match[2].length; k++) {
                        if (!arg.hasOwnProperty(match[2][k])) {
                            throw new Error(sprintf("[sprintf] property '%s' does not exist", match[2][k]));
                        }
                        arg = arg[match[2][k]];
                    }
                } else if (match[1]) {
                    arg = argv[match[1]];
                } else {
                    arg = argv[cursor++];
                }
                if (get_type(arg) == "function") {
                    arg = arg();
                }
                if (re.not_string.test(match[8]) && re.not_json.test(match[8]) && (get_type(arg) != "number" && isNaN(arg))) {
                    throw new TypeError(sprintf("[sprintf] expecting number but found %s", get_type(arg)));
                }
                if (re.number.test(match[8])) {
                    is_positive = arg >= 0;
                }
                switch (match[8]) {
                  case "b":
                    arg = arg.toString(2);
                    break;

                  case "c":
                    arg = String.fromCharCode(arg);
                    break;

                  case "d":
                  case "i":
                    arg = parseInt(arg, 10);
                    break;

                  case "j":
                    arg = JSON.stringify(arg, null, match[6] ? parseInt(match[6]) : 0);
                    break;

                  case "e":
                    arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential();
                    break;

                  case "f":
                    arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg);
                    break;

                  case "o":
                    arg = arg.toString(8);
                    break;

                  case "s":
                    arg = (arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg;
                    break;

                  case "u":
                    arg = arg >>> 0;
                    break;

                  case "x":
                    arg = arg.toString(16);
                    break;

                  case "X":
                    arg = arg.toString(16).toUpperCase();
                    break;
                }
                if (re.json.test(match[8])) {
                    output[output.length] = arg;
                } else {
                    if (re.number.test(match[8]) && (!is_positive || match[3])) {
                        sign = is_positive ? "+" : "-";
                        arg = arg.toString().replace(re.sign, "");
                    } else {
                        sign = "";
                    }
                    pad_character = match[4] ? match[4] === "0" ? "0" : match[4].charAt(1) : " ";
                    pad_length = match[6] - (sign + arg).length;
                    pad = match[6] ? pad_length > 0 ? str_repeat(pad_character, pad_length) : "" : "";
                    output[output.length] = match[5] ? sign + arg + pad : pad_character === "0" ? sign + pad + arg : pad + sign + arg;
                }
            }
        }
        return output.join("");
    };
    sprintf.cache = {};
    sprintf.parse = function(fmt) {
        var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
        while (_fmt) {
            if ((match = re.text.exec(_fmt)) !== null) {
                parse_tree[parse_tree.length] = match[0];
            } else if ((match = re.modulo.exec(_fmt)) !== null) {
                parse_tree[parse_tree.length] = "%";
            } else if ((match = re.placeholder.exec(_fmt)) !== null) {
                if (match[2]) {
                    arg_names |= 1;
                    var field_list = [], replacement_field = match[2], field_match = [];
                    if ((field_match = re.key.exec(replacement_field)) !== null) {
                        field_list[field_list.length] = field_match[1];
                        while ((replacement_field = replacement_field.substring(field_match[0].length)) !== "") {
                            if ((field_match = re.key_access.exec(replacement_field)) !== null) {
                                field_list[field_list.length] = field_match[1];
                            } else if ((field_match = re.index_access.exec(replacement_field)) !== null) {
                                field_list[field_list.length] = field_match[1];
                            } else {
                                throw new SyntaxError("[sprintf] failed to parse named argument key");
                            }
                        }
                    } else {
                        throw new SyntaxError("[sprintf] failed to parse named argument key");
                    }
                    match[2] = field_list;
                } else {
                    arg_names |= 2;
                }
                if (arg_names === 3) {
                    throw new Error("[sprintf] mixing positional and named placeholders is not (yet) supported");
                }
                parse_tree[parse_tree.length] = match;
            } else {
                throw new SyntaxError("[sprintf] unexpected placeholder");
            }
            _fmt = _fmt.substring(match[0].length);
        }
        return parse_tree;
    };
    var vsprintf = function(fmt, argv, _argv) {
        _argv = (argv || []).slice(0);
        _argv.splice(0, 0, fmt);
        return sprintf.apply(null, _argv);
    };
    function get_type(variable) {
        return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
    }
    function str_repeat(input, multiplier) {
        return Array(multiplier + 1).join(input);
    }
    if (typeof exports !== "undefined") {
        exports.sprintf = sprintf;
        exports.vsprintf = vsprintf;
    } else {
        window.sprintf = sprintf;
        window.vsprintf = vsprintf;
        if (typeof define === "function" && define.amd) {
            define(function() {
                return {
                    sprintf: sprintf,
                    vsprintf: vsprintf
                };
            });
        }
    }
})(typeof window === "undefined" ? this : window);

(function() {
    var undefined;
    var VERSION = "3.8.0";
    var BIND_FLAG = 1, BIND_KEY_FLAG = 2, CURRY_BOUND_FLAG = 4, CURRY_FLAG = 8, CURRY_RIGHT_FLAG = 16, PARTIAL_FLAG = 32, PARTIAL_RIGHT_FLAG = 64, ARY_FLAG = 128, REARG_FLAG = 256;
    var DEFAULT_TRUNC_LENGTH = 30, DEFAULT_TRUNC_OMISSION = "...";
    var HOT_COUNT = 150, HOT_SPAN = 16;
    var LAZY_DROP_WHILE_FLAG = 0, LAZY_FILTER_FLAG = 1, LAZY_MAP_FLAG = 2;
    var FUNC_ERROR_TEXT = "Expected a function";
    var PLACEHOLDER = "__lodash_placeholder__";
    var argsTag = "[object Arguments]", arrayTag = "[object Array]", boolTag = "[object Boolean]", dateTag = "[object Date]", errorTag = "[object Error]", funcTag = "[object Function]", mapTag = "[object Map]", numberTag = "[object Number]", objectTag = "[object Object]", regexpTag = "[object RegExp]", setTag = "[object Set]", stringTag = "[object String]", weakMapTag = "[object WeakMap]";
    var arrayBufferTag = "[object ArrayBuffer]", float32Tag = "[object Float32Array]", float64Tag = "[object Float64Array]", int8Tag = "[object Int8Array]", int16Tag = "[object Int16Array]", int32Tag = "[object Int32Array]", uint8Tag = "[object Uint8Array]", uint8ClampedTag = "[object Uint8ClampedArray]", uint16Tag = "[object Uint16Array]", uint32Tag = "[object Uint32Array]";
    var reEmptyStringLeading = /\b__p \+= '';/g, reEmptyStringMiddle = /\b(__p \+=) '' \+/g, reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;
    var reEscapedHtml = /&(?:amp|lt|gt|quot|#39|#96);/g, reUnescapedHtml = /[&<>"'`]/g, reHasEscapedHtml = RegExp(reEscapedHtml.source), reHasUnescapedHtml = RegExp(reUnescapedHtml.source);
    var reEscape = /<%-([\s\S]+?)%>/g, reEvaluate = /<%([\s\S]+?)%>/g, reInterpolate = /<%=([\s\S]+?)%>/g;
    var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\n\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/, rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g;
    var reRegExpChars = /[.*+?^${}()|[\]\/\\]/g, reHasRegExpChars = RegExp(reRegExpChars.source);
    var reComboMark = /[\u0300-\u036f\ufe20-\ufe23]/g;
    var reEscapeChar = /\\(\\)?/g;
    var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;
    var reFlags = /\w*$/;
    var reHasHexPrefix = /^0[xX]/;
    var reIsHostCtor = /^\[object .+?Constructor\]$/;
    var reLatin1 = /[\xc0-\xd6\xd8-\xde\xdf-\xf6\xf8-\xff]/g;
    var reNoMatch = /($^)/;
    var reUnescapedString = /['\n\r\u2028\u2029\\]/g;
    var reWords = function() {
        var upper = "[A-Z\\xc0-\\xd6\\xd8-\\xde]", lower = "[a-z\\xdf-\\xf6\\xf8-\\xff]+";
        return RegExp(upper + "+(?=" + upper + lower + ")|" + upper + "?" + lower + "|" + upper + "+|[0-9]+", "g");
    }();
    var whitespace = " 	\f \ufeff" + "\n\r\u2028\u2029" + " ᠎             　";
    var contextProps = [ "Array", "ArrayBuffer", "Date", "Error", "Float32Array", "Float64Array", "Function", "Int8Array", "Int16Array", "Int32Array", "Math", "Number", "Object", "RegExp", "Set", "String", "_", "clearTimeout", "document", "isFinite", "parseInt", "setTimeout", "TypeError", "Uint8Array", "Uint8ClampedArray", "Uint16Array", "Uint32Array", "WeakMap", "window" ];
    var shadowProps = [ "constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf" ];
    var templateCounter = -1;
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
    var cloneableTags = {};
    cloneableTags[argsTag] = cloneableTags[arrayTag] = cloneableTags[arrayBufferTag] = cloneableTags[boolTag] = cloneableTags[dateTag] = cloneableTags[float32Tag] = cloneableTags[float64Tag] = cloneableTags[int8Tag] = cloneableTags[int16Tag] = cloneableTags[int32Tag] = cloneableTags[numberTag] = cloneableTags[objectTag] = cloneableTags[regexpTag] = cloneableTags[stringTag] = cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] = cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
    cloneableTags[errorTag] = cloneableTags[funcTag] = cloneableTags[mapTag] = cloneableTags[setTag] = cloneableTags[weakMapTag] = false;
    var debounceOptions = {
        leading: false,
        maxWait: 0,
        trailing: false
    };
    var deburredLetters = {
        "À": "A",
        "Á": "A",
        "Â": "A",
        "Ã": "A",
        "Ä": "A",
        "Å": "A",
        "à": "a",
        "á": "a",
        "â": "a",
        "ã": "a",
        "ä": "a",
        "å": "a",
        "Ç": "C",
        "ç": "c",
        "Ð": "D",
        "ð": "d",
        "È": "E",
        "É": "E",
        "Ê": "E",
        "Ë": "E",
        "è": "e",
        "é": "e",
        "ê": "e",
        "ë": "e",
        "Ì": "I",
        "Í": "I",
        "Î": "I",
        "Ï": "I",
        "ì": "i",
        "í": "i",
        "î": "i",
        "ï": "i",
        "Ñ": "N",
        "ñ": "n",
        "Ò": "O",
        "Ó": "O",
        "Ô": "O",
        "Õ": "O",
        "Ö": "O",
        "Ø": "O",
        "ò": "o",
        "ó": "o",
        "ô": "o",
        "õ": "o",
        "ö": "o",
        "ø": "o",
        "Ù": "U",
        "Ú": "U",
        "Û": "U",
        "Ü": "U",
        "ù": "u",
        "ú": "u",
        "û": "u",
        "ü": "u",
        "Ý": "Y",
        "ý": "y",
        "ÿ": "y",
        "Æ": "Ae",
        "æ": "ae",
        "Þ": "Th",
        "þ": "th",
        "ß": "ss"
    };
    var htmlEscapes = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "`": "&#96;"
    };
    var htmlUnescapes = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&#39;": "'",
        "&#96;": "`"
    };
    var objectTypes = {
        "function": true,
        object: true
    };
    var stringEscapes = {
        "\\": "\\",
        "'": "'",
        "\n": "n",
        "\r": "r",
        "\u2028": "u2028",
        "\u2029": "u2029"
    };
    var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;
    var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;
    var freeGlobal = freeExports && freeModule && typeof global == "object" && global && global.Object && global;
    var freeSelf = objectTypes[typeof self] && self && self.Object && self;
    var freeWindow = objectTypes[typeof window] && window && window.Object && window;
    var moduleExports = freeModule && freeModule.exports === freeExports && freeExports;
    var root = freeGlobal || freeWindow !== (this && this.window) && freeWindow || freeSelf || this;
    function baseCompareAscending(value, other) {
        if (value !== other) {
            var valIsReflexive = value === value, othIsReflexive = other === other;
            if (value > other || !valIsReflexive || value === undefined && othIsReflexive) {
                return 1;
            }
            if (value < other || !othIsReflexive || other === undefined && valIsReflexive) {
                return -1;
            }
        }
        return 0;
    }
    function baseFindIndex(array, predicate, fromRight) {
        var length = array.length, index = fromRight ? length : -1;
        while (fromRight ? index-- : ++index < length) {
            if (predicate(array[index], index, array)) {
                return index;
            }
        }
        return -1;
    }
    function baseIndexOf(array, value, fromIndex) {
        if (value !== value) {
            return indexOfNaN(array, fromIndex);
        }
        var index = fromIndex - 1, length = array.length;
        while (++index < length) {
            if (array[index] === value) {
                return index;
            }
        }
        return -1;
    }
    function baseIsFunction(value) {
        return typeof value == "function" || false;
    }
    function baseToString(value) {
        if (typeof value == "string") {
            return value;
        }
        return value == null ? "" : value + "";
    }
    function charAtCallback(string) {
        return string.charCodeAt(0);
    }
    function charsLeftIndex(string, chars) {
        var index = -1, length = string.length;
        while (++index < length && chars.indexOf(string.charAt(index)) > -1) {}
        return index;
    }
    function charsRightIndex(string, chars) {
        var index = string.length;
        while (index-- && chars.indexOf(string.charAt(index)) > -1) {}
        return index;
    }
    function compareAscending(object, other) {
        return baseCompareAscending(object.criteria, other.criteria) || object.index - other.index;
    }
    function compareMultiple(object, other, orders) {
        var index = -1, objCriteria = object.criteria, othCriteria = other.criteria, length = objCriteria.length, ordersLength = orders.length;
        while (++index < length) {
            var result = baseCompareAscending(objCriteria[index], othCriteria[index]);
            if (result) {
                if (index >= ordersLength) {
                    return result;
                }
                return result * (orders[index] ? 1 : -1);
            }
        }
        return object.index - other.index;
    }
    function deburrLetter(letter) {
        return deburredLetters[letter];
    }
    function escapeHtmlChar(chr) {
        return htmlEscapes[chr];
    }
    function escapeStringChar(chr) {
        return "\\" + stringEscapes[chr];
    }
    function indexOfNaN(array, fromIndex, fromRight) {
        var length = array.length, index = fromIndex + (fromRight ? 0 : -1);
        while (fromRight ? index-- : ++index < length) {
            var other = array[index];
            if (other !== other) {
                return index;
            }
        }
        return -1;
    }
    var isHostObject = function() {
        try {
            Object({
                toString: 0
            } + "");
        } catch (e) {
            return function() {
                return false;
            };
        }
        return function(value) {
            return typeof value.toString != "function" && typeof (value + "") == "string";
        };
    }();
    function isObjectLike(value) {
        return !!value && typeof value == "object";
    }
    function isSpace(charCode) {
        return charCode <= 160 && (charCode >= 9 && charCode <= 13) || charCode == 32 || charCode == 160 || charCode == 5760 || charCode == 6158 || charCode >= 8192 && (charCode <= 8202 || charCode == 8232 || charCode == 8233 || charCode == 8239 || charCode == 8287 || charCode == 12288 || charCode == 65279);
    }
    function replaceHolders(array, placeholder) {
        var index = -1, length = array.length, resIndex = -1, result = [];
        while (++index < length) {
            if (array[index] === placeholder) {
                array[index] = PLACEHOLDER;
                result[++resIndex] = index;
            }
        }
        return result;
    }
    function sortedUniq(array, iteratee) {
        var seen, index = -1, length = array.length, resIndex = -1, result = [];
        while (++index < length) {
            var value = array[index], computed = iteratee ? iteratee(value, index, array) : value;
            if (!index || seen !== computed) {
                seen = computed;
                result[++resIndex] = value;
            }
        }
        return result;
    }
    function trimmedLeftIndex(string) {
        var index = -1, length = string.length;
        while (++index < length && isSpace(string.charCodeAt(index))) {}
        return index;
    }
    function trimmedRightIndex(string) {
        var index = string.length;
        while (index-- && isSpace(string.charCodeAt(index))) {}
        return index;
    }
    function unescapeHtmlChar(chr) {
        return htmlUnescapes[chr];
    }
    function runInContext(context) {
        context = context ? _.defaults(root.Object(), context, _.pick(root, contextProps)) : root;
        var Array = context.Array, Date = context.Date, Error = context.Error, Function = context.Function, Math = context.Math, Number = context.Number, Object = context.Object, RegExp = context.RegExp, String = context.String, TypeError = context.TypeError;
        var arrayProto = Array.prototype, errorProto = Error.prototype, objectProto = Object.prototype, stringProto = String.prototype;
        var document = (document = context.window) && document.document;
        var fnToString = Function.prototype.toString;
        var hasOwnProperty = objectProto.hasOwnProperty;
        var idCounter = 0;
        var objToString = objectProto.toString;
        var oldDash = context._;
        var reIsNative = RegExp("^" + escapeRegExp(objToString).replace(/toString|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
        var ArrayBuffer = isNative(ArrayBuffer = context.ArrayBuffer) && ArrayBuffer, bufferSlice = isNative(bufferSlice = ArrayBuffer && new ArrayBuffer(0).slice) && bufferSlice, ceil = Math.ceil, clearTimeout = context.clearTimeout, floor = Math.floor, getOwnPropertySymbols = isNative(getOwnPropertySymbols = Object.getOwnPropertySymbols) && getOwnPropertySymbols, getPrototypeOf = isNative(getPrototypeOf = Object.getPrototypeOf) && getPrototypeOf, push = arrayProto.push, preventExtensions = isNative(preventExtensions = Object.preventExtensions) && preventExtensions, propertyIsEnumerable = objectProto.propertyIsEnumerable, Set = isNative(Set = context.Set) && Set, setTimeout = context.setTimeout, splice = arrayProto.splice, Uint8Array = isNative(Uint8Array = context.Uint8Array) && Uint8Array, WeakMap = isNative(WeakMap = context.WeakMap) && WeakMap;
        var Float64Array = function() {
            try {
                var func = isNative(func = context.Float64Array) && func, result = new func(new ArrayBuffer(10), 0, 1) && func;
            } catch (e) {}
            return result;
        }();
        var nativeAssign = function() {
            var func = preventExtensions && isNative(func = Object.assign) && func;
            try {
                if (func) {
                    var object = preventExtensions({
                        "1": 0
                    });
                    object[0] = 1;
                }
            } catch (e) {
                try {
                    func(object, "xo");
                } catch (e) {}
                return !object[1] && func;
            }
            return false;
        }();
        var nativeIsArray = isNative(nativeIsArray = Array.isArray) && nativeIsArray, nativeCreate = isNative(nativeCreate = Object.create) && nativeCreate, nativeIsFinite = context.isFinite, nativeKeys = isNative(nativeKeys = Object.keys) && nativeKeys, nativeMax = Math.max, nativeMin = Math.min, nativeNow = isNative(nativeNow = Date.now) && nativeNow, nativeNumIsFinite = isNative(nativeNumIsFinite = Number.isFinite) && nativeNumIsFinite, nativeParseInt = context.parseInt, nativeRandom = Math.random;
        var NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY, POSITIVE_INFINITY = Number.POSITIVE_INFINITY;
        var MAX_ARRAY_LENGTH = Math.pow(2, 32) - 1, MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1, HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;
        var FLOAT64_BYTES_PER_ELEMENT = Float64Array ? Float64Array.BYTES_PER_ELEMENT : 0;
        var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;
        var metaMap = WeakMap && new WeakMap();
        var realNames = {};
        var ctorByTag = {};
        ctorByTag[float32Tag] = context.Float32Array;
        ctorByTag[float64Tag] = context.Float64Array;
        ctorByTag[int8Tag] = context.Int8Array;
        ctorByTag[int16Tag] = context.Int16Array;
        ctorByTag[int32Tag] = context.Int32Array;
        ctorByTag[uint8Tag] = context.Uint8Array;
        ctorByTag[uint8ClampedTag] = context.Uint8ClampedArray;
        ctorByTag[uint16Tag] = context.Uint16Array;
        ctorByTag[uint32Tag] = context.Uint32Array;
        var nonEnumProps = {};
        nonEnumProps[arrayTag] = nonEnumProps[dateTag] = nonEnumProps[numberTag] = {
            constructor: true,
            toLocaleString: true,
            toString: true,
            valueOf: true
        };
        nonEnumProps[boolTag] = nonEnumProps[stringTag] = {
            constructor: true,
            toString: true,
            valueOf: true
        };
        nonEnumProps[errorTag] = nonEnumProps[funcTag] = nonEnumProps[regexpTag] = {
            constructor: true,
            toString: true
        };
        nonEnumProps[objectTag] = {
            constructor: true
        };
        arrayEach(shadowProps, function(key) {
            for (var tag in nonEnumProps) {
                if (hasOwnProperty.call(nonEnumProps, tag)) {
                    var props = nonEnumProps[tag];
                    props[key] = hasOwnProperty.call(props, key);
                }
            }
        });
        function lodash(value) {
            if (isObjectLike(value) && !isArray(value) && !(value instanceof LazyWrapper)) {
                if (value instanceof LodashWrapper) {
                    return value;
                }
                if (hasOwnProperty.call(value, "__chain__") && hasOwnProperty.call(value, "__wrapped__")) {
                    return wrapperClone(value);
                }
            }
            return new LodashWrapper(value);
        }
        function baseLodash() {}
        function LodashWrapper(value, chainAll, actions) {
            this.__wrapped__ = value;
            this.__actions__ = actions || [];
            this.__chain__ = !!chainAll;
        }
        var support = lodash.support = {};
        (function(x) {
            var Ctor = function() {
                this.x = x;
            }, args = arguments, object = {
                "0": x,
                length: x
            }, props = [];
            Ctor.prototype = {
                valueOf: x,
                y: x
            };
            for (var key in new Ctor()) {
                props.push(key);
            }
            support.argsTag = objToString.call(args) == argsTag;
            support.enumErrorProps = propertyIsEnumerable.call(errorProto, "message") || propertyIsEnumerable.call(errorProto, "name");
            support.enumPrototypes = propertyIsEnumerable.call(Ctor, "prototype");
            support.funcDecomp = /\bthis\b/.test(function() {
                return this;
            });
            support.funcNames = typeof Function.name == "string";
            support.nodeTag = objToString.call(document) != objectTag;
            support.nonEnumStrings = !propertyIsEnumerable.call("x", 0);
            support.nonEnumShadows = !/valueOf/.test(props);
            support.ownLast = props[0] != "x";
            support.spliceObjects = (splice.call(object, 0, 1), !object[0]);
            support.unindexedChars = "x"[0] + Object("x")[0] != "xx";
            try {
                support.dom = document.createDocumentFragment().nodeType === 11;
            } catch (e) {
                support.dom = false;
            }
            try {
                support.nonEnumArgs = !propertyIsEnumerable.call(args, 1);
            } catch (e) {
                support.nonEnumArgs = true;
            }
        })(1, 0);
        lodash.templateSettings = {
            escape: reEscape,
            evaluate: reEvaluate,
            interpolate: reInterpolate,
            variable: "",
            imports: {
                _: lodash
            }
        };
        function LazyWrapper(value) {
            this.__wrapped__ = value;
            this.__actions__ = null;
            this.__dir__ = 1;
            this.__dropCount__ = 0;
            this.__filtered__ = false;
            this.__iteratees__ = null;
            this.__takeCount__ = POSITIVE_INFINITY;
            this.__views__ = null;
        }
        function lazyClone() {
            var actions = this.__actions__, iteratees = this.__iteratees__, views = this.__views__, result = new LazyWrapper(this.__wrapped__);
            result.__actions__ = actions ? arrayCopy(actions) : null;
            result.__dir__ = this.__dir__;
            result.__filtered__ = this.__filtered__;
            result.__iteratees__ = iteratees ? arrayCopy(iteratees) : null;
            result.__takeCount__ = this.__takeCount__;
            result.__views__ = views ? arrayCopy(views) : null;
            return result;
        }
        function lazyReverse() {
            if (this.__filtered__) {
                var result = new LazyWrapper(this);
                result.__dir__ = -1;
                result.__filtered__ = true;
            } else {
                result = this.clone();
                result.__dir__ *= -1;
            }
            return result;
        }
        function lazyValue() {
            var array = this.__wrapped__.value();
            if (!isArray(array)) {
                return baseWrapperValue(array, this.__actions__);
            }
            var dir = this.__dir__, isRight = dir < 0, view = getView(0, array.length, this.__views__), start = view.start, end = view.end, length = end - start, index = isRight ? end : start - 1, takeCount = nativeMin(length, this.__takeCount__), iteratees = this.__iteratees__, iterLength = iteratees ? iteratees.length : 0, resIndex = 0, result = [];
            outer: while (length-- && resIndex < takeCount) {
                index += dir;
                var iterIndex = -1, value = array[index];
                while (++iterIndex < iterLength) {
                    var data = iteratees[iterIndex], iteratee = data.iteratee, type = data.type;
                    if (type == LAZY_DROP_WHILE_FLAG) {
                        if (data.done && (isRight ? index > data.index : index < data.index)) {
                            data.count = 0;
                            data.done = false;
                        }
                        data.index = index;
                        if (!data.done) {
                            var limit = data.limit;
                            if (!(data.done = limit > -1 ? data.count++ >= limit : !iteratee(value))) {
                                continue outer;
                            }
                        }
                    } else {
                        var computed = iteratee(value);
                        if (type == LAZY_MAP_FLAG) {
                            value = computed;
                        } else if (!computed) {
                            if (type == LAZY_FILTER_FLAG) {
                                continue outer;
                            } else {
                                break outer;
                            }
                        }
                    }
                }
                result[resIndex++] = value;
            }
            return result;
        }
        function MapCache() {
            this.__data__ = {};
        }
        function mapDelete(key) {
            return this.has(key) && delete this.__data__[key];
        }
        function mapGet(key) {
            return key == "__proto__" ? undefined : this.__data__[key];
        }
        function mapHas(key) {
            return key != "__proto__" && hasOwnProperty.call(this.__data__, key);
        }
        function mapSet(key, value) {
            if (key != "__proto__") {
                this.__data__[key] = value;
            }
            return this;
        }
        function SetCache(values) {
            var length = values ? values.length : 0;
            this.data = {
                hash: nativeCreate(null),
                set: new Set()
            };
            while (length--) {
                this.push(values[length]);
            }
        }
        function cacheIndexOf(cache, value) {
            var data = cache.data, result = typeof value == "string" || isObject(value) ? data.set.has(value) : data.hash[value];
            return result ? 0 : -1;
        }
        function cachePush(value) {
            var data = this.data;
            if (typeof value == "string" || isObject(value)) {
                data.set.add(value);
            } else {
                data.hash[value] = true;
            }
        }
        function arrayCopy(source, array) {
            var index = -1, length = source.length;
            array || (array = Array(length));
            while (++index < length) {
                array[index] = source[index];
            }
            return array;
        }
        function arrayEach(array, iteratee) {
            var index = -1, length = array.length;
            while (++index < length) {
                if (iteratee(array[index], index, array) === false) {
                    break;
                }
            }
            return array;
        }
        function arrayEachRight(array, iteratee) {
            var length = array.length;
            while (length--) {
                if (iteratee(array[length], length, array) === false) {
                    break;
                }
            }
            return array;
        }
        function arrayEvery(array, predicate) {
            var index = -1, length = array.length;
            while (++index < length) {
                if (!predicate(array[index], index, array)) {
                    return false;
                }
            }
            return true;
        }
        function arrayFilter(array, predicate) {
            var index = -1, length = array.length, resIndex = -1, result = [];
            while (++index < length) {
                var value = array[index];
                if (predicate(value, index, array)) {
                    result[++resIndex] = value;
                }
            }
            return result;
        }
        function arrayMap(array, iteratee) {
            var index = -1, length = array.length, result = Array(length);
            while (++index < length) {
                result[index] = iteratee(array[index], index, array);
            }
            return result;
        }
        function arrayMax(array) {
            var index = -1, length = array.length, result = NEGATIVE_INFINITY;
            while (++index < length) {
                var value = array[index];
                if (value > result) {
                    result = value;
                }
            }
            return result;
        }
        function arrayMin(array) {
            var index = -1, length = array.length, result = POSITIVE_INFINITY;
            while (++index < length) {
                var value = array[index];
                if (value < result) {
                    result = value;
                }
            }
            return result;
        }
        function arrayReduce(array, iteratee, accumulator, initFromArray) {
            var index = -1, length = array.length;
            if (initFromArray && length) {
                accumulator = array[++index];
            }
            while (++index < length) {
                accumulator = iteratee(accumulator, array[index], index, array);
            }
            return accumulator;
        }
        function arrayReduceRight(array, iteratee, accumulator, initFromArray) {
            var length = array.length;
            if (initFromArray && length) {
                accumulator = array[--length];
            }
            while (length--) {
                accumulator = iteratee(accumulator, array[length], length, array);
            }
            return accumulator;
        }
        function arraySome(array, predicate) {
            var index = -1, length = array.length;
            while (++index < length) {
                if (predicate(array[index], index, array)) {
                    return true;
                }
            }
            return false;
        }
        function arraySum(array) {
            var length = array.length, result = 0;
            while (length--) {
                result += +array[length] || 0;
            }
            return result;
        }
        function assignDefaults(objectValue, sourceValue) {
            return objectValue === undefined ? sourceValue : objectValue;
        }
        function assignOwnDefaults(objectValue, sourceValue, key, object) {
            return objectValue === undefined || !hasOwnProperty.call(object, key) ? sourceValue : objectValue;
        }
        function assignWith(object, source, customizer) {
            var props = keys(source);
            push.apply(props, getSymbols(source));
            var index = -1, length = props.length;
            while (++index < length) {
                var key = props[index], value = object[key], result = customizer(value, source[key], key, object, source);
                if ((result === result ? result !== value : value === value) || value === undefined && !(key in object)) {
                    object[key] = result;
                }
            }
            return object;
        }
        var baseAssign = nativeAssign || function(object, source) {
            return source == null ? object : baseCopy(source, getSymbols(source), baseCopy(source, keys(source), object));
        };
        function baseAt(collection, props) {
            var index = -1, isNil = collection == null, isArr = !isNil && isArrayLike(collection), length = isArr && collection.length, propsLength = props.length, result = Array(propsLength);
            while (++index < propsLength) {
                var key = props[index];
                if (isArr) {
                    result[index] = isIndex(key, length) ? collection[key] : undefined;
                } else {
                    result[index] = isNil ? undefined : collection[key];
                }
            }
            return result;
        }
        function baseCopy(source, props, object) {
            object || (object = {});
            var index = -1, length = props.length;
            while (++index < length) {
                var key = props[index];
                object[key] = source[key];
            }
            return object;
        }
        function baseCallback(func, thisArg, argCount) {
            var type = typeof func;
            if (type == "function") {
                return thisArg === undefined ? func : bindCallback(func, thisArg, argCount);
            }
            if (func == null) {
                return identity;
            }
            if (type == "object") {
                return baseMatches(func);
            }
            return thisArg === undefined ? property(func) : baseMatchesProperty(func, thisArg);
        }
        function baseClone(value, isDeep, customizer, key, object, stackA, stackB) {
            var result;
            if (customizer) {
                result = object ? customizer(value, key, object) : customizer(value);
            }
            if (result !== undefined) {
                return result;
            }
            if (!isObject(value)) {
                return value;
            }
            var isArr = isArray(value);
            if (isArr) {
                result = initCloneArray(value);
                if (!isDeep) {
                    return arrayCopy(value, result);
                }
            } else {
                var tag = objToString.call(value), isFunc = tag == funcTag;
                if (tag == objectTag || tag == argsTag || isFunc && !object) {
                    if (isHostObject(value)) {
                        return object ? value : {};
                    }
                    result = initCloneObject(isFunc ? {} : value);
                    if (!isDeep) {
                        return baseAssign(result, value);
                    }
                } else {
                    return cloneableTags[tag] ? initCloneByTag(value, tag, isDeep) : object ? value : {};
                }
            }
            stackA || (stackA = []);
            stackB || (stackB = []);
            var length = stackA.length;
            while (length--) {
                if (stackA[length] == value) {
                    return stackB[length];
                }
            }
            stackA.push(value);
            stackB.push(result);
            (isArr ? arrayEach : baseForOwn)(value, function(subValue, key) {
                result[key] = baseClone(subValue, isDeep, customizer, key, value, stackA, stackB);
            });
            return result;
        }
        var baseCreate = function() {
            function Object() {}
            return function(prototype) {
                if (isObject(prototype)) {
                    Object.prototype = prototype;
                    var result = new Object();
                    Object.prototype = null;
                }
                return result || context.Object();
            };
        }();
        function baseDelay(func, wait, args) {
            if (typeof func != "function") {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            return setTimeout(function() {
                func.apply(undefined, args);
            }, wait);
        }
        function baseDifference(array, values) {
            var length = array ? array.length : 0, result = [];
            if (!length) {
                return result;
            }
            var index = -1, indexOf = getIndexOf(), isCommon = indexOf == baseIndexOf, cache = isCommon && values.length >= 200 ? createCache(values) : null, valuesLength = values.length;
            if (cache) {
                indexOf = cacheIndexOf;
                isCommon = false;
                values = cache;
            }
            outer: while (++index < length) {
                var value = array[index];
                if (isCommon && value === value) {
                    var valuesIndex = valuesLength;
                    while (valuesIndex--) {
                        if (values[valuesIndex] === value) {
                            continue outer;
                        }
                    }
                    result.push(value);
                } else if (indexOf(values, value, 0) < 0) {
                    result.push(value);
                }
            }
            return result;
        }
        var baseEach = createBaseEach(baseForOwn);
        var baseEachRight = createBaseEach(baseForOwnRight, true);
        function baseEvery(collection, predicate) {
            var result = true;
            baseEach(collection, function(value, index, collection) {
                result = !!predicate(value, index, collection);
                return result;
            });
            return result;
        }
        function baseFill(array, value, start, end) {
            var length = array.length;
            start = start == null ? 0 : +start || 0;
            if (start < 0) {
                start = -start > length ? 0 : length + start;
            }
            end = end === undefined || end > length ? length : +end || 0;
            if (end < 0) {
                end += length;
            }
            length = start > end ? 0 : end >>> 0;
            start >>>= 0;
            while (start < length) {
                array[start++] = value;
            }
            return array;
        }
        function baseFilter(collection, predicate) {
            var result = [];
            baseEach(collection, function(value, index, collection) {
                if (predicate(value, index, collection)) {
                    result.push(value);
                }
            });
            return result;
        }
        function baseFind(collection, predicate, eachFunc, retKey) {
            var result;
            eachFunc(collection, function(value, key, collection) {
                if (predicate(value, key, collection)) {
                    result = retKey ? key : value;
                    return false;
                }
            });
            return result;
        }
        function baseFlatten(array, isDeep, isStrict) {
            var index = -1, length = array.length, resIndex = -1, result = [];
            while (++index < length) {
                var value = array[index];
                if (isObjectLike(value) && isArrayLike(value) && (isStrict || isArray(value) || isArguments(value))) {
                    if (isDeep) {
                        value = baseFlatten(value, isDeep, isStrict);
                    }
                    var valIndex = -1, valLength = value.length;
                    while (++valIndex < valLength) {
                        result[++resIndex] = value[valIndex];
                    }
                } else if (!isStrict) {
                    result[++resIndex] = value;
                }
            }
            return result;
        }
        var baseFor = createBaseFor();
        var baseForRight = createBaseFor(true);
        function baseForIn(object, iteratee) {
            return baseFor(object, iteratee, keysIn);
        }
        function baseForOwn(object, iteratee) {
            return baseFor(object, iteratee, keys);
        }
        function baseForOwnRight(object, iteratee) {
            return baseForRight(object, iteratee, keys);
        }
        function baseFunctions(object, props) {
            var index = -1, length = props.length, resIndex = -1, result = [];
            while (++index < length) {
                var key = props[index];
                if (isFunction(object[key])) {
                    result[++resIndex] = key;
                }
            }
            return result;
        }
        function baseGet(object, path, pathKey) {
            if (object == null) {
                return;
            }
            object = toObject(object);
            if (pathKey !== undefined && pathKey in object) {
                path = [ pathKey ];
            }
            var index = -1, length = path.length;
            while (object != null && ++index < length) {
                object = toObject(object)[path[index]];
            }
            return index && index == length ? object : undefined;
        }
        function baseIsEqual(value, other, customizer, isLoose, stackA, stackB) {
            if (value === other) {
                return true;
            }
            var valType = typeof value, othType = typeof other;
            if (valType != "function" && valType != "object" && othType != "function" && othType != "object" || value == null || other == null) {
                return value !== value && other !== other;
            }
            return baseIsEqualDeep(value, other, baseIsEqual, customizer, isLoose, stackA, stackB);
        }
        function baseIsEqualDeep(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
            var objIsArr = isArray(object), othIsArr = isArray(other), objTag = arrayTag, othTag = arrayTag;
            if (!objIsArr) {
                objTag = objToString.call(object);
                if (objTag == argsTag) {
                    objTag = objectTag;
                } else if (objTag != objectTag) {
                    objIsArr = isTypedArray(object);
                }
            }
            if (!othIsArr) {
                othTag = objToString.call(other);
                if (othTag == argsTag) {
                    othTag = objectTag;
                } else if (othTag != objectTag) {
                    othIsArr = isTypedArray(other);
                }
            }
            var objIsObj = objTag == objectTag && !isHostObject(object), othIsObj = othTag == objectTag && !isHostObject(other), isSameTag = objTag == othTag;
            if (isSameTag && !(objIsArr || objIsObj)) {
                return equalByTag(object, other, objTag);
            }
            if (!isLoose) {
                var valWrapped = objIsObj && hasOwnProperty.call(object, "__wrapped__"), othWrapped = othIsObj && hasOwnProperty.call(other, "__wrapped__");
                if (valWrapped || othWrapped) {
                    return equalFunc(valWrapped ? object.value() : object, othWrapped ? other.value() : other, customizer, isLoose, stackA, stackB);
                }
            }
            if (!isSameTag) {
                return false;
            }
            stackA || (stackA = []);
            stackB || (stackB = []);
            var length = stackA.length;
            while (length--) {
                if (stackA[length] == object) {
                    return stackB[length] == other;
                }
            }
            stackA.push(object);
            stackB.push(other);
            var result = (objIsArr ? equalArrays : equalObjects)(object, other, equalFunc, customizer, isLoose, stackA, stackB);
            stackA.pop();
            stackB.pop();
            return result;
        }
        function baseIsMatch(object, props, values, strictCompareFlags, customizer) {
            var index = -1, length = props.length, noCustomizer = !customizer;
            while (++index < length) {
                if (noCustomizer && strictCompareFlags[index] ? values[index] !== object[props[index]] : !(props[index] in object)) {
                    return false;
                }
            }
            index = -1;
            while (++index < length) {
                var key = props[index], objValue = object[key], srcValue = values[index];
                if (noCustomizer && strictCompareFlags[index]) {
                    var result = objValue !== undefined || key in object;
                } else {
                    result = customizer ? customizer(objValue, srcValue, key) : undefined;
                    if (result === undefined) {
                        result = baseIsEqual(srcValue, objValue, customizer, true);
                    }
                }
                if (!result) {
                    return false;
                }
            }
            return true;
        }
        function baseMap(collection, iteratee) {
            var index = -1, result = isArrayLike(collection) ? Array(collection.length) : [];
            baseEach(collection, function(value, key, collection) {
                result[++index] = iteratee(value, key, collection);
            });
            return result;
        }
        function baseMatches(source) {
            var props = keys(source), length = props.length;
            if (!length) {
                return constant(true);
            }
            if (length == 1) {
                var key = props[0], value = source[key];
                if (isStrictComparable(value)) {
                    return function(object) {
                        if (object == null) {
                            return false;
                        }
                        object = toObject(object);
                        return object[key] === value && (value !== undefined || key in object);
                    };
                }
            }
            var values = Array(length), strictCompareFlags = Array(length);
            while (length--) {
                value = source[props[length]];
                values[length] = value;
                strictCompareFlags[length] = isStrictComparable(value);
            }
            return function(object) {
                return object != null && baseIsMatch(toObject(object), props, values, strictCompareFlags);
            };
        }
        function baseMatchesProperty(path, value) {
            var isArr = isArray(path), isCommon = isKey(path) && isStrictComparable(value), pathKey = path + "";
            path = toPath(path);
            return function(object) {
                if (object == null) {
                    return false;
                }
                var key = pathKey;
                object = toObject(object);
                if ((isArr || !isCommon) && !(key in object)) {
                    object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
                    if (object == null) {
                        return false;
                    }
                    key = last(path);
                    object = toObject(object);
                }
                return object[key] === value ? value !== undefined || key in object : baseIsEqual(value, object[key], null, true);
            };
        }
        function baseMerge(object, source, customizer, stackA, stackB) {
            if (!isObject(object)) {
                return object;
            }
            var isSrcArr = isArrayLike(source) && (isArray(source) || isTypedArray(source));
            if (!isSrcArr) {
                var props = keys(source);
                push.apply(props, getSymbols(source));
            }
            arrayEach(props || source, function(srcValue, key) {
                if (props) {
                    key = srcValue;
                    srcValue = source[key];
                }
                if (isObjectLike(srcValue)) {
                    stackA || (stackA = []);
                    stackB || (stackB = []);
                    baseMergeDeep(object, source, key, baseMerge, customizer, stackA, stackB);
                } else {
                    var value = object[key], result = customizer ? customizer(value, srcValue, key, object, source) : undefined, isCommon = result === undefined;
                    if (isCommon) {
                        result = srcValue;
                    }
                    if ((isSrcArr || result !== undefined) && (isCommon || (result === result ? result !== value : value === value))) {
                        object[key] = result;
                    }
                }
            });
            return object;
        }
        function baseMergeDeep(object, source, key, mergeFunc, customizer, stackA, stackB) {
            var length = stackA.length, srcValue = source[key];
            while (length--) {
                if (stackA[length] == srcValue) {
                    object[key] = stackB[length];
                    return;
                }
            }
            var value = object[key], result = customizer ? customizer(value, srcValue, key, object, source) : undefined, isCommon = result === undefined;
            if (isCommon) {
                result = srcValue;
                if (isArrayLike(srcValue) && (isArray(srcValue) || isTypedArray(srcValue))) {
                    result = isArray(value) ? value : isArrayLike(value) ? arrayCopy(value) : [];
                } else if (isPlainObject(srcValue) || isArguments(srcValue)) {
                    result = isArguments(value) ? toPlainObject(value) : isPlainObject(value) ? value : {};
                } else {
                    isCommon = false;
                }
            }
            stackA.push(srcValue);
            stackB.push(result);
            if (isCommon) {
                object[key] = mergeFunc(result, srcValue, customizer, stackA, stackB);
            } else if (result === result ? result !== value : value === value) {
                object[key] = result;
            }
        }
        function baseProperty(key) {
            return function(object) {
                return object == null ? undefined : toObject(object)[key];
            };
        }
        function basePropertyDeep(path) {
            var pathKey = path + "";
            path = toPath(path);
            return function(object) {
                return baseGet(object, path, pathKey);
            };
        }
        function basePullAt(array, indexes) {
            var length = array ? indexes.length : 0;
            while (length--) {
                var index = parseFloat(indexes[length]);
                if (index != previous && isIndex(index)) {
                    var previous = index;
                    splice.call(array, index, 1);
                }
            }
            return array;
        }
        function baseRandom(min, max) {
            return min + floor(nativeRandom() * (max - min + 1));
        }
        function baseReduce(collection, iteratee, accumulator, initFromCollection, eachFunc) {
            eachFunc(collection, function(value, index, collection) {
                accumulator = initFromCollection ? (initFromCollection = false, value) : iteratee(accumulator, value, index, collection);
            });
            return accumulator;
        }
        var baseSetData = !metaMap ? identity : function(func, data) {
            metaMap.set(func, data);
            return func;
        };
        function baseSlice(array, start, end) {
            var index = -1, length = array.length;
            start = start == null ? 0 : +start || 0;
            if (start < 0) {
                start = -start > length ? 0 : length + start;
            }
            end = end === undefined || end > length ? length : +end || 0;
            if (end < 0) {
                end += length;
            }
            length = start > end ? 0 : end - start >>> 0;
            start >>>= 0;
            var result = Array(length);
            while (++index < length) {
                result[index] = array[index + start];
            }
            return result;
        }
        function baseSome(collection, predicate) {
            var result;
            baseEach(collection, function(value, index, collection) {
                result = predicate(value, index, collection);
                return !result;
            });
            return !!result;
        }
        function baseSortBy(array, comparer) {
            var length = array.length;
            array.sort(comparer);
            while (length--) {
                array[length] = array[length].value;
            }
            return array;
        }
        function baseSortByOrder(collection, iteratees, orders) {
            var callback = getCallback(), index = -1;
            iteratees = arrayMap(iteratees, function(iteratee) {
                return callback(iteratee);
            });
            var result = baseMap(collection, function(value) {
                var criteria = arrayMap(iteratees, function(iteratee) {
                    return iteratee(value);
                });
                return {
                    criteria: criteria,
                    index: ++index,
                    value: value
                };
            });
            return baseSortBy(result, function(object, other) {
                return compareMultiple(object, other, orders);
            });
        }
        function baseSum(collection, iteratee) {
            var result = 0;
            baseEach(collection, function(value, index, collection) {
                result += +iteratee(value, index, collection) || 0;
            });
            return result;
        }
        function baseUniq(array, iteratee) {
            var index = -1, indexOf = getIndexOf(), length = array.length, isCommon = indexOf == baseIndexOf, isLarge = isCommon && length >= 200, seen = isLarge ? createCache() : null, result = [];
            if (seen) {
                indexOf = cacheIndexOf;
                isCommon = false;
            } else {
                isLarge = false;
                seen = iteratee ? [] : result;
            }
            outer: while (++index < length) {
                var value = array[index], computed = iteratee ? iteratee(value, index, array) : value;
                if (isCommon && value === value) {
                    var seenIndex = seen.length;
                    while (seenIndex--) {
                        if (seen[seenIndex] === computed) {
                            continue outer;
                        }
                    }
                    if (iteratee) {
                        seen.push(computed);
                    }
                    result.push(value);
                } else if (indexOf(seen, computed, 0) < 0) {
                    if (iteratee || isLarge) {
                        seen.push(computed);
                    }
                    result.push(value);
                }
            }
            return result;
        }
        function baseValues(object, props) {
            var index = -1, length = props.length, result = Array(length);
            while (++index < length) {
                result[index] = object[props[index]];
            }
            return result;
        }
        function baseWhile(array, predicate, isDrop, fromRight) {
            var length = array.length, index = fromRight ? length : -1;
            while ((fromRight ? index-- : ++index < length) && predicate(array[index], index, array)) {}
            return isDrop ? baseSlice(array, fromRight ? 0 : index, fromRight ? index + 1 : length) : baseSlice(array, fromRight ? index + 1 : 0, fromRight ? length : index);
        }
        function baseWrapperValue(value, actions) {
            var result = value;
            if (result instanceof LazyWrapper) {
                result = result.value();
            }
            var index = -1, length = actions.length;
            while (++index < length) {
                var args = [ result ], action = actions[index];
                push.apply(args, action.args);
                result = action.func.apply(action.thisArg, args);
            }
            return result;
        }
        function binaryIndex(array, value, retHighest) {
            var low = 0, high = array ? array.length : low;
            if (typeof value == "number" && value === value && high <= HALF_MAX_ARRAY_LENGTH) {
                while (low < high) {
                    var mid = low + high >>> 1, computed = array[mid];
                    if (retHighest ? computed <= value : computed < value) {
                        low = mid + 1;
                    } else {
                        high = mid;
                    }
                }
                return high;
            }
            return binaryIndexBy(array, value, identity, retHighest);
        }
        function binaryIndexBy(array, value, iteratee, retHighest) {
            value = iteratee(value);
            var low = 0, high = array ? array.length : 0, valIsNaN = value !== value, valIsUndef = value === undefined;
            while (low < high) {
                var mid = floor((low + high) / 2), computed = iteratee(array[mid]), isReflexive = computed === computed;
                if (valIsNaN) {
                    var setLow = isReflexive || retHighest;
                } else if (valIsUndef) {
                    setLow = isReflexive && (retHighest || computed !== undefined);
                } else {
                    setLow = retHighest ? computed <= value : computed < value;
                }
                if (setLow) {
                    low = mid + 1;
                } else {
                    high = mid;
                }
            }
            return nativeMin(high, MAX_ARRAY_INDEX);
        }
        function bindCallback(func, thisArg, argCount) {
            if (typeof func != "function") {
                return identity;
            }
            if (thisArg === undefined) {
                return func;
            }
            switch (argCount) {
              case 1:
                return function(value) {
                    return func.call(thisArg, value);
                };

              case 3:
                return function(value, index, collection) {
                    return func.call(thisArg, value, index, collection);
                };

              case 4:
                return function(accumulator, value, index, collection) {
                    return func.call(thisArg, accumulator, value, index, collection);
                };

              case 5:
                return function(value, other, key, object, source) {
                    return func.call(thisArg, value, other, key, object, source);
                };
            }
            return function() {
                return func.apply(thisArg, arguments);
            };
        }
        function bufferClone(buffer) {
            return bufferSlice.call(buffer, 0);
        }
        if (!bufferSlice) {
            bufferClone = !(ArrayBuffer && Uint8Array) ? constant(null) : function(buffer) {
                var byteLength = buffer.byteLength, floatLength = Float64Array ? floor(byteLength / FLOAT64_BYTES_PER_ELEMENT) : 0, offset = floatLength * FLOAT64_BYTES_PER_ELEMENT, result = new ArrayBuffer(byteLength);
                if (floatLength) {
                    var view = new Float64Array(result, 0, floatLength);
                    view.set(new Float64Array(buffer, 0, floatLength));
                }
                if (byteLength != offset) {
                    view = new Uint8Array(result, offset);
                    view.set(new Uint8Array(buffer, offset));
                }
                return result;
            };
        }
        function composeArgs(args, partials, holders) {
            var holdersLength = holders.length, argsIndex = -1, argsLength = nativeMax(args.length - holdersLength, 0), leftIndex = -1, leftLength = partials.length, result = Array(argsLength + leftLength);
            while (++leftIndex < leftLength) {
                result[leftIndex] = partials[leftIndex];
            }
            while (++argsIndex < holdersLength) {
                result[holders[argsIndex]] = args[argsIndex];
            }
            while (argsLength--) {
                result[leftIndex++] = args[argsIndex++];
            }
            return result;
        }
        function composeArgsRight(args, partials, holders) {
            var holdersIndex = -1, holdersLength = holders.length, argsIndex = -1, argsLength = nativeMax(args.length - holdersLength, 0), rightIndex = -1, rightLength = partials.length, result = Array(argsLength + rightLength);
            while (++argsIndex < argsLength) {
                result[argsIndex] = args[argsIndex];
            }
            var offset = argsIndex;
            while (++rightIndex < rightLength) {
                result[offset + rightIndex] = partials[rightIndex];
            }
            while (++holdersIndex < holdersLength) {
                result[offset + holders[holdersIndex]] = args[argsIndex++];
            }
            return result;
        }
        function createAggregator(setter, initializer) {
            return function(collection, iteratee, thisArg) {
                var result = initializer ? initializer() : {};
                iteratee = getCallback(iteratee, thisArg, 3);
                if (isArray(collection)) {
                    var index = -1, length = collection.length;
                    while (++index < length) {
                        var value = collection[index];
                        setter(result, value, iteratee(value, index, collection), collection);
                    }
                } else {
                    baseEach(collection, function(value, key, collection) {
                        setter(result, value, iteratee(value, key, collection), collection);
                    });
                }
                return result;
            };
        }
        function createAssigner(assigner) {
            return restParam(function(object, sources) {
                var index = -1, length = object == null ? 0 : sources.length, customizer = length > 2 && sources[length - 2], guard = length > 2 && sources[2], thisArg = length > 1 && sources[length - 1];
                if (typeof customizer == "function") {
                    customizer = bindCallback(customizer, thisArg, 5);
                    length -= 2;
                } else {
                    customizer = typeof thisArg == "function" ? thisArg : null;
                    length -= customizer ? 1 : 0;
                }
                if (guard && isIterateeCall(sources[0], sources[1], guard)) {
                    customizer = length < 3 ? null : customizer;
                    length = 1;
                }
                while (++index < length) {
                    var source = sources[index];
                    if (source) {
                        assigner(object, source, customizer);
                    }
                }
                return object;
            });
        }
        function createBaseEach(eachFunc, fromRight) {
            return function(collection, iteratee) {
                var length = collection ? getLength(collection) : 0;
                if (!isLength(length)) {
                    return eachFunc(collection, iteratee);
                }
                var index = fromRight ? length : -1, iterable = toObject(collection);
                while (fromRight ? index-- : ++index < length) {
                    if (iteratee(iterable[index], index, iterable) === false) {
                        break;
                    }
                }
                return collection;
            };
        }
        function createBaseFor(fromRight) {
            return function(object, iteratee, keysFunc) {
                var iterable = toObject(object), props = keysFunc(object), length = props.length, index = fromRight ? length : -1;
                while (fromRight ? index-- : ++index < length) {
                    var key = props[index];
                    if (iteratee(iterable[key], key, iterable) === false) {
                        break;
                    }
                }
                return object;
            };
        }
        function createBindWrapper(func, thisArg) {
            var Ctor = createCtorWrapper(func);
            function wrapper() {
                var fn = this && this !== root && this instanceof wrapper ? Ctor : func;
                return fn.apply(thisArg, arguments);
            }
            return wrapper;
        }
        var createCache = !(nativeCreate && Set) ? constant(null) : function(values) {
            return new SetCache(values);
        };
        function createCompounder(callback) {
            return function(string) {
                var index = -1, array = words(deburr(string)), length = array.length, result = "";
                while (++index < length) {
                    result = callback(result, array[index], index);
                }
                return result;
            };
        }
        function createCtorWrapper(Ctor) {
            return function() {
                var thisBinding = baseCreate(Ctor.prototype), result = Ctor.apply(thisBinding, arguments);
                return isObject(result) ? result : thisBinding;
            };
        }
        function createCurry(flag) {
            function curryFunc(func, arity, guard) {
                if (guard && isIterateeCall(func, arity, guard)) {
                    arity = null;
                }
                var result = createWrapper(func, flag, null, null, null, null, null, arity);
                result.placeholder = curryFunc.placeholder;
                return result;
            }
            return curryFunc;
        }
        function createExtremum(arrayFunc, isMin) {
            return function(collection, iteratee, thisArg) {
                if (thisArg && isIterateeCall(collection, iteratee, thisArg)) {
                    iteratee = null;
                }
                var func = getCallback(), noIteratee = iteratee == null;
                if (!(func === baseCallback && noIteratee)) {
                    noIteratee = false;
                    iteratee = func(iteratee, thisArg, 3);
                }
                if (noIteratee) {
                    var isArr = isArray(collection);
                    if (!isArr && isString(collection)) {
                        iteratee = charAtCallback;
                    } else {
                        return arrayFunc(isArr ? collection : toIterable(collection));
                    }
                }
                return extremumBy(collection, iteratee, isMin);
            };
        }
        function createFind(eachFunc, fromRight) {
            return function(collection, predicate, thisArg) {
                predicate = getCallback(predicate, thisArg, 3);
                if (isArray(collection)) {
                    var index = baseFindIndex(collection, predicate, fromRight);
                    return index > -1 ? collection[index] : undefined;
                }
                return baseFind(collection, predicate, eachFunc);
            };
        }
        function createFindIndex(fromRight) {
            return function(array, predicate, thisArg) {
                if (!(array && array.length)) {
                    return -1;
                }
                predicate = getCallback(predicate, thisArg, 3);
                return baseFindIndex(array, predicate, fromRight);
            };
        }
        function createFindKey(objectFunc) {
            return function(object, predicate, thisArg) {
                predicate = getCallback(predicate, thisArg, 3);
                return baseFind(object, predicate, objectFunc, true);
            };
        }
        function createFlow(fromRight) {
            return function() {
                var length = arguments.length;
                if (!length) {
                    return function() {
                        return arguments[0];
                    };
                }
                var wrapper, index = fromRight ? length : -1, leftIndex = 0, funcs = Array(length);
                while (fromRight ? index-- : ++index < length) {
                    var func = funcs[leftIndex++] = arguments[index];
                    if (typeof func != "function") {
                        throw new TypeError(FUNC_ERROR_TEXT);
                    }
                    var funcName = wrapper ? "" : getFuncName(func);
                    wrapper = funcName == "wrapper" ? new LodashWrapper([]) : wrapper;
                }
                index = wrapper ? -1 : length;
                while (++index < length) {
                    func = funcs[index];
                    funcName = getFuncName(func);
                    var data = funcName == "wrapper" ? getData(func) : null;
                    if (data && isLaziable(data[0]) && data[1] == (ARY_FLAG | CURRY_FLAG | PARTIAL_FLAG | REARG_FLAG) && !data[4].length && data[9] == 1) {
                        wrapper = wrapper[getFuncName(data[0])].apply(wrapper, data[3]);
                    } else {
                        wrapper = func.length == 1 && isLaziable(func) ? wrapper[funcName]() : wrapper.thru(func);
                    }
                }
                return function() {
                    var args = arguments;
                    if (wrapper && args.length == 1 && isArray(args[0])) {
                        return wrapper.plant(args[0]).value();
                    }
                    var index = 0, result = funcs[index].apply(this, args);
                    while (++index < length) {
                        result = funcs[index].call(this, result);
                    }
                    return result;
                };
            };
        }
        function createForEach(arrayFunc, eachFunc) {
            return function(collection, iteratee, thisArg) {
                return typeof iteratee == "function" && thisArg === undefined && isArray(collection) ? arrayFunc(collection, iteratee) : eachFunc(collection, bindCallback(iteratee, thisArg, 3));
            };
        }
        function createForIn(objectFunc) {
            return function(object, iteratee, thisArg) {
                if (typeof iteratee != "function" || thisArg !== undefined) {
                    iteratee = bindCallback(iteratee, thisArg, 3);
                }
                return objectFunc(object, iteratee, keysIn);
            };
        }
        function createForOwn(objectFunc) {
            return function(object, iteratee, thisArg) {
                if (typeof iteratee != "function" || thisArg !== undefined) {
                    iteratee = bindCallback(iteratee, thisArg, 3);
                }
                return objectFunc(object, iteratee);
            };
        }
        function createObjectMapper(isMapKeys) {
            return function(object, iteratee, thisArg) {
                var result = {};
                iteratee = getCallback(iteratee, thisArg, 3);
                baseForOwn(object, function(value, key, object) {
                    var mapped = iteratee(value, key, object);
                    key = isMapKeys ? mapped : key;
                    value = isMapKeys ? value : mapped;
                    result[key] = value;
                });
                return result;
            };
        }
        function createPadDir(fromRight) {
            return function(string, length, chars) {
                string = baseToString(string);
                return (fromRight ? string : "") + createPadding(string, length, chars) + (fromRight ? "" : string);
            };
        }
        function createPartial(flag) {
            var partialFunc = restParam(function(func, partials) {
                var holders = replaceHolders(partials, partialFunc.placeholder);
                return createWrapper(func, flag, null, partials, holders);
            });
            return partialFunc;
        }
        function createReduce(arrayFunc, eachFunc) {
            return function(collection, iteratee, accumulator, thisArg) {
                var initFromArray = arguments.length < 3;
                return typeof iteratee == "function" && thisArg === undefined && isArray(collection) ? arrayFunc(collection, iteratee, accumulator, initFromArray) : baseReduce(collection, getCallback(iteratee, thisArg, 4), accumulator, initFromArray, eachFunc);
            };
        }
        function createHybridWrapper(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity) {
            var isAry = bitmask & ARY_FLAG, isBind = bitmask & BIND_FLAG, isBindKey = bitmask & BIND_KEY_FLAG, isCurry = bitmask & CURRY_FLAG, isCurryBound = bitmask & CURRY_BOUND_FLAG, isCurryRight = bitmask & CURRY_RIGHT_FLAG;
            var Ctor = !isBindKey && createCtorWrapper(func), key = func;
            function wrapper() {
                var length = arguments.length, index = length, args = Array(length);
                while (index--) {
                    args[index] = arguments[index];
                }
                if (partials) {
                    args = composeArgs(args, partials, holders);
                }
                if (partialsRight) {
                    args = composeArgsRight(args, partialsRight, holdersRight);
                }
                if (isCurry || isCurryRight) {
                    var placeholder = wrapper.placeholder, argsHolders = replaceHolders(args, placeholder);
                    length -= argsHolders.length;
                    if (length < arity) {
                        var newArgPos = argPos ? arrayCopy(argPos) : null, newArity = nativeMax(arity - length, 0), newsHolders = isCurry ? argsHolders : null, newHoldersRight = isCurry ? null : argsHolders, newPartials = isCurry ? args : null, newPartialsRight = isCurry ? null : args;
                        bitmask |= isCurry ? PARTIAL_FLAG : PARTIAL_RIGHT_FLAG;
                        bitmask &= ~(isCurry ? PARTIAL_RIGHT_FLAG : PARTIAL_FLAG);
                        if (!isCurryBound) {
                            bitmask &= ~(BIND_FLAG | BIND_KEY_FLAG);
                        }
                        var newData = [ func, bitmask, thisArg, newPartials, newsHolders, newPartialsRight, newHoldersRight, newArgPos, ary, newArity ], result = createHybridWrapper.apply(undefined, newData);
                        if (isLaziable(func)) {
                            setData(result, newData);
                        }
                        result.placeholder = placeholder;
                        return result;
                    }
                }
                var thisBinding = isBind ? thisArg : this;
                if (isBindKey) {
                    func = thisBinding[key];
                }
                if (argPos) {
                    args = reorder(args, argPos);
                }
                if (isAry && ary < args.length) {
                    args.length = ary;
                }
                var fn = this && this !== root && this instanceof wrapper ? Ctor || createCtorWrapper(func) : func;
                return fn.apply(thisBinding, args);
            }
            return wrapper;
        }
        function createPadding(string, length, chars) {
            var strLength = string.length;
            length = +length;
            if (strLength >= length || !nativeIsFinite(length)) {
                return "";
            }
            var padLength = length - strLength;
            chars = chars == null ? " " : chars + "";
            return repeat(chars, ceil(padLength / chars.length)).slice(0, padLength);
        }
        function createPartialWrapper(func, bitmask, thisArg, partials) {
            var isBind = bitmask & BIND_FLAG, Ctor = createCtorWrapper(func);
            function wrapper() {
                var argsIndex = -1, argsLength = arguments.length, leftIndex = -1, leftLength = partials.length, args = Array(argsLength + leftLength);
                while (++leftIndex < leftLength) {
                    args[leftIndex] = partials[leftIndex];
                }
                while (argsLength--) {
                    args[leftIndex++] = arguments[++argsIndex];
                }
                var fn = this && this !== root && this instanceof wrapper ? Ctor : func;
                return fn.apply(isBind ? thisArg : this, args);
            }
            return wrapper;
        }
        function createSortedIndex(retHighest) {
            return function(array, value, iteratee, thisArg) {
                var func = getCallback(iteratee);
                return func === baseCallback && iteratee == null ? binaryIndex(array, value, retHighest) : binaryIndexBy(array, value, func(iteratee, thisArg, 1), retHighest);
            };
        }
        function createWrapper(func, bitmask, thisArg, partials, holders, argPos, ary, arity) {
            var isBindKey = bitmask & BIND_KEY_FLAG;
            if (!isBindKey && typeof func != "function") {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            var length = partials ? partials.length : 0;
            if (!length) {
                bitmask &= ~(PARTIAL_FLAG | PARTIAL_RIGHT_FLAG);
                partials = holders = null;
            }
            length -= holders ? holders.length : 0;
            if (bitmask & PARTIAL_RIGHT_FLAG) {
                var partialsRight = partials, holdersRight = holders;
                partials = holders = null;
            }
            var data = isBindKey ? null : getData(func), newData = [ func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity ];
            if (data) {
                mergeData(newData, data);
                bitmask = newData[1];
                arity = newData[9];
            }
            newData[9] = arity == null ? isBindKey ? 0 : func.length : nativeMax(arity - length, 0) || 0;
            if (bitmask == BIND_FLAG) {
                var result = createBindWrapper(newData[0], newData[2]);
            } else if ((bitmask == PARTIAL_FLAG || bitmask == (BIND_FLAG | PARTIAL_FLAG)) && !newData[4].length) {
                result = createPartialWrapper.apply(undefined, newData);
            } else {
                result = createHybridWrapper.apply(undefined, newData);
            }
            var setter = data ? baseSetData : setData;
            return setter(result, newData);
        }
        function equalArrays(array, other, equalFunc, customizer, isLoose, stackA, stackB) {
            var index = -1, arrLength = array.length, othLength = other.length, result = true;
            if (arrLength != othLength && !(isLoose && othLength > arrLength)) {
                return false;
            }
            while (result && ++index < arrLength) {
                var arrValue = array[index], othValue = other[index];
                result = undefined;
                if (customizer) {
                    result = isLoose ? customizer(othValue, arrValue, index) : customizer(arrValue, othValue, index);
                }
                if (result === undefined) {
                    if (isLoose) {
                        var othIndex = othLength;
                        while (othIndex--) {
                            othValue = other[othIndex];
                            result = arrValue && arrValue === othValue || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB);
                            if (result) {
                                break;
                            }
                        }
                    } else {
                        result = arrValue && arrValue === othValue || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB);
                    }
                }
            }
            return !!result;
        }
        function equalByTag(object, other, tag) {
            switch (tag) {
              case boolTag:
              case dateTag:
                return +object == +other;

              case errorTag:
                return object.name == other.name && object.message == other.message;

              case numberTag:
                return object != +object ? other != +other : object == +other;

              case regexpTag:
              case stringTag:
                return object == other + "";
            }
            return false;
        }
        function equalObjects(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
            var objProps = keys(object), objLength = objProps.length, othProps = keys(other), othLength = othProps.length;
            if (objLength != othLength && !isLoose) {
                return false;
            }
            var skipCtor = isLoose, index = -1;
            while (++index < objLength) {
                var key = objProps[index], result = isLoose ? key in other : hasOwnProperty.call(other, key);
                if (result) {
                    var objValue = object[key], othValue = other[key];
                    result = undefined;
                    if (customizer) {
                        result = isLoose ? customizer(othValue, objValue, key) : customizer(objValue, othValue, key);
                    }
                    if (result === undefined) {
                        result = objValue && objValue === othValue || equalFunc(objValue, othValue, customizer, isLoose, stackA, stackB);
                    }
                }
                if (!result) {
                    return false;
                }
                skipCtor || (skipCtor = key == "constructor");
            }
            if (!skipCtor) {
                var objCtor = object.constructor, othCtor = other.constructor;
                if (objCtor != othCtor && ("constructor" in object && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
                    return false;
                }
            }
            return true;
        }
        function extremumBy(collection, iteratee, isMin) {
            var exValue = isMin ? POSITIVE_INFINITY : NEGATIVE_INFINITY, computed = exValue, result = computed;
            baseEach(collection, function(value, index, collection) {
                var current = iteratee(value, index, collection);
                if ((isMin ? current < computed : current > computed) || current === exValue && current === result) {
                    computed = current;
                    result = value;
                }
            });
            return result;
        }
        function getCallback(func, thisArg, argCount) {
            var result = lodash.callback || callback;
            result = result === callback ? baseCallback : result;
            return argCount ? result(func, thisArg, argCount) : result;
        }
        var getData = !metaMap ? noop : function(func) {
            return metaMap.get(func);
        };
        var getFuncName = function() {
            if (!support.funcNames) {
                return constant("");
            }
            if (constant.name == "constant") {
                return baseProperty("name");
            }
            return function(func) {
                var result = func.name, array = realNames[result], length = array ? array.length : 0;
                while (length--) {
                    var data = array[length], otherFunc = data.func;
                    if (otherFunc == null || otherFunc == func) {
                        return data.name;
                    }
                }
                return result;
            };
        }();
        function getIndexOf(collection, target, fromIndex) {
            var result = lodash.indexOf || indexOf;
            result = result === indexOf ? baseIndexOf : result;
            return collection ? result(collection, target, fromIndex) : result;
        }
        var getLength = baseProperty("length");
        var getSymbols = !getOwnPropertySymbols ? constant([]) : function(object) {
            return getOwnPropertySymbols(toObject(object));
        };
        function getView(start, end, transforms) {
            var index = -1, length = transforms ? transforms.length : 0;
            while (++index < length) {
                var data = transforms[index], size = data.size;
                switch (data.type) {
                  case "drop":
                    start += size;
                    break;

                  case "dropRight":
                    end -= size;
                    break;

                  case "take":
                    end = nativeMin(end, start + size);
                    break;

                  case "takeRight":
                    start = nativeMax(start, end - size);
                    break;
                }
            }
            return {
                start: start,
                end: end
            };
        }
        function initCloneArray(array) {
            var length = array.length, result = new array.constructor(length);
            if (length && typeof array[0] == "string" && hasOwnProperty.call(array, "index")) {
                result.index = array.index;
                result.input = array.input;
            }
            return result;
        }
        function initCloneObject(object) {
            var Ctor = object.constructor;
            if (!(typeof Ctor == "function" && Ctor instanceof Ctor)) {
                Ctor = Object;
            }
            return new Ctor();
        }
        function initCloneByTag(object, tag, isDeep) {
            var Ctor = object.constructor;
            switch (tag) {
              case arrayBufferTag:
                return bufferClone(object);

              case boolTag:
              case dateTag:
                return new Ctor(+object);

              case float32Tag:
              case float64Tag:
              case int8Tag:
              case int16Tag:
              case int32Tag:
              case uint8Tag:
              case uint8ClampedTag:
              case uint16Tag:
              case uint32Tag:
                if (Ctor instanceof Ctor) {
                    Ctor = ctorByTag[tag];
                }
                var buffer = object.buffer;
                return new Ctor(isDeep ? bufferClone(buffer) : buffer, object.byteOffset, object.length);

              case numberTag:
              case stringTag:
                return new Ctor(object);

              case regexpTag:
                var result = new Ctor(object.source, reFlags.exec(object));
                result.lastIndex = object.lastIndex;
            }
            return result;
        }
        function invokePath(object, path, args) {
            if (object != null && !isKey(path, object)) {
                path = toPath(path);
                object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
                path = last(path);
            }
            var func = object == null ? object : object[path];
            return func == null ? undefined : func.apply(object, args);
        }
        function isArrayLike(value) {
            return value != null && isLength(getLength(value));
        }
        function isIndex(value, length) {
            value = +value;
            length = length == null ? MAX_SAFE_INTEGER : length;
            return value > -1 && value % 1 == 0 && value < length;
        }
        function isIterateeCall(value, index, object) {
            if (!isObject(object)) {
                return false;
            }
            var type = typeof index;
            if (type == "number" ? isArrayLike(object) && isIndex(index, object.length) : type == "string" && index in object) {
                var other = object[index];
                return value === value ? value === other : other !== other;
            }
            return false;
        }
        function isKey(value, object) {
            var type = typeof value;
            if (type == "string" && reIsPlainProp.test(value) || type == "number") {
                return true;
            }
            if (isArray(value)) {
                return false;
            }
            var result = !reIsDeepProp.test(value);
            return result || object != null && value in toObject(object);
        }
        function isLaziable(func) {
            var funcName = getFuncName(func);
            return !!funcName && func === lodash[funcName] && funcName in LazyWrapper.prototype;
        }
        function isLength(value) {
            return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
        }
        function isStrictComparable(value) {
            return value === value && !isObject(value);
        }
        function mergeData(data, source) {
            var bitmask = data[1], srcBitmask = source[1], newBitmask = bitmask | srcBitmask, isCommon = newBitmask < ARY_FLAG;
            var isCombo = srcBitmask == ARY_FLAG && bitmask == CURRY_FLAG || srcBitmask == ARY_FLAG && bitmask == REARG_FLAG && data[7].length <= source[8] || srcBitmask == (ARY_FLAG | REARG_FLAG) && bitmask == CURRY_FLAG;
            if (!(isCommon || isCombo)) {
                return data;
            }
            if (srcBitmask & BIND_FLAG) {
                data[2] = source[2];
                newBitmask |= bitmask & BIND_FLAG ? 0 : CURRY_BOUND_FLAG;
            }
            var value = source[3];
            if (value) {
                var partials = data[3];
                data[3] = partials ? composeArgs(partials, value, source[4]) : arrayCopy(value);
                data[4] = partials ? replaceHolders(data[3], PLACEHOLDER) : arrayCopy(source[4]);
            }
            value = source[5];
            if (value) {
                partials = data[5];
                data[5] = partials ? composeArgsRight(partials, value, source[6]) : arrayCopy(value);
                data[6] = partials ? replaceHolders(data[5], PLACEHOLDER) : arrayCopy(source[6]);
            }
            value = source[7];
            if (value) {
                data[7] = arrayCopy(value);
            }
            if (srcBitmask & ARY_FLAG) {
                data[8] = data[8] == null ? source[8] : nativeMin(data[8], source[8]);
            }
            if (data[9] == null) {
                data[9] = source[9];
            }
            data[0] = source[0];
            data[1] = newBitmask;
            return data;
        }
        function pickByArray(object, props) {
            object = toObject(object);
            var index = -1, length = props.length, result = {};
            while (++index < length) {
                var key = props[index];
                if (key in object) {
                    result[key] = object[key];
                }
            }
            return result;
        }
        function pickByCallback(object, predicate) {
            var result = {};
            baseForIn(object, function(value, key, object) {
                if (predicate(value, key, object)) {
                    result[key] = value;
                }
            });
            return result;
        }
        function reorder(array, indexes) {
            var arrLength = array.length, length = nativeMin(indexes.length, arrLength), oldArray = arrayCopy(array);
            while (length--) {
                var index = indexes[length];
                array[length] = isIndex(index, arrLength) ? oldArray[index] : undefined;
            }
            return array;
        }
        var setData = function() {
            var count = 0, lastCalled = 0;
            return function(key, value) {
                var stamp = now(), remaining = HOT_SPAN - (stamp - lastCalled);
                lastCalled = stamp;
                if (remaining > 0) {
                    if (++count >= HOT_COUNT) {
                        return key;
                    }
                } else {
                    count = 0;
                }
                return baseSetData(key, value);
            };
        }();
        function shimIsPlainObject(value) {
            var Ctor, support = lodash.support;
            if (!(isObjectLike(value) && objToString.call(value) == objectTag && !isHostObject(value)) || !hasOwnProperty.call(value, "constructor") && (Ctor = value.constructor, 
            typeof Ctor == "function" && !(Ctor instanceof Ctor)) || !support.argsTag && isArguments(value)) {
                return false;
            }
            var result;
            if (support.ownLast) {
                baseForIn(value, function(subValue, key, object) {
                    result = hasOwnProperty.call(object, key);
                    return false;
                });
                return result !== false;
            }
            baseForIn(value, function(subValue, key) {
                result = key;
            });
            return result === undefined || hasOwnProperty.call(value, result);
        }
        function shimKeys(object) {
            var props = keysIn(object), propsLength = props.length, length = propsLength && object.length, support = lodash.support;
            var allowIndexes = length && isLength(length) && (isArray(object) || support.nonEnumStrings && isString(object) || support.nonEnumArgs && isArguments(object));
            var index = -1, result = [];
            while (++index < propsLength) {
                var key = props[index];
                if (allowIndexes && isIndex(key, length) || hasOwnProperty.call(object, key)) {
                    result.push(key);
                }
            }
            return result;
        }
        function toIterable(value) {
            if (value == null) {
                return [];
            }
            if (!isArrayLike(value)) {
                return values(value);
            }
            if (lodash.support.unindexedChars && isString(value)) {
                return value.split("");
            }
            return isObject(value) ? value : Object(value);
        }
        function toObject(value) {
            if (lodash.support.unindexedChars && isString(value)) {
                var index = -1, length = value.length, result = Object(value);
                while (++index < length) {
                    result[index] = value.charAt(index);
                }
                return result;
            }
            return isObject(value) ? value : Object(value);
        }
        function toPath(value) {
            if (isArray(value)) {
                return value;
            }
            var result = [];
            baseToString(value).replace(rePropName, function(match, number, quote, string) {
                result.push(quote ? string.replace(reEscapeChar, "$1") : number || match);
            });
            return result;
        }
        function wrapperClone(wrapper) {
            return wrapper instanceof LazyWrapper ? wrapper.clone() : new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__, arrayCopy(wrapper.__actions__));
        }
        function chunk(array, size, guard) {
            if (guard ? isIterateeCall(array, size, guard) : size == null) {
                size = 1;
            } else {
                size = nativeMax(+size || 1, 1);
            }
            var index = 0, length = array ? array.length : 0, resIndex = -1, result = Array(ceil(length / size));
            while (index < length) {
                result[++resIndex] = baseSlice(array, index, index += size);
            }
            return result;
        }
        function compact(array) {
            var index = -1, length = array ? array.length : 0, resIndex = -1, result = [];
            while (++index < length) {
                var value = array[index];
                if (value) {
                    result[++resIndex] = value;
                }
            }
            return result;
        }
        var difference = restParam(function(array, values) {
            return isArrayLike(array) ? baseDifference(array, baseFlatten(values, false, true)) : [];
        });
        function drop(array, n, guard) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (guard ? isIterateeCall(array, n, guard) : n == null) {
                n = 1;
            }
            return baseSlice(array, n < 0 ? 0 : n);
        }
        function dropRight(array, n, guard) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (guard ? isIterateeCall(array, n, guard) : n == null) {
                n = 1;
            }
            n = length - (+n || 0);
            return baseSlice(array, 0, n < 0 ? 0 : n);
        }
        function dropRightWhile(array, predicate, thisArg) {
            return array && array.length ? baseWhile(array, getCallback(predicate, thisArg, 3), true, true) : [];
        }
        function dropWhile(array, predicate, thisArg) {
            return array && array.length ? baseWhile(array, getCallback(predicate, thisArg, 3), true) : [];
        }
        function fill(array, value, start, end) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (start && typeof start != "number" && isIterateeCall(array, value, start)) {
                start = 0;
                end = length;
            }
            return baseFill(array, value, start, end);
        }
        var findIndex = createFindIndex();
        var findLastIndex = createFindIndex(true);
        function first(array) {
            return array ? array[0] : undefined;
        }
        function flatten(array, isDeep, guard) {
            var length = array ? array.length : 0;
            if (guard && isIterateeCall(array, isDeep, guard)) {
                isDeep = false;
            }
            return length ? baseFlatten(array, isDeep) : [];
        }
        function flattenDeep(array) {
            var length = array ? array.length : 0;
            return length ? baseFlatten(array, true) : [];
        }
        function indexOf(array, value, fromIndex) {
            var length = array ? array.length : 0;
            if (!length) {
                return -1;
            }
            if (typeof fromIndex == "number") {
                fromIndex = fromIndex < 0 ? nativeMax(length + fromIndex, 0) : fromIndex;
            } else if (fromIndex) {
                var index = binaryIndex(array, value), other = array[index];
                if (value === value ? value === other : other !== other) {
                    return index;
                }
                return -1;
            }
            return baseIndexOf(array, value, fromIndex || 0);
        }
        function initial(array) {
            return dropRight(array, 1);
        }
        function intersection() {
            var args = [], argsIndex = -1, argsLength = arguments.length, caches = [], indexOf = getIndexOf(), isCommon = indexOf == baseIndexOf, result = [];
            while (++argsIndex < argsLength) {
                var value = arguments[argsIndex];
                if (isArrayLike(value)) {
                    args.push(value);
                    caches.push(isCommon && value.length >= 120 ? createCache(argsIndex && value) : null);
                }
            }
            argsLength = args.length;
            if (argsLength < 2) {
                return result;
            }
            var array = args[0], index = -1, length = array ? array.length : 0, seen = caches[0];
            outer: while (++index < length) {
                value = array[index];
                if ((seen ? cacheIndexOf(seen, value) : indexOf(result, value, 0)) < 0) {
                    argsIndex = argsLength;
                    while (--argsIndex) {
                        var cache = caches[argsIndex];
                        if ((cache ? cacheIndexOf(cache, value) : indexOf(args[argsIndex], value, 0)) < 0) {
                            continue outer;
                        }
                    }
                    if (seen) {
                        seen.push(value);
                    }
                    result.push(value);
                }
            }
            return result;
        }
        function last(array) {
            var length = array ? array.length : 0;
            return length ? array[length - 1] : undefined;
        }
        function lastIndexOf(array, value, fromIndex) {
            var length = array ? array.length : 0;
            if (!length) {
                return -1;
            }
            var index = length;
            if (typeof fromIndex == "number") {
                index = (fromIndex < 0 ? nativeMax(length + fromIndex, 0) : nativeMin(fromIndex || 0, length - 1)) + 1;
            } else if (fromIndex) {
                index = binaryIndex(array, value, true) - 1;
                var other = array[index];
                if (value === value ? value === other : other !== other) {
                    return index;
                }
                return -1;
            }
            if (value !== value) {
                return indexOfNaN(array, index, true);
            }
            while (index--) {
                if (array[index] === value) {
                    return index;
                }
            }
            return -1;
        }
        function pull() {
            var args = arguments, array = args[0];
            if (!(array && array.length)) {
                return array;
            }
            var index = 0, indexOf = getIndexOf(), length = args.length;
            while (++index < length) {
                var fromIndex = 0, value = args[index];
                while ((fromIndex = indexOf(array, value, fromIndex)) > -1) {
                    splice.call(array, fromIndex, 1);
                }
            }
            return array;
        }
        var pullAt = restParam(function(array, indexes) {
            indexes = baseFlatten(indexes);
            var result = baseAt(array, indexes);
            basePullAt(array, indexes.sort(baseCompareAscending));
            return result;
        });
        function remove(array, predicate, thisArg) {
            var result = [];
            if (!(array && array.length)) {
                return result;
            }
            var index = -1, indexes = [], length = array.length;
            predicate = getCallback(predicate, thisArg, 3);
            while (++index < length) {
                var value = array[index];
                if (predicate(value, index, array)) {
                    result.push(value);
                    indexes.push(index);
                }
            }
            basePullAt(array, indexes);
            return result;
        }
        function rest(array) {
            return drop(array, 1);
        }
        function slice(array, start, end) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (end && typeof end != "number" && isIterateeCall(array, start, end)) {
                start = 0;
                end = length;
            }
            return baseSlice(array, start, end);
        }
        var sortedIndex = createSortedIndex();
        var sortedLastIndex = createSortedIndex(true);
        function take(array, n, guard) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (guard ? isIterateeCall(array, n, guard) : n == null) {
                n = 1;
            }
            return baseSlice(array, 0, n < 0 ? 0 : n);
        }
        function takeRight(array, n, guard) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (guard ? isIterateeCall(array, n, guard) : n == null) {
                n = 1;
            }
            n = length - (+n || 0);
            return baseSlice(array, n < 0 ? 0 : n);
        }
        function takeRightWhile(array, predicate, thisArg) {
            return array && array.length ? baseWhile(array, getCallback(predicate, thisArg, 3), false, true) : [];
        }
        function takeWhile(array, predicate, thisArg) {
            return array && array.length ? baseWhile(array, getCallback(predicate, thisArg, 3)) : [];
        }
        var union = restParam(function(arrays) {
            return baseUniq(baseFlatten(arrays, false, true));
        });
        function uniq(array, isSorted, iteratee, thisArg) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (isSorted != null && typeof isSorted != "boolean") {
                thisArg = iteratee;
                iteratee = isIterateeCall(array, isSorted, thisArg) ? null : isSorted;
                isSorted = false;
            }
            var func = getCallback();
            if (!(func === baseCallback && iteratee == null)) {
                iteratee = func(iteratee, thisArg, 3);
            }
            return isSorted && getIndexOf() == baseIndexOf ? sortedUniq(array, iteratee) : baseUniq(array, iteratee);
        }
        function unzip(array) {
            if (!(array && array.length)) {
                return [];
            }
            var index = -1, length = 0;
            array = arrayFilter(array, function(group) {
                if (isArrayLike(group)) {
                    length = nativeMax(group.length, length);
                    return true;
                }
            });
            var result = Array(length);
            while (++index < length) {
                result[index] = arrayMap(array, baseProperty(index));
            }
            return result;
        }
        function unzipWith(array, iteratee, thisArg) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            var result = unzip(array);
            if (iteratee == null) {
                return result;
            }
            iteratee = bindCallback(iteratee, thisArg, 4);
            return arrayMap(result, function(group) {
                return arrayReduce(group, iteratee, undefined, true);
            });
        }
        var without = restParam(function(array, values) {
            return isArrayLike(array) ? baseDifference(array, values) : [];
        });
        function xor() {
            var index = -1, length = arguments.length;
            while (++index < length) {
                var array = arguments[index];
                if (isArrayLike(array)) {
                    var result = result ? baseDifference(result, array).concat(baseDifference(array, result)) : array;
                }
            }
            return result ? baseUniq(result) : [];
        }
        var zip = restParam(unzip);
        function zipObject(props, values) {
            var index = -1, length = props ? props.length : 0, result = {};
            if (length && !values && !isArray(props[0])) {
                values = [];
            }
            while (++index < length) {
                var key = props[index];
                if (values) {
                    result[key] = values[index];
                } else if (key) {
                    result[key[0]] = key[1];
                }
            }
            return result;
        }
        var zipWith = restParam(function(arrays) {
            var length = arrays.length, iteratee = arrays[length - 2], thisArg = arrays[length - 1];
            if (length > 2 && typeof iteratee == "function") {
                length -= 2;
            } else {
                iteratee = length > 1 && typeof thisArg == "function" ? (--length, thisArg) : undefined;
                thisArg = undefined;
            }
            arrays.length = length;
            return unzipWith(arrays, iteratee, thisArg);
        });
        function chain(value) {
            var result = lodash(value);
            result.__chain__ = true;
            return result;
        }
        function tap(value, interceptor, thisArg) {
            interceptor.call(thisArg, value);
            return value;
        }
        function thru(value, interceptor, thisArg) {
            return interceptor.call(thisArg, value);
        }
        function wrapperChain() {
            return chain(this);
        }
        function wrapperCommit() {
            return new LodashWrapper(this.value(), this.__chain__);
        }
        function wrapperPlant(value) {
            var result, parent = this;
            while (parent instanceof baseLodash) {
                var clone = wrapperClone(parent);
                if (result) {
                    previous.__wrapped__ = clone;
                } else {
                    result = clone;
                }
                var previous = clone;
                parent = parent.__wrapped__;
            }
            previous.__wrapped__ = value;
            return result;
        }
        function wrapperReverse() {
            var value = this.__wrapped__;
            if (value instanceof LazyWrapper) {
                if (this.__actions__.length) {
                    value = new LazyWrapper(this);
                }
                return new LodashWrapper(value.reverse(), this.__chain__);
            }
            return this.thru(function(value) {
                return value.reverse();
            });
        }
        function wrapperToString() {
            return this.value() + "";
        }
        function wrapperValue() {
            return baseWrapperValue(this.__wrapped__, this.__actions__);
        }
        var at = restParam(function(collection, props) {
            if (isArrayLike(collection)) {
                collection = toIterable(collection);
            }
            return baseAt(collection, baseFlatten(props));
        });
        var countBy = createAggregator(function(result, value, key) {
            hasOwnProperty.call(result, key) ? ++result[key] : result[key] = 1;
        });
        function every(collection, predicate, thisArg) {
            var func = isArray(collection) ? arrayEvery : baseEvery;
            if (thisArg && isIterateeCall(collection, predicate, thisArg)) {
                predicate = null;
            }
            if (typeof predicate != "function" || thisArg !== undefined) {
                predicate = getCallback(predicate, thisArg, 3);
            }
            return func(collection, predicate);
        }
        function filter(collection, predicate, thisArg) {
            var func = isArray(collection) ? arrayFilter : baseFilter;
            predicate = getCallback(predicate, thisArg, 3);
            return func(collection, predicate);
        }
        var find = createFind(baseEach);
        var findLast = createFind(baseEachRight, true);
        function findWhere(collection, source) {
            return find(collection, baseMatches(source));
        }
        var forEach = createForEach(arrayEach, baseEach);
        var forEachRight = createForEach(arrayEachRight, baseEachRight);
        var groupBy = createAggregator(function(result, value, key) {
            if (hasOwnProperty.call(result, key)) {
                result[key].push(value);
            } else {
                result[key] = [ value ];
            }
        });
        function includes(collection, target, fromIndex, guard) {
            var length = collection ? getLength(collection) : 0;
            if (!isLength(length)) {
                collection = values(collection);
                length = collection.length;
            }
            if (!length) {
                return false;
            }
            if (typeof fromIndex != "number" || guard && isIterateeCall(target, fromIndex, guard)) {
                fromIndex = 0;
            } else {
                fromIndex = fromIndex < 0 ? nativeMax(length + fromIndex, 0) : fromIndex || 0;
            }
            return typeof collection == "string" || !isArray(collection) && isString(collection) ? fromIndex < length && collection.indexOf(target, fromIndex) > -1 : getIndexOf(collection, target, fromIndex) > -1;
        }
        var indexBy = createAggregator(function(result, value, key) {
            result[key] = value;
        });
        var invoke = restParam(function(collection, path, args) {
            var index = -1, isFunc = typeof path == "function", isProp = isKey(path), result = isArrayLike(collection) ? Array(collection.length) : [];
            baseEach(collection, function(value) {
                var func = isFunc ? path : isProp && value != null && value[path];
                result[++index] = func ? func.apply(value, args) : invokePath(value, path, args);
            });
            return result;
        });
        function map(collection, iteratee, thisArg) {
            var func = isArray(collection) ? arrayMap : baseMap;
            iteratee = getCallback(iteratee, thisArg, 3);
            return func(collection, iteratee);
        }
        var partition = createAggregator(function(result, value, key) {
            result[key ? 0 : 1].push(value);
        }, function() {
            return [ [], [] ];
        });
        function pluck(collection, path) {
            return map(collection, property(path));
        }
        var reduce = createReduce(arrayReduce, baseEach);
        var reduceRight = createReduce(arrayReduceRight, baseEachRight);
        function reject(collection, predicate, thisArg) {
            var func = isArray(collection) ? arrayFilter : baseFilter;
            predicate = getCallback(predicate, thisArg, 3);
            return func(collection, function(value, index, collection) {
                return !predicate(value, index, collection);
            });
        }
        function sample(collection, n, guard) {
            if (guard ? isIterateeCall(collection, n, guard) : n == null) {
                collection = toIterable(collection);
                var length = collection.length;
                return length > 0 ? collection[baseRandom(0, length - 1)] : undefined;
            }
            var result = shuffle(collection);
            result.length = nativeMin(n < 0 ? 0 : +n || 0, result.length);
            return result;
        }
        function shuffle(collection) {
            collection = toIterable(collection);
            var index = -1, length = collection.length, result = Array(length);
            while (++index < length) {
                var rand = baseRandom(0, index);
                if (index != rand) {
                    result[index] = result[rand];
                }
                result[rand] = collection[index];
            }
            return result;
        }
        function size(collection) {
            var length = collection ? getLength(collection) : 0;
            return isLength(length) ? length : keys(collection).length;
        }
        function some(collection, predicate, thisArg) {
            var func = isArray(collection) ? arraySome : baseSome;
            if (thisArg && isIterateeCall(collection, predicate, thisArg)) {
                predicate = null;
            }
            if (typeof predicate != "function" || thisArg !== undefined) {
                predicate = getCallback(predicate, thisArg, 3);
            }
            return func(collection, predicate);
        }
        function sortBy(collection, iteratee, thisArg) {
            if (collection == null) {
                return [];
            }
            if (thisArg && isIterateeCall(collection, iteratee, thisArg)) {
                iteratee = null;
            }
            var index = -1;
            iteratee = getCallback(iteratee, thisArg, 3);
            var result = baseMap(collection, function(value, key, collection) {
                return {
                    criteria: iteratee(value, key, collection),
                    index: ++index,
                    value: value
                };
            });
            return baseSortBy(result, compareAscending);
        }
        var sortByAll = restParam(function(collection, iteratees) {
            if (collection == null) {
                return [];
            }
            var guard = iteratees[2];
            if (guard && isIterateeCall(iteratees[0], iteratees[1], guard)) {
                iteratees.length = 1;
            }
            return baseSortByOrder(collection, baseFlatten(iteratees), []);
        });
        function sortByOrder(collection, iteratees, orders, guard) {
            if (collection == null) {
                return [];
            }
            if (guard && isIterateeCall(iteratees, orders, guard)) {
                orders = null;
            }
            if (!isArray(iteratees)) {
                iteratees = iteratees == null ? [] : [ iteratees ];
            }
            if (!isArray(orders)) {
                orders = orders == null ? [] : [ orders ];
            }
            return baseSortByOrder(collection, iteratees, orders);
        }
        function where(collection, source) {
            return filter(collection, baseMatches(source));
        }
        var now = nativeNow || function() {
            return new Date().getTime();
        };
        function after(n, func) {
            if (typeof func != "function") {
                if (typeof n == "function") {
                    var temp = n;
                    n = func;
                    func = temp;
                } else {
                    throw new TypeError(FUNC_ERROR_TEXT);
                }
            }
            n = nativeIsFinite(n = +n) ? n : 0;
            return function() {
                if (--n < 1) {
                    return func.apply(this, arguments);
                }
            };
        }
        function ary(func, n, guard) {
            if (guard && isIterateeCall(func, n, guard)) {
                n = null;
            }
            n = func && n == null ? func.length : nativeMax(+n || 0, 0);
            return createWrapper(func, ARY_FLAG, null, null, null, null, n);
        }
        function before(n, func) {
            var result;
            if (typeof func != "function") {
                if (typeof n == "function") {
                    var temp = n;
                    n = func;
                    func = temp;
                } else {
                    throw new TypeError(FUNC_ERROR_TEXT);
                }
            }
            return function() {
                if (--n > 0) {
                    result = func.apply(this, arguments);
                }
                if (n <= 1) {
                    func = null;
                }
                return result;
            };
        }
        var bind = restParam(function(func, thisArg, partials) {
            var bitmask = BIND_FLAG;
            if (partials.length) {
                var holders = replaceHolders(partials, bind.placeholder);
                bitmask |= PARTIAL_FLAG;
            }
            return createWrapper(func, bitmask, thisArg, partials, holders);
        });
        var bindAll = restParam(function(object, methodNames) {
            methodNames = methodNames.length ? baseFlatten(methodNames) : functions(object);
            var index = -1, length = methodNames.length;
            while (++index < length) {
                var key = methodNames[index];
                object[key] = createWrapper(object[key], BIND_FLAG, object);
            }
            return object;
        });
        var bindKey = restParam(function(object, key, partials) {
            var bitmask = BIND_FLAG | BIND_KEY_FLAG;
            if (partials.length) {
                var holders = replaceHolders(partials, bindKey.placeholder);
                bitmask |= PARTIAL_FLAG;
            }
            return createWrapper(key, bitmask, object, partials, holders);
        });
        var curry = createCurry(CURRY_FLAG);
        var curryRight = createCurry(CURRY_RIGHT_FLAG);
        function debounce(func, wait, options) {
            var args, maxTimeoutId, result, stamp, thisArg, timeoutId, trailingCall, lastCalled = 0, maxWait = false, trailing = true;
            if (typeof func != "function") {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            wait = wait < 0 ? 0 : +wait || 0;
            if (options === true) {
                var leading = true;
                trailing = false;
            } else if (isObject(options)) {
                leading = options.leading;
                maxWait = "maxWait" in options && nativeMax(+options.maxWait || 0, wait);
                trailing = "trailing" in options ? options.trailing : trailing;
            }
            function cancel() {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                if (maxTimeoutId) {
                    clearTimeout(maxTimeoutId);
                }
                maxTimeoutId = timeoutId = trailingCall = undefined;
            }
            function delayed() {
                var remaining = wait - (now() - stamp);
                if (remaining <= 0 || remaining > wait) {
                    if (maxTimeoutId) {
                        clearTimeout(maxTimeoutId);
                    }
                    var isCalled = trailingCall;
                    maxTimeoutId = timeoutId = trailingCall = undefined;
                    if (isCalled) {
                        lastCalled = now();
                        result = func.apply(thisArg, args);
                        if (!timeoutId && !maxTimeoutId) {
                            args = thisArg = null;
                        }
                    }
                } else {
                    timeoutId = setTimeout(delayed, remaining);
                }
            }
            function maxDelayed() {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                maxTimeoutId = timeoutId = trailingCall = undefined;
                if (trailing || maxWait !== wait) {
                    lastCalled = now();
                    result = func.apply(thisArg, args);
                    if (!timeoutId && !maxTimeoutId) {
                        args = thisArg = null;
                    }
                }
            }
            function debounced() {
                args = arguments;
                stamp = now();
                thisArg = this;
                trailingCall = trailing && (timeoutId || !leading);
                if (maxWait === false) {
                    var leadingCall = leading && !timeoutId;
                } else {
                    if (!maxTimeoutId && !leading) {
                        lastCalled = stamp;
                    }
                    var remaining = maxWait - (stamp - lastCalled), isCalled = remaining <= 0 || remaining > maxWait;
                    if (isCalled) {
                        if (maxTimeoutId) {
                            maxTimeoutId = clearTimeout(maxTimeoutId);
                        }
                        lastCalled = stamp;
                        result = func.apply(thisArg, args);
                    } else if (!maxTimeoutId) {
                        maxTimeoutId = setTimeout(maxDelayed, remaining);
                    }
                }
                if (isCalled && timeoutId) {
                    timeoutId = clearTimeout(timeoutId);
                } else if (!timeoutId && wait !== maxWait) {
                    timeoutId = setTimeout(delayed, wait);
                }
                if (leadingCall) {
                    isCalled = true;
                    result = func.apply(thisArg, args);
                }
                if (isCalled && !timeoutId && !maxTimeoutId) {
                    args = thisArg = null;
                }
                return result;
            }
            debounced.cancel = cancel;
            return debounced;
        }
        var defer = restParam(function(func, args) {
            return baseDelay(func, 1, args);
        });
        var delay = restParam(function(func, wait, args) {
            return baseDelay(func, wait, args);
        });
        var flow = createFlow();
        var flowRight = createFlow(true);
        function memoize(func, resolver) {
            if (typeof func != "function" || resolver && typeof resolver != "function") {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            var memoized = function() {
                var args = arguments, cache = memoized.cache, key = resolver ? resolver.apply(this, args) : args[0];
                if (cache.has(key)) {
                    return cache.get(key);
                }
                var result = func.apply(this, args);
                cache.set(key, result);
                return result;
            };
            memoized.cache = new memoize.Cache();
            return memoized;
        }
        function negate(predicate) {
            if (typeof predicate != "function") {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            return function() {
                return !predicate.apply(this, arguments);
            };
        }
        function once(func) {
            return before(2, func);
        }
        var partial = createPartial(PARTIAL_FLAG);
        var partialRight = createPartial(PARTIAL_RIGHT_FLAG);
        var rearg = restParam(function(func, indexes) {
            return createWrapper(func, REARG_FLAG, null, null, null, baseFlatten(indexes));
        });
        function restParam(func, start) {
            if (typeof func != "function") {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            start = nativeMax(start === undefined ? func.length - 1 : +start || 0, 0);
            return function() {
                var args = arguments, index = -1, length = nativeMax(args.length - start, 0), rest = Array(length);
                while (++index < length) {
                    rest[index] = args[start + index];
                }
                switch (start) {
                  case 0:
                    return func.call(this, rest);

                  case 1:
                    return func.call(this, args[0], rest);

                  case 2:
                    return func.call(this, args[0], args[1], rest);
                }
                var otherArgs = Array(start + 1);
                index = -1;
                while (++index < start) {
                    otherArgs[index] = args[index];
                }
                otherArgs[start] = rest;
                return func.apply(this, otherArgs);
            };
        }
        function spread(func) {
            if (typeof func != "function") {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            return function(array) {
                return func.apply(this, array);
            };
        }
        function throttle(func, wait, options) {
            var leading = true, trailing = true;
            if (typeof func != "function") {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            if (options === false) {
                leading = false;
            } else if (isObject(options)) {
                leading = "leading" in options ? !!options.leading : leading;
                trailing = "trailing" in options ? !!options.trailing : trailing;
            }
            debounceOptions.leading = leading;
            debounceOptions.maxWait = +wait;
            debounceOptions.trailing = trailing;
            return debounce(func, wait, debounceOptions);
        }
        function wrap(value, wrapper) {
            wrapper = wrapper == null ? identity : wrapper;
            return createWrapper(wrapper, PARTIAL_FLAG, null, [ value ], []);
        }
        function clone(value, isDeep, customizer, thisArg) {
            if (isDeep && typeof isDeep != "boolean" && isIterateeCall(value, isDeep, customizer)) {
                isDeep = false;
            } else if (typeof isDeep == "function") {
                thisArg = customizer;
                customizer = isDeep;
                isDeep = false;
            }
            customizer = typeof customizer == "function" && bindCallback(customizer, thisArg, 1);
            return baseClone(value, isDeep, customizer);
        }
        function cloneDeep(value, customizer, thisArg) {
            customizer = typeof customizer == "function" && bindCallback(customizer, thisArg, 1);
            return baseClone(value, true, customizer);
        }
        function isArguments(value) {
            return isObjectLike(value) && isArrayLike(value) && objToString.call(value) == argsTag;
        }
        if (!support.argsTag) {
            isArguments = function(value) {
                return isObjectLike(value) && isArrayLike(value) && hasOwnProperty.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
            };
        }
        var isArray = nativeIsArray || function(value) {
            return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
        };
        function isBoolean(value) {
            return value === true || value === false || isObjectLike(value) && objToString.call(value) == boolTag;
        }
        function isDate(value) {
            return isObjectLike(value) && objToString.call(value) == dateTag;
        }
        function isElement(value) {
            return !!value && value.nodeType === 1 && isObjectLike(value) && (lodash.support.nodeTag ? objToString.call(value).indexOf("Element") > -1 : isHostObject(value));
        }
        if (!support.dom) {
            isElement = function(value) {
                return !!value && value.nodeType === 1 && isObjectLike(value) && !isPlainObject(value);
            };
        }
        function isEmpty(value) {
            if (value == null) {
                return true;
            }
            if (isArrayLike(value) && (isArray(value) || isString(value) || isArguments(value) || isObjectLike(value) && isFunction(value.splice))) {
                return !value.length;
            }
            return !keys(value).length;
        }
        function isEqual(value, other, customizer, thisArg) {
            customizer = typeof customizer == "function" && bindCallback(customizer, thisArg, 3);
            if (!customizer && isStrictComparable(value) && isStrictComparable(other)) {
                return value === other;
            }
            var result = customizer ? customizer(value, other) : undefined;
            return result === undefined ? baseIsEqual(value, other, customizer) : !!result;
        }
        function isError(value) {
            return isObjectLike(value) && typeof value.message == "string" && objToString.call(value) == errorTag;
        }
        var isFinite = nativeNumIsFinite || function(value) {
            return typeof value == "number" && nativeIsFinite(value);
        };
        var isFunction = !(baseIsFunction(/x/) || Uint8Array && !baseIsFunction(Uint8Array)) ? baseIsFunction : function(value) {
            return objToString.call(value) == funcTag;
        };
        function isObject(value) {
            var type = typeof value;
            return type == "function" || !!value && type == "object";
        }
        function isMatch(object, source, customizer, thisArg) {
            var props = keys(source), length = props.length;
            if (!length) {
                return true;
            }
            if (object == null) {
                return false;
            }
            customizer = typeof customizer == "function" && bindCallback(customizer, thisArg, 3);
            object = toObject(object);
            if (!customizer && length == 1) {
                var key = props[0], value = source[key];
                if (isStrictComparable(value)) {
                    return value === object[key] && (value !== undefined || key in object);
                }
            }
            var values = Array(length), strictCompareFlags = Array(length);
            while (length--) {
                value = values[length] = source[props[length]];
                strictCompareFlags[length] = isStrictComparable(value);
            }
            return baseIsMatch(object, props, values, strictCompareFlags, customizer);
        }
        function isNaN(value) {
            return isNumber(value) && value != +value;
        }
        function isNative(value) {
            if (value == null) {
                return false;
            }
            if (objToString.call(value) == funcTag) {
                return reIsNative.test(fnToString.call(value));
            }
            return isObjectLike(value) && (isHostObject(value) ? reIsNative : reIsHostCtor).test(value);
        }
        function isNull(value) {
            return value === null;
        }
        function isNumber(value) {
            return typeof value == "number" || isObjectLike(value) && objToString.call(value) == numberTag;
        }
        var isPlainObject = !getPrototypeOf ? shimIsPlainObject : function(value) {
            if (!(value && objToString.call(value) == objectTag) || !lodash.support.argsTag && isArguments(value)) {
                return false;
            }
            var valueOf = value.valueOf, objProto = isNative(valueOf) && (objProto = getPrototypeOf(valueOf)) && getPrototypeOf(objProto);
            return objProto ? value == objProto || getPrototypeOf(value) == objProto : shimIsPlainObject(value);
        };
        function isRegExp(value) {
            return isObject(value) && objToString.call(value) == regexpTag;
        }
        function isString(value) {
            return typeof value == "string" || isObjectLike(value) && objToString.call(value) == stringTag;
        }
        function isTypedArray(value) {
            return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objToString.call(value)];
        }
        function isUndefined(value) {
            return value === undefined;
        }
        function toArray(value) {
            var length = value ? getLength(value) : 0;
            if (!isLength(length)) {
                return values(value);
            }
            if (!length) {
                return [];
            }
            return lodash.support.unindexedChars && isString(value) ? value.split("") : arrayCopy(value);
        }
        function toPlainObject(value) {
            return baseCopy(value, keysIn(value));
        }
        var assign = createAssigner(function(object, source, customizer) {
            return customizer ? assignWith(object, source, customizer) : baseAssign(object, source);
        });
        function create(prototype, properties, guard) {
            var result = baseCreate(prototype);
            if (guard && isIterateeCall(prototype, properties, guard)) {
                properties = null;
            }
            return properties ? baseAssign(result, properties) : result;
        }
        var defaults = restParam(function(args) {
            var object = args[0];
            if (object == null) {
                return object;
            }
            args.push(assignDefaults);
            return assign.apply(undefined, args);
        });
        var findKey = createFindKey(baseForOwn);
        var findLastKey = createFindKey(baseForOwnRight);
        var forIn = createForIn(baseFor);
        var forInRight = createForIn(baseForRight);
        var forOwn = createForOwn(baseForOwn);
        var forOwnRight = createForOwn(baseForOwnRight);
        function functions(object) {
            return baseFunctions(object, keysIn(object));
        }
        function get(object, path, defaultValue) {
            var result = object == null ? undefined : baseGet(object, toPath(path), path + "");
            return result === undefined ? defaultValue : result;
        }
        function has(object, path) {
            if (object == null) {
                return false;
            }
            var result = hasOwnProperty.call(object, path);
            if (!result && !isKey(path)) {
                path = toPath(path);
                object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
                path = last(path);
                result = object != null && hasOwnProperty.call(object, path);
            }
            return result || lodash.support.nonEnumStrings && isString(object) && isIndex(path, object.length);
        }
        function invert(object, multiValue, guard) {
            if (guard && isIterateeCall(object, multiValue, guard)) {
                multiValue = null;
            }
            var index = -1, props = keys(object), length = props.length, result = {};
            while (++index < length) {
                var key = props[index], value = object[key];
                if (multiValue) {
                    if (hasOwnProperty.call(result, value)) {
                        result[value].push(key);
                    } else {
                        result[value] = [ key ];
                    }
                } else {
                    result[value] = key;
                }
            }
            return result;
        }
        var keys = !nativeKeys ? shimKeys : function(object) {
            var Ctor = object != null && object.constructor;
            if (typeof Ctor == "function" && Ctor.prototype === object || (typeof object == "function" ? lodash.support.enumPrototypes : isArrayLike(object))) {
                return shimKeys(object);
            }
            return isObject(object) ? nativeKeys(object) : [];
        };
        function keysIn(object) {
            if (object == null) {
                return [];
            }
            if (!isObject(object)) {
                object = Object(object);
            }
            var length = object.length, support = lodash.support;
            length = length && isLength(length) && (isArray(object) || support.nonEnumStrings && isString(object) || support.nonEnumArgs && isArguments(object)) && length || 0;
            var Ctor = object.constructor, index = -1, proto = isFunction(Ctor) && Ctor.prototype || objectProto, isProto = proto === object, result = Array(length), skipIndexes = length > 0, skipErrorProps = support.enumErrorProps && (object === errorProto || object instanceof Error), skipProto = support.enumPrototypes && isFunction(object);
            while (++index < length) {
                result[index] = index + "";
            }
            for (var key in object) {
                if (!(skipProto && key == "prototype") && !(skipErrorProps && (key == "message" || key == "name")) && !(skipIndexes && isIndex(key, length)) && !(key == "constructor" && (isProto || !hasOwnProperty.call(object, key)))) {
                    result.push(key);
                }
            }
            if (support.nonEnumShadows && object !== objectProto) {
                var tag = object === stringProto ? stringTag : object === errorProto ? errorTag : objToString.call(object), nonEnums = nonEnumProps[tag] || nonEnumProps[objectTag];
                if (tag == objectTag) {
                    proto = objectProto;
                }
                length = shadowProps.length;
                while (length--) {
                    key = shadowProps[length];
                    var nonEnum = nonEnums[key];
                    if (!(isProto && nonEnum) && (nonEnum ? hasOwnProperty.call(object, key) : object[key] !== proto[key])) {
                        result.push(key);
                    }
                }
            }
            return result;
        }
        var mapKeys = createObjectMapper(true);
        var mapValues = createObjectMapper();
        var merge = createAssigner(baseMerge);
        var omit = restParam(function(object, props) {
            if (object == null) {
                return {};
            }
            if (typeof props[0] != "function") {
                var props = arrayMap(baseFlatten(props), String);
                return pickByArray(object, baseDifference(keysIn(object), props));
            }
            var predicate = bindCallback(props[0], props[1], 3);
            return pickByCallback(object, function(value, key, object) {
                return !predicate(value, key, object);
            });
        });
        function pairs(object) {
            var index = -1, props = keys(object), length = props.length, result = Array(length);
            while (++index < length) {
                var key = props[index];
                result[index] = [ key, object[key] ];
            }
            return result;
        }
        var pick = restParam(function(object, props) {
            if (object == null) {
                return {};
            }
            return typeof props[0] == "function" ? pickByCallback(object, bindCallback(props[0], props[1], 3)) : pickByArray(object, baseFlatten(props));
        });
        function result(object, path, defaultValue) {
            var result = object == null ? undefined : toObject(object)[path];
            if (result === undefined) {
                if (object != null && !isKey(path, object)) {
                    path = toPath(path);
                    object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
                    result = object == null ? undefined : toObject(object)[last(path)];
                }
                result = result === undefined ? defaultValue : result;
            }
            return isFunction(result) ? result.call(object) : result;
        }
        function set(object, path, value) {
            if (object == null) {
                return object;
            }
            var pathKey = path + "";
            path = object[pathKey] != null || isKey(path, object) ? [ pathKey ] : toPath(path);
            var index = -1, length = path.length, endIndex = length - 1, nested = object;
            while (nested != null && ++index < length) {
                var key = path[index];
                if (isObject(nested)) {
                    if (index == endIndex) {
                        nested[key] = value;
                    } else if (nested[key] == null) {
                        nested[key] = isIndex(path[index + 1]) ? [] : {};
                    }
                }
                nested = nested[key];
            }
            return object;
        }
        function transform(object, iteratee, accumulator, thisArg) {
            var isArr = isArray(object) || isTypedArray(object);
            iteratee = getCallback(iteratee, thisArg, 4);
            if (accumulator == null) {
                if (isArr || isObject(object)) {
                    var Ctor = object.constructor;
                    if (isArr) {
                        accumulator = isArray(object) ? new Ctor() : [];
                    } else {
                        accumulator = baseCreate(isFunction(Ctor) && Ctor.prototype);
                    }
                } else {
                    accumulator = {};
                }
            }
            (isArr ? arrayEach : baseForOwn)(object, function(value, index, object) {
                return iteratee(accumulator, value, index, object);
            });
            return accumulator;
        }
        function values(object) {
            return baseValues(object, keys(object));
        }
        function valuesIn(object) {
            return baseValues(object, keysIn(object));
        }
        function inRange(value, start, end) {
            start = +start || 0;
            if (typeof end === "undefined") {
                end = start;
                start = 0;
            } else {
                end = +end || 0;
            }
            return value >= nativeMin(start, end) && value < nativeMax(start, end);
        }
        function random(min, max, floating) {
            if (floating && isIterateeCall(min, max, floating)) {
                max = floating = null;
            }
            var noMin = min == null, noMax = max == null;
            if (floating == null) {
                if (noMax && typeof min == "boolean") {
                    floating = min;
                    min = 1;
                } else if (typeof max == "boolean") {
                    floating = max;
                    noMax = true;
                }
            }
            if (noMin && noMax) {
                max = 1;
                noMax = false;
            }
            min = +min || 0;
            if (noMax) {
                max = min;
                min = 0;
            } else {
                max = +max || 0;
            }
            if (floating || min % 1 || max % 1) {
                var rand = nativeRandom();
                return nativeMin(min + rand * (max - min + parseFloat("1e-" + ((rand + "").length - 1))), max);
            }
            return baseRandom(min, max);
        }
        var camelCase = createCompounder(function(result, word, index) {
            word = word.toLowerCase();
            return result + (index ? word.charAt(0).toUpperCase() + word.slice(1) : word);
        });
        function capitalize(string) {
            string = baseToString(string);
            return string && string.charAt(0).toUpperCase() + string.slice(1);
        }
        function deburr(string) {
            string = baseToString(string);
            return string && string.replace(reLatin1, deburrLetter).replace(reComboMark, "");
        }
        function endsWith(string, target, position) {
            string = baseToString(string);
            target = target + "";
            var length = string.length;
            position = position === undefined ? length : nativeMin(position < 0 ? 0 : +position || 0, length);
            position -= target.length;
            return position >= 0 && string.indexOf(target, position) == position;
        }
        function escape(string) {
            string = baseToString(string);
            return string && reHasUnescapedHtml.test(string) ? string.replace(reUnescapedHtml, escapeHtmlChar) : string;
        }
        function escapeRegExp(string) {
            string = baseToString(string);
            return string && reHasRegExpChars.test(string) ? string.replace(reRegExpChars, "\\$&") : string;
        }
        var kebabCase = createCompounder(function(result, word, index) {
            return result + (index ? "-" : "") + word.toLowerCase();
        });
        function pad(string, length, chars) {
            string = baseToString(string);
            length = +length;
            var strLength = string.length;
            if (strLength >= length || !nativeIsFinite(length)) {
                return string;
            }
            var mid = (length - strLength) / 2, leftLength = floor(mid), rightLength = ceil(mid);
            chars = createPadding("", rightLength, chars);
            return chars.slice(0, leftLength) + string + chars;
        }
        var padLeft = createPadDir();
        var padRight = createPadDir(true);
        function parseInt(string, radix, guard) {
            if (guard && isIterateeCall(string, radix, guard)) {
                radix = 0;
            }
            return nativeParseInt(string, radix);
        }
        if (nativeParseInt(whitespace + "08") != 8) {
            parseInt = function(string, radix, guard) {
                if (guard ? isIterateeCall(string, radix, guard) : radix == null) {
                    radix = 0;
                } else if (radix) {
                    radix = +radix;
                }
                string = trim(string);
                return nativeParseInt(string, radix || (reHasHexPrefix.test(string) ? 16 : 10));
            };
        }
        function repeat(string, n) {
            var result = "";
            string = baseToString(string);
            n = +n;
            if (n < 1 || !string || !nativeIsFinite(n)) {
                return result;
            }
            do {
                if (n % 2) {
                    result += string;
                }
                n = floor(n / 2);
                string += string;
            } while (n);
            return result;
        }
        var snakeCase = createCompounder(function(result, word, index) {
            return result + (index ? "_" : "") + word.toLowerCase();
        });
        var startCase = createCompounder(function(result, word, index) {
            return result + (index ? " " : "") + (word.charAt(0).toUpperCase() + word.slice(1));
        });
        function startsWith(string, target, position) {
            string = baseToString(string);
            position = position == null ? 0 : nativeMin(position < 0 ? 0 : +position || 0, string.length);
            return string.lastIndexOf(target, position) == position;
        }
        function template(string, options, otherOptions) {
            var settings = lodash.templateSettings;
            if (otherOptions && isIterateeCall(string, options, otherOptions)) {
                options = otherOptions = null;
            }
            string = baseToString(string);
            options = assignWith(baseAssign({}, otherOptions || options), settings, assignOwnDefaults);
            var imports = assignWith(baseAssign({}, options.imports), settings.imports, assignOwnDefaults), importsKeys = keys(imports), importsValues = baseValues(imports, importsKeys);
            var isEscaping, isEvaluating, index = 0, interpolate = options.interpolate || reNoMatch, source = "__p += '";
            var reDelimiters = RegExp((options.escape || reNoMatch).source + "|" + interpolate.source + "|" + (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + "|" + (options.evaluate || reNoMatch).source + "|$", "g");
            var sourceURL = "//# sourceURL=" + ("sourceURL" in options ? options.sourceURL : "lodash.templateSources[" + ++templateCounter + "]") + "\n";
            string.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
                interpolateValue || (interpolateValue = esTemplateValue);
                source += string.slice(index, offset).replace(reUnescapedString, escapeStringChar);
                if (escapeValue) {
                    isEscaping = true;
                    source += "' +\n__e(" + escapeValue + ") +\n'";
                }
                if (evaluateValue) {
                    isEvaluating = true;
                    source += "';\n" + evaluateValue + ";\n__p += '";
                }
                if (interpolateValue) {
                    source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
                }
                index = offset + match.length;
                return match;
            });
            source += "';\n";
            var variable = options.variable;
            if (!variable) {
                source = "with (obj) {\n" + source + "\n}\n";
            }
            source = (isEvaluating ? source.replace(reEmptyStringLeading, "") : source).replace(reEmptyStringMiddle, "$1").replace(reEmptyStringTrailing, "$1;");
            source = "function(" + (variable || "obj") + ") {\n" + (variable ? "" : "obj || (obj = {});\n") + "var __t, __p = ''" + (isEscaping ? ", __e = _.escape" : "") + (isEvaluating ? ", __j = Array.prototype.join;\n" + "function print() { __p += __j.call(arguments, '') }\n" : ";\n") + source + "return __p\n}";
            var result = attempt(function() {
                return Function(importsKeys, sourceURL + "return " + source).apply(undefined, importsValues);
            });
            result.source = source;
            if (isError(result)) {
                throw result;
            }
            return result;
        }
        function trim(string, chars, guard) {
            var value = string;
            string = baseToString(string);
            if (!string) {
                return string;
            }
            if (guard ? isIterateeCall(value, chars, guard) : chars == null) {
                return string.slice(trimmedLeftIndex(string), trimmedRightIndex(string) + 1);
            }
            chars = chars + "";
            return string.slice(charsLeftIndex(string, chars), charsRightIndex(string, chars) + 1);
        }
        function trimLeft(string, chars, guard) {
            var value = string;
            string = baseToString(string);
            if (!string) {
                return string;
            }
            if (guard ? isIterateeCall(value, chars, guard) : chars == null) {
                return string.slice(trimmedLeftIndex(string));
            }
            return string.slice(charsLeftIndex(string, chars + ""));
        }
        function trimRight(string, chars, guard) {
            var value = string;
            string = baseToString(string);
            if (!string) {
                return string;
            }
            if (guard ? isIterateeCall(value, chars, guard) : chars == null) {
                return string.slice(0, trimmedRightIndex(string) + 1);
            }
            return string.slice(0, charsRightIndex(string, chars + "") + 1);
        }
        function trunc(string, options, guard) {
            if (guard && isIterateeCall(string, options, guard)) {
                options = null;
            }
            var length = DEFAULT_TRUNC_LENGTH, omission = DEFAULT_TRUNC_OMISSION;
            if (options != null) {
                if (isObject(options)) {
                    var separator = "separator" in options ? options.separator : separator;
                    length = "length" in options ? +options.length || 0 : length;
                    omission = "omission" in options ? baseToString(options.omission) : omission;
                } else {
                    length = +options || 0;
                }
            }
            string = baseToString(string);
            if (length >= string.length) {
                return string;
            }
            var end = length - omission.length;
            if (end < 1) {
                return omission;
            }
            var result = string.slice(0, end);
            if (separator == null) {
                return result + omission;
            }
            if (isRegExp(separator)) {
                if (string.slice(end).search(separator)) {
                    var match, newEnd, substring = string.slice(0, end);
                    if (!separator.global) {
                        separator = RegExp(separator.source, (reFlags.exec(separator) || "") + "g");
                    }
                    separator.lastIndex = 0;
                    while (match = separator.exec(substring)) {
                        newEnd = match.index;
                    }
                    result = result.slice(0, newEnd == null ? end : newEnd);
                }
            } else if (string.indexOf(separator, end) != end) {
                var index = result.lastIndexOf(separator);
                if (index > -1) {
                    result = result.slice(0, index);
                }
            }
            return result + omission;
        }
        function unescape(string) {
            string = baseToString(string);
            return string && reHasEscapedHtml.test(string) ? string.replace(reEscapedHtml, unescapeHtmlChar) : string;
        }
        function words(string, pattern, guard) {
            if (guard && isIterateeCall(string, pattern, guard)) {
                pattern = null;
            }
            string = baseToString(string);
            return string.match(pattern || reWords) || [];
        }
        var attempt = restParam(function(func, args) {
            try {
                return func.apply(undefined, args);
            } catch (e) {
                return isError(e) ? e : new Error(e);
            }
        });
        function callback(func, thisArg, guard) {
            if (guard && isIterateeCall(func, thisArg, guard)) {
                thisArg = null;
            }
            return isObjectLike(func) ? matches(func) : baseCallback(func, thisArg);
        }
        function constant(value) {
            return function() {
                return value;
            };
        }
        function identity(value) {
            return value;
        }
        function matches(source) {
            return baseMatches(baseClone(source, true));
        }
        function matchesProperty(path, value) {
            return baseMatchesProperty(path, baseClone(value, true));
        }
        var method = restParam(function(path, args) {
            return function(object) {
                return invokePath(object, path, args);
            };
        });
        var methodOf = restParam(function(object, args) {
            return function(path) {
                return invokePath(object, path, args);
            };
        });
        function mixin(object, source, options) {
            if (options == null) {
                var isObj = isObject(source), props = isObj && keys(source), methodNames = props && props.length && baseFunctions(source, props);
                if (!(methodNames ? methodNames.length : isObj)) {
                    methodNames = false;
                    options = source;
                    source = object;
                    object = this;
                }
            }
            if (!methodNames) {
                methodNames = baseFunctions(source, keys(source));
            }
            var chain = true, index = -1, isFunc = isFunction(object), length = methodNames.length;
            if (options === false) {
                chain = false;
            } else if (isObject(options) && "chain" in options) {
                chain = options.chain;
            }
            while (++index < length) {
                var methodName = methodNames[index], func = source[methodName];
                object[methodName] = func;
                if (isFunc) {
                    object.prototype[methodName] = function(func) {
                        return function() {
                            var chainAll = this.__chain__;
                            if (chain || chainAll) {
                                var result = object(this.__wrapped__), actions = result.__actions__ = arrayCopy(this.__actions__);
                                actions.push({
                                    func: func,
                                    args: arguments,
                                    thisArg: object
                                });
                                result.__chain__ = chainAll;
                                return result;
                            }
                            var args = [ this.value() ];
                            push.apply(args, arguments);
                            return func.apply(object, args);
                        };
                    }(func);
                }
            }
            return object;
        }
        function noConflict() {
            context._ = oldDash;
            return this;
        }
        function noop() {}
        function property(path) {
            return isKey(path) ? baseProperty(path) : basePropertyDeep(path);
        }
        function propertyOf(object) {
            return function(path) {
                return baseGet(object, toPath(path), path + "");
            };
        }
        function range(start, end, step) {
            if (step && isIterateeCall(start, end, step)) {
                end = step = null;
            }
            start = +start || 0;
            step = step == null ? 1 : +step || 0;
            if (end == null) {
                end = start;
                start = 0;
            } else {
                end = +end || 0;
            }
            var index = -1, length = nativeMax(ceil((end - start) / (step || 1)), 0), result = Array(length);
            while (++index < length) {
                result[index] = start;
                start += step;
            }
            return result;
        }
        function times(n, iteratee, thisArg) {
            n = floor(n);
            if (n < 1 || !nativeIsFinite(n)) {
                return [];
            }
            var index = -1, result = Array(nativeMin(n, MAX_ARRAY_LENGTH));
            iteratee = bindCallback(iteratee, thisArg, 1);
            while (++index < n) {
                if (index < MAX_ARRAY_LENGTH) {
                    result[index] = iteratee(index);
                } else {
                    iteratee(index);
                }
            }
            return result;
        }
        function uniqueId(prefix) {
            var id = ++idCounter;
            return baseToString(prefix) + id;
        }
        function add(augend, addend) {
            return (+augend || 0) + (+addend || 0);
        }
        var max = createExtremum(arrayMax);
        var min = createExtremum(arrayMin, true);
        function sum(collection, iteratee, thisArg) {
            if (thisArg && isIterateeCall(collection, iteratee, thisArg)) {
                iteratee = null;
            }
            var func = getCallback(), noIteratee = iteratee == null;
            if (!(func === baseCallback && noIteratee)) {
                noIteratee = false;
                iteratee = func(iteratee, thisArg, 3);
            }
            return noIteratee ? arraySum(isArray(collection) ? collection : toIterable(collection)) : baseSum(collection, iteratee);
        }
        lodash.prototype = baseLodash.prototype;
        LodashWrapper.prototype = baseCreate(baseLodash.prototype);
        LodashWrapper.prototype.constructor = LodashWrapper;
        LazyWrapper.prototype = baseCreate(baseLodash.prototype);
        LazyWrapper.prototype.constructor = LazyWrapper;
        MapCache.prototype["delete"] = mapDelete;
        MapCache.prototype.get = mapGet;
        MapCache.prototype.has = mapHas;
        MapCache.prototype.set = mapSet;
        SetCache.prototype.push = cachePush;
        memoize.Cache = MapCache;
        lodash.after = after;
        lodash.ary = ary;
        lodash.assign = assign;
        lodash.at = at;
        lodash.before = before;
        lodash.bind = bind;
        lodash.bindAll = bindAll;
        lodash.bindKey = bindKey;
        lodash.callback = callback;
        lodash.chain = chain;
        lodash.chunk = chunk;
        lodash.compact = compact;
        lodash.constant = constant;
        lodash.countBy = countBy;
        lodash.create = create;
        lodash.curry = curry;
        lodash.curryRight = curryRight;
        lodash.debounce = debounce;
        lodash.defaults = defaults;
        lodash.defer = defer;
        lodash.delay = delay;
        lodash.difference = difference;
        lodash.drop = drop;
        lodash.dropRight = dropRight;
        lodash.dropRightWhile = dropRightWhile;
        lodash.dropWhile = dropWhile;
        lodash.fill = fill;
        lodash.filter = filter;
        lodash.flatten = flatten;
        lodash.flattenDeep = flattenDeep;
        lodash.flow = flow;
        lodash.flowRight = flowRight;
        lodash.forEach = forEach;
        lodash.forEachRight = forEachRight;
        lodash.forIn = forIn;
        lodash.forInRight = forInRight;
        lodash.forOwn = forOwn;
        lodash.forOwnRight = forOwnRight;
        lodash.functions = functions;
        lodash.groupBy = groupBy;
        lodash.indexBy = indexBy;
        lodash.initial = initial;
        lodash.intersection = intersection;
        lodash.invert = invert;
        lodash.invoke = invoke;
        lodash.keys = keys;
        lodash.keysIn = keysIn;
        lodash.map = map;
        lodash.mapKeys = mapKeys;
        lodash.mapValues = mapValues;
        lodash.matches = matches;
        lodash.matchesProperty = matchesProperty;
        lodash.memoize = memoize;
        lodash.merge = merge;
        lodash.method = method;
        lodash.methodOf = methodOf;
        lodash.mixin = mixin;
        lodash.negate = negate;
        lodash.omit = omit;
        lodash.once = once;
        lodash.pairs = pairs;
        lodash.partial = partial;
        lodash.partialRight = partialRight;
        lodash.partition = partition;
        lodash.pick = pick;
        lodash.pluck = pluck;
        lodash.property = property;
        lodash.propertyOf = propertyOf;
        lodash.pull = pull;
        lodash.pullAt = pullAt;
        lodash.range = range;
        lodash.rearg = rearg;
        lodash.reject = reject;
        lodash.remove = remove;
        lodash.rest = rest;
        lodash.restParam = restParam;
        lodash.set = set;
        lodash.shuffle = shuffle;
        lodash.slice = slice;
        lodash.sortBy = sortBy;
        lodash.sortByAll = sortByAll;
        lodash.sortByOrder = sortByOrder;
        lodash.spread = spread;
        lodash.take = take;
        lodash.takeRight = takeRight;
        lodash.takeRightWhile = takeRightWhile;
        lodash.takeWhile = takeWhile;
        lodash.tap = tap;
        lodash.throttle = throttle;
        lodash.thru = thru;
        lodash.times = times;
        lodash.toArray = toArray;
        lodash.toPlainObject = toPlainObject;
        lodash.transform = transform;
        lodash.union = union;
        lodash.uniq = uniq;
        lodash.unzip = unzip;
        lodash.unzipWith = unzipWith;
        lodash.values = values;
        lodash.valuesIn = valuesIn;
        lodash.where = where;
        lodash.without = without;
        lodash.wrap = wrap;
        lodash.xor = xor;
        lodash.zip = zip;
        lodash.zipObject = zipObject;
        lodash.zipWith = zipWith;
        lodash.backflow = flowRight;
        lodash.collect = map;
        lodash.compose = flowRight;
        lodash.each = forEach;
        lodash.eachRight = forEachRight;
        lodash.extend = assign;
        lodash.iteratee = callback;
        lodash.methods = functions;
        lodash.object = zipObject;
        lodash.select = filter;
        lodash.tail = rest;
        lodash.unique = uniq;
        mixin(lodash, lodash);
        lodash.add = add;
        lodash.attempt = attempt;
        lodash.camelCase = camelCase;
        lodash.capitalize = capitalize;
        lodash.clone = clone;
        lodash.cloneDeep = cloneDeep;
        lodash.deburr = deburr;
        lodash.endsWith = endsWith;
        lodash.escape = escape;
        lodash.escapeRegExp = escapeRegExp;
        lodash.every = every;
        lodash.find = find;
        lodash.findIndex = findIndex;
        lodash.findKey = findKey;
        lodash.findLast = findLast;
        lodash.findLastIndex = findLastIndex;
        lodash.findLastKey = findLastKey;
        lodash.findWhere = findWhere;
        lodash.first = first;
        lodash.get = get;
        lodash.has = has;
        lodash.identity = identity;
        lodash.includes = includes;
        lodash.indexOf = indexOf;
        lodash.inRange = inRange;
        lodash.isArguments = isArguments;
        lodash.isArray = isArray;
        lodash.isBoolean = isBoolean;
        lodash.isDate = isDate;
        lodash.isElement = isElement;
        lodash.isEmpty = isEmpty;
        lodash.isEqual = isEqual;
        lodash.isError = isError;
        lodash.isFinite = isFinite;
        lodash.isFunction = isFunction;
        lodash.isMatch = isMatch;
        lodash.isNaN = isNaN;
        lodash.isNative = isNative;
        lodash.isNull = isNull;
        lodash.isNumber = isNumber;
        lodash.isObject = isObject;
        lodash.isPlainObject = isPlainObject;
        lodash.isRegExp = isRegExp;
        lodash.isString = isString;
        lodash.isTypedArray = isTypedArray;
        lodash.isUndefined = isUndefined;
        lodash.kebabCase = kebabCase;
        lodash.last = last;
        lodash.lastIndexOf = lastIndexOf;
        lodash.max = max;
        lodash.min = min;
        lodash.noConflict = noConflict;
        lodash.noop = noop;
        lodash.now = now;
        lodash.pad = pad;
        lodash.padLeft = padLeft;
        lodash.padRight = padRight;
        lodash.parseInt = parseInt;
        lodash.random = random;
        lodash.reduce = reduce;
        lodash.reduceRight = reduceRight;
        lodash.repeat = repeat;
        lodash.result = result;
        lodash.runInContext = runInContext;
        lodash.size = size;
        lodash.snakeCase = snakeCase;
        lodash.some = some;
        lodash.sortedIndex = sortedIndex;
        lodash.sortedLastIndex = sortedLastIndex;
        lodash.startCase = startCase;
        lodash.startsWith = startsWith;
        lodash.sum = sum;
        lodash.template = template;
        lodash.trim = trim;
        lodash.trimLeft = trimLeft;
        lodash.trimRight = trimRight;
        lodash.trunc = trunc;
        lodash.unescape = unescape;
        lodash.uniqueId = uniqueId;
        lodash.words = words;
        lodash.all = every;
        lodash.any = some;
        lodash.contains = includes;
        lodash.detect = find;
        lodash.foldl = reduce;
        lodash.foldr = reduceRight;
        lodash.head = first;
        lodash.include = includes;
        lodash.inject = reduce;
        mixin(lodash, function() {
            var source = {};
            baseForOwn(lodash, function(func, methodName) {
                if (!lodash.prototype[methodName]) {
                    source[methodName] = func;
                }
            });
            return source;
        }(), false);
        lodash.sample = sample;
        lodash.prototype.sample = function(n) {
            if (!this.__chain__ && n == null) {
                return sample(this.value());
            }
            return this.thru(function(value) {
                return sample(value, n);
            });
        };
        lodash.VERSION = VERSION;
        arrayEach([ "bind", "bindKey", "curry", "curryRight", "partial", "partialRight" ], function(methodName) {
            lodash[methodName].placeholder = lodash;
        });
        arrayEach([ "dropWhile", "filter", "map", "takeWhile" ], function(methodName, type) {
            var isFilter = type != LAZY_MAP_FLAG, isDropWhile = type == LAZY_DROP_WHILE_FLAG;
            LazyWrapper.prototype[methodName] = function(iteratee, thisArg) {
                var filtered = this.__filtered__, result = filtered && isDropWhile ? new LazyWrapper(this) : this.clone(), iteratees = result.__iteratees__ || (result.__iteratees__ = []);
                iteratees.push({
                    done: false,
                    count: 0,
                    index: 0,
                    iteratee: getCallback(iteratee, thisArg, 1),
                    limit: -1,
                    type: type
                });
                result.__filtered__ = filtered || isFilter;
                return result;
            };
        });
        arrayEach([ "drop", "take" ], function(methodName, index) {
            var whileName = methodName + "While";
            LazyWrapper.prototype[methodName] = function(n) {
                var filtered = this.__filtered__, result = filtered && !index ? this.dropWhile() : this.clone();
                n = n == null ? 1 : nativeMax(floor(n) || 0, 0);
                if (filtered) {
                    if (index) {
                        result.__takeCount__ = nativeMin(result.__takeCount__, n);
                    } else {
                        last(result.__iteratees__).limit = n;
                    }
                } else {
                    var views = result.__views__ || (result.__views__ = []);
                    views.push({
                        size: n,
                        type: methodName + (result.__dir__ < 0 ? "Right" : "")
                    });
                }
                return result;
            };
            LazyWrapper.prototype[methodName + "Right"] = function(n) {
                return this.reverse()[methodName](n).reverse();
            };
            LazyWrapper.prototype[methodName + "RightWhile"] = function(predicate, thisArg) {
                return this.reverse()[whileName](predicate, thisArg).reverse();
            };
        });
        arrayEach([ "first", "last" ], function(methodName, index) {
            var takeName = "take" + (index ? "Right" : "");
            LazyWrapper.prototype[methodName] = function() {
                return this[takeName](1).value()[0];
            };
        });
        arrayEach([ "initial", "rest" ], function(methodName, index) {
            var dropName = "drop" + (index ? "" : "Right");
            LazyWrapper.prototype[methodName] = function() {
                return this[dropName](1);
            };
        });
        arrayEach([ "pluck", "where" ], function(methodName, index) {
            var operationName = index ? "filter" : "map", createCallback = index ? baseMatches : property;
            LazyWrapper.prototype[methodName] = function(value) {
                return this[operationName](createCallback(value));
            };
        });
        LazyWrapper.prototype.compact = function() {
            return this.filter(identity);
        };
        LazyWrapper.prototype.reject = function(predicate, thisArg) {
            predicate = getCallback(predicate, thisArg, 1);
            return this.filter(function(value) {
                return !predicate(value);
            });
        };
        LazyWrapper.prototype.slice = function(start, end) {
            start = start == null ? 0 : +start || 0;
            var result = this;
            if (start < 0) {
                result = this.takeRight(-start);
            } else if (start) {
                result = this.drop(start);
            }
            if (end !== undefined) {
                end = +end || 0;
                result = end < 0 ? result.dropRight(-end) : result.take(end - start);
            }
            return result;
        };
        LazyWrapper.prototype.toArray = function() {
            return this.drop(0);
        };
        baseForOwn(LazyWrapper.prototype, function(func, methodName) {
            var lodashFunc = lodash[methodName];
            if (!lodashFunc) {
                return;
            }
            var checkIteratee = /^(?:filter|map|reject)|While$/.test(methodName), retUnwrapped = /^(?:first|last)$/.test(methodName);
            lodash.prototype[methodName] = function() {
                var args = arguments, chainAll = this.__chain__, value = this.__wrapped__, isHybrid = !!this.__actions__.length, isLazy = value instanceof LazyWrapper, iteratee = args[0], useLazy = isLazy || isArray(value);
                if (useLazy && checkIteratee && typeof iteratee == "function" && iteratee.length != 1) {
                    isLazy = useLazy = false;
                }
                var onlyLazy = isLazy && !isHybrid;
                if (retUnwrapped && !chainAll) {
                    return onlyLazy ? func.call(value) : lodashFunc.call(lodash, this.value());
                }
                var interceptor = function(value) {
                    var otherArgs = [ value ];
                    push.apply(otherArgs, args);
                    return lodashFunc.apply(lodash, otherArgs);
                };
                if (useLazy) {
                    var wrapper = onlyLazy ? value : new LazyWrapper(this), result = func.apply(wrapper, args);
                    if (!retUnwrapped && (isHybrid || result.__actions__)) {
                        var actions = result.__actions__ || (result.__actions__ = []);
                        actions.push({
                            func: thru,
                            args: [ interceptor ],
                            thisArg: lodash
                        });
                    }
                    return new LodashWrapper(result, chainAll);
                }
                return this.thru(interceptor);
            };
        });
        arrayEach([ "concat", "join", "pop", "push", "replace", "shift", "sort", "splice", "split", "unshift" ], function(methodName) {
            var protoFunc = (/^(?:replace|split)$/.test(methodName) ? stringProto : arrayProto)[methodName], chainName = /^(?:push|sort|unshift)$/.test(methodName) ? "tap" : "thru", fixObjects = !support.spliceObjects && /^(?:pop|shift|splice)$/.test(methodName), retUnwrapped = /^(?:join|pop|replace|shift)$/.test(methodName);
            var func = !fixObjects ? protoFunc : function() {
                var result = protoFunc.apply(this, arguments);
                if (this.length === 0) {
                    delete this[0];
                }
                return result;
            };
            lodash.prototype[methodName] = function() {
                var args = arguments;
                if (retUnwrapped && !this.__chain__) {
                    return func.apply(this.value(), args);
                }
                return this[chainName](function(value) {
                    return func.apply(value, args);
                });
            };
        });
        baseForOwn(LazyWrapper.prototype, function(func, methodName) {
            var lodashFunc = lodash[methodName];
            if (lodashFunc) {
                var key = lodashFunc.name, names = realNames[key] || (realNames[key] = []);
                names.push({
                    name: methodName,
                    func: lodashFunc
                });
            }
        });
        realNames[createHybridWrapper(null, BIND_KEY_FLAG).name] = [ {
            name: "wrapper",
            func: null
        } ];
        LazyWrapper.prototype.clone = lazyClone;
        LazyWrapper.prototype.reverse = lazyReverse;
        LazyWrapper.prototype.value = lazyValue;
        lodash.prototype.chain = wrapperChain;
        lodash.prototype.commit = wrapperCommit;
        lodash.prototype.plant = wrapperPlant;
        lodash.prototype.reverse = wrapperReverse;
        lodash.prototype.toString = wrapperToString;
        lodash.prototype.run = lodash.prototype.toJSON = lodash.prototype.valueOf = lodash.prototype.value = wrapperValue;
        lodash.prototype.collect = lodash.prototype.map;
        lodash.prototype.head = lodash.prototype.first;
        lodash.prototype.select = lodash.prototype.filter;
        lodash.prototype.tail = lodash.prototype.rest;
        return lodash;
    }
    var _ = runInContext();
    if (typeof define == "function" && typeof define.amd == "object" && define.amd) {
        root._ = _;
        define(function() {
            return _;
        });
    } else if (freeExports && freeModule) {
        if (moduleExports) {
            (freeModule.exports = _)._ = _;
        } else {
            freeExports._ = _;
        }
    } else {
        root._ = _;
    }
}).call(this);

(function(global, factory) {
    typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : global.moment = factory();
})(this, function() {
    "use strict";
    var hookCallback;
    function utils_hooks__hooks() {
        return hookCallback.apply(null, arguments);
    }
    function setHookCallback(callback) {
        hookCallback = callback;
    }
    function isArray(input) {
        return Object.prototype.toString.call(input) === "[object Array]";
    }
    function isDate(input) {
        return input instanceof Date || Object.prototype.toString.call(input) === "[object Date]";
    }
    function map(arr, fn) {
        var res = [], i;
        for (i = 0; i < arr.length; ++i) {
            res.push(fn(arr[i], i));
        }
        return res;
    }
    function hasOwnProp(a, b) {
        return Object.prototype.hasOwnProperty.call(a, b);
    }
    function extend(a, b) {
        for (var i in b) {
            if (hasOwnProp(b, i)) {
                a[i] = b[i];
            }
        }
        if (hasOwnProp(b, "toString")) {
            a.toString = b.toString;
        }
        if (hasOwnProp(b, "valueOf")) {
            a.valueOf = b.valueOf;
        }
        return a;
    }
    function create_utc__createUTC(input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, true).utc();
    }
    function defaultParsingFlags() {
        return {
            empty: false,
            unusedTokens: [],
            unusedInput: [],
            overflow: -2,
            charsLeftOver: 0,
            nullInput: false,
            invalidMonth: null,
            invalidFormat: false,
            userInvalidated: false,
            iso: false
        };
    }
    function getParsingFlags(m) {
        if (m._pf == null) {
            m._pf = defaultParsingFlags();
        }
        return m._pf;
    }
    function valid__isValid(m) {
        if (m._isValid == null) {
            var flags = getParsingFlags(m);
            m._isValid = !isNaN(m._d.getTime()) && flags.overflow < 0 && !flags.empty && !flags.invalidMonth && !flags.nullInput && !flags.invalidFormat && !flags.userInvalidated;
            if (m._strict) {
                m._isValid = m._isValid && flags.charsLeftOver === 0 && flags.unusedTokens.length === 0 && flags.bigHour === undefined;
            }
        }
        return m._isValid;
    }
    function valid__createInvalid(flags) {
        var m = create_utc__createUTC(NaN);
        if (flags != null) {
            extend(getParsingFlags(m), flags);
        } else {
            getParsingFlags(m).userInvalidated = true;
        }
        return m;
    }
    var momentProperties = utils_hooks__hooks.momentProperties = [];
    function copyConfig(to, from) {
        var i, prop, val;
        if (typeof from._isAMomentObject !== "undefined") {
            to._isAMomentObject = from._isAMomentObject;
        }
        if (typeof from._i !== "undefined") {
            to._i = from._i;
        }
        if (typeof from._f !== "undefined") {
            to._f = from._f;
        }
        if (typeof from._l !== "undefined") {
            to._l = from._l;
        }
        if (typeof from._strict !== "undefined") {
            to._strict = from._strict;
        }
        if (typeof from._tzm !== "undefined") {
            to._tzm = from._tzm;
        }
        if (typeof from._isUTC !== "undefined") {
            to._isUTC = from._isUTC;
        }
        if (typeof from._offset !== "undefined") {
            to._offset = from._offset;
        }
        if (typeof from._pf !== "undefined") {
            to._pf = getParsingFlags(from);
        }
        if (typeof from._locale !== "undefined") {
            to._locale = from._locale;
        }
        if (momentProperties.length > 0) {
            for (i in momentProperties) {
                prop = momentProperties[i];
                val = from[prop];
                if (typeof val !== "undefined") {
                    to[prop] = val;
                }
            }
        }
        return to;
    }
    var updateInProgress = false;
    function Moment(config) {
        copyConfig(this, config);
        this._d = new Date(+config._d);
        if (updateInProgress === false) {
            updateInProgress = true;
            utils_hooks__hooks.updateOffset(this);
            updateInProgress = false;
        }
    }
    function isMoment(obj) {
        return obj instanceof Moment || obj != null && obj._isAMomentObject != null;
    }
    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion, value = 0;
        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            if (coercedNumber >= 0) {
                value = Math.floor(coercedNumber);
            } else {
                value = Math.ceil(coercedNumber);
            }
        }
        return value;
    }
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length), lengthDiff = Math.abs(array1.length - array2.length), diffs = 0, i;
        for (i = 0; i < len; i++) {
            if (dontConvert && array1[i] !== array2[i] || !dontConvert && toInt(array1[i]) !== toInt(array2[i])) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }
    function Locale() {}
    var locales = {};
    var globalLocale;
    function normalizeLocale(key) {
        return key ? key.toLowerCase().replace("_", "-") : key;
    }
    function chooseLocale(names) {
        var i = 0, j, next, locale, split;
        while (i < names.length) {
            split = normalizeLocale(names[i]).split("-");
            j = split.length;
            next = normalizeLocale(names[i + 1]);
            next = next ? next.split("-") : null;
            while (j > 0) {
                locale = loadLocale(split.slice(0, j).join("-"));
                if (locale) {
                    return locale;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    break;
                }
                j--;
            }
            i++;
        }
        return null;
    }
    function loadLocale(name) {
        var oldLocale = null;
        if (!locales[name] && typeof module !== "undefined" && module && module.exports) {
            try {
                oldLocale = globalLocale._abbr;
                require("./locale/" + name);
                locale_locales__getSetGlobalLocale(oldLocale);
            } catch (e) {}
        }
        return locales[name];
    }
    function locale_locales__getSetGlobalLocale(key, values) {
        var data;
        if (key) {
            if (typeof values === "undefined") {
                data = locale_locales__getLocale(key);
            } else {
                data = defineLocale(key, values);
            }
            if (data) {
                globalLocale = data;
            }
        }
        return globalLocale._abbr;
    }
    function defineLocale(name, values) {
        if (values !== null) {
            values.abbr = name;
            if (!locales[name]) {
                locales[name] = new Locale();
            }
            locales[name].set(values);
            locale_locales__getSetGlobalLocale(name);
            return locales[name];
        } else {
            delete locales[name];
            return null;
        }
    }
    function locale_locales__getLocale(key) {
        var locale;
        if (key && key._locale && key._locale._abbr) {
            key = key._locale._abbr;
        }
        if (!key) {
            return globalLocale;
        }
        if (!isArray(key)) {
            locale = loadLocale(key);
            if (locale) {
                return locale;
            }
            key = [ key ];
        }
        return chooseLocale(key);
    }
    var aliases = {};
    function addUnitAlias(unit, shorthand) {
        var lowerCase = unit.toLowerCase();
        aliases[lowerCase] = aliases[lowerCase + "s"] = aliases[shorthand] = unit;
    }
    function normalizeUnits(units) {
        return typeof units === "string" ? aliases[units] || aliases[units.toLowerCase()] : undefined;
    }
    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {}, normalizedProp, prop;
        for (prop in inputObject) {
            if (hasOwnProp(inputObject, prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }
        return normalizedInput;
    }
    function makeGetSet(unit, keepTime) {
        return function(value) {
            if (value != null) {
                get_set__set(this, unit, value);
                utils_hooks__hooks.updateOffset(this, keepTime);
                return this;
            } else {
                return get_set__get(this, unit);
            }
        };
    }
    function get_set__get(mom, unit) {
        return mom._d["get" + (mom._isUTC ? "UTC" : "") + unit]();
    }
    function get_set__set(mom, unit, value) {
        return mom._d["set" + (mom._isUTC ? "UTC" : "") + unit](value);
    }
    function getSet(units, value) {
        var unit;
        if (typeof units === "object") {
            for (unit in units) {
                this.set(unit, units[unit]);
            }
        } else {
            units = normalizeUnits(units);
            if (typeof this[units] === "function") {
                return this[units](value);
            }
        }
        return this;
    }
    function zeroFill(number, targetLength, forceSign) {
        var output = "" + Math.abs(number), sign = number >= 0;
        while (output.length < targetLength) {
            output = "0" + output;
        }
        return (sign ? forceSign ? "+" : "" : "-") + output;
    }
    var formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|x|X|zz?|ZZ?|.)/g;
    var localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;
    var formatFunctions = {};
    var formatTokenFunctions = {};
    function addFormatToken(token, padded, ordinal, callback) {
        var func = callback;
        if (typeof callback === "string") {
            func = function() {
                return this[callback]();
            };
        }
        if (token) {
            formatTokenFunctions[token] = func;
        }
        if (padded) {
            formatTokenFunctions[padded[0]] = function() {
                return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
            };
        }
        if (ordinal) {
            formatTokenFunctions[ordinal] = function() {
                return this.localeData().ordinal(func.apply(this, arguments), token);
            };
        }
    }
    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, "");
        }
        return input.replace(/\\/g, "");
    }
    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;
        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }
        return function(mom) {
            var output = "";
            for (i = 0; i < length; i++) {
                output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }
    function formatMoment(m, format) {
        if (!m.isValid()) {
            return m.localeData().invalidDate();
        }
        format = expandFormat(format, m.localeData());
        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }
        return formatFunctions[format](m);
    }
    function expandFormat(format, locale) {
        var i = 5;
        function replaceLongDateFormatTokens(input) {
            return locale.longDateFormat(input) || input;
        }
        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }
        return format;
    }
    var match1 = /\d/;
    var match2 = /\d\d/;
    var match3 = /\d{3}/;
    var match4 = /\d{4}/;
    var match6 = /[+-]?\d{6}/;
    var match1to2 = /\d\d?/;
    var match1to3 = /\d{1,3}/;
    var match1to4 = /\d{1,4}/;
    var match1to6 = /[+-]?\d{1,6}/;
    var matchUnsigned = /\d+/;
    var matchSigned = /[+-]?\d+/;
    var matchOffset = /Z|[+-]\d\d:?\d\d/gi;
    var matchTimestamp = /[+-]?\d+(\.\d{1,3})?/;
    var matchWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i;
    var regexes = {};
    function addRegexToken(token, regex, strictRegex) {
        regexes[token] = typeof regex === "function" ? regex : function(isStrict) {
            return isStrict && strictRegex ? strictRegex : regex;
        };
    }
    function getParseRegexForToken(token, config) {
        if (!hasOwnProp(regexes, token)) {
            return new RegExp(unescapeFormat(token));
        }
        return regexes[token](config._strict, config._locale);
    }
    function unescapeFormat(s) {
        return s.replace("\\", "").replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function(matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        }).replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    }
    var tokens = {};
    function addParseToken(token, callback) {
        var i, func = callback;
        if (typeof token === "string") {
            token = [ token ];
        }
        if (typeof callback === "number") {
            func = function(input, array) {
                array[callback] = toInt(input);
            };
        }
        for (i = 0; i < token.length; i++) {
            tokens[token[i]] = func;
        }
    }
    function addWeekParseToken(token, callback) {
        addParseToken(token, function(input, array, config, token) {
            config._w = config._w || {};
            callback(input, config._w, config, token);
        });
    }
    function addTimeToArrayFromToken(token, input, config) {
        if (input != null && hasOwnProp(tokens, token)) {
            tokens[token](input, config._a, config, token);
        }
    }
    var YEAR = 0;
    var MONTH = 1;
    var DATE = 2;
    var HOUR = 3;
    var MINUTE = 4;
    var SECOND = 5;
    var MILLISECOND = 6;
    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }
    addFormatToken("M", [ "MM", 2 ], "Mo", function() {
        return this.month() + 1;
    });
    addFormatToken("MMM", 0, 0, function(format) {
        return this.localeData().monthsShort(this, format);
    });
    addFormatToken("MMMM", 0, 0, function(format) {
        return this.localeData().months(this, format);
    });
    addUnitAlias("month", "M");
    addRegexToken("M", match1to2);
    addRegexToken("MM", match1to2, match2);
    addRegexToken("MMM", matchWord);
    addRegexToken("MMMM", matchWord);
    addParseToken([ "M", "MM" ], function(input, array) {
        array[MONTH] = toInt(input) - 1;
    });
    addParseToken([ "MMM", "MMMM" ], function(input, array, config, token) {
        var month = config._locale.monthsParse(input, token, config._strict);
        if (month != null) {
            array[MONTH] = month;
        } else {
            getParsingFlags(config).invalidMonth = input;
        }
    });
    var defaultLocaleMonths = "January_February_March_April_May_June_July_August_September_October_November_December".split("_");
    function localeMonths(m) {
        return this._months[m.month()];
    }
    var defaultLocaleMonthsShort = "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_");
    function localeMonthsShort(m) {
        return this._monthsShort[m.month()];
    }
    function localeMonthsParse(monthName, format, strict) {
        var i, mom, regex;
        if (!this._monthsParse) {
            this._monthsParse = [];
            this._longMonthsParse = [];
            this._shortMonthsParse = [];
        }
        for (i = 0; i < 12; i++) {
            mom = create_utc__createUTC([ 2e3, i ]);
            if (strict && !this._longMonthsParse[i]) {
                this._longMonthsParse[i] = new RegExp("^" + this.months(mom, "").replace(".", "") + "$", "i");
                this._shortMonthsParse[i] = new RegExp("^" + this.monthsShort(mom, "").replace(".", "") + "$", "i");
            }
            if (!strict && !this._monthsParse[i]) {
                regex = "^" + this.months(mom, "") + "|^" + this.monthsShort(mom, "");
                this._monthsParse[i] = new RegExp(regex.replace(".", ""), "i");
            }
            if (strict && format === "MMMM" && this._longMonthsParse[i].test(monthName)) {
                return i;
            } else if (strict && format === "MMM" && this._shortMonthsParse[i].test(monthName)) {
                return i;
            } else if (!strict && this._monthsParse[i].test(monthName)) {
                return i;
            }
        }
    }
    function setMonth(mom, value) {
        var dayOfMonth;
        if (typeof value === "string") {
            value = mom.localeData().monthsParse(value);
            if (typeof value !== "number") {
                return mom;
            }
        }
        dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
        mom._d["set" + (mom._isUTC ? "UTC" : "") + "Month"](value, dayOfMonth);
        return mom;
    }
    function getSetMonth(value) {
        if (value != null) {
            setMonth(this, value);
            utils_hooks__hooks.updateOffset(this, true);
            return this;
        } else {
            return get_set__get(this, "Month");
        }
    }
    function getDaysInMonth() {
        return daysInMonth(this.year(), this.month());
    }
    function checkOverflow(m) {
        var overflow;
        var a = m._a;
        if (a && getParsingFlags(m).overflow === -2) {
            overflow = a[MONTH] < 0 || a[MONTH] > 11 ? MONTH : a[DATE] < 1 || a[DATE] > daysInMonth(a[YEAR], a[MONTH]) ? DATE : a[HOUR] < 0 || a[HOUR] > 24 || a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0) ? HOUR : a[MINUTE] < 0 || a[MINUTE] > 59 ? MINUTE : a[SECOND] < 0 || a[SECOND] > 59 ? SECOND : a[MILLISECOND] < 0 || a[MILLISECOND] > 999 ? MILLISECOND : -1;
            if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }
            getParsingFlags(m).overflow = overflow;
        }
        return m;
    }
    function warn(msg) {
        if (utils_hooks__hooks.suppressDeprecationWarnings === false && typeof console !== "undefined" && console.warn) {
            console.warn("Deprecation warning: " + msg);
        }
    }
    function deprecate(msg, fn) {
        var firstTime = true, msgWithStack = msg + "\n" + new Error().stack;
        return extend(function() {
            if (firstTime) {
                warn(msgWithStack);
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }
    var deprecations = {};
    function deprecateSimple(name, msg) {
        if (!deprecations[name]) {
            warn(msg);
            deprecations[name] = true;
        }
    }
    utils_hooks__hooks.suppressDeprecationWarnings = false;
    var from_string__isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;
    var isoDates = [ [ "YYYYYY-MM-DD", /[+-]\d{6}-\d{2}-\d{2}/ ], [ "YYYY-MM-DD", /\d{4}-\d{2}-\d{2}/ ], [ "GGGG-[W]WW-E", /\d{4}-W\d{2}-\d/ ], [ "GGGG-[W]WW", /\d{4}-W\d{2}/ ], [ "YYYY-DDD", /\d{4}-\d{3}/ ] ];
    var isoTimes = [ [ "HH:mm:ss.SSSS", /(T| )\d\d:\d\d:\d\d\.\d+/ ], [ "HH:mm:ss", /(T| )\d\d:\d\d:\d\d/ ], [ "HH:mm", /(T| )\d\d:\d\d/ ], [ "HH", /(T| )\d\d/ ] ];
    var aspNetJsonRegex = /^\/?Date\((\-?\d+)/i;
    function configFromISO(config) {
        var i, l, string = config._i, match = from_string__isoRegex.exec(string);
        if (match) {
            getParsingFlags(config).iso = true;
            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(string)) {
                    config._f = isoDates[i][0] + (match[6] || " ");
                    break;
                }
            }
            for (i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(string)) {
                    config._f += isoTimes[i][0];
                    break;
                }
            }
            if (string.match(matchOffset)) {
                config._f += "Z";
            }
            configFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }
    function configFromString(config) {
        var matched = aspNetJsonRegex.exec(config._i);
        if (matched !== null) {
            config._d = new Date(+matched[1]);
            return;
        }
        configFromISO(config);
        if (config._isValid === false) {
            delete config._isValid;
            utils_hooks__hooks.createFromInputFallback(config);
        }
    }
    utils_hooks__hooks.createFromInputFallback = deprecate("moment construction falls back to js Date. This is " + "discouraged and will be removed in upcoming major " + "release. Please refer to " + "https://github.com/moment/moment/issues/1407 for more info.", function(config) {
        config._d = new Date(config._i + (config._useUTC ? " UTC" : ""));
    });
    function createDate(y, m, d, h, M, s, ms) {
        var date = new Date(y, m, d, h, M, s, ms);
        if (y < 1970) {
            date.setFullYear(y);
        }
        return date;
    }
    function createUTCDate(y) {
        var date = new Date(Date.UTC.apply(null, arguments));
        if (y < 1970) {
            date.setUTCFullYear(y);
        }
        return date;
    }
    addFormatToken(0, [ "YY", 2 ], 0, function() {
        return this.year() % 100;
    });
    addFormatToken(0, [ "YYYY", 4 ], 0, "year");
    addFormatToken(0, [ "YYYYY", 5 ], 0, "year");
    addFormatToken(0, [ "YYYYYY", 6, true ], 0, "year");
    addUnitAlias("year", "y");
    addRegexToken("Y", matchSigned);
    addRegexToken("YY", match1to2, match2);
    addRegexToken("YYYY", match1to4, match4);
    addRegexToken("YYYYY", match1to6, match6);
    addRegexToken("YYYYYY", match1to6, match6);
    addParseToken([ "YYYY", "YYYYY", "YYYYYY" ], YEAR);
    addParseToken("YY", function(input, array) {
        array[YEAR] = utils_hooks__hooks.parseTwoDigitYear(input);
    });
    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }
    function isLeapYear(year) {
        return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
    }
    utils_hooks__hooks.parseTwoDigitYear = function(input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2e3);
    };
    var getSetYear = makeGetSet("FullYear", false);
    function getIsLeapYear() {
        return isLeapYear(this.year());
    }
    addFormatToken("w", [ "ww", 2 ], "wo", "week");
    addFormatToken("W", [ "WW", 2 ], "Wo", "isoWeek");
    addUnitAlias("week", "w");
    addUnitAlias("isoWeek", "W");
    addRegexToken("w", match1to2);
    addRegexToken("ww", match1to2, match2);
    addRegexToken("W", match1to2);
    addRegexToken("WW", match1to2, match2);
    addWeekParseToken([ "w", "ww", "W", "WW" ], function(input, week, config, token) {
        week[token.substr(0, 1)] = toInt(input);
    });
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek, daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(), adjustedMoment;
        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }
        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }
        adjustedMoment = local__createLocal(mom).add(daysToDayOfWeek, "d");
        return {
            week: Math.ceil(adjustedMoment.dayOfYear() / 7),
            year: adjustedMoment.year()
        };
    }
    function localeWeek(mom) {
        return weekOfYear(mom, this._week.dow, this._week.doy).week;
    }
    var defaultLocaleWeek = {
        dow: 0,
        doy: 6
    };
    function localeFirstDayOfWeek() {
        return this._week.dow;
    }
    function localeFirstDayOfYear() {
        return this._week.doy;
    }
    function getSetWeek(input) {
        var week = this.localeData().week(this);
        return input == null ? week : this.add((input - week) * 7, "d");
    }
    function getSetISOWeek(input) {
        var week = weekOfYear(this, 1, 4).week;
        return input == null ? week : this.add((input - week) * 7, "d");
    }
    addFormatToken("DDD", [ "DDDD", 3 ], "DDDo", "dayOfYear");
    addUnitAlias("dayOfYear", "DDD");
    addRegexToken("DDD", match1to3);
    addRegexToken("DDDD", match3);
    addParseToken([ "DDD", "DDDD" ], function(input, array, config) {
        config._dayOfYear = toInt(input);
    });
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
        var d = createUTCDate(year, 0, 1).getUTCDay();
        var daysToAdd;
        var dayOfYear;
        d = d === 0 ? 7 : d;
        weekday = weekday != null ? weekday : firstDayOfWeek;
        daysToAdd = firstDayOfWeek - d + (d > firstDayOfWeekOfYear ? 7 : 0) - (d < firstDayOfWeek ? 7 : 0);
        dayOfYear = 7 * (week - 1) + (weekday - firstDayOfWeek) + daysToAdd + 1;
        return {
            year: dayOfYear > 0 ? year : year - 1,
            dayOfYear: dayOfYear > 0 ? dayOfYear : daysInYear(year - 1) + dayOfYear
        };
    }
    function getSetDayOfYear(input) {
        var dayOfYear = Math.round((this.clone().startOf("day") - this.clone().startOf("year")) / 864e5) + 1;
        return input == null ? dayOfYear : this.add(input - dayOfYear, "d");
    }
    function defaults(a, b, c) {
        if (a != null) {
            return a;
        }
        if (b != null) {
            return b;
        }
        return c;
    }
    function currentDateArray(config) {
        var now = new Date();
        if (config._useUTC) {
            return [ now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() ];
        }
        return [ now.getFullYear(), now.getMonth(), now.getDate() ];
    }
    function configFromArray(config) {
        var i, date, input = [], currentDate, yearToUse;
        if (config._d) {
            return;
        }
        currentDate = currentDateArray(config);
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }
        if (config._dayOfYear) {
            yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);
            if (config._dayOfYear > daysInYear(yearToUse)) {
                getParsingFlags(config)._overflowDayOfYear = true;
            }
            date = createUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }
        for (;i < 7; i++) {
            config._a[i] = input[i] = config._a[i] == null ? i === 2 ? 1 : 0 : config._a[i];
        }
        if (config._a[HOUR] === 24 && config._a[MINUTE] === 0 && config._a[SECOND] === 0 && config._a[MILLISECOND] === 0) {
            config._nextDay = true;
            config._a[HOUR] = 0;
        }
        config._d = (config._useUTC ? createUTCDate : createDate).apply(null, input);
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
        }
        if (config._nextDay) {
            config._a[HOUR] = 24;
        }
    }
    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp;
        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;
            weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(local__createLocal(), 1, 4).year);
            week = defaults(w.W, 1);
            weekday = defaults(w.E, 1);
        } else {
            dow = config._locale._week.dow;
            doy = config._locale._week.doy;
            weekYear = defaults(w.gg, config._a[YEAR], weekOfYear(local__createLocal(), dow, doy).year);
            week = defaults(w.w, 1);
            if (w.d != null) {
                weekday = w.d;
                if (weekday < dow) {
                    ++week;
                }
            } else if (w.e != null) {
                weekday = w.e + dow;
            } else {
                weekday = dow;
            }
        }
        temp = dayOfYearFromWeeks(weekYear, week, weekday, doy, dow);
        config._a[YEAR] = temp.year;
        config._dayOfYear = temp.dayOfYear;
    }
    utils_hooks__hooks.ISO_8601 = function() {};
    function configFromStringAndFormat(config) {
        if (config._f === utils_hooks__hooks.ISO_8601) {
            configFromISO(config);
            return;
        }
        config._a = [];
        getParsingFlags(config).empty = true;
        var string = "" + config._i, i, parsedInput, tokens, token, skipped, stringLength = string.length, totalParsedInputLength = 0;
        tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];
        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    getParsingFlags(config).unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    getParsingFlags(config).empty = false;
                } else {
                    getParsingFlags(config).unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            } else if (config._strict && !parsedInput) {
                getParsingFlags(config).unusedTokens.push(token);
            }
        }
        getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            getParsingFlags(config).unusedInput.push(string);
        }
        if (getParsingFlags(config).bigHour === true && config._a[HOUR] <= 12 && config._a[HOUR] > 0) {
            getParsingFlags(config).bigHour = undefined;
        }
        config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);
        configFromArray(config);
        checkOverflow(config);
    }
    function meridiemFixWrap(locale, hour, meridiem) {
        var isPm;
        if (meridiem == null) {
            return hour;
        }
        if (locale.meridiemHour != null) {
            return locale.meridiemHour(hour, meridiem);
        } else if (locale.isPM != null) {
            isPm = locale.isPM(meridiem);
            if (isPm && hour < 12) {
                hour += 12;
            }
            if (!isPm && hour === 12) {
                hour = 0;
            }
            return hour;
        } else {
            return hour;
        }
    }
    function configFromStringAndArray(config) {
        var tempConfig, bestMoment, scoreToBeat, i, currentScore;
        if (config._f.length === 0) {
            getParsingFlags(config).invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }
        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = copyConfig({}, config);
            if (config._useUTC != null) {
                tempConfig._useUTC = config._useUTC;
            }
            tempConfig._f = config._f[i];
            configFromStringAndFormat(tempConfig);
            if (!valid__isValid(tempConfig)) {
                continue;
            }
            currentScore += getParsingFlags(tempConfig).charsLeftOver;
            currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;
            getParsingFlags(tempConfig).score = currentScore;
            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }
        extend(config, bestMoment || tempConfig);
    }
    function configFromObject(config) {
        if (config._d) {
            return;
        }
        var i = normalizeObjectUnits(config._i);
        config._a = [ i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond ];
        configFromArray(config);
    }
    function createFromConfig(config) {
        var input = config._i, format = config._f, res;
        config._locale = config._locale || locale_locales__getLocale(config._l);
        if (input === null || format === undefined && input === "") {
            return valid__createInvalid({
                nullInput: true
            });
        }
        if (typeof input === "string") {
            config._i = input = config._locale.preparse(input);
        }
        if (isMoment(input)) {
            return new Moment(checkOverflow(input));
        } else if (isArray(format)) {
            configFromStringAndArray(config);
        } else if (format) {
            configFromStringAndFormat(config);
        } else if (isDate(input)) {
            config._d = input;
        } else {
            configFromInput(config);
        }
        res = new Moment(checkOverflow(config));
        if (res._nextDay) {
            res.add(1, "d");
            res._nextDay = undefined;
        }
        return res;
    }
    function configFromInput(config) {
        var input = config._i;
        if (input === undefined) {
            config._d = new Date();
        } else if (isDate(input)) {
            config._d = new Date(+input);
        } else if (typeof input === "string") {
            configFromString(config);
        } else if (isArray(input)) {
            config._a = map(input.slice(0), function(obj) {
                return parseInt(obj, 10);
            });
            configFromArray(config);
        } else if (typeof input === "object") {
            configFromObject(config);
        } else if (typeof input === "number") {
            config._d = new Date(input);
        } else {
            utils_hooks__hooks.createFromInputFallback(config);
        }
    }
    function createLocalOrUTC(input, format, locale, strict, isUTC) {
        var c = {};
        if (typeof locale === "boolean") {
            strict = locale;
            locale = undefined;
        }
        c._isAMomentObject = true;
        c._useUTC = c._isUTC = isUTC;
        c._l = locale;
        c._i = input;
        c._f = format;
        c._strict = strict;
        return createFromConfig(c);
    }
    function local__createLocal(input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, false);
    }
    var prototypeMin = deprecate("moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548", function() {
        var other = local__createLocal.apply(null, arguments);
        return other < this ? this : other;
    });
    var prototypeMax = deprecate("moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548", function() {
        var other = local__createLocal.apply(null, arguments);
        return other > this ? this : other;
    });
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return local__createLocal();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }
    function min() {
        var args = [].slice.call(arguments, 0);
        return pickBy("isBefore", args);
    }
    function max() {
        var args = [].slice.call(arguments, 0);
        return pickBy("isAfter", args);
    }
    function Duration(duration) {
        var normalizedInput = normalizeObjectUnits(duration), years = normalizedInput.year || 0, quarters = normalizedInput.quarter || 0, months = normalizedInput.month || 0, weeks = normalizedInput.week || 0, days = normalizedInput.day || 0, hours = normalizedInput.hour || 0, minutes = normalizedInput.minute || 0, seconds = normalizedInput.second || 0, milliseconds = normalizedInput.millisecond || 0;
        this._milliseconds = +milliseconds + seconds * 1e3 + minutes * 6e4 + hours * 36e5;
        this._days = +days + weeks * 7;
        this._months = +months + quarters * 3 + years * 12;
        this._data = {};
        this._locale = locale_locales__getLocale();
        this._bubble();
    }
    function isDuration(obj) {
        return obj instanceof Duration;
    }
    function offset(token, separator) {
        addFormatToken(token, 0, 0, function() {
            var offset = this.utcOffset();
            var sign = "+";
            if (offset < 0) {
                offset = -offset;
                sign = "-";
            }
            return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~offset % 60, 2);
        });
    }
    offset("Z", ":");
    offset("ZZ", "");
    addRegexToken("Z", matchOffset);
    addRegexToken("ZZ", matchOffset);
    addParseToken([ "Z", "ZZ" ], function(input, array, config) {
        config._useUTC = true;
        config._tzm = offsetFromString(input);
    });
    var chunkOffset = /([\+\-]|\d\d)/gi;
    function offsetFromString(string) {
        var matches = (string || "").match(matchOffset) || [];
        var chunk = matches[matches.length - 1] || [];
        var parts = (chunk + "").match(chunkOffset) || [ "-", 0, 0 ];
        var minutes = +(parts[1] * 60) + toInt(parts[2]);
        return parts[0] === "+" ? minutes : -minutes;
    }
    function cloneWithOffset(input, model) {
        var res, diff;
        if (model._isUTC) {
            res = model.clone();
            diff = (isMoment(input) || isDate(input) ? +input : +local__createLocal(input)) - +res;
            res._d.setTime(+res._d + diff);
            utils_hooks__hooks.updateOffset(res, false);
            return res;
        } else {
            return local__createLocal(input).local();
        }
        return model._isUTC ? local__createLocal(input).zone(model._offset || 0) : local__createLocal(input).local();
    }
    function getDateOffset(m) {
        return -Math.round(m._d.getTimezoneOffset() / 15) * 15;
    }
    utils_hooks__hooks.updateOffset = function() {};
    function getSetOffset(input, keepLocalTime) {
        var offset = this._offset || 0, localAdjust;
        if (input != null) {
            if (typeof input === "string") {
                input = offsetFromString(input);
            }
            if (Math.abs(input) < 16) {
                input = input * 60;
            }
            if (!this._isUTC && keepLocalTime) {
                localAdjust = getDateOffset(this);
            }
            this._offset = input;
            this._isUTC = true;
            if (localAdjust != null) {
                this.add(localAdjust, "m");
            }
            if (offset !== input) {
                if (!keepLocalTime || this._changeInProgress) {
                    add_subtract__addSubtract(this, create__createDuration(input - offset, "m"), 1, false);
                } else if (!this._changeInProgress) {
                    this._changeInProgress = true;
                    utils_hooks__hooks.updateOffset(this, true);
                    this._changeInProgress = null;
                }
            }
            return this;
        } else {
            return this._isUTC ? offset : getDateOffset(this);
        }
    }
    function getSetZone(input, keepLocalTime) {
        if (input != null) {
            if (typeof input !== "string") {
                input = -input;
            }
            this.utcOffset(input, keepLocalTime);
            return this;
        } else {
            return -this.utcOffset();
        }
    }
    function setOffsetToUTC(keepLocalTime) {
        return this.utcOffset(0, keepLocalTime);
    }
    function setOffsetToLocal(keepLocalTime) {
        if (this._isUTC) {
            this.utcOffset(0, keepLocalTime);
            this._isUTC = false;
            if (keepLocalTime) {
                this.subtract(getDateOffset(this), "m");
            }
        }
        return this;
    }
    function setOffsetToParsedOffset() {
        if (this._tzm) {
            this.utcOffset(this._tzm);
        } else if (typeof this._i === "string") {
            this.utcOffset(offsetFromString(this._i));
        }
        return this;
    }
    function hasAlignedHourOffset(input) {
        if (!input) {
            input = 0;
        } else {
            input = local__createLocal(input).utcOffset();
        }
        return (this.utcOffset() - input) % 60 === 0;
    }
    function isDaylightSavingTime() {
        return this.utcOffset() > this.clone().month(0).utcOffset() || this.utcOffset() > this.clone().month(5).utcOffset();
    }
    function isDaylightSavingTimeShifted() {
        if (this._a) {
            var other = this._isUTC ? create_utc__createUTC(this._a) : local__createLocal(this._a);
            return this.isValid() && compareArrays(this._a, other.toArray()) > 0;
        }
        return false;
    }
    function isLocal() {
        return !this._isUTC;
    }
    function isUtcOffset() {
        return this._isUTC;
    }
    function isUtc() {
        return this._isUTC && this._offset === 0;
    }
    var aspNetRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/;
    var create__isoRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/;
    function create__createDuration(input, key) {
        var duration = input, match = null, sign, ret, diffRes;
        if (isDuration(input)) {
            duration = {
                ms: input._milliseconds,
                d: input._days,
                M: input._months
            };
        } else if (typeof input === "number") {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetRegex.exec(input))) {
            sign = match[1] === "-" ? -1 : 1;
            duration = {
                y: 0,
                d: toInt(match[DATE]) * sign,
                h: toInt(match[HOUR]) * sign,
                m: toInt(match[MINUTE]) * sign,
                s: toInt(match[SECOND]) * sign,
                ms: toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = create__isoRegex.exec(input))) {
            sign = match[1] === "-" ? -1 : 1;
            duration = {
                y: parseIso(match[2], sign),
                M: parseIso(match[3], sign),
                d: parseIso(match[4], sign),
                h: parseIso(match[5], sign),
                m: parseIso(match[6], sign),
                s: parseIso(match[7], sign),
                w: parseIso(match[8], sign)
            };
        } else if (duration == null) {
            duration = {};
        } else if (typeof duration === "object" && ("from" in duration || "to" in duration)) {
            diffRes = momentsDifference(local__createLocal(duration.from), local__createLocal(duration.to));
            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }
        ret = new Duration(duration);
        if (isDuration(input) && hasOwnProp(input, "_locale")) {
            ret._locale = input._locale;
        }
        return ret;
    }
    create__createDuration.fn = Duration.prototype;
    function parseIso(inp, sign) {
        var res = inp && parseFloat(inp.replace(",", "."));
        return (isNaN(res) ? 0 : res) * sign;
    }
    function positiveMomentsDifference(base, other) {
        var res = {
            milliseconds: 0,
            months: 0
        };
        res.months = other.month() - base.month() + (other.year() - base.year()) * 12;
        if (base.clone().add(res.months, "M").isAfter(other)) {
            --res.months;
        }
        res.milliseconds = +other - +base.clone().add(res.months, "M");
        return res;
    }
    function momentsDifference(base, other) {
        var res;
        other = cloneWithOffset(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }
        return res;
    }
    function createAdder(direction, name) {
        return function(val, period) {
            var dur, tmp;
            if (period !== null && !isNaN(+period)) {
                deprecateSimple(name, "moment()." + name + "(period, number) is deprecated. Please use moment()." + name + "(number, period).");
                tmp = val;
                val = period;
                period = tmp;
            }
            val = typeof val === "string" ? +val : val;
            dur = create__createDuration(val, period);
            add_subtract__addSubtract(this, dur, direction);
            return this;
        };
    }
    function add_subtract__addSubtract(mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds, days = duration._days, months = duration._months;
        updateOffset = updateOffset == null ? true : updateOffset;
        if (milliseconds) {
            mom._d.setTime(+mom._d + milliseconds * isAdding);
        }
        if (days) {
            get_set__set(mom, "Date", get_set__get(mom, "Date") + days * isAdding);
        }
        if (months) {
            setMonth(mom, get_set__get(mom, "Month") + months * isAdding);
        }
        if (updateOffset) {
            utils_hooks__hooks.updateOffset(mom, days || months);
        }
    }
    var add_subtract__add = createAdder(1, "add");
    var add_subtract__subtract = createAdder(-1, "subtract");
    function moment_calendar__calendar(time) {
        var now = time || local__createLocal(), sod = cloneWithOffset(now, this).startOf("day"), diff = this.diff(sod, "days", true), format = diff < -6 ? "sameElse" : diff < -1 ? "lastWeek" : diff < 0 ? "lastDay" : diff < 1 ? "sameDay" : diff < 2 ? "nextDay" : diff < 7 ? "nextWeek" : "sameElse";
        return this.format(this.localeData().calendar(format, this, local__createLocal(now)));
    }
    function clone() {
        return new Moment(this);
    }
    function isAfter(input, units) {
        var inputMs;
        units = normalizeUnits(typeof units !== "undefined" ? units : "millisecond");
        if (units === "millisecond") {
            input = isMoment(input) ? input : local__createLocal(input);
            return +this > +input;
        } else {
            inputMs = isMoment(input) ? +input : +local__createLocal(input);
            return inputMs < +this.clone().startOf(units);
        }
    }
    function isBefore(input, units) {
        var inputMs;
        units = normalizeUnits(typeof units !== "undefined" ? units : "millisecond");
        if (units === "millisecond") {
            input = isMoment(input) ? input : local__createLocal(input);
            return +this < +input;
        } else {
            inputMs = isMoment(input) ? +input : +local__createLocal(input);
            return +this.clone().endOf(units) < inputMs;
        }
    }
    function isBetween(from, to, units) {
        return this.isAfter(from, units) && this.isBefore(to, units);
    }
    function isSame(input, units) {
        var inputMs;
        units = normalizeUnits(units || "millisecond");
        if (units === "millisecond") {
            input = isMoment(input) ? input : local__createLocal(input);
            return +this === +input;
        } else {
            inputMs = +local__createLocal(input);
            return +this.clone().startOf(units) <= inputMs && inputMs <= +this.clone().endOf(units);
        }
    }
    function absFloor(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }
    function diff(input, units, asFloat) {
        var that = cloneWithOffset(input, this), zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4, delta, output;
        units = normalizeUnits(units);
        if (units === "year" || units === "month" || units === "quarter") {
            output = monthDiff(this, that);
            if (units === "quarter") {
                output = output / 3;
            } else if (units === "year") {
                output = output / 12;
            }
        } else {
            delta = this - that;
            output = units === "second" ? delta / 1e3 : units === "minute" ? delta / 6e4 : units === "hour" ? delta / 36e5 : units === "day" ? (delta - zoneDelta) / 864e5 : units === "week" ? (delta - zoneDelta) / 6048e5 : delta;
        }
        return asFloat ? output : absFloor(output);
    }
    function monthDiff(a, b) {
        var wholeMonthDiff = (b.year() - a.year()) * 12 + (b.month() - a.month()), anchor = a.clone().add(wholeMonthDiff, "months"), anchor2, adjust;
        if (b - anchor < 0) {
            anchor2 = a.clone().add(wholeMonthDiff - 1, "months");
            adjust = (b - anchor) / (anchor - anchor2);
        } else {
            anchor2 = a.clone().add(wholeMonthDiff + 1, "months");
            adjust = (b - anchor) / (anchor2 - anchor);
        }
        return -(wholeMonthDiff + adjust);
    }
    utils_hooks__hooks.defaultFormat = "YYYY-MM-DDTHH:mm:ssZ";
    function toString() {
        return this.clone().locale("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");
    }
    function moment_format__toISOString() {
        var m = this.clone().utc();
        if (0 < m.year() && m.year() <= 9999) {
            if ("function" === typeof Date.prototype.toISOString) {
                return this.toDate().toISOString();
            } else {
                return formatMoment(m, "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]");
            }
        } else {
            return formatMoment(m, "YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]");
        }
    }
    function format(inputString) {
        var output = formatMoment(this, inputString || utils_hooks__hooks.defaultFormat);
        return this.localeData().postformat(output);
    }
    function from(time, withoutSuffix) {
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }
        return create__createDuration({
            to: this,
            from: time
        }).locale(this.locale()).humanize(!withoutSuffix);
    }
    function fromNow(withoutSuffix) {
        return this.from(local__createLocal(), withoutSuffix);
    }
    function to(time, withoutSuffix) {
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }
        return create__createDuration({
            from: this,
            to: time
        }).locale(this.locale()).humanize(!withoutSuffix);
    }
    function toNow(withoutSuffix) {
        return this.to(local__createLocal(), withoutSuffix);
    }
    function locale(key) {
        var newLocaleData;
        if (key === undefined) {
            return this._locale._abbr;
        } else {
            newLocaleData = locale_locales__getLocale(key);
            if (newLocaleData != null) {
                this._locale = newLocaleData;
            }
            return this;
        }
    }
    var lang = deprecate("moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.", function(key) {
        if (key === undefined) {
            return this.localeData();
        } else {
            return this.locale(key);
        }
    });
    function localeData() {
        return this._locale;
    }
    function startOf(units) {
        units = normalizeUnits(units);
        switch (units) {
          case "year":
            this.month(0);

          case "quarter":
          case "month":
            this.date(1);

          case "week":
          case "isoWeek":
          case "day":
            this.hours(0);

          case "hour":
            this.minutes(0);

          case "minute":
            this.seconds(0);

          case "second":
            this.milliseconds(0);
        }
        if (units === "week") {
            this.weekday(0);
        }
        if (units === "isoWeek") {
            this.isoWeekday(1);
        }
        if (units === "quarter") {
            this.month(Math.floor(this.month() / 3) * 3);
        }
        return this;
    }
    function endOf(units) {
        units = normalizeUnits(units);
        if (units === undefined || units === "millisecond") {
            return this;
        }
        return this.startOf(units).add(1, units === "isoWeek" ? "week" : units).subtract(1, "ms");
    }
    function to_type__valueOf() {
        return +this._d - (this._offset || 0) * 6e4;
    }
    function unix() {
        return Math.floor(+this / 1e3);
    }
    function toDate() {
        return this._offset ? new Date(+this) : this._d;
    }
    function toArray() {
        var m = this;
        return [ m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond() ];
    }
    function moment_valid__isValid() {
        return valid__isValid(this);
    }
    function parsingFlags() {
        return extend({}, getParsingFlags(this));
    }
    function invalidAt() {
        return getParsingFlags(this).overflow;
    }
    addFormatToken(0, [ "gg", 2 ], 0, function() {
        return this.weekYear() % 100;
    });
    addFormatToken(0, [ "GG", 2 ], 0, function() {
        return this.isoWeekYear() % 100;
    });
    function addWeekYearFormatToken(token, getter) {
        addFormatToken(0, [ token, token.length ], 0, getter);
    }
    addWeekYearFormatToken("gggg", "weekYear");
    addWeekYearFormatToken("ggggg", "weekYear");
    addWeekYearFormatToken("GGGG", "isoWeekYear");
    addWeekYearFormatToken("GGGGG", "isoWeekYear");
    addUnitAlias("weekYear", "gg");
    addUnitAlias("isoWeekYear", "GG");
    addRegexToken("G", matchSigned);
    addRegexToken("g", matchSigned);
    addRegexToken("GG", match1to2, match2);
    addRegexToken("gg", match1to2, match2);
    addRegexToken("GGGG", match1to4, match4);
    addRegexToken("gggg", match1to4, match4);
    addRegexToken("GGGGG", match1to6, match6);
    addRegexToken("ggggg", match1to6, match6);
    addWeekParseToken([ "gggg", "ggggg", "GGGG", "GGGGG" ], function(input, week, config, token) {
        week[token.substr(0, 2)] = toInt(input);
    });
    addWeekParseToken([ "gg", "GG" ], function(input, week, config, token) {
        week[token] = utils_hooks__hooks.parseTwoDigitYear(input);
    });
    function weeksInYear(year, dow, doy) {
        return weekOfYear(local__createLocal([ year, 11, 31 + dow - doy ]), dow, doy).week;
    }
    function getSetWeekYear(input) {
        var year = weekOfYear(this, this.localeData()._week.dow, this.localeData()._week.doy).year;
        return input == null ? year : this.add(input - year, "y");
    }
    function getSetISOWeekYear(input) {
        var year = weekOfYear(this, 1, 4).year;
        return input == null ? year : this.add(input - year, "y");
    }
    function getISOWeeksInYear() {
        return weeksInYear(this.year(), 1, 4);
    }
    function getWeeksInYear() {
        var weekInfo = this.localeData()._week;
        return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
    }
    addFormatToken("Q", 0, 0, "quarter");
    addUnitAlias("quarter", "Q");
    addRegexToken("Q", match1);
    addParseToken("Q", function(input, array) {
        array[MONTH] = (toInt(input) - 1) * 3;
    });
    function getSetQuarter(input) {
        return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
    }
    addFormatToken("D", [ "DD", 2 ], "Do", "date");
    addUnitAlias("date", "D");
    addRegexToken("D", match1to2);
    addRegexToken("DD", match1to2, match2);
    addRegexToken("Do", function(isStrict, locale) {
        return isStrict ? locale._ordinalParse : locale._ordinalParseLenient;
    });
    addParseToken([ "D", "DD" ], DATE);
    addParseToken("Do", function(input, array) {
        array[DATE] = toInt(input.match(match1to2)[0], 10);
    });
    var getSetDayOfMonth = makeGetSet("Date", true);
    addFormatToken("d", 0, "do", "day");
    addFormatToken("dd", 0, 0, function(format) {
        return this.localeData().weekdaysMin(this, format);
    });
    addFormatToken("ddd", 0, 0, function(format) {
        return this.localeData().weekdaysShort(this, format);
    });
    addFormatToken("dddd", 0, 0, function(format) {
        return this.localeData().weekdays(this, format);
    });
    addFormatToken("e", 0, 0, "weekday");
    addFormatToken("E", 0, 0, "isoWeekday");
    addUnitAlias("day", "d");
    addUnitAlias("weekday", "e");
    addUnitAlias("isoWeekday", "E");
    addRegexToken("d", match1to2);
    addRegexToken("e", match1to2);
    addRegexToken("E", match1to2);
    addRegexToken("dd", matchWord);
    addRegexToken("ddd", matchWord);
    addRegexToken("dddd", matchWord);
    addWeekParseToken([ "dd", "ddd", "dddd" ], function(input, week, config) {
        var weekday = config._locale.weekdaysParse(input);
        if (weekday != null) {
            week.d = weekday;
        } else {
            getParsingFlags(config).invalidWeekday = input;
        }
    });
    addWeekParseToken([ "d", "e", "E" ], function(input, week, config, token) {
        week[token] = toInt(input);
    });
    function parseWeekday(input, locale) {
        if (typeof input === "string") {
            if (!isNaN(input)) {
                input = parseInt(input, 10);
            } else {
                input = locale.weekdaysParse(input);
                if (typeof input !== "number") {
                    return null;
                }
            }
        }
        return input;
    }
    var defaultLocaleWeekdays = "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_");
    function localeWeekdays(m) {
        return this._weekdays[m.day()];
    }
    var defaultLocaleWeekdaysShort = "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_");
    function localeWeekdaysShort(m) {
        return this._weekdaysShort[m.day()];
    }
    var defaultLocaleWeekdaysMin = "Su_Mo_Tu_We_Th_Fr_Sa".split("_");
    function localeWeekdaysMin(m) {
        return this._weekdaysMin[m.day()];
    }
    function localeWeekdaysParse(weekdayName) {
        var i, mom, regex;
        if (!this._weekdaysParse) {
            this._weekdaysParse = [];
        }
        for (i = 0; i < 7; i++) {
            if (!this._weekdaysParse[i]) {
                mom = local__createLocal([ 2e3, 1 ]).day(i);
                regex = "^" + this.weekdays(mom, "") + "|^" + this.weekdaysShort(mom, "") + "|^" + this.weekdaysMin(mom, "");
                this._weekdaysParse[i] = new RegExp(regex.replace(".", ""), "i");
            }
            if (this._weekdaysParse[i].test(weekdayName)) {
                return i;
            }
        }
    }
    function getSetDayOfWeek(input) {
        var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
        if (input != null) {
            input = parseWeekday(input, this.localeData());
            return this.add(input - day, "d");
        } else {
            return day;
        }
    }
    function getSetLocaleDayOfWeek(input) {
        var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
        return input == null ? weekday : this.add(input - weekday, "d");
    }
    function getSetISODayOfWeek(input) {
        return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
    }
    addFormatToken("H", [ "HH", 2 ], 0, "hour");
    addFormatToken("h", [ "hh", 2 ], 0, function() {
        return this.hours() % 12 || 12;
    });
    function meridiem(token, lowercase) {
        addFormatToken(token, 0, 0, function() {
            return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
        });
    }
    meridiem("a", true);
    meridiem("A", false);
    addUnitAlias("hour", "h");
    function matchMeridiem(isStrict, locale) {
        return locale._meridiemParse;
    }
    addRegexToken("a", matchMeridiem);
    addRegexToken("A", matchMeridiem);
    addRegexToken("H", match1to2);
    addRegexToken("h", match1to2);
    addRegexToken("HH", match1to2, match2);
    addRegexToken("hh", match1to2, match2);
    addParseToken([ "H", "HH" ], HOUR);
    addParseToken([ "a", "A" ], function(input, array, config) {
        config._isPm = config._locale.isPM(input);
        config._meridiem = input;
    });
    addParseToken([ "h", "hh" ], function(input, array, config) {
        array[HOUR] = toInt(input);
        getParsingFlags(config).bigHour = true;
    });
    function localeIsPM(input) {
        return (input + "").toLowerCase().charAt(0) === "p";
    }
    var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
    function localeMeridiem(hours, minutes, isLower) {
        if (hours > 11) {
            return isLower ? "pm" : "PM";
        } else {
            return isLower ? "am" : "AM";
        }
    }
    var getSetHour = makeGetSet("Hours", true);
    addFormatToken("m", [ "mm", 2 ], 0, "minute");
    addUnitAlias("minute", "m");
    addRegexToken("m", match1to2);
    addRegexToken("mm", match1to2, match2);
    addParseToken([ "m", "mm" ], MINUTE);
    var getSetMinute = makeGetSet("Minutes", false);
    addFormatToken("s", [ "ss", 2 ], 0, "second");
    addUnitAlias("second", "s");
    addRegexToken("s", match1to2);
    addRegexToken("ss", match1to2, match2);
    addParseToken([ "s", "ss" ], SECOND);
    var getSetSecond = makeGetSet("Seconds", false);
    addFormatToken("S", 0, 0, function() {
        return ~~(this.millisecond() / 100);
    });
    addFormatToken(0, [ "SS", 2 ], 0, function() {
        return ~~(this.millisecond() / 10);
    });
    function millisecond__milliseconds(token) {
        addFormatToken(0, [ token, 3 ], 0, "millisecond");
    }
    millisecond__milliseconds("SSS");
    millisecond__milliseconds("SSSS");
    addUnitAlias("millisecond", "ms");
    addRegexToken("S", match1to3, match1);
    addRegexToken("SS", match1to3, match2);
    addRegexToken("SSS", match1to3, match3);
    addRegexToken("SSSS", matchUnsigned);
    addParseToken([ "S", "SS", "SSS", "SSSS" ], function(input, array) {
        array[MILLISECOND] = toInt(("0." + input) * 1e3);
    });
    var getSetMillisecond = makeGetSet("Milliseconds", false);
    addFormatToken("z", 0, 0, "zoneAbbr");
    addFormatToken("zz", 0, 0, "zoneName");
    function getZoneAbbr() {
        return this._isUTC ? "UTC" : "";
    }
    function getZoneName() {
        return this._isUTC ? "Coordinated Universal Time" : "";
    }
    var momentPrototype__proto = Moment.prototype;
    momentPrototype__proto.add = add_subtract__add;
    momentPrototype__proto.calendar = moment_calendar__calendar;
    momentPrototype__proto.clone = clone;
    momentPrototype__proto.diff = diff;
    momentPrototype__proto.endOf = endOf;
    momentPrototype__proto.format = format;
    momentPrototype__proto.from = from;
    momentPrototype__proto.fromNow = fromNow;
    momentPrototype__proto.to = to;
    momentPrototype__proto.toNow = toNow;
    momentPrototype__proto.get = getSet;
    momentPrototype__proto.invalidAt = invalidAt;
    momentPrototype__proto.isAfter = isAfter;
    momentPrototype__proto.isBefore = isBefore;
    momentPrototype__proto.isBetween = isBetween;
    momentPrototype__proto.isSame = isSame;
    momentPrototype__proto.isValid = moment_valid__isValid;
    momentPrototype__proto.lang = lang;
    momentPrototype__proto.locale = locale;
    momentPrototype__proto.localeData = localeData;
    momentPrototype__proto.max = prototypeMax;
    momentPrototype__proto.min = prototypeMin;
    momentPrototype__proto.parsingFlags = parsingFlags;
    momentPrototype__proto.set = getSet;
    momentPrototype__proto.startOf = startOf;
    momentPrototype__proto.subtract = add_subtract__subtract;
    momentPrototype__proto.toArray = toArray;
    momentPrototype__proto.toDate = toDate;
    momentPrototype__proto.toISOString = moment_format__toISOString;
    momentPrototype__proto.toJSON = moment_format__toISOString;
    momentPrototype__proto.toString = toString;
    momentPrototype__proto.unix = unix;
    momentPrototype__proto.valueOf = to_type__valueOf;
    momentPrototype__proto.year = getSetYear;
    momentPrototype__proto.isLeapYear = getIsLeapYear;
    momentPrototype__proto.weekYear = getSetWeekYear;
    momentPrototype__proto.isoWeekYear = getSetISOWeekYear;
    momentPrototype__proto.quarter = momentPrototype__proto.quarters = getSetQuarter;
    momentPrototype__proto.month = getSetMonth;
    momentPrototype__proto.daysInMonth = getDaysInMonth;
    momentPrototype__proto.week = momentPrototype__proto.weeks = getSetWeek;
    momentPrototype__proto.isoWeek = momentPrototype__proto.isoWeeks = getSetISOWeek;
    momentPrototype__proto.weeksInYear = getWeeksInYear;
    momentPrototype__proto.isoWeeksInYear = getISOWeeksInYear;
    momentPrototype__proto.date = getSetDayOfMonth;
    momentPrototype__proto.day = momentPrototype__proto.days = getSetDayOfWeek;
    momentPrototype__proto.weekday = getSetLocaleDayOfWeek;
    momentPrototype__proto.isoWeekday = getSetISODayOfWeek;
    momentPrototype__proto.dayOfYear = getSetDayOfYear;
    momentPrototype__proto.hour = momentPrototype__proto.hours = getSetHour;
    momentPrototype__proto.minute = momentPrototype__proto.minutes = getSetMinute;
    momentPrototype__proto.second = momentPrototype__proto.seconds = getSetSecond;
    momentPrototype__proto.millisecond = momentPrototype__proto.milliseconds = getSetMillisecond;
    momentPrototype__proto.utcOffset = getSetOffset;
    momentPrototype__proto.utc = setOffsetToUTC;
    momentPrototype__proto.local = setOffsetToLocal;
    momentPrototype__proto.parseZone = setOffsetToParsedOffset;
    momentPrototype__proto.hasAlignedHourOffset = hasAlignedHourOffset;
    momentPrototype__proto.isDST = isDaylightSavingTime;
    momentPrototype__proto.isDSTShifted = isDaylightSavingTimeShifted;
    momentPrototype__proto.isLocal = isLocal;
    momentPrototype__proto.isUtcOffset = isUtcOffset;
    momentPrototype__proto.isUtc = isUtc;
    momentPrototype__proto.isUTC = isUtc;
    momentPrototype__proto.zoneAbbr = getZoneAbbr;
    momentPrototype__proto.zoneName = getZoneName;
    momentPrototype__proto.dates = deprecate("dates accessor is deprecated. Use date instead.", getSetDayOfMonth);
    momentPrototype__proto.months = deprecate("months accessor is deprecated. Use month instead", getSetMonth);
    momentPrototype__proto.years = deprecate("years accessor is deprecated. Use year instead", getSetYear);
    momentPrototype__proto.zone = deprecate("moment().zone is deprecated, use moment().utcOffset instead. https://github.com/moment/moment/issues/1779", getSetZone);
    var momentPrototype = momentPrototype__proto;
    function moment__createUnix(input) {
        return local__createLocal(input * 1e3);
    }
    function moment__createInZone() {
        return local__createLocal.apply(null, arguments).parseZone();
    }
    var defaultCalendar = {
        sameDay: "[Today at] LT",
        nextDay: "[Tomorrow at] LT",
        nextWeek: "dddd [at] LT",
        lastDay: "[Yesterday at] LT",
        lastWeek: "[Last] dddd [at] LT",
        sameElse: "L"
    };
    function locale_calendar__calendar(key, mom, now) {
        var output = this._calendar[key];
        return typeof output === "function" ? output.call(mom, now) : output;
    }
    var defaultLongDateFormat = {
        LTS: "h:mm:ss A",
        LT: "h:mm A",
        L: "MM/DD/YYYY",
        LL: "MMMM D, YYYY",
        LLL: "MMMM D, YYYY LT",
        LLLL: "dddd, MMMM D, YYYY LT"
    };
    function longDateFormat(key) {
        var output = this._longDateFormat[key];
        if (!output && this._longDateFormat[key.toUpperCase()]) {
            output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function(val) {
                return val.slice(1);
            });
            this._longDateFormat[key] = output;
        }
        return output;
    }
    var defaultInvalidDate = "Invalid date";
    function invalidDate() {
        return this._invalidDate;
    }
    var defaultOrdinal = "%d";
    var defaultOrdinalParse = /\d{1,2}/;
    function ordinal(number) {
        return this._ordinal.replace("%d", number);
    }
    function preParsePostFormat(string) {
        return string;
    }
    var defaultRelativeTime = {
        future: "in %s",
        past: "%s ago",
        s: "a few seconds",
        m: "a minute",
        mm: "%d minutes",
        h: "an hour",
        hh: "%d hours",
        d: "a day",
        dd: "%d days",
        M: "a month",
        MM: "%d months",
        y: "a year",
        yy: "%d years"
    };
    function relative__relativeTime(number, withoutSuffix, string, isFuture) {
        var output = this._relativeTime[string];
        return typeof output === "function" ? output(number, withoutSuffix, string, isFuture) : output.replace(/%d/i, number);
    }
    function pastFuture(diff, output) {
        var format = this._relativeTime[diff > 0 ? "future" : "past"];
        return typeof format === "function" ? format(output) : format.replace(/%s/i, output);
    }
    function locale_set__set(config) {
        var prop, i;
        for (i in config) {
            prop = config[i];
            if (typeof prop === "function") {
                this[i] = prop;
            } else {
                this["_" + i] = prop;
            }
        }
        this._ordinalParseLenient = new RegExp(this._ordinalParse.source + "|" + /\d{1,2}/.source);
    }
    var prototype__proto = Locale.prototype;
    prototype__proto._calendar = defaultCalendar;
    prototype__proto.calendar = locale_calendar__calendar;
    prototype__proto._longDateFormat = defaultLongDateFormat;
    prototype__proto.longDateFormat = longDateFormat;
    prototype__proto._invalidDate = defaultInvalidDate;
    prototype__proto.invalidDate = invalidDate;
    prototype__proto._ordinal = defaultOrdinal;
    prototype__proto.ordinal = ordinal;
    prototype__proto._ordinalParse = defaultOrdinalParse;
    prototype__proto.preparse = preParsePostFormat;
    prototype__proto.postformat = preParsePostFormat;
    prototype__proto._relativeTime = defaultRelativeTime;
    prototype__proto.relativeTime = relative__relativeTime;
    prototype__proto.pastFuture = pastFuture;
    prototype__proto.set = locale_set__set;
    prototype__proto.months = localeMonths;
    prototype__proto._months = defaultLocaleMonths;
    prototype__proto.monthsShort = localeMonthsShort;
    prototype__proto._monthsShort = defaultLocaleMonthsShort;
    prototype__proto.monthsParse = localeMonthsParse;
    prototype__proto.week = localeWeek;
    prototype__proto._week = defaultLocaleWeek;
    prototype__proto.firstDayOfYear = localeFirstDayOfYear;
    prototype__proto.firstDayOfWeek = localeFirstDayOfWeek;
    prototype__proto.weekdays = localeWeekdays;
    prototype__proto._weekdays = defaultLocaleWeekdays;
    prototype__proto.weekdaysMin = localeWeekdaysMin;
    prototype__proto._weekdaysMin = defaultLocaleWeekdaysMin;
    prototype__proto.weekdaysShort = localeWeekdaysShort;
    prototype__proto._weekdaysShort = defaultLocaleWeekdaysShort;
    prototype__proto.weekdaysParse = localeWeekdaysParse;
    prototype__proto.isPM = localeIsPM;
    prototype__proto._meridiemParse = defaultLocaleMeridiemParse;
    prototype__proto.meridiem = localeMeridiem;
    function lists__get(format, index, field, setter) {
        var locale = locale_locales__getLocale();
        var utc = create_utc__createUTC().set(setter, index);
        return locale[field](utc, format);
    }
    function list(format, index, field, count, setter) {
        if (typeof format === "number") {
            index = format;
            format = undefined;
        }
        format = format || "";
        if (index != null) {
            return lists__get(format, index, field, setter);
        }
        var i;
        var out = [];
        for (i = 0; i < count; i++) {
            out[i] = lists__get(format, i, field, setter);
        }
        return out;
    }
    function lists__listMonths(format, index) {
        return list(format, index, "months", 12, "month");
    }
    function lists__listMonthsShort(format, index) {
        return list(format, index, "monthsShort", 12, "month");
    }
    function lists__listWeekdays(format, index) {
        return list(format, index, "weekdays", 7, "day");
    }
    function lists__listWeekdaysShort(format, index) {
        return list(format, index, "weekdaysShort", 7, "day");
    }
    function lists__listWeekdaysMin(format, index) {
        return list(format, index, "weekdaysMin", 7, "day");
    }
    locale_locales__getSetGlobalLocale("en", {
        ordinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal: function(number) {
            var b = number % 10, output = toInt(number % 100 / 10) === 1 ? "th" : b === 1 ? "st" : b === 2 ? "nd" : b === 3 ? "rd" : "th";
            return number + output;
        }
    });
    utils_hooks__hooks.lang = deprecate("moment.lang is deprecated. Use moment.locale instead.", locale_locales__getSetGlobalLocale);
    utils_hooks__hooks.langData = deprecate("moment.langData is deprecated. Use moment.localeData instead.", locale_locales__getLocale);
    var mathAbs = Math.abs;
    function duration_abs__abs() {
        var data = this._data;
        this._milliseconds = mathAbs(this._milliseconds);
        this._days = mathAbs(this._days);
        this._months = mathAbs(this._months);
        data.milliseconds = mathAbs(data.milliseconds);
        data.seconds = mathAbs(data.seconds);
        data.minutes = mathAbs(data.minutes);
        data.hours = mathAbs(data.hours);
        data.months = mathAbs(data.months);
        data.years = mathAbs(data.years);
        return this;
    }
    function duration_add_subtract__addSubtract(duration, input, value, direction) {
        var other = create__createDuration(input, value);
        duration._milliseconds += direction * other._milliseconds;
        duration._days += direction * other._days;
        duration._months += direction * other._months;
        return duration._bubble();
    }
    function duration_add_subtract__add(input, value) {
        return duration_add_subtract__addSubtract(this, input, value, 1);
    }
    function duration_add_subtract__subtract(input, value) {
        return duration_add_subtract__addSubtract(this, input, value, -1);
    }
    function bubble() {
        var milliseconds = this._milliseconds;
        var days = this._days;
        var months = this._months;
        var data = this._data;
        var seconds, minutes, hours, years = 0;
        data.milliseconds = milliseconds % 1e3;
        seconds = absFloor(milliseconds / 1e3);
        data.seconds = seconds % 60;
        minutes = absFloor(seconds / 60);
        data.minutes = minutes % 60;
        hours = absFloor(minutes / 60);
        data.hours = hours % 24;
        days += absFloor(hours / 24);
        years = absFloor(daysToYears(days));
        days -= absFloor(yearsToDays(years));
        months += absFloor(days / 30);
        days %= 30;
        years += absFloor(months / 12);
        months %= 12;
        data.days = days;
        data.months = months;
        data.years = years;
        return this;
    }
    function daysToYears(days) {
        return days * 400 / 146097;
    }
    function yearsToDays(years) {
        return years * 146097 / 400;
    }
    function as(units) {
        var days;
        var months;
        var milliseconds = this._milliseconds;
        units = normalizeUnits(units);
        if (units === "month" || units === "year") {
            days = this._days + milliseconds / 864e5;
            months = this._months + daysToYears(days) * 12;
            return units === "month" ? months : months / 12;
        } else {
            days = this._days + Math.round(yearsToDays(this._months / 12));
            switch (units) {
              case "week":
                return days / 7 + milliseconds / 6048e5;

              case "day":
                return days + milliseconds / 864e5;

              case "hour":
                return days * 24 + milliseconds / 36e5;

              case "minute":
                return days * 1440 + milliseconds / 6e4;

              case "second":
                return days * 86400 + milliseconds / 1e3;

              case "millisecond":
                return Math.floor(days * 864e5) + milliseconds;

              default:
                throw new Error("Unknown unit " + units);
            }
        }
    }
    function duration_as__valueOf() {
        return this._milliseconds + this._days * 864e5 + this._months % 12 * 2592e6 + toInt(this._months / 12) * 31536e6;
    }
    function makeAs(alias) {
        return function() {
            return this.as(alias);
        };
    }
    var asMilliseconds = makeAs("ms");
    var asSeconds = makeAs("s");
    var asMinutes = makeAs("m");
    var asHours = makeAs("h");
    var asDays = makeAs("d");
    var asWeeks = makeAs("w");
    var asMonths = makeAs("M");
    var asYears = makeAs("y");
    function duration_get__get(units) {
        units = normalizeUnits(units);
        return this[units + "s"]();
    }
    function makeGetter(name) {
        return function() {
            return this._data[name];
        };
    }
    var duration_get__milliseconds = makeGetter("milliseconds");
    var seconds = makeGetter("seconds");
    var minutes = makeGetter("minutes");
    var hours = makeGetter("hours");
    var days = makeGetter("days");
    var months = makeGetter("months");
    var years = makeGetter("years");
    function weeks() {
        return absFloor(this.days() / 7);
    }
    var round = Math.round;
    var thresholds = {
        s: 45,
        m: 45,
        h: 22,
        d: 26,
        M: 11
    };
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }
    function duration_humanize__relativeTime(posNegDuration, withoutSuffix, locale) {
        var duration = create__createDuration(posNegDuration).abs();
        var seconds = round(duration.as("s"));
        var minutes = round(duration.as("m"));
        var hours = round(duration.as("h"));
        var days = round(duration.as("d"));
        var months = round(duration.as("M"));
        var years = round(duration.as("y"));
        var a = seconds < thresholds.s && [ "s", seconds ] || minutes === 1 && [ "m" ] || minutes < thresholds.m && [ "mm", minutes ] || hours === 1 && [ "h" ] || hours < thresholds.h && [ "hh", hours ] || days === 1 && [ "d" ] || days < thresholds.d && [ "dd", days ] || months === 1 && [ "M" ] || months < thresholds.M && [ "MM", months ] || years === 1 && [ "y" ] || [ "yy", years ];
        a[2] = withoutSuffix;
        a[3] = +posNegDuration > 0;
        a[4] = locale;
        return substituteTimeAgo.apply(null, a);
    }
    function duration_humanize__getSetRelativeTimeThreshold(threshold, limit) {
        if (thresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return thresholds[threshold];
        }
        thresholds[threshold] = limit;
        return true;
    }
    function humanize(withSuffix) {
        var locale = this.localeData();
        var output = duration_humanize__relativeTime(this, !withSuffix, locale);
        if (withSuffix) {
            output = locale.pastFuture(+this, output);
        }
        return locale.postformat(output);
    }
    var iso_string__abs = Math.abs;
    function iso_string__toISOString() {
        var Y = iso_string__abs(this.years());
        var M = iso_string__abs(this.months());
        var D = iso_string__abs(this.days());
        var h = iso_string__abs(this.hours());
        var m = iso_string__abs(this.minutes());
        var s = iso_string__abs(this.seconds() + this.milliseconds() / 1e3);
        var total = this.asSeconds();
        if (!total) {
            return "P0D";
        }
        return (total < 0 ? "-" : "") + "P" + (Y ? Y + "Y" : "") + (M ? M + "M" : "") + (D ? D + "D" : "") + (h || m || s ? "T" : "") + (h ? h + "H" : "") + (m ? m + "M" : "") + (s ? s + "S" : "");
    }
    var duration_prototype__proto = Duration.prototype;
    duration_prototype__proto.abs = duration_abs__abs;
    duration_prototype__proto.add = duration_add_subtract__add;
    duration_prototype__proto.subtract = duration_add_subtract__subtract;
    duration_prototype__proto.as = as;
    duration_prototype__proto.asMilliseconds = asMilliseconds;
    duration_prototype__proto.asSeconds = asSeconds;
    duration_prototype__proto.asMinutes = asMinutes;
    duration_prototype__proto.asHours = asHours;
    duration_prototype__proto.asDays = asDays;
    duration_prototype__proto.asWeeks = asWeeks;
    duration_prototype__proto.asMonths = asMonths;
    duration_prototype__proto.asYears = asYears;
    duration_prototype__proto.valueOf = duration_as__valueOf;
    duration_prototype__proto._bubble = bubble;
    duration_prototype__proto.get = duration_get__get;
    duration_prototype__proto.milliseconds = duration_get__milliseconds;
    duration_prototype__proto.seconds = seconds;
    duration_prototype__proto.minutes = minutes;
    duration_prototype__proto.hours = hours;
    duration_prototype__proto.days = days;
    duration_prototype__proto.weeks = weeks;
    duration_prototype__proto.months = months;
    duration_prototype__proto.years = years;
    duration_prototype__proto.humanize = humanize;
    duration_prototype__proto.toISOString = iso_string__toISOString;
    duration_prototype__proto.toString = iso_string__toISOString;
    duration_prototype__proto.toJSON = iso_string__toISOString;
    duration_prototype__proto.locale = locale;
    duration_prototype__proto.localeData = localeData;
    duration_prototype__proto.toIsoString = deprecate("toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)", iso_string__toISOString);
    duration_prototype__proto.lang = lang;
    addFormatToken("X", 0, 0, "unix");
    addFormatToken("x", 0, 0, "valueOf");
    addRegexToken("x", matchSigned);
    addRegexToken("X", matchTimestamp);
    addParseToken("X", function(input, array, config) {
        config._d = new Date(parseFloat(input, 10) * 1e3);
    });
    addParseToken("x", function(input, array, config) {
        config._d = new Date(toInt(input));
    });
    utils_hooks__hooks.version = "2.10.3";
    setHookCallback(local__createLocal);
    utils_hooks__hooks.fn = momentPrototype;
    utils_hooks__hooks.min = min;
    utils_hooks__hooks.max = max;
    utils_hooks__hooks.utc = create_utc__createUTC;
    utils_hooks__hooks.unix = moment__createUnix;
    utils_hooks__hooks.months = lists__listMonths;
    utils_hooks__hooks.isDate = isDate;
    utils_hooks__hooks.locale = locale_locales__getSetGlobalLocale;
    utils_hooks__hooks.invalid = valid__createInvalid;
    utils_hooks__hooks.duration = create__createDuration;
    utils_hooks__hooks.isMoment = isMoment;
    utils_hooks__hooks.weekdays = lists__listWeekdays;
    utils_hooks__hooks.parseZone = moment__createInZone;
    utils_hooks__hooks.localeData = locale_locales__getLocale;
    utils_hooks__hooks.isDuration = isDuration;
    utils_hooks__hooks.monthsShort = lists__listMonthsShort;
    utils_hooks__hooks.weekdaysMin = lists__listWeekdaysMin;
    utils_hooks__hooks.defineLocale = defineLocale;
    utils_hooks__hooks.weekdaysShort = lists__listWeekdaysShort;
    utils_hooks__hooks.normalizeUnits = normalizeUnits;
    utils_hooks__hooks.relativeTimeThreshold = duration_humanize__getSetRelativeTimeThreshold;
    var _moment = utils_hooks__hooks;
    return _moment;
});

var AppInfo = {
    uuid: "5a91dd88-d877-474d-8c96-d5d03157fc80",
    shortName: "Slab",
    longName: "Slab",
    companyName: "finebyte",
    versionCode: 1,
    versionLabel: "1.0",
    sdkVersion: "3",
    targetPlatforms: [ "aplite", "basalt" ],
    watchapp: {
        watchface: false
    },
    capabilities: [ "configurable" ],
    appKeys: {
        op: 0,
        data: 1
    },
    resources: {
        media: []
    },
    settings: {
        delimiter: 127
    }
};

if (!window.location) {
    window.location = "";
}

var Users = function() {
    var users = [];
    return {
        load: load,
        findById: findById
    };
    function load(rawUsers) {
        rawUsers.forEach(function(user) {
            if (findById(user.id)) {
                console.log("Duplicate user!");
            } else {
                users.push(user);
            }
        });
    }
    function findById(id) {
        return _.findWhere(users, {
            id: id
        });
    }
}();

function Group(data) {
    this.data = data;
}

Group.create = function(data) {
    return new Group(data);
};

Group.serialize = function(groups) {
    var filteredGroups = _.reject(groups, "data.is_archived");
    var serializedGroups = _.invoke(filteredGroups, "serialize");
    serializedGroups.unshift(filteredGroups.length);
    return serializedGroups.join("^");
};

Group.prototype.serialize = function() {
    return [ this.data.id, this.data.name, this.data.unread_count_display ].join("^");
};

function Channel(data) {
    this.data = data;
}

Channel.create = function(data) {
    return new Channel(data);
};

Channel.serialize = function(channels) {
    var filteredChannels = _.filter(channels, "data.is_member");
    var serializedChannels = _.invoke(filteredChannels, "serialize");
    serializedChannels.unshift(filteredChannels.length);
    return serializedChannels.join("^");
};

Channel.prototype.serialize = function() {
    return [ this.data.id, this.data.name, this.data.unread_count_display ].join("^");
};

function Im(data) {
    this.data = data;
}

Im.create = function(data) {
    return new Im(data);
};

Im.serialize = function(ims) {
    var filteredIms = _.filter(ims, "data.is_open");
    var serializedIms = _.invoke(filteredIms, "serialize");
    serializedIms.unshift(filteredIms.length);
    return serializedIms.join("^");
};

Im.prototype.serialize = function() {
    return [ this.data.id, Users.findById(this.data.user).name, this.data.unread_count ].join("^");
};

var accessToken = "xoxp-4851112196-4852600748-4881601620-a7048f";

var channels = [];

var groups = [];

var ims = [];

var DELIM = String.fromCharCode(AppInfo.settings.delimiter);

Pebble.addEventListener("ready", function() {
    rtmStart();
});

Pebble.addEventListener("showConfiguration", function() {
    Pebble.openURL("https://slab-for-pebble.herokuapp.com/");
});

Pebble.addEventListener("webviewclosed", function(event) {
    accessToken = event.response;
    rtmStart();
});

Pebble.addEventListener("appmessage", function(event) {
    var op = event.payload.op;
    var data = event.payload.data;
    var dataArray = data.split(String.fromCharCode(AppInfo.settings.delimiter));
    switch (op) {
      case "MESSAGES":
        {
            switch (dataArray[0]) {
              case "CHANNEL":
                fetchChannelMessages(dataArray[1], function(err, messages) {
                    if (err) {
                        return console.log(err);
                    }
                    sendMessages(dataArray[1], messages, function(err) {
                        if (err) {
                            return console.log(err);
                        }
                    });
                });
                break;
            }
            break;
        }

      default:    }
});

function rtmStart() {
    if (!accessToken) {
        return;
    }
    superagent.post("https://slack.com/api/rtm.start?token=" + accessToken).end(function(err, res) {
        if (err) {
            return console.log(err);
        }
        if (!res.body) {
            return console.log("Could not get a valid response from Slack");
        }
        channels = _.map(res.body.channels, Channel.create);
        groups = _.map(res.body.groups, Group.create);
        ims = _.map(res.body.ims, Im.create);
        Users.load(res.body.users);
        sendInitialState();
        rtmConnect(res.body.url);
    });
}

function rtmConnect(url) {
    var rtmSocket = new WebSocket(url);
    rtmSocket.onmessage = function(event) {
        var data = JSON.parse(event.data);
        switch (data.type) {
          case "message":
            rtmMessage(data);
            break;

          case "user_typing":
          case "presence_change":
            break;

          default:        }
    };
}

function rtmMessage() {}

function sendInitialState() {
    MessageQueue.sendAppMessage({
        op: "CHANNELS",
        data: Channel.serialize(channels)
    }, ack, nack);
    MessageQueue.sendAppMessage({
        op: "GROUPS",
        data: Group.serialize(groups)
    }, ack, nack);
    MessageQueue.sendAppMessage({
        op: "IMS",
        data: Im.serialize(ims)
    }, ack, nack);
}

function fetchChannelMessages(id, callback) {
    superagent.get("https://slack.com/api/channels.history").query({
        token: accessToken,
        channel: id
    }).end(function(err, res) {
        if (err) {
            return callback(err);
        }
        if (!res.body.ok) {
            return callback(new Error("Failed to get channel messages"));
        }
        return callback(null, res.body.messages);
    });
}

function sendMessages(id, messages, callback) {
    var messagesResponse = [ id, Math.min(10, messages.length) ];
    messages.slice(0, 10).forEach(function(message) {
        var user = Users.findById(message.user);
        messagesResponse.push(user ? user.name : message.user);
        messagesResponse.push(moment(parseInt(message.ts, 10)).format("HH:mm"));
        messagesResponse.push(message.text);
    });
    var payload = {
        op: "MESSAGES",
        data: messagesResponse.join(DELIM)
    };
    MessageQueue.sendAppMessage(payload, function() {
        callback();
    }, function() {
        callback(new Error("NACK!"));
    });
}

function ack() {
    console.log("ACK!");
}

function nack() {
    console.log("NACK!");
}