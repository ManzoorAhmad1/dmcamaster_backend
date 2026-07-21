const router = require('express').Router();
const blog = require('../controllers/blogController');

router.get('/blogs', blog.listPublicBlogs);
router.get('/blogs/:slug', blog.getPublicBlog);
router.get('/blog-categories', blog.getCategories);
router.get('/blog-tags', blog.getTags);
router.get('/site-settings', blog.getSiteSettings);

module.exports = router;
