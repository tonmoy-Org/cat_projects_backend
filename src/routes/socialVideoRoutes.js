const express = require('express');
const {
  getSocialVideos,
  uploadSocialVideo,
  updateSocialVideo,
  deleteSocialVideo,
} = require('../controllers/socialVideoController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(getSocialVideos);

router.use(protect);

router.route('/')
  .post(uploadSocialVideo);

router.route('/:id')
  .put(updateSocialVideo)
  .delete(deleteSocialVideo);

module.exports = router;