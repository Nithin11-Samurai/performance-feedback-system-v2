/**
 * One-on-one notes service ("Internal Notes").
 *
 * IMPORTANT: this data is Admin/HR-only, full stop — never the employee,
 * never their manager. Route-level `authorize(...ADMIN_TIER_ROLES)` already blocks
 * everyone else, but we re-check the role here too (defense in depth) so
 * that if this service is ever called from a new route someone adds later
 * without remembering the access rule, it still fails closed.
 */
const fs = require('fs/promises');
const path = require('path');
const noteModel = require('../models/noteModel');
const userModel = require('../models/userModel');
const AppError = require('../utils/AppError');
const { ROLES, isAdminTier } = require('../config/constants');
const { UPLOAD_ROOT } = require('../middleware/upload');

function assertIsAdmin(requesterUser) {
  if (!isAdminTier(requesterUser.role)) {
    throw AppError.forbidden('1:1 meeting notes are restricted to HR/Admin only');
  }
}

async function safeDeleteFile(fileName) {
  if (!fileName) return;
  const absolutePath = path.join(UPLOAD_ROOT, 'internal-notes', fileName);
  try {
    await fs.unlink(absolutePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // eslint-disable-next-line no-console
      console.error('Failed to delete note file:', absolutePath, err.message);
    }
  }
}

async function listNotes(requesterUser, employeeId, filters = {}) {
  assertIsAdmin(requesterUser);
  const employee = await userModel.findById(employeeId);
  if (!employee) throw AppError.notFound('Employee not found');
  return noteModel.listByEmployee(employeeId, filters);
}

async function createNote(requesterUser, employeeId, payload, file) {
  assertIsAdmin(requesterUser);
  const employee = await userModel.findById(employeeId);
  if (!employee) throw AppError.notFound('Employee not found');

  return noteModel.create({
    employeeId,
    uploadedBy: requesterUser.id,
    meetingDate: payload.meetingDate,
    title: payload.title,
    noteText: payload.noteText,
    discussion: payload.discussion,
    actionItems: payload.actionItems,
    followUpDate: payload.followUpDate || null,
    filePath: file ? file.filename : null,
    fileOriginalName: file ? file.originalname : null,
  });
}

async function updateNote(requesterUser, noteId, payload, file) {
  assertIsAdmin(requesterUser);
  const existing = await noteModel.findById(noteId);
  if (!existing) throw AppError.notFound('Note not found');

  const fields = {};
  if (payload.meetingDate !== undefined) fields.meeting_date = payload.meetingDate;
  if (payload.title !== undefined) fields.title = payload.title;
  if (payload.noteText !== undefined) fields.note_text = payload.noteText;
  if (payload.discussion !== undefined) fields.discussion = payload.discussion;
  if (payload.actionItems !== undefined) fields.action_items = payload.actionItems;
  if (payload.followUpDate !== undefined) fields.follow_up_date = payload.followUpDate || null;

  let oldFilePath = null;
  if (file) {
    fields.file_path = file.filename;
    fields.file_original_name = file.originalname;
    oldFilePath = existing.file_path;
  }

  const updated = await noteModel.update(noteId, fields);
  if (oldFilePath) await safeDeleteFile(oldFilePath);
  return updated;
}

async function deleteNote(requesterUser, noteId) {
  assertIsAdmin(requesterUser);
  const existing = await noteModel.findById(noteId);
  if (!existing) throw AppError.notFound('Note not found');

  const removed = await noteModel.remove(noteId);
  if (removed?.file_path) await safeDeleteFile(removed.file_path);
}

/**
 * Returns the absolute file path for a note attachment, after verifying
 * the requester is Admin and the note exists — used by the controller to
 * stream the file back (since internal-notes is never statically served).
 */
async function getNoteFilePath(requesterUser, noteId) {
  assertIsAdmin(requesterUser);
  const note = await noteModel.findById(noteId);
  if (!note || !note.file_path) {
    throw AppError.notFound('Note attachment not found');
  }
  const absolutePath = path.join(UPLOAD_ROOT, 'internal-notes', note.file_path);
  return { filePath: absolutePath, fileName: note.file_original_name };
}

module.exports = { listNotes, createNote, updateNote, deleteNote, getNoteFilePath };
