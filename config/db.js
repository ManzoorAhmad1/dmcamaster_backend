// ─── config/db.js ─────────────────────────────────────────────────────────────
// Handles MySQL connection pool, table initialization, and default admin seed.
// ──────────────────────────────────────────────────────────────────────────────

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ─── Pool configuration ───────────────────────────────────────────────────────
const poolConfig = {
  host:             process.env.DB_HOST || 'localhost',
  user:             process.env.DB_USER || 'root',
  password:         process.env.DB_PASS || '',
  database:         process.env.DB_NAME || 'dmcamaster_db',
  port:             parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0,
  // Keep connections alive so Hostinger doesn't drop idle ones
  enableKeepAlive:      true,
  keepAliveInitialDelay: 10000,
  // Timeouts — fail fast so requests don't hang
  connectTimeout:   10000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
};

// ─── Singleton pool ───────────────────────────────────────────────────────────
let pool = null;

/**
 * Returns (and lazily creates) the MySQL connection pool.
 * mysql2 pool handles reconnection automatically — no manual ping needed.
 */
const getDB = () => {
  if (!pool) pool = mysql.createPool(poolConfig);
  return pool;
};

// ─── Table definitions ────────────────────────────────────────────────────────
const CREATE_USERS = `
  CREATE TABLE IF NOT EXISTS users (
    id           VARCHAR(36)  PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    email        VARCHAR(255) NOT NULL UNIQUE,
    password     VARCHAR(255) NOT NULL,
    role         ENUM('user','admin') DEFAULT 'user',
    is_verified  TINYINT(1)   DEFAULT 0,
    verify_token VARCHAR(255),
    reset_token  VARCHAR(255),
    reset_expires DATETIME,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`;

const CREATE_CASES = `
  CREATE TABLE IF NOT EXISTS cases (
    id           VARCHAR(36)  PRIMARY KEY,
    case_ref     VARCHAR(20)  NOT NULL UNIQUE,
    user_id      VARCHAR(36)  NOT NULL,
    title        VARCHAR(500) NOT NULL,
    content_type VARCHAR(255),
    content_desc TEXT,
    platforms    TEXT,
    infr_urls    TEXT,
    urgency      VARCHAR(100),
    plan         VARCHAR(100),
    notes        TEXT,
    status       ENUM('Pending','Notice sent','Removed','Disputed','Escalated') DEFAULT 'Pending',
    admin_notes  TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`;

// ─── Initialization ───────────────────────────────────────────────────────────
/**
 * Creates tables if they don't exist and seeds the default admin account.
 * Logs detailed status messages to the console.
 */
const initDB = async () => {
  try {
    const db = getDB();

    // ── Verify connection ──────────────────────────────────────────────────────
    const conn = await db.getConnection();
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║           DMCA Master — Database Status           ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Host     : ${(process.env.DB_HOST || 'localhost').padEnd(36)} ║`);
    console.log(`║  Database : ${(process.env.DB_NAME || 'dmcamaster_db').padEnd(36)} ║`);
    console.log(`║  Port     : ${String(process.env.DB_PORT || 3306).padEnd(36)} ║`);
    conn.release();
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  ✅  Connection successful                        ║');

    // ── Create tables ──────────────────────────────────────────────────────────
    await db.execute(CREATE_USERS);
    console.log('║  ✅  Table `users`  — ready                       ║');

    await db.execute(CREATE_CASES);
    console.log('║  ✅  Table `cases`  — ready                       ║');

    // ── Seed default admin ─────────────────────────────────────────────────────
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      ['admin@dmcamaster.com']
    );

    if (!existing.length) {
      const hash = await bcrypt.hash('dmcamaster', 12);
      await db.execute(
        'INSERT INTO users (id,name,email,password,role,is_verified) VALUES (?,?,?,?,?,?)',
        [uuidv4(), 'Muhammad Irfan', 'admin@dmcamaster.com', hash, 'admin', 1]
      );
      console.log('║  ✅  Default admin created (admin@dmcamaster.com) ║');
    } else {
      console.log('║  ℹ️   Admin account already exists                 ║');
    }

    console.log('╚══════════════════════════════════════════════════╝\n');
  } catch (err) {
    console.error('\n[DB ERROR] Connection FAILED');
    console.error('[DB ERROR] Host    :', process.env.DB_HOST || 'localhost');
    console.error('[DB ERROR] Database:', process.env.DB_NAME || 'dmcamaster_db');
    console.error('[DB ERROR] Reason  :', err.message);
    console.error('\n  >>> Fix: Update DB_HOST in your .env file to your Hostinger MySQL host.');
    console.error('  >>> In Hostinger panel: Databases > phpMyAdmin > Remote MySQL\n');
    process.exit(1);
  }
};

module.exports = { getDB, initDB };
