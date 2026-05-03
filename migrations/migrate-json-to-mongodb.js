const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Import Mongoose models
const User = require('../models/mongoose/User');
const Meal = require('../models/mongoose/Meal');
const Order = require('../models/mongoose/Order');
const Category = require('../models/mongoose/Category');
const Review = require('../models/mongoose/Review');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017,localhost:27018,localhost:27019/food-delivery?replicaSet=myReplicaSet';
const DATA_DIR = path.join(__dirname, '../data');

function readJSON(filename) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.log(`  Skipping ${filename} (file not found)`);
        return [];
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function migrate() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!\n');

    // Drop existing data
    console.log('Dropping existing collections...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
        await mongoose.connection.db.dropCollection(col.name);
    }
    console.log('Done.\n');

    // ID mapping: old integer IDs -> new MongoDB ObjectIds
    const userIdMap = {};
    const mealIdMap = {};

    // 1. Migrate Users
    console.log('Migrating users...');
    const usersData = readJSON('users.json');
    for (const u of usersData) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        const user = new User({
            username: u.username,
            email: u.email,
            address: u.address || '',
            phone: u.phone || '',
            password: hashedPassword,
            cart: []
        });
        // Skip the pre-save hook since password is already hashed
        await user.save();
        userIdMap[u.id] = user._id;
        console.log(`  Created user: ${u.username} (${u.id} -> ${user._id})`);
    }

    // 2. Migrate Meals
    console.log('\nMigrating meals...');
    const mealsData = readJSON('meals.json');
    for (const m of mealsData) {
        const meal = await Meal.create({
            name: m.name,
            description: m.description || '',
            price: m.price,
            image: m.image,
            category: m.category || 'main',
            userId: userIdMap[m.userId]
        });
        mealIdMap[m.id] = meal._id;
        console.log(`  Created meal: ${m.name} (${m.id} -> ${meal._id})`);
    }

    // 3. Migrate Cart Items (embed into users)
    console.log('\nMigrating cart items...');
    const cartData = readJSON('cart.json');
    for (const item of cartData) {
        const userId = userIdMap[item.userId];
        if (!userId) {
            console.log(`  Skipping cart item - user ${item.userId} not found`);
            continue;
        }
        await User.findByIdAndUpdate(userId, {
            $push: {
                cart: {
                    mealId: mealIdMap[item.mealId],
                    name: item.name,
                    price: item.price,
                    image: item.image,
                    quantity: item.quantity,
                    sellerId: item.sellerId ? userIdMap[item.sellerId] : null
                }
            }
        });
        console.log(`  Added ${item.name} to user ${item.userId}'s cart`);
    }

    // 4. Migrate Categories
    console.log('\nMigrating categories...');
    const categoriesData = readJSON('categories.json');
    for (const c of categoriesData) {
        await Category.create({
            name: c.name,
            description: c.description || '',
            image: c.image || '',
            type: c.type || ''
        });
        console.log(`  Created category: ${c.name}`);
    }

    // 5. Migrate Reviews
    console.log('\nMigrating reviews...');
    const reviewsData = readJSON('reviews.json');
    for (const r of reviewsData) {
        await Review.create({
            name: r.name,
            avatar: r.avatar || '',
            rating: r.rating,
            comment: r.comment || '',
            date: r.date ? new Date(r.date) : null
        });
        console.log(`  Created review by: ${r.name}`);
    }

    // 6. Migrate Orders (with embedded items and customer)
    console.log('\nMigrating orders...');
    const ordersData = readJSON('orders.json');
    for (const o of ordersData) {
        await Order.create({
            userId: userIdMap[o.userId],
            customer: {
                name: o.customer.name,
                phone: o.customer.phone,
                address: o.customer.address,
                notes: o.customer.notes || ''
            },
            items: o.items.map(item => ({
                mealId: mealIdMap[item.mealId],
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                sellerId: item.sellerId ? userIdMap[item.sellerId] : null
            })),
            total: o.total,
            paymentMethod: o.paymentMethod,
            status: o.status,
            estimatedDelivery: o.estimatedDelivery ? new Date(o.estimatedDelivery) : null
        });
        console.log(`  Created order #${o.id} (${o.status})`);
    }

    // Summary
    console.log('\n=== Migration Summary ===');
    console.log(`Users:      ${usersData.length}`);
    console.log(`Meals:      ${mealsData.length}`);
    console.log(`Cart Items: ${cartData.length}`);
    console.log(`Categories: ${categoriesData.length}`);
    console.log(`Reviews:    ${reviewsData.length}`);
    console.log(`Orders:     ${ordersData.length}`);
    console.log('========================\n');

    await mongoose.disconnect();
    console.log('Migration complete! Disconnected from MongoDB.');
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
