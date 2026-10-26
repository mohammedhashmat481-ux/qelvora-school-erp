import ClassroomVideo from '../models/ClassroomVideo.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import fs from 'fs';
import path from 'path';
import { safeError, auditLog } from '../utils/security.js';

/**
 * Get videos filtered by student class/section (for student/parent accounts)
 * or return all videos (for admin/teachers)
 */
export const getVideos = async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase();
    
    // Enforce class-level filtering for students and parents
    if (userRole === 'student') {
      const student = await Student.findOne({ user: req.user._id });
      if (!student) {
        return res.status(404).json({ status: false, message: 'Student profile not found for this user account' });
      }

      // Retrieve only approved videos matching the student's standard and section
      const videos = await ClassroomVideo.find({
        standard: student.standard,
        section: student.section,
        status: 'Approved'
      }).sort({ uploadDate: -1 });

      return res.status(200).json({ status: true, data: videos });
    }

    // Teachers and Admins can see all videos
    const videos = await ClassroomVideo.find().sort({ uploadDate: -1 });
    return res.status(200).json({ status: true, data: videos });
  } catch (error) {
    return safeError(res, error, 'GetVideos');
  }
};

/**
 * Stream video file using Express native sendFile (handles Range requests automatically)
 */
export const streamVideo = async (req, res) => {
  const { filename } = req.params;
  try {
    const uploadsDir = path.resolve('uploads');
    const safeName = path.basename(filename);
    const filePath = path.join(uploadsDir, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: false, message: 'Video file not found' });
    }

    // res.sendFile automatically handles HTTP Range headers required for streaming & scrubbing
    return res.sendFile(filePath);
  } catch (error) {
    return safeError(res, error, 'StreamVideo');
  }
};

/**
 * Upload new classroom demo video (Admin only)
 */
export const uploadVideo = async (req, res) => {
  // Multer handles file parsing
  if (!req.file) {
    return res.status(400).json({ status: false, message: 'No video file uploaded' });
  }

  // Validate file type (MP4/WebM)
  const allowedExtensions = /\.(mp4|webm|m4v)$/i;
  if (!allowedExtensions.test(req.file.originalname)) {
    try { fs.unlinkSync(req.file.path); } catch (e) {}
    return res.status(400).json({ status: false, message: 'Invalid video format. Allowed: mp4, webm, m4v' });
  }

  const { title, subject, teacherId, standard, section, description, duration } = req.body;
  try {
    if (!title || !subject || !teacherId || !standard || !section) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ status: false, message: 'Missing required metadata: title, subject, teacherId, standard, section' });
    }

    // Lookup teacher name
    const teacher = await Teacher.findOne({ employeeId: teacherId });
    const teacherName = teacher ? teacher.name : 'Unknown Teacher';

    const video = await ClassroomVideo.create({
      title,
      subject,
      teacher: teacher ? teacher._id : undefined,
      teacherName,
      teacherId,
      standard,
      section,
      description: description || '',
      duration: duration || '45:00',
      videoUrl: req.file.filename,
      status: 'Approved' // Auto-approve demo uploads
    });

    auditLog('VIDEO_UPLOADED', { videoId: video._id, title, standard, section, uploadedBy: req.user?._id });

    return res.status(201).json({
      status: true,
      message: 'Classroom video uploaded successfully',
      data: video
    });
  } catch (error) {
    try { fs.unlinkSync(req.file.path); } catch (e) {}
    return safeError(res, error, 'UploadVideo');
  }
};

/**
 * Delete a video (Admin only)
 */
export const deleteVideo = async (req, res) => {
  const { id } = req.params;
  try {
    const video = await ClassroomVideo.findById(id);
    if (!video) {
      return res.status(404).json({ status: false, message: 'Video not found' });
    }

    // Delete physical file from disk
    const filePath = path.join(path.resolve('uploads'), video.videoUrl);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Failed to delete video file ${filePath}:`, err.message);
      }
    }

    await ClassroomVideo.findByIdAndDelete(id);
    auditLog('VIDEO_DELETED', { videoId: id, title: video.title, deletedBy: req.user?._id });

    return res.status(200).json({ status: true, message: 'Video deleted successfully' });
  } catch (error) {
    return safeError(res, error, 'DeleteVideo');
  }
};

/**
 * Approve / Reject video recording status (Admin only)
 */
export const approveVideo = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Approved' | 'Pending'
  try {
    if (!['Approved', 'Pending'].includes(status)) {
      return res.status(400).json({ status: false, message: 'Invalid status. Must be Approved or Pending' });
    }

    const video = await ClassroomVideo.findByIdAndUpdate(id, { status }, { new: true });
    if (!video) {
      return res.status(404).json({ status: false, message: 'Video not found' });
    }

    auditLog('VIDEO_STATUS_UPDATED', { videoId: id, status, updatedBy: req.user?._id });
    return res.status(200).json({ status: true, message: `Video status updated to ${status}`, data: video });
  } catch (error) {
    return safeError(res, error, 'ApproveVideo');
  }
};
