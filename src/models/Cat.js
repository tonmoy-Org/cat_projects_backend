const mongoose = require('mongoose');

// ─── Review Schema ─────────────────────────────────────────────────────────────

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
      default: false, // Requires admin approval for pet reviews
    },
  },
  { timestamps: true }
);

// ─── Cat Schema ───────────────────────────────────────────────────────────────

const catSchema = new mongoose.Schema(
  {
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
      lowercase: true,
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
      min: [0, 'Price cannot be negative'],
      default: 0
    },
    features: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Features cannot exceed 2000 characters']
    },

    inStock: {
      type: Boolean,
      default: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
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

    medicalHistory: [{
      date: Date,
      description: String,
      vetName: String,
      documents: [String]
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);


catSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.title_id) {
    this.title_id = this.name
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '_');
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


module.exports = mongoose.model('Cat', catSchema);