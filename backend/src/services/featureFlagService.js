const featureFlagModel = require('../models/featureFlagModel');
const AppError = require('../utils/AppError');
const { isAdminTier } = require('../config/constants');

const VALID_KEYS = ['skills', 'certifications', 'reviews', 'review_cycles', 'analytics', 'skills_certs_overview'];

/**
 * Any authenticated user can read the flags — the frontend needs them to
 * decide what to show *for the current user's own role*, so this isn't
 * sensitive data on its own (it's just "is feature X currently on").
 */
async function listFlags() {
  return featureFlagModel.listAll();
}

/**
 * Only Admin-tier roles (Admin, Global Admin, System Admin, HR Manager)
 * can change a flag, per the request.
 */
async function updateFlag(requesterUser, key, { visibleToAdminTier, visibleToEmployees }) {
  if (!isAdminTier(requesterUser.role)) {
    throw AppError.forbidden('Only Admin-tier roles can change feature visibility');
  }
  if (!VALID_KEYS.includes(key)) {
    throw AppError.badRequest(`Unknown feature key "${key}"`);
  }
  if (typeof visibleToAdminTier !== 'boolean' || typeof visibleToEmployees !== 'boolean') {
    throw AppError.badRequest('visibleToAdminTier and visibleToEmployees must both be true/false');
  }

  const updated = await featureFlagModel.upsert(key, { visibleToAdminTier, visibleToEmployees }, requesterUser.id);
  if (!updated) throw AppError.notFound(`Feature "${key}" not found — has the migration been run?`);
  return updated;
}

module.exports = { listFlags, updateFlag, VALID_KEYS };
