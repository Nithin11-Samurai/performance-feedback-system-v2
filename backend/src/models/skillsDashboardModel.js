/**
 * Skills dashboard model: the queries behind Skills and Certifications >
 * Dashboard. Every query works on "the people in view", which is built the
 * same way each time:
 *   $1 department (or NULL for all)   $2 manager id (a team, or NULL)   $3 user id (one person, or NULL)
 * Only active, not-deleted people are ever counted.
 */
const { query } = require('../config/db');

const POP = `pop AS (
  SELECT u.id, u.first_name, u.last_name, u.job_title, u.department, u.manager_id,
         u.phone, u.emergency_contact_name, u.emergency_contact_phone, u.no_certifications_confirmed_at
  FROM users u
  WHERE u.deleted_at IS NULL AND u.is_active = TRUE
    AND ($1::text IS NULL OR u.department = $1)
    AND ($2::uuid IS NULL OR u.manager_id = $2)
    AND ($3::uuid IS NULL OR u.id = $3)
)`;

const SKILL_KEY = `COALESCE(c.id::text, 'custom:' || LOWER(s.skill_name))`;

/** One row per person in view, with which setup steps they have finished. */
async function getPopulation(p) {
  const result = await query(
    `WITH ${POP}
     SELECT pop.id, pop.first_name, pop.last_name, pop.job_title, pop.department,
            (COALESCE(BTRIM(pop.phone), '') <> ''
              AND COALESCE(BTRIM(pop.emergency_contact_name), '') <> ''
              AND COALESCE(BTRIM(pop.emergency_contact_phone), '') <> '') AS personal_done,
            EXISTS (SELECT 1 FROM skills s WHERE s.user_id = pop.id) AS has_skills,
            (EXISTS (SELECT 1 FROM certifications ce WHERE ce.user_id = pop.id)
              OR pop.no_certifications_confirmed_at IS NOT NULL) AS certs_done
     FROM pop
     ORDER BY pop.first_name, pop.last_name`,
    [p.department, p.managerId, p.userId]
  );
  return result.rows;
}

/** Per skill: how many people are trained / in training / not trained, and the proficiency split of the trained. */
async function getSkillAggregates(p) {
  const result = await query(
    `WITH ${POP}
     SELECT ${SKILL_KEY} AS skill_key,
            c.id AS catalog_id,
            COALESCE(c.name, MIN(s.skill_name)) AS name,
            COALESCE(c.category, MIN(s.category)) AS category,
            COUNT(DISTINCT s.user_id) FILTER (WHERE s.training_status = 'trained')::int AS trained,
            COUNT(DISTINCT s.user_id) FILTER (WHERE s.training_status = 'in_training')::int AS in_training,
            COUNT(DISTINCT s.user_id) FILTER (WHERE s.training_status = 'not_trained')::int AS not_trained,
            COUNT(DISTINCT s.user_id) FILTER (WHERE s.training_status = 'trained' AND s.proficiency = 'beginner')::int AS p_beginner,
            COUNT(DISTINCT s.user_id) FILTER (WHERE s.training_status = 'trained' AND s.proficiency = 'intermediate')::int AS p_intermediate,
            COUNT(DISTINCT s.user_id) FILTER (WHERE s.training_status = 'trained' AND s.proficiency = 'advanced')::int AS p_advanced,
            COUNT(DISTINCT s.user_id) FILTER (WHERE s.training_status = 'trained' AND s.proficiency = 'expert')::int AS p_expert
     FROM skills s
     JOIN pop ON pop.id = s.user_id
     LEFT JOIN skill_catalog c ON c.id = s.catalog_id
     GROUP BY ${SKILL_KEY}, c.id, c.name, c.category`,
    [p.department, p.managerId, p.userId]
  );
  return result.rows;
}

async function getInTraining(p, limit = 100) {
  const result = await query(
    `WITH ${POP}
     SELECT pop.id AS user_id, pop.first_name, pop.last_name, pop.department,
            COALESCE(c.name, s.skill_name) AS skill_name, s.updated_at
     FROM skills s
     JOIN pop ON pop.id = s.user_id
     LEFT JOIN skill_catalog c ON c.id = s.catalog_id
     WHERE s.training_status = 'in_training'
     ORDER BY s.updated_at DESC
     LIMIT $4`,
    [p.department, p.managerId, p.userId, limit]
  );
  return result.rows;
}

/** Every (person, skill) pair where the person said "not trained". */
async function getNotTrained(p) {
  const result = await query(
    `WITH ${POP}
     SELECT pop.id AS user_id, pop.first_name, pop.last_name, pop.job_title, pop.department,
            ${SKILL_KEY} AS skill_key, COALESCE(c.name, s.skill_name) AS skill_name
     FROM skills s
     JOIN pop ON pop.id = s.user_id
     LEFT JOIN skill_catalog c ON c.id = s.catalog_id
     WHERE s.training_status = 'not_trained'
     LIMIT 5000`,
    [p.department, p.managerId, p.userId]
  );
  return result.rows;
}

