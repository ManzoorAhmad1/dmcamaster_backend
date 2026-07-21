require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'dmcamaster_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
};

let pool = null;

const getDB = () => {
  if (!pool) pool = mysql.createPool(poolConfig);
  return pool;
};

const closeDB = async () => {
  if (!pool) return;
  const currentPool = pool;
  pool = null;
  await currentPool.end();
};

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user','admin') DEFAULT 'user',
    is_verified TINYINT(1) DEFAULT 0,
    verify_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_expires DATETIME,
    otp VARCHAR(10),
    otp_expires DATETIME,
    otp_type VARCHAR(30),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS cases (
    id VARCHAR(36) PRIMARY KEY,
    case_ref VARCHAR(20) NOT NULL UNIQUE,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content_type VARCHAR(255),
    content_desc TEXT,
    platforms TEXT,
    infr_urls TEXT,
    urgency VARCHAR(100),
    plan VARCHAR(100),
    notes TEXT,
    status ENUM('Pending','Notice sent','Removed','Disputed','Escalated') DEFAULT 'Pending',
    admin_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR(36) PRIMARY KEY,
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(80),
    message TEXT NOT NULL,
    status ENUM('New','Read','Replied','Closed') DEFAULT 'New',
    admin_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_contacts_email (email),
    INDEX idx_contacts_status (status),
    INDEX idx_contacts_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS blog_categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(160) NOT NULL UNIQUE,
    slug VARCHAR(180) NOT NULL UNIQUE,
    description TEXT,
    meta_title VARCHAR(255),
    meta_description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS blog_tags (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    slug VARCHAR(140) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS blogs (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(520) NOT NULL UNIQUE,
    excerpt TEXT,
    content LONGTEXT NOT NULL,
    featured_image TEXT,
    category_id VARCHAR(36),
    author VARCHAR(255) DEFAULT 'DMCA Master Team',
    status ENUM('draft','published') DEFAULT 'draft',
    read_time VARCHAR(60),
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT,
    canonical_url TEXT,
    og_title VARCHAR(255),
    og_description TEXT,
    og_image TEXT,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE SET NULL,
    INDEX idx_blogs_status (status),
    INDEX idx_blogs_published (published_at),
    INDEX idx_blogs_category (category_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS blog_post_tags (
    blog_id VARCHAR(36) NOT NULL,
    tag_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (blog_id, tag_id),
    FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES blog_tags(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS site_settings (
    setting_key VARCHAR(120) PRIMARY KEY,
    setting_value LONGTEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(36) PRIMARY KEY,
    booking_ref VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(80),
    website VARCHAR(500),
    issue VARCHAR(255) NOT NULL,
    message TEXT,
    booking_date DATE NOT NULL,
    booking_time VARCHAR(30) NOT NULL,
    timezone VARCHAR(80) DEFAULT 'Asia/Karachi',
    status ENUM('Pending','Confirmed','Completed','Cancelled') DEFAULT 'Pending',
    admin_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_bookings_date (booking_date),
    INDEX idx_bookings_status (status),
    INDEX idx_bookings_email (email),
    INDEX idx_bookings_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/*
 * These definitions are used only when a table already exists but one of its
 * columns is missing. Nullable/safe defaults are intentional so old records do
 * not make ALTER TABLE fail on production databases.
 */
const REQUIRED_COLUMNS = {
  users: {
    id: 'VARCHAR(36) NULL',
    name: 'VARCHAR(255) NULL',
    email: 'VARCHAR(255) NULL',
    password: 'VARCHAR(255) NULL',
    role: "ENUM('user','admin') DEFAULT 'user'",
    is_verified: 'TINYINT(1) DEFAULT 0',
    verify_token: 'VARCHAR(255) NULL',
    reset_token: 'VARCHAR(255) NULL',
    reset_expires: 'DATETIME NULL',
    otp: 'VARCHAR(10) NULL',
    otp_expires: 'DATETIME NULL',
    otp_type: 'VARCHAR(30) NULL',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
  cases: {
    id: 'VARCHAR(36) NULL',
    case_ref: 'VARCHAR(20) NULL',
    user_id: 'VARCHAR(36) NULL',
    title: 'VARCHAR(500) NULL',
    content_type: 'VARCHAR(255) NULL',
    content_desc: 'TEXT NULL',
    platforms: 'TEXT NULL',
    infr_urls: 'TEXT NULL',
    urgency: 'VARCHAR(100) NULL',
    plan: 'VARCHAR(100) NULL',
    notes: 'TEXT NULL',
    status: "ENUM('Pending','Notice sent','Removed','Disputed','Escalated') DEFAULT 'Pending'",
    admin_notes: 'TEXT NULL',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
  contacts: {
    id: 'VARCHAR(36) NULL',
    first_name: 'VARCHAR(150) NULL',
    last_name: 'VARCHAR(150) NULL',
    email: 'VARCHAR(255) NULL',
    phone: 'VARCHAR(80) NULL',
    message: 'TEXT NULL',
    status: "ENUM('New','Read','Replied','Closed') DEFAULT 'New'",
    admin_notes: 'TEXT NULL',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
  blog_categories: {
    id: 'VARCHAR(36) NULL',
    name: 'VARCHAR(160) NULL',
    slug: 'VARCHAR(180) NULL',
    description: 'TEXT NULL',
    meta_title: 'VARCHAR(255) NULL',
    meta_description: 'TEXT NULL',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
  blog_tags: {
    id: 'VARCHAR(36) NULL',
    name: 'VARCHAR(120) NULL',
    slug: 'VARCHAR(140) NULL',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
  blogs: {
    id: 'VARCHAR(36) NULL',
    title: 'VARCHAR(500) NULL',
    slug: 'VARCHAR(520) NULL',
    excerpt: 'TEXT NULL',
    content: 'LONGTEXT NULL',
    featured_image: 'TEXT NULL',
    category_id: 'VARCHAR(36) NULL',
    author: "VARCHAR(255) DEFAULT 'DMCA Master Team'",
    status: "ENUM('draft','published') DEFAULT 'draft'",
    read_time: 'VARCHAR(60) NULL',
    meta_title: 'VARCHAR(255) NULL',
    meta_description: 'TEXT NULL',
    meta_keywords: 'TEXT NULL',
    canonical_url: 'TEXT NULL',
    og_title: 'VARCHAR(255) NULL',
    og_description: 'TEXT NULL',
    og_image: 'TEXT NULL',
    published_at: 'DATETIME NULL',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
  blog_post_tags: {
    blog_id: 'VARCHAR(36) NULL',
    tag_id: 'VARCHAR(36) NULL',
  },
  site_settings: {
    setting_key: 'VARCHAR(120) NULL',
    setting_value: 'LONGTEXT NULL',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
  bookings: {
    id: 'VARCHAR(36) NULL',
    booking_ref: 'VARCHAR(30) NULL',
    name: 'VARCHAR(160) NULL',
    email: 'VARCHAR(255) NULL',
    phone: 'VARCHAR(80) NULL',
    website: 'VARCHAR(500) NULL',
    issue: 'VARCHAR(255) NULL',
    message: 'TEXT NULL',
    booking_date: 'DATE NULL',
    booking_time: 'VARCHAR(30) NULL',
    timezone: "VARCHAR(80) DEFAULT 'Asia/Karachi'",
    status: "ENUM('Pending','Confirmed','Completed','Cancelled') DEFAULT 'Pending'",
    admin_notes: 'TEXT NULL',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
};

const INDEXES = {
  users: [
    { name: 'uq_users_email', columns: '`email`', unique: true },
  ],
  cases: [
    { name: 'uq_cases_case_ref', columns: '`case_ref`', unique: true },
    { name: 'idx_cases_user_id', columns: '`user_id`' },
    { name: 'idx_cases_status', columns: '`status`' },
    { name: 'idx_cases_created', columns: '`created_at`' },
  ],
  contacts: [
    { name: 'idx_contacts_email', columns: '`email`' },
    { name: 'idx_contacts_status', columns: '`status`' },
    { name: 'idx_contacts_created', columns: '`created_at`' },
  ],
  blog_categories: [
    { name: 'uq_blog_categories_name', columns: '`name`', unique: true },
    { name: 'uq_blog_categories_slug', columns: '`slug`', unique: true },
  ],
  blog_tags: [
    { name: 'uq_blog_tags_name', columns: '`name`', unique: true },
    { name: 'uq_blog_tags_slug', columns: '`slug`', unique: true },
  ],
  blogs: [
    { name: 'uq_blogs_slug', columns: '`slug`', unique: true },
    { name: 'idx_blogs_status', columns: '`status`' },
    { name: 'idx_blogs_published', columns: '`published_at`' },
    { name: 'idx_blogs_category', columns: '`category_id`' },
  ],
  bookings: [
    { name: 'uq_bookings_ref', columns: '`booking_ref`', unique: true },
    { name: 'idx_bookings_date', columns: '`booking_date`' },
    { name: 'idx_bookings_status', columns: '`status`' },
    { name: 'idx_bookings_email', columns: '`email`' },
    { name: 'idx_bookings_created', columns: '`created_at`' },
  ],
};

const defaultSettings = {
  site_name: 'DMCA Master',
  site_url: 'https://dmcamaster.com',
  phone_number: '+923353126688',
  default_meta_title: 'DMCA Master - Professional Copyright Protection Service',
  default_meta_description: 'Protect your digital content from copyright infringement, piracy, and unauthorized use with expert DMCA takedown services.',
  default_meta_keywords: 'DMCA takedown, copyright protection, content removal, anti piracy',
  default_og_image: '/assests/logo.png',
  site_logo_url: '/assests/logo.png',
  google_site_verification: '',
};

const getExistingColumns = async (db, table) => {
  const [rows] = await db.execute(
    `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [poolConfig.database, table]
  );
  return new Set(rows.map(row => row.COLUMN_NAME));
};

const ensureAllColumns = async db => {
  let added = 0;
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const existing = await getExistingColumns(db, table);
    for (const [column, definition] of Object.entries(columns)) {
      if (existing.has(column)) continue;
      await db.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`[DB] Added missing column: ${table}.${column}`);
      added += 1;
    }
  }
  return added;
};

const ensureIndexes = async db => {
  let added = 0;
  for (const [table, indexes] of Object.entries(INDEXES)) {
    const [rows] = await db.query(`SHOW INDEX FROM \`${table}\``);
    const existingNames = new Set(rows.map(row => row.Key_name));

    for (const index of indexes) {
      if (existingNames.has(index.name)) continue;
      try {
        await db.execute(
          `ALTER TABLE \`${table}\` ADD ${index.unique ? 'UNIQUE ' : ''}INDEX \`${index.name}\` (${index.columns})`
        );
        console.log(`[DB] Added missing index: ${table}.${index.name}`);
        added += 1;
      } catch (error) {
        // A legacy database may contain duplicate data. Do not stop the whole
        // website for an optional index; report it clearly in Hostinger logs.
        console.warn(`[DB WARNING] Could not add index ${table}.${index.name}: ${error.message}`);
      }
    }
  }
  return added;
};

const seedDefaults = async db => {
  const adminEmail = (process.env.ADMIN_LOGIN_EMAIL || 'admin@dmcamaster.com').toLowerCase();
  const adminPassword = process.env.ADMIN_LOGIN_PASSWORD || 'DmcaMaster@2026';
  const adminName = process.env.ADMIN_LOGIN_NAME || 'DMCA Master Admin';

  const [existing] = await db.execute('SELECT id,role,is_verified FROM users WHERE email = ?', [adminEmail]);
  if (!existing.length) {
    const hash = await bcrypt.hash(adminPassword, 12);
    await db.execute(
      'INSERT INTO users (id,name,email,password,role,is_verified) VALUES (?,?,?,?,?,1)',
      [uuidv4(), adminName, adminEmail, hash, 'admin']
    );
    console.log(`[DB] Default admin created: ${adminEmail}`);
  } else if (existing[0].role !== 'admin' || !existing[0].is_verified) {
    await db.execute("UPDATE users SET role='admin',is_verified=1 WHERE id=?", [existing[0].id]);
    console.log(`[DB] Existing account promoted to admin: ${adminEmail}`);
  }

  const [categoryRows] = await db.execute('SELECT id FROM blog_categories LIMIT 1');
  if (!categoryRows.length) {
    await db.execute(
      'INSERT INTO blog_categories (id,name,slug,description) VALUES (?,?,?,?)',
      [uuidv4(), 'General', 'general', 'General DMCA and copyright protection articles']
    );
    console.log('[DB] Default blog category created.');
  }

  for (const [key, value] of Object.entries(defaultSettings)) {
    await db.execute(
      'INSERT INTO site_settings (setting_key,setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_key=setting_key',
      [key, value]
    );
  }
};

const initDB = async () => {
  const db = getDB();
  const conn = await db.getConnection();
  const lockName = `${poolConfig.database}_dmca_schema_sync`;
  let lockAcquired = false;

  try {
    console.log(`[DB] Connected to ${poolConfig.host}/${poolConfig.database}`);

    // Prevent two Hostinger/PM2 workers from altering the same table together.
    const [[lockResult]] = await conn.execute('SELECT GET_LOCK(?, 30) AS acquired', [lockName]);
    lockAcquired = Number(lockResult.acquired) === 1;
    if (!lockAcquired) throw new Error('Could not acquire database schema lock within 30 seconds.');

    for (const sql of TABLES) await conn.execute(sql);
    const addedColumns = await ensureAllColumns(conn);
    const addedIndexes = await ensureIndexes(conn);
    await seedDefaults(conn);

    console.log(`[DB] Schema sync complete. Added columns: ${addedColumns}; added indexes: ${addedIndexes}.`);
    console.log('[DB] CMS, contacts, bookings, users and protection tables are ready.');
  } catch (error) {
    console.error('[DB ERROR] Schema sync failed:', error.message);
    throw error;
  } finally {
    if (lockAcquired) {
      try { await conn.execute('SELECT RELEASE_LOCK(?)', [lockName]); } catch (_) { /* no-op */ }
    }
    conn.release();
  }
};

module.exports = { getDB, initDB, closeDB };
