"use strict";
var comb = require("comb"),
    merge = comb.merge,
    when = comb.when,
    Promise = comb.Promise,
    _Options = require("./_options"),
    _GetConnection = require("./_getConnection.js"),
    ERROR_FORMATTER = comb("%s's listener done with error\n");


function errorHandler(err) {
    console.error(err);
    throw err;
}

return comb.define([_Options, _GetConnection], {
    instance: {

        constructor: function Queue(name) {
            this._super(arguments);
            this.queueName = name || '';
            this.__queue = null;
            this.__queuePromise = null;
            this._subscribeOptions = {};
            this.__connection;
            this._defaultExchange = null;
            this.set("exchange", "amq.direct");
        },

        __getQueue: function __getQueue() {
            var queueName = this.queueName, self = this;
            if (!this.__queuePromise) {
                this.__queuePromise = this.getConnection().chain(function connectCb(connection) {
                    var ret = new Promise();
                    connection.queue(queueName, self.options, function (queue) {
                        queueName = self.queueName = queue.name;
                        queue.bind(self.get("exchange"), self.get("routingKey") || queue.name);
                        self.__queue = queue;
                        ret.callback(queue);
                    });
                    return ret;
                });
            }
            return this.__queuePromise;
        },

        __getDefaultExchange: function () {
            var self = this;
            var ret = this.__defaultExchangeP = this.getConnection().chain(function (connection) {
                self.__connection = connection;
                var ret = new Promise();
                connection.exchange(connection.implOptions.defaultExchangeName, {confirm: true}, function (exchange) {
                    self._defaultExchange = exchange;
                    ret.callback(exchange);
                });
                return ret;
            });
            return ret;
        },

        publish: function publish(message, options) {
            var queueName = this.queueName,
                defaultOptions = this.get("publishOptions"),
                ret;
            defaultOptions = comb.isFunction(defaultOptions) ? defaultOptions(options) : (defaultOptions || {});
            if (!this._defaultExchange) {
                if (this.__defaultExchangeP) {
                    return this.__defaultExchangeP.chain(function (exchange) {
                        exchange.publish(queueName, message, merge(defaultOptions, options));
                    });
                } else {
                    ret = this.__getDefaultExchange().chain(function (exchange) {
                        exchange.publish(queueName, message, merge(defaultOptions, options));
                    });
                }
            } else {
                ret = new Promise().callback();
                this._defaultExchange.publish(queueName, message, merge(defaultOptions, options));
            }
            return ret;
        },

        __subscribe: function (queue, listener) {
            if (listener.length === 4) {
                listener = comb.wrap(listener);
            }
            var queueName = this.queueName, options = this._options;
            //force done to be invoked
            var done = queue.shift.bind(queue), ack = this.get("ack");
            queue.subscribe(options, function (message, headers, deliveryInfo) {
                if (ack) {
                    when(listener.call(null, message, headers, deliveryInfo)).chain(function () {
                        done();
                    }, function (err) {
                        done();
                        errorHandler(ERROR_FORMATTER.format(queueName) + err.stack || err);
                    });
                } else {
                    listener.apply(null, arguments);
                }

            });
        },

        subscribe: function subscribe(listener) {
            var self = this;
            return this.__getQueue().chain(function (queue) {
                self.__subscribe(queue, listener);
                return queue;
            });
        },

        getters: {
            queue: function () {
                return this.__getQueue();
            }
        }
    },

    "static": {
        OPTIONS: ["passive", "durable", "exclusive", "autoDelete", "noDeclare", "args", "closeChannelOnUnsubscribe", "exchange", "routingKey", "ack", "prefetchCount", "publishOptions"]
    }
}).as(module);