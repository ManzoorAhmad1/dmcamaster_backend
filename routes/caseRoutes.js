// ─── routes/caseRoutes.js ─────────────────────────────────────────────────────
const router = require('express').Router();
const {
  submitCase,
  getMyCases,
  getOneCase,
  updateCase,
  deleteCase,
  adminGetAllCases,
  adminGetUsers,
  adminGetStats,
  adminDeleteUser,
} = require('../controllers/caseController');
const { authenticate, adminOnly } = require('../middleware/auth');

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/admin/cases',            authenticate, adminOnly, adminGetAllCases);
router.get('/admin/users',            authenticate, adminOnly, adminGetUsers);
router.get('/admin/stats',            authenticate, adminOnly, adminGetStats);
router.delete('/admin/users/:id',     authenticate, adminOnly, adminDeleteUser);

// ── User case routes ─────────────────────────────────────────────────────────
router.post  ('/cases',     authenticate, submitCase);
router.get   ('/cases',     authenticate, getMyCases);
router.get   ('/cases/:id', authenticate, getOneCase);
router.put   ('/cases/:id', authenticate, updateCase);
router.delete('/cases/:id', authenticate, deleteCase);

module.exports = router;
