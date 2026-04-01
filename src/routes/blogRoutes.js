const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
  createBlog,
  getBlogs,
  getBlogById,
  getMyBlogs,
  updateBlog,
  deleteBlog,
} = require('../controllers/blogController');

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 5 * 1024 * 1024 } 
});

router.route('/')
  .get(getBlogs);

router.route('/:id')
  .get(getBlogById);

router.use(protect);

router.route('/')
  .post(upload.single('image'), createBlog);

router.get('/my/blogs', getMyBlogs);

router.route('/:id')
  .put(upload.single('image'), updateBlog)
  .delete(deleteBlog);

module.exports = router;