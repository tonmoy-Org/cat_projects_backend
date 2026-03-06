const Blog = require("../models/Blog");
const User = require("../models/User");
const cloudinary = require('../../utils/cloudinary');
const streamifier = require('streamifier');

const getPublicId = (url) => {
  const parts = url.split('/upload/');
  const withoutVersion = parts[1].replace(/^v\d+\//, '');
  return withoutVersion.replace(/\.[^/.]+$/, '');
};

// Helper: upload buffer to Cloudinary via stream
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'blogs' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const createBlog = async (req, res) => {
  try {
    const {
      title,
      content,
      category,
      petType,
      isFeatured,
      tags,
      excerpt,
      publishedAt,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const author = user.name || user.email || "Unknown Author";

    if (!title || !content || !category) {
      return res.status(400).json({ error: "Title, content, and category are required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Featured image is required" });
    }

    // Upload image to Cloudinary from backend
    const uploadResult = await uploadToCloudinary(req.file.buffer);
    const imageUrl = uploadResult.secure_url;

    const titleId = title
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "_");

    const parsedTags = tags
      ? (typeof tags === 'string' ? JSON.parse(tags) : tags).filter(t => t.trim() !== "")
      : [];

    const newBlog = new Blog({
      title,
      title_id: titleId,
      content,
      imageUrl,
      category,
      petType,
      author,
      authorId: req.user.id,
      excerpt,
      isFeatured: isFeatured === 'true' || isFeatured === true || false,
      tags: parsedTags,
      publishedAt: publishedAt || new Date(),
    });

    await newBlog.save();

    res.status(201).json({ message: "Blog created successfully", blog: newBlog });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "A blog with similar title already exists" });
    }
    res.status(500).json({ error: "Failed to create blog", details: error.message });
  }
};

const getBlogs = async (req, res) => {
  try {
    const {
      category, featured, search, author, petType,
      sort = "-createdAt", page = 1, limit = 10,
    } = req.query;

    const query = {};
    if (category) query.category = category;
    if (featured) query.isFeatured = featured === "true";
    if (author) query.author = author;
    if (petType) query.petType = petType;
    if (search) query.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [blogs, totalCount] = await Promise.all([
      Blog.find(query).sort(sort).skip(skip).limit(parseInt(limit)).select("-__v"),
      Blog.countDocuments(query),
    ]);

    res.status(200).json({
      blogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch blogs", details: error.message });
  }
};

const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findOne({ title_id: req.params.id });
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.status(200).json(blog);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch blog", details: error.message });
  }
};

const getMyBlogs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const blogs = await Blog.find({
      $or: [{ author: user.name }, { author: user.email }, { authorId: req.user.id }],
    }).sort("-createdAt").select("-__v");

    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch your blogs", details: error.message });
  }
};

const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const existingBlog = await Blog.findById(id);
    if (!existingBlog) return res.status(404).json({ error: "Blog not found" });

    // If a new image file was uploaded, replace the old one
    if (req.file) {
      // Delete old image from Cloudinary
      if (existingBlog.imageUrl) {
        const publicId = getPublicId(existingBlog.imageUrl);
        await cloudinary.uploader.destroy(publicId);
      }
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      updateData.imageUrl = uploadResult.secure_url;
    }

    if (updateData.title) {
      updateData.title_id = updateData.title
        .toLowerCase()
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, "_");
    }

    if (updateData.tags) {
      const parsed = typeof updateData.tags === 'string' ? JSON.parse(updateData.tags) : updateData.tags;
      updateData.tags = parsed.filter(tag => tag.trim() !== "");
    }

    if (updateData.isFeatured !== undefined) {
      updateData.isFeatured = updateData.isFeatured === 'true' || updateData.isFeatured === true;
    }

    const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ message: "Blog updated successfully", blog: updatedBlog });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "A blog with this title already exists" });
    }
    res.status(500).json({ error: "Failed to update blog", details: error.message });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const existingBlog = await Blog.findById(id);
    if (!existingBlog) return res.status(404).json({ error: "Blog not found" });

    if (existingBlog.imageUrl) {
      const publicId = getPublicId(existingBlog.imageUrl);
      await cloudinary.uploader.destroy(publicId);
    }

    await Blog.findByIdAndDelete(id);
    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete blog", details: error.message });
  }
};

module.exports = {
  createBlog,
  getBlogs,
  getBlogById,
  getMyBlogs,
  updateBlog,
  deleteBlog
};