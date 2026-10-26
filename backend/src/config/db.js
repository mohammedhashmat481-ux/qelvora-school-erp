import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const seedDefaultRoles = async () => {
  try {
    const Role = (await import('../models/Role.js')).default;
    const count = await Role.countDocuments();
    if (count === 0) {
      const defaults = [
        { roleCode: 'ROLE-00001', roleName: 'Teacher', grantAdminPrivilege: false, createdBy: 'System' },
        { roleCode: 'ROLE-00002', roleName: 'Staff', grantAdminPrivilege: false, createdBy: 'System' },
        { roleCode: 'ROLE-00003', roleName: 'HOD', grantAdminPrivilege: true, createdBy: 'System' },
        { roleCode: 'ROLE-00004', roleName: 'Principal', grantAdminPrivilege: true, createdBy: 'System' }
      ];
      await Role.insertMany(defaults);
      console.log('Default roles seeded successfully');
    }
  } catch (error) {
    console.error('Role seeding error:', error.message);
  }
};

const seedAdminUser = async () => {
  try {
    const User = (await import('../models/User.js')).default;
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
      console.log('[Seed] ADMIN_EMAIL and ADMIN_PASSWORD not set. Skipping admin seeding.');
      return;
    }
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      await User.create({
        name: 'Admin',
        email,
        password_hash: password,
        role: 'admin',
        isActive: true
      });
      console.log(`Admin user ${email} seeded successfully`);
    } else {
      console.log(`Admin user ${email} already exists. Skipping.`);
    }
  } catch (error) {
    console.error('Admin user seeding error:', error.message);
  }
};

const seedStudentUser = async () => {
  try {
    const User = (await import('../models/User.js')).default;
    const Student = (await import('../models/Student.js')).default;

    // 1. Seed default student
    const defaultEmail = 'student@school.com';
    const defaultPassword = 'Welcome@123';
    const existingDefault = await User.findOne({ email: defaultEmail });
    if (!existingDefault) {
      const user = await User.create({
        name: 'Rahul Student',
        email: defaultEmail,
        password_hash: defaultPassword,
        role: 'student',
        isActive: true,
        skip_face: true,
        skip_location: true
      });

      await Student.create({
        user: user._id,
        studentId: 'STU-000001',
        name: 'Rahul Student',
        email: defaultEmail,
        phone: '9876543210',
        standard: '5th',
        section: 'A',
        rollNumber: '24',
        parentName: 'Mr. & Mrs. Sharma',
        parentPhone: '9876543211'
      });
      console.log('Default student user & profile seeded successfully');
    }

    // 2. Seed vardhansk@gmail.com for offline fallback
    const vardhanEmail = 'vardhansk@gmail.com';
    const vardhanPassword = 'Vardhan@2005';
    const existingVardhan = await User.findOne({ email: vardhanEmail });
    if (!existingVardhan) {
      const user = await User.create({
        name: 'Vardhan SK',
        email: vardhanEmail,
        password_hash: vardhanPassword,
        role: 'student',
        isActive: true,
        skip_face: true,
        skip_location: true
      });

      await Student.create({
        user: user._id,
        studentId: 'STU-000002',
        name: 'Vardhan SK',
        email: vardhanEmail,
        phone: '9876543212',
        standard: '5th',
        section: 'A',
        rollNumber: '25',
        parentName: 'Mr. & Mrs. SK',
        parentPhone: '9876543213'
      });
      console.log('Vardhan student user & profile seeded successfully locally');
    }
  } catch (error) {
    console.error('Student user seeding error:', error.message);
  }
};

