const asyncHandler = require('../utils/asyncHandler');
const activityLogService = require('../services/activityLogService');

// GET /api/activity-logs?actorId=&action=&entityType=&startDate=&endDate=&limit=&offset=
const getLogs = asyncHandler(async (req, res) => {
  const { actorId, action, entityType, startDate, endDate, limit, offset } = req.query;
  const { logs, total } = await activityLogService.getLogs({
    actorId,
    action,
    entityType,
    startDate,
    endDate,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  res.json({ success: true, data: { logs, total } });
});

// GET /api/activity-logs/actions  (distinct action list, for the filter dropdown)
const getDistinctActions = asyncHandler(async (req, res) => {
  const actions = await activityLogService.getDistinctActions();
  res.json({ success: true, data: { actions } });
});

module.exports = { getLogs, getDistinctActions };
