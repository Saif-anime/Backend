const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

const Product = require('../models/Products');
const multer = require('multer')
const path = require('path');


// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/category/'); // uploads folder (create it)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});



// File filter (optional)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only images allowed'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});




// Create a new category
router.post('/create', upload.single('images'), async (req, res) => {
  try {

    const imagePaths = req.file.path;

    const productData = {
      ...req.body,
      images: imagePaths // store image paths in DB
    };

    const category = new Category(productData);
    await category.save();
    res.status(201).json(category);
    console.log("Incoming data:", req.body); // 👉 check this
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE category
router.put('/update/:id', upload.single('images'), async (req, res) => {
  try {
    const updateData = { ...req.body };

    // If a new image is uploaded, overwrite previous
    if (req.file) {
      updateData.images = req.file.path;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.status(200).json(updatedCategory);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


router.get('/', async (req, res) => {
  try {
    // 1. Fetch all categories
    const categories = await Category.find();

    // 2. Aggregate product counts, but only for products with a non-null categoryId
    const productCounts = await Product.aggregate([
      {
        $match: {
          category: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      }
    ]);

    // 3. Build a lookup map: categoryId string -> count
    const countMap = {};
    for (const { _id, count } of productCounts) {
      // ensure _id exists before calling toString()
      if (_id) {
        countMap[_id.toString()] = count;
      }
    }

    // 4. Merge counts into each category object
    const enrichedCategories = categories.map((cat) => ({
      _id: cat._id,
      name: cat.name,
      images: cat.images,
      is_active: cat.is_active,
      product_count: countMap[cat._id.toString()] || 0
    }));

    // 5. Send back the enriched list
    res.json(enrichedCategories);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully', id: category._id });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Get products by category
router.get('/:name/products', async (req, res) => {
  const Product = require('../models/Products');
  try {
    const products = await Product.find({ category: req.params.name });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
