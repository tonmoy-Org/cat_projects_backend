const Cat = require('../models/Cat');
const cloudinary = require('../../utils/cloudinary');
const streamifier = require('streamifier');

const getPublicId = (url) => {
    const parts = url.split('/upload/');
    const withoutVersion = parts[1].replace(/^v\d+\//, '');
    return withoutVersion.replace(/\.[^/.]+$/, '');
};

const uploadToCloudinary = (buffer, folder = 'cats') =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
        });
        streamifier.createReadStream(buffer).pipe(stream);
    });

const createCat = async (req, res) => {
    try {
        const {
            name, gender, age, breed, neutered, vaccinated, size, price, features, about,
            inStock, isFeatured, stock, options, discount
        } = req.body;

        if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
        if (!gender) return res.status(400).json({ success: false, message: 'Gender is required' });
        if (!age) return res.status(400).json({ success: false, message: 'Age is required' });
        if (!breed) return res.status(400).json({ success: false, message: 'Breed is required' });
        if (price === undefined) return res.status(400).json({ success: false, message: 'Price is required' });
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

        const title_id = name
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

        const cat = await Cat.create({
            name,
            title_id,
            gender,
            age,
            breed,
            price: parseFloat(price),
            neutered: neutered === 'true' || neutered === true,
            vaccinated: vaccinated === 'true' || vaccinated === true,
            size: size || 'medium',
            features: features || '',
            about: about || '',
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
            message: 'Cat profile created successfully',
            data: cat
        });
    } catch (error) {
        if (error.code === 11000)
            return res.status(400).json({ success: false, message: 'A cat profile with similar name already exists' });
        res.status(500).json({ success: false, message: error.message || 'Failed to create cat profile' });
    }
};

const getAllCats = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            gender,
            size,
            status,
            neutered,
            vaccinated,
            breed,
            search,
            minPrice,
            maxPrice,
            isFeatured,
            sortBy = '-createdAt',
            hasDiscount
        } = req.query;

        const filter = {};
        if (gender) filter.gender = gender;
        if (size) filter.size = size;
        if (status) filter.status = status;
        if (neutered !== undefined) filter.neutered = neutered === 'true';
        if (vaccinated !== undefined) filter.vaccinated = vaccinated === 'true';
        if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true';
        if (breed) filter.breed = { $regex: breed, $options: 'i' };

        // Filter by discount availability
        if (hasDiscount === 'true') {
            filter['discount.isActive'] = true;
            filter['discount.value'] = { $gt: 0 };
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.price = {};
            if (minPrice !== undefined) filter.price.$gte = parseFloat(minPrice);
            if (maxPrice !== undefined) filter.price.$lte = parseFloat(maxPrice);
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { breed: { $regex: search, $options: 'i' } },
                { about: { $regex: search, $options: 'i' } },
            ];
        }

        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const skip = (pageNumber - 1) * limitNumber;

        const [cats, total] = await Promise.all([
            Cat.find(filter)
                .sort(sortBy)
                .skip(skip)
                .limit(limitNumber)
                .populate('addedBy', 'name email')
                .populate('adoptedBy', 'name email'),
            Cat.countDocuments(filter),
        ]);

        // Add computed fields to response
        const catsWithComputed = cats.map(cat => ({
            ...cat.toObject(),
            discountedPrice: cat.discountedPrice,
            discountPercentage: cat.discountPercentage,
            isDiscountActive: cat.isDiscountActive(),
            currentPrice: cat.getCurrentPrice()
        }));

        res.status(200).json({
            success: true,
            count: catsWithComputed.length,
            total,
            page: pageNumber,
            pages: Math.ceil(total / limitNumber),
            data: catsWithComputed,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch cats', error: error.message });
    }
};

const getCatById = async (req, res) => {
    try {
        const { id } = req.params;

        const cat = await Cat.findOne({
            $or: [
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
                { title_id: id },
            ],
        }).populate('addedBy', 'name email').populate('adoptedBy', 'name email');

        if (!cat) return res.status(404).json({ success: false, message: 'Cat not found' });

        const catWithComputed = {
            ...cat.toObject(),
            discountedPrice: cat.discountedPrice,
            discountPercentage: cat.discountPercentage,
            isDiscountActive: cat.isDiscountActive(),
            currentPrice: cat.getCurrentPrice()
        };

        res.status(200).json({ success: true, data: catWithComputed });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch cat', error: error.message });
    }
};

