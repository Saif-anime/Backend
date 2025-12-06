const mongoose = require("mongoose");

const StoreSettingSchema = new mongoose.Schema({
  taxPercent: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("StoreSetting", StoreSettingSchema);
