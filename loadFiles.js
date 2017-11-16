"use strict";
let async = require('async');
let dateFormat = require('dateformat');
// let mdb = require(__dirname + '/marketdata/mdb.json');
let msft = require(__dirname + '/marketdata/msft.json');
let goog = require(__dirname + '/marketdata/goog.json');
let fb = require(__dirname + '/marketdata/fb.json');
let stocks = [ msft, goog, fb ];

var cfg = require('./config.js');
let kafkaProducer = require('./kafkaProducer');
let mongoClient = require('mongodb').MongoClient;

// Update interval 
let interval = process.argv[2] || 250;
let numInsertions = 0;
let deltaInsertions = 0;
var lastPrint = new Date();

// connect
mongoClient.connect(cfg.connectionString).then(client => {
    let coll = client.db(cfg.dbName).collection(cfg.collectionName);
    // Remove everything instead of dropping, which could invalidate exisiting change streams
    return new Promise((resolve, reject) => {
        return coll.remove({}, function (err, res) {
            if (err) reject(err)
            else resolve (coll);
        });
    });
}).then(coll => {

    // Insert data for each stock forever
    async.forever(function(nextLoop) {

        // Insert loop for each symbol in parallel
        async.each(stocks, function(s, nextStock) {
            let symbol = s["Meta Data"]["Symbol"];
            let timeSeries = s["Time Series (1min)"];

            let sortedKeys = getSortedKeys(timeSeries);

            // Insert every interval
            async.eachSeries(sortedKeys, function (key, next) {
                millisleep(interval).then(() => {
                    insertData(coll, symbol, key, timeSeries[key], next);
                });
            }, function (err) {
                nextStock(err);
            });
        }, function (err) {
            console.log("Loop done");
            nextLoop(err);
        });
    }, function (err) {
        if (err) console.log(err); 
    });

    setInterval(printInsertions, 1000);

    // Start producer
    kafkaProducer(coll, function (err) {
        if (err) {
            console.log(err);
        }
    });

}).catch(err => {
    console.log(err);
});

// Insert the data in order
function getSortedKeys(doc) {
    let keys = [];
    for (let k in doc) {
        keys.push(k);
    }
    return keys.sort();
}

// Upsert minute data
function insertData(coll, symbol, minuteKey, data, next) {
    let date = new Date();
    let updateKey = dateFormat(date, "'hours'.HH.MM.ss.l");
    let updateDoc = {};
    updateDoc[updateKey] = data;
    updateDoc[updateKey].date = dateFormat(date, "yyyy-mm-dd'T'HH:MM:ss.l");
    let day = dateFormat(date, "yyyy-mm-dd");
    coll.update({
        _id: {
            symbol: symbol,
            day: new Date(day)
        }
    }, {
        $set: updateDoc
    }, { upsert: true }, function (err, res) {
        if (err) { console.log(err); next(err) } else {
            next();
            ++deltaInsertions;
        }
    });
    
}

function printInsertions(){
    let now = new Date();
    let sleeptime = (now.getTime() - lastPrint.getTime()) / 1000.0;
    numInsertions += deltaInsertions;
    console.log("Inserted " + deltaInsertions + " (total " + numInsertions + ") docs in " + sleeptime + " seconds.");
    lastPrint = now;
    deltaInsertions = 0;
}

function millisleep (time) {
      return new Promise((resolve) => setTimeout(resolve, time));
}