async function getCertificationSummary(p) {
  const result = await query(
    `WITH ${POP}
     SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE ce.expiry_date IS NOT NULL AND ce.expiry_date < CURRENT_DATE)::int AS expired,
            COUNT(*) FILTER (WHERE ce.expiry_date >= CURRENT_DATE AND ce.expiry_date < CURRENT_DATE + 30)::int AS expiring_30,
            COUNT(*) FILTER (WHERE ce.expiry_date >= CURRENT_DATE AND ce.expiry_date < CURRENT_DATE + 60)::int AS expiring_60,
            COUNT(*) FILTER (WHERE ce.expiry_date >= CURRENT_DATE AND ce.expiry_date < CURRENT_DATE + 90)::int AS expiring_90
     FROM certifications ce
     JOIN pop ON pop.id = ce.user_id`,
    [p.department, p.managerId, p.userId]
  );
  return result.rows[0];
}

/** Certifications already expired or expiring within 90 days, soonest first. */
async function getCertificationAttention(p, limit = 100) {
  const result = await query(
    `WITH ${POP}
     SELECT ce.id, ce.name, ce.issuing_organization, ce.expiry_date,
            (ce.expiry_date - CURRENT_DATE)::int AS days_left,
            pop.id AS user_id, pop.first_name, pop.last_name, pop.department
     FROM certifications ce
     JOIN pop ON pop.id = ce.user_id
     WHERE ce.expiry_date IS NOT NULL AND ce.expiry_date < CURRENT_DATE + 90
     ORDER BY ce.expiry_date, pop.first_name
     LIMIT $4`,
    [p.department, p.managerId, p.userId, limit]
  );
  return result.rows;
}

async function getPersonSkills(userId) {
  const result = await query(
    `SELECT s.id, COALESCE(c.name, s.skill_name) AS skill_name, COALESCE(c.category, s.category) AS category,
            s.training_status, s.proficiency, s.years_experience, s.notes, s.updated_at
     FROM skills s LEFT JOIN skill_catalog c ON c.id = s.catalog_id
     WHERE s.user_id = $1
     ORDER BY COALESCE(c.category, s.category), COALESCE(c.name, s.skill_name)`,
    [userId]
  );
  return result.rows;
}

async function getPersonCertifications(userId) {
  const result = await query(
    `SELECT id, name, issuing_organization, issue_date, expiry_date, credential_id, credential_url,
            (expiry_date - CURRENT_DATE)::int AS days_left
     FROM certifications
     WHERE user_id = $1
     ORDER BY expiry_date NULLS LAST, name`,
    [userId]
  );
  return result.rows;
}

/** Everyone in view, with their row (if any) for ONE skill. */
async function getSkillPeople(p, { catalogId, nameLower }) {
  const result = await query(
    `WITH ${POP}
     SELECT pop.id AS user_id, pop.first_name, pop.last_name, pop.job_title, pop.department,
            s.training_status, s.proficiency, s.years_experience, s.notes, s.updated_at
     FROM pop
     LEFT JOIN skills s ON s.user_id = pop.id
          AND (s.catalog_id = $4::uuid OR (s.catalog_id IS NULL AND LOWER(s.skill_name) = $5::text))
     ORDER BY pop.first_name, pop.last_name`,
    [p.department, p.managerId, p.userId, catalogId, nameLower]
  );
  return result.rows;
}

async function searchPeople(term, limit = 15) {
  const like = `%${String(term).replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  const result = await query(
    `SELECT id, first_name, last_name, email, job_title, department
     FROM users
     WHERE deleted_at IS NULL AND is_active = TRUE
       AND ((first_name || ' ' || last_name) ILIKE $1 OR email ILIKE $1 OR employee_code ILIKE $1)
     ORDER BY first_name, last_name
     LIMIT $2`,
    [like, limit]
  );
  return result.rows;
}

/** People who have at least one active direct report, for the "team of" picker. */
async function listManagers() {
  const result = await query(
    `SELECT m.id, m.first_name, m.last_name, COUNT(u.id)::int AS team_size
     FROM users m
     JOIN users u ON u.manager_id = m.id AND u.deleted_at IS NULL AND u.is_active = TRUE
     WHERE m.deleted_at IS NULL AND m.is_active = TRUE
     GROUP BY m.id, m.first_name, m.last_name
     ORDER BY m.first_name, m.last_name`
  );
  return result.rows;
}

module.exports = {
  getPopulation,
  getSkillAggregates,
  getInTraining,
  getNotTrained,
  getCertificationSummary,
  getCertificationAttention,
  getPersonSkills,
  getPersonCertifications,
  getSkillPeople,
  searchPeople,
  listManagers,
};
