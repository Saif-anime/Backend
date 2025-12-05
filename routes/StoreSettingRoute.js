const express = require('express');
const router = express.Router();
const StoreSetting = require('../models/StoreSetting')


// GET /api/admin/settings
router.get("/", async (req, res) => {
  try {
    let settings = await StoreSetting.findOne(); // Only one document

    // If not exists, create default setting
    if (!settings) {
      settings = await StoreSetting.create({
        taxPercent: 0,
        shippingFee: 0,
      });
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

// PUT /api/admin/settings
router.put("/", async (req, res) => {
  try {
    const { taxPercent, shippingFee } = req.body;

    if (
      typeof taxPercent !== "number" || taxPercent < 0 || taxPercent > 100 ||
      typeof shippingFee !== "number" || shippingFee < 0
    ) {
      return res.status(400).send("Invalid values");
    }

    // Find the existing one or create if not exist
    const updated = await StoreSetting.findOneAndUpdate(
      {},
      { taxPercent, shippingFee, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({
      message: "Settings updated successfully",
      settings: updated
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

module.exports = router;
