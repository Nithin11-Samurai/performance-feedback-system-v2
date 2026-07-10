import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authService from '../services/authService';
import { getTokens } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authService.getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount, if we have a token, re-verify with the server rather than
    // trusting the cached user forever (role changes, deactivation, etc).
    const { accessToken } = getTokens();
    if (!accessToken) {
      setLoading(false);
      return;
    }
    authService
      .fetchMe()
      .then(setUser)
      .catch((err) => {
        // Only clear the session on a genuine auth failure. A transient
        // network error (server briefly restarting, connection drop) should
        // NOT log the person out or wipe their cached profile data (this
        // was previously unconditional and could make an avatar/profile
        // update look like it "reverted" if the request failed to reach
        // the server for a moment right after an upload).
        if (err.response?.status === 401) {
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password, rememberMe = true) => {
    const loggedInUser = await authService.login(email, password, rememberMe);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const fresh = await authService.fetchMe();
    setUser(fresh);
    return fresh;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
