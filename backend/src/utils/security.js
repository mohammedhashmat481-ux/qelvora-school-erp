/**
 * Security utility helpers
 */

/**
 * Escape special regex characters in a string to prevent ReDoS and regex injection.
 * @param {string} str - The raw user input string.
 * @returns {string} The escaped string safe for use in new RegExp().
 */
export const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Return a generic error message to the client while logging the real error server-side.
 * Prevents internal details (DB errors, stack traces) from leaking to attackers.
 * @param {object} res - Express response object.
 * @param {Error} error - The caught error.
 * @param {string} [context] - Optional context string for the log.
 * @returns {object} Express response.
 */
export const safeError = (res, error, context = 'Operation') => {
  console.error(`[ERROR] ${context}:`, error.stack || error.message || error);
  return res.status(500).json({ status: false, message: 'An internal error occurred. Please try again later.' });
};

/**
 * Log security-relevant events for monitoring and alerting.
 * In production, replace with a structured logging library (winston/pino).
 * @param {string} event - Event type (e.g., 'LOGIN_FAILED', 'ADMIN_ACTION').
 * @param {object} details - Event details.
 */
export const auditLog = (event, details = {}) => {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    event,
    ...details
  };
  console.log(`[AUDIT] ${JSON.stringify(entry)}`);
};

/**
 * In-memory token blacklist for logout.
 * In production, use Redis or a database-backed store.
 */
const tokenBlacklist = new Set();
const TOKEN_BLACKLIST_MAX = 10000;

export const blacklistToken = (token) => {
  if (tokenBlacklist.size >= TOKEN_BLACKLIST_MAX) {
    // Evict oldest entries (simple rotation)
    const first = tokenBlacklist.values().next().value;
    tokenBlacklist.delete(first);
  }
  tokenBlacklist.add(token);
};

export const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

/**
 * In-memory failed login tracker for account lockout.
 * In production, use Redis or a database field.
 * Tracks { email: { count, lockedUntil } }
 */
const failedLogins = new Map();
const MAX_FAILED_ATTEMPTS = 15;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes

export const recordFailedLogin = (email) => {
  const entry = failedLogins.get(email) || { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  failedLogins.set(email, entry);
  auditLog('LOGIN_FAILED', { email, failedCount: entry.count, locked: !!entry.lockedUntil });
};

export const isAccountLocked = (email) => {
  const entry = failedLogins.get(email);
  if (!entry || !entry.lockedUntil) return false;
  if (Date.now() > entry.lockedUntil) {
    // Lockout expired
    failedLogins.delete(email);
    return false;
  }
  return true;
};

export const clearFailedLogins = (email) => {
  failedLogins.delete(email);
};
