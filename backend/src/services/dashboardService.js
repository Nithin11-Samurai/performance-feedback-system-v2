/**
 * Dashboard service.
 * Assembles the admin dashboard summary from dashboardModel's individual
 * aggregates. Admin-only for now — Manager/Employee dashboards continue to
 * use their existing lightweight data fetches (userService, skillService,
 * etc.) unchanged, per the instruction not to remove existing functionality.
 */
const dashboardModel = require('../models/dashboardModel');
const feedbackModel = require('../models/feedbackModel');
const notificationModel = require('../models/notificationModel');
const peerInsightModel = require('../models/peerInsightModel');
const { FEEDBACK_TYPE } = require('../config/constants');

async function getAdminSummary(filters = {}) {
  const { department, cycleId: cycleOverride } = filters;

  const targetCycle = await dashboardModel.getTargetCycle(cycleOverride);
  const cycleId = targetCycle ? targetCycle.id : null;

  const [totalEmployees, feedbackCounts, averageRating, recentActivity, upcomingReviews] = await Promise.all([
    dashboardModel.countActiveEmployees(department),
    dashboardModel.getFeedbackStatusCounts(cycleId, department),
    dashboardModel.getAverageRating(cycleId, department),
    dashboardModel.getRecentActivity(6),
    dashboardModel.getUpcomingReviews(4),
  ]);

  return {
    targetCycle,
    kpis: {
      totalEmployees,
      pendingReviews: feedbackCounts.pending,
      completedReviews: feedbackCounts.submitted,
      averageRating,
    },
    charts: {
      reviewCompletion: feedbackCounts,
    },
    widgets: {
      recentActivity,
      upcomingReviews,
    },
  };
}

/**
 * Manager dashboard: same shape/spirit as the admin summary, scoped to the
 * manager's own direct reports instead of the whole company.
 */
async function getManagerSummary(managerUser) {
  const userModel = require('../models/userModel');
  const reports = await userModel.getDirectReports(managerUser.id);
  const employeeIds = reports.map((r) => r.id);

  const targetCycle = await dashboardModel.getTargetCycle();
  const cycleId = targetCycle ? targetCycle.id : null;

  const [feedbackCounts, averageRating, ratingDistribution, upcomingReviews, recentlyAdded] = await Promise.all([
    dashboardModel.getTeamFeedbackStatusCounts(cycleId, employeeIds),
    dashboardModel.getTeamAverageRating(cycleId, employeeIds),
    dashboardModel.getTeamRatingDistribution(cycleId, employeeIds),
    dashboardModel.getUpcomingReviews(5),
    dashboardModel.getRecentlyAddedForTeam(employeeIds, 5),
  ]);

  return {
    targetCycle,
    kpis: {
      teamSize: reports.length,
      pendingReviews: feedbackCounts.pending,
      completedReviews: feedbackCounts.submitted,
      averageRating,
    },
    charts: {
      ratingDistribution,
      reviewCompletion: feedbackCounts,
    },
    widgets: {
      upcomingReviews,
      recentlyAddedEmployees: recentlyAdded,
    },
  };
}

/**
 * Employee (self) dashboard: personal metrics only — skills/certs counts
 * are fetched by the frontend directly from their existing endpoints, so
 * this only needs to supply the rating-history trend and cycle status.
 */
async function getEmployeeSummary(employeeUser) {
  const targetCycle = await dashboardModel.getTargetCycle();
  const ratingHistory = await dashboardModel.getMyRatingHistory(employeeUser.id);

  // Item 3: replaces the Skills/Certifications counts on the employee
  // dashboard (no longer relevant now that those pages are Admin-only)
  // with things the employee can actually act on.
  let selfReviewPending = false;
  if (targetCycle && targetCycle.status === 'active') {
    const selfReview = await feedbackModel.findByKey(targetCycle.id, employeeUser.id, employeeUser.id, FEEDBACK_TYPE.SELF);
    selfReviewPending = !selfReview || selfReview.status !== 'submitted';
  }

  const pending360Assignments = await peerInsightModel.listAllPendingAssignmentsForReviewer(employeeUser.id);
  const unreadNotifications = await notificationModel.countUnread(employeeUser.id);

  return {
    targetCycle,
    ratingHistory,
    pendingActions: {
      selfReviewPending,
      pending360Count: pending360Assignments.length,
    },
    unreadNotifications,
  };
}

module.exports = { getAdminSummary, getManagerSummary, getEmployeeSummary };
