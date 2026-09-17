/**
 * Short-lived, single-use handoff between the Entra ID redirect (a full
 * browser navigation, which can't carry a POST body or JSON response) and
 * the frontend (which needs real access/refresh tokens to actually log
 * the person in).
 *
 * Deliberately NOT putting the real JWTs in the redirect URL itself — URLs
 * end up in browser history, server access logs, and Referer headers.
 * Instead the callback redirects with a random one-time `code`, and the
 * frontend immediately exchanges it via POST /auth/sso/exchange.
 *
 * In-memory + single instance is fine here: codes live ~30 seconds and are
 * consumed within one login round trip. If this backend ever runs on more
 * than one instance behind a load balancer, swap this for Redis (same
 * put/take shape) — nothing else about the flow needs to change.
 */
const crypto = require('crypto');

const TTL_MS = 30 * 1000;
const store = new Map(); // code -> { payload, expiresAt }

function sweep() {
  const now = Date.now();
  for (const [code, entry] of store) {
    if (entry.expiresAt < now) store.delete(code);
  }
}

function put(payload) {
  sweep();
  const code = crypto.randomBytes(24).toString('hex');
  store.set(code, { payload, expiresAt: Date.now() + TTL_MS });
  return code;
}

// Single-use: consuming a code deletes it immediately, so a leaked or
// replayed URL can never be exchanged twice.
function take(code) {
  const entry = store.get(code);
  store.delete(code);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) return null;
  return entry.payload;
}

module.exports = { put, take };
