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
  // Microsoft login (popup flow, not redirect)
  // ---------------------------------------------------------
  // Switched from loginRedirect + a "pending" flag picked up on the next
  // page load to loginPopup, which keeps this tab's JS context alive the
  // whole time and resolves with the result directly — no full-page
  // navigation away and back, so there's no "did the temporary request
  // cache survive the round trip" question at all. This entirely
  // sidesteps the no_token_request_cache_error class of failure the
  // redirect flow was hitting in production.
  const microsoftLogin = useCallback(
    async () => {
      setMicrosoftError('');

      try {
        const result = await instance.loginPopup(loginRequest);

        if (!result?.accessToken) {
          throw new Error(
            'Microsoft did not return an access token.'
          );
        }

        const loggedInUser =
          await authService.loginWithMicrosoft(
            result.accessToken,
            true
          );

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
    [instance]
  );

  // ---------------------------------------------------------
  // Logout
  // ---------------------------------------------------------
  const logout = useCallback(
    async () => {
      await authService.logout();

      setUser(null);

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