const updateCat = async (req, res) => {
    try {
        const cat = await Cat.findById(req.params.id);
        if (!cat) return res.status(404).json({ success: false, message: 'Cat not found' });

        const updateData = { ...req.body };

        // Parse numeric fields
        if (updateData.price !== undefined) updateData.price = parseFloat(updateData.price);
        if (updateData.stock !== undefined) updateData.stock = parseInt(updateData.stock);

        // Parse boolean fields
        if (updateData.neutered !== undefined)
            updateData.neutered = updateData.neutered === 'true' || updateData.neutered === true;
        if (updateData.vaccinated !== undefined)
            updateData.vaccinated = updateData.vaccinated === 'true' || updateData.vaccinated === true;
        if (updateData.inStock !== undefined)
            updateData.inStock = updateData.inStock === 'true' || updateData.inStock === true;
        if (updateData.isFeatured !== undefined)
            updateData.isFeatured = updateData.isFeatured === 'true' || updateData.isFeatured === true;

        // Update title_id if name changed
        if (updateData.name && updateData.name !== cat.name) {
            updateData.title_id = updateData.name
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
                console.error('Error parsing discount:', err);
                // Keep existing discount if parsing fails
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

        let oldFeaturedImage = null;
        if (req.files?.featuredImage?.[0]) {
            try {
                const result = await uploadToCloudinary(req.files.featuredImage[0].buffer);
                updateData.featuredImage = result.secure_url;
                if (cat.featuredImage) {
                    oldFeaturedImage = getPublicId(cat.featuredImage);
                }
            } catch (uploadError) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload featured image'
                });
            }
        }

        // Handle gallery updates
        let existingGallery = cat.gallery || [];

        // Parse gallery from request if provided
        if (updateData.gallery !== undefined) {
            try {
                existingGallery = typeof updateData.gallery === 'string'
                    ? JSON.parse(updateData.gallery)
                    : updateData.gallery;
                existingGallery = existingGallery || [];
            } catch (err) {
                console.error('Error parsing gallery:', err);
                existingGallery = cat.gallery || [];
            }
            delete updateData.gallery; // Remove from updateData, we'll handle it separately
        }

        // Find removed images
        const removedImages = (cat.gallery || []).filter((url) => !existingGallery.includes(url));

        let newGalleryUrls = [];
        if (req.files?.gallery?.length > 0) {
            try {
                const remainingSlots = 4 - existingGallery.length;
                if (remainingSlots > 0) {
                    const toUpload = req.files.gallery.slice(0, remainingSlots);
                    const newResults = await Promise.all(
                        toUpload.map((file) => uploadToCloudinary(file.buffer))
                    );
                    newGalleryUrls = newResults.map((r) => r.secure_url);
                }
            } catch (uploadError) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload gallery images'
                });
            }
        }

        existingGallery = [...existingGallery, ...newGalleryUrls].slice(0, 4);
        updateData.gallery = existingGallery;

        // Remove any undefined fields from updateData
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const updated = await Cat.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        }).populate('addedBy', 'name email').populate('adoptedBy', 'name email');

        if (!updated) {
            // Clean up newly uploaded images if update failed
            if (newGalleryUrls.length > 0) {
                await Promise.all(
                    newGalleryUrls.map((url) =>
                        cloudinary.uploader.destroy(getPublicId(url)).catch(() => { })
                    )
                );
            }
            return res.status(500).json({ success: false, message: 'Failed to update cat profile' });
        }

        // Clean up old images asynchronously (don't wait for completion)
        if (oldFeaturedImage) {
            cloudinary.uploader.destroy(oldFeaturedImage).catch(() => { });
        }
        if (removedImages.length > 0) {
            Promise.all(
                removedImages.map((url) =>
                    cloudinary.uploader.destroy(getPublicId(url)).catch(() => { })
                )
            ).catch(() => { });
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
            message: 'Cat profile updated successfully',
            data: updatedWithComputed
        });
    } catch (error) {
        console.error('Update cat error:', error);
        if (error.code === 11000)
            return res.status(400).json({ success: false, message: 'A cat profile with this name already exists' });
        res.status(500).json({ success: false, message: error.message || 'Failed to update cat profile' });
    }
};

