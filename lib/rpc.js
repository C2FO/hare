var _ = require("./extended"),
    when = _.when,
    isHash = _.isHash,
    _Options = require("./_options"),
    Queue = require("./queue");

_Options.extend({
    instance: {

        constructor: function (rpcQueue, createQueue, createExchange) {
            this.recieveQueue = createQueue().exclusive(true);
            this.rpcQueue = rpcQueue;
            this.createExchange = createExchange;
            this.__requests = {};
            this._super(arguments);
        },

        "set": function set(opt, value) {
            if (isHash(opt)) {
                _(opt).forEach(function (value, key) {
                    this.set(key, value);
                }, this);
            } else if (_.isIn(opt, this._static.OPTIONS)) {
                this.rpcQueue[opt](value);
            } else {
                this._super(arguments);
            }
            return this;
        },

        "get": function get(opt) {
            if (_.isIn(opt, this._static.OPTIONS)) {
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
                        p.callback(msg);
                    }
                });
            }
            return ret;
        },

        call: function (msg, cb) {
            var queue = this.recieveQueue, rpcQueue = this.rpcQueue, requests = this.__requests;
            return when(queue.get("queue"), this.__subscribeHandler(), rpcQueue.get("queue")).then(function (q) {
                q = q[0];
                var ret = new _.Promise();
                var correlationId = JSON.stringify(msg) + ":" + (new Date() * Math.random());
                requests[correlationId] = ret;
                rpcQueue.publish(msg, {replyTo: q.name, correlationId: correlationId}).addErrback(ret.errback);
                return ret.promise();
            }).classic(cb);
        },

        handle: function (fn) {
            var handler = fn;
            if (fn.length === 2) {
                handler = _.wrap(fn);
            }
            var createExchange = this.createExchange;
            return this.rpcQueue.subscribe(function (msg, headers, deliveryInfo) {
                var replyQueue = createExchange().queue();
                return when(handler(msg)).then(function (res) {
                    return replyQueue.publish(deliveryInfo.replyTo, res, {correlationId: deliveryInfo.correlationId});
                });
            });
        }

    },

    "static": {
        OPTIONS: ["passive", "durable", "exclusive", "autoDelete", "noDeclare", "args", "closeChannelOnUnsubscribe", "exchange", "routingKey", "ack", "prefetchCount"]
    }
}).as(module);