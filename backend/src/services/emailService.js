/**
 * Email service.
 *
 * Three ways to actually send, tried in this order:
 *   1. Microsoft Graph API (MS_GRAPH_* env vars) - preferred for a
 *      Microsoft 365 tenant. Many M365 tenants now disable per-mailbox
 *      SMTP AUTH by default, and Graph is Microsoft's own recommended
 *      path for an application to send mail. Uses OAuth2 client
 *      credentials (@azure/msal-node) - no mailbox password involved.
 *   2. SMTP (SMTP_* env vars) - plain Nodemailer, works with Gmail SMTP,
 *      SendGrid, Mailgun, or M365's SMTP AUTH if your tenant has that
 *      enabled for the sending mailbox.
 *   3. Dev-mode logging - if neither is configured, the email is logged
 *      instead of sent, so nothing crashes and the flow is still visible
 *      locally.
 *
 * Email failures should never break the underlying business operation
 * (e.g. creating an employee shouldn't fail just because mail is
 * misconfigured), so sendMail swallows errors after logging them.
 * Callers that need to guarantee delivery should check the return value.
 */
const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Microsoft Graph
// ---------------------------------------------------------------------------

let msalClient = null;
let cachedGraphToken = null; // { value, expiresAt }

function isGraphConfigured() {
  const g = config.msGraph;
  return !!(g.tenantId && g.clientId && g.clientSecret && g.senderEmail);
}

function getMsalClient() {
  if (msalClient) return msalClient;
  const { ConfidentialClientApplication } = require('@azure/msal-node');
  msalClient = new ConfidentialClientApplication({
    auth: {
      clientId: config.msGraph.clientId,
      authority: `https://login.microsoftonline.com/${config.msGraph.tenantId}`,
      clientSecret: config.msGraph.clientSecret,
    },
  });
  return msalClient;
}

async function getGraphAccessToken() {
  if (cachedGraphToken && cachedGraphToken.expiresAt > Date.now() + 60000) {
    return cachedGraphToken.value;
  }
  const client = getMsalClient();
  const result = await client.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  });
  cachedGraphToken = {
    value: result.accessToken,
    expiresAt: new Date(result.expiresOn).getTime(),
  };
  return cachedGraphToken.value;
}

async function sendViaGraph(to, subject, html) {
  const accessToken = await getGraphAccessToken();
  const recipients = (Array.isArray(to) ? to : [to]).map((address) => ({ emailAddress: { address } }));

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.msGraph.senderEmail)}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: recipients,
        },
        saveToSentItems: false,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Graph sendMail failed: ${response.status} ${body}`);
  }
}

// ---------------------------------------------------------------------------
// SMTP (fallback)
// ---------------------------------------------------------------------------

let smtpTransporter = null;

function isSmtpConfigured() {
  return !!(config.smtp.host && config.smtp.user);
}

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  smtpTransporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.password },
  });
  return smtpTransporter;
}

async function sendViaSmtp(to, subject, html) {
  const transporter = getSmtpTransporter();
  await transporter.sendMail({
    from: `"${config.smtp.fromName}" <${config.smtp.user}>`,
    to,
    subject,
    html,
  });
}

// ---------------------------------------------------------------------------
// Public API - same signature as before, no caller needs to change
// ---------------------------------------------------------------------------

/**
 * @param {string|string[]} to
 * @param {string} subject
 * @param {string} html
 * @returns {Promise<boolean>} whether the email was actually sent
 */
async function sendMail(to, subject, html) {
  if (isGraphConfigured()) {
    try {
      await sendViaGraph(to, subject, html);
      return true;
    } catch (err) {
      logger.error('Failed to send email via Microsoft Graph', { to, subject, error: err.message });
      return false;
    }
  }

  if (isSmtpConfigured()) {
    try {
      await sendViaSmtp(to, subject, html);
      return true;
    } catch (err) {
      logger.error('Failed to send email via SMTP', { to, subject, error: err.message });
      return false;
    }
  }

  logger.warn('No email provider configured (Graph or SMTP) — email logged instead of sent.', { to, subject });
  return false;
}

module.exports = { sendMail };
