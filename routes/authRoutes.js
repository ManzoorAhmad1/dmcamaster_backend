// ─── routes/authRoutes.js ─────────────────────────────────────────────────────
const router = require('express').Router();
const {
  signup, verifyOtp, login, resendOtp,
  forgotPassword, resetPassword, getMe, changePassword,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/signup',           signup);
router.post('/verify-otp',       verifyOtp);
router.post('/resend-otp',       resendOtp);
router.post('/login',            login);
router.post('/forgot-password',  forgotPassword);
router.post('/reset-password',   resetPassword);
router.get ('/me',               authenticate, getMe);
router.put ('/change-password',  authenticate, changePassword);

module.exports = router;
