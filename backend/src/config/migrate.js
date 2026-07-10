/**
 * Simple migration runner.
 * For a system this size, a single idempotent schema.sql (using
 * CREATE TABLE IF NOT EXISTS) is easier to reason about than a full
 * migration framework. If the schema grows significantly, consider
 * swapping this for node-pg-migrate.
 *
 * Usage: npm run migrate
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const logger = require('../utils/logger');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    logger.info('Running database migration...');
    await pool.query(sql);
    logger.info('Migration completed successfully.');
  } catch (err) {
    logger.error('Migration failed', { error: err.message });
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
