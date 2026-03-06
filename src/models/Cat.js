const mongoose = require('mongoose');

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

catSchema.virtual('formattedAge').get(function () {
  return this.age;
});

catSchema.virtual('galleryCount').get(function () {
  return this.gallery ? this.gallery.length : 0;
});

catSchema.index({ name: 'text', breed: 'text', about: 'text' });

catSchema.pre('save', function (next) {
  if (this.gallery && this.gallery.length > 4) {
    this.gallery = this.gallery.slice(0, 4);
  }
  next();
});

catSchema.statics.getAvailable = function () {
  return this.find({ status: 'available' }).sort('-createdAt');
};

catSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.title_id = this.name
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "_");
  }
  next();
});

module.exports = mongoose.model('Cat', catSchema);