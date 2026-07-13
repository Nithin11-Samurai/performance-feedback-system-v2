/**
 * User service.
 * Houses the "who can see/edit whom" logic so it isn't duplicated across
 * controllers. Three actor types matter throughout this app:
 *   - the user themself
 *   - their direct manager
 *   - Admin/HR (can see and manage everyone)
 */
const userModel = require('../models/userModel');
const AppError = require('../utils/AppError');
const auditLog = require('../utils/auditLog');
const { ROLES, isAdminTier } = require('../config/constants');

/**
 * Can `requester` view `target`'s profile?
 * Rule: self, Admin/HR, or the target's direct manager.
 */
function canViewProfile(requester, target) {
  if (requester.id === target.id) return true;
  if (isAdminTier(requester.role)) return true;
  if (target.manager_id && target.manager_id === requester.id) return true;
  return false;
}

async function getProfile(requesterUser, targetUserId) {
  const target = await userModel.findById(targetUserId);
  if (!target) {
    throw AppError.notFound('User not found');
  }
  if (!canViewProfile(requesterUser, target)) {
    throw AppError.forbidden('You do not have permission to view this profile');
  }
  return target;
}

async function listUsers(requesterUser, filters) {
  // Managers browsing the directory only ever see their own direct reports
  // (plus themselves), never the whole company. Admin/HR sees everyone.
  if (requesterUser.role === ROLES.MANAGER) {
    return userModel.getDirectReports(requesterUser.id);
  }
  if (isAdminTier(requesterUser.role)) {
    return userModel.listAll(filters);
  }
  // Plain employees don't get a directory listing at all.
  throw AppError.forbidden('You do not have permission to list users');
}

async function getDirectReports(requesterUser, managerId) {
  // Admin can inspect any manager's reports; a manager can only see their own.
  if (!isAdminTier(requesterUser.role) && requesterUser.id !== managerId) {
    throw AppError.forbidden('You can only view your own direct reports');
  }
  return userModel.getDirectReports(managerId);
}

/**
 * Update a user's profile.
 * - Admin/HR may update any allowed field on any user, including identity
 *   fields (employee code, name, email) per Feature 6.
 * - A non-admin may update their own avatar plus personal-contact fields
 *   (phone, address, emergency contact) — never identity/employment fields.
 */
async function updateUser(requesterUser, targetUserId, updates, requestMeta = {}) {
  const target = await userModel.findById(targetUserId);
  if (!target) {
    throw AppError.notFound('User not found');
  }

  const isSelf = requesterUser.id === targetUserId;
  const isAdmin = isAdminTier(requesterUser.role);

  if (!isSelf && !isAdmin) {
    throw AppError.forbidden('You do not have permission to update this profile');
  }

  let fieldsToApply = {};

  if (isAdmin) {
    if (updates.employeeCode !== undefined) fieldsToApply.employee_code = updates.employeeCode;
    if (updates.firstName !== undefined) fieldsToApply.first_name = updates.firstName;
    if (updates.lastName !== undefined) fieldsToApply.last_name = updates.lastName;
    if (updates.email !== undefined) fieldsToApply.email = updates.email;
    if (updates.jobTitle !== undefined) fieldsToApply.job_title = updates.jobTitle;
    if (updates.department !== undefined) fieldsToApply.department = updates.department;
    if (updates.managerId !== undefined) {
      if (updates.managerId === targetUserId) {
        throw AppError.badRequest('A user cannot be their own manager');
      }
      fieldsToApply.manager_id = updates.managerId;
    }
    if (updates.dateOfJoining !== undefined) fieldsToApply.date_of_joining = updates.dateOfJoining;
    if (updates.role !== undefined) fieldsToApply.role = updates.role;
    if (updates.isActive !== undefined) fieldsToApply.is_active = updates.isActive;
    if (updates.avatarUrl !== undefined) fieldsToApply.avatar_url = updates.avatarUrl;
    // Admin can also set these on someone's behalf if needed.
    if (updates.phone !== undefined) fieldsToApply.phone = updates.phone;
    if (updates.address !== undefined) fieldsToApply.address = updates.address;
    if (updates.emergencyContactName !== undefined) fieldsToApply.emergency_contact_name = updates.emergencyContactName;
    if (updates.emergencyContactPhone !== undefined) fieldsToApply.emergency_contact_phone = updates.emergencyContactPhone;
  } else {
    // Self-service: avatar + personal contact info only. Never identity,
    // employment, or role fields — those stay HR-controlled.
    if (updates.avatarUrl !== undefined) fieldsToApply.avatar_url = updates.avatarUrl;
    if (updates.phone !== undefined) fieldsToApply.phone = updates.phone;
    if (updates.address !== undefined) fieldsToApply.address = updates.address;
    if (updates.emergencyContactName !== undefined) fieldsToApply.emergency_contact_name = updates.emergencyContactName;
    if (updates.emergencyContactPhone !== undefined) fieldsToApply.emergency_contact_phone = updates.emergencyContactPhone;
  }

  if (Object.keys(fieldsToApply).length === 0) {
    throw AppError.badRequest('No permitted fields provided to update');
  }

  // Capture before/after values only for the fields actually being changed,
  // for the audit trail (Feature 9) — no need to snapshot the whole record.
  const oldValue = {};
  Object.keys(fieldsToApply).forEach((key) => {
    oldValue[key] = target[key];
  });

  const updated = await userModel.updateProfile(targetUserId, fieldsToApply);

  if (isAdmin && !isSelf) {
    await auditLog.record(
      requesterUser.id,
      'UPDATE_USER_PROFILE',
      'user',
      targetUserId,
      { changedFields: Object.keys(fieldsToApply) },
      { ...requestMeta, oldValue, newValue: fieldsToApply }
    );
  }

  return updated;
}

