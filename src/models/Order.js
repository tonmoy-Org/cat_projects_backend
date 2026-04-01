const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    itemType: {
        type: String,
        enum: ['product', 'cat'],
        required: true
    },
    productName: {
        type: String
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true
    },
    subtotal: {
        type: Number,
        required: true
    }
});

const OrderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true,
        required: true
    },
    transactionId: {
        type: String,
        unique: true,
        sparse: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    customerEmail: {
        type: String,
        required: true,
        lowercase: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerPhone: {
        type: String,
        required: true
    },
    customerAddress: {
        street: String,
        city: String,
        district: String,
        postalCode: String,
        country: {
            type: String,
            default: 'Bangladesh'
        }
    },
    items: [orderItemSchema],
    subtotal: {
        type: Number,
        required: true,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    couponCode: {
        type: String,
        sparse: true
    },
    shippingCost: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'BDT',
        enum: ['BDT', 'USD']
    },
    shipping_method: {
        type: String,
        default: 'standard'
    },
    shippingDistrict: {
        type: String,
        required: true
    },
    estimatedDelivery: Date,
    paymentMethod: {
        type: String,
        enum: ['sslcommerz', 'cash_on_delivery', 'bank_transfer'],
        default: 'sslcommerz'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
        default: 'pending'
    },
    paymentDetails: {
        transactionTime: Date,
        validationId: String,
        authorizationId: String,
        cardBrand: String,
        maskedCard: String,
        paymentGatewayResponse: mongoose.Schema.Types.Mixed
    },
    orderStatus: {
        type: String,
        default: 'pending'
    },
    orderNotes: String,
    adminNotes: String,
    refundInfo: {
        refundAmount: Number,
        refundReason: String,
        refundDate: Date,
        refundStatus: {
            type: String,
            enum: ['pending', 'processed', 'failed']
        }
    },
    paidAt: Date,
    completedAt: Date
}, {
    timestamps: true,
    collection: 'orders'
});

module.exports = mongoose.model('Order', OrderSchema);