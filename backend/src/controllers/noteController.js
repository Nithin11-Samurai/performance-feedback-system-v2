const asyncHandler = require('../utils/asyncHandler');
const noteService = require('../services/noteService');

// GET /api/notes/:employeeId?search=&startDate=&endDate=
const listNotes = asyncHandler(async (req, res) => {
  const { search, startDate, endDate } = req.query;
  const notes = await noteService.listNotes(req.user, req.params.employeeId, { search, startDate, endDate });
  res.json({ success: true, data: { notes } });
});

// POST /api/notes/:employeeId  (multipart/form-data, optional field: noteFile)
const createNote = asyncHandler(async (req, res) => {
  const note = await noteService.createNote(req.user, req.params.employeeId, req.body, req.file);
  res.status(201).json({ success: true, message: '1:1 note added successfully', data: { note } });
});

// PATCH /api/notes/:noteId
const updateNote = asyncHandler(async (req, res) => {
  const note = await noteService.updateNote(req.user, req.params.noteId, req.body, req.file);
  res.json({ success: true, message: '1:1 note updated successfully', data: { note } });
});

// DELETE /api/notes/:noteId
const deleteNote = asyncHandler(async (req, res) => {
  await noteService.deleteNote(req.user, req.params.noteId);
  res.json({ success: true, message: '1:1 note removed' });
});

// GET /api/notes/:noteId/file — streams the attachment; never statically served
const downloadNoteFile = asyncHandler(async (req, res) => {
  const { filePath, fileName } = await noteService.getNoteFilePath(req.user, req.params.noteId);
  res.download(filePath, fileName || undefined);
});

module.exports = { listNotes, createNote, updateNote, deleteNote, downloadNoteFile };
