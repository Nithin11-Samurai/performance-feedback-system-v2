/**
 * Central Axios instance.
 * - Attaches the access token to every request.
 * - On a 401, tries ONE silent refresh using the stored refresh token; if
 *   that also fails, clears auth state and redirects to /login.
 * A request queue prevents multiple simultaneous 401s from each firing
 * their own refresh call.
 */
import axios from 'axios';
import { triggerGlobalLoaderShow, triggerGlobalLoaderHide } from '../utils/loaderBridge';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE_URL });

/**
 * "Remember me" support: when checked, tokens persist in localStorage
 * (survives browser restarts). When unchecked, tokens live in
 * sessionStorage (cleared when the tab/browser closes). A small flag in
 * localStorage (not sensitive) records which store is active so every
 * other function knows where to look without threading the choice
 * through every call site.
 */
function getActiveStorage() {
  return localStorage.getItem('authStorageMode') === 'session' ? sessionStorage : localStorage;
}

function getTokens() {
  const store = getActiveStorage();
  return {
    accessToken: store.getItem('accessToken'),
    refreshToken: store.getItem('refreshToken'),
  };
}

/**
 * @param {{accessToken, refreshToken}} tokens
 * @param {boolean} [rememberMe] - only meaningful on login; omit on token
 *   refresh so the original choice persists.
 */
function setTokens({ accessToken, refreshToken }, rememberMe) {
  if (rememberMe !== undefined) {
    localStorage.setItem('authStorageMode', rememberMe ? 'local' : 'session');
  }
  const store = getActiveStorage();
  if (accessToken) store.setItem('accessToken', accessToken);
  if (refreshToken) store.setItem('refreshToken', refreshToken);
}

function clearTokens() {
  const store = getActiveStorage();
  store.removeItem('accessToken');
  store.removeItem('refreshToken');
  store.removeItem('user');
  localStorage.removeItem('authStorageMode');
}

api.interceptors.request.use((config) => {
  const { accessToken } = getTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  // Opt-in only (see loaderBridge.js) — most requests (background polling,
  // small widget refreshes) should NOT trigger a full-screen premium
  // animation; that's reserved for genuinely blocking page-level loads
  // that explicitly ask for it via `api.get(url, { showGlobalLoader: true })`.
  if (config.showGlobalLoader) {
    triggerGlobalLoaderShow();
  }
  return config;
});

let isRefreshing = false;
let pendingQueue = [];

function resolvePendingQueue(error, token) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => {
    if (response.config.showGlobalLoader) {
      triggerGlobalLoaderHide();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest?.showGlobalLoader) {
      triggerGlobalLoaderHide();
    }

    if (error.response?.status !== 401 || originalRequest._retry || originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    const { refreshToken } = getTokens();
    if (!refreshToken) {
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the in-flight refresh resolves.
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = data.data;
      setTokens({ accessToken, refreshToken: newRefreshToken });
      resolvePendingQueue(null, accessToken);
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      resolvePendingQueue(refreshError, null);
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export { api, getTokens, setTokens, clearTokens, getActiveStorage };
