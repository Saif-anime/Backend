const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const authMiddleware = require("../middleware/auth");
const Cart = require('../models/Cart');
const PDFDocument = require('pdfkit');





// Create a new order
router.post("/checkout", authMiddleware, async (req, res) => {
  try {
    const { items, subtotal, shipping, tax, total, address, paymentMethod } = req.body;

    const order = new Order({
      user: req.user.id,
      items,
      subtotal,
      shipping,
      tax,
      total,
      address,
      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "pending" : "unpaid"
    });

    await order.save();
    // After saving the order
    const cart = await Cart.findOne({ userId });
    cart.items = [];
    await cart.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: "Checkout failed" });
  }
});




// Get all orders for a user
router.get('/allorder', async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get all orders for a user
router.get('/:orderId', async (req, res) => {
  try {
    const orders = await Order.find({ _id: req.params.orderId });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});












router.get('/:id/invoice', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${order._id}.pdf`);

    doc.pipe(res);

    // -----------------------------
    // HEADER
    // -----------------------------
    doc
      .fontSize(26)
      .fillColor("#333")
      .text("SamWithCode", { align: "left" });

    doc
      .fontSize(12)
      .fillColor("#666")
      .text("Web Development & E-Commerce", { align: "left" })
      .text("New Delhi, India")
      .text("support@samwithcode.in")
      .moveDown();

    doc
      .fontSize(20)
      .fillColor("#000")
      .text("INVOICE", { align: "right" })
      .moveDown(1);

    // -----------------------------
    // ORDER INFO SECTION
    // -----------------------------
    doc
      .fontSize(12)
      .fillColor("#333")
      .text(`Invoice Number: ${order._id}`)
      .text(`Order Date: ${new Date(order.createdAt).toLocaleString()}`)
      .text(`Payment Status: ${order.paymentStatus}`)
      .moveDown();

    // -----------------------------
    // CUSTOMER DETAILS
    // -----------------------------
    doc
      .fontSize(14)
      .fillColor("#000")
      .text("Billing Address", { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(12)
      .fillColor("#333")
      .text(`${order.address.firstName} ${order.address.lastName}`)
      .text(order.address.address)
      .text(`${order.address.city}, ${order.address.state}`)
      .text(order.address.country)
      .text(`Phone: ${order.address.phone}`)
      .moveDown(1);

    // -----------------------------
    // ITEMS TABLE HEADER
    // -----------------------------
    doc
      .fontSize(14)
      .fillColor("#000")
      .text("Order Items", { underline: true })
      .moveDown(0.5);

    // Table column headers
    doc
      .fontSize(12)
      .fillColor("#000")
      .text("Product", 50, doc.y, { continued: true })
      .text("Qty", 250, doc.y, { continued: true })
      .text("Price", 300, doc.y, { continued: true })
      .text("Total", 400);

    doc.moveTo(50, doc.y + 2).lineTo(550, doc.y + 2).stroke();

    // -----------------------------
    // ITEMS LOOP
    // -----------------------------
    order.items.forEach((item) => {
      const productName = item.name || "Unnamed Product";
      const price = item.price || 0;

      doc
        .fontSize(12)
        .fillColor("#444")
        .text(productName, 50, doc.y + 5, { continued: true })
        .text(item.quantity, 250, doc.y, { continued: true })
        .text(`₹${price}`, 300, doc.y, { continued: true })
        .text(`₹${price * item.quantity}`, 400);
    });

    doc.moveDown(2);

    // -----------------------------
    // TOTAL SECTION
    // -----------------------------
    doc
      .fontSize(14)
      .fillColor("#000")
      .text("Order Summary", { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .fillColor("#333")
      .text(`Subtotal: ₹${order.total}`)
      .text(`Shipping: ₹ ${order.shipping}`)
      .text(`Grand Total: ₹${order.total}`, { bold: true })
      .moveDown(2);

    // -----------------------------
    // FOOTER
    // -----------------------------
    doc
      .fontSize(10)
      .fillColor("#999")
      .text("Thank you for shopping with SamWithCode!", { align: "center" })
      .text("For any support, contact support@samwithcode.in", { align: "center" })
      .moveDown();

    doc.end();

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// Get all orders for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get single order for a user
router.get('/user/:userId/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.params.userId
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Update order status (e.g., Pending -> Delivered)
router.patch('/:id/status', async (req, res) => {
  try {


    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: req.body.status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
