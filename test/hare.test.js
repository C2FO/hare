var it = require("it"),
    helper = require("./helper"),
    assert = require("assert"),
    hare = require("../index");

var amqp = helper.amqp,
    queue = helper.queue,
    connection = helper.connection,
    exchange = helper.exchange;

it.describe("hare", function (it) {

    it.beforeEach(function () {
        helper.reset();
        hare.clearOptions();
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

    it.describe(".queue", function (it) {
        it.should("allow the creation of a queue", function () {
            return hare().queue().subscribe().then(function () {
                assert.equal(connection.getCallCount("queue"), 1);
                assert.isTrue(connection.calledWith("queue", ["", {exchange: "amq.direct", ack: true}, function () {
                }]));
                assert.equal(queue.getCallCount("subscribe"), 1);
                assert.equal(queue.getCallCount("bind"), 1);
                assert.isTrue(queue.calledWith("bind", ["amq.direct", undefined]));
            });
        });
    });

    it.describe(".workerQueue", function (it) {

        it.should("allow the creation of a workerQueue", function () {
            return hare().workerQueue().subscribe().then(function () {
                assert.equal(connection.getCallCount("queue"), 1);
                assert.equal(queue.getCallCount("subscribe"), 1);
                assert.equal(queue.getCallCount("bind"), 1);
                assert.isTrue(queue.calledWith("bind", ["amq.direct", undefined]));
            });
        });
    });

    it.describe(".pubSub", function (it) {

        it.should("allow the creation of a pubSub", function () {
            return hare().pubSub("my.exchange").subscribe().then(function () {
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

    });

    it.describe(".topic", function (it) {

        it.should("allow the creation of a topic", function () {
            return hare().topic("my.exchange", "hello").subscribe().then(function () {
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

    });

    it.describe(".route", function (it) {

        it.should("allow the creation of a route", function () {
            return hare().route("my.exchange", "hello").subscribe().then(function () {
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
    });

    it.describe(".rpc", function (it) {

        it.should("allow the creation of an rpc client", function () {
            return hare().rpc("rpc_queue").handle().then(function () {
                assert.equal(connection.getCallCount("queue"), 1);
                assert.isTrue(connection.calledWith("queue", ["rpc_queue", {exchange: "amq.direct", ack: true, prefetchCount: 1}, function () {
                }]));
                assert.equal(queue.getCallCount("subscribe"), 1);
                assert.equal(queue.getCallCount("bind"), 1);
                assert.isTrue(queue.calledWith("bind", ["amq.direct", undefined]));
            });
        });


        it.should("allow the creation of an rpc with an exchange", function () {
            return hare().rpc("my.exchange", "hello").handle().then(function () {
                assert.equal(connection.getCallCount("exchange"), 1);
                assert.isTrue(connection.calledWith("exchange", ["my.exchange", {type: "direct"}, function () {
                }]));
                assert.equal(connection.getCallCount("queue"), 1);
                assert.isTrue(connection.calledWith("queue", ["hello", {exchange: "my.exchange", ack: true, prefetchCount: 1}, function () {
                }]));
                assert.equal(queue.getCallCount("subscribe"), 1);
                assert.equal(queue.getCallCount("bind"), 1);
                assert.isTrue(queue.calledWith("bind", ["my.exchange", undefined]));
            });
        });

    });

});

it.run();