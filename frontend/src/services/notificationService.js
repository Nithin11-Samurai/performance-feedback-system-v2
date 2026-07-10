import { api } from './api';

export async function listNotifications(params = {}) {
  const { data } = await api.get('/notifications', { params });
  return data.data; // { notifications, unreadCount }
}

export async function markNotificationRead(id) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data.data.notification;
}

export async function markAllNotificationsRead() {
  await api.patch('/notifications/read-all');
}
