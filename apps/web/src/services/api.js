/**
 * Axios-based API client for Qelvora School CRM.
 * High-performance client with:
 *   - Stale-While-Revalidate (SWR) in-memory caching for ultra-fast page transitions (<5ms)
 *   - Automatic cache-busting on mutations (POST, PUT, DELETE, PATCH)
 *   - JWT auth token injection
 *   - Graceful offline/timeout error handling
 */
import axios from 'axios';

let API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Fallback to local Node backend on port 8010 if running on localhost and using relative proxy path
if (
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  (API_BASE_URL === '/api' || API_BASE_URL.startsWith('/api'))
) {
  API_BASE_URL = (import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8010') + '/api';
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── In-Memory Cache Layer for Instant Page Navigation ────────────────────────
const memoryCache = new Map();

// URL patterns that are safe and beneficial to cache across pages
const CACHEABLE_PATTERNS = [
  /^\/auth\/settings/,
  /^\/classes/,
  /^\/subjects/,
  /^\/mappings/,
  /^\/roles/,
  /^\/options/,
  /^\/auth\/profile/,
  /^\/examination\/types/,
  /^\/fees\/heads/,
  /^\/fees\/quotas/,
  /^\/fees\/structures/
];

/**
 * Manually invalidate or purge cached endpoints
 * @param {string} [pattern] - Optional substring to selectively purge (e.g. 'class', 'subject')
 */
export const clearApiCache = (pattern) => {
  if (!pattern) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }
};

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Custom caching adapter wrapper over Axios default adapter
const defaultAdapter = api.defaults.adapter || axios.defaults.adapter;

api.defaults.adapter = async (config) => {
  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';

  // 1. Invalidate matching cache entries on mutation methods
  if (['post', 'put', 'delete', 'patch'].includes(method)) {
    for (const key of memoryCache.keys()) {
      if (url.includes('class') && key.includes('class')) memoryCache.delete(key);
      else if (url.includes('subject') && key.includes('subject')) memoryCache.delete(key);
      else if (url.includes('mapping') && key.includes('mapping')) memoryCache.delete(key);
      else if (url.includes('setting') && key.includes('setting')) memoryCache.delete(key);
      else if (url.includes('role') && key.includes('role')) memoryCache.delete(key);
      else if (url.includes('profile') && key.includes('profile')) memoryCache.delete(key);
      else if (url.includes('exam') && key.includes('exam')) memoryCache.delete(key);
      else if (url.includes('fee') && key.includes('fee')) memoryCache.delete(key);
    }
    return defaultAdapter(config);
  }

  // 2. Check if GET request matches cacheable patterns
  const shouldCache = method === 'get' && CACHEABLE_PATTERNS.some(p => p.test(url));

  if (shouldCache) {
    const cacheKey = `${url}:${JSON.stringify(config.params || {})}`;
    const cached = memoryCache.get(cacheKey);
    const now = Date.now();

    // Default TTL: 3 minutes for master data, 5 minutes for settings/roles
    const ttl = (url.includes('/auth/settings') || url.includes('/roles')) ? 300000 : 180000;

    if (cached && (now - cached.timestamp < ttl)) {
      // Stale-while-revalidate: If older than 20 seconds, refresh quietly in background
      if ((now - cached.timestamp > 20000) && !cached.isRevalidating) {
        cached.isRevalidating = true;
        defaultAdapter(config)
          .then((freshResponse) => {
            memoryCache.set(cacheKey, {
              response: freshResponse,
              timestamp: Date.now(),
              isRevalidating: false
            });
          })
          .catch(() => {
            cached.isRevalidating = false;
          });
      }
      // Return cached copy immediately (0ms latency!)
      return Promise.resolve(cached.response);
    }

    // Cache miss: execute network request and cache response
    const freshResponse = await defaultAdapter(config);
    if (freshResponse.status >= 200 && freshResponse.status < 300) {
      memoryCache.set(cacheKey, {
        response: freshResponse,
        timestamp: Date.now(),
        isRevalidating: false
      });
    }
    return freshResponse;
  }

  // Non-cacheable GET request: execute directly
  return defaultAdapter(config);
};

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Timeout or network error
    if (error.code === 'ECONNABORTED' || !error.response) {
      error.isTimeout = true;
      error.friendlyMessage = 'Server is taking longer than expected. Please retry in a moment.';
      return Promise.reject(error);
    }
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Only auto-redirect for expired tokens, not for login/register failures
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_id');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
