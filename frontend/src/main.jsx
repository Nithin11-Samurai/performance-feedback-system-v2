import React from 'react';
import ReactDOM from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';

import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { msalInstance } from './auth/msalConfig';

import './index.css';

async function bootstrap() {
  try {
    // MSAL v5 requires initialization before any MSAL API is used.
    await msalInstance.initialize();

    // Process a pending Microsoft redirect before rendering the app.
    await msalInstance.handleRedirectPromise();
  } catch (error) {
    console.error('MSAL initialization failed:', error);
    // Previously this was console-only, so a failed Microsoft sign-in
    // (wrong client ID, redirect URI registered under the wrong platform
    // type, tenant mismatch, etc.) looked like nothing happened — the app
    // just re-rendered the login page with no explanation. Stash the real
    // MSAL/Azure error so Login.jsx can show it once, then clear it.
    try {
      sessionStorage.setItem(
        'msal_redirect_error',
        error?.errorMessage || error?.message || 'Microsoft sign-in failed.'
      );
    } catch {
      // sessionStorage can throw in rare privacy-mode/quota situations —
      // losing the error message isn't worth crashing app boot over.
    }
  }

  ReactDOM.createRoot(
    document.getElementById('root')
  ).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </MsalProvider>
    </React.StrictMode>
  );
}

bootstrap();