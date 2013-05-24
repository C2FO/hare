/*
 *
 * Publisher subscriber pattern
 *
 */
"use strict";

var cluster = require('cluster'),
    _ = require("../lib/extended"),
    hare = require('../index.js'),
    rpcClient = hare().rpc("my_queue");//.durable(true).autoDelete(false);

Error.stackTraceLimit = Infinity;
var CALC_TO = 30;
if (cluster.isMaster) {
    for (var i = 0; i < 4; i++) {
        cluster.fork();
    }

    cluster.on('death', function (worker) {
        console.log('worker ' + worker.pid + ' died');
    });

    var nums = [];
    for (i = 1; i < CALC_TO; i++) {
        nums.push(i);
    }
    _(nums).async().map(function (i) {
        console.log("calling for %d", i);
        return rpcClient.call({num: i}).then(function (res) {
            console.log(res);
            return res.fib;
        }, function (err) {
            console.log(err.stack);
        });
    }).then(function (res) {
            console.log(res);
        });


} else {
    var fib = function (num) {
        return num === 0 ? 0 : num === 1 ? 1 : fib(num - 1) + fib(num - 2);
    };
    rpcClient.handle(function (msg) {
        console.log("calculating %d", msg.num);
        return {fib: fib(msg.num)};
    });
}
