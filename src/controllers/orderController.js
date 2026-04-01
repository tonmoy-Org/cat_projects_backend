const Order = require('../models/Order');
const Cat = require('../models/Cat');
const Product = require('../models/Product');

const populateOrderItems = async (orders) => {
  return Promise.all(
    orders.map(async (order) => {
      const populatedItems = await Promise.all(
        order.items.map(async (item) => {
          let details = null;

          try {
            details = await Product.findById(item.productId).lean();

            if (!details) {
              details = await Cat.findById(item.productId).lean();
            }
          } catch (err) {
            // Silently continue if population fails
          }

          return {
            ...item,
            details,
          };
        })
      );

      return {
        ...order,
        items: populatedItems,
      };
    })
  );
};

const getAllOrders = async (req, res) => {
  try {
    let orders = await Order.find()
      .sort({ createdAt: -1 })
      .lean();

    orders = await populateOrderItems(orders);

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
    });
  }
};

const getOrderByIdOrEmail = async (req, res) => {
  const { value } = req.params;

  try {
    let query = {};

    if (/^[0-9a-fA-F]{24}$/.test(value)) {
      query = { _id: value };
    } else {
      query = { customerEmail: value };
    }

    let orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .lean();

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No order found',
      });
    }

    orders = await populateOrderItems(orders);

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order',
    });
  }
};

const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    let query = {};

    if (/^[0-9a-fA-F]{24}$/.test(orderId)) {
      query = { _id: orderId };
    } else {
      query = { orderId: orderId };
    }

    const PAYMENT_STATUSES = ['paid', 'completed', 'failed', 'refunded'];
    const ORDER_STATUSES = [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'completed',
    ];

    let updateFields = {
      updatedAt: new Date(),
    };

    if (PAYMENT_STATUSES.includes(status)) {
      updateFields.paymentStatus = status;
    } else if (ORDER_STATUSES.includes(status)) {
      updateFields.orderStatus = status;
    } else {
      updateFields.orderStatus = status;
    }

    const order = await Order.findOneAndUpdate(
      query,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const populatedOrder = await populateOrderItems([order]);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order: populatedOrder[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status',
    });
  }
};

const deleteOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while deleting order',
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderByIdOrEmail,
  updateOrderStatus,
  deleteOrderById,
};