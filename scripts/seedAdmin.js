#!/usr/bin/env node

const path = require('path');
const { randomUUID } = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { initDB, getDB, closeDB } = require('../config/db');

(async () => {
  try {
    const email = String(process.env.ADMIN_LOGIN_EMAIL || 'admin@dmcamaster.com')
      .trim()
      .toLowerCase();
    const password = String(process.env.ADMIN_LOGIN_PASSWORD || 'DmcaMaster@2026');
    const name = String(process.env.ADMIN_LOGIN_NAME || 'DMCA Master Admin').trim();

    if (!email || !email.includes('@')) {
      throw new Error('ADMIN_LOGIN_EMAIL is missing or invalid in .env');
    }
    if (password.length < 8) {
      throw new Error('ADMIN_LOGIN_PASSWORD must contain at least 8 characters');
    }

    // Creates missing tables/columns first.
    await initDB();

    const db = getDB();
    const hash = await bcrypt.hash(password, 12);
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email]
    );

    if (existing.length) {
      await db.execute(
        `UPDATE users
            SET name = ?, email = ?, password = ?, role = 'admin', is_verified = 1,
                otp = NULL, otp_expires = NULL, otp_type = NULL,
                reset_token = NULL, reset_expires = NULL
          WHERE id = ?`,
        [name, email, hash, existing[0].id]
      );
      console.log(`[ADMIN] Existing admin credentials reset successfully: ${email}`);
    } else {
      await db.execute(
        `INSERT INTO users
          (id, name, email, password, role, is_verified, otp, otp_expires, otp_type)
         VALUES (?, ?, ?, ?, 'admin', 1, NULL, NULL, NULL)`,
        [randomUUID(), name, email, hash]
      );
      console.log(`[ADMIN] New admin account created successfully: ${email}`);
    }

    console.log('[ADMIN] You can now sign in using ADMIN_LOGIN_EMAIL and ADMIN_LOGIN_PASSWORD from .env');
    await closeDB();
    process.exit(0);
  } catch (error) {
    console.error('[ADMIN] Admin seed/reset failed:', error.message);
    try { await closeDB(); } catch (_) { /* no-op */ }
    process.exit(1);
  }
})();
