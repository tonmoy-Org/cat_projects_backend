const mongoose = require('mongoose');

const catSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Cat name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
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
      validator: function(images) {
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
  views: {
    type: Number,
    default: 0
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
  medicalHistory: [{
    date: Date,
    description: String,
    vetName: String,
    documents: [String]
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted age (if age is stored as string like "2 Years")
catSchema.virtual('formattedAge').get(function() {
  return this.age;
});

// Virtual for gallery count
catSchema.virtual('galleryCount').get(function() {
  return this.gallery ? this.gallery.length : 0;
});

// Index for search
catSchema.index({ name: 'text', breed: 'text', about: 'text' });

// Pre-save middleware to ensure gallery doesn't exceed limit
catSchema.pre('save', function(next) {
  if (this.gallery && this.gallery.length > 4) {
    this.gallery = this.gallery.slice(0, 4);
  }
  next();
});

// Method to increment view count
catSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Static method to get available cats
catSchema.statics.getAvailable = function() {
  return this.find({ status: 'available' }).sort('-createdAt');
};

module.exports = mongoose.model('Cat', catSchema);