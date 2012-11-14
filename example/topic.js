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

    var i = 0,
        queue = hare().topic("topic_logs");
    var LEVELS = ["log.debug", "log.info", "log.warn", "log.error", "log.fatal"];

    setInterval(function () {
        var level = LEVELS[i++ % LEVELS.length];
        queue.publish(level, {hello:level});
    }, 500);


} else {
    ["log.*", "*.*", "log.debug", "log.info", "log.warn", "log.error", "log.fatal"].forEach(function (level) {
        hare().topic("topic_logs", level).durable(false).passive(false).subscribe(function (event) {
            console.log("%d, got message %j for level %s", process.pid, event, level);
        });
    });
}
