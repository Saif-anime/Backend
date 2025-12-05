const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const authMiddleware = require("../middleware/auth");
const mongoose = require('mongoose')


router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.json({ success: false, cart: [] });
    }

    const cartItems = items.map(i => ({

      productId: new mongoose.Types.ObjectId(i.productId),
      image: i.image,
      quantity: i.quantity,
      name: i.name,
      price: i.price,
    }));

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      // 🆕 New cart create
      cart = new Cart({ user: userId, items: cartItems });
    } else {
      // 🔄 Merge existing items
      cartItems.forEach(newItem => {
        const existing = cart.items.find(
          i => i.productId.toString() === newItem.productId.toString()
        );
        if (existing) {
          existing.quantity += newItem.quantity; // merge quantity
        } else {
          cart.items.push(newItem); // add new product
        }
      });
    }

    await cart.save();

    res.json({ success: true, cart });
  } catch (error) {
    console.error("Error syncing cart:", error);
    res.status(500).json({ success: false, error: 'Failed to sync cart' });
  }
});


// POST /api/cart/sync

router.get("/fetch", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId }).populate('items.productId');

    if (!cart) return res.json({ items: [] });

    res.json({ items: cart.items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



router.post("/add", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const items = req.body;




    if (!items || items.length === 0) {
      return res.json({ success: false, cart: [] });
    }



    const cartItems = items

    let cart = await Cart.findOne({ user: userId })

    console.log('cart')

    if (!cart) {
      // 🆕 New cart create
      cart = new Cart({ user: userId, items: cartItems });
    } else {
      // 🔄 Merge existing items




      const existing = cart.items.find(
        i => i.productId.toString() === cartItems.productId.toString()
      );

      console.log(existing)
      if (existing) {
        existing.quantity += cartItems.quantity; // merge quantity
      } else {
        cart.items.push(cartItems); // add new product
      }

    }



    await cart.save();

    res.json({ success: true, cart });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// DELETE /api/cart/remove/:productId
router.delete("/remove/:productId", authMiddleware, async (req, res) => {
  const productId = req.params.productId;

  const userId = req.user.id;

  let cart = await Cart.findOne({ user: userId });



  if (!cart)
    return res.status(404).json({ msg: "Cart not found" });

  cart.items = cart.items.filter(
    (i) => i.productId.toString() !== productId
  );



  console.log(cart)
  await cart.save();
  res.json({ msg: "Item removed", cart });
});



router.delete("/clear", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId })

    if (!cart) return res.status(404).json({ message: "Cart not found" });
    cart.items = [];
    await cart.save();

    res.json({ items: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



router.patch('/update/:productId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;
    const { type } = req.body; // "increase" | "decrease"



    console.log('run')
    
    if (!["increase", "decrease"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    // Find user's cart
    let cart = await Cart.findOne({ user: userId });

    console.log(cart)

    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    // Find item inside cart
    const item = cart.items.find(i => i.productId.toString() === productId);

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    // 🔥 Increase quantity
    if (type === "increase") {
      item.quantity += 1;
    }

    // 🔥 Decrease quantity
    if (type === "decrease") {
      item.quantity -= 1;

      // If quantity is 0 → remove item
      if (item.quantity <= 0) {
        cart.items = cart.items.filter(i => i.productId.toString() !== productId);
      }
    }

    await cart.save();

    return res.json({
      success: true,
      message: "Quantity updated",
      cart
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }

}
)

module.exports = router;
