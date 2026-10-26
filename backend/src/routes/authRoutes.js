import express from 'express';
import multer from 'multer';
import {
  checkUser,
  register,
  login,
  verifyFace,
  faceLogin,
  getProfile,
  logout,
  geocode,
  updateTeacherProfileSelf
} from '../controllers/authController.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import {
  getAttendanceLogs,
  punchIn,
  punchOut,
  verifyLogout,
  getDailyStatus,
  getConsolidatedReport,
  getDetailsReport,
  updateAttendanceStatus,
} from '../controllers/attendanceController.js';
import {
  getFaculty,
  updateFacultySettings,
  deleteFaculty,
  resetFacultyPassword,
  uploadDocument,
  downloadDocument
} from '../controllers/facultyController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Core Auth
router.post('/check-user', checkUser);
router.post('/register', register);
router.post('/login', login);
router.post('/verify-face', verifyFace);
router.post('/face-login', faceLogin);
router.get('/profile', protect, getProfile);
router.put('/teacher/profile', protect, updateTeacherProfileSelf);
router.post('/logout', protect, logout);
router.post('/geocode', protect, geocode);

// Wake up/Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', database: 'connected', detail: 'All services are operational' });
});

// Settings Bridge
router.get('/settings', protect, getSettings);
router.post('/settings', protect, authorize('admin', 'principal'), updateSettings);

// Attendance Logs & Status Bridge
router.get('/attendance', protect, getAttendanceLogs);
router.post('/attendance/punch-in', protect, punchIn);
router.post('/attendance/punch-out', protect, punchOut);
router.post('/attendance/verify-logout', protect, verifyLogout);
router.get('/attendance/daily-status', protect, getDailyStatus);
router.get('/attendance/report/consolidated', protect, getConsolidatedReport);
router.get('/attendance/report/details', protect, getDetailsReport);
router.post('/attendance/update-status', protect, updateAttendanceStatus);

// Faculty Management Bridge
router.get('/admin/employees', protect, getFaculty);
router.put('/admin/employee/:id/settings', protect, authorize('admin', 'principal'), updateFacultySettings);
router.delete('/admin/employee/:id', protect, authorize('admin', 'principal'), deleteFaculty);
router.post('/admin/employee/:id/reset-password', protect, authorize('admin', 'principal'), resetFacultyPassword);
router.post('/admin/employee/:id/upload-document', protect, authorize('admin', 'principal'), upload.single('file'), uploadDocument);
router.get('/admin/employee/:id/download-document/:filename', protect, downloadDocument);

export default router;