const seedDefaultVideos = async () => {
  try {
    const ClassroomVideo = (await import('../models/ClassroomVideo.js')).default;
    const count = await ClassroomVideo.countDocuments();
    if (count === 0) {
      const defaults = [
        {
          title: 'Lec 1, Introduction to Data Analytics',
          subject: 'Data Analytics with Python',
          teacherName: 'Prof. A. Ramesh',
          teacherId: 'EMP-00123',
          standard: '10th',
          section: 'A',
          duration: '45:00',
          description: 'NPTEL lecture 1: Introduction to Data Analytics with Python. This video serves as a demo for parents and teachers to evaluate teaching quality, interactiveness, and overall student progress.',
          videoUrl: 'https://www.youtube.com/watch?v=0GshjM9o1G0',
          status: 'Approved'
        },
        {
          title: 'Introduction to Fractions',
          subject: 'Mathematics',
          teacherName: 'Vandana Sharma',
          teacherId: 'EMP-00456',
          standard: '5th',
          section: 'A',
          duration: '20:00',
          description: 'Demo classroom lecture explaining fractions with interactive visual diagrams.',
          videoUrl: 'https://www.youtube.com/watch?v=0GshjM9o1G0',
          status: 'Approved'
        }
      ];
      await ClassroomVideo.insertMany(defaults);
      console.log('Default demo videos seeded successfully');
    }
  } catch (error) {
    console.error('Video seeding error:', error.message);
  }
};

const seedDefaultReviews = async () => {
  try {
    const ClassroomVideo = (await import('../models/ClassroomVideo.js')).default;
    const TeacherFeedback = (await import('../models/TeacherFeedback.js')).default;
    const User = (await import('../models/User.js')).default;

    let video = await ClassroomVideo.findOne({ title: 'Lec 1, Introduction to Data Analytics' });
    if (!video) {
      video = await ClassroomVideo.findOne() || await ClassroomVideo.create({
        title: 'Lec 1, Introduction to Data Analytics',
        subject: 'Data Analytics',
        standard: '10th',
        section: 'A',
        teacherId: 'EMP-00123',
        teacherName: 'Prof. A. Ramesh',
        videoUrl: '/uploads/dummy.mp4',
        duration: '45:00'
      });
    }

    const reviewCount = await TeacherFeedback.countDocuments({ videoId: video._id });
    if (reviewCount === 0) {
      // Find or create dummy student users so unique index doesn't conflict
      const student1 = await User.findOne({ email: 'student1@school.com' }) || await User.create({
        name: 'Mahesh Angadageri',
        email: 'student1@school.com',
        password_hash: 'Welcome@123',
        role: 'student',
        isActive: true,
        skip_face: true,
        skip_location: true
      });

      const student2 = await User.findOne({ email: 'student2@school.com' }) || await User.create({
        name: 'K MOHTASHIM JAMAL',
        email: 'student2@school.com',
        password_hash: 'Welcome@123',
        role: 'student',
        isActive: true,
        skip_face: true,
        skip_location: true
      });

      const student3 = await User.findOne({ email: 'student3@school.com' }) || await User.create({
        name: 'Nived M Nair',
        email: 'student3@school.com',
        password_hash: 'Welcome@123',
        role: 'student',
        isActive: true,
        skip_face: true,
        skip_location: true
      });

      const reviews = [
        {
          student: student1._id,
          studentName: 'Mahesh Angadageri',
          teacherId: video.teacherId,
          teacherName: video.teacherName,
          videoId: video._id,
          rating: 4,
          suggestion: 'Unit 6 lecture 1 not showing progress',
          submittedBy: 'parent',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          student: student2._id,
          studentName: 'K MOHTASHIM JAMAL',
          teacherId: video.teacherId,
          teacherName: video.teacherName,
          videoId: video._id,
          rating: 2,
          suggestion: 'Is the slots available now?',
          submittedBy: 'parent',
          date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) // 3 weeks ago
        },
        {
          student: student3._id,
          studentName: 'Nived M Nair',
          teacherId: video.teacherId,
          teacherName: video.teacherName,
          videoId: video._id,
          rating: 1,
          suggestion: 'not evn ging to 5% wht is this not able to book dates as well',
          submittedBy: 'parent',
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 1 month ago
        }
      ];

      await TeacherFeedback.insertMany(reviews);
      console.log('Default course reviews seeded successfully');
    }
  } catch (error) {
    console.error('Review seeding error:', error.message);
  }
};

// ─── Connection state tracking ───────────────────────────────────────
let _usingLocal = false;
let _switchPromise = null;     // if non-null, a switch is in progress
const LOCAL_URL = 'mongodb://127.0.0.1:27017/qelvora_school_crm_db';

