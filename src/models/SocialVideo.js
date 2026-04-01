const mongoose = require('mongoose');

const socialVideoSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true
    },
    title: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('SocialVideo', socialVideoSchema);