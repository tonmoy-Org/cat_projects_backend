const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    deviceId: {
        type: String,
    },
    browser: {
        type: String
    },
    browserVersion: {
        type: String
    },
    os: {
        type: String
    },
    osVersion: {
        type: String
    },
    deviceType: {
        type: String
    },
    deviceName: {
        type: String
    },
    ipAddress: {
        type: String
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
});

const addressSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true,
        trim: true,
        enum: ['home', 'work', 'other'],
        default: 'home'
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function (v) {
                return /^[0-9\-\+\s\(\)]+$/.test(v);
            },
            message: 'Invalid phone number format'
        }
    },
    street: {
        type: String,
        required: true,
        trim: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        required: true,
        trim: true
    },
    postalCode: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true,
            select: false
        },
        role: {
            type: String,
            enum: ['superadmin', 'client'],
            default: 'client'
        },
        isActive: {
            type: Boolean,
            default: true
        },
        department: {
            type: String,
            default: 'General'
        },
        addresses: {
            type: [addressSchema],
            default: []
        },
        devices: {
            type: [deviceSchema],
            default: []
        },
        resetPasswordToken: {
            type: String,
            select: false
        },
        resetPasswordExpire: {
            type: Date,
            select: false
        }
    },
    {
        timestamps: true
    }
);


module.exports = mongoose.model('User', userSchema);