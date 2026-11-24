import { api } from './api';

export async function getAnalyticsOverview() {
  const { data } = await api.get('/analytics/overview');
  return data.data;
}

// --- Skills & Certifications dashboard ---

const compact = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export async function getSkillsDashboard(params) {
  const { data } = await api.get('/analytics/skills-dashboard', { params: compact(params) });
  return data.data;
}

export async function getDashboardSkillPeople(params) {
  const { data } = await api.get('/analytics/skills-dashboard/skill', { params: compact(params) });
  return data.data;
}

export async function searchDashboardPeople(search) {
  const { data } = await api.get('/analytics/skills-dashboard/people', { params: { search } });
  return data.data.people;
}

export async function listDashboardManagers() {
  const { data } = await api.get('/analytics/skills-dashboard/managers');
  return data.data.managers;
}

// --- Item 7: Skills & Certifications Overview ---

export async function getSkillsOverview() {
  const { data } = await api.get('/analytics/skills-overview');
  return data.data.skills;
}

export async function getEmployeesForSkill(category, skillName) {
  const { data } = await api.get(`/analytics/skills-overview/${category}/${encodeURIComponent(skillName)}/employees`);
  return data.data.employees;
}

async function downloadBlob(url, filename) {
  const response = await api.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function exportSkillsOverviewExcel() {
  await downloadBlob('/analytics/skills-overview/export/excel', 'Skills_Overview.xlsx');
}

export async function exportSkillEmployeesExcel(category, skillName) {
  await downloadBlob(`/analytics/skills-overview/${category}/${encodeURIComponent(skillName)}/employees/export/excel`, `${skillName}_Employees.xlsx`);
}

export async function getCertificationsOverview() {
  const { data } = await api.get('/analytics/certifications-overview');
  return data.data.certifications;
}

export async function getEmployeesForCertification(name) {
  const { data } = await api.get(`/analytics/certifications-overview/${encodeURIComponent(name)}/employees`);
  return data.data.employees;
}

export async function exportCertificationsOverviewExcel() {
  await downloadBlob('/analytics/certifications-overview/export/excel', 'Certifications_Overview.xlsx');
}

export async function exportCertificationEmployeesExcel(name) {
  await downloadBlob(`/analytics/certifications-overview/${encodeURIComponent(name)}/employees/export/excel`, `${name}_Employees.xlsx`);
}
