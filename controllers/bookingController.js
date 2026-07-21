require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../config/db');
const { sendEmail } = require('../config/mailer');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'legal@dmcamaster.com';
const TIMEZONE = 'Asia/Karachi';
const SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM',
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const clean = (value, max = 1000) => String(value || '').trim().slice(0, max);
const escapeHtml = value => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\"/g, '&quot;')
  .replace(/'/g, '&#039;');

const createReference = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CALL-${year}-${random}`;
};

const isBookableDate = dateString => {
  if (!datePattern.test(dateString)) return false;
  const selected = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(selected.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selected < today) return false;
  const day = selected.getDay();
  return day !== 0 && day !== 6;
};

const getAvailability = async (req, res) => {
  try {
    const date = clean(req.query.date, 10);
    if (!isBookableDate(date)) {
      return res.status(400).json({ success: false, message: 'Choose a valid weekday date.' });
    }
    const [rows] = await getDB().execute(
      `SELECT booking_time FROM bookings
       WHERE booking_date = ? AND status <> 'Cancelled'
       ORDER BY booking_time`,
      [date]
    );
    return res.json({ success: true, date, timezone: TIMEZONE, slots: SLOTS, booked: rows.map(row => row.booking_time) });
  } catch (error) {
    console.error('Booking availability error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load available times.' });
  }
};

const createBooking = async (req, res) => {
  const name = clean(req.body.name, 160);
  const email = clean(req.body.email, 255).toLowerCase();
  const phone = clean(req.body.phone, 80);
  const website = clean(req.body.website, 500);
  const issue = clean(req.body.issue, 255);
  const message = clean(req.body.message, 5000);
  const bookingDate = clean(req.body.bookingDate, 10);
  const bookingTime = clean(req.body.bookingTime, 30);

  if (!name || !email || !issue || !bookingDate || !bookingTime) {
    return res.status(400).json({ success: false, message: 'Name, email, issue, date and time are required.' });
  }
  if (!emailPattern.test(email)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }
  if (!isBookableDate(bookingDate) || !SLOTS.includes(bookingTime)) {
    return res.status(400).json({ success: false, message: 'Choose a valid available date and time.' });
  }

  const db = getDB();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute(
      `SELECT id FROM bookings
       WHERE booking_date = ? AND booking_time = ? AND status <> 'Cancelled'
       LIMIT 1 FOR UPDATE`,
      [bookingDate, bookingTime]
    );
    if (existing.length) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'That time has just been booked. Please select another slot.' });
    }

    const id = uuidv4();
    const bookingRef = createReference();
    await connection.execute(
      `INSERT INTO bookings
       (id,booking_ref,name,email,phone,website,issue,message,booking_date,booking_time,timezone,status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'Pending')`,
      [id, bookingRef, name, email, phone, website, issue, message, bookingDate, bookingTime, TIMEZONE]
    );
    await connection.commit();

    const safe = {
      bookingRef: escapeHtml(bookingRef), bookingDate: escapeHtml(bookingDate),
      bookingTime: escapeHtml(bookingTime), timezone: escapeHtml(TIMEZONE),
      name: escapeHtml(name), email: escapeHtml(email),
      phone: escapeHtml(phone || 'Not provided'), website: escapeHtml(website || 'Not provided'),
      issue: escapeHtml(issue), message: escapeHtml(message || 'No message provided.').replace(/\n/g, '<br>'),
    };
    const notificationHtml = `
      <h2>New strategy call booking</h2>
      <p><strong>Reference:</strong> ${safe.bookingRef}</p>
      <p><strong>Date:</strong> ${safe.bookingDate}</p>
      <p><strong>Time:</strong> ${safe.bookingTime} (${safe.timezone})</p>
      <p><strong>Name:</strong> ${safe.name}</p>
      <p><strong>Email:</strong> ${safe.email}</p>
      <p><strong>Phone:</strong> ${safe.phone}</p>
      <p><strong>Website:</strong> ${safe.website}</p>
      <p><strong>Issue:</strong> ${safe.issue}</p>
      <p><strong>Message:</strong><br>${safe.message}</p>`;

    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Strategy Call ${bookingRef} - ${bookingDate} ${bookingTime}`,
      html: notificationHtml,
    }).catch(error => console.warn('[MAIL] Booking admin notification failed:', error.message));

    sendEmail({
      to: email,
      subject: `Your DMCA Master strategy call request - ${bookingRef}`,
      html: `<h2>Your request has been received</h2><p>Hello ${safe.name},</p><p>Your strategy call request is pending confirmation.</p><p><strong>Date:</strong> ${safe.bookingDate}<br><strong>Time:</strong> ${safe.bookingTime} (${safe.timezone})<br><strong>Reference:</strong> ${safe.bookingRef}</p><p>Our team will send the meeting details after confirming your slot.</p>`,
    }).catch(error => console.warn('[MAIL] Booking customer confirmation failed:', error.message));

    return res.status(201).json({
      success: true,
      message: 'Your strategy call request has been received.',
      booking: { id, bookingRef, bookingDate, bookingTime, timezone: TIMEZONE, status: 'Pending' },
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) { /* no-op */ }
    console.error('Create booking error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to book this call. Please try again.' });
  } finally {
    connection.release();
  }
};

module.exports = { createBooking, getAvailability, SLOTS };
