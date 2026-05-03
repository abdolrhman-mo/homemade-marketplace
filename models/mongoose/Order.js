const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    mealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        notes: { type: String, default: '' }
    },
    items: [orderItemSchema],
    total: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    status: {
        type: String,
        default: 'processing',
        enum: ['processing', 'preparing', 'enroute', 'delivered', 'cancelled']
    },
    estimatedDelivery: { type: Date }
}, { timestamps: true });

orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'items.sellerId': 1 });
orderSchema.index({ createdAt: -1 });

orderSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Order', orderSchema);
