const express = require('express');
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

const router = express.Router();

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

router.route('/')
  .get(getAllProducts);

router.route('/:id')
  .get(getProductById);

router.get('/:id/reviews', getReviews);

router.use(protect);

router.route('/')
  .post(productUpload, createProduct);

router.route('/:id')
  .put(productUpload, updateProduct)
  .delete(deleteProduct);

router.post('/:id/reviews', addReview);

router.route('/:id/reviews/:reviewId')
  .delete(deleteReview)
  .patch(toggleReviewApproval);

module.exports = router;