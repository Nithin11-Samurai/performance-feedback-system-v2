/**
 * Section permission service (Item 10).
 *
 * SECTIONS lists what can be individually toggled. This is a starting set
 * covering the sections most likely to need per-person exceptions (e.g.
 * temporarily giving one Manager access to Analytics); more sections can
 * be added to this list and to requireSectionAccess call sites in routes
 * as needed.
 */
const sectionPermissionModel = require('../models/sectionPermissionModel');
const userModel = require('../models/userModel');
const AppError = require('../utils/AppError');
const auditLog = require('../utils/auditLog');
const { isAdminTier, ROLES } = require('../config/constants');

const SECTIONS = [
  { key: 'analytics', label: 'Analytics' },
  // Manager gets this by default too (not just admin-tier) — Skills and
  // Certifications visibility across the team is something a manager
  // reasonably needs day-to-day, not just an occasional exception.
  { key: 'skills_certs_overview', label: 'Skills and Certifications Overview', defaultRoles: [ROLES.MANAGER] },
  { key: 'activity_log', label: 'Activity Log' },
  { key: 'peer_insights_manage', label: '360° Feedback (manage groups and rounds)' },
  { key: 'settings', label: 'Settings (departments and job titles)' },
];

function assertCanManagePermissions(requesterUser) {
  if (!isAdminTier(requesterUser.role)) {
    throw AppError.forbidden('Only HR/Admin can manage section permissions');
  }
}

function listSections() {
  return SECTIONS;
}

async function listForUser(requesterUser, targetUserId) {
  assertCanManagePermissions(requesterUser);
  const target = await userModel.findById(targetUserId);
  if (!target) throw AppError.notFound('User not found');
  return sectionPermissionModel.listForUser(targetUserId);
}

async function setOverride(requesterUser, targetUserId, sectionKey, allowed) {
  assertCanManagePermissions(requesterUser);
  if (!SECTIONS.find((s) => s.key === sectionKey)) {
    throw AppError.badRequest(`Unknown section: ${sectionKey}`);
  }
  const target = await userModel.findById(targetUserId);
  if (!target) throw AppError.notFound('User not found');

  const saved = await sectionPermissionModel.upsert({
    userId: targetUserId,
    sectionKey,
    allowed,
    updatedBy: requesterUser.id,
  });

  await auditLog.record(requesterUser.id, 'SET_SECTION_PERMISSION', 'user', targetUserId, {
    sectionKey,
    allowed,
  });

  return saved;
}

async function removeOverride(requesterUser, targetUserId, sectionKey) {
  assertCanManagePermissions(requesterUser);
  await sectionPermissionModel.remove(targetUserId, sectionKey);
  await auditLog.record(requesterUser.id, 'REMOVE_SECTION_PERMISSION', 'user', targetUserId, { sectionKey });
}

/**
 * The actual access check, used by requireSectionAccess middleware.
 * Order of precedence:
 *   1. An explicit per-user override always wins, whether it grants or
 *      revokes access — this lets HR make individual exceptions in
 *      either direction on top of the role-based defaults below.
 *   2. Admin-tier roles always pass.
 *   3. Any role listed in that section's `defaultRoles` (e.g. Manager
 *      for skills_certs_overview) passes.
 *   4. Otherwise, no access.
 */
async function hasSectionAccess(user, sectionKey) {
  const override = await sectionPermissionModel.findOverride(user.id, sectionKey);
  if (override) return !!override.allowed;

  if (isAdminTier(user.role)) return true;

  const section = SECTIONS.find((s) => s.key === sectionKey);
  if (section?.defaultRoles?.includes(user.role)) return true;

  return false;
}

module.exports = {
  listSections,
  listForUser,
  setOverride,
  removeOverride,
  hasSectionAccess,
};
