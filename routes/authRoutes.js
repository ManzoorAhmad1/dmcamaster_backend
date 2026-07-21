const router = require('express').Router();
const {
  signup, verifyOtp, login, resendOtp,
  forgotPassword, resetPassword, getMe, changePassword,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 12, message: 'Too many authentication attempts. Please wait 15 minutes.' });
const otpLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 8, message: 'Too many code requests. Please wait before trying again.' });

router.post('/signup', authLimit, signup);
router.post('/verify-otp', otpLimit, verifyOtp);
router.post('/resend-otp', otpLimit, resendOtp);
router.post('/login', authLimit, login);
router.post('/forgot-password', otpLimit, forgotPassword);
router.post('/reset-password', otpLimit, resetPassword);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
