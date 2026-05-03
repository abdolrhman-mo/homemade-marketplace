const mongoose = require('mongoose');

// Default targets the local 3-node replica set spawned by `npm run rs:up`.
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017,localhost:27018,localhost:27019/food-delivery?replicaSet=myReplicaSet';

async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB replica set');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

module.exports = { connectDB, mongoose };
