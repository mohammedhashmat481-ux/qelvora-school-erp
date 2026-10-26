import express from 'express';
import multer from 'multer';
import { getVideos, streamVideo, uploadVideo, deleteVideo, approveVideo } from '../controllers/videoController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/', protect, getVideos);
router.get('/stream/:filename', protect, streamVideo);
router.post('/', protect, authorize('admin'), upload.single('file'), uploadVideo);
router.delete('/:id', protect, authorize('admin'), deleteVideo);
router.put('/:id/approve', protect, authorize('admin'), approveVideo);

export default router;
