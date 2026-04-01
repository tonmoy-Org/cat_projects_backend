const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [80, 'Name cannot exceed 80 characters']
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    comment: {
        type: String,
        required: [true, 'Review comment is required'],
        trim: true,
        maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    approved: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Discount schema for nested discount structure
const discountSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage'
    },
    value: {
        type: Number,
        default: 0,
        min: 0
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: false
    }
});

// Product option value schema
const optionValueSchema = new mongoose.Schema({
    id: String,
    value: String,
    priceModifier: {
        type: Number,
        default: 0
    }
});

// Product option schema
const productOptionSchema = new mongoose.Schema({
    id: String,
    name: String,
    values: [optionValueSchema]
});

const catSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Cat name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    title_id: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: {
            values: ['male', 'female'],
            message: 'Gender must be either male or female'
        }
    },
    neutered: {
        type: Boolean,
        default: false
    },
    age: {
        type: String,
        required: [true, 'Age is required'],
        trim: true
    },
    breed: {
        type: String,
        required: [true, 'Breed is required'],
        trim: true
    },
    vaccinated: {
        type: Boolean,
        default: false
    },
    size: {
        type: String,
        required: [true, 'Size is required'],
        enum: {
            values: ['small', 'medium', 'large'],
            message: 'Size must be small, medium, or large'
        },
        default: 'medium'
    },
    price: {
        type: Number,
        required: [true, 'Adoption fee is required'],
        min: [0, 'Price cannot be negative']
    },
    stock: {
        type: Number,
        required: [true, 'Stock is required'],
        min: [0, 'Stock cannot be negative'],
        default: 1
    },
    features: {
        type: String,
        trim: true,
        default: '',
        maxlength: [2000, 'Features cannot exceed 2000 characters']
    },
    inStock: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    about: {
        type: String,
        trim: true,
        maxlength: [1000, 'About section cannot exceed 1000 characters']
    },
    featuredImage: {
        type: String,
        required: [true, 'Featured image is required']
    },
    gallery: {
        type: [String],
        validate: {
            validator: function (images) {
                return images.length <= 4;
            },
            message: 'Gallery cannot have more than 4 images'
        },
        default: []
    },
    status: {
        type: String,
        enum: ['available', 'adopted', 'pending', 'unavailable'],
        default: 'available'
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    adoptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    adoptionDate: {
        type: Date
    },
    reviews: [reviewSchema],
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviewCount: {
        type: Number,
        default: 0
    },
    medicalHistory: [{
        date: Date,
        description: String,
        vetName: String,
        documents: [String]
    }],
    // Discount field
    discount: {
        type: discountSchema,
        default: () => ({ type: 'percentage', value: 0, isActive: false })
    },
    // Product options
    options: {
        type: [productOptionSchema],
        default: []
    }
}, {
    timestamps: true
});

// Virtual for discounted price
catSchema.virtual('discountedPrice').get(function() {
    if (!this.discount || !this.discount.isActive || this.discount.value <= 0) {
        return this.price;
    }
    
    const price = this.price;
    if (this.discount.type === 'percentage') {
        return price * (1 - this.discount.value / 100);
    } else {
        return Math.max(0, price - this.discount.value);
    }
});

// Virtual for discount percentage
catSchema.virtual('discountPercentage').get(function() {
    if (!this.discount || !this.discount.isActive || this.discount.value <= 0) {
        return 0;
    }
    
    if (this.discount.type === 'percentage') {
        return this.discount.value;
    } else {
        return (this.discount.value / this.price) * 100;
    }
});

// Check if discount is currently active based on dates
catSchema.methods.isDiscountActive = function() {
    if (!this.discount || !this.discount.isActive || this.discount.value <= 0) {
        return false;
    }
    
    const now = new Date();
    if (this.discount.startDate && this.discount.startDate > now) {
        return false;
    }
    if (this.discount.endDate && this.discount.endDate < now) {
        return false;
    }
    
    return true;
};

// Get current price (with discount if active)
catSchema.methods.getCurrentPrice = function() {
    if (this.isDiscountActive()) {
        return this.discountedPrice;
    }
    return this.price;
};

catSchema.index({ status: 1, breed: 1 });
catSchema.index({ isFeatured: 1 });
catSchema.index({ price: 1 });
catSchema.index({ averageRating: -1 });

catSchema.pre('save', function (next) {
    // Auto-generate title_id from name
    if (this.isModified('name') || !this.title_id) {
        this.title_id = this.name
            .toLowerCase()
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, '_');
    }

    // Update inStock based on stock
    if (this.isModified('stock')) {
        if (this.stock <= 0) {
            this.inStock = false;
            if (this.status === 'available') {
                this.status = 'unavailable';
            }
        } else {
            this.inStock = true;
            if (this.status === 'unavailable') {
                this.status = 'available';
            }
        }
    }

    // Handle adoption
    if (this.isModified('status') && this.status === 'adopted') {
        this.inStock = false;
        this.stock = 0;
        if (!this.adoptionDate) {
            this.adoptionDate = new Date();
        }
    }

    next();
});

catSchema.methods.recalcRating = function () {
    const approved = this.reviews.filter((r) => r.approved);
    this.reviewCount = approved.length;
    this.averageRating =
        approved.length > 0
            ? parseFloat(
                (approved.reduce((sum, r) => sum + r.rating, 0) / approved.length).toFixed(1)
            )
            : 0;
};

catSchema.statics.findAvailable = function () {
    return this.find({ status: 'available', stock: { $gt: 0 } }).sort({ createdAt: -1 });
};

catSchema.statics.findFeatured = function () {
    return this.find({ isFeatured: true, status: 'available' }).sort({ createdAt: -1 });
};

// Ensure virtuals are included in JSON output
catSchema.set('toJSON', { virtuals: true });
catSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Cat', catSchema);