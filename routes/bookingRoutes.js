const router = require('express').Router();
const rateLimit = require('../middleware/rateLimit');
const { createBooking, getAvailability } = require('../controllers/bookingController');

const bookingLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: 'Too many booking attempts. Please try again later.',
});

router.get('/bookings/availability', getAvailability);
router.post('/bookings', bookingLimit, createBooking);

module.exports = router;
