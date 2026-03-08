const Product = require('../models/Product');
const cloudinary = require('../../utils/cloudinary');
const streamifier = require('streamifier');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getPublicId = (url) => {
  const parts = url.split('/upload/');
  const withoutVersion = parts[1].replace(/^v\d+\//, '');
  return withoutVersion.replace(/\.[^/.]+$/, '');
};

const uploadToCloudinary = (buffer, folder = 'products') =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

// ─── Products ─────────────────────────────────────────────────────────────────

const createProduct = async (req, res) => {
  try {
    const { title, price, description, features, category, material, inStock, isFeatured } = req.body;

    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    if (!price) return res.status(400).json({ success: false, message: 'Price is required' });
    if (!description) return res.status(400).json({ success: false, message: 'Description is required' });
    if (!req.files?.featuredImage?.[0])
      return res.status(400).json({ success: false, message: 'Featured image is required' });

    const featuredResult = await uploadToCloudinary(req.files.featuredImage[0].buffer);

    let galleryUrls = [];
    if (req.files?.gallery?.length > 0) {
      const results = await Promise.all(
        req.files.gallery.slice(0, 4).map((file) => uploadToCloudinary(file.buffer))
      );
      galleryUrls = results.map((r) => r.secure_url);
    }

    const title_id = title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '_');

    const product = await Product.create({
      title,
      title_id,
      price: parseFloat(price),
      description,
      features: features || '',
      category: category || '',
      material: material || '',
      inStock: inStock === 'true' || inStock === true,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      featuredImage: featuredResult.secure_url,
      gallery: galleryUrls,
      addedBy: req.user?._id || req.user?.id,
    });

    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ success: false, message: 'A product with a similar title already exists' });
    res.status(500).json({ success: false, message: error.message || 'Failed to create product' });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      featured,
      inStock,
      category,
      sortBy = '-createdAt',
    } = req.query;

    const filter = {};
    if (featured !== undefined) filter.isFeatured = featured === 'true';
    if (inStock !== undefined) filter.inStock = inStock === 'true';
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (search)
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { material: { $regex: search, $options: 'i' } },
      ];

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortBy)
        .skip(skip)
        .limit(limitNumber)
        .populate('addedBy', 'name email'),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNumber,
      pages: Math.ceil(total / limitNumber),
      data: products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        { title_id: id },
      ],
    }).populate('addedBy', 'name email');

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch product', error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const updateData = { ...req.body };

    if (updateData.price !== undefined) updateData.price = parseFloat(updateData.price);
    if (updateData.isFeatured !== undefined)
      updateData.isFeatured = updateData.isFeatured === 'true' || updateData.isFeatured === true;
    if (updateData.inStock !== undefined)
      updateData.inStock = updateData.inStock === 'true' || updateData.inStock === true;

    if (updateData.title && updateData.title !== product.title) {
      updateData.title_id = updateData.title
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '_');
    }

    // Featured image
    if (req.files?.featuredImage?.[0]) {
      if (product.featuredImage) await cloudinary.uploader.destroy(getPublicId(product.featuredImage));
      const result = await uploadToCloudinary(req.files.featuredImage[0].buffer);
      updateData.featuredImage = result.secure_url;
    }

    // Gallery reconciliation
    let existingGallery = [];
    if (updateData.gallery) {
      try {
        existingGallery =
          typeof updateData.gallery === 'string'
            ? JSON.parse(updateData.gallery)
            : updateData.gallery;
      } catch {
        existingGallery = [];
      }
    }

    const removedImages = (product.gallery || []).filter((url) => !existingGallery.includes(url));
    await Promise.all(removedImages.map((url) => cloudinary.uploader.destroy(getPublicId(url))));

    if (req.files?.gallery?.length > 0) {
      const remainingSlots = 4 - existingGallery.length;
      const toUpload = req.files.gallery.slice(0, remainingSlots);
      const newUrls = await Promise.all(toUpload.map((file) => uploadToCloudinary(file.buffer)));
      existingGallery = [...existingGallery, ...newUrls.map((r) => r.secure_url)];
    }

    updateData.gallery = existingGallery.slice(0, 4);

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, message: 'Product updated successfully', data: updated });
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ success: false, message: 'A product with this title already exists' });
    res.status(500).json({ success: false, message: error.message || 'Failed to update product' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    if (product.featuredImage) await cloudinary.uploader.destroy(getPublicId(product.featuredImage));
    if (product.gallery?.length > 0)
      await Promise.all(product.gallery.map((url) => cloudinary.uploader.destroy(getPublicId(url))));

    await product.deleteOne();
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete product', error: error.message });
  }
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

/**
 * POST /products/:id/reviews
 * Public — anyone can post a review
 */
const addReview = async (req, res) => {
  try {
    const { name, email, rating, comment } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    if (!rating) return res.status(400).json({ success: false, message: 'Rating is required' });
    if (!comment) return res.status(400).json({ success: false, message: 'Comment is required' });

    const parsedRating = parseInt(rating, 10);
    if (parsedRating < 1 || parsedRating > 5)
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });

    const product = await Product.findOne({
      $or: [
        { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null },
        { title_id: req.params.id },
      ],
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    product.reviews.push({ name, email, rating: parsedRating, comment });
    product.recalcRating();
    await product.save();

    const newReview = product.reviews[product.reviews.length - 1];
    res.status(201).json({ success: true, message: 'Review submitted successfully', data: newReview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to submit review' });
  }
};

/**
 * GET /products/:id/reviews
 * Public — returns only approved reviews
 */
const getReviews = async (req, res) => {
  try {
    const product = await Product.findOne({
      $or: [
        { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null },
        { title_id: req.params.id },
      ],
    }).select('reviews averageRating reviewCount');

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const approved = product.reviews.filter((r) => r.approved);
    res.status(200).json({
      success: true,
      averageRating: product.averageRating,
      reviewCount: product.reviewCount,
      data: approved,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reviews', error: error.message });
  }
};

/**
 * DELETE /products/:id/reviews/:reviewId
 * Protected (admin) — delete a review
 */
const deleteReview = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const review = product.reviews.id(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    review.deleteOne();
    product.recalcRating();
    await product.save();

    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete review', error: error.message });
  }
};

/**
 * PATCH /products/:id/reviews/:reviewId/approve
 * Protected (admin) — toggle review approval
 */
const toggleReviewApproval = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const review = product.reviews.id(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    review.approved = !review.approved;
    product.recalcRating();
    await product.save();

    res.status(200).json({
      success: true,
      message: `Review ${review.approved ? 'approved' : 'unapproved'} successfully`,
      data: review,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update review', error: error.message });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addReview,
  getReviews,
  deleteReview,
  toggleReviewApproval,
};