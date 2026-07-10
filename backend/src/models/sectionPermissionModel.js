/**
 * Per-user section permission overrides (Item 10). A row here OVERRIDES
 * the role-based default for that one user and section. No row means
 * "use the role default" (see permissionService.js for the defaults).
 */
const { query } = require('../config/db');

async function listForUser(userId) {
  const result = await query('SELECT * FROM user_section_permissions WHERE user_id = $1', [userId]);
  return result.rows;
}

async function upsert({ userId, sectionKey, allowed, updatedBy }) {
  const result = await query(
    `INSERT INTO user_section_permissions (user_id, section_key, allowed, updated_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, section_key)
     DO UPDATE SET allowed = EXCLUDED.allowed, updated_by = EXCLUDED.updated_by, updated_at = NOW()
     RETURNING *`,
    [userId, sectionKey, allowed, updatedBy]
  );
  return result.rows[0];
}

async function remove(userId, sectionKey) {
  const result = await query(
    'DELETE FROM user_section_permissions WHERE user_id = $1 AND section_key = $2 RETURNING id',
    [userId, sectionKey]
  );
  return result.rows.length > 0;
}

async function findOverride(userId, sectionKey) {
  const result = await query(
    'SELECT * FROM user_section_permissions WHERE user_id = $1 AND section_key = $2',
    [userId, sectionKey]
  );
  return result.rows[0] || null;
}

module.exports = { listForUser, upsert, remove, findOverride };
