require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../config/db');
const { sendEmail } = require('../config/mailer');
const { contactEmailTemplate } = require('../utils/emailTemplates');
const { validateContactForm } = require('../utils/validate');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'legal@dmcamaster.com';

const sendContactEmail = async (req, res) => {
  try {
    const check = validateContactForm(req.body);
    if (!check.valid) return res.status(400).json({ success: false, message: check.message });

    const { firstName, lastName = '', email, phone = '', message } = req.body;
    const id = uuidv4();
    const db = getDB();
    await db.execute(
      'INSERT INTO contacts (id,first_name,last_name,email,phone,message,status) VALUES (?,?,?,?,?,?,?)',
      [id, firstName.trim(), lastName.trim(), email.trim().toLowerCase(), phone.trim(), message.trim(), 'New']
    );

    // Saving to the admin panel is the primary action. Email is best-effort.
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `New Contact: ${firstName} ${lastName} — DMCA Master`,
      html: contactEmailTemplate({ firstName, lastName, email, phone, message }),
    }).catch(err => console.warn('[MAIL] Contact notification failed:', err.message));

    return res.status(201).json({ success: true, message: 'Your message has been received.', contactId: id });
  } catch (err) {
    console.error('Contact submission error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to submit your message. Please try again.' });
  }
};

module.exports = { sendContactEmail };
