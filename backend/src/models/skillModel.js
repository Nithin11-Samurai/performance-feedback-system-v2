/**
 * Skill model — all SQL for the `skills` table (Salesforce & Conga skills).
 */
const { query } = require('../config/db');

async function listByUser(userId) {
  const result = await query(
    'SELECT * FROM skills WHERE user_id = $1 ORDER BY category, skill_name',
    [userId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await query('SELECT * FROM skills WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Insert a new skill, or update it in place if the user already has a skill
 * with the same category + name (matches the DB's unique constraint) —
 * this lets the frontend "add or update" a skill in a single call.
 */
async function upsert({ userId, category, skillName, proficiency, yearsExperience, notes }) {
  const result = await query(
    `INSERT INTO skills (user_id, category, skill_name, proficiency, years_experience, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, category, skill_name)
     DO UPDATE SET proficiency = EXCLUDED.proficiency,
                   years_experience = EXCLUDED.years_experience,
                   notes = EXCLUDED.notes,
                   updated_at = NOW()
     RETURNING *`,
    [userId, category, skillName, proficiency, yearsExperience || 0, notes || null]
  );
  return result.rows[0];
}

async function remove(id, userId) {
  const result = await query('DELETE FROM skills WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
  return result.rows.length > 0;
}

module.exports = { listByUser, findById, upsert, remove };
