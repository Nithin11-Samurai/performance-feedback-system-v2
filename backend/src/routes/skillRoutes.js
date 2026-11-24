const express = require('express');
const router = express.Router();

const skillController = require('../controllers/skillController');
const { authenticate, requireOwnFeature } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  userIdParamValidator,
  skillIdParamValidator,
  upsertSkillValidator,
} = require('../validators/skillValidators');

router.use(authenticate);

router.get('/:userId', requireOwnFeature('skills'), userIdParamValidator, validate, skillController.listSkills);
router.post('/:userId', requireOwnFeature('skills'), upsertSkillValidator, validate, skillController.upsertSkill);
router.delete(
  '/:userId/:skillId',
  requireOwnFeature('skills'),
  skillIdParamValidator,
  validate,
  skillController.deleteSkill
);

module.exports = router;
