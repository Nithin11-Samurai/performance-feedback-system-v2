const { body, param } = require('express-validator');
const { SKILL_CATEGORIES, PROFICIENCY_LEVELS, TRAINING_STATUS } = require('../config/constants');

const userIdParamValidator = [param('userId').isUUID().withMessage('userId must be a valid UUID')];

const skillIdParamValidator = [
  ...userIdParamValidator,
  param('skillId').isUUID().withMessage('skillId must be a valid UUID'),
];

const upsertSkillValidator = [
  ...userIdParamValidator,
  // A skill picked from the catalog is identified by catalogId; a skill the
  // person types in themselves needs a category and a name instead.
  body('catalogId').optional({ nullable: true }).isUUID().withMessage('catalogId must be a valid UUID'),
  body('category').custom((value, { req }) => {
    if (req.body.catalogId) return true;
    if (!Object.values(SKILL_CATEGORIES).includes(value)) {
      throw new Error(`category must be one of: ${Object.values(SKILL_CATEGORIES).join(', ')}`);
    }
    return true;
  }),
  body('skillName').custom((value, { req }) => {
    if (req.body.catalogId) return true;
    if (!value || !String(value).trim()) throw new Error('skillName is required');
    if (String(value).trim().length > 150) throw new Error('skillName must be 150 characters or fewer');
    return true;
  }),
  body('trainingStatus')
    .optional()
    .isIn(Object.values(TRAINING_STATUS))
    .withMessage(`trainingStatus must be one of: ${Object.values(TRAINING_STATUS).join(', ')}`),
  body('proficiency')
    .optional()
    .isIn(Object.values(PROFICIENCY_LEVELS))
    .withMessage(`proficiency must be one of: ${Object.values(PROFICIENCY_LEVELS).join(', ')}`),
  body('yearsExperience').optional().isFloat({ min: 0, max: 60 }).withMessage('yearsExperience must be a valid number'),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 2000 }),
];

module.exports = { userIdParamValidator, skillIdParamValidator, upsertSkillValidator };
