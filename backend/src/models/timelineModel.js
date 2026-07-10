/**
 * Employee timeline model.
 * Rather than retrofitting audit logging into every existing action (a
 * huge, risky change), this aggregates a chronological timeline directly
 * from the tables that already record when things happened — skills,
 * certifications, feedback, 1:1 notes, and the audit_logs entries that DO
 * already exist for profile changes. Each sub-query returns a normalized
 * shape so they can be merged and sorted in the service layer.
 */
const { query } = require('../config/db');

async function getCreationEvent(employeeId) {
  const result = await query('SELECT created_at FROM users WHERE id = $1', [employeeId]);
  if (!result.rows[0]) return [];
  return [{ type: 'EMPLOYEE_CREATED', description: 'Employee record created', occurred_at: result.rows[0].created_at, actor_name: null }];
}

async function getProfileAuditEvents(employeeId) {
  const result = await query(
    `SELECT a.action, a.metadata, a.old_value, a.new_value, a.created_at, u.first_name, u.last_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.entity_type = 'user' AND a.entity_id = $1
     ORDER BY a.created_at DESC`,
    [employeeId]
  );
  return result.rows.map((r) => {
    const actorName = r.first_name ? `${r.first_name} ${r.last_name}` : 'System';
    let description = r.action.replace(/_/g, ' ').toLowerCase();

    // Give the common cases friendlier, more specific descriptions.
    const changedFields = r.metadata?.changedFields || [];
    if (r.action === 'UPDATE_USER_PROFILE') {
      if (changedFields.includes('manager_id')) description = 'Manager assigned/changed';
      else if (changedFields.includes('department')) description = 'Department changed';
      else if (changedFields.includes('role')) description = 'Role changed';
      else if (changedFields.includes('job_title')) description = 'Job title updated (possible promotion)';
      else description = `Profile updated (${changedFields.join(', ') || 'details'})`;
    } else if (r.action === 'DEACTIVATE_USER') {
      description = 'Account deactivated';
    } else if (r.action === 'REACTIVATE_USER') {
      description = 'Account reactivated';
    } else if (r.action === 'PASSWORD_CHANGED') {
      description = 'Password changed';
    }

    return {
      type: r.action,
      description,
      occurred_at: r.created_at,
      actor_name: actorName,
      old_value: r.old_value,
      new_value: r.new_value,
    };
  });
}

async function getSkillEvents(employeeId) {
  const result = await query(
    'SELECT skill_name, category, created_at FROM skills WHERE user_id = $1',
    [employeeId]
  );
  return result.rows.map((r) => ({
    type: 'SKILL_ADDED',
    description: `Skill added: ${r.skill_name} (${r.category})`,
    occurred_at: r.created_at,
    actor_name: null,
  }));
}

async function getCertificationEvents(employeeId) {
  const result = await query(
    'SELECT name, created_at FROM certifications WHERE user_id = $1',
    [employeeId]
  );
  return result.rows.map((r) => ({
    type: 'CERTIFICATION_ADDED',
    description: `Certification added: ${r.name}`,
    occurred_at: r.created_at,
    actor_name: null,
  }));
}

async function getReviewEvents(employeeId) {
  const assignedResult = await query(
    `SELECT f.type, f.created_at, c.name AS cycle_name
     FROM feedback f JOIN review_cycles c ON c.id = f.review_cycle_id
     WHERE f.subject_id = $1`,
    [employeeId]
  );
  const submittedResult = await query(
    `SELECT f.type, f.submitted_at, c.name AS cycle_name
     FROM feedback f JOIN review_cycles c ON c.id = f.review_cycle_id
     WHERE f.subject_id = $1 AND f.submitted_at IS NOT NULL`,
    [employeeId]
  );

  const assigned = assignedResult.rows.map((r) => ({
    type: 'REVIEW_ASSIGNED',
    description: `${r.type[0].toUpperCase() + r.type.slice(1)} review assigned (${r.cycle_name})`,
    occurred_at: r.created_at,
    actor_name: null,
  }));
  const submitted = submittedResult.rows.map((r) => ({
    type: 'REVIEW_SUBMITTED',
    description: `${r.type[0].toUpperCase() + r.type.slice(1)} review submitted (${r.cycle_name})`,
    occurred_at: r.submitted_at,
    actor_name: null,
  }));
  return [...assigned, ...submitted];
}

async function getMeetingEvents(employeeId) {
  const result = await query(
    `SELECT n.title, n.meeting_date, n.created_at, u.first_name, u.last_name
     FROM one_on_one_notes n LEFT JOIN users u ON u.id = n.uploaded_by
     WHERE n.employee_id = $1`,
    [employeeId]
  );
  return result.rows.map((r) => ({
    type: 'ONE_ON_ONE',
    description: `1:1 meeting${r.title ? ': ' + r.title : ''} (${new Date(r.meeting_date).toLocaleDateString()})`,
    occurred_at: r.created_at,
    actor_name: r.first_name ? `${r.first_name} ${r.last_name}` : null,
  }));
}

module.exports = {
  getCreationEvent,
  getProfileAuditEvents,
  getSkillEvents,
  getCertificationEvents,
  getReviewEvents,
  getMeetingEvents,
};
