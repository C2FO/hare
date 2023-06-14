var comb = require("comb"),
    Promise = comb.Promise,
    when = comb.when,
    isHash = comb.isHash,
    uuid = require('uuid'),
    _Options = require("./_options");

_Options.extend({
    instance: {

        constructor: function (rpcQueue, createQueue, createExchange) {
            // specify a name for the reply queue so the name remains the same if amqp reconnects to rabbit
            var recieveQueueName = rpcQueue.queueName + '-rpc-reply-' + uuid.v4();
            this.recieveQueue = createQueue(recieveQueueName).exclusive(true);
            this.rpcQueue = rpcQueue;
            this.createExchange = createExchange;
            this.__requests = {};
            this._super(arguments);
        },

        "set": function set(opt, value) {
            if (isHash(opt)) {
                for (var key in value) {
                    this.set(key, value);
                }
            } else if (this.hasOpt(opt)) {
                this.rpcQueue[opt](value);
            } else {
                this._super(arguments);
            }
            return this;
        },

        "get": function get(opt) {
            if (this.hasOpt(opt)) {
                return this.rpcQueue.get(opt);
            } else {
                return this._super(arguments);
            }
        },

        __subscribeHandler: function () {
            var ret = this.__subscribePromise;
            if (!ret) {
                var requests = this.__requests;
                ret = this.__subscribePromise = this.recieveQueue.ack(false).subscribe(function (msg, headers, deliveryInfo) {
                    var correlationId = deliveryInfo.correlationId;
                    if (correlationId in requests) {
                        var p = requests[correlationId];
                        delete requests[correlationId];
                        if (msg && msg.error) {
                            p.errback(new Error(msg.error));
                        } else {
                            p.callback(msg);
                        }
                    }
                });
            }
            return ret;
        },

        call: function (msg, opts, cb) {
            var queue = this.recieveQueue, rpcQueue = this.rpcQueue, requests = this.__requests;
            if (comb.isFunction(opts)) {
                cb = opts;
                opts = null;
            }
            opts = opts || {};
            return when(queue.queue, this.__subscribeHandler(), rpcQueue.queue).chain(function (q) {
                q = q[0];
                var ret = new Promise(),
                    correlationId = uuid.v4();
                requests[correlationId] = ret;
                rpcQueue.publish(msg, comb.merge({replyTo: q.name, correlationId: correlationId}, opts)).addErrback(ret.errback);
                return ret.promise();
            }).classic(cb);
        },

        handle: function (fn) {
            var handler = fn;
            if (fn.length === 2) {
                handler = comb.wrap(fn);
            }
            var createExchange = this.createExchange;
            return this.rpcQueue.subscribe(function (msg, headers, deliveryInfo) {
                var replyQueue = createExchange().queue();
                return when(handler(msg)).chain(function (res) {
                    return replyQueue.publish(deliveryInfo.replyTo, res, {correlationId: deliveryInfo.correlationId});
                }, function (err) {
                    return replyQueue.publish(deliveryInfo.replyTo, {error: err.stack}, {correlationId: deliveryInfo.correlationId});
                });
            });
        }

    },

    "static": {
        OPTIONS: ["passive", "durable", "exclusive", "autoDelete", "noDeclare", "args", "closeChannelOnUnsubscribe", "exchange", "routingKey", "ack", "prefetchCount"]
    }
}).as(module);