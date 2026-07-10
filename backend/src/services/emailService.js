/**
 * Email service (Nodemailer).
 *
 * Email failures should never break the underlying business operation
 * (e.g. a skill update shouldn't fail just because SMTP is misconfigured),
 * so `sendMail` swallows errors after logging them. Callers that need to
 * guarantee delivery should check the return value.
 */
const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!config.smtp.host || !config.smtp.user) {
    logger.warn('SMTP not configured — emails will be logged instead of sent.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.password },
  });
  return transporter;
}

/**
 * @param {string|string[]} to
 * @param {string} subject
 * @param {string} html
 * @returns {Promise<boolean>} whether the email was sent (or would have been, in dev-log mode)
 */
async function sendMail(to, subject, html) {
  const t = getTransporter();

  if (!t) {
    // Dev fallback: log instead of failing silently, so the flow is still visible locally.
    logger.info('Email (SMTP not configured, logged only)', { to, subject });
    return false;
  }

  try {
    await t.sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.user}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    logger.error('Failed to send email', { to, subject, error: err.message });
    return false;
  }
}

module.exports = { sendMail };
