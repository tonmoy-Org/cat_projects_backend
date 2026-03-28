const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const roleMiddleware = require('../middleware/roleMiddleware');
const { getAllUsers, getUserById, createUser, updateUser, deleteUser, toggleUserStatus, removeDevice } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const validateUser = [
    body('name').trim().notEmpty().isLength({ min: 2, max: 50 }),
    body('email').trim().notEmpty().isEmail(),
    body('password').optional().isLength({ min: 6 }),
    body('role').optional().isIn(['superadmin', 'client']),
];

// Public routes
router.post('/register', createUser);

// Admin only routes
const adminAccess = roleMiddleware.restrictTo('superadmin');

router.get('/', protect, adminAccess, getAllUsers);
router.get('/:id', protect, adminAccess, getUserById);
router.put('/:id', protect, adminAccess, validateUser, updateUser);
router.delete('/:id', protect, adminAccess, deleteUser);
router.patch('/:id/toggle-status', protect, adminAccess, toggleUserStatus);

// Device removal route - accessible by both user and admin
router.delete('/:userId/devices/:deviceId', protect, removeDevice);

module.exports = router;