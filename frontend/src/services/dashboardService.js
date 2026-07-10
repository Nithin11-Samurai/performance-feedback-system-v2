import { api } from './api';

export async function getAdminDashboardSummary(filters = {}) {
  const { data } = await api.get('/dashboard/summary', { params: filters });
  return data.data;
}

export async function getManagerDashboardSummary() {
  const { data } = await api.get('/dashboard/team-summary', { showGlobalLoader: true });
  return data.data;
}

export async function getMyDashboardSummary() {
  const { data } = await api.get('/dashboard/my-summary', { showGlobalLoader: true });
  return data.data;
}
