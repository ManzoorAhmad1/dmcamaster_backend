const router = require('express').Router();
const { sendContactEmail } = require('../controllers/contactController');
const rateLimit = require('../middleware/rateLimit');
const contactLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many contact submissions. Please try again later.' });
router.post('/send-email', contactLimit, sendContactEmail);
module.exports = router;
