/**
 * Refresh token model.
 * We store a SHA-256 hash of each refresh token (never the raw token) so a
 * leaked database dump can't be used to mint new access tokens.
 */
const crypto = require('crypto');
const { query } = require('../config/db');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function store(userId, token, expiresAt) {
  const tokenHash = hashToken(token);
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );
}

async function isValid(userId, token) {
  const tokenHash = hashToken(token);
  const result = await query(
    `SELECT id FROM refresh_tokens
     WHERE user_id = $1 AND token_hash = $2 AND revoked = FALSE AND expires_at > NOW()`,
    [userId, tokenHash]
  );
  return result.rows.length > 0;
}

async function revoke(userId, token) {
  const tokenHash = hashToken(token);
  await query(
    'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND token_hash = $2',
    [userId, tokenHash]
  );
}

async function revokeAllForUser(userId) {
  await query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [userId]);
}

module.exports = { store, isValid, revoke, revokeAllForUser };
