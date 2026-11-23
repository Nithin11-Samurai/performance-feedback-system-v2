/**
 * Feature access: the single place that decides whether a signed-in user
 * can use My Skills, Certifications, or the Skills & Certifications
 * overview. Used by the API (so switching a feature off really blocks it)
 * and mirrored by the frontend (FeatureFlagsContext) for menus and pages.
 *
 * Order of precedence:
 *   1. A per-person override (Permissions page) always wins, in either
 *      direction: Granted or Blocked.
 *   2. Otherwise the Settings > Feature Visibility toggle for the person's
 *      audience: Admin-tier, Managers, or Employees.
 *   3. The overview is a company-wide view, so the Employees toggle never
 *      applies to it; an employee only gets it through a per-person grant.
 *
 * If the flag row is missing (migration not run yet) it falls back to the
 * behaviour the app had before flags existed, so nothing locks up.
 */
const featureFlagModel = require('../models/featureFlagModel');
const sectionPermissionModel = require('../models/sectionPermissionModel');
const { isAdminTier, ROLES } = require('../config/constants');

// Keys controlled by Settings > Feature Visibility + per-person overrides.
const FLAG_BACKED_KEYS = ['skills', 'certifications', 'skills_certs_overview'];
// Company-wide views that the "Employees" toggle can never open.
const MANAGEMENT_ONLY_KEYS = ['skills_certs_overview'];

function audienceFor(user) {
  if (isAdminTier(user.role)) return 'admin';
  if (user.role === ROLES.MANAGER) return 'manager';
  return 'employee';
}

function fallbackAllowed(user, key) {
  if (MANAGEMENT_ONLY_KEYS.includes(key)) return audienceFor(user) !== 'employee';
  return true;
}

async function hasFeatureAccess(user, key) {
  const override = await sectionPermissionModel.findOverride(user.id, key);
  if (override) return !!override.allowed;

  const audience = audienceFor(user);
  if (audience === 'employee' && MANAGEMENT_ONLY_KEYS.includes(key)) return false;

  const flag = await featureFlagModel.getByKey(key);
  if (!flag) return fallbackAllowed(user, key);

  if (audience === 'admin') return !!flag.visible_to_admin_tier;
  if (audience === 'manager') return !!(flag.visible_to_managers ?? flag.visible_to_employees);
  return !!flag.visible_to_employees;
}

module.exports = { hasFeatureAccess, FLAG_BACKED_KEYS, MANAGEMENT_ONLY_KEYS };
