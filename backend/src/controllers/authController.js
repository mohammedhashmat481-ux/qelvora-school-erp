import User from '../models/User.js';
import Teacher from '../models/Teacher.js';
import NonTeachingStaff from '../models/NonTeachingStaff.js';
import Student from '../models/Student.js';
import TeacherAttendance from '../models/TeacherAttendance.js';
import { getIO } from '../config/socket.js';
import jwt from 'jsonwebtoken';
import { extractEmbedding, extractMultiple, compareEmbeddings, findMatchingUser } from '../services/faceService.js';
import { encryptEmbedding, encryptEmbeddings } from '../utils/encryption.js';
import SchoolSettings from '../models/SchoolSettings.js';
import logger from '../utils/logger.js';
import { escapeRegex, safeError, auditLog, blacklistToken, recordFailedLogin, isAccountLocked, clearFailedLogins } from '../utils/security.js';
import { z } from 'zod';
import { isDbNetworkError, ensureConnection, forceLocalConnection, syncToLocal } from '../config/db.js';

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  phone: z.string().trim().optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  face_images: z.array(z.string()).optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).optional(),
  role: z.string().optional(),
  standard: z.string().optional(),
  section: z.string().optional(),
  rollNumber: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  designation: z.string().optional(),
  joiningDate: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).nullable().optional(),
  offlineMode: z.boolean().optional()
});

// Helper for distance check (Haversine formula)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};

/**
 * Automatically records teacher/staff attendance punch-in upon successful login
 */
const autoPunchInForUser = async (user, location) => {
  try {
    if (!['teacher', 'staff'].includes(user.role)) return;

    // Find the faculty profile corresponding to this User
    let faculty = await Teacher.findOne({ user: user._id });
    if (!faculty) {
      faculty = await NonTeachingStaff.findOne({ user: user._id });
    }
    if (!faculty) return;

    // Get today's local date string (IST)
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const yyyy = ist.getFullYear();
    const mm = String(ist.getMonth() + 1).padStart(2, '0');
    const dd = String(ist.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Check if already punched in
    let attendance = await TeacherAttendance.findOne({ date: todayStr, teacher: faculty._id });
    if (attendance && attendance.status === 'Present') {
      return; // Already punched in
    }

    let address = 'School Campus';
    if (location && location.latitude) {
      address = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'FaceAuthSchoolSystem/1.0' } }
        );
        const data = await response.json();
        if (data && data.display_name) {
          address = data.display_name;
        }
      } catch {}
    }

    if (!attendance) {
      attendance = new TeacherAttendance({
        date: todayStr,
        teacher: faculty._id,
        status: 'Present',
        punchIn: new Date(),
        location,
        address
      });
    } else {
      attendance.status = 'Present';
      attendance.punchIn = new Date();
      attendance.location = location;
      attendance.address = address;
    }

    await attendance.save();

    // Emit live WebSocket update
    const io = getIO();
    if (io) {
      io.emit('attendance_punch', {
        employeeId: faculty.employeeId,
        name: faculty.name,
        role: faculty.qualification ? 'Teacher' : faculty.staffRole || 'Staff',
        date: todayStr,
        punchIn: attendance.punchIn,
        status: 'Present'
      });
    }
  } catch (err) {
    console.error('[AUTO-PUNCH] Error recording auto attendance:', err);
  }
};

// Helper to generate JWT tokens (24h expiration for seamless persistent sessions)
const generateToken = (id, role) => {
  return jwt.sign({ id, role, type: 'access' }, process.env.JWT_SECRET_KEY || 'INSECURE-FALLBACK-CHANGE-ME', {
    expiresIn: '24h',
    algorithm: 'HS256'
  });
};

const generateRefreshToken = (id, role) => {
  return jwt.sign({ id, role, type: 'refresh' }, process.env.JWT_SECRET_KEY || 'INSECURE-FALLBACK-CHANGE-ME', {
    expiresIn: '7d',
    algorithm: 'HS256'
  });
};

const generatePreAuthToken = (id) => {
  return jwt.sign({ id, type: 'pre-auth' }, process.env.JWT_SECRET_KEY || 'INSECURE-FALLBACK-CHANGE-ME', {
    expiresIn: '5m',
    algorithm: 'HS256'
  });
};

/**
 * Check if email or phone is already registered
 */
