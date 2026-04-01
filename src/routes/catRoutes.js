const express = require('express');
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

const router = express.Router();

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
router.get('/:id/reviews', getReviews);

router.use(protect);

router.route('/')
    .post(catUpload, createCat);

router.route('/:id')
    .put(catUpload, updateCat)
    .delete(deleteCat);

router.patch('/:id/status', updateCatStatus);
router.post('/:id/medical-history', addMedicalHistory);

router.route('/:id/reviews')
    .post(addReview);

router.route('/:id/reviews/:reviewId')
    .delete(deleteReview)
    .patch(toggleReviewApproval);

module.exports = router;