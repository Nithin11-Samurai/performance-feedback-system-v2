/**
 * PostgreSQL connection pool.
 *
 * We expose a `query` helper (for simple one-off queries) and a
 * `getClient` helper (for multi-statement transactions) rather than
 * letting the rest of the app talk to `pg` directly. This keeps
 * connection handling and slow-query logging centralized.
 */
const { Pool } = require('pg');
const config = require('./env');
const logger = require('../utils/logger');

const poolConfig = config.db.connectionString
  ? { connectionString: config.db.connectionString }
  : {
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
    };

const pool = new Pool({
  ...poolConfig,
  // Supabase (and most managed Postgres providers) require SSL when
  // connecting via a connection string. Local/direct host connections
  // don't need it. `rejectUnauthorized: false` is standard for Supabase's
  // self-signed-style pooler certs.
  ssl: config.db.connectionString ? { rejectUnauthorized: false } : false,
  max: 20, // max simultaneous clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // Unexpected errors on idle clients (e.g. connection dropped by the DB).
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

/**
 * Run a single query against the pool.
 * @param {string} text - SQL text with $1, $2... placeholders
 * @param {Array} params - parameter values
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 200) {
    logger.warn('Slow query detected', { text, duration, rows: result.rowCount });
  }
  return result;
}

/**
 * Get a dedicated client for multi-statement transactions.
 * Caller is responsible for calling client.release() when done.
 *
 * Usage:
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     ...
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *     throw e;
 *   } finally {
 *     client.release();
 *   }
 */
async function getClient() {
  const client = await pool.connect();
  return client;
}

module.exports = { pool, query, getClient };
