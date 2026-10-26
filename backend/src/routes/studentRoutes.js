import express from 'express';
import { addStudent, getStudentMe, getStudents } from '../controllers/studentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, authorize('admin'), addStudent);
router.get('/me', protect, getStudentMe);
router.get('/', protect, authorize('admin'), getStudents);

export default router;
