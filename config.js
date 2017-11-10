"use strict";

var Config  = {
    listenPort: 3000,
    connectionString: "mongodb://localhost:27000/market?replicaSet=replset",
    collectionName: "prices",
    dbName: "market",
    kafka: {
        topic: 'market-data',
        host: 'localhost:9092',
        groupPrefix: 'kafka-node-'
    }
}

module.exports = Config;
