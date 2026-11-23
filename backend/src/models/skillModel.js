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
async function upsert({
  userId,
  catalogId,
  category,
  skillName,
  trainingStatus,
  proficiency,
  yearsExperience,
  notes,
}) {
  // One record per skill per person: match on the catalog skill, or (for
  // free-text skills) on the name regardless of spelling case or category.
  const existing = await query(
    `SELECT id FROM skills
     WHERE user_id = $1
       AND ((catalog_id IS NOT NULL AND catalog_id = $2) OR LOWER(skill_name) = LOWER($3))
     ORDER BY (catalog_id IS NOT NULL) DESC, created_at
     LIMIT 1`,
    [userId, catalogId || null, skillName]
  );

  if (existing.rows[0]) {
    const result = await query(
      `UPDATE skills
       SET catalog_id = $2, category = $3, skill_name = $4, training_status = $5,
           proficiency = $6, years_experience = $7, notes = $8, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [existing.rows[0].id, catalogId || null, category, skillName, trainingStatus, proficiency, yearsExperience || 0, notes || null]
    );
    return result.rows[0];
  }

  const result = await query(
    `INSERT INTO skills (user_id, catalog_id, category, skill_name, training_status, proficiency, years_experience, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, catalogId || null, category, skillName, trainingStatus, proficiency, yearsExperience || 0, notes || null]
  );
  return result.rows[0];
}

async function remove(id, userId) {
  const result = await query('DELETE FROM skills WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
  return result.rows.length > 0;
}

/** True if HR was already told about this person's skill changes in the last N minutes. */
async function recentSkillNotificationExists(link, minutes) {
  const result = await query(
    `SELECT 1 FROM notifications
     WHERE type = 'skill_updated' AND link = $1 AND created_at > NOW() - ($2 || ' minutes')::interval
     LIMIT 1`,
    [link, String(minutes)]
  );
  return result.rows.length > 0;
}

module.exports = { listByUser, findById, upsert, remove, recentSkillNotificationExists };
