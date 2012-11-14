"use strict";
var _Options = require("./_options"),
    Queue = require("./queue"),
    Exchange = require("./exchange"),
    amqp = require("amqp"),
    comb = require("comb"),
    LOGGER = comb.logger("hare"),
    isHash = comb.isHash,
    Promise = comb.Promise;

var SUBSCRIBE_OPTIONS = {},
    CONNECTION_OPTIONS = {};

function errorHandler(err) {
    if (LOGGER.appenders && LOGGER.appenders.length) {
        LOGGER.error.apply(LOGGER, arguments);
    } else {
        console.error(err.stack || err);
    }
}

var connect = (function connectWrapper() {
    var connectionPromise, connection;

    function ready() {
        LOGGER.debug("connected");
        connection.removeListener("error", connectionError);
        //set up error logging
        connection.on("error", errorHandler);
        connectionPromise.callback(connection);
    }

    function connectionError(err) {
        errorHandler(err);
        connection.removeListener("ready", ready);
        connectionPromise.errback(err);
    }

    return function connect(url, opts) {
        if (!connectionPromise) {
            connectionPromise = new Promise();
            connection = amqp.createConnection(url, opts);
            connection.once('ready', ready);
            connection.once('error', connectionError);
        }
        return connectionPromise;
    };
}());

function end() {
    return connect().chain(function (connection) {
        connection.end();
    });
}


var Hare = comb.define(_Options, {

    instance: {

        _url: null,

        url: function (url) {
            if (isHash(url)) {
                this._url = url;
            } else {
                this._url = {url: url};
            }
            return this;
        },

        "set": function set(opt, value) {
            var options = this._options;
            var opts = options.options || (options.options = {});
            opts[opt] = value;
            return this;
        },

        "get": function get(opt) {
            return this._options.options[opt];
        },

        connect: function () {
            return connect(this._url, this.options);
        },

        exchange: function (name) {
            return new Exchange(name, this.connect.bind(this));
        },

        queue: function queue(name, subscribeOptions) {
            var ret = new Queue(name, this.connect.bind(this)).ack(true);
            comb(subscribeOptions || {}).merge(SUBSCRIBE_OPTIONS).forEach(function configForEach(val, key) {
                ret[key](val);
            });
            return ret;
        },

        pubSub: function pubSub(name, subscribeOptions) {
            var ret = this.exchange(name).type("fanout").queue().exclusive(true);
            comb(subscribeOptions || {}).merge(SUBSCRIBE_OPTIONS).forEach(function configForEach(val, key) {
                ret[key](val);
            });
            return ret;
        },

        topic: function topic(name, routingKey, subscribeOptions) {
            var ret = this.exchange(name).type("topic").queue().exclusive(true).routingKey(routingKey);
            comb(subscribeOptions || {}).forEach(function configForEach(val, key) {
                ret[key](val);
            });
            return ret;
        },

        route: function route(name, routingKey, subscribeOptions) {
            var ret = this.exchange(name, this.connect.bind(this)).type("direct").queue().exclusive(true).routingKey(routingKey);
            comb(subscribeOptions || {}).merge(SUBSCRIBE_OPTIONS).forEach(function configForEach(val, key) {
                ret[key](val);
            });
            return ret;
        },

        workerQueue: function workerQueue(name, subscribeOptions) {
            var ret = this.queue(name).ack(true);
            comb(subscribeOptions || {}).merge(SUBSCRIBE_OPTIONS).forEach(function configForEach(val, key) {
                ret[key](val);
            });
            return ret;
        }
    },

    "static": {
        OPTIONS: ["defaultExchangeName", "reconnect", "reconnectBackoffStrategy",
            "reconnectExponentialLimit", "reconnectExponentialLimit", "reconnectBackoffTime"]
    }

});

function hare(exchange, connectionOpts) {
    var ret = new Hare().defaultExchangeName(exchange || "");
    comb(connectionOpts || {}).merge(CONNECTION_OPTIONS).forEach(function configForEach(val, key) {
        ret[key](val);
    });
    return ret;
}

hare.LOGGER = LOGGER;
hare.CONNECTION_OPTIONS = CONNECTION_OPTIONS;
hare.SUBSCRIBE_OPTIONS = SUBSCRIBE_OPTIONS;

hare.log = function log() {
    comb.logger.configure();
}

hare.noLog = function noLog() {
    LOGGER.level = "off";
    return hare;
};

hare.logLevel = function logLevel(level) {
    LOGGER.level = level;
    return hare;
};

hare.queueOptions = function subsribeOptions(opts) {
    comb.merge(SUBSCRIBE_OPTIONS, opts || {});
    return hare;
};

hare.connectionOptions = function subsribeOptions(opts) {
    comb.merge(CONNECTION_OPTIONS, opts || {});
    return hare;
};

hare.clearOptions = function reset() {
    hare.SUBSCRIBE_OPTIONS = SUBSCRIBE_OPTIONS = {};
    hare.CONNECTION_OPTIONS = CONNECTION_OPTIONS = {};
    return hare;
};

module.exports = hare;
