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
} = require('../controllers/catController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'), false);
    },
});

router.get('/', getAllCats);
router.get('/status/:status', getCatsByStatus);
router.get('/:id', getCatById);

router.post('/', upload.fields([{ name: 'featuredImage', maxCount: 1 }, { name: 'gallery', maxCount: 4 }]), createCat);
router.put('/:id', upload.fields([{ name: 'featuredImage', maxCount: 1 }, { name: 'gallery', maxCount: 4 }]), updateCat);
router.delete('/:id', deleteCat);
router.patch('/:id/status', updateCatStatus);
router.post('/:id/medical-history', addMedicalHistory);

module.exports = router;