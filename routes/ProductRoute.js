const express = require('express');
const router = express.Router();
const Product = require('../models/Products');
// const multer = require('multer');
const path = require('path');
const Category = require('../models/Category');
const mongoose = require('mongoose');
const upload = require("../config/upload");
// Set storage engine
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/products/'); // uploads folder (create it)
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + '-' + file.originalname);
//   }
// });



// File filter (optional)
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = /jpeg|jpg|png|webp/;
//   const ext = path.extname(file.originalname).toLowerCase();
//   if (allowedTypes.test(ext)) {
//     cb(null, true);
//   } else {
//     cb(new Error('Only images allowed'));
//   }
// };

// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter
// });
// Create a product
router.post('/create', upload.array('images', 10), async (req, res) => {
  try {
    const imagePaths = req.files.map(file => file.path);

    const productData = {
      ...req.body,
      category: new mongoose.Types.ObjectId(req.body.category),
      images: imagePaths // store image paths in DB
    };

    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    const categories = await Category.find();

    const result = products.map(product => {
      const category = categories.find(c => c._id.equals(product.category));
      return {
        ...product.toObject(),
        categoryName: category ? category.name : 'Unknown'
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get a single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');
    // 'name' yahan specify karta hai ki sirf category ka name hi chahiye

    const cateid = product.category._id


    // Maan lijiye req.params.id mein ab Category ki ID aa rahi hai
    const showresultproduct = await Product.find({ category: cateid }).populate('category', 'name');

    if (!product) return res.status(404).json({ error: 'Product not found' });

    res.json({product, showresultproduct});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});






// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully', id: product._id });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// PUT /api/products/:id
router.put('/:id', upload.array("images"), async (req, res) => {
  const { name, description, price, category, is_active, images } = req.body;

  try {

    const updateData = {
      name: req.body.name,
      category: req.body.category,
      price: req.body.price,
      description: req.body.description,
      is_active: req.body.is_active,
    };

    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map(f => f.path);
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true } // return updated doc
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
