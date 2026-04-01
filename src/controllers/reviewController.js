const Cat = require('../models/Cat');
const Product = require('../models/Product');

const getReviewsByCustomer = async (req, res) => {
    try {
        const { customerId } = req.query;

        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: 'customerId is required'
            });
        }

        const [cats, products] = await Promise.all([
            Cat.find({ 'reviews.customerId': customerId })
                .select('name title_id featuredImage reviews'),

            Product.find({ 'reviews.customerId': customerId })
                .select('name title_id featuredImage reviews')
        ]);

        const customerReviews = [];

        const extractReviews = (items, itemType) => {
            items.forEach((item) => {
                const filteredReviews = item.reviews.filter(
                    (review) => review.customerId?.toString() === customerId
                );

                filteredReviews.forEach((review) => {
                    customerReviews.push({
                        itemId: item._id,
                        itemName: item.name,
                        title_id: item.title_id,
                        featuredImage: item.featuredImage,
                        type: itemType,
                        ...review._doc
                    });
                });
            });
        };

        extractReviews(cats, 'cat');
        extractReviews(products, 'product');

        res.status(200).json({
            success: true,
            total: customerReviews.length,
            data: customerReviews
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customer reviews'
        });
    }
};

module.exports = {
    getReviewsByCustomer
};