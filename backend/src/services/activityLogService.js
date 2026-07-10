const activityLogModel = require('../models/activityLogModel');

async function getLogs(filters) {
  const [logs, total] = await Promise.all([
    activityLogModel.listLogs(filters),
    activityLogModel.countLogs(filters),
  ]);
  return { logs, total };
}

async function getDistinctActions() {
  return activityLogModel.listDistinctActions();
}

module.exports = { getLogs, getDistinctActions };
