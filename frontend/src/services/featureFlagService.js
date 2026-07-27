import { api } from './api';

export async function listFeatureFlags() {
  const { data } = await api.get('/feature-flags');
  return data.data.flags;
}

export async function updateFeatureFlag(key, { visibleToAdminTier, visibleToEmployees }) {
  const { data } = await api.put(`/feature-flags/${key}`, { visibleToAdminTier, visibleToEmployees });
  return data.data.flag;
}
