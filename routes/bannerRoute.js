const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
// const multer = require('multer')
const path = require('path');
const Category = require('../models/Category');
const upload = require("../config/upload");

// Set storage engine
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/banner/'); // uploads folder (create it)
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





// CREATE
const createBanner = async (req, res) => {
  try {
    const { title, subtitle, description, category } = req.body;
    const image = req.file ? req.file.path : null;






    if (!title || !subtitle || !description || !category || !image) {
      return res.status(400).json({ message: "All fields are required" });
    }



    // ✅ Banner create karo
    const banner = new Banner({
      title,
      subtitle,
      description,
      category, // yahan category ObjectId hoga
      image,
    });

    await banner.save();

    // ✅ Populate category info (optional)
    const populatedBanner = await Banner.findById(banner._id).populate('category', 'name');

    res.status(201).json(populatedBanner);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
// READ ALL
const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    const categories = await Category.find();

    const result = banners.map(banner => {
      const category = categories.find(c => c._id.equals(banner.category));
      return {
        ...banner.toObject(),
        categoryName: category ? category.name : 'Unknown'
      };
    });



    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ONE
const getBannerById = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    res.json(banner);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
const updateBanner = async (req, res) => {
  try {
    const { title, subtitle, categoryid, description } = req.body;
    const image = req.file ? req.file.path : undefined;

    const updatedData = { title, subtitle, categoryid, description };
    if (image) updatedData.image = image;

    const banner = await Banner.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.json(banner);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
const deleteBanner = async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Banner deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



router.post('/create', upload.single('image'), createBanner);
router.get('/', getBanners);
router.get('/:id', getBannerById);
router.put('/:id', upload.single('image'), updateBanner);
router.delete('/:id', deleteBanner);

module.exports = router;
