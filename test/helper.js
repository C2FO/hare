var Module = require("module");
var globalRequire = Module.prototype.require,
    _ = require("../lib/extended");


function Stub(proto) {
    var stats = {};

    function addCall(name, cb) {
        return function () {
            if (name in stats) {
                stats[name].push(_(arguments).toArray().value());
            } else {
                stats[name] = [_(arguments).toArray().value()];
            }
            return cb.apply(this, arguments);
        };
    }

    for (var key in proto) {
        proto[key] = addCall(key, proto[key]);
    }

    return _.merge({
        reset: function reset() {
            stats = {};
        },

        calledWith: function (name, args) {
            return stats[name].some(function (called) {
                return JSON.stringify(called) === JSON.stringify(args);
            });
        },

        getCallCount: function (name) {
            return (stats[name] || []).length;
        }
    }, proto);
}

var queueStub;
var QueueStub = function (name) {

    if (!queueStub) {
        queueStub = new Stub({

            bind: function () {
                return 1;
            },
            subscribe: function () {
                return _.resolve();
            },
            shift: function () {
            }

        });
    }
    return queueStub;
};

var exchangeStub;
var ExchangeStub = function (name) {

    if (!exchangeStub) {

        exchangeStub = new Stub({

            publish: function () {
                return _.resolve();
            },

            destroy: function () {
            }

        });
    }
    return exchangeStub;
};

var connectionStub;
var ConnectionStub = function () {

    if (!connectionStub) {

        connectionStub = new Stub({


            on: function (event, cb) {
                if (event === "ready") {
                    cb();
                }
            },

            once: function (event, cb) {
                if (event === "ready") {
                    cb();
                }
            },

            removeListener: function (event, cb) {
            },

            publish: function () {
                return _.resolve();
            },

            queue: function queue(name, opts, cb) {
                if ("function" === typeof opts) {
                    cb = opts;
                }
                return cb(new QueueStub(name));
            },

            exchange: function exchange(name, opts, cb) {
                if ("function" === typeof opts) {
                    cb = opts;
                }
                return cb(new ExchangeStub(name));
            }
        });
    }
    return connectionStub;

};

var amqpStub;
function AmqpStub() {
    if (!amqpStub) {
        amqpStub = new Stub({
            createConnection: function () {
                return new ConnectionStub();
            }
        });
    }
    return amqpStub;
}

exports.amqp = new AmqpStub();
exports.connection = new ConnectionStub();
exports.queue = new QueueStub();
exports.exchange = new ExchangeStub();
exports.reset = function () {
    new AmqpStub().reset();
    new ConnectionStub().reset();
    new QueueStub().reset();
    new ExchangeStub().reset();
};

function _require(name) {
    if (name === "amqp") {
        return new AmqpStub();
    } else {
        return globalRequire.apply(this, arguments);
    }
}

Module.prototype.require = _require;