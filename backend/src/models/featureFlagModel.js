const { query } = require('../config/db');

async function listAll() {
  const result = await query('SELECT * FROM feature_flags ORDER BY label');
  return result.rows;
}

async function getByKey(key) {
  const result = await query('SELECT * FROM feature_flags WHERE key = $1', [key]);
  return result.rows[0] || null;
}

async function upsert(key, { visibleToAdminTier, visibleToEmployees }, updatedBy) {
  const result = await query(
    `UPDATE feature_flags
     SET visible_to_admin_tier = $2, visible_to_employees = $3, updated_by = $4, updated_at = NOW()
     WHERE key = $1
     RETURNING *`,
    [key, visibleToAdminTier, visibleToEmployees, updatedBy]
  );
  return result.rows[0] || null;
}

module.exports = { listAll, getByKey, upsert };
