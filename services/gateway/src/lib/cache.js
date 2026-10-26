/**
 * Lightweight in-memory LRU-style cache with per-entry TTL.
 * Zero dependencies. Thread-safe for single-process Node.js.
 *
 * Usage:
 *   import cache from '../lib/cache.js';
 *   cache.set('key', value, 300_000);  // 5 min TTL
 *   const val = cache.get('key');       // undefined if expired/missing
 *   cache.del('key');
 *   cache.flush('grade:');             // delete all keys starting with prefix
 */

class MemoryCache {
  constructor() {
    /** @type {Map<string, { value: any, expiresAt: number }>} */
    this._store = new Map();

    // Periodic GC — sweep expired entries every 60 seconds
    setInterval(() => this._gc(), 60_000).unref();
  }

  /**
   * Get a cached value. Returns undefined if missing or expired.
   * @param {string} key
   * @returns {any}
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Store a value with a TTL.
   * @param {string} key
   * @param {any} value
   * @param {number} ttlMs  Time-to-live in milliseconds (default: 5 minutes)
   */
  set(key, value, ttlMs = 300_000) {
    this._store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Delete a single key.
   * @param {string} key
   */
  del(key) {
    this._store.delete(key);
  }

  /**
   * Delete all keys that start with the given prefix.
   * Useful for invalidating a group of related keys (e.g. 'timetable:').
   * @param {string} prefix
   */
  flush(prefix) {
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix)) {
        this._store.delete(key);
      }
    }
  }

  /** Remove all expired entries (called automatically every 60 s). */
  _gc() {
    const now = Date.now();
    for (const [key, entry] of this._store.entries()) {
      if (now > entry.expiresAt) {
        this._store.delete(key);
      }
    }
  }

  /** Current number of live (non-expired) entries. */
  get size() {
    this._gc();
    return this._store.size;
  }
}

// Singleton — shared across all route modules in the same process
const cache = new MemoryCache();
export default cache;
