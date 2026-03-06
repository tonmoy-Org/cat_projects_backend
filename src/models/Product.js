const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
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
}, { timestamps: true });

productSchema.pre('save', function (next) {
  if (this.isModified('title') || !this.title_id) {
    this.title_id = this.title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '_');
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);