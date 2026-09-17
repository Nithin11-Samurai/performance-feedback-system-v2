import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

import * as authService from '../services/authService';
import { getTokens } from '../services/api';

import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../auth/msalConfig';

const AuthContext = createContext(null);

const MICROSOFT_SSO_PENDING =
  'microsoft_sso_pending';

export function AuthProvider({ children }) {
  const { instance } = useMsal();

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
  // Complete Microsoft SSO after redirect
  // ---------------------------------------------------------
  useEffect(() => {
    const pending =
      sessionStorage.getItem(
        MICROSOFT_SSO_PENDING
      ) === 'true';

    if (!pending) {
      return;
    }

    let cancelled = false;

    async function completeMicrosoftLogin() {
      try {
        setLoading(true);
        setMicrosoftError('');

        const accounts =
          instance.getAllAccounts();

        console.log(
          'MSAL accounts after initialization:',
          accounts
        );

        if (!accounts.length) {
          throw new Error(
            'Microsoft sign-in completed, but no Microsoft account was found.'
          );
        }

        const account = accounts[0];

        const tokenResponse =
          await instance.acquireTokenSilent({
            ...loginRequest,
            account,
          });

        if (!tokenResponse?.accessToken) {
          throw new Error(
            'Microsoft did not return an access token.'
          );
        }

        console.log(
          'Microsoft access token acquired successfully.'
        );

        const loggedInUser =
          await authService.loginWithMicrosoft(
            tokenResponse.accessToken,
            true
          );

        console.log(
          'Application login successful:',
          loggedInUser
        );

        if (!cancelled) {
          setUser(loggedInUser);
        }

        sessionStorage.removeItem(
          MICROSOFT_SSO_PENDING
        );
      } catch (err) {
        console.error(
          'Microsoft SSO failed:',
          err
        );

        if (!cancelled) {
          const message =
            err.response?.data?.message ||
            err.message ||
            'Microsoft sign-in failed.';

          setMicrosoftError(message);
          setUser(null);
        }

        sessionStorage.removeItem(
          MICROSOFT_SSO_PENDING
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    completeMicrosoftLogin();

    return () => {
      cancelled = true;
    };
  }, [instance]);

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
  // Microsoft login
  // ---------------------------------------------------------
  const microsoftLogin = useCallback(
    async () => {
      setMicrosoftError('');

      sessionStorage.setItem(
        MICROSOFT_SSO_PENDING,
        'true'
      );

      await instance.loginRedirect(
        loginRequest
      );
    },
    [instance]
  );

  // ---------------------------------------------------------
  // Logout
  // ---------------------------------------------------------
  const logout = useCallback(
    async () => {
      await authService.logout();

      setUser(null);

      sessionStorage.removeItem(
        MICROSOFT_SSO_PENDING
      );

      await instance.logoutRedirect({
        postLogoutRedirectUri:
          window.location.origin,
      });
    },
    [instance]
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
        microsoftLogin,
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