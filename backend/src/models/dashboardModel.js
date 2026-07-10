/**
 * Dashboard aggregation model.
 * Pure read-only queries composed from EXISTING tables (users, review_cycles,
 * feedback, audit_logs) — no schema changes. Kept separate from the other
 * models since these are cross-table aggregates rather than single-entity
 * CRUD, and are only ever used to feed the admin dashboard.
 */
const { query } = require('../config/db');

async function countActiveEmployees(department) {
  if (department) {
    const result = await query('SELECT COUNT(*)::int AS count FROM users WHERE is_active = TRUE AND department = $1', [department]);
    return result.rows[0].count;
  }
  const result = await query('SELECT COUNT(*)::int AS count FROM users WHERE is_active = TRUE');
  return result.rows[0].count;
}

async function countActiveCycles() {
  const result = await query(`SELECT COUNT(*)::int AS count FROM review_cycles WHERE status = 'active'`);
  return result.rows[0].count;
}

/**
 * The "cycle in focus" for dashboard metrics: the active cycle if one
 * exists, otherwise the most recently started cycle (so the dashboard
 * still shows meaningful numbers between cycles instead of all zeros).
 * Admin can override this via the dashboard's cycle filter.
 */
async function getTargetCycle(overrideCycleId) {
  if (overrideCycleId) {
    const result = await query('SELECT * FROM review_cycles WHERE id = $1', [overrideCycleId]);
    return result.rows[0] || null;
  }

  const active = await query(
    `SELECT * FROM review_cycles WHERE status = 'active' ORDER BY start_date DESC LIMIT 1`
  );
  if (active.rows[0]) return active.rows[0];

  const mostRecent = await query(`SELECT * FROM review_cycles ORDER BY start_date DESC LIMIT 1`);
  return mostRecent.rows[0] || null;
}

async function getFeedbackStatusCounts(cycleId, department) {
  if (!cycleId) return { pending: 0, submitted: 0 };
  const params = [cycleId];
  let departmentJoin = '';
  if (department) {
    departmentJoin = 'JOIN users u ON u.id = f.subject_id AND u.department = $2';
    params.push(department);
  }
  const result = await query(
    `SELECT f.status, COUNT(*)::int AS count FROM feedback f ${departmentJoin} WHERE f.review_cycle_id = $1 GROUP BY f.status`,
    params
  );
  const counts = { pending: 0, submitted: 0 };
  result.rows.forEach((r) => {
    counts[r.status] = r.count;
  });
  return counts;
}

async function getAverageRating(cycleId, department) {
  if (!cycleId) return null;
  const params = [cycleId];
  let departmentJoin = '';
  if (department) {
    departmentJoin = 'JOIN users u ON u.id = f.subject_id AND u.department = $2';
    params.push(department);
  }
  const result = await query(
    `SELECT ROUND(AVG(f.rating)::numeric, 2) AS avg_rating
     FROM feedback f ${departmentJoin}
     WHERE f.review_cycle_id = $1 AND f.status = 'submitted' AND f.rating IS NOT NULL`,
    params
  );
  const avg = result.rows[0].avg_rating;
  return avg !== null ? parseFloat(avg) : null;
}

/**
 * Average rating per department, based on submitted manager+peer ratings
 * for employees in that department, for the target cycle.
 */
async function getDepartmentPerformance(cycleId) {
  if (!cycleId) return [];
  const result = await query(
    `SELECT u.department,
            ROUND(AVG(f.rating)::numeric, 2) AS avg_rating,
            COUNT(f.id)::int AS review_count
     FROM feedback f
     JOIN users u ON u.id = f.subject_id
     WHERE f.review_cycle_id = $1 AND f.status = 'submitted' AND f.rating IS NOT NULL
       AND u.department IS NOT NULL
     GROUP BY u.department
     ORDER BY avg_rating DESC`,
    [cycleId]
  );
  return result.rows.map((r) => ({ ...r, avg_rating: parseFloat(r.avg_rating) }));
}

async function getRatingDistribution(cycleId) {
  if (!cycleId) return [];
  const result = await query(
    `SELECT rating, COUNT(*)::int AS count
     FROM feedback
     WHERE review_cycle_id = $1 AND status = 'submitted' AND rating IS NOT NULL
     GROUP BY rating
     ORDER BY rating`,
    [cycleId]
  );
  return result.rows;
}

