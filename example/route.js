/*
 *
 * Publisher subscriber pattern
 *
 */
"use strict";

var cluster = require('cluster'),
    hare = require('../index.js');

Error.stackTraceLimit = Infinity;
if (cluster.isMaster) {
    for (var i = 0; i < 2; i++) {
        cluster.fork();
    }

    cluster.on('death', function (worker) {
        console.log('worker ' + worker.pid + ' died');
    });

    var i = 0, queue = hare().route("direct_logs");
    var LEVELS = ["debug", "info", "warn", "error", "fatal"];

    setInterval(function () {
        var level = LEVELS[i++ % LEVELS.length];
        queue.publish(level, {hello:level});
    }, 500);


} else {
    ["debug", "info", "warn", "error", "fatal"].forEach(function (level) {
        hare().route("direct_logs", level).durable(false).passive(false).subscribe(function (event) {
            console.log("%d, got message %j for level %s", process.pid, event, level);
        });
    });
}
