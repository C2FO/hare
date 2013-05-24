"use strict";
var _Options = require("./_options"),
    Queue = require("./queue"),
    Exchange = require("./exchange"),
    amqp = require("amqp"),
    Rpc = require("./rpc"),
    _ = require("./extended"),
    isHash = _.isHash,
    Promise = _.Promise;

var SUBSCRIBE_OPTIONS = {},
    CONNECTION_OPTIONS = {};

var connect = (function connectWrapper() {
    var connectionPromise, connection, isConnected = false;

    function errorHandler(err) {
        console.error(err.stack || err);
        throw err;
    }

    function ready() {
        isConnected = true;
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

    function checkConnected() {
        if (!isConnected) {
            connectionError(new Error("Connection closed prematurely, please check your credentials"));
        }
    }

    return function connect(url, opts) {
        if (!connectionPromise) {
            connectionPromise = new Promise();
            connection = amqp.createConnection(url, opts);
            connection.once('ready', ready);
            connection.once('error', connectionError);
            connection.once("close", checkConnected);
        }
        return connectionPromise;
    };
}());

function end() {
    return connect().chain(function (connection) {
        connection.end();
    });
}


var Hare = _Options.extend({

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
            return connect(this._url, this.get("options"));
        },

        exchange: function (name) {
            return new Exchange(name, this.connect.bind(this));
        },

        queue: function queue(name, subscribeOptions) {
            var ret = new Queue(name, this.connect.bind(this)).ack(true);
            _(subscribeOptions || {}).merge(SUBSCRIBE_OPTIONS).forEach(function configForEach(val, key) {
                ret[key](val);
            });
            return ret;
        },

        pubSub: function pubSub(name, subscribeOptions) {
            var ret = this.exchange(name).type("fanout").queue().exclusive(true);
            _(subscribeOptions || {}).merge(SUBSCRIBE_OPTIONS).forEach(function configForEach(val, key) {
                ret[key](val);
            });
            return ret;
        },

        topic: function topic(name, routingKey, subscribeOptions) {
            var ret = this.exchange(name).type("topic").queue().exclusive(true).routingKey(routingKey);
            _(subscribeOptions || {}).forEach(function configForEach(val, key) {
                ret[key](val);
            });
            return ret;
        },

        route: function route(name, routingKey, subscribeOptions) {
            var ret = this.exchange(name).type("direct").queue().exclusive(true).routingKey(routingKey);
            _(subscribeOptions || {}).merge(SUBSCRIBE_OPTIONS).forEach(function configForEach(val, key) {
                ret[key](val);
            });
            return ret;
        },

        workerQueue: function workerQueue(name, subscribeOptions) {
            var ret = this.queue(name).ack(true);
            _(subscribeOptions || {}).merge(SUBSCRIBE_OPTIONS).forEach(function configForEach(val, key) {
                ret[key](val);
            });
            return ret;
        },

        rpc: function (rpcExchangeName, rpcQueueName, subscribeOptions) {
            var args = _.argsToArray(arguments), rpcQueue = null;
            if (args.length >= 2 && _.isString(rpcExchangeName) && _.isString(rpcQueueName)) {
                rpcQueue = this.exchange(rpcExchangeName).type("direct").queue(rpcQueueName).ack(true).prefetchCount(1);
            } else {
                subscribeOptions = rpcQueueName;
                rpcQueueName = rpcExchangeName;
                rpcQueue = this.queue(rpcQueueName).ack(true).prefetchCount(1);
            }

            var ret = new Rpc(rpcQueue, this.queue.bind(this), this.exchange.bind(this));
            _(subscribeOptions || {}).merge(SUBSCRIBE_OPTIONS).forEach(function configForEach(val, key) {
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
    _(connectionOpts || {}).merge(CONNECTION_OPTIONS).forEach(function configForEach(val, key) {
        ret[key](val);
    });
    return ret;
}

hare.CONNECTION_OPTIONS = CONNECTION_OPTIONS;
hare.SUBSCRIBE_OPTIONS = SUBSCRIBE_OPTIONS;

hare.queueOptions = function subsribeOptions(opts) {
    _.merge(SUBSCRIBE_OPTIONS, opts || {});
    return hare;
};

hare.connectionOptions = function subsribeOptions(opts) {
    _.merge(CONNECTION_OPTIONS, opts || {});
    return hare;
};

hare.clearOptions = function reset() {
    hare.SUBSCRIBE_OPTIONS = SUBSCRIBE_OPTIONS = {};
    hare.CONNECTION_OPTIONS = CONNECTION_OPTIONS = {};
    return hare;
};

module.exports = hare;
