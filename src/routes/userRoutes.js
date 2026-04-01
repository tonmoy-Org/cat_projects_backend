const express = require('express');
const {
    getAllUsers, 
    getUserById, 
    createUser, 
    updateUser, 
    deleteUser,
    toggleUserStatus, 
    removeDevice,
    getMyAddresses, 
    addMyAddress, 
    updateMyAddress, 
    deleteMyAddress, 
    setDefaultAddress
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', createUser);

router.use(protect);

router.route('/')
    .get(getAllUsers);

router.route('/me/addresses')
    .get(getMyAddresses)
    .post(addMyAddress);

router.route('/me/addresses/:addressId')
    .put(updateMyAddress)
    .delete(deleteMyAddress)
    .patch(setDefaultAddress);

router.route('/:id')
    .get(getUserById)
    .put(updateUser)
    .delete(deleteUser);

router.patch('/:id/toggle-status', toggleUserStatus);
router.delete('/:userId/devices/:deviceId', removeDevice);

module.exports = router;