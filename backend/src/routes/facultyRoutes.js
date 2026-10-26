import express from 'express';
import multer from 'multer';
import {
  getFaculty,
  addTeacher,
  addNonTeachingStaff,
  updateFacultySettings,
  resetFacultyPassword,
  deleteFaculty,
  uploadDocument,
  downloadDocument
} from '../controllers/facultyController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/', protect, getFaculty);
router.post('/teacher', protect, authorize('admin', 'principal'), addTeacher);
router.post('/non-teaching', protect, authorize('admin', 'principal'), addNonTeachingStaff);
router.put('/employee/:id/settings', protect, authorize('admin', 'principal'), updateFacultySettings);
router.post('/employee/:id/reset-password', protect, authorize('admin', 'principal'), resetFacultyPassword);
router.delete('/employee/:id', protect, authorize('admin', 'principal'), deleteFaculty);

router.post('/employee/:id/upload-document', protect, authorize('admin', 'principal'), upload.single('file'), uploadDocument);
router.get('/employee/:id/download-document/:filename', protect, downloadDocument);

export default router;
