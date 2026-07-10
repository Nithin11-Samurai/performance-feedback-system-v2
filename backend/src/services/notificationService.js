/**
 * Notification service.
 * Fan-out helper used by other feature services (skills, certifications,
 * notes) to alert Admin/HR of new activity — both in-app and via email,
 * per the requirement that HR should not have to manually check for updates.
 */
const notificationModel = require('../models/notificationModel');
const userModel = require('../models/userModel');
const emailService = require('./emailService');
const logger = require('../utils/logger');
const { buildEmailHtml } = require('../utils/emailTemplate');
const { ADMIN_TIER_ROLES } = require('../config/constants');
const { query } = require('../config/db');
const config = require('../config/env');

async function getAllAdmins() {
  const result = await query(
    `SELECT id, email, first_name, last_name FROM users WHERE role = ANY($1::text[]) AND is_active = TRUE`,
    [ADMIN_TIER_ROLES]
  );
  return result.rows;
}

/**
 * Create an in-app notification for a single user and (best-effort) email
 * them using the professional branded template (Feature 2).
 * `fields` is optional — pass { Employee, 'Review Type', 'Due Date' } etc.
 * for review-related notifications; omit for simpler ones.
 */
async function notifyUser({ userId, type, title, message, link, email, recipientName, fields }) {
  const notification = await notificationModel.create({ userId, type, title, message, link });

  if (email) {
    const html = buildEmailHtml({
      title,
      greeting: recipientName ? `Hi ${recipientName},` : 'Hi,',
      bodyHtml: `<p>${message}</p>`,
      fields,
      ctaLabel: link ? 'Open Portal' : undefined,
      ctaLink: link ? `${config.clientUrl}${link}` : undefined,
    });
    emailService
      .sendMail(email, title, html)
      .catch((err) => logger.error('Notification email failed', { error: err.message }));
  }

  return notification;
}

/**
 * Notify every active Admin/HR user — used for skill updates, certification
 * uploads, and anything else HR should be alerted to without having to poll.
 */
async function notifyAdmins({ type, title, message, link }) {
  const admins = await getAllAdmins();
  await Promise.all(
    admins.map((admin) =>
      notifyUser({
        userId: admin.id,
        type,
        title,
        message,
        link,
        email: admin.email,
        recipientName: admin.first_name,
      })
    )
  );
}

module.exports = { notifyUser, notifyAdmins, getAllAdmins };