const _runSeeds = async () => {
  await seedDefaultRoles();
  await seedAdminUser();
  await seedStudentUser();
  await seedDefaultVideos();
  await seedDefaultReviews();
};

/**
 * Disconnect from current DB and reconnect to local MongoDB.
 * Returns a promise that resolves once local is connected (or rejects on failure).
 * De-duplicated: concurrent callers share the same promise.
 */
const _switchToLocal = (dbName) => {
  if (_usingLocal) return Promise.resolve();
  if (_switchPromise) return _switchPromise;   // already in progress — piggyback

  _switchPromise = (async () => {
    console.warn('[DB] Switching to local MongoDB...');

    // Remove all mongoose listeners temporarily to avoid re-entrant calls
    mongoose.connection.removeAllListeners('disconnected');
    mongoose.connection.removeAllListeners('error');

    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch (_) {
      // Ignore — connection may already be dead
    }

    // Connect to local
    await mongoose.connect(LOCAL_URL, {
      dbName,
      serverSelectionTimeoutMS: 3000
    });
    _usingLocal = true;
    console.log(`[DB] MongoDB Reconnected (LOCAL): ${mongoose.connection.host}`);
    await _runSeeds();
  })()
    .catch(err => {
      console.error(`[DB] Local fallback reconnection failed: ${err.message}`);
      throw err;        // propagate so callers know it failed
    })
    .finally(() => {
      _switchPromise = null;   // allow future retries
    });

  return _switchPromise;
};

/**
 * Returns true if the given error looks like a MongoDB network / DNS failure.
 */
export const isDbNetworkError = (error) => {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    error.name === 'MongoNetworkError' ||
    error.name === 'MongoServerSelectionError' ||
    error.name === 'MongoTopologyClosedError' ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('topology was destroyed') ||
    msg.includes('topology is closed') ||
    msg.includes('server selection timed out') ||
    msg.includes('connect econnrefused') ||
    msg.includes('client must be connected')
  );
};

/**
 * Ensures we have a live database connection.
 * If Atlas died mid-session, this function will switch to the local DB.
 * If a switch is already in progress, it waits for that switch to complete.
 */
/**
 * Ensures we have a live database connection.
 * If Atlas died mid-session, this function will switch to the local DB.
 * If a switch is already in progress, it waits for that switch to complete.
 */
export const ensureConnection = async () => {
  // If a switch is already running, just wait for it
  if (_switchPromise) {
    await _switchPromise;
    return;
  }
  const dbName = process.env.MONGODB_DB_NAME || 'qelvora_school_crm_db';
  const state = mongoose.connection.readyState;
  // 0 = disconnected, 3 = disconnecting
  if (state === 0 || state === 3 || (!_usingLocal && state !== 1)) {
    await _switchToLocal(dbName);
  }
};

/**
 * Returns true if the server is currently using the local database fallback.
 */
export const isUsingLocal = () => _usingLocal;

/**
 * Forces the server to immediately disconnect from Atlas and switch to the local MongoDB database.
 * Used for instant login when offlineMode: true is requested by the client.
 */
export const forceLocalConnection = async () => {
  const dbName = process.env.MONGODB_DB_NAME || 'qelvora_school_crm_db';
  if (!_usingLocal) {
    console.log('[DB] Offline Mode requested: forcing local connection switchover...');
    await _switchToLocal(dbName);
  }
};

/**
 * Synchronizes user credentials and their profile details from the cloud MongoDB database
 * to the local MongoDB database so they are available offline.
 */
