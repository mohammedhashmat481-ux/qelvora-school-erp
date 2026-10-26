import jwt from 'jsonwebtoken';
import { prisma, formatLegacyId } from '../db/prisma.js';
import cache from '../lib/cache.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_school_crm_platform_2026';

const DEMO_USERS = {
  "admin@qelvora.in": { id: "admin-uuid-101", name: "Admin User", email: "admin@qelvora.in", role: "admin", skip_face: true, skip_location: true },
  "admin@schoolcrm.in": { id: "admin-uuid-101", name: "Admin User", email: "admin@qelvora.in", role: "admin", skip_face: true, skip_location: true },
  "priya.patel@qelvora.in": { id: "teacher-uuid-106", name: "Priya Patel", email: "priya.patel@qelvora.in", role: "teacher", skip_face: true, skip_location: true },
  "rajesh.sharma@qelvora.in": { id: "teacher-uuid-102", name: "Dr. Rajesh Sharma", email: "rajesh.sharma@qelvora.in", role: "teacher", skip_face: true, skip_location: true },
  "student@example.com": { id: "student-uuid-103", name: "Rahul Student", email: "student@example.com", role: "student", skip_face: true, skip_location: true },
  "parent@example.com": { id: "parent-uuid-104", name: "Mr. & Mrs. Sharma", email: "parent@example.com", role: "parent", skip_face: true, skip_location: true }
};

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      // ── Cache lookup: avoid DB query on every request ──────────────────
      const cacheKey = `auth:user:${decoded.id}`;
      let user = cache.get(cacheKey);

      if (!user) {
        // Cache miss — fetch from DB once, then cache for 5 minutes
        try {
          user = await prisma.user.findUnique({ where: { id: decoded.id } });
        } catch (dbErr) {
          user = Object.values(DEMO_USERS).find(u => u.id === decoded.id || u.email === decoded.email);
        }

        if (!user) {
          user = Object.values(DEMO_USERS).find(u => u.email === decoded.email) || {
            id: decoded.id || 'demo-user-id',
            name: decoded.name || 'Demo User',
            email: decoded.email || 'user@example.com',
            role: decoded.role || 'teacher'
          };
        }

        // Store in cache for 5 minutes (300,000 ms)
        cache.set(cacheKey, user, 300_000);
      }

      req.user = formatLegacyId(user);
      next();
    } catch (error) {
      return res.status(401).json({ status: false, message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ status: false, message: 'Not authorized, no token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        status: false,
        message: 'User is not authenticated'
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedRoles = roles.map(r => r.toLowerCase());

    const isAuthorized =
      userRole === 'admin' ||
      userRole === 'super admin' ||
      normalizedRoles.includes(userRole) ||
      normalizedRoles.some(r => userRole.includes(r) || r.includes(userRole));

    if (!isAuthorized) {
      return res.status(403).json({
        status: false,
        message: `User role ${req.user ? req.user.role : 'guest'} is not authorized to access this route`
      });
    }
    next();
  };
};

export const allowTeacherAndAdmin = authorize('teacher', 'admin');
