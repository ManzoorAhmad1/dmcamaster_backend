// ─── middleware/auth.js ───────────────────────────────────────────────────────
// JWT authentication + role-based access middleware.
// ──────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const jwt    = require('jsonwebtoken');
const { getDB } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'development-only-change-me';

// ─── Authenticate any logged-in user ─────────────────────────────────────────
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  try {
    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const db      = getDB();
    const [rows]  = await db.execute(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Account not found. Please log in again.' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' });
  }
};

// ─── Restrict to admin role only ─────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};

module.exports = { authenticate, adminOnly };
