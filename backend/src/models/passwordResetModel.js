/**
 * Password reset token model. Tokens are stored as SHA-256 hashes (never
 * the raw token), same pattern as refresh tokens, so a DB leak alone can't
 * be used to reset anyone's password.
 */
const crypto = require('crypto');
const { query } = require('../config/db');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function create(userId, token, expiresAt) {
  await query(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hashToken(token), expiresAt]
  );
}

async function findValid(token) {
  const result = await query(
    `SELECT * FROM password_reset_tokens
     WHERE token_hash = $1 AND used = FALSE AND expires_at > NOW()`,
    [hashToken(token)]
  );
  return result.rows[0] || null;
}

async function markUsed(id) {
  await query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [id]);
}

module.exports = { create, findValid, markUsed };
