const asyncHandler = require('../utils/asyncHandler');
const notificationModel = require('../models/notificationModel');

// GET /api/notifications?unreadOnly=&limit=&offset=
const listMine = asyncHandler(async (req, res) => {
  const { unreadOnly, limit, offset } = req.query;
  const notifications = await notificationModel.listForUser(req.user.id, {
    unreadOnly: unreadOnly === 'true',
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  const unreadCount = await notificationModel.countUnread(req.user.id);
  res.json({ success: true, data: { notifications, unreadCount } });
});

// PATCH /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationModel.markRead(req.user.id, req.params.id);
  res.json({ success: true, data: { notification } });
});

// PATCH /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await notificationModel.markAllRead(req.user.id);
  res.json({ success: true, message: 'All notifications marked as read' });
});

module.exports = { listMine, markRead, markAllRead };
