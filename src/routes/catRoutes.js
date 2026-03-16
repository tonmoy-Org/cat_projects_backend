const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    createCat,
    getAllCats,
    getCatById,
    updateCat,
    deleteCat,
    updateCatStatus,
    addMedicalHistory,
    getCatsByStatus,
    addReview,
    getReviews,
    deleteReview,
    toggleReviewApproval,
} = require('../controllers/catController');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'), false);
    },
});

const catUpload = upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'gallery', maxCount: 4 },
]);


router.get('/', getAllCats);
router.get('/status/:status', getCatsByStatus);
router.get('/:id', getCatById);
router.post('/', protect, catUpload, createCat);
router.put('/:id', protect, catUpload, updateCat);
router.delete('/:id', protect, deleteCat);
router.patch('/:id/status', protect, updateCatStatus);
router.post('/:id/medical-history', protect, addMedicalHistory);

router.get('/:id/reviews', getReviews);
router.post('/:id/reviews', addReview);
router.delete('/:id/reviews/:reviewId', protect, deleteReview);
router.patch('/:id/reviews/:reviewId/approve', protect, toggleReviewApproval);

module.exports = router;