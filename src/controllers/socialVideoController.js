const SocialVideo = require("../models/SocialVideo");

const getSocialVideos = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;

    const total = await SocialVideo.countDocuments();

    const videos = await SocialVideo.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      status: "success",
      data: videos,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    next(error);
  }
};

const uploadSocialVideo = async (req, res, next) => {
  try {
    const video = new SocialVideo(req.body);
    await video.save();

    res.status(201).json({
      status: "success",
      data: video
    });
  } catch (error) {
    next(error);
  }
};

const updateSocialVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { url, title } = req.body;

    const result = await SocialVideo.findByIdAndUpdate(
      id,
      { url, title },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        status: "fail",
        message: "Social video not found"
      });
    }

    res.status(200).json({
      status: "success",
      data: result,
      message: "Social video updated successfully"
    });
  } catch (error) {
    next(error);
  }
};

const deleteSocialVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await SocialVideo.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({
        status: "fail",
        message: "Social video not found"
      });
    }

    res.status(200).json({
      status: "success",
      message: "Social video deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSocialVideos,
  uploadSocialVideo,
  updateSocialVideo,
  deleteSocialVideo
};