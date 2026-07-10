/**
 * Feedback model — unified table for self/manager/peer reviews.
 * The `type` column distinguishes the three kinds; `reviewer_id` is always
 * who wrote it, `subject_id` is always who it's about (for self reviews
 * these are the same person).
 */
const { query } = require('../config/db');

async function findByKey(reviewCycleId, subjectId, reviewerId, type) {
  const result = await query(
    `SELECT * FROM feedback WHERE review_cycle_id = $1 AND subject_id = $2 AND reviewer_id = $3 AND type = $4`,
    [reviewCycleId, subjectId, reviewerId, type]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await query('SELECT * FROM feedback WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Create-or-update a feedback entry as a DRAFT (status stays 'pending'
 * unless already submitted). Submission is a separate explicit action
 * (see markSubmitted) so a reviewer can save partial progress.
 */
async function upsertDraft({
  reviewCycleId,
  subjectId,
  reviewerId,
  type,
  rating,
  strengths,
  improvementAreas,
  comments,
  achievements,
  goals,
}) {
  const result = await query(
    `INSERT INTO feedback
      (review_cycle_id, subject_id, reviewer_id, type, rating, strengths, improvement_areas, comments, achievements, goals)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (review_cycle_id, subject_id, reviewer_id, type)
     DO UPDATE SET rating = EXCLUDED.rating,
                   strengths = EXCLUDED.strengths,
                   improvement_areas = EXCLUDED.improvement_areas,
                   comments = EXCLUDED.comments,
                   achievements = EXCLUDED.achievements,
                   goals = EXCLUDED.goals,
                   updated_at = NOW()
     WHERE feedback.status = 'pending'
     RETURNING *`,
    [
      reviewCycleId,
      subjectId,
      reviewerId,
      type,
      rating || null,
      strengths || null,
      improvementAreas || null,
      comments || null,
      achievements || null,
      goals || null,
    ]
  );
  return result.rows[0] || null; // null means it existed but was already submitted (locked)
}

async function markSubmitted(id) {
  const result = await query(
    `UPDATE feedback SET status = 'submitted', submitted_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * All feedback about a subject in a cycle, with reviewer names joined in.
 * Anonymization of peer reviewer identity (for non-admin viewers) happens
 * at the service layer, not here — this always returns full data.
 */
async function listForSubjectInCycle(subjectId, reviewCycleId) {
  const result = await query(
    `SELECT f.*, r.first_name AS reviewer_first_name, r.last_name AS reviewer_last_name, r.role AS reviewer_role
     FROM feedback f
     JOIN users r ON r.id = f.reviewer_id
     WHERE f.subject_id = $1 AND f.review_cycle_id = $2
     ORDER BY f.type, f.created_at`,
    [subjectId, reviewCycleId]
  );
  return result.rows;
}

// All feedback about a subject across ALL cycles — used by the employee
// export (Step 7) to compile a full history in one document.
async function listAllForSubject(subjectId) {
  const result = await query(
    `SELECT f.*, r.first_name AS reviewer_first_name, r.last_name AS reviewer_last_name, r.role AS reviewer_role,
            c.name AS cycle_name
     FROM feedback f
     JOIN users r ON r.id = f.reviewer_id
     JOIN review_cycles c ON c.id = f.review_cycle_id
     WHERE f.subject_id = $1 AND f.status = 'submitted'
     ORDER BY c.start_date DESC, f.type`,
    [subjectId]
  );
  return result.rows;
}

// Completion tracking for a cycle — used by dashboard charts (Step 8).
async function completionSummaryForCycle(reviewCycleId) {
  const result = await query(
    `SELECT type, status, COUNT(*)::int AS count
     FROM feedback WHERE review_cycle_id = $1
     GROUP BY type, status`,
    [reviewCycleId]
  );
  return result.rows;
}

module.exports = {
  findByKey,
  findById,
  upsertDraft,
  markSubmitted,
  listForSubjectInCycle,
  listAllForSubject,
  completionSummaryForCycle,
};
