const { getDB } = require('../config/db');

const dbQuery = (sql, params = []) => getDB().execute(sql, params);

const getContacts = async (req, res) => {
  try {
    const { search = '', status = '' } = req.query;
    const where = [];
    const params = [];
    if (search) {
      where.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ? OR message LIKE ?)');
      params.push(...Array(5).fill(`%${search}%`));
    }
    if (status) { where.push('status = ?'); params.push(status); }
    const [contacts] = await dbQuery(
      `SELECT * FROM contacts ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC`,
      params
    );
    res.json({ success: true, contacts });
  } catch (err) {
    console.error('Admin contacts error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getContact = async (req, res) => {
  try {
    const [rows] = await dbQuery('SELECT * FROM contacts WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Contact submission not found.' });
    res.json({ success: true, contact: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const updateContact = async (req, res) => {
  try {
    const allowed = ['first_name','last_name','email','phone','message','status','admin_notes'];
    const fields = []; const values = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { fields.push(`${key}=?`); values.push(req.body[key]); }
    }
    if (!fields.length) return res.status(400).json({ success: false, message: 'Nothing to update.' });
    values.push(req.params.id);
    const [result] = await dbQuery(`UPDATE contacts SET ${fields.join(',')} WHERE id=?`, values);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Contact submission not found.' });
    res.json({ success: true, message: 'Contact updated.' });
  } catch (err) {
    console.error('Update contact error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const deleteContact = async (req, res) => {
  try {
    const [result] = await dbQuery('DELETE FROM contacts WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Contact submission not found.' });
    res.json({ success: true, message: 'Contact deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getUsers = async (_req, res) => {
  try {
    const [users] = await dbQuery(`
      SELECT u.id,u.name,u.email,u.role,u.is_verified,u.created_at,u.updated_at,COUNT(c.id) AS case_count
      FROM users u LEFT JOIN cases c ON c.user_id=u.id
      GROUP BY u.id ORDER BY u.created_at DESC
    `);
    res.json({ success: true, users });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getUser = async (req, res) => {
  try {
    const [rows] = await dbQuery(
      `SELECT u.id,u.name,u.email,u.role,u.is_verified,u.created_at,u.updated_at,COUNT(c.id) AS case_count
       FROM users u LEFT JOIN cases c ON c.user_id=u.id WHERE u.id=? GROUP BY u.id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
    const [cases] = await dbQuery('SELECT * FROM cases WHERE user_id=? ORDER BY created_at DESC', [req.params.id]);
    res.json({ success: true, user: rows[0], cases });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const updateUser = async (req, res) => {
  try {
    const { name, email, role, is_verified } = req.body;
    if (req.params.id === req.user.id && role && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'You cannot remove your own admin access.' });
    }
    const fields = []; const values = [];
    if (name !== undefined) { fields.push('name=?'); values.push(String(name).trim()); }
    if (email !== undefined) { fields.push('email=?'); values.push(String(email).trim().toLowerCase()); }
    if (role !== undefined) {
      if (!['user','admin'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role.' });
      fields.push('role=?'); values.push(role);
    }
    if (is_verified !== undefined) { fields.push('is_verified=?'); values.push(Number(Boolean(is_verified))); }
    if (!fields.length) return res.status(400).json({ success: false, message: 'Nothing to update.' });
    values.push(req.params.id);
    const [result] = await dbQuery(`UPDATE users SET ${fields.join(',')} WHERE id=?`, values);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User updated.' });
  } catch (err) {
    const duplicate = err.code === 'ER_DUP_ENTRY';
    res.status(duplicate ? 409 : 500).json({ success: false, message: duplicate ? 'That email is already in use.' : 'Server error.' });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    const [result] = await dbQuery('DELETE FROM users WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getStats = async (_req, res) => {
  try {
    const [[cases]] = await dbQuery(`SELECT COUNT(*) total,
      COALESCE(SUM(status='Removed'),0) removed,
      COALESCE(SUM(status IN ('Pending','Notice sent')),0) pending,
      COALESCE(SUM(status IN ('Disputed','Escalated')),0) disputed FROM cases`);
    const [[users]] = await dbQuery(`SELECT COUNT(*) total FROM users WHERE role='user'`);
    const [[contacts]] = await dbQuery(`SELECT COUNT(*) total, COALESCE(SUM(status='New'),0) new_count FROM contacts`);
    const [[blogs]] = await dbQuery(`SELECT COUNT(*) total, COALESCE(SUM(status='published'),0) published FROM blogs`);
    res.json({ success: true, stats: { ...cases, users: users.total, contacts: contacts.total, new_contacts: contacts.new_count, blogs: blogs.total, published_blogs: blogs.published } });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { getContacts, getContact, updateContact, deleteContact, getUsers, getUser, updateUser, deleteUser, getStats };
