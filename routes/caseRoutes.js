const router = require('express').Router();
const {
  submitCase, getMyCases, getOneCase, updateCase, deleteCase, adminGetAllCases,
} = require('../controllers/caseController');
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/admin/cases', authenticate, adminOnly, adminGetAllCases);
router.post('/cases', authenticate, submitCase);
router.get('/cases', authenticate, getMyCases);
router.get('/cases/:id', authenticate, getOneCase);
router.put('/cases/:id', authenticate, updateCase);
router.delete('/cases/:id', authenticate, deleteCase);

module.exports = router;
