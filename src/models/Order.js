// models/Order.model.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    customerAddress: {
      street: String,
      city: String,
      district: String,
      postalCode: String,
      country: {
        type: String,
        default: 'Bangladesh',
      },
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        itemType: {
          type: String,
          enum: ['product', 'cat'],
          default: 'product',
          required: true,
        },
        productName: {
          type: String,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        subtotal: {
          type: Number,
          required: true,
        },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    couponCode: {
      type: String,
      sparse: true,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'BDT',
      enum: ['BDT', 'USD'],
    },
    shipping_method: {
      type: String,
      default: 'standard',
    },
    shippingDistrict: {
      type: String,
      required: true,
    },
    estimatedDelivery: Date,
    paymentMethod: {
      type: String,
      enum: ['sslcommerz', 'cash_on_delivery', 'bank_transfer'],
      default: 'sslcommerz',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentDetails: {
      transactionTime: Date,
      validationId: String,
      authorizationId: String,
      cardBrand: String,
      maskedCard: String,
      paymentGatewayResponse: mongoose.Schema.Types.Mixed,
    },
    orderStatus: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'returned',
      ],
      default: 'pending',
      index: true,
    },
    orderNotes: String,
    adminNotes: String,
    refundInfo: {
      refundAmount: Number,
      refundReason: String,
      refundDate: Date,
      refundStatus: {
        type: String,
        enum: ['pending', 'processed', 'failed'],
      },
    },
    paidAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
    collection: 'orders',
  }
);

OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, orderStatus: 1 });
OrderSchema.index({ createdAt: -1 });

OrderSchema.virtual('age').get(function () {
  return new Date() - this.createdAt;
});


OrderSchema.methods.calculateTotal = function () {
  this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  this.totalAmount = this.subtotal - this.discount + this.shippingCost + this.tax;
  return this.totalAmount;
};


OrderSchema.methods.updateOrderStatus = function (newStatus, notes = '') {
  this.orderStatus = newStatus;
  if (notes) {
    this.adminNotes =
      (this.adminNotes || '') + `\n[${new Date().toISOString()}] ${notes}`;
  }
  return this.save();
};


OrderSchema.methods.processRefund = function (amount, reason) {
  if (this.paymentStatus !== 'completed') {
    throw new Error('Can only refund completed payments');
  }
  this.refundInfo = {
    refundAmount: amount,
    refundReason: reason,
    refundDate: new Date(),
    refundStatus: 'pending',
  };
  this.paymentStatus = 'refunded';
  return this.save();
};


OrderSchema.statics.findByTransactionId = function (transactionId) {
  return this.findOne({ transactionId });
};

OrderSchema.statics.findCustomerOrders = function (customerId) {
  return this.find({ customerId }).sort({ createdAt: -1 });
};

OrderSchema.statics.findPendingPayments = function () {
  return this.find({ paymentStatus: 'pending' }).sort({ createdAt: 1 });
};


OrderSchema.statics.populateItems = async function (order) {
  if (!order) return order;

  const productItems = order.items.filter((i) => i.itemType === 'product');
  const catItems     = order.items.filter((i) => i.itemType === 'cat');

  if (productItems.length > 0) {
    await order.populate({
      path: 'items.productId',
      match: { _id: { $in: productItems.map((i) => i.productId) } },
      model: 'Product',
      select: 'name title price stock featuredImage',
    });
  }

  if (catItems.length > 0) {
    await order.populate({
      path: 'items.productId',
      match: { _id: { $in: catItems.map((i) => i.productId) } },
      model: 'Cat',
      select: 'name price stock featuredImage status',
    });
  }

  return order;
};

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;