const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '/images/meals/default.jpg' },
    category: { type: String, default: 'main' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

mealSchema.index({ userId: 1 });
mealSchema.index({ category: 1 });

mealSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Meal', mealSchema);
