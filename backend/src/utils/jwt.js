/**
 * JWT helpers.
 * Access tokens are short-lived and carry the user's id/role/manager for
 * fast authorization checks without hitting the DB on every request.
 * Refresh tokens are long-lived, opaque-to-payload, and tracked in the
 * `refresh_tokens` table so they can be revoked (logout / password change).
 */
const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Sign a short-lived access token.
 * @param {{id: string, role: string, email: string}} user
 */
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

/**
 * Sign a long-lived refresh token. Payload is intentionally minimal —
 * the DB row (refresh_tokens) is the source of truth for validity/revocation.
 */
function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
