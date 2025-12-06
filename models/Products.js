const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    // stock: { type: Number, required: true },
    category:{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    // seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the seller
    images: [{ type: String }], // URLs of product images
    is_active:{type:Number, required:true}
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
