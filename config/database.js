const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://172.28.96.1:27017,10.72.249.208:27017,10.72.249.206:27017/food-delivery?replicaSet=rs0';

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
