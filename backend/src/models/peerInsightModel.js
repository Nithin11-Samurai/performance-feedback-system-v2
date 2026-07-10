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

// --- Rounds ---

async function createRound({ groupId, name, startedBy }) {
  const result = await query(
    'INSERT INTO peer_insight_rounds (project_group_id, name, started_by) VALUES ($1, $2, $3) RETURNING *',
    [groupId, name, startedBy]
  );
  return result.rows[0];
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
async function listAllPendingAssignmentsForReviewer(reviewerId) {
  const result = await query(
    `SELECT f.*, s.first_name AS subject_first_name, s.last_name AS subject_last_name, s.job_title AS subject_job_title,
            r.name AS round_name, g.name AS group_name
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

async function listSubjectsInRound(roundId) {
  const result = await query(
    `SELECT DISTINCT s.id, s.first_name, s.last_name
     FROM peer_insight_feedback f JOIN users s ON s.id = f.subject_id
     WHERE f.round_id = $1 ORDER BY s.first_name`,
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

module.exports = {
  createGroup,
  listGroups,
  findGroupById,
  deleteGroup,
  addMember,
  removeMember,
  listMembers,
  createRound,
  listRoundsForGroup,
  findRoundById,
  closeRound,
  listAllRounds,
  bulkCreateAssignments,
  listAssignmentsForReviewer,
  listAllPendingAssignmentsForReviewer,
  findFeedbackById,
  saveDraft,
  markSubmitted,
  listRawFeedbackForSubject,
  getCompletionSummary,
  listSubjectsInRound,
  upsertSummary,
  findSummary,
  releaseSummary,
  unreleaseSummary,
  listReleasedSummariesForEmployee,
};
