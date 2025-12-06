const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    images: [{ type: String }], // URLs of product images,
    is_active:{type:Number, required:true}
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);
