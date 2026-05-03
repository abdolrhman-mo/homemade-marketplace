const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    type: { type: String, default: '' }
}, { timestamps: true });

categorySchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Category', categorySchema);
