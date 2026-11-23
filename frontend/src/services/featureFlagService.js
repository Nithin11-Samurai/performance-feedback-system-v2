import { api } from './api';

export async function listFeatureFlags() {
  const { data } = await api.get('/feature-flags');
  return data.data.flags;
}

export async function updateFeatureFlag(key, { visibleToAdminTier, visibleToManagers, visibleToEmployees }) {
  const { data } = await api.put(`/feature-flags/${key}`, { visibleToAdminTier, visibleToManagers, visibleToEmployees });
  return data.data.flag;
}
