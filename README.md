# MongoDB Change Streams and Apache Kafka

This example application uses MongoDB change streams to send messages to a Kafka broker. These messages are consumed and displayed by a separate web application. The application does the following:

- Inserts time-series stock ticker data into a MongoDB collection
- Listens to change stream events on the collection using `collection.watch()`
- Sends messages to a Kafka broker
- Consumes messages with a Kafka consumer
- Displays the stock price information in a web application running on http://localhost:3000/

## Requirements

This application was built using versions of the following software:

- [MongoDB version 3.6.0-rc2](https://www.mongodb.com/download-center#development)
- [Kafka version 1.0.0](https://kafka.apache.org/downloads)
- Node.JS version 8.9.0
- NPM version 5.5.1

## Setup & Run 

Install Node.js packages:

```npm install```

[Start Zookeeper (optional) and Kafka](https://kafka.apache.org/quickstart) with Kafka listening on `localhost:9092`.

Edit configuration options in [config.js](config.js)

Start a MongoDB replica set with version 3.6.0-rc0 or higher:

```
mkdir -p data/rs1/db
mongod --dbpath data/rs1/db --port 27000 --enableMajorityReadConcern 
```

Start the Kafka Producer:

```npm run producer```

Start the Consumer webapp:

```npm run server```

Visit http://localhost:3000 to watch data.

