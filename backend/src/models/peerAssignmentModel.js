/**
 * Reviewer assignment model — who has been nominated to give feedback on
 * whom, for a given cycle, as a specific reviewer type (peer, hr,
 * skip_level, project_lead, or mentor — Feature 4). Created by Admin/HR.
 * Self and manager reviews don't need an assignment row: self is implicit,
 * manager is derived from the reporting hierarchy.
 */
const { query } = require('../config/db');

async function create({ reviewCycleId, subjectId, reviewerId, reviewerType, assignedBy }) {
  const result = await query(
    `INSERT INTO peer_review_assignments (review_cycle_id, subject_id, reviewer_id, reviewer_type, assigned_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [reviewCycleId, subjectId, reviewerId, reviewerType, assignedBy]
  );
  return result.rows[0];
}

async function listForCycle(reviewCycleId) {
  const result = await query(
    `SELECT a.*,
            s.first_name AS subject_first_name, s.last_name AS subject_last_name,
            r.first_name AS reviewer_first_name, r.last_name AS reviewer_last_name
     FROM peer_review_assignments a
     JOIN users s ON s.id = a.subject_id
     JOIN users r ON r.id = a.reviewer_id
     WHERE a.review_cycle_id = $1
     ORDER BY s.first_name, a.reviewer_type, r.first_name`,
    [reviewCycleId]
  );
  return result.rows;
}

// Who has `reviewerId` been assigned to review, in this cycle (any type)?
async function listAssignmentsForReviewer(reviewCycleId, reviewerId) {
  const result = await query(
    `SELECT a.*, s.first_name AS subject_first_name, s.last_name AS subject_last_name, s.job_title AS subject_job_title
     FROM peer_review_assignments a
     JOIN users s ON s.id = a.subject_id
     WHERE a.review_cycle_id = $1 AND a.reviewer_id = $2
     ORDER BY s.first_name`,
    [reviewCycleId, reviewerId]
  );
  return result.rows;
}

// Who has been assigned to review `subjectId`, in this cycle (any type)?
// Powers the Reviewers tab on the Employee Detail page.
async function listAssignmentsForSubject(reviewCycleId, subjectId) {
  const result = await query(
    `SELECT a.*, r.first_name AS reviewer_first_name, r.last_name AS reviewer_last_name, r.job_title AS reviewer_job_title
     FROM peer_review_assignments a
     JOIN users r ON r.id = a.reviewer_id
     WHERE a.review_cycle_id = $1 AND a.subject_id = $2
     ORDER BY a.reviewer_type, r.first_name`,
    [reviewCycleId, subjectId]
  );
  return result.rows;
}

async function exists(reviewCycleId, subjectId, reviewerId, reviewerType) {
  const result = await query(
    `SELECT id FROM peer_review_assignments
     WHERE review_cycle_id = $1 AND subject_id = $2 AND reviewer_id = $3 AND reviewer_type = $4`,
    [reviewCycleId, subjectId, reviewerId, reviewerType]
  );
  return result.rows.length > 0;
}

async function remove(id) {
  const result = await query('DELETE FROM peer_review_assignments WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
}

module.exports = { create, listForCycle, listAssignmentsForReviewer, listAssignmentsForSubject, exists, remove };
