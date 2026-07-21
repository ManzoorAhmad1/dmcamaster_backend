const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../config/db');

const dbQuery = (sql, params = []) => getDB().execute(sql, params);
const slugify = (value = '') => String(value).toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '') || `post-${Date.now()}`;

const parseTags = (value) => {
  if (!value) return [];
  return String(value).split('||').filter(Boolean).map(item => {
    const [id, name, slug] = item.split('::');
    return { id, name, slug };
  });
};

const mapBlog = row => ({ ...row, tags: parseTags(row.tags_raw) });

const uniqueSlug = async (base, excludeId = null, table = 'blogs') => {
  let slug = slugify(base);
  let counter = 2;
  while (true) {
    const params = excludeId ? [slug, excludeId] : [slug];
    const [rows] = await dbQuery(`SELECT id FROM ${table} WHERE slug=?${excludeId ? ' AND id<>?' : ''} LIMIT 1`, params);
    if (!rows.length) return slug;
    slug = `${slugify(base)}-${counter++}`;
  }
};

const blogSelect = `
  SELECT b.*, c.name category_name, c.slug category_slug,
    GROUP_CONCAT(DISTINCT CONCAT(t.id,'::',t.name,'::',t.slug) SEPARATOR '||') tags_raw
  FROM blogs b
  LEFT JOIN blog_categories c ON c.id=b.category_id
  LEFT JOIN blog_post_tags bt ON bt.blog_id=b.id
  LEFT JOIN blog_tags t ON t.id=bt.tag_id
`;

const listPublicBlogs = async (req, res) => {
  try {
    const { search = '', category = '', tag = '', page = '1', limit = '12' } = req.query;
    const where = ["b.status='published'", '(b.published_at IS NULL OR b.published_at<=NOW())'];
    const params = [];
    if (search) {
      where.push('(b.title LIKE ? OR b.excerpt LIKE ? OR b.content LIKE ?)');
      params.push(...Array(3).fill(`%${search}%`));
    }
    if (category) { where.push('c.slug=?'); params.push(category); }
    if (tag) {
      where.push('EXISTS (SELECT 1 FROM blog_post_tags x JOIN blog_tags xt ON xt.id=x.tag_id WHERE x.blog_id=b.id AND xt.slug=?)');
      params.push(tag);
    }
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 12));
    const offset = (pageNum - 1) * limitNum;
    const [rows] = await dbQuery(`${blogSelect} WHERE ${where.join(' AND ')} GROUP BY b.id ORDER BY COALESCE(b.published_at,b.created_at) DESC LIMIT ${limitNum} OFFSET ${offset}`, params);
    const [[count]] = await dbQuery(`SELECT COUNT(DISTINCT b.id) total FROM blogs b LEFT JOIN blog_categories c ON c.id=b.category_id WHERE ${where.join(' AND ')}`, params);
    res.json({ success: true, blogs: rows.map(mapBlog), pagination: { page: pageNum, limit: limitNum, total: Number(count.total), pages: Math.ceil(Number(count.total) / limitNum) } });
  } catch (err) {
    console.error('List public blogs error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load blogs.' });
  }
};

