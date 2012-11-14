var it = require("it"),
    helper = require("./helper"),
    assert = require("assert"),
    hare = require("../index");

var amqp = helper.amqp,
    queue = helper.queue,
    connection = helper.connection,
    exchange = helper.exchange;

it.describe("hare",function (it) {

    it.beforeEach(function () {
        helper.reset();
        hare.clearOptions();
    });

    it.should("have a LOGGER", function () {
        assert.isObject(hare.LOGGER);
    });

    it.should("support setting log levels", function () {
        var logger = hare.LOGGER;
        hare.logLevel("TRACE");
        assert.equal(logger.level.name, "TRACE");
    });

    it.should("support turning logging off", function () {
        var logger = hare.LOGGER;
        hare.noLog();
        assert.equal(logger.level.name, "OFF");
    });

    it.should("support setting connection options", function () {
        hare.connectionOptions({url: "amqp://test"});
        assert.deepEqual(hare.CONNECTION_OPTIONS, {url: "amqp://test"});
    });

    it.should("support setting connection options", function () {
        hare.queueOptions({passive: true}).queueOptions({durable: false});
        assert.deepEqual(hare.SUBSCRIBE_OPTIONS, {passive: true, durable: false});
        hare.SUBSCRIBE_OPTIONS = {};
    });

    it.should("set the connection options by default", function () {
        hare.connectionOptions({url: "amqp://test", defaultExchangeName: "amqp.topic"});
        assert.deepEqual(hare()._url, {url: "amqp://test"});
        assert.equal(hare().get("defaultExchangeName"), "amqp.topic");
    });

    it.should("allow connecting", function () {
        hare.connectionOptions({url: "amqp://test", defaultExchangeName: "amqp.topic"});
        hare().connect();
        assert.equal(amqp.getCallCount("createConnection"), 1);
    });

    it.should("allow the creation of a queue", function () {
        return hare().queue().subscribe().chain(function () {
            assert.equal(connection.getCallCount("queue"), 1);
            assert.isTrue(connection.calledWith("queue", ["", {exchange: "amq.direct", ack: true}, function () {
            }]));
            assert.equal(queue.getCallCount("subscribe"), 1);
            assert.equal(queue.getCallCount("bind"), 1);
            assert.isTrue(queue.calledWith("bind", ["amq.direct", undefined]));
        });
    });

    it.should("allow the creation of a workerQueue", function () {
        return hare().workerQueue().subscribe().chain(function () {
            assert.equal(connection.getCallCount("queue"), 1);
            assert.equal(queue.getCallCount("subscribe"), 1);
            assert.equal(queue.getCallCount("bind"), 1);
            assert.isTrue(queue.calledWith("bind", ["amq.direct", undefined]));
        });
    });

    it.should("allow the creation of a pubSub", function () {
        return hare().pubSub("my.exchange").subscribe().chain(function () {
            assert.equal(connection.getCallCount("exchange"), 1);
            assert.isTrue(connection.calledWith("exchange", ["my.exchange", {type: "fanout"}, function () {
            }]));
            assert.equal(connection.getCallCount("queue"), 1);
            assert.isTrue(connection.calledWith("queue", ["", {exchange: "my.exchange", exclusive: true}, function () {
            }]));
            assert.equal(queue.getCallCount("subscribe"), 1);
            assert.equal(queue.getCallCount("bind"), 1);
            assert.isTrue(queue.calledWith("bind", ["my.exchange", undefined]));
        });
    });

    it.should("allow the creation of a topic", function () {
        return hare().topic("my.exchange", "hello").subscribe().chain(function () {
            assert.equal(connection.getCallCount("exchange"), 1);
            assert.isTrue(connection.calledWith("exchange", ["my.exchange", {type: "topic"}, function () {
            }]));
            assert.equal(connection.getCallCount("queue"), 1);
            assert.isTrue(connection.calledWith("queue", ["", {exchange: "my.exchange", exclusive: true, routingKey: "hello"}, function () {
            }]));
            assert.equal(queue.getCallCount("subscribe"), 1);
            assert.equal(queue.getCallCount("bind"), 1);
            assert.isTrue(queue.calledWith("bind", ["my.exchange", "hello"]));
        });
    });

    it.should("allow the creation of a route", function () {
        return hare().route("my.exchange", "hello").subscribe().chain(function () {
            assert.equal(connection.getCallCount("exchange"), 1);
            assert.isTrue(connection.calledWith("exchange", ["my.exchange", {type: "direct"}, function () {
            }]));
            assert.equal(connection.getCallCount("queue"), 1);
            assert.isTrue(connection.calledWith("queue", ["", {exchange: "my.exchange", exclusive: true, routingKey: "hello"}, function () {
            }]));
            assert.equal(queue.getCallCount("subscribe"), 1);
            assert.equal(queue.getCallCount("bind"), 1);
            assert.isTrue(queue.calledWith("bind", ["my.exchange", "hello"]));
        });
    });

}).as(module).run();