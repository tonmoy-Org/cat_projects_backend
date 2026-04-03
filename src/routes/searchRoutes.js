const express = require('express');
const router = express.Router();
const {
  searchAll,
  getSuggestions,
  advancedSearch,
  getByTitleId,
  addReview,
  getReviews,
  deleteReview,
  getAllData
} = require('../controllers/searchController');

// @route   GET /api/search
// @desc    Search across all models
// @access  Public
router.get('/', searchAll);
router.get('/all', getAllData);

// @route   GET /api/search/suggestions
// @desc    Get search suggestions
// @access  Public
router.get('/suggestions', getSuggestions);

// @route   POST /api/search/advanced
// @desc    Advanced search with filters
// @access  Public
router.post('/advanced', advancedSearch);

// @route   GET /api/search/:title_id
// @desc    Get item by title_id (cat or product)
// @access  Public
router.get('/:title_id', getByTitleId);

// @route   POST /api/search/:id/reviews
// @desc    Add a review to a product
// @access  Public (but may require authentication)
router.post('/:id/reviews', addReview);

// @route   GET /api/search/:id/reviews
// @desc    Get reviews for a product
// @access  Public
router.get('/:id/reviews', getReviews);

// @route   DELETE /api/search/:id/reviews/:reviewId
// @desc    Delete a review from a product
// @access  Private/Admin (you may want to add auth middleware)
router.delete('/:id/reviews/:reviewId', deleteReview);

module.exports = router;