async function getRecentActivity(limit = 8) {
  const result = await query(
    `SELECT a.action, a.entity_type, a.created_at, u.first_name, u.last_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.actor_id
     ORDER BY a.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * "Upcoming reviews" = active cycles ordered by how soon they close, so HR
 * can see what needs attention next.
 */
async function getUpcomingReviews(limit = 5) {
  const result = await query(
    `SELECT id, name, end_date, status
     FROM review_cycles
     WHERE status = 'active'
     ORDER BY end_date ASC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function getRecentlyAddedEmployees(limit = 5) {
  const result = await query(
    `SELECT id, first_name, last_name, job_title, department, avatar_url, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Manager-scoped variants — same shape as the admin aggregates above, but
// filtered to a specific manager's direct reports (employeeIds).
// ---------------------------------------------------------------------------

async function getTeamFeedbackStatusCounts(cycleId, employeeIds) {
  if (!cycleId || employeeIds.length === 0) return { pending: 0, submitted: 0 };
  const result = await query(
    `SELECT status, COUNT(*)::int AS count FROM feedback
     WHERE review_cycle_id = $1 AND subject_id = ANY($2::uuid[])
     GROUP BY status`,
    [cycleId, employeeIds]
  );
  const counts = { pending: 0, submitted: 0 };
  result.rows.forEach((r) => {
    counts[r.status] = r.count;
  });
  return counts;
}

async function getTeamAverageRating(cycleId, employeeIds) {
  if (!cycleId || employeeIds.length === 0) return null;
  const result = await query(
    `SELECT ROUND(AVG(rating)::numeric, 2) AS avg_rating
     FROM feedback
     WHERE review_cycle_id = $1 AND subject_id = ANY($2::uuid[])
       AND status = 'submitted' AND rating IS NOT NULL`,
    [cycleId, employeeIds]
  );
  const avg = result.rows[0].avg_rating;
  return avg !== null ? parseFloat(avg) : null;
}

async function getTeamRatingDistribution(cycleId, employeeIds) {
  if (!cycleId || employeeIds.length === 0) return [];
  const result = await query(
    `SELECT rating, COUNT(*)::int AS count
     FROM feedback
     WHERE review_cycle_id = $1 AND subject_id = ANY($2::uuid[])
       AND status = 'submitted' AND rating IS NOT NULL
     GROUP BY rating
     ORDER BY rating`,
    [cycleId, employeeIds]
  );
  return result.rows;
}

async function getRecentlyAddedForTeam(employeeIds, limit = 5) {
  if (employeeIds.length === 0) return [];
  const result = await query(
    `SELECT id, first_name, last_name, job_title, department, avatar_url, created_at
     FROM users WHERE id = ANY($1::uuid[])
     ORDER BY created_at DESC LIMIT $2`,
    [employeeIds, limit]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Employee (self) variants
// ---------------------------------------------------------------------------

/**
 * A given employee's average rating received per past review cycle —
 * powers a personal "rating trend over time" chart.
 */
async function getMyRatingHistory(employeeId) {
  const result = await query(
    `SELECT c.name AS cycle_name, c.start_date,
            ROUND(AVG(f.rating)::numeric, 2) AS avg_rating
     FROM feedback f
     JOIN review_cycles c ON c.id = f.review_cycle_id
     WHERE f.subject_id = $1 AND f.status = 'submitted' AND f.rating IS NOT NULL
     GROUP BY c.id, c.name, c.start_date
     ORDER BY c.start_date ASC`,
    [employeeId]
  );
  return result.rows.map((r) => ({ ...r, avg_rating: parseFloat(r.avg_rating) }));
}

module.exports = {
  countActiveEmployees,
  countActiveCycles,
  getTargetCycle,
  getFeedbackStatusCounts,
  getAverageRating,
  getDepartmentPerformance,
  getRatingDistribution,
  getRecentActivity,
  getUpcomingReviews,
  getRecentlyAddedEmployees,
  getTeamFeedbackStatusCounts,
  getTeamAverageRating,
  getTeamRatingDistribution,
  getRecentlyAddedForTeam,
  getMyRatingHistory,
};
