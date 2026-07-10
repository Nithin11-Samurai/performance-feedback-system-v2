const { body, param } = require('express-validator');
const { SKILL_CATEGORIES, PROFICIENCY_LEVELS } = require('../config/constants');

const userIdParamValidator = [param('userId').isUUID().withMessage('userId must be a valid UUID')];

const skillIdParamValidator = [
  ...userIdParamValidator,
  param('skillId').isUUID().withMessage('skillId must be a valid UUID'),
];

const upsertSkillValidator = [
  ...userIdParamValidator,
  body('category')
    .isIn(Object.values(SKILL_CATEGORIES))
    .withMessage(`category must be one of: ${Object.values(SKILL_CATEGORIES).join(', ')}`),
  body('skillName').trim().notEmpty().withMessage('skillName is required'),
  body('proficiency')
    .optional()
    .isIn(Object.values(PROFICIENCY_LEVELS))
    .withMessage(`proficiency must be one of: ${Object.values(PROFICIENCY_LEVELS).join(', ')}`),
  body('yearsExperience').optional().isFloat({ min: 0, max: 60 }).withMessage('yearsExperience must be a valid number'),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 2000 }),
];

module.exports = { userIdParamValidator, skillIdParamValidator, upsertSkillValidator };