export const checkUser = async (req, res) => {
  const { email, phone } = req.body;
  try {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(200).json({ status: false, message: 'Email is already registered' });
    }
    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(200).json({ status: false, message: 'Phone number is already registered' });
      }
    }
    return res.status(200).json({ status: true, message: 'Available' });
  } catch (error) {
    return safeError(res, error, 'checkUser');
  }
};

// Helper to trigger background sync of user and profile to local MongoDB
const triggerSync = async (userDoc) => {
  try {
    let profileDoc = null;
    const roleLower = (userDoc.role || '').toLowerCase();
    
    if (roleLower === 'student') {
      profileDoc = await Student.findOne({ user: userDoc._id });
    } else if (roleLower === 'teacher') {
      profileDoc = await Teacher.findOne({ user: userDoc._id });
    } else if (roleLower === 'staff' || roleLower === 'nonteachingstaff') {
      profileDoc = await NonTeachingStaff.findOne({ user: userDoc._id });
    }
    
    // Call sync helper (non-blocking)
    syncToLocal(userDoc, userDoc.role, profileDoc).catch(e => {
      console.warn('[SYNC-BG] Sync error:', e.message);
    });
  } catch (err) {
    // Ignore background errors
  }
};

/**
 * Register a new user
 */
export const register = async (req, res) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors[0]?.message || 'Invalid input data';
      return res.status(400).json({ status: false, message: errorMessage });
    }
    const { name, email, phone, password, face_images, location, role, standard, section, rollNumber, parentName, parentPhone, designation, joiningDate } = parseResult.data;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ status: false, message: 'User already exists with this email address' });
    }

    // Check duplicate phone
    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(400).json({ status: false, message: 'User already exists with this phone number' });
      }
    }

    let encryptedEmbeddings = [];

    // If face images are provided, extract embeddings and encrypt them
    if (face_images && face_images.length >= 4) {
      try {
        logger.info(`[REGISTER] Processing ${face_images.length} face frames for ${email}`);
        const result = await extractMultiple(face_images);
        if (result.embeddings) {
          // Check for duplicate face registrations
          const allUsersWithFace = await User.find({ face_embeddings: { $exists: true, $not: { $size: 0 } } });
          const matchingUser = findMatchingUser(result.embeddings, allUsersWithFace);
          if (matchingUser) {
            logger.warn(`[REGISTER] Duplicate face detected for ${email} — matches user ${matchingUser.email}`);
            return res.status(400).json({ status: false, message: 'This face is already registered under another account. Please login instead.' });
          }
          encryptedEmbeddings = encryptEmbeddings(result.embeddings);
          logger.info(`[REGISTER] Successfully encrypted ${result.embeddings.length} face embeddings for ${email}`);
        } else {
          logger.warn(`[REGISTER] Face extraction failed for ${email}: ${result.reason}`);
          return res.status(400).json({ status: false, message: result.reason });
        }
      } catch (err) {
        logger.error(`[REGISTER] Biometric error for ${email}:`, err);
        return res.status(500).json({ status: false, message: `Biometric extraction error: ${err.message}` });
      }
    }

    const targetRole = role || 'teacher';
    const isStudent = targetRole.toLowerCase() === 'student';

    // Create user in DB
    const user = await User.create({
      name,
      email,
      phone,
      password_hash: password, // pre-save hook will hash this
      role: targetRole,
      face_embeddings: encryptedEmbeddings,
      registeredLocation: location,
      skip_face: isStudent ? true : false,
      skip_location: isStudent ? true : false
    });

    // Handle profile creation based on role
    let profileDoc = null;
    if (user.role === 'student') {
      const studentId = 'STU-' + Math.floor(100000 + Math.random() * 900000);
      profileDoc = await Student.create({
        user: user._id,
        studentId,
        name: user.name,
        email: user.email,
        phone: user.phone || 'N/A',
        standard: standard || '5th',
        section: section || 'A',
        rollNumber: rollNumber || 'N/A',
        parentName: parentName || 'N/A',
        parentPhone: parentPhone || 'N/A'
      });
    } else if (user.role === 'teacher') {
      const employeeId = 'TCH-' + Math.floor(100000 + Math.random() * 900000);
      profileDoc = await Teacher.create({
        user: user._id,
        employeeId,
        name: user.name,
        email: user.email,
        phone: user.phone || 'N/A',
        qualification: designation || 'Not Configured Yet',
        experience: 0,
        status: 'Active'
      });
    }

    // Sync newly registered user to local DB in the background
    syncToLocal(user, user.role, profileDoc).catch(() => {});

    return res.status(201).json({
      status: true,
      message: 'User registered successfully',
      user_id: user._id,
      employee_id: user.role === 'student' ? 'STU-NEW' : 'TCH-NEW'
    });
  } catch (error) {
    return safeError(res, error, 'Registration');
  }
};

