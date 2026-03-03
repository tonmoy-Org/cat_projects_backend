const Blog = require("../models/Blog");
const User = require("../models/User");

const createBlog = async (req, res) => {
  try {
    const {
      title,
      content,
      imageUrl,
      category,
      petType,
      isFeatured,
      tags,
      excerpt,
      publishedAt,
    } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const author = user.name || user.email || "Unknown Author";

    if (!title || !content || !imageUrl || !category) {
      return res.status(400).json({
        error: "Title, content, image URL, and category are required",
      });
    }

    const titleId = title
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "_");

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
      isFeatured: isFeatured || false,
      tags: tags ? tags.filter((tag) => tag.trim() !== "") : [],
      publishedAt: publishedAt || new Date(),
    });

    await newBlog.save();

    res.status(201).json({
      message: "Blog created successfully",
      blog: newBlog,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error: "A blog with similar title already exists",
      });
    }
    res.status(500).json({
      error: "Failed to create blog",
      details: error.message,
    });
  }
};

const getBlogs = async (req, res) => {
  try {
    const {
      category,
      featured,
      search,
      author,
      petType,
      sort = "-createdAt",
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};
    if (category) query.category = category;
    if (featured) query.isFeatured = featured === "true";
    if (author) query.author = author;
    if (petType) query.petType = petType;
    if (search) query.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [blogs, totalCount] = await Promise.all([
      Blog.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select("-__v"),
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
    res.status(500).json({
      error: "Failed to fetch blogs",
      details: error.message,
    });
  }
};

const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findOne({ title_id: req.params.id });

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.status(200).json(blog);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch blog",
      details: error.message,
    });
  }
};

const getMyBlogs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const blogs = await Blog.find({
      $or: [
        { author: user.name },
        { author: user.email },
        { authorId: req.user.id },
      ],
    })
      .sort("-createdAt")
      .select("-__v");

    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch your blogs",
      details: error.message,
    });
  }
};

const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const existingBlog = await Blog.findById(id);

    if (!existingBlog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    if (updateData.title) {
      updateData.title_id = updateData.title
        .toLowerCase()
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, "_");
    }

    if (updateData.tags) {
      updateData.tags = updateData.tags.filter((tag) => tag.trim() !== "");
    }

    const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      message: "Blog updated successfully",
      blog: updatedBlog,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error: "A blog with this title already exists",
      });
    }

    res.status(500).json({
      error: "Failed to update blog",
      details: error.message,
    });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const existingBlog = await Blog.findById(id);

    if (!existingBlog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    await Blog.findByIdAndDelete(id);

    res.status(200).json({
      message: "Blog deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete blog",
      details: error.message,
    });
  }
};

module.exports = {
  createBlog,
  getBlogs,
  getBlogById,
  getMyBlogs,
  updateBlog,
  deleteBlog,
};