async function setActiveStatus(requesterUser, targetUserId, isActive, requestMeta = {}) {
  if (requesterUser.id === targetUserId) {
    throw AppError.badRequest('You cannot activate/deactivate your own account');
  }
  const target = await userModel.findById(targetUserId);
  if (!target) {
    throw AppError.notFound('User not found');
  }
  const updated = await userModel.updateProfile(targetUserId, { is_active: isActive });
  await auditLog.record(
    requesterUser.id,
    isActive ? 'REACTIVATE_USER' : 'DEACTIVATE_USER',
    'user',
    targetUserId,
    {},
    { ...requestMeta, oldValue: { is_active: target.is_active }, newValue: { is_active: isActive } }
  );
  return updated;
}

async function listDepartments() {
  const { query } = require('../config/db');
  const result = await query(
    `SELECT DISTINCT department FROM users WHERE department IS NOT NULL ORDER BY department`
  );
  return result.rows.map((r) => r.department);
}

/**
 * Bulk-assign a list of employees to a manager in one call (Feature 5).
 * Admin only. `managerId` may be null to remove them from any manager.
 */
async function bulkAssignManager(requesterUser, employeeIds, managerId, requestMeta = {}) {
  if (!isAdminTier(requesterUser.role)) {
    throw AppError.forbidden('Only HR/Admin can bulk-assign managers');
  }
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    throw AppError.badRequest('employeeIds must be a non-empty array');
  }
  if (managerId && employeeIds.includes(managerId)) {
    throw AppError.badRequest('A manager cannot be assigned as their own manager');
  }

  const updated = await userModel.bulkAssignManager(employeeIds, managerId || null);

  await auditLog.record(
    requesterUser.id,
    'BULK_ASSIGN_MANAGER',
    'user',
    null,
    { employeeIds, managerId: managerId || null, count: updated.length },
    requestMeta
  );

  return updated;
}

/**
 * Total count matching the same filters as listUsers — used by the
 * frontend directory to render pagination controls. Mirrors listUsers'
 * role-based scoping exactly.
 */
async function countUsers(requesterUser, filters) {
  if (requesterUser.role === ROLES.MANAGER) {
    const reports = await userModel.getDirectReports(requesterUser.id);
    return reports.length;
  }
  if (isAdminTier(requesterUser.role)) {
    return userModel.countAll(filters);
  }
  throw AppError.forbidden('You do not have permission to list users');
}

/**
 * Set a user's avatar from an uploaded file. Same self-or-admin rule as
 * the rest of updateUser, but split into its own function since it deals
 * with a file path rather than arbitrary profile fields.
 */
async function updateAvatar(requesterUser, targetUserId, fileName) {
  const target = await userModel.findById(targetUserId);
  if (!target) {
    throw AppError.notFound('User not found');
  }
  const isSelf = requesterUser.id === targetUserId;
  const isAdmin = isAdminTier(requesterUser.role);
  if (!isSelf && !isAdmin) {
    throw AppError.forbidden('You do not have permission to update this profile picture');
  }

  const oldAvatarUrl = target.avatar_url;
  const avatarUrl = `/uploads/avatars/${fileName}`;
  const updated = await userModel.updateProfile(targetUserId, { avatar_url: avatarUrl });

  // Clean up the previous file so replacing a photo repeatedly doesn't
  // silently accumulate orphaned files on disk.
  if (oldAvatarUrl && oldAvatarUrl.startsWith('/uploads/avatars/')) {
    const fs = require('fs');
    const path = require('path');
    const oldPath = path.join(__dirname, '../../uploads/avatars', path.basename(oldAvatarUrl));
    fs.unlink(oldPath, () => {}); // best-effort, don't fail the request over this
  }

  return updated;
}

