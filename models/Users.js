const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    fullname: String,
    email: { type: String, unique: true },
    avatar:{type:String, default:null},
    phone: {
        type: String,
        default: null
    },
    password: String,
    is_admin: { type: Boolean, default: false }, // default: non-admin user
    is_active: { type: Boolean, default: true }  // default: active user
}, { timestamps: true });



module.exports = mongoose.model('User', userSchema);

