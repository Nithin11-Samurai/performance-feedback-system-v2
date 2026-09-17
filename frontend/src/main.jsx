import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

import './index.css';

// No MSAL browser SDK here anymore — SSO is now backend-driven (see
// ssoService.js on the backend). The frontend only ever does two plain
// full-page redirects (to the backend's /auth/sso/login, then back to
// /sso-callback with a one-time code); there's no popup to initialize a
// client for and no in-browser token cache to manage.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