/**
 * Login with email & password (Step 1)
 */
export const login = async (req, res) => {
  // If request indicates offlineMode, immediately bypass Atlas and switch to local connection
  const { offlineMode } = req.body || {};
  if (offlineMode === true) {
    try {
      await forceLocalConnection();
    } catch (err) {
      console.error('[LOGIN] Failed to switch to local DB for Offline Mode:', err.message);
    }
  }

  // Inner function that performs the actual login logic.
  // Separated so we can retry once after reconnecting to local DB.
  const _doLogin = async () => {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors[0]?.message || 'Invalid input data';
      return res.status(400).json({ status: false, message: errorMessage });
    }
    const { email, password, location, offlineMode: parsedOfflineMode } = parseResult.data;

    // Account lockout check (skip for admin accounts)
    const adminEmails = ['srakesh@gmail.com'];
    if (isAccountLocked(email) && !adminEmails.includes(email.toLowerCase())) {
      auditLog('LOGIN_BLOCKED_LOCKOUT', { email });
      return res.status(429).json({ status: false, message: 'Account temporarily locked due to too many failed login attempts. Please try again in 2 minutes.' });
    }
    // Always clear lockout for admin
    if (adminEmails.includes(email.toLowerCase())) {
      clearFailedLogins(email);
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      recordFailedLogin(email);
      return res.status(401).json({ status: false, message: 'Invalid email or password' });
    }

    clearFailedLogins(email);
    auditLog('LOGIN_SUCCESS', { email, userId: user._id });

    if (!user.isActive) {
      return res.status(403).json({ status: false, message: 'Account is disabled. Contact your administrator.' });
    }

    const settings = await SchoolSettings.findOne();
    const isLocationAuthEnabled = settings ? settings.location_auth_enabled !== false : true;
    const skipLocation = user.skip_location || !isLocationAuthEnabled || parsedOfflineMode === true;

    // GPS location boundary check
    if (!skipLocation) {
      if (user.registeredLocation && location) {
        const distance = getDistance(
          user.registeredLocation.latitude,
          user.registeredLocation.longitude,
          location.latitude,
          location.longitude
        );
        if (distance > 100) {
          return res.status(403).json({
            status: false,
            detail: `Location mismatch: you are ${Math.round(distance)}m away from the registered location. Maximum allowed: 100m.`
          });
        }
      } else if (!user.registeredLocation && location) {
        user.registeredLocation = location;
        await user.save();
      } else if (!location) {
        return res.status(403).json({
          status: false,
          detail: 'Location is required for login. Please enable GPS/location services.'
        });
      }
    }

    // Trigger background sync to local database
    triggerSync(user);

    // Determine if face verification is required
    const isFaceAuthEnabled = settings ? settings.face_auth_enabled !== false : true;
    const requiresFace = isFaceAuthEnabled && !user.skip_face && user.face_embeddings && user.face_embeddings.length > 0;

    if (!requiresFace) {
      // Direct login if no face data registered
      await autoPunchInForUser(user, location);
      const access_token = generateToken(user._id, user.role);
      const refresh_token = generateRefreshToken(user._id, user.role);
      return res.status(200).json({
        status: true,
        access_token,
        refresh_token,
        user_id: user._id,
        requires_face_verification: false
      });
    }

    // Issue limited pre-auth token — full tokens only after face verification
    const pre_auth_token = generatePreAuthToken(user._id);
    return res.status(200).json({
      status: true,
      pre_auth_token,
      user_id: user._id,
      requires_face_verification: true,
      message: 'Password verified. Face verification required.'
    });
  };

  try {
    return await _doLogin();
  } catch (error) {
    // ── Network error → reconnect to local DB and retry once ──────
    if (isDbNetworkError(error)) {
      console.warn('[LOGIN] Database network error detected — reconnecting to local DB and retrying...');
      try {
        await ensureConnection();
        return await _doLogin();
      } catch (retryError) {
        console.error('[LOGIN] Retry after reconnect also failed:', retryError.message);
        return res.status(503).json({ status: false, message: 'Database is temporarily unavailable. Please ensure local MongoDB is running.' });
      }
    }
    return safeError(res, error, 'Login');
  }
};

