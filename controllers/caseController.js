// ─── controllers/caseController.js ───────────────────────────────────────────
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { getDB }      = require('../config/db');
const { sendEmail }  = require('../config/mailer');
const { caseNotificationTemplate } = require('../utils/emailTemplates');
const { validateSubmitCase, validateUpdateCaseAdmin } = require('../utils/validate');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'legal@dmcamaster.com';

const generateCaseRef = () => `DM-${Math.floor(100_000 + Math.random() * 900_000)}`;
const safeJSON = (str, fallback = []) => { try { return JSON.parse(str); } catch { return fallback; } };

const dbQuery = async (sql, params = []) => {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try { const db = getDB(); return await db.execute(sql, params); }
    catch (err) { if (attempt === 2) throw err; await new Promise(r => setTimeout(r, 500)); }
  }
};

// POST /api/cases
const submitCase = async (req, res) => {
  try {
    const check = validateSubmitCase(req.body);
    if (!check.valid) return res.status(400).json({ success: false, message: check.message });

    const {
      title,
      content_type = '',
      content_desc = '',
      platforms = [],
      infr_urls = '',
      urgency = 'Standard',
      plan = 'Monthly protection',
      notes = '',
    } = req.body;

    // Reject empty title explicitly for clarity
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Case title is required.' });
    }

    const id = uuidv4();
    const caseRef = generateCaseRef();

    await dbQuery(
      `INSERT INTO cases (id,case_ref,user_id,title,content_type,content_desc,platforms,infr_urls,urgency,plan,notes,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'Pending')`,
      [id, caseRef, req.user.id, title.trim(), content_type, content_desc, JSON.stringify(platforms), infr_urls, urgency, plan, notes]
    );

    // Notify admin by email
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `New Case ${caseRef}: ${title.trim()}`,
      html: caseNotificationTemplate({
        clientName: req.user.name,
        clientEmail: req.user.email,
        caseRef,
        title: title.trim(),
        contentType: content_type,
        platforms,
        infrUrls: infr_urls,
        urgency,
        plan,
        notes,
      }),
    }).catch(() => {});

    return res.status(201).json({ success: true, message: 'Protection case submitted successfully!', case: { id, case_ref: caseRef, status: 'Pending' } });
  } catch (err) {
    console.error('Submit case error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── GET /api/cases ───────────────────────────────────────────────────────────
const getMyCases = async (req, res) => {
  try {
    const [rows] = await dbQuery(
      'SELECT * FROM cases WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    const cases = rows.map(c => ({ ...c, platforms: safeJSON(c.platforms) }));
    return res.json({ success: true, cases });
  } catch (err) {
    console.error('Get cases error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET /api/cases/:id ───────────────────────────────────────────────────────
const getOneCase = async (req, res) => {
  try {
    const [rows] = await dbQuery('SELECT * FROM cases WHERE id = ?', [req.params.id]);

    if (!rows.length) return res.status(404).json({ success: false, message: 'Case not found.' });

    if (req.user.role !== 'admin' && rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.json({ success: true, case: { ...rows[0], platforms: safeJSON(rows[0].platforms) } });
  } catch (err) {
    console.error('Get one case error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── PUT /api/cases/:id ───────────────────────────────────────────────────────
const updateCase = async (req, res) => {
  try {
    const [rows] = await dbQuery('SELECT * FROM cases WHERE id = ?', [req.params.id]);

    if (!rows.length) return res.status(404).json({ success: false, message: 'Case not found.' });

    const caseRecord = rows[0];

    // ── Admin update: admins may edit the complete protection submission. ───────
    if (req.user.role === 'admin') {
      const check = validateUpdateCaseAdmin(req.body);
      if (!check.valid) return res.status(400).json({ success: false, message: check.message });

      const allowed = ['title','content_type','content_desc','infr_urls','urgency','plan','notes','status','admin_notes'];
      const fields = []; const values = [];
      for (const key of allowed) {
        if (req.body[key] !== undefined) { fields.push(`${key} = ?`); values.push(req.body[key]); }
      }
      if (req.body.platforms !== undefined) {
        fields.push('platforms = ?');
        values.push(JSON.stringify(Array.isArray(req.body.platforms) ? req.body.platforms : []));
      }
      if (!fields.length) return res.status(400).json({ success: false, message: 'Nothing to update.' });

      values.push(req.params.id);
      await dbQuery(`UPDATE cases SET ${fields.join(', ')} WHERE id = ?`, values);
      return res.json({ success: true, message: 'Case updated successfully.' });
    }

    // ── User update ────────────────────────────────────────────────────────────
    if (caseRecord.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (caseRecord.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cases in "${caseRecord.status}" status can no longer be edited.`,
      });
    }

    const { title, content_type, content_desc, platforms, infr_urls, urgency, plan, notes } = req.body;
    await dbQuery(
      `UPDATE cases SET
         title        = COALESCE(?, title),
         content_type = COALESCE(?, content_type),
         content_desc = COALESCE(?, content_desc),
         platforms    = COALESCE(?, platforms),
         infr_urls    = COALESCE(?, infr_urls),
         urgency      = COALESCE(?, urgency),
         plan         = COALESCE(?, plan),
         notes        = COALESCE(?, notes)
       WHERE id = ?`,
      [title || null, content_type || null, content_desc || null,
       platforms !== undefined ? JSON.stringify(Array.isArray(platforms) ? platforms : []) : null,
       infr_urls || null, urgency || null, plan || null, notes || null, req.params.id]
    );

    return res.json({ success: true, message: 'Case updated successfully.' });
  } catch (err) {
    console.error('Update case error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DELETE /api/cases/:id ────────────────────────────────────────────────────
const deleteCase = async (req, res) => {
  try {
    const [rows] = await dbQuery('SELECT * FROM cases WHERE id = ?', [req.params.id]);

    if (!rows.length) return res.status(404).json({ success: false, message: 'Case not found.' });

    const caseRecord = rows[0];

    if (req.user.role !== 'admin' && caseRecord.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (req.user.role !== 'admin' && caseRecord.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Only cases in "Pending" status can be deleted.',
      });
    }

    await dbQuery('DELETE FROM cases WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Case deleted successfully.' });
  } catch (err) {
    console.error('Delete case error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/cases ────────────────────────────────────────────────────
const adminGetAllCases = async (req, res) => {
  try {
    const db = getDB();
    const { status, search } = req.query;

    let query = `
      SELECT c.*, u.name AS user_name, u.email AS user_email
      FROM   cases c
      JOIN   users u ON c.user_id = u.id
    `;
    const params     = [];
    const conditions = [];

    if (status) {
      conditions.push('c.status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(c.title LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR c.case_ref LIKE ?)');
      params.push(...Array(4).fill(`%${search}%`));
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY c.created_at DESC';

    const [rows] = await dbQuery(query, params);
    const cases  = rows.map(c => ({ ...c, platforms: safeJSON(c.platforms) }));
    return res.json({ success: true, cases });
  } catch (err) {
    console.error('Admin get cases error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
const adminGetUsers = async (req, res) => {
  try {
    const [users] = await dbQuery(
      'SELECT id, name, email, role, is_verified, created_at FROM users ORDER BY created_at DESC'
    );
    const [counts] = await dbQuery(
      'SELECT user_id, COUNT(*) AS cnt FROM cases GROUP BY user_id'
    );
    const countMap = Object.fromEntries(counts.map(r => [r.user_id, r.cnt]));
    const enriched = users.map(u => ({ ...u, case_count: countMap[u.id] || 0 }));
    return res.json({ success: true, users: enriched });
  } catch (err) {
    console.error('Admin get users error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
const adminGetStats = async (req, res) => {
  try {
    const [[totals]] = await dbQuery(`
      SELECT
        COUNT(*)                                          AS total,
        SUM(status = 'Removed')                          AS removed,
        SUM(status IN ('Pending', 'Notice sent'))        AS pending,
        SUM(status IN ('Disputed', 'Escalated'))         AS disputed
      FROM cases
    `);
    const [[userRow]] = await dbQuery(
      'SELECT COUNT(*) AS total FROM users WHERE role = "user"'
    );
    return res.json({ success: true, stats: { ...totals, users: userRow.total } });
  } catch (err) {
    console.error('Admin stats error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DELETE /api/admin/users/:id ─────────────────────────────────────────────
const adminDeleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }
    const [rows] = await dbQuery('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });

    await dbQuery('DELETE FROM users WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Admin delete user error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  submitCase,
  getMyCases,
  getOneCase,
  updateCase,
  deleteCase,
  adminGetAllCases,
  adminGetUsers,
  adminGetStats,
  adminDeleteUser,
};

