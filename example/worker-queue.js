/*
 *
 * Publisher subscriber pattern
 *
 */
"use strict";

var cluster = require('cluster'),
    hare = require('../index.js');


if (cluster.isMaster) {
    for (var i = 0; i < 2; i++) {
        cluster.fork();
    }

    cluster.on('death', function (worker) {
        console.log('worker ' + worker.pid + ' died');
    });

    var i = 0, queue = hare().workerQueue("my.queue").durable(false).passive(false);
    setInterval(function () {
        queue.publish({hello:i++});
    }, 500);


} else {
    hare().workerQueue("my.queue").durable(false).passive(false).subscribe(function (event, done) {
        console.log("%d, got message %j", process.pid, event);
        done();
    });
}