/**
 * Verify face (Step 2)
 */
export const verifyFace = async (req, res) => {
  const { user_id, face_image, challenge_frame, location, offlineMode } = req.body;
  try {
    // Enforce pre-auth token verification to protect against direct biometric verification bypass
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: false, message: 'Not authorized, no pre-authorization token provided' });
    }
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET_KEY || 'INSECURE-FALLBACK-CHANGE-ME';
    try {
      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
      if (decoded.type !== 'pre-auth' || decoded.id !== user_id) {
        return res.status(401).json({ status: false, message: 'Invalid or unauthorized pre-authorization token' });
      }
    } catch (err) {
      return res.status(401).json({ status: false, message: 'Pre-authorization session has expired. Please log in again.' });
    }

    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    if (isAccountLocked(user.email)) {
      return res.status(403).json({ status: false, message: 'Account is temporarily locked due to 5 failed biometric attempts. Please wait 15 minutes.' });
    }

    const settings = await SchoolSettings.findOne();
    const isLocationAuthEnabled = settings ? settings.location_auth_enabled !== false : true;
    const skipLocation = user.skip_location || !isLocationAuthEnabled || offlineMode === true;

    // GPS location check for face verify
    if (!skipLocation) {
      if (user.registeredLocation && location) {
        const distance = getDistance(
          user.registeredLocation.latitude,
          user.registeredLocation.longitude,
          location.latitude,
          location.longitude
        );
        if (distance > 100) {
          return res.status(403).json({
            status: false,
            detail: `Location mismatch: you are ${Math.round(distance)}m away from the registered location. Maximum allowed: 100m.`
          });
        }
      } else if (!user.registeredLocation && location) {
        user.registeredLocation = location;
        await user.save();
      } else if (!location) {
        return res.status(403).json({
          status: false,
          detail: 'Location is required for login. Please enable GPS/location services.'
        });
      }
    }

    try {
      // Extract live embedding
      const cliResult = await extractEmbedding(face_image, true);
      if (!cliResult.embedding) {
        recordFailedLogin(user.email);
        return res.status(400).json({ status: false, message: cliResult.reason });
      }

      // Compare with stored embeddings
      const compareResult = compareEmbeddings(cliResult.embedding, user.face_embeddings);
      if (!compareResult.isMatch) {
        recordFailedLogin(user.email);
        return res.status(400).json({ status: false, message: 'Face mismatch. Please scan again.' });
      }

      // Optionally check liveness with challenge frame
      if (challenge_frame) {
        if (face_image === challenge_frame) {
          recordFailedLogin(user.email);
          return res.status(400).json({ status: false, message: 'Liveness check failed: static duplicate frame detected.' });
        }
      }
      
      // Success! Clear failed login history
      clearFailedLogins(user.email);
    } catch (err) {
      logger.error('Face verification service error:', err);
      return res.status(500).json({
        status: false,
        message: `Face verification error: ${err.message}`
      });
    }

    // Issue tokens
    await autoPunchInForUser(user, location);
    const access_token = generateToken(user._id, user.role);
    const refresh_token = generateRefreshToken(user._id, user.role);

    return res.status(200).json({
      status: true,
      access_token,
      refresh_token,
      user_id: user._id,
      message: 'Verification successful'
    });
  } catch (error) {
    return safeError(res, error, 'Face verification');
  }
};

/**
 * Direct login via face (no password)
 */
