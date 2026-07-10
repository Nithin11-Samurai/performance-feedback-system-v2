import { api } from './api';

export async function listDepartments() {
  const { data } = await api.get('/catalog/departments');
  return data.data.departments;
}

export async function createDepartment(name) {
  const { data } = await api.post('/catalog/departments', { name });
  return data.data.department;
}

export async function deleteDepartment(id) {
  await api.delete(`/catalog/departments/${id}`);
}

export async function listJobTitles() {
  const { data } = await api.get('/catalog/job-titles');
  return data.data.jobTitles;
}

export async function createJobTitle(title) {
  const { data } = await api.post('/catalog/job-titles', { title });
  return data.data.jobTitle;
}

export async function deleteJobTitle(id) {
  await api.delete(`/catalog/job-titles/${id}`);
}
