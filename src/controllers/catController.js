const Cat = require('../models/Cat');
const cloudinary = require('cloudinary').v2;

const createCat = async (req, res) => {
    try {
        const catData = {
            ...req.body,
            addedBy: req.user?._id || req.user?.id
        };

        const cat = await Cat.create(catData);

        res.status(201).json({
            success: true,
            data: cat,
            message: 'Cat profile created successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create cat profile'
        });
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
            sortBy = '-createdAt'
        } = req.query;

        const filter = {};

        if (gender) filter.gender = gender;
        if (size) filter.size = size;
        if (status) filter.status = status;
        if (neutered !== undefined) filter.neutered = neutered === 'true';
        if (vaccinated !== undefined) filter.vaccinated = vaccinated === 'true';
        if (breed) filter.breed = { $regex: breed, $options: 'i' };

        if (search) {
            filter.$text = { $search: search };
        }

        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const skip = (pageNumber - 1) * limitNumber;

        const cats = await Cat.find(filter)
            .sort(sortBy)
            .limit(limitNumber)
            .skip(skip)
            .populate('addedBy', 'name email')
            .populate('adoptedBy', 'name email');

        const total = await Cat.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: cats.length,
            total,
            page: pageNumber,
            pages: Math.ceil(total / limitNumber),
            data: cats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cats',
            error: error.message
        });
    }
};

const getCatById = async (req, res) => {
    try {
        const cat = await Cat.findById(req.params.id)
            .populate('addedBy', 'name email')
            .populate('adoptedBy', 'name email');

        if (!cat) {
            return res.status(404).json({
                success: false,
                message: 'Cat not found'
            });
        }

        await cat.incrementViews();

        res.status(200).json({
            success: true,
            data: cat
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cat',
            error: error.message
        });
    }
};

const updateCat = async (req, res) => {
    try {
        let cat = await Cat.findById(req.params.id);

        if (!cat) {
            return res.status(404).json({
                success: false,
                message: 'Cat not found'
            });
        }

        if (req.body.gallery && req.body.gallery.length > 4) {
            req.body.gallery = req.body.gallery.slice(0, 4);
        }

        cat = await Cat.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            success: true,
            data: cat,
            message: 'Cat profile updated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update cat profile'
        });
    }
};

const deleteCat = async (req, res) => {
    try {
        const cat = await Cat.findById(req.params.id);

        if (!cat) {
            return res.status(404).json({
                success: false,
                message: 'Cat not found'
            });
        }

        if (cat.featuredImage) {
            const publicId = cat.featuredImage.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
        }

        if (cat.gallery && cat.gallery.length > 0) {
            for (const imageUrl of cat.gallery) {
                const publicId = imageUrl.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
        }

        await cat.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Cat profile deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete cat profile',
            error: error.message
        });
    }
};

const updateCatStatus = async (req, res) => {
    try {
        const { status, adoptedBy } = req.body;

        const cat = await Cat.findById(req.params.id);

        if (!cat) {
            return res.status(404).json({
                success: false,
                message: 'Cat not found'
            });
        }

        cat.status = status;

        if (status === 'adopted') {
            cat.adoptedBy = adoptedBy || req.user?._id;
            cat.adoptionDate = new Date();
        }

        await cat.save();

        res.status(200).json({
            success: true,
            data: cat,
            message: `Cat status updated to ${status}`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update status'
        });
    }
};

const addMedicalHistory = async (req, res) => {
    try {
        const cat = await Cat.findById(req.params.id);

        if (!cat) {
            return res.status(404).json({
                success: false,
                message: 'Cat not found'
            });
        }

        cat.medicalHistory.push({
            ...req.body,
            date: new Date()
        });

        await cat.save();

        res.status(201).json({
            success: true,
            data: cat.medicalHistory,
            message: 'Medical history added successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to add medical history'
        });
    }
};

const getCatsByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const { limit = 20 } = req.query;

        const cats = await Cat.find({ status })
            .limit(parseInt(limit))
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: cats.length,
            data: cats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cats',
            error: error.message
        });
    }
};

const getFeaturedCats = async (req, res) => {
    try {
        const { limit = 6 } = req.query;

        const cats = await Cat.aggregate([
            { $match: { status: 'available' } },
            { $sample: { size: parseInt(limit) } }
        ]);

        res.status(200).json({
            success: true,
            count: cats.length,
            data: cats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch featured cats',
            error: error.message
        });
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
    getFeaturedCats
};