const getPublicBlog = async (req, res) => {
  try {
    const [rows] = await dbQuery(`${blogSelect} WHERE b.slug=? AND b.status='published' AND (b.published_at IS NULL OR b.published_at<=NOW()) GROUP BY b.id`, [req.params.slug]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Blog post not found.' });
    res.json({ success: true, blog: mapBlog(rows[0]) });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to load blog.' }); }
};

const getCategories = async (_req, res) => {
  try {
    const [categories] = await dbQuery(`SELECT c.*,COUNT(b.id) post_count FROM blog_categories c LEFT JOIN blogs b ON b.category_id=c.id AND b.status='published' GROUP BY c.id ORDER BY c.name`);
    res.json({ success: true, categories });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to load categories.' }); }
};

const getTags = async (_req, res) => {
  try {
    const [tags] = await dbQuery(`SELECT t.*,COUNT(b.id) post_count FROM blog_tags t LEFT JOIN blog_post_tags bt ON bt.tag_id=t.id LEFT JOIN blogs b ON b.id=bt.blog_id AND b.status='published' GROUP BY t.id ORDER BY post_count DESC,t.name`);
    res.json({ success: true, tags });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to load tags.' }); }
};

const getSiteSettings = async (_req, res) => {
  try {
    const [rows] = await dbQuery('SELECT setting_key,setting_value FROM site_settings');
    res.json({ success: true, settings: Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value])) });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to load settings.' }); }
};

const adminListBlogs = async (req, res) => {
  try {
    const { search = '', status = '', category = '' } = req.query;
    const where = []; const params = [];
    if (search) { where.push('(b.title LIKE ? OR b.slug LIKE ? OR b.author LIKE ?)'); params.push(...Array(3).fill(`%${search}%`)); }
    if (status) { where.push('b.status=?'); params.push(status); }
    if (category) { where.push('b.category_id=?'); params.push(category); }
    const [rows] = await dbQuery(`${blogSelect} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} GROUP BY b.id ORDER BY b.updated_at DESC`, params);
    res.json({ success: true, blogs: rows.map(mapBlog) });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to load blogs.' }); }
};

const syncTags = async (blogId, tagIds = []) => {
  const db = getDB();
  await db.execute('DELETE FROM blog_post_tags WHERE blog_id=?', [blogId]);
  for (const tagId of [...new Set(tagIds.filter(Boolean))]) {
    await db.execute('INSERT IGNORE INTO blog_post_tags (blog_id,tag_id) VALUES (?,?)', [blogId, tagId]);
  }
};

const createBlog = async (req, res) => {
  try {
    const { title, content, excerpt = '', featured_image = '', category_id = null, author = 'DMCA Master Team', status = 'draft', read_time = '', meta_title = '', meta_description = '', meta_keywords = '', canonical_url = '', og_title = '', og_description = '', og_image = '', published_at = null, tag_ids = [] } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ success: false, message: 'Title is required.' });
    if (!content || !String(content).trim()) return res.status(400).json({ success: false, message: 'Content is required.' });
    if (!['draft','published'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
    const id = uuidv4();
    const slug = await uniqueSlug(req.body.slug || title);
    const publishDate = status === 'published' ? (published_at || new Date()) : published_at;
    await dbQuery(`INSERT INTO blogs (id,title,slug,excerpt,content,featured_image,category_id,author,status,read_time,meta_title,meta_description,meta_keywords,canonical_url,og_title,og_description,og_image,published_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, String(title).trim(), slug, excerpt, content, featured_image, category_id || null, author, status, read_time, meta_title, meta_description, meta_keywords, canonical_url, og_title, og_description, og_image, publishDate || null]);
    await syncTags(id, tag_ids);
    res.status(201).json({ success: true, message: 'Blog post created.', blog: { id, slug } });
  } catch (err) {
    console.error('Create blog error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create blog post.' });
  }
};

const updateBlog = async (req, res) => {
  try {
    const [existing] = await dbQuery('SELECT * FROM blogs WHERE id=?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Blog post not found.' });
    const allowed = ['title','excerpt','content','featured_image','category_id','author','status','read_time','meta_title','meta_description','meta_keywords','canonical_url','og_title','og_description','og_image','published_at'];
    const fields = []; const values = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { fields.push(`${key}=?`); values.push(req.body[key] === '' && ['category_id','published_at'].includes(key) ? null : req.body[key]); }
    }
    if (req.body.slug !== undefined || req.body.title !== undefined) {
      const slug = await uniqueSlug(req.body.slug || req.body.title || existing[0].title, req.params.id);
      fields.push('slug=?'); values.push(slug);
    }
    if (req.body.status === 'published' && !existing[0].published_at && req.body.published_at === undefined) {
      fields.push('published_at=?'); values.push(new Date());
    }
    if (fields.length) {
      values.push(req.params.id);
      await dbQuery(`UPDATE blogs SET ${fields.join(',')} WHERE id=?`, values);
    }
    if (Array.isArray(req.body.tag_ids)) await syncTags(req.params.id, req.body.tag_ids);
    res.json({ success: true, message: 'Blog post updated.' });
  } catch (err) {
    console.error('Update blog error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update blog post.' });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const [result] = await dbQuery('DELETE FROM blogs WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Blog post not found.' });
    res.json({ success: true, message: 'Blog post deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to delete blog post.' }); }
};

const adminListCategories = async (_req, res) => {
  try {
    const [categories] = await dbQuery(`SELECT c.*,COUNT(b.id) post_count FROM blog_categories c LEFT JOIN blogs b ON b.category_id=c.id GROUP BY c.id ORDER BY c.name`);
    res.json({ success: true, categories });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to load categories.' }); }
};

const createCategory = async (req, res) => {
  try {
    const { name, description = '', meta_title = '', meta_description = '' } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Category name is required.' });
    const id = uuidv4(); const slug = await uniqueSlug(req.body.slug || name, null, 'blog_categories');
    await dbQuery('INSERT INTO blog_categories (id,name,slug,description,meta_title,meta_description) VALUES (?,?,?,?,?,?)', [id, String(name).trim(), slug, description, meta_title, meta_description]);
    res.status(201).json({ success: true, message: 'Category created.', category: { id, slug } });
  } catch (err) { res.status(err.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ success: false, message: err.code === 'ER_DUP_ENTRY' ? 'Category already exists.' : 'Failed to create category.' }); }
};

const updateCategory = async (req, res) => {
  try {
    const [existing] = await dbQuery('SELECT * FROM blog_categories WHERE id=?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Category not found.' });
    const fields = []; const values = [];
    for (const key of ['name','description','meta_title','meta_description']) if (req.body[key] !== undefined) { fields.push(`${key}=?`); values.push(req.body[key]); }
    if (req.body.slug !== undefined || req.body.name !== undefined) { fields.push('slug=?'); values.push(await uniqueSlug(req.body.slug || req.body.name || existing[0].name, req.params.id, 'blog_categories')); }
    if (!fields.length) return res.status(400).json({ success: false, message: 'Nothing to update.' });
    values.push(req.params.id); await dbQuery(`UPDATE blog_categories SET ${fields.join(',')} WHERE id=?`, values);
    res.json({ success: true, message: 'Category updated.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update category.' }); }
};

const deleteCategory = async (req, res) => {
  try { const [result] = await dbQuery('DELETE FROM blog_categories WHERE id=?', [req.params.id]); if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Category not found.' }); res.json({ success: true, message: 'Category deleted.' }); }
  catch (err) { res.status(500).json({ success: false, message: 'Failed to delete category.' }); }
};

const adminListTags = async (_req, res) => {
  try { const [tags] = await dbQuery(`SELECT t.*,COUNT(bt.blog_id) post_count FROM blog_tags t LEFT JOIN blog_post_tags bt ON bt.tag_id=t.id GROUP BY t.id ORDER BY post_count DESC,t.name`); res.json({ success: true, tags }); }
  catch (err) { res.status(500).json({ success: false, message: 'Failed to load tags.' }); }
};

const createTag = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Tag name is required.' });
    const id = uuidv4(); const slug = await uniqueSlug(req.body.slug || name, null, 'blog_tags');
    await dbQuery('INSERT INTO blog_tags (id,name,slug) VALUES (?,?,?)', [id, String(name).trim(), slug]);
    res.status(201).json({ success: true, message: 'Tag created.', tag: { id, slug } });
  } catch (err) { res.status(err.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ success: false, message: err.code === 'ER_DUP_ENTRY' ? 'Tag already exists.' : 'Failed to create tag.' }); }
};

const updateTag = async (req, res) => {
  try {
    const [existing] = await dbQuery('SELECT * FROM blog_tags WHERE id=?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Tag not found.' });
    const name = req.body.name ?? existing[0].name;
    const slug = await uniqueSlug(req.body.slug || name, req.params.id, 'blog_tags');
    await dbQuery('UPDATE blog_tags SET name=?,slug=? WHERE id=?', [name, slug, req.params.id]);
    res.json({ success: true, message: 'Tag updated.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update tag.' }); }
};

const deleteTag = async (req, res) => {
  try { const [result] = await dbQuery('DELETE FROM blog_tags WHERE id=?', [req.params.id]); if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Tag not found.' }); res.json({ success: true, message: 'Tag deleted.' }); }
  catch (err) { res.status(500).json({ success: false, message: 'Failed to delete tag.' }); }
};

const updateSettings = async (req, res) => {
  try {
    const settings = req.body.settings && typeof req.body.settings === 'object' ? req.body.settings : req.body;
    for (const [key, value] of Object.entries(settings)) {
      if (!/^[a-z0-9_]{2,120}$/i.test(key)) continue;
      await dbQuery('INSERT INTO site_settings (setting_key,setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)', [key, String(value ?? '')]);
    }
    res.json({ success: true, message: 'SEO and site settings updated.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update settings.' }); }
};

module.exports = {
  listPublicBlogs, getPublicBlog, getCategories, getTags, getSiteSettings,
  adminListBlogs, createBlog, updateBlog, deleteBlog,
  adminListCategories, createCategory, updateCategory, deleteCategory,
  adminListTags, createTag, updateTag, deleteTag, updateSettings,
};
