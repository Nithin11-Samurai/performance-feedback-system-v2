/**
 * Review approval model — all SQL for the `review_approvals` table.
 * HR approves a specific employee's completed feedback packet for a given
 * cycle, optionally with a final comment.
 */
const { query } = require('../config/db');

async function find(reviewCycleId, subjectId) {
  const result = await query(
    `SELECT a.*, u.first_name AS approved_by_first_name, u.last_name AS approved_by_last_name
     FROM review_approvals a
     LEFT JOIN users u ON u.id = a.approved_by
     WHERE a.review_cycle_id = $1 AND a.subject_id = $2`,
    [reviewCycleId, subjectId]
  );
  return result.rows[0] || null;
}

async function listForCycle(reviewCycleId) {
  const result = await query(
    `SELECT a.*, u.first_name AS approved_by_first_name, u.last_name AS approved_by_last_name
     FROM review_approvals a
     LEFT JOIN users u ON u.id = a.approved_by
     WHERE a.review_cycle_id = $1`,
    [reviewCycleId]
  );
  return result.rows;
}

async function upsert({ reviewCycleId, subjectId, approvedBy, hrComments }) {
  const result = await query(
    `INSERT INTO review_approvals (review_cycle_id, subject_id, approved_by, hr_comments)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (review_cycle_id, subject_id)
     DO UPDATE SET approved_by = EXCLUDED.approved_by, approved_at = NOW(), hr_comments = EXCLUDED.hr_comments
     RETURNING *`,
    [reviewCycleId, subjectId, approvedBy, hrComments || null]
  );
  return result.rows[0];
}

async function remove(reviewCycleId, subjectId) {
  const result = await query(
    'DELETE FROM review_approvals WHERE review_cycle_id = $1 AND subject_id = $2 RETURNING id',
    [reviewCycleId, subjectId]
  );
  return result.rows.length > 0;
}

module.exports = { find, listForCycle, upsert, remove };
