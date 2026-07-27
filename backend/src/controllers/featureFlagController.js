const asyncHandler = require('../utils/asyncHandler');
const featureFlagService = require('../services/featureFlagService');

// GET /api/feature-flags — any authenticated user
const listFlags = asyncHandler(async (req, res) => {
  const flags = await featureFlagService.listFlags();
  res.json({ success: true, data: { flags } });
});

// PUT /api/feature-flags/:key — Admin-tier only (enforced in service)
const updateFlag = asyncHandler(async (req, res) => {
  const updated = await featureFlagService.updateFlag(req.user, req.params.key, req.body);
  res.json({ success: true, message: `"${updated.label}" visibility updated`, data: { flag: updated } });
});

module.exports = { listFlags, updateFlag };
