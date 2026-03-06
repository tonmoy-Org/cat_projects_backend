const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
  createProduct, getAllProducts, getProductById, updateProduct, deleteProduct,
} = require('../controllers/productController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', protect, upload.fields([{ name: 'featuredImage', maxCount: 1 }, { name: 'gallery', maxCount: 4 }]), createProduct);
router.put('/:id', protect, upload.fields([{ name: 'featuredImage', maxCount: 1 }, { name: 'gallery', maxCount: 4 }]), updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;