const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    title_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    excerpt: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    petType: {
      type: String,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    author: {
      type: String,
      required: true,
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

blogSchema.index({
  title: "text",
  content: "text",
  tags: "text",
  author: "text",
  type: "text",
});

blogSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.title_id = this.title
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "_");
  }
  next();
});

module.exports = mongoose.models.Blog || mongoose.model("Blog", blogSchema);
