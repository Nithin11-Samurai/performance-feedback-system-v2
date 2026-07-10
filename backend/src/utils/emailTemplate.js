/**
 * Professional HTML email template (Feature 2).
 * All transactional emails route through this so they share consistent
 * branding (pink theme) instead of ad-hoc inline HTML per call site.
 */
const config = require('../config/env');

/**
 * @param {object} params
 * @param {string} params.title - main heading
 * @param {string} params.greeting - e.g. "Hi Raj,"
 * @param {string} params.bodyHtml - inner content (can include its own <p> tags)
 * @param {object} [params.fields] - optional key/value rows (Employee, Review Type, Due Date, etc.)
 * @param {string} [params.ctaLabel] - button label
 * @param {string} [params.ctaLink] - button link (defaults to the app's login page)
 */
function buildEmailHtml({ title, greeting, bodyHtml, fields, ctaLabel, ctaLink }) {
  const fieldRows = fields
    ? Object.entries(fields)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(
          ([label, value]) => `
            <tr>
              <td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px;">${label}</td>
              <td style="padding:6px 0;color:#241221;font-size:13px;font-weight:600;">${value}</td>
            </tr>`
        )
        .join('')
    : '';

  const button = ctaLabel
    ? `<a href="${ctaLink || config.clientUrl}" style="display:inline-block;margin-top:20px;padding:12px 28px;background-color:#ea6bb3;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:600;font-size:14px;">${ctaLabel}</a>`
    : '';

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background-color:#fff8fc;padding:32px 16px;">
    <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(214,51,132,0.08);">
      <tr>
        <td style="background-color:#ea6bb3;padding:24px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;">Performance Feedback System</span>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <h1 style="margin:0 0 12px 0;font-size:20px;color:#241221;">${title}</h1>
          ${greeting ? `<p style="margin:0 0 16px 0;color:#374151;font-size:14px;">${greeting}</p>` : ''}
          <div style="color:#374151;font-size:14px;line-height:1.6;">${bodyHtml}</div>
          ${
            fieldRows
              ? `<table role="presentation" style="margin-top:16px;width:100%;border-top:1px solid #fadeee;border-bottom:1px solid #fadeee;">${fieldRows}</table>`
              : ''
          }
          ${button}
        </td>
      </tr>
      <tr>
        <td style="background-color:#fdf2f8;padding:16px 32px;text-align:center;">
          <span style="color:#9d174d;font-size:12px;">This is an automated message from your organization's Performance Feedback System.</span>
        </td>
      </tr>
    </table>
  </div>`;
}

module.exports = { buildEmailHtml };
