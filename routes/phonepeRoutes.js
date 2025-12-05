const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const router = express.Router();
const sha256 = require("sha256");
const uniqid = require("uniqid");
const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order');
const authMiddleware = require("../middleware/auth");
// UAT environment
const MERCHANT_KEY = "96434309-7796-489d-8924-ab56988a6076"
const MERCHANT_ID = "PGTESTPAYUAT86"

// const prod_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay"
// const prod_URL = "https://api.phonepe.com/apis/hermes/pg/v1/status"

const MERCHANT_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay"
const MERCHANT_STATUS_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status"

const redirectUrl = "http://localhost:8000"

BACKEND_URL = "http://localhost:8000/api/phonepe/status"

const successUrl = "http://localhost:3000/payment-status"
const failureUrl = "http://localhost:3000/payment-status"




// Initiate Payment
router.post('/initiate', authMiddleware, async (req, res, next) => {
    const { address, total, items, subtotal, shipping, tax, paymentMethod } = req.body;

    const orderId = uuidv4()
    try {


        // 1️⃣ Pre-create order in DB
        const newOrder = await Order.create({
            user: req.user.id,
            items,
            subtotal,
            shipping,
            tax,
            total,
            address,
            paymentMethod,
            paymentStatus: paymentMethod === "cod" ? "pending" : "unpaid",
            merchantTransactionId: orderId
        });



        //payment
        const paymentPayload = {
            merchantId: MERCHANT_ID,
            merchantUserId: address.name,
            mobileNumber: address.phone,
            amount: total * 100,
            merchantTransactionId: orderId,
            redirectUrl: `${redirectUrl}/api/phonepe/status/${orderId}`,
            redirectMode: 'POST',
            callbackUrl: `${BACKEND_URL}`, // backend ke liye
            paymentInstrument: {
                type: 'PAY_PAGE'
            }
        }

        const payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64')
        const keyIndex = 1
        const string = payload + '/pg/v1/pay' + MERCHANT_KEY
        const sha256 = crypto.createHash('sha256').update(string).digest('hex')
        const checksum = sha256 + '###' + keyIndex

        const option = {
            method: 'POST',
            url: MERCHANT_BASE_URL,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum
            },
            data: {
                request: payload
            }
        }

        const response = await axios.request(option);
        console.log(response.data.data.instrumentResponse.redirectInfo.url)
        res.status(200).json({ msg: "OK", url: response.data.data.instrumentResponse.redirectInfo.url })
    } catch (error) {
        console.log("error in payment", error)
        res.status(500).json({ error: 'Failed to initiate payment' })
    }

});



// Verify Payment
router.post('/status/:id' , async (req, res) => {
    const merchantTransactionId = req.params.id; // ✅ params se lena hai

    const keyIndex = 1;
    const string = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + MERCHANT_KEY;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const checksum = sha256 + '###' + keyIndex;

    const option = {
        method: 'GET',
        url: `${MERCHANT_STATUS_URL}/${MERCHANT_ID}/${merchantTransactionId}`,
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'X-MERCHANT-ID': MERCHANT_ID
        },
    };

    try {
        const response = await axios.request(option);
        console.log("PhonePe Status Response:", response.data);


        const order = await Order.findOne({ merchantTransactionId });
        if (!order) {
            console.error("Order not found for transaction:", merchantTransactionId);
            return res.redirect(`${failureUrl}/${merchantTransactionId}`);
        }
        if (response.data.success === true) {
            order.paymentStatus = "paid";
            order.transactionId = response.data.data.transactionId;
        }
        else {
            order.paymentStatus = "failed";
        }
        await order.save();

 
        const redirectPage = response.data.success ? `${successUrl}/${order._id}`:`${successUrl}/${order._id}`
        return res.redirect(redirectPage);

    } catch (error) {
        console.error("Error verifying payment:", error.response?.data || error.message);
        return res.redirect(`${redirectUrl}/payment-failure/${merchantTransactionId}`);
    }
});




module.exports = router;
