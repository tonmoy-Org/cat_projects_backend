const mongoose = require('mongoose');

const socialVideoSchema = new mongoose.Schema({
    url: { type: String, required: true },
    title: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('SocialVideo', socialVideoSchema);