/**
 * Skill catalog model — all SQL for the `skill_catalog` table (the
 * admin-managed list of skills employees pick from) plus the few queries
 * that keep employees' skill records in step with it.
 */
const { query } = require('../config/db');

async function listAll({ includeInactive = false } = {}) {
  const result = await query(
    `SELECT * FROM skill_catalog
     ${includeInactive ? '' : 'WHERE is_active = TRUE'}
     ORDER BY category, sort_order, name`
  );
  return result.rows;
}

async function findById(id) {
  const result = await query('SELECT * FROM skill_catalog WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findByName(name) {
  const result = await query('SELECT * FROM skill_catalog WHERE LOWER(name) = LOWER($1)', [name]);
  return result.rows[0] || null;
}

async function create({ name, category, createdBy }) {
  const result = await query(
    `INSERT INTO skill_catalog (name, category, sort_order, created_by)
     VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) FROM skill_catalog), 0) + 1, $3)
     RETURNING *`,
    [name, category, createdBy || null]
  );
  return result.rows[0];
}

async function update(id, { name, category, isActive }) {
  const result = await query(
    `UPDATE skill_catalog
     SET name = COALESCE($2, name),
         category = COALESCE($3, category),
         is_active = COALESCE($4, is_active),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, name ?? null, category ?? null, typeof isActive === 'boolean' ? isActive : null]
  );
  return result.rows[0] || null;
}

/** Keep employees' linked skill records in step when a catalog skill is renamed or recategorised. */
async function syncLinkedSkills(catalogId, { name, category }) {
  await query('UPDATE skills SET skill_name = $2, category = $3 WHERE catalog_id = $1', [catalogId, name, category]);
}

/**
 * Link free-text ("custom") skills with the same name to a catalog skill.
 * Tries to also align their name/category with the catalog; if that would
 * collide with the unique (user, category, name) rule it falls back to
 * linking only, which is always safe.
 */
async function linkCustomSkills(catalogId, { name, category }) {
  try {
    await query(
      `UPDATE skills s
       SET catalog_id = $1, skill_name = $2, category = $3
       WHERE s.catalog_id IS NULL AND LOWER(s.skill_name) = LOWER($2)
         AND NOT EXISTS (
           SELECT 1 FROM skills x
           WHERE x.user_id = s.user_id AND x.id <> s.id AND x.category = $3 AND x.skill_name = $2
         )`,
      [catalogId, name, category]
    );
  } catch (err) {
    await query('UPDATE skills SET catalog_id = $1 WHERE catalog_id IS NULL AND LOWER(skill_name) = LOWER($2)', [
      catalogId,
      name,
    ]);
  }
}

/** Skills people typed in themselves (not linked to the catalog), grouped by name, for the admin "custom skills" list. */
async function listCustomSkills() {
  const result = await query(
    `SELECT MIN(skill_name) AS name, MIN(category) AS category, COUNT(DISTINCT user_id)::int AS employee_count
     FROM skills
     WHERE catalog_id IS NULL
     GROUP BY LOWER(skill_name)
     ORDER BY employee_count DESC, MIN(skill_name)`
  );
  return result.rows;
}

module.exports = { listAll, findById, findByName, create, update, syncLinkedSkills, linkCustomSkills, listCustomSkills };
