const express = require('express');
const router = express.Router();
const {
    createCat,
    getAllCats,
    getCatById,
    updateCat,
    deleteCat,
    updateCatStatus,
    addMedicalHistory,
    getCatsByStatus,
    getFeaturedCats
} = require('../controllers/catController');

// Public routes
router.get('/', getAllCats);
router.get('/featured', getFeaturedCats);
router.get('/status/:status', getCatsByStatus);
router.get('/:id', getCatById);

// Protected routes (Admin only)
router.post('/', createCat);
router.put('/:id', updateCat);
router.delete('/:id', deleteCat);
router.patch('/:id/status', updateCatStatus);
router.post('/:id/medical-history', addMedicalHistory);

module.exports = router;