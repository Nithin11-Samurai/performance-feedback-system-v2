/**
 * File upload middleware (Multer).
 *
 * Two separate configs because they have different rules:
 *   - certificates: images/PDF, publicly-servable by authenticated users
 *     who can already view that employee's profile (served via
 *     /uploads/certificates static route in app.js).
 *   - internalNotes: docs/PDF/images, NEVER statically served — only
 *     streamed back through an Admin/HR-gated controller route, since
 *     these are the 1:1 notes that must stay invisible to employees/managers.
 *
 * Filenames are randomized (uuid) so the original filename (which a user
 * controls) can never be used for path traversal or to guess other users'
 * files.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');
const AppError = require('../utils/AppError');

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function makeStorage(subfolder) {
  const dest = path.join(UPLOAD_ROOT, subfolder);
  ensureDir(dest);
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

const IMAGE_AND_PDF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const IMAGE_ONLY_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const NOTE_FILE_TYPES = [
  ...IMAGE_AND_PDF_TYPES,
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

function fileFilterFactory(allowedTypes) {
  return (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(AppError.badRequest(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  };
}

const maxSize = config.uploads.maxFileSizeMb * 1024 * 1024;
const maxAvatarSize = 2 * 1024 * 1024; // 2MB cap for profile pictures specifically

const uploadCertificate = multer({
  storage: makeStorage('certificates'),
  fileFilter: fileFilterFactory(IMAGE_AND_PDF_TYPES),
  limits: { fileSize: maxSize },
});

const uploadNoteFile = multer({
  storage: makeStorage('internal-notes'),
  fileFilter: fileFilterFactory(NOTE_FILE_TYPES),
  limits: { fileSize: maxSize },
});

const uploadAvatarFile = multer({
  storage: makeStorage('avatars'),
  fileFilter: fileFilterFactory(IMAGE_ONLY_TYPES),
  limits: { fileSize: maxAvatarSize },
});

// Bulk employee upload spreadsheet (Item 5) — parsed in-memory, never
// written to disk, since we only need the row data out of it.
const SPREADSHEET_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];
const uploadBulkEmployeeSheet = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Some OS/browser combos send a generic octet-stream MIME type for
    // .xlsx files instead of the specific spreadsheet type — fall back to
    // checking the extension in that case rather than rejecting outright.
    if (SPREADSHEET_TYPES.includes(file.mimetype) || (['.xlsx', '.xls'].includes(ext) && file.mimetype === 'application/octet-stream')) {
      return cb(null, true);
    }
    cb(AppError.badRequest(`Unsupported file type: ${file.mimetype}. Please upload a .xlsx file.`));
  },
  limits: { fileSize: maxSize },
});

/**
 * Wraps a multer middleware so its errors (file too large, bad type) flow
 * through our standard error handler instead of multer's default format.
 */
function handleUpload(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(AppError.badRequest(`File too large. Max size is ${config.uploads.maxFileSizeMb}MB.`));
        }
        return next(AppError.badRequest(err.message));
      }
      if (err) return next(err);
      next();
    });
  };
}

module.exports = {
  uploadCertificate: handleUpload(uploadCertificate.single('certificateFile')),
  uploadNoteFile: handleUpload(uploadNoteFile.single('noteFile')),
  uploadAvatar: handleUpload(uploadAvatarFile.single('avatarFile')),
  uploadBulkEmployeeSheet: handleUpload(uploadBulkEmployeeSheet.single('file')),
  UPLOAD_ROOT,
};
