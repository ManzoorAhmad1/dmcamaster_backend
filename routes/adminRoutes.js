const router = require('express').Router();
const { authenticate, adminOnly } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const admin = require('../controllers/adminController');
const blog = require('../controllers/blogController');

router.use(authenticate, adminOnly);

router.get('/contacts', admin.getContacts);
router.get('/contacts/:id', admin.getContact);
router.put('/contacts/:id', admin.updateContact);
router.delete('/contacts/:id', admin.deleteContact);

router.get('/users', admin.getUsers);
router.get('/users/:id', admin.getUser);
router.put('/users/:id', admin.updateUser);
router.delete('/users/:id', admin.deleteUser);
router.get('/stats', admin.getStats);

router.get('/blogs', blog.adminListBlogs);
router.post('/blogs', blog.createBlog);
router.put('/blogs/:id', blog.updateBlog);
router.delete('/blogs/:id', blog.deleteBlog);

router.get('/categories', blog.adminListCategories);
router.post('/categories', blog.createCategory);
router.put('/categories/:id', blog.updateCategory);
router.delete('/categories/:id', blog.deleteCategory);

router.get('/tags', blog.adminListTags);
router.post('/tags', blog.createTag);
router.put('/tags/:id', blog.updateTag);
router.delete('/tags/:id', blog.deleteTag);

router.get('/settings', blog.getSiteSettings);
router.put('/settings', blog.updateSettings);

router.post('/uploads', (req, res) => {
  try {
    const { filename = 'image', mimeType = '', data = '' } = req.body || {};
    const allowed = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
    const ext = allowed[mimeType];
    if (!ext || !data) return res.status(400).json({ success: false, message: 'A valid JPG, PNG, WEBP or GIF image is required.' });
    const buffer = Buffer.from(String(data).replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) return res.status(400).json({ success: false, message: 'Image must be smaller than 8 MB.' });
    const uploadDir = path.join(__dirname, '..', 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    const safeBase = path.basename(filename, path.extname(filename)).replace(/[^a-z0-9_-]/gi, '-').slice(0, 60) || 'image';
    const savedName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeBase}${ext}`;
    fs.writeFileSync(path.join(uploadDir, savedName), buffer);
    const base = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
    res.status(201).json({ success: true, url: `${base.replace(/\/$/, '')}/uploads/${savedName}`, filename: savedName });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ success: false, message: 'Image upload failed.' });
  }
});

module.exports = router;
