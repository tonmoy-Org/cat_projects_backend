const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addReview,
  getReviews,
  deleteReview,
  toggleReviewApproval,
} = require('../controllers/productController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

const productUpload = upload.fields([
  { name: 'featuredImage', maxCount: 1 },
  { name: 'gallery', maxCount: 4 },
]);

// ── Products ─────────────────────────────────────────────────────────────────
router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', protect, productUpload, createProduct);
router.put('/:id', protect, productUpload, updateProduct);
router.delete('/:id', protect, deleteProduct);

// ── Reviews ──────────────────────────────────────────────────────────────────
router.get('/:id/reviews', getReviews);
router.post('/:id/reviews', addReview);                                    // public
router.delete('/:id/reviews/:reviewId', protect, deleteReview);            // admin
router.patch('/:id/reviews/:reviewId/approve', protect, toggleReviewApproval); // admin

module.exports = router;