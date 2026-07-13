/**
 * User controller — thin HTTP layer over userService.
 */
const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/userService');
const timelineService = require('../services/timelineService');
const { getRequestMeta } = require('../utils/requestMeta');

// GET /api/users?role=&department=&search=&limit=&offset=
const listUsers = asyncHandler(async (req, res) => {
  const { role, department, search, limit, offset } = req.query;
  const filters = {
    role,
    department,
    search,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  };
  const [users, total] = await Promise.all([
    userService.listUsers(req.user, filters),
    userService.countUsers(req.user, filters),
  ]);
  // `total` is additive — existing frontend code reading `users`/`count`
  // keeps working exactly as before; new pagination UI reads `total`.
  res.json({ success: true, data: { users, count: users.length, total } });
});

// GET /api/users/meta/departments
const listDepartments = asyncHandler(async (req, res) => {
  const departments = await userService.listDepartments();
  res.json({ success: true, data: { departments } });
});

// GET /api/users/me/direct-reports
const getMyDirectReports = asyncHandler(async (req, res) => {
  const reports = await userService.getDirectReports(req.user, req.user.id);
  res.json({ success: true, data: { reports, count: reports.length } });
});

// GET /api/users/:userId/direct-reports
const getDirectReportsOf = asyncHandler(async (req, res) => {
  const reports = await userService.getDirectReports(req.user, req.params.userId);
  res.json({ success: true, data: { reports, count: reports.length } });
});

// GET /api/users/:userId
const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user, req.params.userId);
  res.json({ success: true, data: { user } });
});

// PATCH /api/users/:userId
const updateUser = asyncHandler(async (req, res) => {
  const updated = await userService.updateUser(req.user, req.params.userId, req.body, getRequestMeta(req));
  res.json({ success: true, message: 'Profile updated successfully', data: { user: updated } });
});

// PATCH /api/users/:userId/deactivate
const deactivateUser = asyncHandler(async (req, res) => {
  const updated = await userService.setActiveStatus(req.user, req.params.userId, false, getRequestMeta(req));
  res.json({ success: true, message: 'User deactivated', data: { user: updated } });
});

// PATCH /api/users/:userId/reactivate
const reactivateUser = asyncHandler(async (req, res) => {
  const updated = await userService.setActiveStatus(req.user, req.params.userId, true, getRequestMeta(req));
  res.json({ success: true, message: 'User reactivated', data: { user: updated } });
});

// DELETE /api/users/:userId  (soft delete - recoverable, Item 5)
const deleteEmployee = asyncHandler(async (req, res) => {
  const deleted = await userService.deleteEmployee(req.user, req.params.userId, getRequestMeta(req));
  res.json({ success: true, message: 'Employee moved to Recently Deleted', data: { user: deleted } });
});

// PATCH /api/users/:userId/restore
const restoreEmployee = asyncHandler(async (req, res) => {
  const restored = await userService.restoreEmployee(req.user, req.params.userId, getRequestMeta(req));
  res.json({ success: true, message: 'Employee restored', data: { user: restored } });
});

// GET /api/users/deleted
const listDeletedEmployees = asyncHandler(async (req, res) => {
  const users = await userService.listDeletedEmployees(req.user);
  res.json({ success: true, data: { users } });
});

// POST /api/users/:userId/avatar  (multipart/form-data, field: avatarFile)
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No avatar file was uploaded.' });
  }
  const updated = await userService.updateAvatar(req.user, req.params.userId, req.file.filename);
  res.json({ success: true, message: 'Profile picture updated', data: { user: updated } });
});

// DELETE /api/users/:userId/avatar
const removeAvatar = asyncHandler(async (req, res) => {
  const updated = await userService.removeAvatar(req.user, req.params.userId);
  res.json({ success: true, message: 'Profile picture removed', data: { user: updated } });
});

// POST /api/users/bulk-assign-manager  { employeeIds: [...], managerId }
const bulkAssignManager = asyncHandler(async (req, res) => {
  const { employeeIds, managerId } = req.body;
  const updated = await userService.bulkAssignManager(req.user, employeeIds, managerId, getRequestMeta(req));
  res.json({ success: true, message: `${updated.length} employee(s) reassigned`, data: { users: updated } });
});

// GET /api/users/:userId/timeline
const getTimeline = asyncHandler(async (req, res) => {
  const events = await timelineService.getEmployeeTimeline(req.user, req.params.userId);
  res.json({ success: true, data: { events } });
});

// GET /api/users/search/global?q=...
const globalSearch = asyncHandler(async (req, res) => {
  const results = await userService.globalSearch(req.user, req.query.q);
  res.json({ success: true, data: { results } });
});

module.exports = {
  listUsers,
  listDepartments,
  getMyDirectReports,
  getDirectReportsOf,
  getUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  deleteEmployee,
  restoreEmployee,
  listDeletedEmployees,
  uploadAvatar,
  removeAvatar,
  bulkAssignManager,
  getTimeline,
  globalSearch,
};
