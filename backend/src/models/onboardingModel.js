/**
 * Onboarding model: the few reads/writes behind the first-login setup.
 * Completion of each step is derived from existing data, so this only
 * needs a counts query plus two small flags.
 */
const { query } = require('../config/db');

async function getRaw(userId) {
  const result = await query(
    `SELECT u.phone, u.address, u.emergency_contact_name, u.emergency_contact_phone,
            u.no_certifications_confirmed_at, u.onboarding_dismissed_at,
            (SELECT COUNT(*)::int FROM skills s WHERE s.user_id = u.id) AS skill_count,
            (SELECT COUNT(*)::int FROM certifications c WHERE c.user_id = u.id) AS cert_count
     FROM users u WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function savePersonal(userId, { phone, address, emergencyContactName, emergencyContactPhone }) {
  await query(
    `UPDATE users
     SET phone = $2, address = $3, emergency_contact_name = $4, emergency_contact_phone = $5
     WHERE id = $1`,
    [userId, phone, address, emergencyContactName, emergencyContactPhone]
  );
}

async function setNoCertifications(userId, none) {
  await query(
    'UPDATE users SET no_certifications_confirmed_at = CASE WHEN $2 THEN NOW() ELSE NULL END WHERE id = $1',
    [userId, !!none]
  );
}

async function dismiss(userId) {
  await query('UPDATE users SET onboarding_dismissed_at = NOW() WHERE id = $1', [userId]);
}

module.exports = { getRaw, savePersonal, setNoCertifications, dismiss };
