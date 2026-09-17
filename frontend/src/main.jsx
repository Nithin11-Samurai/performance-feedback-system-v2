import React from 'react';
import ReactDOM from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';

import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { msalInstance } from './auth/msalConfig';

import './index.css';

async function bootstrap() {
  try {
    // MSAL v5 requires initialization before any MSAL API is used
    // (including loginPopup, which is what AuthContext.jsx now uses).
    await msalInstance.initialize();
  } catch (error) {
    // Popup-based sign-in doesn't depend on this succeeding to render the
    // rest of the app — worst case, clicking "Sign in with Microsoft"
    // later fails with its own visible error. Not worth blocking boot over.
    console.error('MSAL initialization failed:', error);
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