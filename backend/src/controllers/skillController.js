const asyncHandler = require('../utils/asyncHandler');
const skillService = require('../services/skillService');

// GET /api/skills/:userId
const listSkills = asyncHandler(async (req, res) => {
  const skills = await skillService.listSkills(req.user, req.params.userId);
  res.json({ success: true, data: { skills } });
});

// POST /api/skills/:userId  (create or update — matched by category + skillName)
const upsertSkill = asyncHandler(async (req, res) => {
  const skill = await skillService.upsertSkill(req.user, req.params.userId, req.body);
  res.status(200).json({ success: true, message: 'Skill saved successfully', data: { skill } });
});

// DELETE /api/skills/:userId/:skillId
const deleteSkill = asyncHandler(async (req, res) => {
  await skillService.deleteSkill(req.user, req.params.userId, req.params.skillId);
  res.json({ success: true, message: 'Skill removed' });
});

module.exports = { listSkills, upsertSkill, deleteSkill };
