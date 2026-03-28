const express = require('express');
const router = express.Router();
const { getAllOrders, getOrderByIdOrEmail, deleteOrderById, updateOrderStatus } = require('../controllers/orderController');

router.get('/', getAllOrders);
router.get('/:value', getOrderByIdOrEmail);
router.put('/:orderId/status', updateOrderStatus); 
router.delete('/:id', deleteOrderById);

module.exports = router;