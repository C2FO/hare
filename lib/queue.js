"use strict";
var comb = require("comb"),
    merge = comb.merge,
    when = comb.when,
    Promise = comb.Promise,
    _Options = require("./_options"),
    _GetConnection = require("./_getConnection.js"),
    ERROR_FORMATTER = comb("%s's listener done with error \n%s");


function errorHandler(err) {
    console.error(err.stack || err);
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
            var queueName = this.queueName;
            if (!this.__queuePromise) {
                this.__queuePromise = this.getConnection().chain(function connectCb(connection) {
                    var ret = new Promise();
                    connection.queue(queueName, this.options, function (queue) {
                        queueName = this.queueName = queue.name;
                        queue.bind(this.get("exchange"), this.get("routingKey") || queue.name);
                        this.__queue = queue;
                        ret.callback(queue);
                    }.bind(this));
                    return ret;
                }.bind(this));
            }
            return this.__queuePromise;
        },

        __getDefaultExchange: function () {
            var self = this;
            return (this.__defaultExchangeP = this.getConnection().chain(function (connection) {
                self.__connection = connection;
                var ret = new Promise();
                connection.exchange(connection.implOptions.defaultExchangeName, {confirm: true}, function (exchange) {
                    self._defaultExchange = exchange;
                    ret.callback(exchange);
                });
                return ret;
            }));
        },

        publish: function publish(message, options) {
            var queueName = this.queueName,
                defaultOptions = this.get("publishOptions"),
                ret;
            defaultOptions = comb.isFunction(defaultOptions) ? defaultOptions() : (defaultOptions || {});
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
            var queueName = this.queueName, options = this._options;
            //force done to be invoked
            var done = queue.shift.bind(queue), ack = this.get("ack");
            queue.subscribe(options, function (message) {
                if (ack) {
                    if (listener.length >= 2) {
                        listener.apply(null, [message, done].concat(comb.argsToArray(arguments, 1)));
                    } else {
                        when(listener.apply(null, arguments)).chain(function () {
                            done();
                        }, function (err) {
                            errorHandler(ERROR_FORMATTER.format(queueName, err.stack || err));
                            done();
                        });
                    }
                } else {
                    listener.apply(null, arguments);
                }

            });
        },

        subscribe: function subscribe(listener) {
            return this.__getQueue().then(function (queue) {
                this.__subscribe(queue, listener);
            }.bind(this));
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