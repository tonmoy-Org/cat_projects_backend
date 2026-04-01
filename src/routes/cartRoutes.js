const express = require('express');
const {
  getCart,
  addToCart,
  updateItem,
  removeItem,
  clearCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getCart)
  .post(addToCart)
  .delete(clearCart);

router.route('/item/:itemId')
  .put(updateItem)
  .delete(removeItem);

module.exports = router;