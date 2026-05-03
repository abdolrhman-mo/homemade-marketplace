const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const cartItemSchema = new mongoose.Schema({
    mealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: true });

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    password: { type: String, required: true },
    cart: [cartItemSchema]
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified('password') && !this.password.startsWith('$2b$')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Validate password
userSchema.methods.validatePassword = async function(password) {
    return bcrypt.compare(password, this.password);
};

// Return user without password
userSchema.methods.toSafeObject = function() {
    return {
        id: this._id,
        username: this.username,
        email: this.email,
        phone: this.phone || '',
        address: this.address || ''
    };
};

// Map _id to id in JSON output
userSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema);