export const faceLogin = async (req, res) => {
  const { user_id, face_image, location, challenge_frame, offlineMode } = req.body;
  try {
    const settings = await SchoolSettings.findOne();
    const isFaceAuthEnabled = settings ? settings.face_auth_enabled !== false : true;
    if (!isFaceAuthEnabled) {
      return res.status(403).json({ status: false, message: 'Face login is disabled at the school level.' });
    }

    // user_id can be email or ID
    let user = await User.findById(user_id).catch(() => null);
    if (!user) {
      user = await User.findOne({ email: user_id });
    }

    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    if (isAccountLocked(user.email)) {
      return res.status(403).json({ status: false, message: 'Account is temporarily locked due to 5 failed biometric attempts. Please wait 15 minutes.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ status: false, message: 'Account is disabled.' });
    }

    const isLocationAuthEnabled = settings ? settings.location_auth_enabled !== false : true;
    const skipLocation = user.skip_location || !isLocationAuthEnabled || offlineMode === true;

    // GPS location check for direct face login
    if (!skipLocation) {
      if (user.registeredLocation && location) {
        const distance = getDistance(
          user.registeredLocation.latitude,
          user.registeredLocation.longitude,
          location.latitude,
          location.longitude
        );
        if (distance > 500) {
          return res.status(403).json({
            status: false,
            detail: `Location mismatch: you are ${Math.round(distance)}m away from the registered location. Maximum allowed: 500m.`
          });
        }
      } else if (!user.registeredLocation && location) {
        user.registeredLocation = location;
        await user.save();
      } else if (!location) {
        return res.status(403).json({
          status: false,
          detail: 'Location is required for login. Please enable GPS/location services.'
        });
      }
    }

    if (!user.face_embeddings || user.face_embeddings.length === 0) {
      return res.status(400).json({ status: false, message: 'No registered face data found. Please sign in with password first.' });
    }

    try {
      // Extract live embedding
      const cliResult = await extractEmbedding(face_image, true);
      if (!cliResult.embedding) {
        recordFailedLogin(user.email);
        return res.status(400).json({ status: false, message: cliResult.reason });
      }

      // Compare
      const compareResult = compareEmbeddings(cliResult.embedding, user.face_embeddings);
      if (!compareResult.isMatch) {
        recordFailedLogin(user.email);
        return res.status(400).json({ status: false, message: 'Face verification failed' });
      }

      if (challenge_frame) {
        if (face_image === challenge_frame) {
          recordFailedLogin(user.email);
          return res.status(400).json({ status: false, message: 'Liveness check failed: static duplicate frame detected.' });
        }
      }
      
      // Success! Clear failed login history
      clearFailedLogins(user.email);
    } catch (err) {
      logger.error('Face login service error:', err);
      return res.status(500).json({
        status: false,
        message: `Face login error: ${err.message}`
      });
    }

    await autoPunchInForUser(user, location);
    const access_token = generateToken(user._id, user.role);
    const refresh_token = generateRefreshToken(user._id, user.role);

    return res.status(200).json({
      status: true,
      access_token,
      refresh_token,
      user_id: user._id,
      message: 'Welcome back!'
    });
  } catch (error) {
    return safeError(res, error, 'Face login');
  }
};

/**
 * Get profile details
 */
export const getProfile = async (req, res) => {
  const _doGetProfile = async () => {
    const user = await User.findById(req.user._id).select('-password_hash -face_embeddings');
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    let detail = {};
    if (user.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: user._id });
      if (teacher) {
        detail = {
          teacherId: teacher._id,
          employeeId: teacher.employeeId,
          qualification: teacher.qualification,
          experience: teacher.experience,
          status: teacher.status,
          qualificationsList: teacher.qualificationsList || [],
          experienceList: teacher.experienceList || []
        };
      }
    }

    // Determine admin privilege dynamically
    let isAdmin = user.role === 'admin' || user.role === 'principal';
    if (!isAdmin) {
      try {
        const { default: Role } = await import('../models/Role.js');
        const dynRole = await Role.findOne({ roleName: { $regex: new RegExp(`^${escapeRegex(user.role)}$`, 'i') } });
        if (dynRole && dynRole.grantAdminPrivilege) {
          isAdmin = true;
        }
      } catch (e) { /* ignore */ }
    }

    return res.status(200).json({
      status: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        isAdmin,
        ...detail
      }
    });
  };

  try {
    return await _doGetProfile();
  } catch (error) {
    if (isDbNetworkError(error)) {
      console.warn('[PROFILE] Database network error — reconnecting to local DB and retrying...');
      try {
        await ensureConnection();
        return await _doGetProfile();
      } catch (retryError) {
        console.error('[PROFILE] Retry after reconnect also failed:', retryError.message);
        return res.status(503).json({ status: false, message: 'Database is temporarily unavailable.' });
      }
    }
    return safeError(res, error, 'getProfile');
  }
};

