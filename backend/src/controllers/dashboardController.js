const asyncHandler = require('../utils/asyncHandler');
const dashboardService = require('../services/dashboardService');

// GET /api/dashboard/summary?department=&cycleId= (Admin)
const getSummary = asyncHandler(async (req, res) => {
  const { department, cycleId } = req.query;
  const summary = await dashboardService.getAdminSummary({ department, cycleId });
  res.json({ success: true, data: summary });
});

// GET /api/dashboard/team-summary (Manager)
const getTeamSummary = asyncHandler(async (req, res) => {
  const summary = await dashboardService.getManagerSummary(req.user);
  res.json({ success: true, data: summary });
});

// GET /api/dashboard/my-summary (any authenticated user)
const getMySummary = asyncHandler(async (req, res) => {
  const summary = await dashboardService.getEmployeeSummary(req.user);
  res.json({ success: true, data: summary });
});

module.exports = { getSummary, getTeamSummary, getMySummary };
