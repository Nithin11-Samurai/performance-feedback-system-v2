/**
 * 1:1 meeting notes routes ("Internal Notes").
 * `authorize(...ADMIN_TIER_ROLES)` is applied to the ENTIRE router — there is no
 * sub-route here reachable by employee or manager roles, by design.
 */
const express = require('express');
const router = express.Router();

const noteController = require('../controllers/noteController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadNoteFile } = require('../middleware/upload');
const {
  employeeIdParamValidator,
  noteIdParamValidator,
  createNoteValidator,
  updateNoteValidator,
} = require('../validators/noteValidators');
const { ROLES, ADMIN_TIER_ROLES } = require('../config/constants');

router.use(authenticate, authorize(...ADMIN_TIER_ROLES));

router.get('/:employeeId', employeeIdParamValidator, validate, noteController.listNotes);

router.post('/:employeeId', uploadNoteFile, createNoteValidator, validate, noteController.createNote);

router.patch('/note/:noteId', uploadNoteFile, updateNoteValidator, validate, noteController.updateNote);

router.delete('/note/:noteId', noteIdParamValidator, validate, noteController.deleteNote);

router.get('/note/:noteId/file', noteIdParamValidator, validate, noteController.downloadNoteFile);

module.exports = router;