/**
 * Logout user
 */
export const logout = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    blacklistToken(token);
  }
  auditLog('LOGOUT', { userId: req.user?._id });
  return res.status(200).json({ status: true, message: 'Logged out successfully' });
};

/**
 * Geocode - reverse geocode lat/lng to address
 */
export const geocode = async (req, res) => {
  const { latitude, longitude } = req.body;
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (apiKey && apiKey !== 'your_google_maps_api_key_here') {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      );
      const data = await response.json();
      if (data && data.status === 'OK' && data.results && data.results.length > 0) {
        const resultItem = data.results[0];
        const components = resultItem.address_components || [];
        let road = '';
        let area = '';
        let city = '';
        let state = '';
        let country = '';
        let pincode = '';
        
        for (const comp of components) {
          if (comp.types.includes('route')) {
            road = comp.long_name;
          } else if (
            comp.types.includes('sublocality') ||
            comp.types.includes('neighborhood') ||
            comp.types.includes('sublocality_level_1')
          ) {
            area = comp.long_name;
          } else if (comp.types.includes('locality')) {
            city = comp.long_name;
          } else if (comp.types.includes('administrative_area_level_1')) {
            state = comp.long_name;
          } else if (comp.types.includes('country')) {
            country = comp.long_name;
          } else if (comp.types.includes('postal_code')) {
            pincode = comp.long_name;
          }
        }

        if (!area) {
          const sublocality = components.find((c) => c.types.includes('sublocality'));
          if (sublocality) area = sublocality.long_name;
        }

        return res.status(200).json({
          status: true,
          data: {
            road,
            area,
            city,
            state,
            country,
            pincode,
            display_name: resultItem.formatted_address || ''
          }
        });
      }
    }

    // Fallback: OpenStreetMap Nominatim
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'FaceAuthSchoolSystem/1.0 (schoolattendance@example.com)'
        }
      }
    );
    const data = await response.json();
    
    if (data && data.address) {
      const address = data.address;
      const road = address.road || address.pedestrian || address.highway || '';
      const area = address.suburb || address.neighbourhood || address.residential || '';
      const city = address.city || address.town || address.village || address.county || '';
      const state = address.state || '';
      const country = address.country || '';
      const pincode = address.postcode || '';

      return res.status(200).json({
        status: true,
        data: {
          road,
          area,
          city,
          state,
          country,
          pincode,
          display_name: data.display_name || ''
        }
      });
    }

    return res.status(200).json({
      status: true,
      data: {
        display_name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      }
    });
  } catch (error) {
    return res.status(200).json({
      status: true,
      data: {
        display_name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      }
    });
  }
};

export const updateTeacherProfileSelf = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) {
      return res.status(404).json({ status: false, message: 'Teacher profile not found' });
    }

    const { name, email, phone, qualificationsList, experienceList, qualification, experience } = req.body;

    // Update User login details if provided
    const user = await User.findById(req.user._id);
    if (user) {
      if (name) user.name = name;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      await user.save();
    }

    // Update Teacher profile details
    if (name) teacher.name = name;
    if (email) teacher.email = email;
    if (phone) teacher.phone = phone;
    
    // Support flat updates
    if (qualification !== undefined) teacher.qualification = qualification;
    if (experience !== undefined) teacher.experience = experience;
    
    // Support array list updates (Add, Edit, Delete qualifications and experiences)
    if (qualificationsList !== undefined) {
      teacher.qualificationsList = qualificationsList;
      // Keep flat qualification in sync as comma-separated
      if (qualificationsList.length > 0) {
        teacher.qualification = qualificationsList.map(q => `${q.degree} from ${q.institution}`).join(', ');
      } else {
        teacher.qualification = 'N/A';
      }
    }
    
    if (experienceList !== undefined) {
      teacher.experienceList = experienceList;
    }

    await teacher.save();

    return res.status(200).json({
      status: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        employeeId: teacher.employeeId,
        qualification: teacher.qualification,
        experience: teacher.experience,
        status: teacher.status,
        qualificationsList: teacher.qualificationsList || [],
        experienceList: teacher.experienceList || []
      }
    });
  } catch (error) {
    return safeError(res, error, 'updateTeacherProfile');
  }
};
