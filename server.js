const express = require('express');
const app = express();
const dotenv = require('dotenv')


dotenv.config();
const port = process.env.PORT;
const mongoose = require("mongoose");
const cors = require('cors');
// setting up middleware

app.use(cors({
  origin: "http://localhost:3000", // ⭐ frontend URL yaha likhna zaroori
  credentials: true // ⭐ allow cookies/tokens/session
}));
app.use('/uploads', express.static('uploads'));
// Middleware for parsing JSON requests
app.use(express.json());
app.use(express.urlencoded({extended:true}));

// database connection here 
// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));



    // routes here 
const productRoutes = require('./routes/ProductRoute');
const CategoryRoutes = require('./routes/CategoryRoute');
const OrderRoutes = require('./routes/OrderRoute');
const userRoutes = require('./routes/UserRoute');
const bannerRoutes = require('./routes/bannerRoute');
const CartRoutes = require('./routes/CartRoute');
const StoreSettingRoutes = require('./routes/StoreSettingRoute');
const path = require('path');

app.use('/api/products', productRoutes);
app.use('/api/user', userRoutes);
app.use('/api/order', OrderRoutes);
app.use('/api/categories', CategoryRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/cart', CartRoutes);
app.use('/api/settings', StoreSettingRoutes);

const phonepeRoutes = require('./routes/phonepeRoutes');
app.use('/api/phonepe', phonepeRoutes);

// Basic route
app.get('/', (req, res) => {
    res.send('Hello, World!');
});

// Another route
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to the API!' });
});




// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
