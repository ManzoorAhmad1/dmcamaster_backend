// ─── controllers/authController.js ───────────────────────────────────────────
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const { getDB }                 = require('../config/db');
const { sendEmail }             = require('../config/mailer');
const { otpEmailTemplate,
        resetOtpEmailTemplate } = require('../utils/emailTemplates');
const {
  validateSignup, validateLogin,
  validateForgotPassword, validateResetPassword, validateChangePassword,
} = require('../utils/validate');

const JWT_SECRET  = process.env.JWT_SECRET  || 'dmcamaster_super_secret_jwt_2026_hostinger';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

const dbQuery = async (sql, params = []) => {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const db = getDB();
      return await db.execute(sql, params);
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise(r => setTimeout(r, 500));
    }
  }
};

const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const check = validateSignup(req.body);
    if (!check.valid) return res.status(400).json({ success: false, message: check.message });

    const { name, email, password } = req.body;
    const [existing] = await dbQuery('SELECT id, is_verified FROM users WHERE email=?', [email.toLowerCase()]);

    if (existing.length && !existing[0].is_verified) {
      const otp = generateOTP();
      const exp = new Date(Date.now() + 600000);
      await dbQuery('UPDATE users SET otp=?,otp_expires=?,otp_type=? WHERE id=?', [otp, exp, 'signup', existing[0].id]);
      sendEmail({ to: email, subject: 'Your DMCA Master verification code', html: otpEmailTemplate(name.trim(), otp) }).catch(() => {});
      return res.json({ success: true, otpSent: true, message: 'Verification code sent to your email.' });
    }
    if (existing.length) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

    const hash    = await bcrypt.hash(password, 12);
    const id      = uuidv4();
    const otp     = generateOTP();
    const exp     = new Date(Date.now() + 600000);

    await dbQuery('INSERT INTO users (id,name,email,password,is_verified,otp,otp_expires,otp_type) VALUES (?,?,?,?,0,?,?,?)',
      [id, name.trim(), email.toLowerCase(), hash, otp, exp, 'signup']);

    sendEmail({ to: email, subject: 'Your DMCA Master verification code', html: otpEmailTemplate(name.trim(), otp) })
      .catch(e => console.warn('  ⚠️  OTP email failed:', e.message));

    return res.status(201).json({ success: true, otpSent: true, message: 'Enter the 6-digit code sent to your email.' });
  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { email, otp, type } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and code are required.' });

    const [rows] = await dbQuery(
      'SELECT * FROM users WHERE email=? AND otp=? AND otp_type=? AND otp_expires>NOW()',
      [email.toLowerCase(), String(otp).trim(), type || 'signup']
    );
    if (!rows.length) return res.status(400).json({ success: false, message: 'Invalid or expired code.' });

    const user = rows[0];

    if (type === 'signup') {
      await dbQuery('UPDATE users SET is_verified=1,otp=NULL,otp_expires=NULL,otp_type=NULL WHERE id=?', [user.id]);
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      return res.json({ success: true, verified: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }

    if (type === 'reset') {
      const resetToken = uuidv4();
      await dbQuery('UPDATE users SET reset_token=?,reset_expires=?,otp=NULL,otp_expires=NULL,otp_type=NULL WHERE id=?',
        [resetToken, new Date(Date.now() + 900000), user.id]);
      return res.json({ success: true, verified: true, resetToken });
    }

    return res.status(400).json({ success: false, message: 'Unknown OTP type.' });
  } catch (err) {
    console.error('Verify OTP error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/auth/resend-otp
const resendOtp = async (req, res) => {
  try {
    const { email, type } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const [rows] = await dbQuery('SELECT id,name,is_verified FROM users WHERE email=?', [email.toLowerCase()]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'No account found.' });

    const user = rows[0];
    if (type === 'signup' && user.is_verified) return res.status(400).json({ success: false, message: 'Account already verified.' });

    const otp = generateOTP();
    const exp = new Date(Date.now() + 600000);
    await dbQuery('UPDATE users SET otp=?,otp_expires=?,otp_type=? WHERE id=?', [otp, exp, type || 'signup', user.id]);

    const subject = type === 'reset' ? 'Your DMCA Master password reset code' : 'Your DMCA Master verification code';
    const html    = type === 'reset' ? resetOtpEmailTemplate(user.name, otp) : otpEmailTemplate(user.name, otp);
    await sendEmail({ to: email, subject, html });

    return res.json({ success: true, message: 'New code sent to your email.' });
  } catch (err) {
    console.error('Resend OTP error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const check = validateLogin(req.body);
    if (!check.valid) return res.status(400).json({ success: false, message: check.message });

    const { email, password } = req.body;
    const [rows] = await dbQuery('SELECT * FROM users WHERE email=?', [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const user = rows[0];
    if (!await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.is_verified) {
      const otp = generateOTP();
      const exp = new Date(Date.now() + 600000);
      await dbQuery('UPDATE users SET otp=?,otp_expires=?,otp_type=? WHERE id=?', [otp, exp, 'signup', user.id]);
      sendEmail({ to: email, subject: 'Your DMCA Master verification code', html: otpEmailTemplate(user.name, otp) }).catch(() => {});
      return res.status(403).json({ success: false, message: 'Please verify your email. A new code has been sent.', needsVerification: true });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const check = validateForgotPassword(req.body);
    if (!check.valid) return res.status(400).json({ success: false, message: check.message });

    const { email } = req.body;
    const [rows] = await dbQuery('SELECT id,name FROM users WHERE email=?', [email.toLowerCase()]);
    if (!rows.length) return res.json({ success: true, otpSent: true, message: 'If an account exists, a code has been sent.' });

    const otp = generateOTP();
    const exp = new Date(Date.now() + 600000);
    await dbQuery('UPDATE users SET otp=?,otp_expires=?,otp_type=? WHERE id=?', [otp, exp, 'reset', rows[0].id]);

    sendEmail({ to: email, subject: 'Your DMCA Master password reset code', html: resetOtpEmailTemplate(rows[0].name, otp) })
      .catch(e => console.warn('  ⚠️  Reset OTP failed:', e.message));

    return res.json({ success: true, otpSent: true, message: 'A 6-digit code has been sent to your email.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const check = validateResetPassword(req.body);
    if (!check.valid) return res.status(400).json({ success: false, message: check.message });

    const { token, password } = req.body;
    const [rows] = await dbQuery('SELECT id FROM users WHERE reset_token=? AND reset_expires>NOW()', [token]);
    if (!rows.length) return res.status(400).json({ success: false, message: 'Invalid or expired token. Please request a new code.' });

    const hashed = await bcrypt.hash(password, 12);
    await dbQuery('UPDATE users SET password=?,reset_token=NULL,reset_expires=NULL WHERE id=?', [hashed, rows[0].id]);
    return res.json({ success: true, message: 'Password reset successfully!' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/auth/me
const getMe = (req, res) => res.json({ success: true, user: req.user });

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const check = validateChangePassword(req.body);
    if (!check.valid) return res.status(400).json({ success: false, message: check.message });

    const { currentPassword, newPassword } = req.body;
    const [rows] = await dbQuery('SELECT password FROM users WHERE id=?', [req.user.id]);
    if (!await bcrypt.compare(currentPassword, rows[0].password)) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }
    await dbQuery('UPDATE users SET password=? WHERE id=?', [await bcrypt.hash(newPassword, 12), req.user.id]);
    return res.json({ success: true, message: 'Password changed successfully!' });
  } catch (err) {
    console.error('Change password error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { signup, verifyOtp, login, resendOtp, forgotPassword, resetPassword, getMe, changePassword };

