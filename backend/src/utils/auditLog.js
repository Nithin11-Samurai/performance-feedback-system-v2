/**
 * Audit log helper.
 * HR systems typically need a trail of who changed what (role changes,
 * deactivations, manager reassignments, etc). Callers should fire-and-forget
 * this — a logging failure should never block the actual operation, so
 * errors are swallowed here and just logged.
 */
const { query } = require('../config/db');
const logger = require('./logger');

/**
 * @param {string} actorId - id of the user performing the action
 * @param {string} action - short action code, e.g. 'DEACTIVATE_USER', 'CHANGE_ROLE'
 * @param {string} entityType - e.g. 'user', 'certification'
 * @param {string} entityId - id of the affected record
 * @param {object} metadata - any extra context that doesn't fit old/new value
 * @param {object} [requestMeta] - optional { ip, userAgent, oldValue, newValue } for
 *   enterprise-grade audit trails (Feature 9). Omitting this is fine — every
 *   existing call site with only 5 args keeps working exactly as before.
 */
async function record(actorId, action, entityType, entityId, metadata = {}, requestMeta = {}) {
  const { ip, userAgent, oldValue, newValue } = requestMeta;
  try {
    await query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata, ip_address, user_agent, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        actorId,
        action,
        entityType,
        entityId,
        JSON.stringify(metadata),
        ip || null,
        userAgent || null,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
      ]
    );
  } catch (err) {
    logger.error('Failed to write audit log', { action, entityType, entityId, error: err.message });
  }
}

module.exports = { record };