const deleteCat = async (req, res) => {
    try {
        const cat = await Cat.findById(req.params.id);
        if (!cat) return res.status(404).json({ success: false, message: 'Cat not found' });

        if (cat.featuredImage) {
            await cloudinary.uploader.destroy(getPublicId(cat.featuredImage));
        }
        if (cat.gallery?.length > 0) {
            await Promise.all(
                cat.gallery.map((url) => cloudinary.uploader.destroy(getPublicId(url)))
            );
        }

        await cat.deleteOne();

        res.status(200).json({ success: true, message: 'Cat profile deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete cat profile', error: error.message });
    }
};

const updateCatStatus = async (req, res) => {
    try {
        const { status, adoptedBy } = req.body;
        const cat = await Cat.findById(req.params.id);
        if (!cat) return res.status(404).json({ success: false, message: 'Cat not found' });

        cat.status = status;
        if (status === 'adopted') {
            cat.adoptedBy = adoptedBy || req.user?._id;
            cat.adoptionDate = new Date();
        }
        await cat.save();

        res.status(200).json({
            success: true,
            message: `Cat status updated to ${status}`,
            data: cat
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Failed to update status' });
    }
};

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

        const cat = await Cat.findOne({
            $or: [
                { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null },
                { title_id: req.params.id },
            ],
        });
        if (!cat) return res.status(404).json({ success: false, message: 'Cat not found' });
        const userId = req.user?.id || req.user?._id;

        cat.reviews.push({ name, email, rating: parsedRating, comment, approved: false, customerId: userId });
        cat.recalcRating();
        await cat.save();

        const newReview = cat.reviews[cat.reviews.length - 1];
        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            data: newReview
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to submit review' });
    }
};

const getReviews = async (req, res) => {
    try {
        const cat = await Cat.findOne({
            $or: [
                { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null },
                { title_id: req.params.id },
            ],
        }).select('reviews averageRating reviewCount');

        if (!cat) return res.status(404).json({ success: false, message: 'Cat not found' });

        const approved = cat.reviews.filter((r) => r.approved);
        res.status(200).json({
            success: true,
            averageRating: cat.averageRating,
            reviewCount: cat.reviewCount,
            data: approved,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch reviews', error: error.message });
    }
};

const deleteReview = async (req, res) => {
    try {
        const cat = await Cat.findById(req.params.id);
        if (!cat) return res.status(404).json({ success: false, message: 'Cat not found' });

        const review = cat.reviews.id(req.params.reviewId);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        review.deleteOne();
        cat.recalcRating();
        await cat.save();

        res.status(200).json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete review', error: error.message });
    }
};

const toggleReviewApproval = async (req, res) => {
    try {
        const cat = await Cat.findById(req.params.id);
        if (!cat) return res.status(404).json({ success: false, message: 'Cat not found' });

        const review = cat.reviews.id(req.params.reviewId);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        review.approved = !review.approved;
        cat.recalcRating();
        await cat.save();

        res.status(200).json({
            success: true,
            message: `Review ${review.approved ? 'approved' : 'unapproved'} successfully`,
            data: review,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update review', error: error.message });
    }
};

const addMedicalHistory = async (req, res) => {
    try {
        const cat = await Cat.findById(req.params.id);
        if (!cat) return res.status(404).json({ success: false, message: 'Cat not found' });

        cat.medicalHistory.push({ ...req.body, date: new Date() });
        await cat.save();

        res.status(201).json({
            success: true,
            message: 'Medical history added successfully',
            data: cat.medicalHistory
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Failed to add medical history' });
    }
};

const getCatsByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const { limit = 20 } = req.query;

        const cats = await Cat.find({ status }).limit(parseInt(limit)).sort('-createdAt');

        const catsWithComputed = cats.map(cat => ({
            ...cat.toObject(),
            discountedPrice: cat.discountedPrice,
            discountPercentage: cat.discountPercentage,
            isDiscountActive: cat.isDiscountActive(),
            currentPrice: cat.getCurrentPrice()
        }));

        res.status(200).json({ success: true, count: catsWithComputed.length, data: catsWithComputed });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch cats', error: error.message });
    }
};

module.exports = {
    createCat,
    getAllCats,
    getCatById,
    updateCat,
    deleteCat,
    updateCatStatus,
    addMedicalHistory,
    getCatsByStatus,
    addReview,
    getReviews,
    deleteReview,
    toggleReviewApproval,
};