export const syncToLocal = async (userDoc, profileType = null, profileDoc = null) => {
  if (_usingLocal) return; // Already running on local database, no need to sync
  
  let client;
  try {
    const { MongoClient } = mongoose.mongo;
    client = new MongoClient(LOCAL_URL, { serverSelectionTimeoutMS: 2000 });
    await client.connect();
    const db = client.db('qelvora_school_crm_db');

    // 1. Sync User
    const userObj = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
    delete userObj.__v;
    await db.collection('users').updateOne(
      { _id: userObj._id },
      { $set: userObj },
      { upsert: true }
    );
    console.log(`[SYNC-LOCAL] Synchronized user credentials for ${userObj.email} to local DB.`);

    // 2. Sync Profile if provided
    if (profileType && profileDoc) {
      const profObj = profileDoc.toObject ? profileDoc.toObject() : { ...profileDoc };
      delete profObj.__v;
      
      let collectionName = '';
      const normType = profileType.toLowerCase();
      if (normType === 'teacher') collectionName = 'teachers';
      else if (normType === 'student') collectionName = 'students';
      else if (normType === 'staff' || normType === 'nonteachingstaff') collectionName = 'nonteachingstaffs';

      if (collectionName) {
        await db.collection(collectionName).updateOne(
          { _id: profObj._id },
          { $set: profObj },
          { upsert: true }
        );
        console.log(`[SYNC-LOCAL] Synchronized ${profileType} profile to local DB.`);
      }
    }

    // 3. Sync associated Role
    if (userDoc.role) {
      try {
        const Role = mongoose.model('Role');
        const roleDoc = await Role.findOne({ roleName: { $regex: new RegExp(`^${escapeRegex(userDoc.role)}$`, 'i') } });
        if (roleDoc) {
          const roleObj = roleDoc.toObject();
          delete roleObj.__v;
          await db.collection('roles').updateOne(
            { _id: roleObj._id },
            { $set: roleObj },
            { upsert: true }
          );
        }
      } catch (roleErr) {
        // Safe to ignore role sync error
      }
    }

    // 4. Sync Feedbacks from Atlas
    try {
      const TeacherFeedback = mongoose.model('TeacherFeedback');
      const feedbacks = await TeacherFeedback.find({}).lean();
      if (feedbacks.length > 0) {
        for (const f of feedbacks) {
          const fObj = { ...f };
          delete fObj.__v;
          await db.collection('teacherfeedbacks').updateOne(
            { _id: fObj._id },
            { $set: fObj },
            { upsert: true }
          );
        }
        console.log(`[SYNC-LOCAL] Synchronized ${feedbacks.length} feedbacks to local DB.`);
      }
    } catch (feedErr) {
      console.warn('[SYNC-LOCAL] Failed to sync feedbacks to local DB:', feedErr.message);
    }
  } catch (err) {
    console.warn('[SYNC-LOCAL] Failed to sync credentials to local database:', err.message);
  } finally {
    if (client) {
      try { await client.close(); } catch (_) {}
    }
  }
};

// Helper for escapeRegex since we need it for Role matching
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};


const connectDB = async () => {
  const primaryUrl = process.env.MONGODB_URL;
  const dbName = process.env.MONGODB_DB_NAME || 'qelvora_school_crm_db';

  // ── Set up one-shot monitor for Atlas → local switchover ──────────
  const _attachAtlasMonitor = () => {
    mongoose.connection.on('disconnected', () => {
      if (!_usingLocal && !_switchPromise) {
        console.warn('[DB] Primary database connection lost (disconnected event).');
        _switchToLocal(dbName);
      }
    });
  };

  // ── Initial connection ────────────────────────────────────────────
  try {
    console.log('Connecting to database...');
    const conn = await mongoose.connect(primaryUrl || LOCAL_URL, {
      dbName,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 5000   // detect Atlas death within 5 s
    });
    const host = conn.connection.host;
    console.log(`MongoDB Connected: ${host}`);
    if (host === '127.0.0.1' || host === 'localhost') {
      _usingLocal = true;
    } else {
      _attachAtlasMonitor();       // only monitor if connected to Atlas
    }
    await _runSeeds();
  } catch (error) {
    console.warn(`Primary database connection failed: ${error.message}`);
    console.log(`Attempting fallback to local database: ${LOCAL_URL}...`);
    try {
      const localConn = await mongoose.connect(LOCAL_URL, {
        dbName,
        serverSelectionTimeoutMS: 3000
      });
      _usingLocal = true;
      console.log(`MongoDB Connected (LOCAL FALLBACK): ${localConn.connection.host}`);
      await _runSeeds();
    } catch (localError) {
      console.error(`Local database fallback also failed: ${localError.message}`);
      console.warn('[Warning] Database connection failed. The server will continue to run, but database features will be unavailable.');
    }
  }
};

export default connectDB;

