const asyncHandler = require('../utils/asyncHandler');
const skillCatalogService = require('../services/skillCatalogService');

// GET /api/skill-catalog  (?includeInactive=true is honoured for Admin-tier only)
const listCatalog = asyncHandler(async (req, res) => {
  const skills = await skillCatalogService.listCatalog(req.user, {
    includeInactive: req.query.includeInactive === 'true',
  });
  res.json({ success: true, data: { skills } });
});

// GET /api/skill-catalog/custom  (Admin-tier)
const listCustomSkills = asyncHandler(async (req, res) => {
  const skills = await skillCatalogService.listCustomSkills(req.user);
  res.json({ success: true, data: { skills } });
});

// POST /api/skill-catalog  (Admin-tier)
const createCatalogSkill = asyncHandler(async (req, res) => {
  const skill = await skillCatalogService.createCatalogSkill(req.user, req.body);
  res.status(201).json({ success: true, message: 'Skill added to the list', data: { skill } });
});

// PATCH /api/skill-catalog/:id  (Admin-tier)
const updateCatalogSkill = asyncHandler(async (req, res) => {
  const skill = await skillCatalogService.updateCatalogSkill(req.user, req.params.id, req.body);
  res.json({ success: true, message: 'Skill updated', data: { skill } });
});

module.exports = { listCatalog, listCustomSkills, createCatalogSkill, updateCatalogSkill };
