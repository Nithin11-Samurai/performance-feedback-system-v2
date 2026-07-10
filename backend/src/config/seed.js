/**
 * Seed script — creates an initial Admin/HR user so you can log in for the
 * first time. Safe to re-run: skips creation if the admin email already
 * exists.
 *
 * Usage: npm run seed
 */
const bcrypt = require('bcryptjs');
const { pool } = require('./db');
const logger = require('../utils/logger');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@company.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

async function seed() {
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);

    if (existing.rows.length > 0) {
      logger.info('Seed admin already exists, skipping.', { email: ADMIN_EMAIL });
      return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await pool.query(
      `INSERT INTO users
        (employee_code, first_name, last_name, email, password_hash, role, job_title, department, date_of_joining)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      ['EMP-0001', 'System', 'Admin', ADMIN_EMAIL, passwordHash, 'admin', 'HR Administrator', 'Human Resources', new Date()]
    );

    logger.info('Seed admin user created.', { email: ADMIN_EMAIL });
    logger.warn('IMPORTANT: Change the seed admin password immediately after first login.');
  } catch (err) {
    logger.error('Seeding failed', { error: err.message });
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
