/**
 * Extracts the fields we care about for audit logs from an Express
 * request. Centralized so IP extraction logic (proxy headers, etc.) only
 * needs to be right in one place.
 */
function getRequestMeta(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || req.ip;
  const userAgent = req.headers['user-agent'] || null;
  return { ip, userAgent };
}

module.exports = { getRequestMeta };
