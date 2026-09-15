/**
 * One-on-one notes service ("Internal Notes").
 *
 * IMPORTANT:
 * - This data is Admin/HR-only, full stop.
 * - Never accessible to the employee.
 * - Never accessible to the employee's manager.
 *
 * Route-level authorization already protects these endpoints, but the
 * service performs the same role check as defense in depth.
 *
 * File attachments are stored in private Azure Blob Storage.
 */
const noteModel = require('../models/noteModel');
const userModel = require('../models/userModel');
const blobStorage = require('../utils/blobStorage');
const AppError = require('../utils/AppError');
const { isAdminTier } = require('../config/constants');

function assertIsAdmin(requesterUser) {
  if (!isAdminTier(requesterUser.role)) {
    throw AppError.forbidden(
      '1:1 meeting notes are restricted to HR/Admin only'
    );
  }
}

/**
 * Deletes a note attachment from Azure Blob Storage.
 *
 * Database stores only the filename.
 * Blob path:
 *
 *   internal-notes/<filename>
 */
async function safeDeleteFile(fileName) {
  if (!fileName) {
    return;
  }

  try {
    await blobStorage.deleteFile(
      `internal-notes/${fileName}`
    );
  } catch (err) {
    // Non-fatal. The database operation should not fail just because
    // an old attachment could not be deleted.
    // eslint-disable-next-line no-console
    console.error(
      'Failed to delete note blob:',
      fileName,
      err.message
    );
  }
}

async function listNotes(
  requesterUser,
  employeeId,
  filters = {}
) {
  assertIsAdmin(requesterUser);

  const employee =
    await userModel.findById(employeeId);

  if (!employee) {
    throw AppError.notFound(
      'Employee not found'
    );
  }

  return noteModel.listByEmployee(
    employeeId,
    filters
  );
}

async function createNote(
  requesterUser,
  employeeId,
  payload,
  file
) {
  assertIsAdmin(requesterUser);

  const employee =
    await userModel.findById(employeeId);

  if (!employee) {
    throw AppError.notFound(
      'Employee not found'
    );
  }

  let uploadedBlobPath = null;
  let fileName = null;

  // Upload attachment to Azure first.
  if (file) {
    try {
      uploadedBlobPath =
        await blobStorage.uploadFile(
          file,
          'internal-notes'
        );

      fileName =
        uploadedBlobPath.split('/').pop();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        'Note attachment Blob upload failed:',
        err
      );

      throw AppError.internal(
        'Failed to upload note attachment'
      );
    }
  }

  try {
    return await noteModel.create({
      employeeId,
      uploadedBy: requesterUser.id,
      meetingDate: payload.meetingDate,
      title: payload.title,
      noteText: payload.noteText,
      discussion: payload.discussion,
      actionItems: payload.actionItems,
      followUpDate:
        payload.followUpDate || null,
      filePath: fileName,
      fileOriginalName: file
        ? file.originalname
        : null,
    });
  } catch (err) {
    // DB insert failed after Blob upload.
    // Remove the newly uploaded Blob to avoid an orphaned file.
    if (uploadedBlobPath) {
      await blobStorage.deleteFile(
        uploadedBlobPath
      );
    }

    throw err;
  }
}

async function updateNote(
  requesterUser,
  noteId,
  payload,
  file
) {
  assertIsAdmin(requesterUser);

  const existing =
    await noteModel.findById(noteId);

  if (!existing) {
    throw AppError.notFound(
      'Note not found'
    );
  }

  const fields = {};

  if (payload.meetingDate !== undefined) {
    fields.meeting_date =
      payload.meetingDate;
  }

  if (payload.title !== undefined) {
    fields.title = payload.title;
  }

  if (payload.noteText !== undefined) {
    fields.note_text =
      payload.noteText;
  }

  if (payload.discussion !== undefined) {
    fields.discussion =
      payload.discussion;
  }

  if (payload.actionItems !== undefined) {
    fields.action_items =
      payload.actionItems;
  }

  if (payload.followUpDate !== undefined) {
    fields.follow_up_date =
      payload.followUpDate || null;
  }

  let newBlobPath = null;
  let oldFilePath = null;

  // Upload replacement attachment first.
  if (file) {
    try {
      newBlobPath =
        await blobStorage.uploadFile(
          file,
          'internal-notes'
        );

      const newFileName =
        newBlobPath.split('/').pop();

      fields.file_path = newFileName;
      fields.file_original_name =
        file.originalname;

      oldFilePath =
        existing.file_path;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        'Note attachment Blob upload failed:',
        err
      );

      throw AppError.internal(
        'Failed to upload note attachment'
      );
    }
  }

  let updated;

  try {
    updated =
      await noteModel.update(
        noteId,
        fields
      );
  } catch (err) {
    // DB update failed after new Blob upload.
    // Remove the replacement Blob.
    if (newBlobPath) {
      await blobStorage.deleteFile(
        newBlobPath
      );
    }

    throw err;
  }

  // Remove the old attachment only after
  // the database has successfully switched.
  if (oldFilePath) {
    await safeDeleteFile(
      oldFilePath
    );
  }

  return updated;
}

async function deleteNote(
  requesterUser,
  noteId
) {
  assertIsAdmin(requesterUser);

  const existing =
    await noteModel.findById(noteId);

  if (!existing) {
    throw AppError.notFound(
      'Note not found'
    );
  }

  const removed =
    await noteModel.remove(noteId);

  if (removed?.file_path) {
    await safeDeleteFile(
      removed.file_path
    );
  }
}

/**
 * Returns information needed to stream a private
 * note attachment from Azure Blob Storage.
 *
 * IMPORTANT:
 * The actual file is never exposed through a static
 * route. The controller must call this function only
 * after the Admin/HR service-level authorization check.
 */
async function getNoteFilePath(
  requesterUser,
  noteId
) {
  assertIsAdmin(requesterUser);

  const note =
    await noteModel.findById(noteId);

  if (!note || !note.file_path) {
    throw AppError.notFound(
      'Note attachment not found'
    );
  }

  return {
    blobPath:
      `internal-notes/${note.file_path}`,
    fileName:
      note.file_original_name,
  };
}

module.exports = {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  getNoteFilePath,
};