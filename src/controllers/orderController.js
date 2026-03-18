const Order = require('../models/Order');

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const getOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.status(200).json({ success: true, order });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error' });
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
  getOrderById,
  deleteOrderById,
};