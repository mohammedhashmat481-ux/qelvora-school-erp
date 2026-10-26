import express from 'express';
import {
  getAttendanceLogs,
  punchIn,
  punchOut,
  verifyLogout,
  getDailyStatus,
  getConsolidatedReport,
  getDetailsReport,
  updateAttendanceStatus,
  getStudentAttendance,
  markStudentAttendance,
  classLogin,
  classLogout,
  getClassSessions
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Punch In / Out requires authentication
router.post('/punch-in', protect, punchIn);
router.post('/punch-out', protect, punchOut);
router.post('/verify-logout', protect, verifyLogout);

// Authenticated reporting and student logs
router.get('/', protect, getAttendanceLogs);
router.get('/daily-status', protect, getDailyStatus);
router.get('/report/consolidated', protect, getConsolidatedReport);
router.get('/report/details', protect, getDetailsReport);
router.post('/update-status', protect, updateAttendanceStatus);
router.get('/students', protect, getStudentAttendance);
router.post('/students', protect, markStudentAttendance);

// Class Login/Logout
router.post('/class-login', protect, classLogin);
router.post('/class-logout', protect, classLogout);
router.get('/class-sessions', protect, getClassSessions);

export default router;
