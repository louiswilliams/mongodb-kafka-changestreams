var express = require('express');
var kafka = require('kafka-node');
var config = require('./config');

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var port = process.argv[2] || config.listenPort;

app.use(express.static('public'))

var consumer = new kafka.ConsumerGroup({
    kafkaHost: config.kafka.host,
    fromOffset: 'latest',
    groupId: config.kafka.groupPrefix + port
   },
  [ config.kafka.topic ]
);

// Stream data on this namespace to any client that connects
var marketNs = io.of('/marketData');
marketNs.on('connection', function(socket) {
    console.log("Accepted socket.io client");
    socket.on('disconnect', function(socket) {
      console.log("Client disconnected");
    });
});

// Start the Kafka consumer to broadcast data to connecting clients
var lastEmits = {};
// Keep a map 
consumer.on('message', function(message) {
    var value = JSON.parse(message.value);
    value.date = message.key;
    var now = new Date().getTime();
    var lastEmit = lastEmits[value.symbol] || 0;
    if (now - lastEmit  >= 1000) {
        marketNs.emit('price', value);
        lastEmits[value.symbol] = now;
    }
});
consumer.on('error', function(message) {
  console.log("Kafka consumer error: " + message);
});

// Serve pages
http.listen(port, function() {
  console.log("Listening on *:" + port);
});

