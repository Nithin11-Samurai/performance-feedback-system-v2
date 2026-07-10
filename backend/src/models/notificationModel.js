/**
 * Notification model — all SQL for the `notifications` table.
 */
const { query } = require('../config/db');

async function create({ userId, type, title, message, link }) {
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, message, link)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, type, title, message || null, link || null]
  );
  return result.rows[0];
}

async function listForUser(userId, { unreadOnly = false, limit = 30, offset = 0 } = {}) {
  const condition = unreadOnly ? 'AND is_read = FALSE' : '';
  const result = await query(
    `SELECT * FROM notifications WHERE user_id = $1 ${condition}
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

async function countUnread(userId) {
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return result.rows[0].count;
}

async function markRead(userId, notificationId) {
  const result = await query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
    [notificationId, userId]
  );
  return result.rows[0] || null;
}

async function markAllRead(userId) {
  await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [userId]);
}

module.exports = { create, listForUser, countUnread, markRead, markAllRead };
