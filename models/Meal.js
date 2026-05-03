const MealModel = require('./mongoose/Meal');

// Validation helper
function validateMeal(mealData) {
    const errors = [];

    if (!mealData.name || mealData.name.trim() === '') {
        errors.push('Meal name is required');
    }

    if (mealData.price === undefined || mealData.price === null) {
        errors.push('Price is required');
    } else if (isNaN(mealData.price) || mealData.price < 0) {
        errors.push('Price must be a positive number');
    }

    if (!mealData.userId) {
        errors.push('User ID is required');
    }

    return errors;
}

// Helper: format meal with seller info from populate
function formatMeal(meal) {
    const obj = meal.toObject();
    obj.id = obj._id;
    obj.seller = obj.userId && obj.userId._id
        ? { id: obj.userId._id, username: obj.userId.username }
        : null;
    obj.userId = obj.userId && obj.userId._id ? obj.userId._id : obj.userId;
    delete obj.__v;
    return obj;
}

const sellerPopulate = { path: 'userId', select: 'username' };

const Meal = {
    ensureDataExists() {},

    // Get all meals
    async findAll() {
        const meals = await MealModel.find({}).populate(sellerPopulate);
        return meals.map(formatMeal);
    },

    // Find meal by ID
    async findById(id) {
        const meal = await MealModel.findById(id).populate(sellerPopulate);
        return meal ? formatMeal(meal) : undefined;
    },

    // Find meals by user ID
    async findByUserId(userId) {
        const meals = await MealModel.find({ userId }).populate(sellerPopulate);
        return meals.map(formatMeal);
    },

    // Find meals by category
    async findByCategory(category) {
        if (!category) {
            return this.findAll();
        }
        const meals = await MealModel.find({
            category: { $regex: category, $options: 'i' }
        }).populate(sellerPopulate);
        return meals.map(formatMeal);
    },

    // Get popular meals
    async findPopular(limit = null) {
        let query = MealModel.find({}).populate(sellerPopulate);
        if (limit && limit > 0) {
            query = query.limit(limit);
        }
        const meals = await query;
        return meals.map(formatMeal);
    },

    // Search meals by name or description
    async search(query) {
        if (!query) {
            return this.findAll();
        }
        const meals = await MealModel.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        }).populate(sellerPopulate);
        return meals.map(formatMeal);
    },

    // Create a new meal
    async create(mealData) {
        const errors = validateMeal(mealData);
        if (errors.length > 0) {
            return { success: false, errors };
        }

        try {
            const newMeal = await MealModel.create({
                name: mealData.name.trim(),
                description: mealData.description || '',
                price: parseFloat(mealData.price),
                image: mealData.image || '/images/meals/default.jpg',
                category: mealData.category || 'main',
                userId: mealData.userId
            });

            return { success: true, meal: newMeal.toJSON() };
        } catch (error) {
            if (error.name === 'ValidationError') {
                const firstError = Object.values(error.errors)[0];
                return { success: false, errors: [firstError.message] };
            }
            return { success: false, errors: ['Failed to save meal'] };
        }
    },

    // Update an existing meal
    async update(id, mealData, requestUserId) {
        const meal = await MealModel.findById(id);

        if (!meal) {
            return { success: false, errors: ['Meal not found'] };
        }

        // Check ownership
        if (meal.userId.toString() !== requestUserId.toString()) {
            return { success: false, errors: ['You can only update your own meals'] };
        }

        try {
            if (mealData.name) meal.name = mealData.name.trim();
            if (mealData.description !== undefined) meal.description = mealData.description;
            if (mealData.price !== undefined) meal.price = parseFloat(mealData.price);
            if (mealData.image) meal.image = mealData.image;
            if (mealData.category) meal.category = mealData.category;

            await meal.save();

            return { success: true, meal: meal.toJSON() };
        } catch (error) {
            if (error.name === 'ValidationError') {
                const firstError = Object.values(error.errors)[0];
                return { success: false, errors: [firstError.message] };
            }
            return { success: false, errors: ['Failed to update meal'] };
        }
    },

    // Delete a meal
    async delete(id, requestUserId) {
        const meal = await MealModel.findById(id);

        if (!meal) {
            return { success: false, errors: ['Meal not found'] };
        }

        // Check ownership
        if (meal.userId.toString() !== requestUserId.toString()) {
            return { success: false, errors: ['You can only delete your own meals'] };
        }

        try {
            await meal.deleteOne();
            return { success: true, message: 'Meal deleted successfully' };
        } catch (error) {
            return { success: false, errors: ['Failed to delete meal'] };
        }
    }
};

module.exports = Meal;
