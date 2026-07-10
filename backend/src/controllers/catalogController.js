const asyncHandler = require('../utils/asyncHandler');
const catalogService = require('../services/catalogService');

const listDepartments = asyncHandler(async (req, res) => {
  const departments = await catalogService.listDepartments();
  res.json({ success: true, data: { departments } });
});

const createDepartment = asyncHandler(async (req, res) => {
  const department = await catalogService.createDepartment(req.user, req.body.name);
  res.status(201).json({ success: true, message: 'Department added', data: { department } });
});

const deleteDepartment = asyncHandler(async (req, res) => {
  await catalogService.deleteDepartment(req.user, req.params.id);
  res.json({ success: true, message: 'Department removed' });
});

const listJobTitles = asyncHandler(async (req, res) => {
  const jobTitles = await catalogService.listJobTitles();
  res.json({ success: true, data: { jobTitles } });
});

const createJobTitle = asyncHandler(async (req, res) => {
  const jobTitle = await catalogService.createJobTitle(req.user, req.body.title);
  res.status(201).json({ success: true, message: 'Job title added', data: { jobTitle } });
});

const deleteJobTitle = asyncHandler(async (req, res) => {
  await catalogService.deleteJobTitle(req.user, req.params.id);
  res.json({ success: true, message: 'Job title removed' });
});

module.exports = {
  listDepartments,
  createDepartment,
  deleteDepartment,
  listJobTitles,
  createJobTitle,
  deleteJobTitle,
};
