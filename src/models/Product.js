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
      default: true, // set false if you want manual moderation
    },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
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
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    // Extra rich-text features/highlights block (editable from dashboard)
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
    // Denormalised for fast sorting/filtering
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
  { timestamps: true }
);

// Auto-generate title_id
productSchema.pre('save', function (next) {
  if (this.isModified('title') || !this.title_id) {
    this.title_id = this.title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '_');
  }
  next();
});

// Recalculate averageRating & reviewCount whenever reviews change
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

module.exports = mongoose.model('Product', productSchema);