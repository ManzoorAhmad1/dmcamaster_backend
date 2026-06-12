// ─── routes/contactRoutes.js ──────────────────────────────────────────────────
const router = require('express').Router();
const { sendContactEmail } = require('../controllers/contactController');

router.post('/send-email', sendContactEmail);

module.exports = router;
