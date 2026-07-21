#!/usr/bin/env node

const { initDB, closeDB } = require('../config/db');

(async () => {
  try {
    console.log('[DB] Starting manual database schema sync...');
    await initDB();
    console.log('[DB] Manual database schema sync finished successfully.');
    await closeDB();
    process.exit(0);
  } catch (error) {
    console.error('[DB] Manual schema sync failed:', error.message);
    try { await closeDB(); } catch (_) { /* no-op */ }
    process.exit(1);
  }
})();
