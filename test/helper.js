var Module = require("module");
var globalRequire = Module.prototype.require,
    comb = require("comb");


function _require(name) {
    if (name === "amqp") {
        return AmqpStub();
    } else {
        return globalRequire.apply(this, arguments);
    }
}

function Stub(proto) {
    var stats = {};

    function addCall(name, cb) {
        return function () {
            if (name in stats) {
                stats[name].push(comb(arguments).toArray());
            } else {
                stats[name] = [comb(arguments).toArray()];
            }
            return cb.apply(this, arguments);
        }
    }

    for (var key in proto) {
        proto[key] = addCall(key, proto[key]);
    }

    return comb.merge({
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
        queueStub = Stub({

            bind: function () {
                return 1;
            },
            subscribe: function () {
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

        exchangeStub = Stub({

            publish: function () {
            },

            destroy: function () {
            }

        })
    }
    return exchangeStub;
};

var connectionStub;
var ConnectionStub = function () {

    if (!connectionStub) {

        connectionStub = Stub({


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
            },

            queue: function queue(name, opts, cb) {
                if ("function" === typeof opts) {
                    cb = opts;
                }
                return cb(QueueStub(name));
            },

            exchange: function exchange(name, opts, cb) {
                if ("function" === typeof opts) {
                    cb = opts;
                }
                return cb(ExchangeStub(name));
            }
        });
    }
    return connectionStub;

};

var amqpStub;
var AmqpStub = function () {
    if (!amqpStub) {
        amqpStub = Stub({
            createConnection: function () {
                return ConnectionStub();
            }
        });
    }
    return amqpStub;
};

exports.amqp = AmqpStub();
exports.connection = ConnectionStub();
exports.queue = QueueStub();
exports.exchange = ExchangeStub();
exports.reset = function () {
    AmqpStub().reset();
    ConnectionStub().reset();
    QueueStub().reset();
    ExchangeStub().reset();
}

Module.prototype.require = _require;