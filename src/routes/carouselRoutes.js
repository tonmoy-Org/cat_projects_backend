const express = require('express');
const router = express.Router();
const {
  listCarousel,
  getCarousel,
  createCarousel,
  updateCarousel,
  deleteCarousel
} = require('../controllers/carouselController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/', listCarousel);
router.get('/:id', getCarousel);

// Protected routes (if needed)
router.post('/', protect, createCarousel);
router.put('/:id', protect, updateCarousel);
router.delete('/:id', protect, deleteCarousel);

module.exports = router;