/**
 * Remove a user's photo entirely — reverts to the initials placeholder.
 * Same self-or-admin permission as setting one.
 */
async function removeAvatar(requesterUser, targetUserId) {
  const target = await userModel.findById(targetUserId);
  if (!target) {
    throw AppError.notFound('User not found');
  }
  const isSelf = requesterUser.id === targetUserId;
  const isAdmin = isAdminTier(requesterUser.role);
  if (!isSelf && !isAdmin) {
    throw AppError.forbidden('You do not have permission to update this profile picture');
  }

  const oldAvatarUrl = target.avatar_url;
  const updated = await userModel.updateProfile(targetUserId, { avatar_url: null });

  if (oldAvatarUrl && oldAvatarUrl.startsWith('/uploads/avatars/')) {
    const fs = require('fs');
    const path = require('path');
    const oldPath = path.join(__dirname, '../../uploads/avatars', path.basename(oldAvatarUrl));
    fs.unlink(oldPath, () => {});
  }

  return updated;
}

/**
 * Global search (Feature 8). Admin searches everyone; a manager's search
 * is scoped to their own team, same rule as the directory listing. Plain
 * employees don't get global search (same as they don't get a directory).
 */
async function globalSearch(requesterUser, term) {
  if (!term || term.trim().length < 2) {
    throw AppError.badRequest('Search term must be at least 2 characters');
  }
  if (requesterUser.role === ROLES.MANAGER) {
    return userModel.globalSearch(term, { managerId: requesterUser.id });
  }
  if (isAdminTier(requesterUser.role)) {
    return userModel.globalSearch(term, {});
  }
  throw AppError.forbidden('You do not have permission to search employees');
}

const DELETE_CAPABLE_ROLES = [ROLES.HR_MANAGER, ROLES.GLOBAL_ADMIN];

function assertCanDelete(requesterUser) {
  if (!DELETE_CAPABLE_ROLES.includes(requesterUser.role)) {
    throw AppError.forbidden('Only HR Manager or Global Admin can delete employee records');
  }
}

/**
 * Item 5: soft-delete. Nothing referencing this employee is touched —
 * restoring later brings back everything exactly as it was.
 */
async function deleteEmployee(requesterUser, targetUserId, requestMeta = {}) {
  assertCanDelete(requesterUser);
  if (requesterUser.id === targetUserId) {
    throw AppError.badRequest('You cannot delete your own account');
  }
  const target = await userModel.findById(targetUserId);
  if (!target) {
    throw AppError.notFound('User not found');
  }
  if (target.deleted_at) {
    throw AppError.badRequest('This employee has already been deleted');
  }

  const deleted = await userModel.softDelete(targetUserId, requesterUser.id);
  await auditLog.record(
    requesterUser.id,
    'DELETE_USER',
    'user',
    targetUserId,
    { employeeCode: target.employee_code, email: target.email },
    requestMeta
  );
  return deleted;
}

async function restoreEmployee(requesterUser, targetUserId, requestMeta = {}) {
  assertCanDelete(requesterUser);
  const target = await userModel.findDeletedById(targetUserId);
  if (!target) {
    throw AppError.notFound('This employee is not in the Recently Deleted list');
  }

  const restored = await userModel.restore(targetUserId);
  await auditLog.record(
    requesterUser.id,
    'RESTORE_USER',
    'user',
    targetUserId,
    { employeeCode: target.employee_code, email: target.email },
    requestMeta
  );
  return restored;
}

async function listDeletedEmployees(requesterUser) {
  assertCanDelete(requesterUser);
  return userModel.listDeleted();
}

module.exports = {
  canViewProfile,
  getProfile,
  listUsers,
  getDirectReports,
  updateUser,
  setActiveStatus,
  listDepartments,
  countUsers,
  updateAvatar,
  removeAvatar,
  bulkAssignManager,
  globalSearch,
  deleteEmployee,
  restoreEmployee,
  listDeletedEmployees,
};
