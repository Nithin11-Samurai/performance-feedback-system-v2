const asyncHandler = require('../utils/asyncHandler');
const sectionPermissionService = require('../services/sectionPermissionService');

const listSections = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { sections: sectionPermissionService.listSections() } });
});

// GET /api/permissions/me  (any signed-in user: their own overrides only)
const listMine = asyncHandler(async (req, res) => {
  const overrides = await sectionPermissionService.listMine(req.user);
  res.json({ success: true, data: { overrides } });
});

const listForUser = asyncHandler(async (req, res) => {
  const overrides = await sectionPermissionService.listForUser(req.user, req.params.userId);
  res.json({ success: true, data: { overrides } });
});

const setOverride = asyncHandler(async (req, res) => {
  const { sectionKey, allowed } = req.body;
  const override = await sectionPermissionService.setOverride(req.user, req.params.userId, sectionKey, allowed);
  res.json({ success: true, message: 'Permission updated', data: { override } });
});

const removeOverride = asyncHandler(async (req, res) => {
  await sectionPermissionService.removeOverride(req.user, req.params.userId, req.params.sectionKey);
  res.json({ success: true, message: 'Permission override removed' });
});

module.exports = { listSections, listMine, listForUser, setOverride, removeOverride };
