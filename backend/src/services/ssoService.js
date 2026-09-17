/**
 * Microsoft Entra ID SSO — confidential-client (server-side) authorization
 * code flow via @azure/msal-node.
 *
 * Replaces the earlier browser-only approach (loginRedirect, then
 * loginPopup), both of which ran into hard platform limits specific to
 * running an SPA-flow MSAL client on Azure Static Web Apps: loginRedirect
 * lost its temporary request cache across the full-page round trip
 * (no_token_request_cache_error), and loginPopup's main window couldn't
 * reliably monitor the popup even after relaxing Cross-Origin-Opener-Policy
 * (leading to timed_out). Both failure modes are specific to doing the
 * OAuth dance IN THE BROWSER.
 *
 * This flow sidesteps that category of bug entirely: the browser only
 * ever does two things — (1) a full-page redirect to Microsoft, and (2) a
 * full-page redirect back to a one-time code. Every actual token exchange
 * happens here, server-side, where there's no popup to monitor and no
 * SPA-specific temporary-cache semantics to lose.
 *
 * Same account-matching policy as the old loginWithMicrosoftAccessToken in
 * authService.js: SSO never auto-creates an account. It only succeeds for
 * an email that already has an active row in `users` — accounts are
 * provisioned by Admin/HR, same as everywhere else in this app.
 */
const config = require('../config/env');
const userModel = require('../models/userModel');
const AppError = require('../utils/AppError');
const ssoExchangeStore = require('../utils/ssoExchangeStore');
const { issueTokenPair } = require('./authService');

let msalClient = null;
function getMsalClient() {
  if (msalClient) return msalClient;
  const { ConfidentialClientApplication } = require('@azure/msal-node');
  msalClient = new ConfidentialClientApplication({
    auth: {
      clientId: config.entra.clientId,
      authority: `https://login.microsoftonline.com/${config.entra.tenantId}`,
      clientSecret: config.entra.clientSecret,
    },
  });
  return msalClient;
}

const SCOPES = ['openid', 'profile', 'email'];

/**
 * Step 1: build the URL the browser does a full-page redirect to.
 * `state` round-trips through Microsoft unmodified and back to the
 * callback — used here to carry the SPA's intended post-login destination
 * through the redirect (the standard purpose of OAuth `state`).
 */
async function getAuthUrl(state) {
  const client = getMsalClient();
  return client.getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: config.entra.redirectUri,
    state: state || '',
    prompt: 'select_account',
  });
}

/**
 * Step 2: Microsoft redirects the browser back here with a `code`.
 * Exchange it for an ID token server-side, pull the email out of the
 * verified claims (not something the client could spoof), match it
 * against an existing account, and issue this app's own JWT pair — from
 * here on an SSO session is indistinguishable from a password session
 * anywhere else in the app.
 */
async function handleCallback(code) {
  const client = getMsalClient();
  let result;
  try {
    result = await client.acquireTokenByCode({
      code,
      scopes: SCOPES,
      redirectUri: config.entra.redirectUri,
    });
  } catch (err) {
    // Log the real Azure/MSAL error rather than only the generic message
    // shown to the user — this is almost always either an invalid client
    // secret (commonly: pasting the Secret ID instead of the actual
    // secret Value, which look similar but are different things) or a
    // redirect URI mismatch between what's registered and what's sent.
    const logger = require('../utils/logger');
    logger.error('SSO token exchange failed', {
      errorCode: err.errorCode,
      errorMessage: err.errorMessage || err.message,
    });
    throw AppError.unauthorized('Microsoft sign-in failed. Please try again.');
  }

  const claims = result.idTokenClaims || {};
  const email = (claims.preferred_username || claims.email || '').trim().toLowerCase();
  if (!email) {
    throw AppError.unauthorized("Microsoft didn't return an email address for this account.");
  }

  const user = await userModel.findByEmail(email);
  if (!user) {
    throw AppError.unauthorized(
      'Your Microsoft account is not registered in the Performance Feedback System'
    );
  }
  if (user.deleted_at) {
    throw AppError.unauthorized('Your account is no longer active');
  }
  if (!user.is_active) {
    throw AppError.forbidden('This account has been deactivated. Contact HR.');
  }

  const tokens = await issueTokenPair(user);

  // Hand back a one-time code rather than the tokens themselves — see
  // ssoExchangeStore.js for why.
  return ssoExchangeStore.put({ user, ...tokens });
}

/** Step 3: the frontend's /sso-callback page exchanges the one-time code for the real tokens. */
function exchangeCode(code) {
  const payload = ssoExchangeStore.take(code);
  if (!payload) {
    throw AppError.unauthorized('This sign-in link has expired or was already used. Please sign in again.');
  }
  return payload;
}

module.exports = { getAuthUrl, handleCallback, exchangeCode };
