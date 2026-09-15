/**
 * Certification service.
 *
 * Same visibility/edit rules as skills:
 *   - viewable by self/manager/admin
 *   - editable only by self or Admin/HR
 *
 * Certificate files are stored in Azure Blob Storage.
 * The database continues to store only the filename in file_path,
 * preserving the existing application contract.
 */
const certificationModel = require('../models/certificationModel');
const userModel = require('../models/userModel');
const userService = require('./userService');
const notificationService = require('./notificationService');
const blobStorage = require('../utils/blobStorage');
const AppError = require('../utils/AppError');
const { isAdminTier } = require('../config/constants');

async function assertTargetExists(userId) {
  const user = await userModel.findById(userId);

  if (!user) {
    throw AppError.notFound('User not found');
  }

  return user;
}

function assertCanEdit(requesterUser, targetUserId) {
  const isSelf = requesterUser.id === targetUserId;
  const isAdmin = isAdminTier(requesterUser.role);

  if (!isSelf && !isAdmin) {
    throw AppError.forbidden(
      'Only the employee themself or HR can manage this certification'
    );
  }
}

/**
 * Delete a certificate from Azure Blob Storage.
 *
 * Database stores only:
 *   <filename>
 *
 * Blob Storage path is:
 *   certificates/<filename>
 */
async function safeDeleteFile(fileName) {
  if (!fileName) {
    return;
  }

  try {
    await blobStorage.deleteFile(
      `certificates/${fileName}`
    );
  } catch (err) {
    // Best effort only. Do not fail a DB operation because the old blob
    // could not be removed.
    // eslint-disable-next-line no-console
    console.error(
      'Failed to delete certificate blob:',
      fileName,
      err.message
    );
  }
}

async function listCertifications(
  requesterUser,
  targetUserId
) {
  const target = await assertTargetExists(targetUserId);

  if (!userService.canViewProfile(requesterUser, target)) {
    throw AppError.forbidden(
      'You do not have permission to view these certifications'
    );
  }

  return certificationModel.listByUser(targetUserId);
}

async function createCertification(
  requesterUser,
  targetUserId,
  payload,
  file
) {
  const target = await assertTargetExists(targetUserId);

  assertCanEdit(
    requesterUser,
    targetUserId
  );

  let uploadedBlobPath = null;
  let fileName = null;

  // Upload certificate to Azure first.
  if (file) {
    try {
      uploadedBlobPath =
        await blobStorage.uploadFile(
          file,
          'certificates'
        );

      fileName =
        uploadedBlobPath.split('/').pop();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        'Certificate Blob upload failed:',
        err
      );

      throw AppError.internal(
        'Failed to upload certificate'
      );
    }
  }

  let cert;

  try {
    cert = await certificationModel.create({
      userId: targetUserId,
      name: payload.name,
      issuingOrganization:
        payload.issuingOrganization,
      issueDate: payload.issueDate,
      expiryDate: payload.expiryDate,
      credentialId: payload.credentialId,
      credentialUrl: payload.credentialUrl,
      filePath: fileName,
      fileOriginalName: file
        ? file.originalname
        : null,
    });
  } catch (err) {
    // DB operation failed after Blob upload.
    // Clean up the orphaned Blob.
    if (uploadedBlobPath) {
      await blobStorage.deleteFile(
        uploadedBlobPath
      );
    }

    throw err;
  }

  if (requesterUser.id === targetUserId) {
    notificationService
      .notifyAdmins({
        type: 'certification_uploaded',
        title: 'New certification uploaded',
        message: `${target.first_name} ${target.last_name} added a new certification: ${payload.name}.`,
        link: `/admin/employees/${targetUserId}`,
      })
      .catch(() => {});
  }

  return cert;
}

async function updateCertification(
  requesterUser,
  targetUserId,
  certId,
  payload,
  file
) {
  await assertTargetExists(targetUserId);

  assertCanEdit(
    requesterUser,
    targetUserId
  );

  const existing =
    await certificationModel.findById(certId);

  if (
    !existing ||
    existing.user_id !== targetUserId
  ) {
    throw AppError.notFound(
      'Certification not found'
    );
  }

  const fields = {};

  if (payload.name !== undefined) {
    fields.name = payload.name;
  }

  if (
    payload.issuingOrganization !== undefined
  ) {
    fields.issuing_organization =
      payload.issuingOrganization;
  }

  if (payload.issueDate !== undefined) {
    fields.issue_date = payload.issueDate;
  }

  if (payload.expiryDate !== undefined) {
    fields.expiry_date = payload.expiryDate;
  }

  if (payload.credentialId !== undefined) {
    fields.credential_id = payload.credentialId;
  }

  if (payload.credentialUrl !== undefined) {
    fields.credential_url =
      payload.credentialUrl;
  }

  let newBlobPath = null;
  let oldFilePath = null;

  // If a new certificate is supplied, upload the new
  // file first. This protects the existing file if upload fails.
  if (file) {
    try {
      newBlobPath =
        await blobStorage.uploadFile(
          file,
          'certificates'
        );

      const newFileName =
        newBlobPath.split('/').pop();

      fields.file_path = newFileName;
      fields.file_original_name =
        file.originalname;

      oldFilePath = existing.file_path;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        'Certificate Blob upload failed:',
        err
      );

      throw AppError.internal(
        'Failed to upload certificate'
      );
    }
  }

  let updated;

  try {
    updated =
      await certificationModel.update(
        certId,
        fields
      );
  } catch (err) {
    // DB update failed after new Blob upload.
    // Remove the newly uploaded blob.
    if (newBlobPath) {
      await blobStorage.deleteFile(
        newBlobPath
      );
    }

    throw err;
  }

  // Only remove the old certificate after
  // the database has successfully switched to the new file.
  if (oldFilePath) {
    await safeDeleteFile(oldFilePath);
  }

  return updated;
}

async function deleteCertification(
  requesterUser,
  targetUserId,
  certId
) {
  await assertTargetExists(targetUserId);

  assertCanEdit(
    requesterUser,
    targetUserId
  );

  const existing =
    await certificationModel.findById(certId);

  if (
    !existing ||
    existing.user_id !== targetUserId
  ) {
    throw AppError.notFound(
      'Certification not found'
    );
  }

  const removed =
    await certificationModel.remove(certId);

  if (removed?.file_path) {
    await safeDeleteFile(
      removed.file_path
    );
  }
}

module.exports = {
  listCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
};