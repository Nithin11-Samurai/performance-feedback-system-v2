/**
 * Activity log model (Feature 9). Admin-only filterable view over
 * audit_logs, joined with the actor's name for display.
 */
const { query } = require('../config/db');

async function listLogs({ actorId, action, entityType, startDate, endDate, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (actorId) {
    conditions.push(`a.actor_id = $${idx}`);
    values.push(actorId);
    idx += 1;
  }
  if (action) {
    conditions.push(`a.action = $${idx}`);
    values.push(action);
    idx += 1;
  }
  if (entityType) {
    conditions.push(`a.entity_type = $${idx}`);
    values.push(entityType);
    idx += 1;
  }
  if (startDate) {
    conditions.push(`a.created_at >= $${idx}`);
    values.push(startDate);
    idx += 1;
  }
  if (endDate) {
    conditions.push(`a.created_at <= $${idx}`);
    values.push(endDate);
    idx += 1;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  values.push(limit, offset);

  const result = await query(
    `SELECT a.*, u.first_name AS actor_first_name, u.last_name AS actor_last_name, u.email AS actor_email
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.actor_id
     ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    values
  );
  return result.rows;
}

async function countLogs({ actorId, action, entityType, startDate, endDate } = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (actorId) {
    conditions.push(`actor_id = $${idx}`);
    values.push(actorId);
    idx += 1;
  }
  if (action) {
    conditions.push(`action = $${idx}`);
    values.push(action);
    idx += 1;
  }
  if (entityType) {
    conditions.push(`entity_type = $${idx}`);
    values.push(entityType);
    idx += 1;
  }
  if (startDate) {
    conditions.push(`created_at >= $${idx}`);
    values.push(startDate);
    idx += 1;
  }
  if (endDate) {
    conditions.push(`created_at <= $${idx}`);
    values.push(endDate);
    idx += 1;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(`SELECT COUNT(*)::int AS count FROM audit_logs ${whereClause}`, values);
  return result.rows[0].count;
}

async function listDistinctActions() {
  const result = await query('SELECT DISTINCT action FROM audit_logs ORDER BY action');
  return result.rows.map((r) => r.action);
}

module.exports = { listLogs, countLogs, listDistinctActions };
