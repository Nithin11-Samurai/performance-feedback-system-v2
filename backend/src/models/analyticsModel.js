/**
 * Analytics model. Pure read-only aggregate queries, admin-only consumer.
 * Distinct from dashboardModel: dashboard is "what's happening right now
 * in the current/active cycle", analytics is "trends and comparisons
 * across the whole organization over time".
 */
const { query } = require('../config/db');

async function getDepartmentAnalytics() {
  const result = await query(
    `SELECT u.department,
            ROUND(AVG(f.rating)::numeric, 2) AS avg_rating,
            COUNT(DISTINCT f.subject_id)::int AS employees_reviewed,
            COUNT(f.id)::int AS total_ratings
     FROM feedback f
     JOIN users u ON u.id = f.subject_id
     WHERE f.status = 'submitted' AND f.rating IS NOT NULL AND u.department IS NOT NULL
     GROUP BY u.department
     ORDER BY avg_rating DESC`
  );
  return result.rows.map((r) => ({ ...r, avg_rating: parseFloat(r.avg_rating) }));
}

async function getTopPerformers(limit = 5) {
  const result = await query(
    `SELECT u.id, u.first_name, u.last_name, u.job_title, u.department,
            ROUND(AVG(f.rating)::numeric, 2) AS avg_rating,
            COUNT(f.id)::int AS rating_count
     FROM feedback f
     JOIN users u ON u.id = f.subject_id
     WHERE f.status = 'submitted' AND f.rating IS NOT NULL AND f.type IN ('manager', 'peer')
     GROUP BY u.id, u.first_name, u.last_name, u.job_title, u.department
     HAVING COUNT(f.id) >= 1
     ORDER BY avg_rating DESC, rating_count DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map((r) => ({ ...r, avg_rating: parseFloat(r.avg_rating) }));
}

/**
 * Skill gap analysis: for each (category, skill), how many employees have
 * it at each proficiency level. A "gap" is a skill where most employees
 * cluster at beginner/intermediate with few at advanced/expert.
 */
async function getSkillGapAnalysis() {
  const result = await query(
    `SELECT category, skill_name, proficiency, COUNT(*)::int AS employee_count
     FROM skills
     GROUP BY category, skill_name, proficiency
     ORDER BY category, skill_name,
       CASE proficiency
         WHEN 'beginner' THEN 1
         WHEN 'intermediate' THEN 2
         WHEN 'advanced' THEN 3
         WHEN 'expert' THEN 4
       END`
  );
  return result.rows;
}

async function getCertificationStats() {
  const totalsResult = await query(
    `SELECT name, COUNT(*)::int AS holder_count
     FROM certifications
     GROUP BY name
     ORDER BY holder_count DESC
     LIMIT 10`
  );
  const expiringResult = await query(
    `SELECT COUNT(*)::int AS count FROM certifications
     WHERE expiry_date IS NOT NULL AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'`
  );
  const totalCertsResult = await query(`SELECT COUNT(*)::int AS count FROM certifications`);

  return {
    topCertifications: totalsResult.rows,
    expiringWithin90Days: expiringResult.rows[0].count,
    totalCertifications: totalCertsResult.rows[0].count,
  };
}

/**
 * Average rating and completion % per cycle, ordered chronologically —
 * powers the org-wide trend charts.
 */
async function getCycleTrends() {
  const result = await query(
    `SELECT c.id, c.name, c.start_date,
            ROUND(AVG(f.rating) FILTER (WHERE f.rating IS NOT NULL AND f.status = 'submitted')::numeric, 2) AS avg_rating,
            COUNT(f.id) FILTER (WHERE f.status = 'submitted')::int AS submitted_count,
            COUNT(f.id)::int AS total_count
     FROM review_cycles c
     LEFT JOIN feedback f ON f.review_cycle_id = c.id
     GROUP BY c.id, c.name, c.start_date
     ORDER BY c.start_date ASC`
  );
  return result.rows.map((r) => ({
    ...r,
    avg_rating: r.avg_rating !== null ? parseFloat(r.avg_rating) : null,
    completion_pct: r.total_count > 0 ? Math.round((r.submitted_count / r.total_count) * 100) : 0,
  }));
}

/**
 * Item 7: Skills Overview — every distinct skill, how many employees have
 * it, broken down by proficiency level. E.g. "Apex: 3 beginner, 2
 * intermediate, 1 advanced".
 */
async function getSkillsOverview() {
  const result = await query(
    `SELECT category, skill_name, proficiency, COUNT(*)::int AS employee_count
     FROM skills
     GROUP BY category, skill_name, proficiency
     ORDER BY category, skill_name`
  );
  return result.rows;
}

/** Every employee who has a specific skill, with their proficiency — for drill-down. */
async function getEmployeesForSkill(category, skillName) {
  const result = await query(
    `SELECT u.id, u.first_name, u.last_name, u.job_title, u.department, s.proficiency, s.years_experience
     FROM skills s JOIN users u ON u.id = s.user_id
     WHERE s.category = $1 AND s.skill_name = $2
     ORDER BY u.first_name`,
    [category, skillName]
  );
  return result.rows;
}

/**
 * Item 7: Certifications Overview — every distinct certification name and
 * how many employees hold it.
 */
async function getCertificationsOverview() {
  const result = await query(
    `SELECT name, COUNT(*)::int AS holder_count,
            COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < NOW())::int AS expired_count
     FROM certifications
     GROUP BY name
     ORDER BY holder_count DESC, name`
  );
  return result.rows;
}

/** Every employee who holds a specific certification — for drill-down. */
async function getEmployeesForCertification(name) {
  const result = await query(
    `SELECT u.id, u.first_name, u.last_name, u.job_title, u.department,
            c.issue_date, c.expiry_date, c.credential_id, c.credential_url
     FROM certifications c JOIN users u ON u.id = c.user_id
     WHERE c.name = $1
     ORDER BY u.first_name`,
    [name]
  );
  return result.rows;
}

module.exports = {
  getDepartmentAnalytics,
  getTopPerformers,
  getSkillGapAnalysis,
  getCertificationStats,
  getCycleTrends,
  getSkillsOverview,
  getEmployeesForSkill,
  getCertificationsOverview,
  getEmployeesForCertification,
};
