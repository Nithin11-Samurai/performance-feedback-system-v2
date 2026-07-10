const express = require('express');
const router = express.Router();

const skillController = require('../controllers/skillController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  userIdParamValidator,
  skillIdParamValidator,
  upsertSkillValidator,
} = require('../validators/skillValidators');

router.use(authenticate);

router.get('/:userId', userIdParamValidator, validate, skillController.listSkills);
router.post('/:userId', upsertSkillValidator, validate, skillController.upsertSkill);
router.delete('/:userId/:skillId', skillIdParamValidator, validate, skillController.deleteSkill);

module.exports = router;
