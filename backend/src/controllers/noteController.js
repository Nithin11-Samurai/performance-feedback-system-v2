const asyncHandler = require('../utils/asyncHandler');
const noteService = require('../services/noteService');
const blobStorage = require('../utils/blobStorage');

// GET /api/notes/:employeeId?search=&startDate=&endDate=
const listNotes = asyncHandler(async (req, res) => {
  const {
    search,
    startDate,
    endDate,
  } = req.query;

  const notes = await noteService.listNotes(
    req.user,
    req.params.employeeId,
    {
      search,
      startDate,
      endDate,
    }
  );

  res.json({
    success: true,
    data: { notes },
  });
});

// POST /api/notes/:employeeId
// multipart/form-data, optional field: noteFile
const createNote = asyncHandler(async (req, res) => {
  const note = await noteService.createNote(
    req.user,
    req.params.employeeId,
    req.body,
    req.file
  );

  res.status(201).json({
    success: true,
    message: '1:1 note added successfully',
    data: { note },
  });
});

// PATCH /api/notes/:noteId
const updateNote = asyncHandler(async (req, res) => {
  const note = await noteService.updateNote(
    req.user,
    req.params.noteId,
    req.body,
    req.file
  );

  res.json({
    success: true,
    message: '1:1 note updated successfully',
    data: { note },
  });
});

// DELETE /api/notes/:noteId
const deleteNote = asyncHandler(async (req, res) => {
  await noteService.deleteNote(
    req.user,
    req.params.noteId
  );

  res.json({
    success: true,
    message: '1:1 note removed',
  });
});

// GET /api/notes/:noteId/file
// Streams the private Azure Blob attachment.
// Never statically served.
const downloadNoteFile = asyncHandler(async (req, res) => {
  const {
    blobPath,
    fileName,
  } = await noteService.getNoteFilePath(
    req.user,
    req.params.noteId
  );

  const {
    stream,
    contentType,
    contentLength,
  } = await blobStorage.downloadFile(
    blobPath
  );

  res.setHeader(
    'Content-Type',
    contentType || 'application/octet-stream'
  );

  if (
    contentLength !== undefined &&
    contentLength !== null
  ) {
    res.setHeader(
      'Content-Length',
      contentLength
    );
  }

  // Keep the attachment as a download instead of
  // attempting to display it inline.
  if (fileName) {
    const safeFileName = fileName
      .replace(/[\r\n"]/g, '');

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFileName}"`
    );
  }

  stream.on('error', (err) => {
    // Avoid trying to send another response if the
    // client disconnected while streaming.
    if (!res.headersSent) {
      throw err;
    }

    res.destroy(err);
  });

  stream.pipe(res);
});

module.exports = {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  downloadNoteFile,
};