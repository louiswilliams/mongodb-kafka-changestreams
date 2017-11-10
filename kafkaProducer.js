"use strict";
var config = require('./config');
var kafka = require('kafka-node');

var partitions = {
    "MSFT": 0,
    "GOOG": 1,
    "FB": 2
}

var watchFilter = {
    $match: {
        operationType: {$in: ['update', 'insert', 'replace']}
    }
}

// Starts producer and listens to changes on the given collection
module.exports = function(collection, callback) {

    let kafkaClient = new kafka.KafkaClient({
        kafkaHost: config.kafka.host
    });
    let producer = new kafka.Producer(kafkaClient);

    producer.on('ready', function() {
        callback();
        console.log('Producer ready');

        // Create change stream
        collection.watch([watchFilter]).on('change', function(c) {

            // Parse data and add fields
            getMessageFromChange(c).then(message => {

                // Ignore unexpected messages
                if (!message) return;

                // Send to Kafka broker
                producer.send([{
                    topic: config.kafka.topic,
                    partition: message.partition,
                    messages: new kafka.KeyedMessage(message.key, JSON.stringify(message.value))
                }], function (err, data) {
                    if (err) console.log(err);
                });

            }).catch(err => {
                console.log("Unable to parse change event: ", err);
            });

        });
    });

    producer.on('error', function(err) {
        callback(err);
    });
}

// Transform chagne event into a kafka message payload
function getMessageFromChange(change) {

    return new Promise((resolve, reject) => {

        // Get symbol from key
        let key = change.documentKey;
        let symbol;
        if (key._id && key._id.symbol) {
            symbol = key._id.symbol;
        } else {
            return reject("_id.symbol not found in documentKey");
        }

        // Map symbol to partition number
        let partition = partitions[symbol];
        if (typeof partition == 'undefined') return reject("Partition not mapped for symbol " + symbol);

        let updatedFields;
        if (change.operationType == 'insert' || change.operationType == 'replace') {
            updatedFields = change.fullDocument;
            return null;
        } else if (change.operationType == 'update') {
            let updateDescription = change.updateDescription;
            if (!updateDescription) {
                return reject("updateDescription not found in change event");
            }
            updatedFields = updateDescription.updatedFields;
        }
        if (!updatedFields) return reject("updateDescription.updatedFields not found in change event");

        // Find the price info in the update document
        let minuteDoc;
        for (let key in updatedFields) {
            if (key.startsWith('hours')) {
                minuteDoc = updatedFields[key];
            }
        }

        if (!minuteDoc) return reject("Could not find price update in document");

        let now = new Date();
        let lag = now.getTime() - new Date(minuteDoc.date).getTime();
        let message = {
            partition: partition,
            key: minuteDoc.date,
            value: {
                symbol: symbol,
                close: minuteDoc.close,
                lag: lag
            }
        }

        resolve(message);

    });

}


