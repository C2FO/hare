"use strict";
var comb = require("comb"),
    when = comb.when,
    Promise = comb.Promise,
    _Options = require("./_options"),
    _GetConnection = require("./_getConnection.js"),
    LOGGER = comb.logger("hare.queue");


function errorHandler(err) {
    if (LOGGER.appenders && LOGGER.appenders.length) {
        LOGGER.error.apply(LOGGER, arguments);
    } else {
        console.error(err.stack || err);
    }
}

return comb.define([_Options, _GetConnection], {
    instance: {

        constructor: function Queue(name) {
            this._super(arguments);
            this.queueName = name || '';
            this.__queue = null;
            this._subscribeOptions = {};
            this.set("exchange", "amq.direct");
        },

        __getQueue: function __getQueue() {
            var queueName = this.queueName;
            var ret = this.__queue || this.getConnection().chain(function connectCb(connection) {
                var ret = new Promise();
                LOGGER.debug("connecting to queue %s with options %4j", queueName, this.options);
                connection.queue(queueName, this.options, function (queue) {
                    queueName = this.queueName = queue.name;
                    LOGGER.debug("connected to queue %s", queue.name);
                    LOGGER.debug("binding to exchange %s, routingKey %s", this.get("exchange"), this.get("routingKey"));
                    queue.bind(this.get("exchange"), this.get("routingKey") || queue.name);
                    this.__queue = queue;
                    ret.callback(queue);
                }.bind(this));
                return ret;
            }.bind(this));
            return when(ret);
        },

        publish: function publish(message, options) {
            var queueName = this.queueName;
            return this.getConnection().chain(function (connection) {
                LOGGER.debug("publishing to %s", queueName);
                connection.publish(queueName, message, options);
            });
        },

        __subscribe: function (queue, listener) {
            var queueName = this.queueName, options = this._options;
            LOGGER.debug("subscribing to %s with options %4j", queueName, options);
            //force done to be invoked
            var done = queue.shift.bind(queue), ack = this.get("ack");
            queue.subscribe(options, function (message) {
                LOGGER.debug("%s got message %j", [queueName, message]);
                if (ack) {
                    if (listener.length === 2) {
                        LOGGER.debug("passing done");
                        listener(message, done);
                    } else {
                        LOGGER.debug("waiting for done");
                        comb.when(listener(message)).chain(function () {
                            LOGGER.debug("%s's listener done", queueName);
                            done();
                        }, function (err) {
                            errorHandler(comb("%s's listener done with error \n%s").format(queueName, err.stack || err));
                            done();
                        });
                    }
                } else {
                    listener(message);
                }

            });
        },

        subscribe: function subscribe(listener) {
            return this.__getQueue().chain(function getQueueCb(queue) {
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
        OPTIONS: ["passive", "durable", "exclusive", "autoDelete", "noDeclare", "args", "closeChannelOnUnsubscribe", "exchange", "routingKey", "ack", "prefetchCount"]
    }
}).as(module);