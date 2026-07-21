#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const printError = error => {
  console.error('[DIAGNOSE ERROR] Full error:');
  console.error(error);
  console.error('[DIAGNOSE ERROR] Details:', {
    name: error?.name,
    message: error?.message,
    code: error?.code,
    errno: error?.errno,
    syscall: error?.syscall,
    address: error?.address,
    port: error?.port,
    sqlState: error?.sqlState,
    sqlMessage: error?.sqlMessage,
  });

  if (Array.isArray(error?.errors)) {
    error.errors.forEach((nested, index) => {
      console.error(`[DIAGNOSE ERROR] Nested #${index + 1}:`, {
        message: nested?.message,
        code: nested?.code,
        errno: nested?.errno,
        syscall: nested?.syscall,
        address: nested?.address,
        port: nested?.port,
      });
    });
  }
};

(async () => {
  let connection;
  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'dmcamaster_db',
      port: Number.parseInt(process.env.DB_PORT || '3306', 10),
      connectTimeout: 15000,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };

    const adminEmail = String(process.env.ADMIN_LOGIN_EMAIL || 'admin@dmcamaster.com').trim().toLowerCase();
    const adminPassword = String(process.env.ADMIN_LOGIN_PASSWORD || 'DmcaMaster@2026');

    console.log('[DIAGNOSE] Target:', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      ssl: Boolean(config.ssl),
      adminEmail,
    });

    connection = await mysql.createConnection(config);
    console.log('[DIAGNOSE] TCP/MySQL connection successful.');

    const [[ping]] = await connection.query('SELECT 1 AS ok, DATABASE() AS current_database, CURRENT_USER() AS authenticated_user');
    console.log('[DIAGNOSE] Database ping:', ping);

    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
        ORDER BY ORDINAL_POSITION`,
      [config.database]
    );
    console.log('[DIAGNOSE] users columns:', columns.map(row => row.COLUMN_NAME).join(', '));

    const [rows] = await connection.execute(
      `SELECT id, email, role, is_verified, password
         FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1`,
      [adminEmail]
    );

    if (!rows.length) {
      console.error(`[DIAGNOSE] Admin record not found in ${config.database}: ${adminEmail}`);
      process.exitCode = 2;
      return;
    }

    const admin = rows[0];
    const passwordMatches = await bcrypt.compare(adminPassword, admin.password);
    console.log('[DIAGNOSE] Admin record:', {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      is_verified: Number(admin.is_verified),
      passwordHashPresent: Boolean(admin.password),
      envPasswordMatchesStoredHash: passwordMatches,
    });

    if (!passwordMatches || admin.role !== 'admin' || Number(admin.is_verified) !== 1) {
      console.error('[DIAGNOSE] Admin data is present but not login-ready. Run: npm run admin:seed');
      process.exitCode = 3;
      return;
    }

    console.log('[DIAGNOSE] Database and admin credentials are valid.');
  } catch (error) {
    printError(error);
    process.exitCode = 1;
  } finally {
    if (connection) {
      try { await connection.end(); } catch (_) { /* no-op */ }
    }
  }
})();
