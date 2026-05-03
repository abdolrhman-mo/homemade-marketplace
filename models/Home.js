const Category = require('./mongoose/Category');
const Review = require('./mongoose/Review');
const Meal = require('./mongoose/Meal');

const Home = {
    // Get all categories
    async getCategories() {
        const categories = await Category.find({});
        return categories.map(c => c.toJSON());
    },

    // Get all reviews
    async getReviews() {
        const reviews = await Review.find({});
        return reviews.map(r => r.toJSON());
    },

    // Get popular meals
    async getPopularMeals(limit = null) {
        let query = Meal.find({});
        if (limit && limit > 0) {
            query = query.limit(limit);
        }
        const meals = await query;
        return meals.map(m => m.toJSON());
    }
};

module.exports = Home;
