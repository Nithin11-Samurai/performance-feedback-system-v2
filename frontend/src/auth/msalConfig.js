import { PublicClientApplication } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID;
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID;

export const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    // false: MSAL's own "navigate back to the page login started from"
    // behavior competes with this app's own post-login navigation
    // (AuthContext/Login.jsx already send the user to redirectTo once the
    // session is established) — two independent things both trying to
    // control navigation after the same redirect is a known source of
    // no_token_request_cache_error, where MSAL's own internal navigation
    // interrupts processing of its own redirect response.
    navigateToLoginRequestUrl: false,
  },

  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read'],
};
export const msalInstance =
  new PublicClientApplication(msalConfig);