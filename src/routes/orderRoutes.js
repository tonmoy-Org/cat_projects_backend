const express = require('express');
const router = express.Router();
const { getAllOrders, getOrderById, deleteOrderById } = require('../controllers/orderController');

router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.delete('/:id', deleteOrderById);

module.exports = router;