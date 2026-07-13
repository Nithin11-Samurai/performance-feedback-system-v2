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
  // Item 4: lowered from 30s. Managed poolers (Supabase's pgbouncer-style
  // pooler especially) can silently drop idle connections from their side
  // well before our own idleTimeoutMillis would recycle them, leaving a
  // stale connection in our pool that only fails on the NEXT query — which
  // is exactly the "works, then hangs, then works again after a refresh"
  // pattern. Recycling more aggressively on our end reduces how often we
  // hand out a connection the pooler has already killed.
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
});

pool.on('error', (err) => {
  // Unexpected errors on idle clients (e.g. connection dropped by the DB).
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

// Error codes/messages that indicate the connection itself died rather
// than a real query problem — safe to silently retry once on a fresh
// connection, since the query never actually ran against the database.
const TRANSIENT_CONNECTION_ERRORS = [
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'Connection terminated unexpectedly',
  'terminating connection due to administrator command',
];

function isTransientConnectionError(err) {
  const text = `${err.code || ''} ${err.message || ''}`;
  return TRANSIENT_CONNECTION_ERRORS.some((marker) => text.includes(marker));
}

/**
 * Run a single query against the pool.
 * @param {string} text - SQL text with $1, $2... placeholders
 * @param {Array} params - parameter values
 */
async function query(text, params, _isRetry = false) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 200) {
      logger.warn('Slow query detected', { text, duration, rows: result.rowCount });
    }
    return result;
  } catch (err) {
    if (!_isRetry && isTransientConnectionError(err)) {
      // Item 4: the connection died before the query could run (stale
      // pooled connection, brief network blip) — retry once on a fresh
      // connection rather than failing the request. If this ALSO fails,
      // it's a real problem and we let the error propagate normally.
      logger.warn('Transient DB connection error, retrying once', { error: err.message });
      return query(text, params, true);
    }
    throw err;
  }
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
