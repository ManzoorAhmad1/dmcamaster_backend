// ─── controllers/contactController.js ────────────────────────────────────────
// Handles the public contact form email submission.
// ──────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const { sendEmail }             = require('../config/mailer');
const { contactEmailTemplate }  = require('../utils/emailTemplates');
const { validateContactForm }   = require('../utils/validate');

// Admin inbox — where contact form submissions land (set in .env)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'legal@dmcamaster.com';

// ─── POST /api/send-email ─────────────────────────────────────────────────────
const sendContactEmail = async (req, res) => {
  try {
    const check = validateContactForm(req.body);
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const { firstName, lastName, email, phone, message } = req.body;

    await sendEmail({
      to:      ADMIN_EMAIL,
      subject: `New Contact: ${firstName} ${lastName || ''} — DMCA Master`,
      html:    contactEmailTemplate({ firstName, lastName, email, phone, message }),
    });

    return res.status(200).json({ success: true, message: 'Email sent successfully!' });
  } catch (err) {
    console.error('Contact email error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to send email. Please try again later.',
    });
  }
};

module.exports = { sendContactEmail };
