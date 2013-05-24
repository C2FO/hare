"use strict";
var _ = require("./extended"),
    when = _.when,
    Promise = _.Promise,
    _Options = require("./_options"),
    _GetConnection = require("./_getConnection.js"),
    ERROR_FORMATTER = _("%s's listener done with error \n%s");


function errorHandler(err) {
    console.error(err.stack || err);
    throw err;
}

return _.declare([_Options, _GetConnection], {
    instance: {

        constructor: function Queue(name) {
            this._super(arguments);
            this.queueName = name || '';
            this.__queue = null;
            this.__queuePromise = null;
            this._subscribeOptions = {};
            this.set("exchange", "amq.direct");
        },

        __getQueue: function __getQueue() {
            var queueName = this.queueName;
            if (!this.__queuePromise) {
                this.__queuePromise = this.getConnection().then(function connectCb(connection) {
                    var ret = new Promise();
                    connection.queue(queueName, this.get("options"), function (queue) {
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

        publish: function publish(message, options) {
            var queueName = this.queueName;
            return this.getConnection().then(function (connection) {
                return connection.publish(queueName, message, options);
            });
        },

        __subscribe: function (queue, listener) {
            var queueName = this.queueName, options = this._options;
            //force done to be invoked
            var done = queue.shift.bind(queue), ack = this.get("ack");
            queue.subscribe(options, function (message) {
                if (ack) {
                    if (listener.length === 2) {
                        listener.apply(null, [message, done].concat(_(arguments).toArray(1).value()));
                    } else {
                        when(listener.apply(null, arguments)).then(function () {
                            done();
                        }, function (err) {
                            errorHandler(ERROR_FORMATTER.format(queueName, err.stack || err).value());
                            done();
                        });
                    }
                } else {
                    listener.apply(null, arguments);
                }

            });
        },

        subscribe: function subscribe(listener) {
            var queueName = this.queueName;
            return this.__getQueue().then(function getQueueCb(queue) {
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