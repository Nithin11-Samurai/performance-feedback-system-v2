/**
 * File upload middleware (Multer).
 *
 * Uploaded files are kept in memory so they can be sent directly to
 * Azure Blob Storage by the service/controller layer.
 *
 * Upload types:
 *   - certificates: images/PDF
 *   - internalNotes: docs/PDF/images
 *   - avatars: images only, max 2MB
 *   - bulk employee sheet: XLS/XLSX, kept in memory
 */

const multer = require('multer');
const path = require('path');
const config = require('../config/env');
const AppError = require('../utils/AppError');

const IMAGE_AND_PDF_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const IMAGE_ONLY_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const NOTE_FILE_TYPES = [
  ...IMAGE_AND_PDF_TYPES,
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

function fileFilterFactory(allowedTypes) {
  return (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        AppError.badRequest(`Unsupported file type: ${file.mimetype}`)
      );
    }

    cb(null, true);
  };
}

const maxSize = config.uploads.maxFileSizeMb * 1024 * 1024;
const maxAvatarSize = 2 * 1024 * 1024; // 2MB cap for profile pictures

// Azure Blob Storage integration:
// Multer keeps the file in memory instead of writing it to the
// App Service filesystem. The buffer is uploaded to Azure Blob Storage
// by the backend service/controller.
const memoryStorage = multer.memoryStorage();

const uploadCertificate = multer({
  storage: memoryStorage,
  fileFilter: fileFilterFactory(IMAGE_AND_PDF_TYPES),
  limits: {
    fileSize: maxSize,
  },
});

const uploadNoteFile = multer({
  storage: memoryStorage,
  fileFilter: fileFilterFactory(NOTE_FILE_TYPES),
  limits: {
    fileSize: maxSize,
  },
});

const uploadAvatarFile = multer({
  storage: memoryStorage,
  fileFilter: fileFilterFactory(IMAGE_ONLY_TYPES),
  limits: {
    fileSize: maxAvatarSize,
  },
});

// Bulk employee upload spreadsheet.
// Also kept entirely in memory because only the spreadsheet data is needed.
const SPREADSHEET_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const uploadBulkEmployeeSheet = multer({
  storage: multer.memoryStorage(),

  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    // Some browsers/OS combinations send XLSX as octet-stream.
    if (
      SPREADSHEET_TYPES.includes(file.mimetype) ||
      (
        ['.xlsx', '.xls'].includes(ext) &&
        file.mimetype === 'application/octet-stream'
      )
    ) {
      return cb(null, true);
    }

    cb(
      AppError.badRequest(
        `Unsupported file type: ${file.mimetype}. Please upload a .xlsx file.`
      )
    );
  },

  limits: {
    fileSize: maxSize,
  },
});

/**
 * Wraps Multer so its errors go through the application's
 * standard error handler.
 */
function handleUpload(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            AppError.badRequest(
              `File too large. Max size is ${config.uploads.maxFileSizeMb}MB.`
            )
          );
        }

        return next(AppError.badRequest(err.message));
      }

      if (err) {
        return next(err);
      }

      next();
    });
  };
}

module.exports = {
  uploadCertificate: handleUpload(
    uploadCertificate.single('certificateFile')
  ),

  uploadNoteFile: handleUpload(
    uploadNoteFile.single('noteFile')
  ),

  uploadAvatar: handleUpload(
    uploadAvatarFile.single('avatarFile')
  ),

  uploadBulkEmployeeSheet: handleUpload(
    uploadBulkEmployeeSheet.single('file')
  ),
};