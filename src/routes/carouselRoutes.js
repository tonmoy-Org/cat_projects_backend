const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  listCarousel,
  getCarousel,
  createCarousel,
  updateCarousel,
  deleteCarousel
} = require('../controllers/carouselController');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

// Public routes
router.get('/', listCarousel);
router.get('/:id', getCarousel);

// Protected routes
router.post('/', protect, upload.single('image'), createCarousel);
router.put('/:id', protect, upload.single('image'), updateCarousel);
router.delete('/:id', protect, deleteCarousel);

module.exports = router;