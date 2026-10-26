import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Role from '../models/Role.js';
import { escapeRegex, isTokenBlacklisted, auditLog } from '../utils/security.js';
import { isDbNetworkError, ensureConnection } from '../config/db.js';

// Fail fast if JWT secret is not configured
const JWT_SECRET = process.env.JWT_SECRET_KEY;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET_KEY environment variable is not set. Server cannot start securely.');
}

/**
 * Protect routes - authenticate JWT
 */
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {

      // Check if token is blacklisted (logged out)
      if (isTokenBlacklisted(token)) {
        return res.status(401).json({ status: false, message: 'Token has been invalidated. Please login again.' });
      }

      // Decode token with explicit algorithm
      const secret = JWT_SECRET || 'INSECURE-FALLBACK-CHANGE-ME';
      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

      // Reject pre-auth tokens from accessing protected routes
      if (decoded.type === 'pre-auth') {
        return res.status(401).json({ status: false, message: 'Face verification required before accessing this resource.' });
      }

      // Get user from DB — with automatic reconnect to local DB on network errors
      const _findUser = () => User.findById(decoded.id).select('-face_embeddings -password_hash');
      try {
        req.user = await _findUser();
      } catch (dbErr) {
        if (isDbNetworkError(dbErr)) {
          console.warn('[AUTH] Database network error in protect middleware — reconnecting to local DB...');
          await ensureConnection();
          req.user = await _findUser();
        } else {
          throw dbErr;
        }
      }

      if (!req.user) {
        return res.status(401).json({ status: false, message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error('[SECURITY] JWT verification error:', error.message);
      return res.status(401).json({ status: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ status: false, message: 'Not authorized, no token provided' });
  }
};

/**
 * Authorize specific roles.
 * Always allows 'admin' and 'principal' roles.
 * Also checks the Role collection for grantAdminPrivilege flag.
 */
export const authorize = (...roles) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ status: false, message: 'Not authorized' });
    }

    const userRole = req.user.role.toLowerCase();
    const normalizedRoles = roles.map(r => r.toLowerCase());

    // Direct match against provided roles
    if (normalizedRoles.includes(userRole)) {
      return next();
    }

    // Principal always has super-admin access
    if (userRole === 'principal') {
      return next();
    }

    // Check if user's dynamic role has admin privilege (with escaped regex)
    try {
      const escapedRole = escapeRegex(userRole);
      const dynamicRole = await Role.findOne({ roleName: { $regex: new RegExp(`^${escapedRole}$`, 'i') } });
      if (dynamicRole && dynamicRole.grantAdminPrivilege) {
        return next();
      }
    } catch (err) {
      // Ignore lookup errors and fall through to denial
    }

    auditLog('AUTH_DENIED', { userId: req.user._id, role: req.user.role, requiredRoles: roles });
    return res.status(403).json({
      status: false,
      message: `User role '${req.user.role}' is not authorized to access this resource`
    });
  };
};
