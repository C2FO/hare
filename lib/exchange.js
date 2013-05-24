"use strict";
var _ = require("./extended"),
    Queue = require("./queue"),
    _Options = require("./_options"),
    _GetConnection = require("./_getConnection"),
    Promise = _.Promise,
    when = _.when;

var ExchangeQueue = Queue.extend({

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
            } else if (argLength === 2 && !_.isString(routingKey) && _.isHash(message)) {
                opts = message;
                message = routingKey;
                routingKey = this.queueName || this.get("routingKey") || '';
            }
            return this._exchange.get("exchange").then(function (exchange) {
                return exchange.publish(routingKey, message, opts);
            });
        }
    }

});


_.declare([_Options, _GetConnection], {
    instance: {

        constructor: function Exchange(name, getConnectionCb) {
            this._super(arguments);
            this.__exchange = null;
            this.exchangeName = name;
        },

        __createExchange: function __createExchange() {
            var exchangeName = this.exchangeName;
            if (this.__exchange) {
                return _.resolve(this.__exchange);
            }
            return this.getConnection().then(function connectCb(connection) {
                var ret = new Promise();
                connection.exchange(exchangeName, this.get("options"), function (exchange) {
                    this.__exchange = exchange;
                    ret.callback(connection);
                }.bind(this));
                return ret;
            }.bind(this));
        },

        queue: function (name) {
            return new ExchangeQueue(name, this, this.__createExchange.bind(this));
        },

        getters: {
            exchange: function () {
                return this.__createExchange().then(function () {
                    return this.__exchange;
                }.bind(this));
            }
        }
    },

    "static": {
        OPTIONS: ["type", "passive", "durable", "comfirm", "autoDelete", "noDeclare", "confirm"]
    }
}).as(module);