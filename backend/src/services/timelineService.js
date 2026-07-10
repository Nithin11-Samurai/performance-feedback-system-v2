/**
 * Employee timeline service.
 * Visibility matches profile visibility (self/manager/admin) EXCEPT for
 * 1:1 meeting events, which must stay Admin/HR-only no matter what — same
 * rule enforced everywhere else in the app for one_on_one_notes. A manager
 * or the employee themself gets every other event type, just never that one.
 */
const timelineModel = require('../models/timelineModel');
const userModel = require('../models/userModel');
const userService = require('./userService');
const AppError = require('../utils/AppError');
const { ROLES, isAdminTier } = require('../config/constants');

async function getEmployeeTimeline(requesterUser, employeeId) {
  const employee = await userModel.findById(employeeId);
  if (!employee) throw AppError.notFound('Employee not found');

  if (!userService.canViewProfile(requesterUser, employee)) {
    throw AppError.forbidden('You do not have permission to view this timeline');
  }

  const isAdmin = isAdminTier(requesterUser.role);

  const eventGroups = await Promise.all([
    timelineModel.getCreationEvent(employeeId),
    timelineModel.getProfileAuditEvents(employeeId),
    timelineModel.getSkillEvents(employeeId),
    timelineModel.getCertificationEvents(employeeId),
    timelineModel.getReviewEvents(employeeId),
    isAdmin ? timelineModel.getMeetingEvents(employeeId) : Promise.resolve([]), // Admin/HR only, always
  ]);

  const allEvents = eventGroups.flat();
  allEvents.sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));

  return allEvents;
}

module.exports = { getEmployeeTimeline };
