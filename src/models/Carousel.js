const mongoose = require('mongoose');

const carouselSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        smallTitle: {
            type: String,
            trim: true
        },
        paragraph: {
            type: String,
            required: true,
            trim: true
        },
        btnText: {
            type: String,
            default: 'Learn More'
        },
        btnLink: {
            type: String,
            default: '#'
        },
        image: {
            type: String,
            required: true
        },
        order: {
            type: Number,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

carouselSchema.index({ order: 1, createdAt: -1 });

module.exports = mongoose.model('Carousel', carouselSchema);