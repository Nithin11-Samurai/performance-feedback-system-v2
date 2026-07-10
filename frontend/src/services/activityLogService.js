import { api } from './api';

export async function getActivityLogs(filters = {}) {
  const { data } = await api.get('/activity-logs', { params: filters });
  return data.data; // { logs, total }
}

export async function getDistinctActions() {
  const { data } = await api.get('/activity-logs/actions');
  return data.data.actions;
}
