const Cat = require('../models/Cat');
const Product = require('../models/Product');

const searchAll = async (req, res) => {
  try {
    const { q, limit = 20, page = 1, type } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchTerm = q.trim();
    const limitNum = parseInt(limit, 10);
    const pageNum = parseInt(page, 10);
    const skip = (pageNum - 1) * limitNum;

    let cats = [];
    let products = [];
    let totalCats = 0;
    let totalProducts = 0;

    // Search query for text search
    const searchQuery = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { title: { $regex: searchTerm, $options: 'i' } },
        { breed: { $regex: searchTerm, $options: 'i' } },
        { about: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    // If type is specified, search only that model
    if (type === 'cat') {
      const catsQuery = Cat.find(searchQuery)
        .select('-reviews -medicalHistory')
        .limit(limitNum)
        .skip(skip)
        .sort({ createdAt: -1 });

      const [catsResult, catsCount] = await Promise.all([
        catsQuery,
        Cat.countDocuments(searchQuery)
      ]);

      cats = catsResult;
      totalCats = catsCount;

    } else if (type === 'product') {
      const productsQuery = Product.find(searchQuery)
        .select('-reviews')
        .populate('addedBy', 'name email')
        .limit(limitNum)
        .skip(skip)
        .sort({ createdAt: -1 });

      const [productsResult, productsCount] = await Promise.all([
        productsQuery,
        Product.countDocuments(searchQuery)
      ]);

      products = productsResult;
      totalProducts = productsCount;

    } else {
      // Search both models
      const [catsResult, productsResult, catsCount, productsCount] = await Promise.all([
        Cat.find(searchQuery)
          .select('-reviews -medicalHistory')
          .limit(limitNum)
          .skip(skip)
          .sort({ createdAt: -1 }),
        Product.find(searchQuery)
          .select('-reviews')
          .populate('addedBy', 'name email')
          .limit(limitNum)
          .skip(skip)
          .sort({ createdAt: -1 }),
        Cat.countDocuments(searchQuery),
        Product.countDocuments(searchQuery)
      ]);

      cats = catsResult;
      products = productsResult;
      totalCats = catsCount;
      totalProducts = productsCount;
    }

    // Calculate pagination
    const total = type === 'cat' ? totalCats : (type === 'product' ? totalProducts : totalCats + totalProducts);
    const totalPages = Math.ceil(total / limitNum);

    // Format results
    const formattedCats = cats.map(cat => ({
      id: cat._id,
      text: cat.name,
      title_id: cat.title_id,
      type: 'cat',
      image: cat.featuredImage,
      price: cat.price,
      currentPrice: cat.currentPrice,
      breed: cat.breed,
      age: cat.age,
      status: cat.status,
      url: `/adoption/${cat.title_id}`
    }));

    const formattedProducts = products.map(product => ({
      id: product._id,
      text: product.title,
      title_id: product.title_id,
      type: 'product',
      image: product.featuredImage,
      price: product.price,
      currentPrice: product.currentPrice,
      category: product.category,
      url: `/shop/${product.title_id}`
    }));

    // Combine and sort results (optional: sort by relevance or date)
    let results = [...formattedCats, ...formattedProducts];

    // Sort by relevance (exact matches first)
    results.sort((a, b) => {
      const aExact = a.text.toLowerCase() === searchTerm.toLowerCase();
      const bExact = b.text.toLowerCase() === searchTerm.toLowerCase();
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    });

    res.status(200).json({
      success: true,
      count: results.length,
      total: total,
      page: pageNum,
      pages: totalPages,
      data: {
        cats: formattedCats,
        products: formattedProducts,
        all: results
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing search',
      error: error.message
    });
  }
};

const getSuggestions = async (req, res) => {
  try {
    const { q, limit = 8 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchTerm = q.trim();
    const limitNum = parseInt(limit, 10);

    // Create search regex
    const searchRegex = { $regex: searchTerm, $options: 'i' };

    // Search for cats
    const cats = await Cat.find({
      $or: [
        { name: searchRegex },
        { breed: searchRegex }
      ]
    })
      .select('name featuredImage breed title_id price currentPrice')
      .limit(limitNum)
      .lean();

    // Search for products
    const products = await Product.find({
      $or: [
        { title: searchRegex },
        { category: searchRegex }
      ]
    })
      .select('title featuredImage category title_id price currentPrice')
      .limit(limitNum)
      .lean();

    // Format suggestions
    const suggestions = [];

    // Add cat suggestions
    cats.forEach(cat => {
      suggestions.push({
        text: cat.name,
        type: 'cat',
        title_id: cat.title_id,
        image: cat.featuredImage,
        id: cat._id,
        url: `/adoption/${cat.title_id}`,
        price: cat.currentPrice || cat.price,
        metadata: {
          breed: cat.breed
        }
      });
    });

    // Add product suggestions
    products.forEach(product => {
      suggestions.push({
        text: product.title,
        type: 'product',
        title_id: product.title_id,
        image: product.featuredImage,
        id: product._id,
        url: `/shop/${product.title_id}`,
        price: product.currentPrice || product.price,
        metadata: {
          category: product.category
        }
      });
    });

    // Limit suggestions
    const limitedSuggestions = suggestions.slice(0, limitNum);

    res.status(200).json({
      success: true,
      count: limitedSuggestions.length,
      suggestions: limitedSuggestions,
      query: searchTerm
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting suggestions',
      error: error.message
    });
  }
};

const advancedSearch = async (req, res) => {
  try {
    const {
      q,
      type,
      minPrice,
      maxPrice,
      breed,
      category,
      gender,
      age,
      status,
      inStock,
      isFeatured,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = 20,
      page = 1
    } = req.query;

    const limitNum = parseInt(limit, 10);
    const pageNum = parseInt(page, 10);
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    let cats = [];
    let products = [];
    let totalCats = 0;
    let totalProducts = 0;

    // Build cat filter
    const catFilter = {};
    if (q) {
      catFilter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { breed: { $regex: q, $options: 'i' } },
        { about: { $regex: q, $options: 'i' } }
      ];
    }
    if (breed) catFilter.breed = { $regex: breed, $options: 'i' };
    if (gender) catFilter.gender = gender;
    if (age) catFilter.age = age;
    if (status) catFilter.status = status;
    if (minPrice || maxPrice) {
      catFilter.currentPrice = {};
      if (minPrice) catFilter.currentPrice.$gte = parseFloat(minPrice);
      if (maxPrice) catFilter.currentPrice.$lte = parseFloat(maxPrice);
    }

    // Build product filter
    const productFilter = {};
    if (q) {
      productFilter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }
    if (category) productFilter.category = { $regex: category, $options: 'i' };
    if (inStock !== undefined) productFilter.inStock = inStock === 'true';
    if (isFeatured !== undefined) productFilter.isFeatured = isFeatured === 'true';
    if (minPrice || maxPrice) {
      productFilter.currentPrice = {};
      if (minPrice) productFilter.currentPrice.$gte = parseFloat(minPrice);
      if (maxPrice) productFilter.currentPrice.$lte = parseFloat(maxPrice);
    }

    if (type === 'cat') {
      const [catsResult, catsCount] = await Promise.all([
        Cat.find(catFilter).sort(sort).limit(limitNum).skip(skip).lean(),
        Cat.countDocuments(catFilter)
      ]);
      cats = catsResult;
      totalCats = catsCount;
    } else if (type === 'product') {
      const [productsResult, productsCount] = await Promise.all([
        Product.find(productFilter).sort(sort).limit(limitNum).skip(skip).lean(),
        Product.countDocuments(productFilter)
      ]);
      products = productsResult;
      totalProducts = productsCount;
    } else {
      const [catsResult, productsResult, catsCount, productsCount] = await Promise.all([
        Cat.find(catFilter).sort(sort).limit(limitNum).skip(skip).lean(),
        Product.find(productFilter).sort(sort).limit(limitNum).skip(skip).lean(),
        Cat.countDocuments(catFilter),
        Product.countDocuments(productFilter)
      ]);
      cats = catsResult;
      products = productsResult;
      totalCats = catsCount;
      totalProducts = productsCount;
    }

    const total = type === 'cat' ? totalCats : (type === 'product' ? totalProducts : totalCats + totalProducts);
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      count: cats.length + products.length,
      total,
      page: pageNum,
      pages: totalPages,
      data: {
        cats,
        products
      }
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing advanced search',
      error: error.message
    });
  }
};

