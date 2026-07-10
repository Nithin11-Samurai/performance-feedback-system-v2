/**
 * Certification service.
 * Same visibility/edit rules as skills: viewable by self/manager/admin,
 * editable only by self or Admin/HR. Also responsible for cleaning up the
 * uploaded certificate file from disk when a record is deleted or replaced,
 * so we don't silently accumulate orphaned files.
 */
const fs = require('fs/promises');
const path = require('path');
const certificationModel = require('../models/certificationModel');
const userModel = require('../models/userModel');
const userService = require('./userService');
const notificationService = require('./notificationService');
const AppError = require('../utils/AppError');
const { ROLES, isAdminTier } = require('../config/constants');
const { UPLOAD_ROOT } = require('../middleware/upload');

async function assertTargetExists(userId) {
  const user = await userModel.findById(userId);
  if (!user) throw AppError.notFound('User not found');
  return user;
}

function assertCanEdit(requesterUser, targetUserId) {
  const isSelf = requesterUser.id === targetUserId;
  const isAdmin = isAdminTier(requesterUser.role);
  if (!isSelf && !isAdmin) {
    throw AppError.forbidden('Only the employee themself or HR can manage this certification');
  }
}

async function safeDeleteFile(fileName) {
  if (!fileName) return;
  const absolutePath = path.join(UPLOAD_ROOT, 'certificates', fileName);
  try {
    await fs.unlink(absolutePath);
  } catch (err) {
    // Non-fatal: file may already be gone. Don't block the DB operation on this.
    if (err.code !== 'ENOENT') {
      // eslint-disable-next-line no-console
      console.error('Failed to delete certificate file:', absolutePath, err.message);
    }
  }
}

async function listCertifications(requesterUser, targetUserId) {
  const target = await assertTargetExists(targetUserId);
  if (!userService.canViewProfile(requesterUser, target)) {
    throw AppError.forbidden('You do not have permission to view these certifications');
  }
  return certificationModel.listByUser(targetUserId);
}

async function createCertification(requesterUser, targetUserId, payload, file) {
  const target = await assertTargetExists(targetUserId);
  assertCanEdit(requesterUser, targetUserId);

  const cert = await certificationModel.create({
    userId: targetUserId,
    name: payload.name,
    issuingOrganization: payload.issuingOrganization,
    issueDate: payload.issueDate,
    expiryDate: payload.expiryDate,
    credentialId: payload.credentialId,
    credentialUrl: payload.credentialUrl,
    filePath: file ? file.filename : null,
    fileOriginalName: file ? file.originalname : null,
  });

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

async function updateCertification(requesterUser, targetUserId, certId, payload, file) {
  await assertTargetExists(targetUserId);
  assertCanEdit(requesterUser, targetUserId);

  const existing = await certificationModel.findById(certId);
  if (!existing || existing.user_id !== targetUserId) {
    throw AppError.notFound('Certification not found');
  }

  const fields = {};
  if (payload.name !== undefined) fields.name = payload.name;
  if (payload.issuingOrganization !== undefined) fields.issuing_organization = payload.issuingOrganization;
  if (payload.issueDate !== undefined) fields.issue_date = payload.issueDate;
  if (payload.expiryDate !== undefined) fields.expiry_date = payload.expiryDate;
  if (payload.credentialId !== undefined) fields.credential_id = payload.credentialId;
  if (payload.credentialUrl !== undefined) fields.credential_url = payload.credentialUrl;

  // Replacing the file: delete the old one after the DB write succeeds.
  let oldFilePath = null;
  if (file) {
    fields.file_path = file.filename;
    fields.file_original_name = file.originalname;
    oldFilePath = existing.file_path;
  }

  const updated = await certificationModel.update(certId, fields);

  if (oldFilePath) {
    await safeDeleteFile(oldFilePath);
  }

  return updated;
}

async function deleteCertification(requesterUser, targetUserId, certId) {
  await assertTargetExists(targetUserId);
  assertCanEdit(requesterUser, targetUserId);

  const existing = await certificationModel.findById(certId);
  if (!existing || existing.user_id !== targetUserId) {
    throw AppError.notFound('Certification not found');
  }

  const removed = await certificationModel.remove(certId);
  if (removed?.file_path) {
    await safeDeleteFile(removed.file_path);
  }
}

module.exports = { listCertifications, createCertification, updateCertification, deleteCertification };
