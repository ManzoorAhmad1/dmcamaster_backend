require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { initDB, getDB, closeDB } = require('../config/db');

const REQUIRED_BOOKING_COLUMNS = [
  'id', 'booking_ref', 'name', 'email', 'phone', 'website', 'issue', 'message',
  'booking_date', 'booking_time', 'timezone', 'status', 'admin_notes',
  'created_at', 'updated_at',
];

/**
 * Idempotent database seed/schema check.
 *
 * - Creates every missing application table through initDB().
 * - Adds missing fields and indexes to legacy tables.
 * - Verifies the guest strategy-call bookings table after synchronization.
 * - Does not insert fake booking records or overwrite existing customer data.
 */
const seedDatabase = async ({ closeAfter = false } = {}) => {
  try {
    console.log('[SEED] Synchronizing database schema...');
    await initDB();

    const [columns] = await getDB().query('SHOW COLUMNS FROM `bookings`');
    const existing = new Set(columns.map(column => column.Field));
    const missing = REQUIRED_BOOKING_COLUMNS.filter(column => !existing.has(column));

    if (missing.length) {
      throw new Error(`Bookings table is missing required fields after sync: ${missing.join(', ')}`);
    }

    console.log(`[SEED] Bookings table ready with ${REQUIRED_BOOKING_COLUMNS.length} required fields.`);
    console.log('[SEED] Guest booking records will appear in Admin Panel > Strategy Calls.');
  } finally {
    if (closeAfter) await closeDB();
  }
};

if (require.main === module) {
  seedDatabase({ closeAfter: true })
    .then(() => {
      console.log('[SEED] Database seed/schema verification finished successfully.');
      process.exit(0);
    })
    .catch(error => {
      console.error('[SEED ERROR]', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase, REQUIRED_BOOKING_COLUMNS };
