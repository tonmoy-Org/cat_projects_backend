const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    approved: {
      type: Boolean,
      default: false,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
  },
  { timestamps: true }
);

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

// ─── Product Schema ────────────────────────────────────────────────────────────
const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    title_id: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      required: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    features: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    material: {
      type: String,
      trim: true,
      default: '',
    },
    stock: {
      type: Number,
      default: 1,
      min: [0, 'Stock cannot be negative'],
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    featuredImage: {
      type: String,
      required: [true, 'Featured image is required'],
    },
    gallery: {
      type: [String],
      validate: {
        validator: (arr) => arr.length <= 4,
        message: 'Gallery cannot exceed 4 images',
      },
      default: [],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviews: {
      type: [reviewSchema],
      default: [],
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    // Discount field (similar to Cat model)
    discount: {
      type: discountSchema,
      default: () => ({ type: 'percentage', value: 0, isActive: false })
    },
    // Product options
    options: {
      type: [productOptionSchema],
      default: []
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for discounted price
productSchema.virtual('discountedPrice').get(function() {
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
productSchema.virtual('discountPercentage').get(function() {
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
productSchema.methods.isDiscountActive = function() {
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
productSchema.methods.getCurrentPrice = function() {
  if (this.isDiscountActive()) {
    return this.discountedPrice;
  }
  return this.price;
};

// Indexes
productSchema.index({ category: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ price: 1 });
productSchema.index({ averageRating: -1 });

// Pre-save middleware
productSchema.pre('save', function (next) {
  // Generate title_id from title
  if (this.isModified('title') || !this.title_id) {
    this.title_id = this.title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '_');
  }

  // Keep inStock flag in sync with stock count
  if (this.isModified('stock')) {
    this.inStock = this.stock > 0;
  }

  next();
});

// Method to recalculate ratings
productSchema.methods.recalcRating = function () {
  const approvedReviews = this.reviews.filter((r) => r.approved === true);
  this.reviewCount = approvedReviews.length;
  
  if (approvedReviews.length > 0) {
    const sum = approvedReviews.reduce((total, review) => total + review.rating, 0);
    this.averageRating = parseFloat((sum / approvedReviews.length).toFixed(1));
  } else {
    this.averageRating = 0;
  }
  
  return this;
};

// Static methods
productSchema.statics.findFeatured = function () {
  return this.find({ isFeatured: true, inStock: true }).sort({ createdAt: -1 });
};

productSchema.statics.findInStock = function () {
  return this.find({ inStock: true, stock: { $gt: 0 } });
};

// Add a pre-update middleware for findByIdAndUpdate
productSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  if (update.stock !== undefined) {
    update.inStock = update.stock > 0;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);