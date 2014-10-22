"use strict";
var comb = require("comb"),
    Queue = require("./queue"),
    _Options = require("./_options"),
    _GetConnection = require("./_getConnection"),
    Promise = comb.Promise,
    when = comb.when,
    LOGGER = comb.logger("hare.exchange");

var ExchangeQueue = comb.define(Queue, {

    instance: {

        constructor: function (name, exchange) {
            this._super(arguments);
            this._exchange = exchange;
            this.exchange(exchange.exchangeName);
        },

        publish: function (routingKey, message, opts) {
            var argLength = arguments.length;
            if (argLength === 1) {
                message = routingKey;
                routingKey = this.queueName || this.get("routingKey") || '';
                opts = null;
            } else if (argLength === 2 && !comb.isString(routingKey) && comb.isHash(message)) {
                opts = message;
                message = routingKey;
                routingKey = this.queueName || this.get("routingKey") || '';
            }
            return this._exchange.exchange.chain(function (exchange) {
                LOGGER.debug("publishing to %s %4j", [routingKey, message]);
                var ret = new Promise();
                exchange.publish(routingKey, message, opts).addCallback(ret.callback.bind(ret)).addErrback(ret.errback.bind(ret));
                return ret;
            }.bind(this));
        }
    }

});


return comb.define([_Options, _GetConnection], {
    instance: {

        constructor: function Exchange(name) {
            this._super(arguments);
            this.__exchange = null;
            this.__connectionP = null;
            this.exchangeName = name;
        },

        __createExchange: function __createExchange() {
            var exchangeName = this.exchangeName, self = this;
            var ret = this.__connectionP || (this.__connectionP = this.getConnection().chain(function connectCb(connection) {
                var ret = new Promise();
                LOGGER.debug("connecting to exchange %s with options %4j", exchangeName, self.options);
                connection.exchange(exchangeName, self.options, function (exchange) {
                    LOGGER.debug("connected to exchange %s", exchangeName);
                    self.__exchange = exchange;
                    ret.callback(connection);
                });
                return ret;
            }));
            return when(ret);
        },

        queue: function (name) {
            return new ExchangeQueue(name, this, this.__createExchange.bind(this));
        },

        getters: {
            exchange: function () {
                return when(this.__exchange || this.__createExchange().chain(function () {
                    return this.__exchange;
                }.bind(this)));
            }
        }
    },

    "static": {
        OPTIONS: ["type", "passive", "durable", "comfirm", "autoDelete", "noDeclare", "confirm"]
    }
}).as(module);