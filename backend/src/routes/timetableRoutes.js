import express from 'express';
import { getTimetables, createTimetableEntry, deleteTimetableEntry, createTeacherSchedule, saveTeacherTimetableBulk } from '../controllers/timetableController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getTimetables);
router.post('/', protect, authorize('admin', 'principal'), createTimetableEntry);
router.post('/bulk', protect, authorize('admin', 'principal'), saveTeacherTimetableBulk);
router.post('/teacher-schedule', protect, authorize('admin', 'principal', 'teacher'), createTeacherSchedule);
router.delete('/:id', protect, authorize('admin', 'principal'), deleteTimetableEntry);

export default router;
