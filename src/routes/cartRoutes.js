const express = require('express');
const router = express.Router();

const {
  getCart,
  addToCart,
  updateItem,
  removeItem,
  clearCart
} = require('../controllers/cartController');

const { protect } = require('../middleware/authMiddleware');

// All routes protected
router.use(protect);

// GET cart
router.get('/', getCart);

// ADD item
router.post('/add', addToCart);

// UPDATE item
router.put('/item/:itemId', updateItem);

// REMOVE item
router.delete('/item/:itemId', removeItem);

// CLEAR cart
router.delete('/', clearCart);

module.exports = router;