const getByTitleId = async (req, res) => {
  try {
    const { title_id } = req.params;

    // Search in both collections
    const [cat, product] = await Promise.all([
      Cat.findOne({ title_id }),
      Product.findOne({ title_id })
    ]);

    if (!cat && !product) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Determine which one was found and return appropriate response
    const result = cat || product;
    const type = cat ? 'cat' : 'product';

    res.status(200).json({
      success: true,
      type: type,
      data: result
    });

  } catch (error) {
    console.error('Get by title id error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting item',
      error: error.message
    });
  }
};

const getAllData = async (req, res) => {
  try {
    const [cats, products] = await Promise.all([
      Cat.find().sort({ createdAt: -1 }),
      Product.find().sort({ createdAt: -1 })
    ]);

    // Combine into single array with type indicator
    const allItems = [
      ...cats.map(cat => ({ ...cat.toObject(), itemType: 'cat' })),
      ...products.map(prod => ({ ...prod.toObject(), itemType: 'product' }))
    ];

    res.status(200).json({
      success: true,
      data: {
        items: allItems,  // Combined array
        cats,             // Keep separate if needed
        products
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server Error"
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
    const cat = await Cat.findOne(query);

    if (!product && !cat) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Handle review for product or cat
    let item = product || cat;
    let itemType = product ? 'product' : 'cat';

    const userId = req.user?._id || req.user?.id;

    item.reviews.push({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      rating: parsedRating,
      comment: comment.trim(),
      approved: false,
      customerId: userId
    });

    item.recalcRating();
    await item.save();

    const newReview = item.reviews[item.reviews.length - 1];

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
    const { id } = req.params;

    let query = {};
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      query = { _id: id };
    } else {
      query = { title_id: id };
    }

    const product = await Product.findOne(query);
    const cat = await Cat.findOne(query);

    if (!product && !cat) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const item = product || cat;
    const approvedReviews = item.reviews.filter(r => r.approved);

    res.status(200).json({
      success: true,
      averageRating: item.averageRating,
      reviewCount: item.reviewCount,
      data: approvedReviews,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { id, reviewId } = req.params;

    const product = await Product.findById(id);
    const cat = await Cat.findById(id);
    
    if (!product && !cat) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const item = product || cat;
    const review = item.reviews.id(reviewId);
    
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    review.deleteOne();
    item.recalcRating();
    await item.save();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: error.message
    });
  }
};

module.exports = {
  searchAll,
  getAllData,
  getSuggestions,
  advancedSearch,
  getByTitleId,
  addReview,
  getReviews,
  deleteReview
};