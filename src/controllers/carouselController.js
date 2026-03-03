const Carousel = require("../models/Carousel");

const getNextOrder = async () => {
  const lastItem = await Carousel.findOne().sort({ order: -1 });
  return lastItem ? lastItem.order + 1 : 0;
};

const listCarousel = async (req, res) => {
  try {
    const { page = 1, limit = 20, isActive } = req.query;

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [total, carouselItems] = await Promise.all([
      Carousel.countDocuments(filter),
      Carousel.find(filter)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    res.status(200).json({
      success: true,
      count: carouselItems.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: carouselItems,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while fetching carousel items",
    });
  }
};

const getCarousel = async (req, res) => {
  try {
    const carousel = await Carousel.findById(req.params.id);

    if (!carousel) {
      return res.status(404).json({
        success: false,
        message: "Carousel item not found",
      });
    }

    res.status(200).json({
      success: true,
      data: carousel,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while fetching carousel item",
    });
  }
};

const createCarousel = async (req, res) => {
  try {
    const {
      title,
      smallTitle,
      paragraph,
      btnText,
      btnLink,
      order,
      isActive,
      image,
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!paragraph) {
      return res.status(400).json({
        success: false,
        message: "Paragraph is required",
      });
    }

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Image URL is required",
      });
    }

    const finalOrder = order !== undefined ? order : await getNextOrder();

    const carousel = new Carousel({
      title,
      smallTitle: smallTitle || "",
      paragraph,
      btnText: btnText || "Learn More",
      btnLink: btnLink || "#",
      image,
      order: finalOrder,
      isActive: isActive === true || isActive === "true",
    });

    await carousel.save();

    res.status(201).json({
      success: true,
      message: "Carousel item created successfully",
      data: carousel,
    });
  } catch (error) {
    console.error("Create carousel error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating carousel item",
      error: error.message,
    });
  }
};

const updateCarousel = async (req, res) => {
  try {
    const carousel = await Carousel.findById(req.params.id);

    if (!carousel) {
      return res.status(404).json({
        success: false,
        message: "Carousel item not found",
      });
    }

    const totalCount = await Carousel.countDocuments();
    const updateData = {};
    const allowedFields = [
      "title",
      "smallTitle",
      "paragraph",
      "btnText",
      "btnLink",
      "order",
      "isActive",
      "image",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "isActive") {
          updateData[field] =
            req.body[field] === "true" || req.body[field] === true;
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    if (updateData.order !== undefined) {
      let newOrder = parseInt(updateData.order);

      if (isNaN(newOrder) || newOrder < 1) {
        newOrder = 1;
      }

      if (newOrder > totalCount) {
        newOrder = totalCount;
      }

      const oldOrder = carousel.order;

      if (newOrder !== oldOrder) {
        if (newOrder > oldOrder) {
          await Carousel.updateMany(
            {
              order: { $gt: oldOrder, $lte: newOrder },
            },
            { $inc: { order: -1 } },
          );
        } else {
          await Carousel.updateMany(
            {
              order: { $gte: newOrder, $lt: oldOrder },
            },
            { $inc: { order: 1 } },
          );
        }
      }

      updateData.order = newOrder;
    }

    const updatedCarousel = await Carousel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Carousel item updated successfully",
      data: updatedCarousel,
    });
  } catch (error) {
    console.error("Update carousel error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating carousel item",
      error: error.message,
    });
  }
};

const deleteCarousel = async (req, res) => {
  try {
    const carousel = await Carousel.findById(req.params.id);

    if (!carousel) {
      return res.status(404).json({
        success: false,
        message: "Carousel item not found",
      });
    }

    await Carousel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Carousel item deleted successfully",
    });
  } catch (error) {
    console.error("Delete carousel error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting carousel item",
    });
  }
};

module.exports = {
  listCarousel,
  getCarousel,
  createCarousel,
  updateCarousel,
  deleteCarousel,
};
