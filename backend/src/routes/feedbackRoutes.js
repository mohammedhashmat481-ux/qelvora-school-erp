import express from 'express';
import { submitFeedback, updateFeedback, deleteFeedback, getTeacherFeedbackAnalytics, getAdminFeedbackAll, getVideoFeedback } from '../controllers/feedbackController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, submitFeedback);
router.put('/:id', protect, updateFeedback);
router.delete('/:id', protect, deleteFeedback);
router.get('/video/:videoId', protect, getVideoFeedback);
router.get('/teacher/analytics', protect, authorize('teacher', 'admin', 'principal'), getTeacherFeedbackAnalytics);
router.get('/admin/all', protect, authorize('admin'), getAdminFeedbackAll);

export default router;
