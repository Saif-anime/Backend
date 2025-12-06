const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Otp = require('../models/OTP');
const bcrypt = require('bcrypt')
const fs = require('fs');
const path = require('path')
// const multer = require('multer')
const auth = require('../middleware/auth')
const upload = require("../config/upload");
const client = new OAuth2Client('839830304906-e1kggvj2k0928m7guoohljgb290b1dpj.apps.googleusercontent.com');



// Create uploads folder if not exists
// const uploadFolder = "uploads/";
// if (!fs.existsSync(uploadFolder)) {
//   fs.mkdirSync(uploadFolder);
// }

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/");
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });

// const upload = multer({ storage });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});



// helper to generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


// UPDATE USER DATA (NO PASSWORD)
router.put(
  "/update-user",
  auth,
  upload.single("avatar"), // file input name = avatar
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { fullname, phone } = req.body;

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // FULLNAME update
      if (fullname) user.fullname = fullname;

      // PHONE update
      if (phone) user.phone = phone;

      // AVATAR update using Multer
      if (req.file) {
        const avatarUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
        user.avatar = avatarUrl;
      }

      await user.save();

      res.json({
        success: true,
        message: "Profile updated successfully",
        user,
      });
    } catch (error) {
      console.error("Update Error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);






// Request OTP
router.post('/request-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

  await Otp.deleteMany({ email }); // remove old OTPs
  const otpDoc = new Otp({ email, code, expiresAt });
  await otpDoc.save();

  // send email
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code',
    text: `Eshop Security Alert:
Your one-time password is ${code}.
Do not share this code with anyone. It expires in 5 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Mail error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});





// ✅ Verify OTP, Register, and Auto-login
router.post("/verify-otp", async (req, res) => {
  try {
    const { fullname, email, password, phone, otp } = req.body;

    // 1️⃣ Basic validation
    if (!email || !otp)
      return res.status(400).json({ error: "Email and OTP code required" });

    // 2️⃣ Find OTP
    const otpDoc = await Otp.findOne({ email, code: otp });

    console.log(otp)
    if (!otpDoc) return res.status(400).json({ error: "Invalid OTP" });

    // 3️⃣ Check expiration
    if (otpDoc.expiresAt < new Date()) {
      await Otp.deleteMany({ email });
      return res.status(400).json({ error: "OTP expired" });
    }

    // 4️⃣ Delete OTP after successful check
    await Otp.deleteMany({ email });

    // 5️⃣ Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      // User exists → just login directly
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      return res.json({
        success: true,
        message: "OTP verified. Logged in successfully.",
        token,
        user,
      });
    }

    // 6️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7️⃣ Create new user
    user = new User({
      fullname,
      email,
      password: hashedPassword,
      phone,
      avatar: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIf4R5qPKHPNMyAqV-FjS_OTBB8pfUV29Phg&s",
      isAdmin: false,
      is_active: true,
    });
    await user.save();

    // 8️⃣ Generate JWT token for auto login
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // 9️⃣ Send success response
    res.status(201).json({
      success: true,
      message: "User registered & logged in successfully",
      token,
      user,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: "Server error" });
  }
});



// VERIFY OTP + RESET PASSWORD
router.put("/reset-password", auth, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Find OTP
    const otpDoc = await Otp.findOne({ email, code: otp });
    if (!otpDoc) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Check expiration
    if (otpDoc.expiresAt < new Date()) {
      await Otp.deleteMany({ email });
      return res.status(400).json({ error: "OTP expired" });
    }

    // OTP valid → delete OTP
    await Otp.deleteMany({ email });

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }


    console.log(newPassword)

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);



    user.password = hashed;




    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (err) {
    console.error("Password Reset Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});








// @route POST /api/auth/google-login
router.post('/google-login', async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: '839830304906-e1kggvj2k0928m7guoohljgb290b1dpj.apps.googleusercontent.com',
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if the user exists by email or phone (you can use either)
    let user = await User.findOne({ email });

    if (!user) {
      // If user does not exist, create a new one
      user = new User({
        fullname: name,
        email,

        password: "", // No password for Google login
        is_admin: false, // Default to non-admin
        is_active: true, // Default active user
      });
      await user.save();
    }


    await user.save();

    // Create a JWT token to return to the frontend
    const jwtToken = jwt.sign(
      { id: user._id, email: user.email, fullname: user.fullname },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send the token and user data to the frontend
    res.json({ token: jwtToken, user });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Google login failed' });
  }
});


// Login a user (basic simulation, no password hashing)
// POST /api/login

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    if (!user.is_active)
      return res.status(403).json({ error: "Account is inactive. Please contact support." });
    console.log(password)
    const match = await bcrypt.compare(password, user.password);

    console.log(match)
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // remove password before sending response
    const { password: _, ...userData } = user._doc;

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all users (Admin purpose)
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





// Create new user
router.post('/create', upload.single('avatar'), async (req, res) => {
  try {
    const { fullname, email, phone, password, is_admin, is_active } = req.body;

    const avatarUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    const newUser = await User.create({
      fullname,
      email,
      phone,
      password,
      is_active,
      is_admin,
      avatar: avatarUrl
    });

    return res.status(201).json({ message: "User created", user: newUser });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server error", error });
  }

})




// Update User
router.put('/update/:id', upload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.params;

    let { fullname, email, phone, is_admin, is_active } = req.body;



    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Default avatar is old image
    let avatarPath = user.avatar;

    // If new image uploaded
    if (req.file) {

      // Delete old image from folder
      if (user.avatar) {
        const oldImagePath = path.join(process.cwd(), user.avatar.replace(`${req.protocol}://${req.get("host")}/`, ""));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      avatarPath = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

      console.log(fullname)
    console.log(is_admin)
    console.log(is_active)
    // Perform update & RETURN updated user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        fullname,
        email,
        phone,
        is_admin,
        is_active,
        avatar: avatarPath
      },
      { new: true }
    );

    return res.status(200).json({
      message: "User Updated Successfully",
      user: updatedUser
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server error", error });
  }
});



module.exports = router;
