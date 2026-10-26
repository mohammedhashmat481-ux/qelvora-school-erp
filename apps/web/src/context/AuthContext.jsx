/**
 * Authentication context providing user state across the application.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getProfile, healthCheck, logoutUser } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFaceVerified, setIsFaceVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(() => localStorage.getItem('selected_profile') || null);

  /**
   * Check if user is already logged in on mount.
   * Also handles tokens passed via URL params from external login pages (e.g. login.html).
   */
  useEffect(() => {
    const checkAuth = async () => {
      // ── External login bridge ──
      // If tokens are passed as URL params (from login.html or any external entry point),
      // consume them into localStorage and strip from the URL.
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('access_token');
      const urlRefresh = urlParams.get('refresh_token');
      const urlUserId = urlParams.get('user_id');
      const urlRequiresFace = urlParams.get('requires_face') !== 'false';

      if (urlToken && urlUserId) {
        localStorage.setItem('access_token', urlToken);
        if (urlRefresh) localStorage.setItem('refresh_token', urlRefresh);
        localStorage.setItem('user_id', urlUserId);

        // Clean the URL so tokens aren't visible / bookmarkable
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        // If face verification IS required, set password-authenticated state and let LoginPage handle face step
        if (urlRequiresFace) {
          setIsAuthenticated(true);
          setIsFaceVerified(false);
          setLoading(false);
          return;
        }
      }

      const token = localStorage.getItem('access_token');
      const faceVerifiedFlag = localStorage.getItem('face_verified') === 'true';
      const noCameraLogin = localStorage.getItem('no_camera_login') === 'true';

      const isTokenExpired = (t) => {
        try {
          const parts = t.split('.');
          if (parts.length < 2) return true;
          const payload = JSON.parse(atob(parts[1]));
          return payload.exp * 1000 < Date.now();
        } catch {
          return true;
        }
      };

      if (token) {
        if (isTokenExpired(token)) {
          // Token is expired. Clear locally and let the login page render instantly.
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_id');
          localStorage.removeItem('face_verified');
          localStorage.removeItem('no_camera_login');
          healthCheck().catch(() => {});
          setLoading(false);
        } else {
          try {
            const result = await getProfile();
            if (result && (result.status || result.data || result.user)) {
              const userData = result.data || result.user || result;
              setUser(userData);
              setIsAuthenticated(true);
              setIsFaceVerified(true);
            } else {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user_id');
              localStorage.removeItem('face_verified');
              localStorage.removeItem('user_role');
              setUser(null);
              setIsAuthenticated(false);
              setIsFaceVerified(false);
            }
          } catch (err) {
            console.warn('Profile fetch warning in checkAuth:', err);
            if (err.response?.status === 401 || err.response?.status === 403) {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user_id');
              localStorage.removeItem('face_verified');
              localStorage.removeItem('user_role');
              setUser(null);
              setIsAuthenticated(false);
              setIsFaceVerified(false);
            } else {
              setIsAuthenticated(true);
              setIsFaceVerified(true);
            }
          } finally {
            setLoading(false);
          }
        }
      } else {
        // No token (new user / not logged in) — Ping backend to wake up the free Render instance (cold start mitigation)
        healthCheck().catch(() => {});
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  /**
   * Store tokens after password login.
   */
  const loginSuccess = useCallback((tokenData) => {
    const token = tokenData.access_token || tokenData.pre_auth_token;
    if (token) {
      localStorage.setItem('access_token', token);
    }
    if (tokenData.refresh_token) {
      localStorage.setItem('refresh_token', tokenData.refresh_token);
    }
    if (tokenData.user_id) {
      localStorage.setItem('user_id', tokenData.user_id);
    }
    if (tokenData.user?.role) {
      localStorage.setItem('user_role', tokenData.user.role);
    }
    setIsAuthenticated(true);
    setIsFaceVerified(false);
  }, []);

  /**
   * Mark face verification as complete.
   */
  const faceVerified = useCallback((userData) => {
    setIsFaceVerified(true);
    setUser(userData);
    localStorage.setItem('face_verified', 'true');
    if (userData?.role) {
      localStorage.setItem('user_role', userData.role);
    }
  }, []);

  const selectProfile = useCallback((profile) => {
    setSelectedProfile(profile);
    if (profile) {
      localStorage.setItem('selected_profile', profile);
    } else {
      localStorage.removeItem('selected_profile');
    }
  }, []);

  /**
   * Clear all auth state and tokens.
   */
  const logout = useCallback(async (location = null) => {
    // Record logout on backend FIRST only if we have a token
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        await logoutUser(location);
      } catch {
        // Ignore errors — user is logging out anyway
      }
    }
    // Now clear local state
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('face_verified');
    localStorage.removeItem('no_camera_login');
    localStorage.removeItem('selected_profile');
    localStorage.removeItem('user_role');
    setUser(null);
    setIsAuthenticated(false);
    setIsFaceVerified(false);
    setSelectedProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isFaceVerified,
        loading,
        loginSuccess,
        faceVerified,
        logout,
        selectedProfile,
        selectProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to consume authentication context.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
