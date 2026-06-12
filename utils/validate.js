// ─── utils/validate.js ────────────────────────────────────────────────────────
// Lightweight schema-validation helpers.
// Returns { valid: true } or { valid: false, message: '...' }
// ──────────────────────────────────────────────────────────────────────────────

const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE   = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Primitives ───────────────────────────────────────────────────────────────
const isEmail    = v => EMAIL_RE.test(String(v || '').trim());
const isUUID     = v => UUID_RE.test(String(v || ''));
const isNonEmpty = v => typeof v === 'string' && v.trim().length > 0;
const minLen     = (v, n) => typeof v === 'string' && v.length >= n;

// ─── Auth schemas ─────────────────────────────────────────────────────────────
const validateSignup = ({ name, email, password }) => {
  if (!isNonEmpty(name))           return { valid: false, message: 'Full name is required' };
  if (name.trim().length < 2)      return { valid: false, message: 'Name must be at least 2 characters' };
  if (!isEmail(email))             return { valid: false, message: 'A valid email address is required' };
  if (!minLen(password, 8))        return { valid: false, message: 'Password must be at least 8 characters' };
  return { valid: true };
};

const validateLogin = ({ email, password }) => {
  if (!isEmail(email))             return { valid: false, message: 'A valid email address is required' };
  if (!isNonEmpty(password))       return { valid: false, message: 'Password is required' };
  return { valid: true };
};

const validateForgotPassword = ({ email }) => {
  if (!isEmail(email))             return { valid: false, message: 'A valid email address is required' };
  return { valid: true };
};

const validateResetPassword = ({ token, password }) => {
  if (!isNonEmpty(token))          return { valid: false, message: 'Reset token is required' };
  if (!minLen(password, 8))        return { valid: false, message: 'Password must be at least 8 characters' };
  return { valid: true };
};

const validateChangePassword = ({ currentPassword, newPassword }) => {
  if (!isNonEmpty(currentPassword)) return { valid: false, message: 'Current password is required' };
  if (!minLen(newPassword, 8))      return { valid: false, message: 'New password must be at least 8 characters' };
  if (currentPassword === newPassword) return { valid: false, message: 'New password must be different from current password' };
  return { valid: true };
};

// ─── Case schemas ─────────────────────────────────────────────────────────────
const ALLOWED_STATUSES = ['Pending', 'Notice sent', 'Removed', 'Disputed', 'Escalated'];

const validateSubmitCase = ({ title, content_type, urgency, plan }) => {
  if (!isNonEmpty(title))          return { valid: false, message: 'Case title is required' };
  if (title.trim().length < 5)     return { valid: false, message: 'Case title must be at least 5 characters' };
  return { valid: true };
};

const validateUpdateCaseAdmin = ({ status }) => {
  if (status && !ALLOWED_STATUSES.includes(status)) {
    return { valid: false, message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}` };
  }
  return { valid: true };
};

// ─── Contact schema ───────────────────────────────────────────────────────────
const validateContactForm = ({ firstName, email, message }) => {
  if (!isNonEmpty(firstName))      return { valid: false, message: 'First name is required' };
  if (!isEmail(email))             return { valid: false, message: 'A valid email address is required' };
  if (!isNonEmpty(message))        return { valid: false, message: 'Message is required' };
  if (message.trim().length < 10)  return { valid: false, message: 'Message must be at least 10 characters' };
  return { valid: true };
};

// ─── ID param helper ──────────────────────────────────────────────────────────
const validateUUID = (id) => {
  if (!isUUID(id)) return { valid: false, message: 'Invalid ID format' };
  return { valid: true };
};

module.exports = {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateSubmitCase,
  validateUpdateCaseAdmin,
  validateContactForm,
  validateUUID,
};
