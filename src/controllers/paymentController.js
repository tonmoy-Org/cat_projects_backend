const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Cat = require('../models/Cat');
const sslcz = require('../config/sslcommerz');
const { sendOrderConfirmationEmail } = require('../../utils/Emailservice');
const { generateOrderId, generateTransactionId } = require('../../utils/Idgenerator');

const resolveItem = async (productId) => {
    const product = await Product.findById(productId).lean();
    if (product) return { doc: product, model: 'product' };

    const cat = await Cat.findById(productId).lean();
    if (cat) return { doc: cat, model: 'cat' };

    return null;
};

const buildStockDecrementOps = (items) => {
    const productOps = [];
    const catOps = [];

    for (const item of items) {
        const op = {
            updateOne: {
                filter: { _id: item.productId },
                update: { $inc: { stock: -item.quantity } },
            },
        };

        if (item.model === 'cat') catOps.push(op);
        else productOps.push(op);
    }

    return { productOps, catOps };
};


const applyStockOps = async ({ productOps, catOps }) => {
    if (productOps.length) await Product.bulkWrite(productOps);
    if (catOps.length) await Cat.bulkWrite(catOps);
};

const initiateSSLCommerzPayment = async (req, res) => {
    const {
        items = [],
        customerEmail,
        customerName,
        customerPhone,
        customerAddress,
        couponCode = '',
        discount = 0,
        shippingDistrict,
        shippingMethod = 'standard',
    } = req.body;

    const missingFields = [];
    if (!items.length) missingFields.push('items');
    if (!customerEmail) missingFields.push('customerEmail');
    if (!customerName) missingFields.push('customerName');
    if (!customerPhone) missingFields.push('customerPhone');
    if (!customerAddress) missingFields.push('customerAddress');
    if (!shippingDistrict) missingFields.push('shippingDistrict');

    if (missingFields.length) {
        return res.status(400).json({
            success: false,
            message: `Missing fields: ${missingFields.join(', ')}`,
        });
    }

    let order = null;

    try {
        let subtotal = 0;
        const validatedItems = [];

        for (const item of items) {
            if (!item.productId || item.quantity < 1) {
                return res.status(400).json({ success: false, message: 'Invalid item' });
            }

            const resolved = await resolveItem(item.productId);

            if (!resolved) {
                return res.status(404).json({ success: false, message: 'Item not found' });
            }

            const { doc, model } = resolved;

            if (model === 'cat') {
                if (doc.status !== 'available') {
                    return res.status(400).json({ success: false, message: 'Cat not available' });
                }
                if (doc.stock < item.quantity) {
                    return res.status(400).json({ success: false, message: 'Insufficient stock' });
                }
            } else {
                if (doc.stock < item.quantity) {
                    return res.status(400).json({ success: false, message: 'Insufficient stock' });
                }
            }

            const itemSubtotal = doc.price * item.quantity;

            validatedItems.push({
                productId: doc._id,
                productName: doc.name,
                quantity: item.quantity,
                price: doc.price,
                subtotal: itemSubtotal,
                model,
            });

            subtotal += itemSubtotal;
        }

        const SHIPPING_RATES = {
            dhaka: 50,
            chittagong: 100,
            rajshahi: 120,
            khulna: 120,
            barisal: 150,
            sylhet: 150,
            rangpur: 130,
            mymensingh: 100,
        };

        const shippingCost = SHIPPING_RATES[shippingDistrict.toLowerCase()] ?? 0;
        const tax = subtotal * 0.15;
        const totalAmount = subtotal - Number(discount || 0) + shippingCost + tax;

        if (totalAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        const user = await User.findOne({ email: customerEmail }).lean();
        const userId = user ? user._id : null;

        const orderId = generateOrderId();
        const transactionId = generateTransactionId();

        order = await Order.create({
            orderId,
            transactionId,
            customerId: userId,
            customerEmail,
            customerName,
            customerPhone,
            customerAddress,
            items: validatedItems,
            subtotal,
            discount,
            couponCode,
            shippingCost,
            tax,
            totalAmount,
            currency: 'BDT',
            shipping_method: 'standard',
            shippingDistrict,
            paymentMethod: 'sslcommerz',
            paymentStatus: 'pending',
            orderStatus: 'pending',
        });

        const payload = {
            total_amount: Math.round(totalAmount * 100) / 100,
            currency: 'BDT',
            tran_id: transactionId,
            success_url: `${process.env.SERVER_URL}/payment/sslcommerz/success/${transactionId}`,
            fail_url: `${process.env.SERVER_URL}/payment/sslcommerz/fail/${transactionId}`,
            cancel_url: `${process.env.SERVER_URL}/payment/sslcommerz/fail/${transactionId}`,
            ipn_url: `${process.env.SERVER_URL}/payment/sslcommerz/ipn`,
            product_name: `Order #${orderId}`,
            cus_name: customerName,
            cus_email: customerEmail,
            cus_phone: customerPhone,
            cus_add1: customerAddress.street || '',
            cus_city: customerAddress.city || '',
            cus_country: 'Bangladesh',
            shipping_method: 'NO',
        };
        
        const apiRes = await sslcz.init(payload);

        if (!apiRes?.GatewayPageURL) {
            await Order.findByIdAndUpdate(order._id, { paymentStatus: 'failed' });
            return res.status(500).json({ success: false, message: 'Gateway failed' });
        }

        return res.json({
            success: true,
            GatewayPageURL: apiRes.GatewayPageURL,
            transactionId,
            orderId,
        });
    } catch (error) {
        if (order) {
            await Order.findByIdAndUpdate(order._id, { paymentStatus: 'failed' });
        }
        return res.status(500).json({ success: false, message: 'Payment failed' });
    }
};

const handleSuccessPayment = async (req, res) => {
    const { transactionId } = req.params;

    try {
        const order = await Order.findOneAndUpdate(
            { transactionId, paymentStatus: 'pending' },
            { paymentStatus: 'completed', orderStatus: 'confirmed', paidAt: new Date() },
            { new: true }
        );

        if (!order) {
            return res.redirect(`${process.env.CLIENT_URL}/payment/failed`);
        }

        const { productOps, catOps } = buildStockDecrementOps(order.items);
        await applyStockOps({ productOps, catOps });

        for (const item of order.items) {
            if (item.model === 'cat') {
                await Cat.findByIdAndUpdate(item.productId, {
                    status: 'adopted',
                    stock: 0,
                    inStock: false,
                });
            }
        }

        await sendOrderConfirmationEmail(
            order.customerEmail,
            order.customerName,
            order.orderId,
            transactionId,
            order.totalAmount,
            order.items
        );

        return res.redirect(`${process.env.CLIENT_URL}/payment/success`);
    } catch {
        return res.redirect(`${process.env.CLIENT_URL}/payment/failed`);
    }
};

const handleFailPayment = async (req, res) => {
    const { transactionId } = req.params;

    try {
        await Order.findOneAndUpdate(
            { transactionId },
            { paymentStatus: 'failed', orderStatus: 'cancelled' }
        );

        return res.redirect(`${process.env.CLIENT_URL}/payment/failed`);
    } catch {
        return res.redirect(`${process.env.CLIENT_URL}/payment/failed`);
    }
};

const handleIPNPayment = async (req, res) => {
    try {
        const { tran_id, status } = req.body;

        const order = await Order.findOne({ transactionId: tran_id });
        if (!order) return res.json({ success: false });

        if (status === 'VALID') {
            if (order.paymentStatus !== 'completed') {
                order.paymentStatus = 'completed';
                order.orderStatus = 'confirmed';
                await order.save();

                const { productOps, catOps } = buildStockDecrementOps(order.items);
                await applyStockOps({ productOps, catOps });
            }
        }

        return res.json({ success: true });
    } catch {
        return res.json({ success: false });
    }
};

module.exports = {
    initiateSSLCommerzPayment,
    handleSuccessPayment,
    handleFailPayment,
    handleIPNPayment,
};