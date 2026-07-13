/**
 * Authentication & authorization middleware.
 *
 *  - `authenticate` verifies the access token and attaches `req.user`.
 *  - `authorize(...roles)` restricts a route to specific roles.
 *  - `authorizeSelfOrRoles` allows a user to act on their own record OR
 *    lets specific roles (e.g. admin) act on anyone's — a common pattern
 *    for profile/skills/certifications endpoints.
 */
const { verifyAccessToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const userModel = require('../models/userModel');

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or malformed Authorization header');
  }

  const token = header.split(' ')[1];

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw AppError.unauthorized('Access token expired');
    }
    throw AppError.unauthorized('Invalid access token');
  }

  // Re-fetch the user so role changes / deactivation take effect immediately
  // rather than waiting for the token to expire.
  const user = await userModel.findById(payload.sub);
  if (!user || !user.is_active || user.deleted_at) {
    throw AppError.unauthorized('Account not found or deactivated');
  }

  req.user = user; // { id, role, email, manager_id, ... } minus password_hash
  next();
});

/**
 * Restrict a route to one or more roles.
 * Usage: router.get('/admin-only', authenticate, authorize('admin'), handler)
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden('Your role does not permit this action'));
    }
    next();
  };
}

/**
 * Allow the request through if the authenticated user IS the resource
 * (req.params.userId matches) OR has one of the given elevated roles.
 * Used for endpoints like "update my skills" that admins can also manage.
 */
function authorizeSelfOrRoles(paramName, ...elevatedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    const targetId = req.params[paramName];
    if (req.user.id === targetId || elevatedRoles.includes(req.user.role)) {
      return next();
    }
    return next(AppError.forbidden('You can only access your own records'));
  };
}

/**
 * Item 10: like `authorize`, but also lets a non-admin-tier user through
 * if they've been granted an explicit per-user override for this section
 * (see sectionPermissionService.js). Admin-tier roles always pass, same
 * as a plain `authorize(...ADMIN_TIER_ROLES)` would.
 */
function requireSectionAccess(sectionKey) {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    const sectionPermissionService = require('../services/sectionPermissionService');
    const allowed = await sectionPermissionService.hasSectionAccess(req.user, sectionKey);
    if (!allowed) {
      return next(AppError.forbidden('You do not have access to this section'));
    }
    next();
  });
}

module.exports = { authenticate, authorize, authorizeSelfOrRoles, requireSectionAccess };
