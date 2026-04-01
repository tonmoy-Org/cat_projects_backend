const User = require('../models/User');
const { validationResult } = require('express-validator');

const getAddresses = async (req, res) => {
    try {
        const userId = req.params.userId || req.user._id;

        if (userId.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view these addresses'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            count: user.addresses.length,
            data: user.addresses
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching addresses',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

const getAddressById = async (req, res) => {
    try {
        const { userId, addressId } = req.params;
        const targetUserId = userId || req.user._id;

        if (targetUserId.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this address'
            });
        }

        const user = await User.findById(targetUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const address = user.addresses.id(addressId);
        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        res.status(200).json({
            success: true,
            data: address
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching address',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

const createAddress = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    try {
        const userId = req.params.userId || req.user._id;

        if (userId.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to add addresses'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const { label, fullName, phoneNumber, street, city, state, postalCode, country, isDefault } = req.body;

        const shouldBeDefault = isDefault || user.addresses.length === 0;

        const newAddress = {
            label,
            fullName,
            phoneNumber,
            street,
            city,
            state,
            postalCode,
            country,
            isDefault: shouldBeDefault
        };

        if (shouldBeDefault) {
            user.addresses.forEach(addr => {
                addr.isDefault = false;
            });
        }

        user.addresses.push(newAddress);
        await user.save();

        const addedAddress = user.addresses[user.addresses.length - 1];

        res.status(201).json({
            success: true,
            message: 'Address added successfully',
            data: addedAddress
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating address',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

const updateAddress = async (req, res) => {
    try {
        const { userId, addressId } = req.params;
        const targetUserId = userId || req.user._id;

        if (targetUserId.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this address'
            });
        }

        const user = await User.findById(targetUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const address = user.addresses.id(addressId);
        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        const { label, fullName, phoneNumber, street, city, state, postalCode, country, isDefault } = req.body;

        if (label !== undefined) address.label = label;
        if (fullName !== undefined) address.fullName = fullName;
        if (phoneNumber !== undefined) address.phoneNumber = phoneNumber;
        if (street !== undefined) address.street = street;
        if (city !== undefined) address.city = city;
        if (state !== undefined) address.state = state;
        if (postalCode !== undefined) address.postalCode = postalCode;
        if (country !== undefined) address.country = country;

        if (isDefault === true) {
            user.addresses.forEach(addr => {
                addr.isDefault = false;
            });
            address.isDefault = true;
        } else if (isDefault === false && address.isDefault) {
            address.isDefault = false;
            if (user.addresses.length > 0 && !user.addresses.some(addr => addr.isDefault)) {
                user.addresses[0].isDefault = true;
            }
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Address updated successfully',
            data: address
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating address',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const { userId, addressId } = req.params;
        const targetUserId = userId || req.user._id;

        if (targetUserId.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this address'
            });
        }

        const user = await User.findById(targetUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const address = user.addresses.id(addressId);
        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        const wasDefault = address.isDefault;
        address.deleteOne();

        if (wasDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Address deleted successfully',
            data: { deletedAddressId: addressId }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting address',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

const setDefaultAddress = async (req, res) => {
    try {
        const { userId, addressId } = req.params;
        const targetUserId = userId || req.user._id;

        if (targetUserId.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify addresses'
            });
        }

        const user = await User.findById(targetUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const address = user.addresses.id(addressId);
        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        user.addresses.forEach(addr => {
            addr.isDefault = false;
        });

        address.isDefault = true;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Default address updated successfully',
            data: address
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error while setting default address',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

module.exports = {
    getAddresses,
    getAddressById,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
};