const Product = require('../models/Product');
const cloudinary = require('../../utils/cloudinary');
const streamifier = require('streamifier');

const getPublicId = (url) => {
  const parts = url.split('/upload/');
  const withoutVersion = parts[1].replace(/^v\d+\//, '');
  return withoutVersion.replace(/\.[^/.]+$/, '');
};

const uploadToCloudinary = (buffer, folder = 'products') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const createProduct = async (req, res) => {
  try {
    const { title, price, description, features, category, material, inStock, isFeatured, stock, options, discount } = req.body;

    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    if (!price) return res.status(400).json({ success: false, message: 'Price is required' });
    if (!description) return res.status(400).json({ success: false, message: 'Description is required' });
    if (!req.files?.featuredImage?.[0]) {
      return res.status(400).json({ success: false, message: 'Featured image is required' });
    }

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

    // Parse discount if provided
    let discountData = {
      type: 'percentage',
      value: 0,
      isActive: false
    };
    if (discount) {
      const parsedDiscount = typeof discount === 'string' ? JSON.parse(discount) : discount;
      discountData = {
        type: parsedDiscount.type || 'percentage',
        value: parsedDiscount.value || 0,
        startDate: parsedDiscount.startDate ? new Date(parsedDiscount.startDate) : null,
        endDate: parsedDiscount.endDate ? new Date(parsedDiscount.endDate) : null,
        isActive: parsedDiscount.isActive || false
      };
    }

    // Parse options if provided
    let optionsData = [];
    if (options) {
      optionsData = typeof options === 'string' ? JSON.parse(options) : options;
    }

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
      stock: stock ? parseInt(stock) : 1,
      featuredImage: featuredResult.secure_url,
      gallery: galleryUrls,
      addedBy: req.user?._id || req.user?.id,
      discount: discountData,
      options: optionsData
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A product with a similar title already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
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
      hasDiscount,
      sortBy = '-createdAt',
    } = req.query;

    const filter = {};
    if (featured !== undefined) filter.isFeatured = featured === 'true';
    if (inStock !== undefined) filter.inStock = inStock === 'true';
    if (category) filter.category = { $regex: category, $options: 'i' };

    // Filter by discount availability
    if (hasDiscount === 'true') {
      filter['discount.isActive'] = true;
      filter['discount.value'] = { $gt: 0 };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { material: { $regex: search, $options: 'i' } },
      ];
    }

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

    // Add computed fields to response
    const productsWithComputed = products.map(product => ({
      ...product.toObject(),
      discountedPrice: product.discountedPrice,
      discountPercentage: product.discountPercentage,
      isDiscountActive: product.isDiscountActive(),
      currentPrice: product.getCurrentPrice()
    }));

    res.status(200).json({
      success: true,
      count: productsWithComputed.length,
      total,
      page: pageNumber,
      pages: Math.ceil(total / limitNumber),
      data: productsWithComputed,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      $or: [
        { _id: /^[0-9a-fA-F]{24}$/.test(id) ? id : null },
        { title_id: id },
      ],
    }).populate('addedBy', 'name email');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const productWithComputed = {
      ...product.toObject(),
      discountedPrice: product.discountedPrice,
      discountPercentage: product.discountPercentage,
      isDiscountActive: product.isDiscountActive(),
      currentPrice: product.getCurrentPrice()
    };

    res.status(200).json({ success: true, data: productWithComputed });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updateData = { ...req.body };

    // Parse numeric fields
    if (updateData.price !== undefined) updateData.price = parseFloat(updateData.price);
    if (updateData.stock !== undefined) updateData.stock = parseInt(updateData.stock);

    // Parse boolean fields
    if (updateData.isFeatured !== undefined) {
      updateData.isFeatured = updateData.isFeatured === 'true' || updateData.isFeatured === true;
    }
    if (updateData.inStock !== undefined) {
      updateData.inStock = updateData.inStock === 'true' || updateData.inStock === true;
    }

    // Handle title update to generate title_id
    if (updateData.title && updateData.title !== product.title) {
      updateData.title_id = updateData.title
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '_');
    }

    // Handle discount update - safely parse if it exists
    if (updateData.discount !== undefined) {
      try {
        let discountData;
        if (typeof updateData.discount === 'string') {
          discountData = JSON.parse(updateData.discount);
        } else {
          discountData = updateData.discount;
        }

        updateData.discount = {
          type: discountData.type || 'percentage',
          value: discountData.value || 0,
          startDate: discountData.startDate ? new Date(discountData.startDate) : null,
          endDate: discountData.endDate ? new Date(discountData.endDate) : null,
          isActive: discountData.isActive || false
        };
      } catch (err) {
        // If discount parsing fails, keep existing discount
        console.error('Error parsing discount:', err);
        delete updateData.discount;
      }
    }

    // Handle options update - safely parse if it exists
    if (updateData.options !== undefined) {
      try {
        updateData.options = typeof updateData.options === 'string'
          ? JSON.parse(updateData.options)
          : updateData.options;
      } catch (err) {
        console.error('Error parsing options:', err);
        delete updateData.options;
      }
    }

    // Handle featured image update
    if (req.files?.featuredImage?.[0]) {
      if (product.featuredImage) {
        try {
          await cloudinary.uploader.destroy(getPublicId(product.featuredImage));
        } catch (err) {
          console.error('Error deleting old featured image:', err);
        }
      }
      const result = await uploadToCloudinary(req.files.featuredImage[0].buffer);
      updateData.featuredImage = result.secure_url;
    }

    // Handle gallery updates
    let existingGallery = product.gallery || [];

    // Parse gallery from request if provided
    if (updateData.gallery !== undefined) {
      try {
        existingGallery = typeof updateData.gallery === 'string'
          ? JSON.parse(updateData.gallery)
          : updateData.gallery;
        existingGallery = existingGallery || [];
      } catch (err) {
        console.error('Error parsing gallery:', err);
        existingGallery = product.gallery || [];
      }
      delete updateData.gallery; // Remove from updateData, we'll handle it separately
    }

    // Delete removed images from Cloudinary
    const removedImages = (product.gallery || []).filter(url => !existingGallery.includes(url));
    await Promise.all(
      removedImages.map(async (url) => {
        try {
          if (url) await cloudinary.uploader.destroy(getPublicId(url));
        } catch (err) {
          console.error('Error deleting gallery image:', err);
        }
      })
    );

    // Upload new gallery images
    if (req.files?.gallery?.length > 0) {
      const remainingSlots = 4 - existingGallery.length;
      if (remainingSlots > 0) {
        const toUpload = req.files.gallery.slice(0, remainingSlots);
        const newUrls = await Promise.all(
          toUpload.map(file => uploadToCloudinary(file.buffer))
        );
        existingGallery = [...existingGallery, ...newUrls.map(r => r.secure_url)];
      }
    }

    updateData.gallery = existingGallery.slice(0, 4);

    // Remove any undefined fields from updateData
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('addedBy', 'name email');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Product not found after update' });
    }

    const updatedWithComputed = {
      ...updated.toObject(),
      discountedPrice: updated.discountedPrice,
      discountPercentage: updated.discountPercentage,
      isDiscountActive: updated.isDiscountActive(),
      currentPrice: updated.getCurrentPrice()
    };

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedWithComputed
    });
  } catch (error) {
    console.error('Update product error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A product with this title already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.featuredImage) {
      await cloudinary.uploader.destroy(getPublicId(product.featuredImage));
    }
    if (product.gallery?.length > 0) {
      await Promise.all(
        product.gallery.map(url => cloudinary.uploader.destroy(getPublicId(url)))
      );
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

const addReview = async (req, res) => {
  try {
    const { name, email, rating, comment } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if (!rating) {
      return res.status(400).json({ success: false, message: 'Rating is required' });
    }
    if (!comment) {
      return res.status(400).json({ success: false, message: 'Comment is required' });
    }

    const parsedRating = parseInt(rating, 10);
    if (parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const { id } = req.params;
    let query = {};

    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      query = { _id: id };
    } else {
      query = { title_id: id };
    }

    const product = await Product.findOne(query);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const userId = req.user?._id || req.user?.id;

    product.reviews.push({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      rating: parsedRating,
      comment: comment.trim(),
      approved: false,
      customerId: userId
    });

    product.recalcRating();
    await product.save();

    const newReview = product.reviews[product.reviews.length - 1];

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully and awaiting approval',
      data: newReview
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review',
      error: error.message
    });
  }
};

const getReviews = async (req, res) => {
  try {
    const product = await Product.findOne({
      $or: [
        { _id: /^[0-9a-fA-F]{24}$/.test(req.params.id) ? req.params.id : null },
        { title_id: req.params.id },
      ],
    }).select('reviews averageRating reviewCount');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      averageRating: product.averageRating,
      reviewCount: product.reviewCount,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
};

const deleteReview = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const review = product.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    review.deleteOne();
    product.recalcRating();
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: error.message
    });
  }
};

const toggleReviewApproval = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const review = product.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    review.approved = !review.approved;
    product.recalcRating();
    await product.save();

    res.status(200).json({
      success: true,
      message: `Review ${review.approved ? 'approved' : 'unapproved'} successfully`,
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update review',
      error: error.message
    });
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