import { api } from './api';

export async function listUsers(params = {}) {
  const { data } = await api.get('/users', { params });
  return data.data.users;
}

/**
 * Same endpoint as listUsers, but returns { users, total } for pagination
 * UIs. Kept separate so existing callers of listUsers() (which expect a
 * plain array) are completely unaffected.
 */
export async function listUsersPaged(params = {}) {
  const { data } = await api.get('/users', { params });
  return { users: data.data.users, total: data.data.total };
}

export async function getUser(userId) {
  const { data } = await api.get(`/users/${userId}`);
  return data.data.user;
}

export async function getMyDirectReports() {
  const { data } = await api.get('/users/me/direct-reports');
  return data.data.reports;
}

export async function getDirectReportsOf(userId) {
  const { data } = await api.get(`/users/${userId}/direct-reports`);
  return data.data.reports;
}

export async function updateUser(userId, updates) {
  const { data } = await api.patch(`/users/${userId}`, updates);
  return data.data.user;
}

export async function deactivateUser(userId) {
  const { data } = await api.patch(`/users/${userId}/deactivate`);
  return data.data.user;
}

export async function reactivateUser(userId) {
  const { data } = await api.patch(`/users/${userId}/reactivate`);
  return data.data.user;
}

// Item 5: soft delete + restore
export async function deleteEmployee(userId) {
  const { data } = await api.delete(`/users/${userId}`);
  return data.data.user;
}

export async function restoreEmployee(userId) {
  const { data } = await api.patch(`/users/${userId}/restore`);
  return data.data.user;
}

export async function listDeletedEmployees() {
  const { data } = await api.get('/users/deleted');
  return data.data.users;
}

export async function listDepartments() {
  const { data } = await api.get('/users/meta/departments');
  return data.data.departments;
}

/**
 * @param {string} userId
 * @param {File} file
 */
export async function uploadAvatar(userId, file) {
  const form = new FormData();
  form.append('avatarFile', file);
  const { data } = await api.post(`/users/${userId}/avatar`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.user;
}

export async function removeAvatar(userId) {
  const { data } = await api.delete(`/users/${userId}/avatar`);
  return data.data.user;
}

// Feature 5: bulk manager reassignment
export async function bulkAssignManager(employeeIds, managerId) {
  const { data } = await api.post('/users/bulk-assign-manager', { employeeIds, managerId });
  return data.data.users;
}

// Item 5: Bulk employee upload
export async function downloadBulkTemplate() {
  const response = await api.get('/users/bulk-template/excel', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'Employee_Bulk_Upload_Template.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function bulkUploadEmployees(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/users/bulk-upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data; // { created, errors }
}

// Feature 8: global search
export async function globalSearch(q) {
  const { data } = await api.get('/users/search/global', { params: { q } });
  return data.data.results;
}

// Feature 7: employee timeline
export async function getTimeline(userId) {
  const { data } = await api.get(`/users/${userId}/timeline`);
  return data.data.events;
}
