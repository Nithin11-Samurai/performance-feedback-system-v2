/**
 * Password hashing helpers (bcrypt).
 * Salt rounds of 12 balances security and login latency for an internal
 * HR tool at typical company scale.
 */
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = { hashPassword, comparePassword };
