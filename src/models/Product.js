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
      default: true,
    },
  },
  { timestamps: true }
);

// ─── Product Schema ────────────────────────────────────────────────────────────

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    title_id: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.index({ category: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ price: 1 });
productSchema.index({ averageRating: -1 });


productSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.isModified('title')) {
    this.title = this.name;
  } else if (this.isModified('title') && !this.isModified('name')) {
    this.name = this.title;
  } else if (!this.name && this.title) {
    this.name = this.title;
  } else if (!this.title && this.name) {
    this.title = this.name;
  }


  if (this.isModified('name') || !this.title_id) {
    this.title_id = this.name
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

productSchema.methods.recalcRating = function () {
  const approved = this.reviews.filter((r) => r.approved);
  this.reviewCount = approved.length;
  this.averageRating =
    approved.length > 0
      ? parseFloat(
          (approved.reduce((sum, r) => sum + r.rating, 0) / approved.length).toFixed(1)
        )
      : 0;
};

productSchema.statics.findFeatured = function () {
  return this.find({ isFeatured: true, inStock: true }).sort({ createdAt: -1 });
};

productSchema.statics.findInStock = function () {
  return this.find({ inStock: true, stock: { $gt: 0 } });
};

module.exports = mongoose.model('Product', productSchema);