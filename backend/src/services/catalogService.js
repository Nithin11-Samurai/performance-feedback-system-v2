const catalogModel = require('../models/catalogModel');
const AppError = require('../utils/AppError');
const auditLog = require('../utils/auditLog');

async function listDepartments() {
  return catalogModel.listDepartments();
}

async function createDepartment(requesterUser, name) {
  if (!name || !name.trim()) throw AppError.badRequest('Department name is required');
  const dept = await catalogModel.createDepartment(name.trim(), requesterUser.id);
  await auditLog.record(requesterUser.id, 'CREATE_DEPARTMENT', 'department', dept.id, { name: dept.name });
  return dept;
}

async function deleteDepartment(requesterUser, id) {
  const removed = await catalogModel.deleteDepartment(id);
  if (!removed) throw AppError.notFound('Department not found');
  await auditLog.record(requesterUser.id, 'DELETE_DEPARTMENT', 'department', id, {});
}

async function listJobTitles() {
  return catalogModel.listJobTitles();
}

async function createJobTitle(requesterUser, title) {
  if (!title || !title.trim()) throw AppError.badRequest('Job title is required');
  const jobTitle = await catalogModel.createJobTitle(title.trim(), requesterUser.id);
  await auditLog.record(requesterUser.id, 'CREATE_JOB_TITLE', 'job_title', jobTitle.id, { title: jobTitle.title });
  return jobTitle;
}

async function deleteJobTitle(requesterUser, id) {
  const removed = await catalogModel.deleteJobTitle(id);
  if (!removed) throw AppError.notFound('Job title not found');
  await auditLog.record(requesterUser.id, 'DELETE_JOB_TITLE', 'job_title', id, {});
}

module.exports = {
  listDepartments,
  createDepartment,
  deleteDepartment,
  listJobTitles,
  createJobTitle,
  deleteJobTitle,
};
