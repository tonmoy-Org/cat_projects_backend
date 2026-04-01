const express = require('express');
const { 
  getAllOrders, 
  getOrderByIdOrEmail, 
  deleteOrderById, 
  updateOrderStatus 
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAllOrders);

router.route('/:value')
  .get(getOrderByIdOrEmail);

router.route('/:id')
  .delete(deleteOrderById);

router.patch('/:orderId/status', updateOrderStatus);

module.exports = router;