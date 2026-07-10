/**
 * AI summary model — all SQL for the `ai_summaries` table.
 * Summaries are cached per (subject, cycle) so we don't re-call the Claude
 * API on every dashboard load; regeneration is an explicit action.
 */
const { query } = require('../config/db');

async function find(subjectId, reviewCycleId) {
  const result = await query(
    'SELECT * FROM ai_summaries WHERE subject_id = $1 AND review_cycle_id = $2',
    [subjectId, reviewCycleId]
  );
  return result.rows[0] || null;
}

async function upsert({ subjectId, reviewCycleId, summaryText, generatedBy, modelUsed }) {
  const result = await query(
    `INSERT INTO ai_summaries (subject_id, review_cycle_id, summary_text, generated_by, model_used)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (subject_id, review_cycle_id)
     DO UPDATE SET summary_text = EXCLUDED.summary_text,
                   generated_by = EXCLUDED.generated_by,
                   model_used = EXCLUDED.model_used,
                   created_at = NOW()
     RETURNING *`,
    [subjectId, reviewCycleId, summaryText, generatedBy, modelUsed]
  );
  return result.rows[0];
}

module.exports = { find, upsert };
