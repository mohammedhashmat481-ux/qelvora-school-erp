import express from 'express';
import { getTeacherDashboard, getAdminDashboard, getConsolidatedStats, getIndividualStats } from '../controllers/dashboardController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/teacher', protect, authorize('admin', 'principal', 'hod', 'teacher'), getTeacherDashboard);
router.get('/admin', protect, authorize('admin', 'principal', 'hod'), getAdminDashboard);
router.get('/consolidated-stats', protect, authorize('admin', 'principal', 'hod'), getConsolidatedStats);
router.get('/individual-stats/:teacherId', protect, authorize('admin', 'principal', 'hod'), getIndividualStats);

export default router;
