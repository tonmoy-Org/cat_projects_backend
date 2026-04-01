const express = require('express');
const { getReviewsByCustomer } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/customer', getReviewsByCustomer);

module.exports = router;