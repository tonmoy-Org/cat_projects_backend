const Order = require('../models/Order');
const Cat = require('../models/Cat');
const Product = require('../models/Product');



const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const getOrderByIdOrEmail = async (req, res) => {
  const { value } = req.params;

  try {
    let query = {};

    if (value.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: value };
    } else {
      query = { customerEmail: value };
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: 'No order found' });
    }

    return res.status(200).json({ success: true, orders });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    let query = {};
    if (orderId.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: orderId };
    } else {
      query = { orderId: orderId };
    }

    const PAYMENT_STATUSES = ['paid', 'completed', 'failed', 'refunded'];
    const ORDER_STATUSES   = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'completed'];

    let updateFields = { updatedAt: new Date() };

    if (PAYMENT_STATUSES.includes(status)) {
      updateFields.paymentStatus = status;
    } else if (ORDER_STATUSES.includes(status)) {
      updateFields.orderStatus = status;
      if (status === 'delivered') {
        updateFields['$set'] = { orderStatus: status, updatedAt: new Date() };
      }
    } else {
      updateFields.orderStatus = status;
    }

    const order = await Order.findOneAndUpdate(
      query,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order,
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const deleteOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await Order.findByIdAndDelete(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.status(200).json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  getAllOrders,
  getOrderByIdOrEmail,
  updateOrderStatus,
  deleteOrderById,
};