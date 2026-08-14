/**
 * Peer Insights model — anonymous 360 feedback organized around project
 * groups, decoupled entirely from performance review cycles (Item 9).
 */
const { query } = require('../config/db');

// --- Project groups ---

async function createGroup({ name, description, createdBy }) {
  const result = await query(
    'INSERT INTO project_groups (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
    [name, description || null, createdBy]
  );
  return result.rows[0];
}

async function updateGroup(id, { name, description }) {
  const result = await query(
    `UPDATE project_groups SET name = COALESCE($2, name), description = $3 WHERE id = $1 RETURNING *`,
    [id, name || null, description ?? null]
  );
  return result.rows[0] || null;
}

async function listGroups() {
  const result = await query(
    `SELECT g.*, COUNT(m.id)::int AS member_count
     FROM project_groups g
     LEFT JOIN project_group_members m ON m.project_group_id = g.id
     GROUP BY g.id
     ORDER BY g.created_at DESC`
  );
  return result.rows;
}

async function findGroupById(id) {
  const result = await query('SELECT * FROM project_groups WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function deleteGroup(id) {
  const result = await query('DELETE FROM project_groups WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
}

async function addMember(groupId, userId) {
  const result = await query(
    `INSERT INTO project_group_members (project_group_id, user_id) VALUES ($1, $2)
     ON CONFLICT (project_group_id, user_id) DO NOTHING RETURNING *`,
    [groupId, userId]
  );
  return result.rows[0] || null;
}

async function removeMember(groupId, userId) {
  const result = await query(
    'DELETE FROM project_group_members WHERE project_group_id = $1 AND user_id = $2 RETURNING id',
    [groupId, userId]
  );
  return result.rows.length > 0;
}

async function listMembers(groupId) {
  const result = await query(
    `SELECT u.id, u.first_name, u.last_name, u.job_title, u.department, u.avatar_url
     FROM project_group_members m JOIN users u ON u.id = m.user_id
     WHERE m.project_group_id = $1 ORDER BY u.first_name`,
    [groupId]
  );
  return result.rows;
}

/** Every project group a specific employee is a member of, with member counts - powers the employee dashboard's "My Projects" info. */
async function listGroupsForMember(userId) {
  const result = await query(
    `SELECT g.id, g.name, g.description, g.created_at,
            (SELECT COUNT(*)::int FROM project_group_members m2 WHERE m2.project_group_id = g.id) AS member_count
     FROM project_groups g
     JOIN project_group_members m ON m.project_group_id = g.id
     WHERE m.user_id = $1
     ORDER BY g.created_at DESC`,
    [userId]
  );
  return result.rows;
}

// --- Rounds ---

async function createRound({ groupId, name, startedBy, endDate }) {
  const result = await query(
    'INSERT INTO peer_insight_rounds (project_group_id, name, started_by, end_date) VALUES ($1, $2, $3, $4) RETURNING *',
    [groupId, name, startedBy, endDate || null]
  );
  return result.rows[0];
}

/** How many rounds a group already has - used to auto-name new ones "Round N". */
async function countRoundsForGroup(groupId) {
  const result = await query('SELECT COUNT(*)::int AS count FROM peer_insight_rounds WHERE project_group_id = $1', [
    groupId,
  ]);
  return result.rows[0].count;
}

async function listRoundsForGroup(groupId) {
  const result = await query(
    'SELECT * FROM peer_insight_rounds WHERE project_group_id = $1 ORDER BY started_at DESC',
    [groupId]
  );
  return result.rows;
}

async function findRoundById(id) {
  const result = await query('SELECT * FROM peer_insight_rounds WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function closeRound(id) {
  const result = await query(
    `UPDATE peer_insight_rounds SET status = 'closed', closed_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

/** Reopens a closed round without losing its history - existing feedback stays exactly as it was. */
async function reactivateRound(id) {
  const result = await query(
    `UPDATE peer_insight_rounds SET status = 'active', closed_at = NULL WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

async function updateRound(id, { name, startedAt, endDate }) {
  const result = await query(
    `UPDATE peer_insight_rounds
     SET name = COALESCE($2, name),
         started_at = COALESCE($3, started_at),
         end_date = COALESCE($4, end_date)
     WHERE id = $1 RETURNING *`,
    [id, name || null, startedAt || null, endDate || null]
  );
  return result.rows[0] || null;
}

async function listAllRounds() {
  const result = await query(
    `SELECT r.*, g.name AS group_name
     FROM peer_insight_rounds r JOIN project_groups g ON g.id = r.project_group_id
     ORDER BY r.started_at DESC`
  );
  return result.rows;
}

// --- Feedback (anonymous — reviewer_id is stored but NEVER exposed
// outside Admin/HR-tier queries) ---

async function bulkCreateAssignments(roundId, pairs) {
  // pairs: [{ subjectId, reviewerId }]
  const results = [];
  for (const pair of pairs) {
    const result = await query(
      `INSERT INTO peer_insight_feedback (round_id, subject_id, reviewer_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (round_id, subject_id, reviewer_id) DO NOTHING
       RETURNING *`,
      [roundId, pair.subjectId, pair.reviewerId]
    );
    if (result.rows[0]) results.push(result.rows[0]);
  }
  return results;
}

async function listAssignmentsForReviewer(roundId, reviewerId) {
  const result = await query(
    `SELECT f.*, s.first_name AS subject_first_name, s.last_name AS subject_last_name, s.job_title AS subject_job_title
     FROM peer_insight_feedback f JOIN users s ON s.id = f.subject_id
     WHERE f.round_id = $1 AND f.reviewer_id = $2
     ORDER BY s.first_name`,
    [roundId, reviewerId]
  );
  return result.rows;
}

/**
 * Every pending (not yet submitted) assignment for this reviewer, across
 * ALL active rounds/groups — this is what the employee-facing "My Peer
 * Reviews" list uses, since a reviewer landing on /peer-insights from a
 * notification has no round ID to look up on their own.
 */
/** How many peer reviews this person has personally submitted as a reviewer, all-time - powers "Completed reviews" on their own action items card. */
async function countCompletedReviewsByReviewer(reviewerId) {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM peer_insight_feedback WHERE reviewer_id = $1 AND status = 'submitted'`,
    [reviewerId]
  );
  return result.rows[0].count;
}

async function listAllPendingAssignmentsForReviewer(reviewerId) {
  const result = await query(
    `SELECT f.*, s.first_name AS subject_first_name, s.last_name AS subject_last_name, s.job_title AS subject_job_title,
            r.name AS round_name, r.end_date AS round_end_date, g.name AS group_name
     FROM peer_insight_feedback f
     JOIN users s ON s.id = f.subject_id
     JOIN peer_insight_rounds r ON r.id = f.round_id
     JOIN project_groups g ON g.id = r.project_group_id
     WHERE f.reviewer_id = $1 AND f.status = 'pending' AND r.status = 'active'
     ORDER BY r.started_at DESC, s.first_name`,
    [reviewerId]
  );
  return result.rows;
}

async function findFeedbackById(id) {
  const result = await query('SELECT * FROM peer_insight_feedback WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function saveDraft(id, { rating, strengths, improvementAreas, comments, categoryScores }) {
  const result = await query(
    `UPDATE peer_insight_feedback
     SET rating = $2, strengths = $3, improvement_areas = $4, comments = $5, category_scores = $6
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, rating || null, strengths || null, improvementAreas || null, comments || null, categoryScores ? JSON.stringify(categoryScores) : null]
  );
  return result.rows[0] || null;
}

async function markSubmitted(id) {
  const result = await query(
    `UPDATE peer_insight_feedback SET status = 'submitted', submitted_at = NOW()
     WHERE id = $1 AND status = 'pending' RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

// Admin/HR-only: raw feedback WITH reviewer identity, for a subject in a round.
async function listRawFeedbackForSubject(roundId, subjectId) {
  const result = await query(
    `SELECT f.*, r.first_name AS reviewer_first_name, r.last_name AS reviewer_last_name
     FROM peer_insight_feedback f JOIN users r ON r.id = f.reviewer_id
     WHERE f.round_id = $1 AND f.subject_id = $2 AND f.status = 'submitted'
     ORDER BY f.submitted_at`,
    [roundId, subjectId]
  );
  return result.rows;
}

async function getCompletionSummary(roundId) {
  const result = await query(
    `SELECT status, COUNT(*)::int AS count FROM peer_insight_feedback WHERE round_id = $1 GROUP BY status`,
    [roundId]
  );
  return result.rows;
}

/** Every active round with at least one pending assignment, with its project group - powers the Overview tab's "projects with pending feedback" widget. */
async function listActiveRoundsWithPending() {
  const result = await query(
    `SELECT r.id AS round_id, r.name AS round_name, r.end_date,
            g.id AS group_id, g.name AS group_name,
            COUNT(f.id)::int AS pending_count
     FROM peer_insight_rounds r
     JOIN project_groups g ON g.id = r.project_group_id
     JOIN peer_insight_feedback f ON f.round_id = r.id AND f.status = 'pending'
     WHERE r.status = 'active'
     GROUP BY r.id, r.name, r.end_date, g.id, g.name
     ORDER BY pending_count DESC`
  );
  return result.rows;
}

/** Every submitted feedback's raw category_scores (org-wide or one project) - powers the category-wise average ratings breakdown. */
async function listCategoryScoresForCompletedFeedback(groupId) {
  const params = [];
  let groupFilter = '';
  if (groupId) {
    params.push(groupId);
    groupFilter = 'AND r.project_group_id = $1';
  }
  const result = await query(
    `SELECT f.category_scores
     FROM peer_insight_feedback f
     JOIN peer_insight_rounds r ON r.id = f.round_id
     WHERE f.status = 'submitted' AND f.category_scores IS NOT NULL ${groupFilter}`,
    params
  );
  return result.rows.map((r) => r.category_scores);
}

/** Total submitted feedback count and total assignment count org-wide (or for one project) - powers the participation-rate / completed-reviews stats. */
async function getFeedbackCompletionStats(groupId) {
  const params = [];
  let groupFilter = '';
  if (groupId) {
    params.push(groupId);
    groupFilter = 'AND r.project_group_id = $1';
  }
  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE f.status = 'submitted')::int AS completed,
       COUNT(*)::int AS total
     FROM peer_insight_feedback f
     JOIN peer_insight_rounds r ON r.id = f.round_id
     WHERE 1=1 ${groupFilter}`,
    params
  );
  return result.rows[0];
}

/** Every employee (subject) with at least one submitted feedback, and their average overall rating across ALL their submitted feedback (any project). Powers the org-wide rating distribution dashboard. */
async function getOrgWideRatingSummary(groupId) {
  const params = [];
  let groupFilter = '';
  if (groupId) {
    params.push(groupId);
    groupFilter = 'AND r.project_group_id = $1';
  }
  const result = await query(
    `SELECT s.id, s.first_name, s.last_name, ROUND(AVG(f.rating)::numeric, 1)::float AS avg_rating
     FROM peer_insight_feedback f
     JOIN users s ON s.id = f.subject_id
     JOIN peer_insight_rounds r ON r.id = f.round_id
     WHERE f.status = 'submitted' AND f.rating IS NOT NULL ${groupFilter}
     GROUP BY s.id, s.first_name, s.last_name
     ORDER BY avg_rating DESC`,
    params
  );
  return result.rows;
}

/** Average rating per calendar month, across all submitted 360 feedback org-wide - powers the Rating Trend chart. */
async function getMonthlyRatingTrend(groupId) {
  const params = [];
  let groupFilter = '';
  if (groupId) {
    params.push(groupId);
    groupFilter = 'AND r.project_group_id = $1';
  }
  const result = await query(
    `SELECT TO_CHAR(f.submitted_at, 'YYYY-MM') AS month,
            ROUND(AVG(f.rating)::numeric, 1)::float AS avg_rating
     FROM peer_insight_feedback f
     JOIN peer_insight_rounds r ON r.id = f.round_id
     WHERE f.status = 'submitted' AND f.rating IS NOT NULL AND f.submitted_at IS NOT NULL ${groupFilter}
     GROUP BY TO_CHAR(f.submitted_at, 'YYYY-MM')
     ORDER BY month ASC`,
    params
  );
  return result.rows;
}


async function listSubjectsInRound(roundId) {
  const result = await query(
    `SELECT DISTINCT s.id, s.first_name, s.last_name
     FROM peer_insight_feedback f JOIN users s ON s.id = f.subject_id
     WHERE f.round_id = $1 ORDER BY s.first_name`,
    [roundId]
  );
  return result.rows;
}

/** Every reviewer<->subject assignment in a round, with names and status - powers the submitted/pending hover detail and the remind action. */
async function listAssignmentsWithStatusForRound(roundId) {
  const result = await query(
    `SELECT f.id, f.status, f.reviewer_id, f.subject_id,
            rv.first_name AS reviewer_first_name, rv.last_name AS reviewer_last_name, rv.email AS reviewer_email,
            sb.first_name AS subject_first_name, sb.last_name AS subject_last_name
     FROM peer_insight_feedback f
     JOIN users rv ON rv.id = f.reviewer_id
     JOIN users sb ON sb.id = f.subject_id
     WHERE f.round_id = $1
     ORDER BY sb.first_name, rv.first_name`,
    [roundId]
  );
  return result.rows;
}

// --- HR-curated summaries ---

async function upsertSummary({ roundId, subjectId, summaryText, createdBy }) {
  const result = await query(
    `INSERT INTO peer_insight_summaries (round_id, subject_id, summary_text, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (round_id, subject_id)
     DO UPDATE SET summary_text = EXCLUDED.summary_text, updated_at = NOW(),
                   -- Editing an already-released summary pulls it back to
                   -- draft — HR must explicitly re-release to send the
                   -- corrected version, rather than the employee silently
                   -- seeing edited content with no new notification.
                   released_to_employee = FALSE, released_by = NULL, released_at = NULL
     RETURNING *`,
    [roundId, subjectId, summaryText, createdBy]
  );
  return result.rows[0];
}

async function unreleaseSummary(id) {
  const result = await query(
    `UPDATE peer_insight_summaries
     SET released_to_employee = FALSE, released_by = NULL, released_at = NULL
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

async function findSummary(roundId, subjectId) {
  const result = await query(
    'SELECT * FROM peer_insight_summaries WHERE round_id = $1 AND subject_id = $2',
    [roundId, subjectId]
  );
  return result.rows[0] || null;
}

async function releaseSummary(id, releasedBy) {
  const result = await query(
    `UPDATE peer_insight_summaries
     SET released_to_employee = TRUE, released_by = $2, released_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, releasedBy]
  );
  return result.rows[0] || null;
}

// Employee-facing: only ever their OWN released summaries, never raw feedback.
async function listReleasedSummariesForEmployee(employeeId) {
  const result = await query(
    `SELECT s.*, r.name AS round_name, g.name AS group_name
     FROM peer_insight_summaries s
     JOIN peer_insight_rounds r ON r.id = s.round_id
     JOIN project_groups g ON g.id = r.project_group_id
     WHERE s.subject_id = $1 AND s.released_to_employee = TRUE
     ORDER BY s.released_at DESC`,
    [employeeId]
  );
  return result.rows;
}

// --- Cross-project (Item: search an employee, see every project they're
// part of at once, curate one overall summary spanning all of them) ---

/** Employees who have at least one submitted feedback row as a subject, matching the search term. */
async function searchSubjectsWithFeedback(term) {
  const result = await query(
    `SELECT DISTINCT s.id, s.first_name, s.last_name, s.employee_code, s.job_title, s.department
     FROM peer_insight_feedback f
     JOIN users s ON s.id = f.subject_id
     WHERE f.status = 'submitted'
       AND (s.first_name ILIKE $1 OR s.last_name ILIKE $1 OR (s.first_name || ' ' || s.last_name) ILIKE $1)
     ORDER BY s.first_name
     LIMIT 20`,
    [`%${term}%`]
  );
  return result.rows;
}

/** Every round (project) this employee has submitted feedback in, with its group name. */
async function listRoundsForSubject(subjectId) {
  const result = await query(
    `SELECT DISTINCT r.id AS round_id, r.name AS round_name, g.id AS group_id, g.name AS group_name
     FROM peer_insight_feedback f
     JOIN peer_insight_rounds r ON r.id = f.round_id
     JOIN project_groups g ON g.id = r.project_group_id
     WHERE f.subject_id = $1 AND f.status = 'submitted'
     ORDER BY g.name`,
    [subjectId]
  );
  return result.rows;
}

/** ALL of this employee's submitted feedback across every project at once, for the overall/combined breakdown. */
async function listAllRawFeedbackForSubject(subjectId) {
  const result = await query(
    `SELECT f.*, r.name AS round_name, g.name AS group_name,
            rv.first_name AS reviewer_first_name, rv.last_name AS reviewer_last_name
     FROM peer_insight_feedback f
     JOIN peer_insight_rounds r ON r.id = f.round_id
     JOIN project_groups g ON g.id = r.project_group_id
     JOIN users rv ON rv.id = f.reviewer_id
     WHERE f.subject_id = $1 AND f.status = 'submitted'
     ORDER BY g.name, f.submitted_at`,
    [subjectId]
  );
  return result.rows;
}

async function upsertOverallSummary({ subjectId, summaryText, createdBy }) {
  const result = await query(
    `INSERT INTO peer_insight_overall_summaries (subject_id, summary_text, created_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (subject_id)
     DO UPDATE SET summary_text = EXCLUDED.summary_text, updated_at = NOW(),
                   released_to_employee = FALSE, released_by = NULL, released_at = NULL
     RETURNING *`,
    [subjectId, summaryText, createdBy]
  );
  return result.rows[0];
}

async function findOverallSummary(subjectId) {
  const result = await query('SELECT * FROM peer_insight_overall_summaries WHERE subject_id = $1', [subjectId]);
  return result.rows[0] || null;
}

async function releaseOverallSummary(subjectId, releasedBy) {
  const result = await query(
    `UPDATE peer_insight_overall_summaries
     SET released_to_employee = TRUE, released_by = $2, released_at = NOW()
     WHERE subject_id = $1 RETURNING *`,
    [subjectId, releasedBy]
  );
  return result.rows[0] || null;
}

async function unreleaseOverallSummary(subjectId) {
  const result = await query(
    `UPDATE peer_insight_overall_summaries
     SET released_to_employee = FALSE, released_by = NULL, released_at = NULL
     WHERE subject_id = $1 RETURNING *`,
    [subjectId]
  );
  return result.rows[0] || null;
}

/** Employee-facing: their own released overall summary, if one exists. */
async function findReleasedOverallSummaryForEmployee(employeeId) {
  const result = await query(
    'SELECT * FROM peer_insight_overall_summaries WHERE subject_id = $1 AND released_to_employee = TRUE',
    [employeeId]
  );
  return result.rows[0] || null;
}

module.exports = {
  createGroup,
  updateGroup,
  listGroups,
  findGroupById,
  deleteGroup,
  addMember,
  removeMember,
  listMembers,
  listGroupsForMember,
  createRound,
  listRoundsForGroup,
  findRoundById,
  closeRound,
  reactivateRound,
  updateRound,
  countRoundsForGroup,
  listAllRounds,
  bulkCreateAssignments,
  listAssignmentsForReviewer,
  listAllPendingAssignmentsForReviewer,
  countCompletedReviewsByReviewer,
  findFeedbackById,
  saveDraft,
  markSubmitted,
  listRawFeedbackForSubject,
  getCompletionSummary,
  listSubjectsInRound,
  listAssignmentsWithStatusForRound,
  getOrgWideRatingSummary,
  getFeedbackCompletionStats,
  listCategoryScoresForCompletedFeedback,
  listActiveRoundsWithPending,
  getMonthlyRatingTrend,
  upsertSummary,
  findSummary,
  releaseSummary,
  unreleaseSummary,
  listReleasedSummariesForEmployee,
  searchSubjectsWithFeedback,
  listRoundsForSubject,
  listAllRawFeedbackForSubject,
  upsertOverallSummary,
  findOverallSummary,
  releaseOverallSummary,
  unreleaseOverallSummary,
  findReleasedOverallSummaryForEmployee,
};
