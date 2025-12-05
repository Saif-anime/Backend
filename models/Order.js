
const mongoose = require('mongoose');


const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        image: [String],
        price: Number,
        quantity: Number
      }
    ],
    subtotal: Number,
    shipping: Number,
    tax: Number,
    total: Number,
    address: {
      firstName: String,
      lastName: String,
      address: String,
      apartment: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      phone: String,
    },
    paymentMethod: { type: String, enum: ["cod", "phonepay"], required: true },
    paymentStatus: { type: String, enum: ["pending", "paid", 'unpaid'], default: "pending" },
    orderStatus: { type: String, enum: ["pending", "processing", "shipped", "delivered"], default: "pending" },
    transactionId:{type:String, default:""},
    merchantTransactionId:{type:String, default:""}
  }, { timestamps: true });
  
  
  
  module.exports= mongoose.model("Order", orderSchema);
  