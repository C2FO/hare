/*
 *
 * Publisher subscriber pattern
 *
 */
"use strict";

var cluster = require('cluster'),
    comb = require("comb"),
    hare = require('../index.js'),
    rpcClient = hare().rpc("rpc_queue");

var CALC_TO = 45;
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
    comb.async.array(nums).map(function (i) {
        console.log("calling for %d", i);
        return rpcClient.call({num: i}).chain(function (res) {
            return res.fib;
        }, function (err) {
            console.log(err.stack);
        });
    }).chain(function (res) {
        console.log("DONE", res);
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
