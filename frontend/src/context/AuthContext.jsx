import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

import * as authService from '../services/authService';
import { getTokens } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(
    authService.getStoredUser()
  );

  const [loading, setLoading] = useState(true);
  const [microsoftError, setMicrosoftError] =
    useState('');

  // ---------------------------------------------------------
  // Existing application JWT session
  // ---------------------------------------------------------
  useEffect(() => {
    const { accessToken } = getTokens();

    if (!accessToken) {
      setLoading(false);
      return;
    }

    authService
      .fetchMe()
      .then(setUser)
      .catch((err) => {
        if (err.response?.status === 401) {
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // ---------------------------------------------------------
  // Normal login
  // ---------------------------------------------------------
  const login = useCallback(
    async (
      email,
      password,
      rememberMe = true
    ) => {
      const loggedInUser =
        await authService.login(
          email,
          password,
          rememberMe
        );

      setUser(loggedInUser);

      return loggedInUser;
    },
    []
  );

  // ---------------------------------------------------------
  // Microsoft SSO (backend-driven — see ssoService.js on the backend).
  // Called by the /sso-callback page once it has the one-time exchange
  // code from the redirect. No MSAL browser SDK involved at all: the
  // entire Microsoft token exchange happens server-side, so there's no
  // popup to monitor and no browser-side temporary cache to lose.
  // ---------------------------------------------------------
  const loginWithSso = useCallback(
    async (exchangeCode) => {
      setMicrosoftError('');
      try {
        const loggedInUser = await authService.completeSso(exchangeCode);
        setUser(loggedInUser);
        return loggedInUser;
      } catch (err) {
        const message =
          err.response?.data?.message ||
          err.message ||
          'Microsoft sign-in failed.';
        setMicrosoftError(message);
        throw err;
      }
    },
    []
  );

  // ---------------------------------------------------------
  // Logout
  // ---------------------------------------------------------
  const logout = useCallback(
    async () => {
      await authService.logout();
      setUser(null);
    },
    []
  );

  // ---------------------------------------------------------
  // Refresh user
  // ---------------------------------------------------------
  const refreshUser = useCallback(
    async () => {
      const fresh =
        await authService.fetchMe();

      setUser(fresh);

      return fresh;
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithSso,
        microsoftError,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return ctx;
}