[![Build Status](https://travis-ci.org/C2FO/hare.png)](https://travis-ci.org/C2FO/hare)

# Hare

Hare is a wrapper around [amqp](https://github.com/postwait/node-amqp) providing a cleaner chainable API for some of the common patterns.

## Installation

```
npm install hare
```


## Connecting

To connect to your `amqp` server you can pass in your options to `hare`

```javascript
var myHare = hare({url : "amqp://guest:guest@localhost:5672"});

```

Or you can specify through the `connectionOptions` method

```javascript
hare.connectionOptions({url : "amqp://guest:guest@localhost:5672"});

var myHare = hare();

```

### Heartbeat

You may also specify a heartbeat ([See here](http://www.rabbitmq.com/reliability.html))

```
hare({url : "amqp://guest:guest@localhost:5672", heartbeat: 2});

//or

hare({url : "amqp://guest:guest@localhost:5672"}).heartbeat(2);
```

## WorkerQueues

Worker queues allow you to ditribute messages to workers, where only one worker will recieve the message. Allowing for the distribution of resource intensive tasks across a worker pool.

To publish to a worker queue.

```javascript
var queue = myHare.workerQueue("my.queue");

queue.publish({hello : "world"});

```

To create a worker subscribe to the worker queue.

```javascript
myHare.workerQueue("my.queue").subscribe(function(message, done){
	console.log(message);
	//call done to ack the message	
	done();
});
```

To read more about worker queues click [here](http://www.rabbitmq.com/tutorials/tutorial-two-python.html)

## Publish/Subscribe

Publish and Subscribe allows you to broadcast messages to multiple consumers at a time.

To create a pub sub system you can use the `pubSub` method.

```javascript
var queue = myHare.pubSub("my-exchange");

setInterval(function () {
   queue.publish({hello: i++});
}, 500);
```

To subscribe to the topic

```javascript
myHare.pubSub("my-exchange").subscribe(function (event) {
   console.log("%d, got message %j", process.pid, event);
});
```

To read more about publishing and subscribing click [here](http://www.rabbitmq.com/tutorials/tutorial-two-python.html)

## Routing


Routing is similar to `pubSub` except that subscribers can listen to a subset of messages. 

To create a routing system you can use the `route` method.

```javascript
var queue = myHare.route("direct_logs");

var LEVELS = ["debug", "info", "warn", "error", "fatal"];

setInterval(function () {
	var level = LEVELS[i++ % LEVELS.length];
	queue.publish(level, {hello:level});
}, 500);

```

To subscribe to the topics…

```javascript
hare().route("direct_logs", "debug").subscribe(function (event) {
   console.log("%d, got message %j for level %s", process.pid, event, level);
});

```

To read more about routing click [here](http://www.rabbitmq.com/tutorials/tutorial-four-python.html)

## Topics

Topics is similar to routing except that it allows you to subscribe to messages on multiple criteria.

To create a topic queue use the `topic` method.

```javascript
var queue = myHre.topic("topic_logs")
var LEVELS = ["log.debug", "log.info", "log.warn", "log.error", "log.fatal"];

setInterval(function () {
   var level = LEVELS[i++ % LEVELS.length];
   queue.publish(level, {hello:level});
}, 500);
```

To bind to topic yous can use the wildcards:

* `*` (star) can substitute for exactly one word.
* `#` (hash) can substitute for zero or more words.

```javascript
myHare.topic("topic_logs", "log.*").subscribe(function(message){

})
```


Or bind directly.

```javascript
myHare.topic("topic_logs", "log.info").subscribe(function(message){

})
```

To read more about topics click [here](http://www.rabbitmq.com/tutorials/tutorial-five-python.html)

## Creating your own Queue

You may also use the `queue` method to create your own queue if the above patterns do not match your needs.

For example to create a worker queue manually that is durable, and will not auto delete

```javascript
var queue = myHare.queue("name").ack(true).durable(true).autoDelete(false);

queue.publish({hello : "world"});

```

To customize the queue even further you may specify the following options using the chainable api. 

 * `passive()`
 * `durable()`
 * `exclusive()`
 * `autoDelete()`
 * `noDeclare()`
 * `args()`
 * `closeChannelOnUnsubscribe()`
 * `exchange()`
 * `routingKey()`
 * `ack()`
 * `prefetchCount()`
 
 
To read more about the queue options click [here](https://github.com/postwait/node-amqp#queue)

## Creating Exchanges

You may also use the `exchange` method to work with your own exchange.

For example to create a pubsub queue manually you could to the following.

```javascript
var queue = myHare.exchange("name").type("fanout").queue().exclusive(true);

queue.publish({hello : "world"});

```
To customize the exchange even further you may specify the following options using the chainable api. 

 * `passive()`
 * `type()`
 * `durable()`
 * `confirm()`
 * `comfirm()`
 * `autoDelete()`
 * `noDeclare()`

To read more about the queue options click [here](https://github.com/postwait/node-amqp#exchange)

## Logging

`Hare` comes with a logger which is useful for debugging. By default logging is turned off. 

To turn on logging.

```javascript
hare.log();
```


To turn off logging.

```javascript
hare.noLog();
```

Or to set the level

```javascript
//only log error messages
hare.logLevel("error");
```

## Configuring Defaults

You can configure defaults for all queues using the `queueOptions` options.

```javascript
hare.queueOptions({durable : true, passive : false, autoDelete : false});
```

## License


MIT <https://github.com/c2fo/hare/raw/master/LICENSE>

## Meta

* Code: `git clone git://github.com/c2fo/hare.git`
* Website:  <http://c2fo.com> - Twitter: <http://twitter.com/c2fo> - 877.465.4045

