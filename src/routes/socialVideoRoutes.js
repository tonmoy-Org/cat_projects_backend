const express = require("express");
const router = express.Router();
const {
  getSocialVideos,
  uploadSocialVideo,
  updateSocialVideo,
  deleteSocialVideo,
} = require("../controllers/socialVideoController");

router.get("/", getSocialVideos);
router.post("/", uploadSocialVideo);
router.put("/:id", updateSocialVideo);
router.delete("/:id", deleteSocialVideo);

module.exports = router;
