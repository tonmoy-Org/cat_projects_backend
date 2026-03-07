const Cat = require('../models/Cat');
const cloudinary = require('../../utils/cloudinary');
const streamifier = require('streamifier');

const getPublicId = (url) => {
    const parts = url.split('/upload/');
    const withoutVersion = parts[1].replace(/^v\d+\//, '');
    return withoutVersion.replace(/\.[^/.]+$/, '');
};

const uploadToCloudinary = (buffer, folder = 'cats') => {
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

const createCat = async (req, res) => {
    try {
        const catData = {
            ...req.body,
            addedBy: req.user?._id || req.user?.id,
        };

        // Parse boolean fields sent as strings in FormData
        if (catData.neutered !== undefined) catData.neutered = catData.neutered === 'true';
        if (catData.vaccinated !== undefined) catData.vaccinated = catData.vaccinated === 'true';

        if (catData.name && !catData.title_id) {
            catData.title_id = catData.name
                .toLowerCase()
                .replace(/[^\w\s]/gi, '')
                .replace(/\s+/g, '_');
        }

        // Upload featured image
        if (req.files?.featuredImage?.[0]) {
            const result = await uploadToCloudinary(req.files.featuredImage[0].buffer);
            catData.featuredImage = result.secure_url;
        }

        // Upload gallery images
        if (req.files?.gallery && req.files.gallery.length > 0) {
            const galleryUrls = await Promise.all(
                req.files.gallery.map(file => uploadToCloudinary(file.buffer))
            );
            catData.gallery = galleryUrls.map(r => r.secure_url);
        }

        const cat = await Cat.create(catData);

        res.status(201).json({
            success: true,
            data: cat,
            message: 'Cat profile created successfully',
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create cat profile',
        });
    }
};

const getAllCats = async (req, res) => {
    try {
        const {
            page = 1, limit = 10, gender, size, status,
            neutered, vaccinated, breed, search, sortBy = '-createdAt',
        } = req.query;

        const filter = {};
        if (gender) filter.gender = gender;
        if (size) filter.size = size;
        if (status) filter.status = status;
        if (neutered !== undefined) filter.neutered = neutered === 'true';
        if (vaccinated !== undefined) filter.vaccinated = vaccinated === 'true';
        if (breed) filter.breed = { $regex: breed, $options: 'i' };
        if (search) filter.$text = { $search: search };

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
            data: cats,
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
                { title_id: id }
            ]
        })
            .populate('addedBy', 'name email')
            .populate('adoptedBy', 'name email');

        if (!cat) return res.status(404).json({ success: false, message: 'Cat not found' });

        res.status(200).json({ success: true, data: cat });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch cat', error: error.message });
    }
};

const updateCat = async (req, res) => {
    try {
        let cat = await Cat.findById(req.params.id);
        if (!cat) return res.status(404).json({ success: false, message: 'Cat not found' });

        const updateData = { ...req.body };

        // Parse boolean fields
        if (updateData.neutered !== undefined) updateData.neutered = updateData.neutered === 'true';
        if (updateData.vaccinated !== undefined) updateData.vaccinated = updateData.vaccinated === 'true';

        // Regenerate title_id if name changed
        if (updateData.name && updateData.name !== cat.name) {
            updateData.title_id = updateData.name
                .toLowerCase()
                .replace(/[^\w\s]/gi, '')
                .replace(/\s+/g, '_');
        }

        // Upload new featured image and delete old one
        if (req.files?.featuredImage?.[0]) {
            if (cat.featuredImage) {
                const publicId = getPublicId(cat.featuredImage);
                await cloudinary.uploader.destroy(publicId);
            }
            const result = await uploadToCloudinary(req.files.featuredImage[0].buffer);
            updateData.featuredImage = result.secure_url;
        }

        // Upload new gallery images (appended to existing, capped at 4)
        if (req.files?.gallery && req.files.gallery.length > 0) {
            const existingGallery = cat.gallery || [];
            const remainingSlots = 4 - existingGallery.length;
            const filesToUpload = req.files.gallery.slice(0, remainingSlots);

            const newGalleryUrls = await Promise.all(
                filesToUpload.map(file => uploadToCloudinary(file.buffer))
            );
            updateData.gallery = [...existingGallery, ...newGalleryUrls.map(r => r.secure_url)];
        }

        // Handle gallery removal - frontend sends remaining gallery URLs as JSON string
        if (updateData.gallery && typeof updateData.gallery === 'string') {
            try {
                updateData.gallery = JSON.parse(updateData.gallery);
            } catch {
                // already an array or invalid, skip
            }
        }

        // Delete removed gallery images from Cloudinary
        if (updateData.gallery && Array.isArray(updateData.gallery)) {
            const removedImages = (cat.gallery || []).filter(url => !updateData.gallery.includes(url));
            await Promise.all(removedImages.map(url => cloudinary.uploader.destroy(getPublicId(url))));
            if (updateData.gallery.length > 4) updateData.gallery = updateData.gallery.slice(0, 4);
        }

        cat = await Cat.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

        res.status(200).json({ success: true, data: cat, message: 'Cat profile updated successfully' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Failed to update cat profile' });
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
            await Promise.all(cat.gallery.map(url => cloudinary.uploader.destroy(getPublicId(url))));
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

        res.status(200).json({ success: true, data: cat, message: `Cat status updated to ${status}` });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Failed to update status' });
    }
};

const addMedicalHistory = async (req, res) => {
    try {
        const cat = await Cat.findById(req.params.id);
        if (!cat) return res.status(404).json({ success: false, message: 'Cat not found' });

        cat.medicalHistory.push({ ...req.body, date: new Date() });
        await cat.save();

        res.status(201).json({ success: true, data: cat.medicalHistory, message: 'Medical history added successfully' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Failed to add medical history' });
    }
};

const getCatsByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const { limit = 20 } = req.query;

        const cats = await Cat.find({ status }).limit(parseInt(limit)).sort('-createdAt');

        res.status(200).json({ success: true, count: cats.length, data: cats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch cats', error: error.message });
    }
};

module.exports = {
    createCat, getAllCats, getCatById, updateCat, deleteCat,
    updateCatStatus, addMedicalHistory, getCatsByStatus,
};