/**
 * OTP password reset model (Item 5). Alongside the existing email-link
 * flow (passwordResetModel.js) — same security posture: OTP is stored as
 * a SHA-256 hash, never in plaintext, single-use, short expiry.
 */
const crypto = require('crypto');
const { query } = require('../config/db');

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

async function create(userId, otp, expiresAt) {
  await query(
    'INSERT INTO password_reset_otps (user_id, otp_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hashOtp(otp), expiresAt]
  );
}

/**
 * Finds the most recent unexpired, unused OTP for a user and checks it
 * against the provided code. Tracks attempts and locks out after 5 wrong
 * tries on a given OTP, to prevent brute-forcing a 6-digit code.
 */
async function findValid(userId) {
  const result = await query(
    `SELECT * FROM password_reset_otps
     WHERE user_id = $1 AND used = FALSE AND expires_at > NOW() AND attempts < 5
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function verifyOtp(userId, otp) {
  const record = await findValid(userId);
  if (!record) return null;

  if (record.otp_hash !== hashOtp(otp)) {
    await query('UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = $1', [record.id]);
    return null;
  }
  return record;
}

async function markUsed(id) {
  await query('UPDATE password_reset_otps SET used = TRUE WHERE id = $1', [id]);
}

module.exports = { create, findValid, verifyOtp, markUsed };
