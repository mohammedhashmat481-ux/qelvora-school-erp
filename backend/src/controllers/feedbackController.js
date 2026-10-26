import TeacherFeedback from '../models/TeacherFeedback.js';
import ClassroomVideo from '../models/ClassroomVideo.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';
import { safeError, auditLog, escapeRegex } from '../utils/security.js';

/**
 * Helper to check parent profile permission on endpoints
 */
const checkParentProfile = (req, res) => {
  return true;
};

/**
 * Submit rating and suggestion (Parent only)
 */
export const submitFeedback = async (req, res) => {
  if (!checkParentProfile(req, res)) return;

  const { videoId, rating, suggestion } = req.body;
  try {
    if (!videoId || !rating) {
      return res.status(400).json({ status: false, message: 'Missing required fields: videoId, rating' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ status: false, message: 'Rating must be an integer between 1 and 5' });
    }

    // Lookup video metadata
    const video = await ClassroomVideo.findById(videoId);
    if (!video) {
      return res.status(404).json({ status: false, message: 'Video not found' });
    }

    // Lookup student profile for name mapping
    const student = await Student.findOne({ user: req.user._id });
    const studentName = student ? student.name : req.user.name || 'Student';

    const feedback = await TeacherFeedback.create({
      student: req.user._id,
      studentName,
      teacherId: video.teacherId,
      teacherName: video.teacherName,
      videoId,
      rating: Number(rating),
      suggestion: suggestion || '',
      submittedBy: 'parent'
    });

    auditLog('FEEDBACK_SUBMITTED', { feedbackId: feedback._id, teacherId: video.teacherId, rating });

    return res.status(201).json({
      status: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });
  } catch (error) {
    return safeError(res, error, 'SubmitFeedback');
  }
};

/**
 * Update existing rating/suggestion (Parent only)
 */
export const updateFeedback = async (req, res) => {
  if (!checkParentProfile(req, res)) return;

  const { id } = req.params;
  const { rating, suggestion } = req.body;
  try {
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ status: false, message: 'Rating must be an integer between 1 and 5' });
    }

    const feedback = await TeacherFeedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ status: false, message: 'Feedback not found' });
    }

    // Check ownership
    if (feedback.student.toString() !== req.user._id.toString()) {
      return res.status(453).json({ status: false, message: 'Unauthorized to edit this feedback' });
    }

    if (rating) feedback.rating = Number(rating);
    if (suggestion !== undefined) feedback.suggestion = suggestion;
    await feedback.save();

    auditLog('FEEDBACK_UPDATED', { feedbackId: id, updatedBy: req.user._id });

    return res.status(200).json({
      status: true,
      message: 'Feedback updated successfully',
      data: feedback
    });
  } catch (error) {
    return safeError(res, error, 'UpdateFeedback');
  }
};

/**
 * Get feedback statistics and suggestions list for the logged-in teacher
 */
export const getTeacherFeedbackAnalytics = async (req, res) => {
  try {
    let teacherId = null;
    let teacherName = 'Teacher';

    // Lookup teacher profile
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (teacher) {
      teacherId = teacher.employeeId;
      teacherName = teacher.name;
    } else if (req.user.role?.toLowerCase() === 'admin' || req.user.role?.toLowerCase() === 'principal') {
      const firstTeacher = await Teacher.findOne();
      if (firstTeacher) {
        teacherId = firstTeacher.employeeId;
        teacherName = firstTeacher.name;
      }
    }

    if (!teacherId) {
      return res.status(200).json({
        status: true,
        data: {
          teacherName: 'No Teacher Profile',
          averageRating: 0,
          totalReviews: 0,
          distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          positiveFeedback: [],
          suggestionsForImprovement: [],
          recentReviews: []
        }
      });
    }

    // Find feedbacks matching by teacherId OR by teacherName (matching the given name, e.g. "Ramesh")
    const query = {
      $or: [
        { teacherId }
      ]
    };
    if (teacherName) {
      const clean = teacherName.replace(/^(prof|dr|mr|ms|mrs|teacher)\.?\s+/i, '');
      const parts = clean.split(/\s+/).filter(p => p.replace(/[^a-zA-Z]/g, '').length >= 3);
      if (parts.length > 0) {
        query.$or.push({ teacherName: new RegExp(escapeRegex(parts[0]), 'i') });
      }
    }

    const feedList = await TeacherFeedback.find(query).sort({ date: -1 });

    const totalReviews = feedList.length;
    let sumRating = 0;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    const positiveKeywords = ['excellent', 'great', 'good', 'clearly', 'perfect', 'love', 'happy', 'best', 'wonderful', 'helpful'];
    const positiveFeedback = [];
    const suggestionsForImprovement = [];

    feedList.forEach(f => {
      sumRating += f.rating;
      if (distribution[f.rating] !== undefined) {
        distribution[f.rating]++;
      }

      const comment = f.suggestion || '';
      if (comment.trim() !== '') {
        const isPos = positiveKeywords.some(keyword => comment.toLowerCase().includes(keyword)) || f.rating >= 4;
        if (isPos) {
          positiveFeedback.push({
            studentName: f.studentName,
            text: comment,
            rating: f.rating,
            date: f.date
          });
        } else {
          suggestionsForImprovement.push({
            studentName: f.studentName,
            text: comment,
            rating: f.rating,
            date: f.date
          });
        }
      }
    });

    const averageRating = totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(1)) : 0;

    return res.status(200).json({
      status: true,
      data: {
        teacherName,
        averageRating,
        totalReviews,
        distribution,
        positiveFeedback: positiveFeedback.slice(0, 10),
        suggestionsForImprovement: suggestionsForImprovement.slice(0, 10),
        recentReviews: feedList.slice(0, 15)
      }
    });
  } catch (error) {
    return safeError(res, error, 'TeacherFeedbackAnalytics');
  }
};

/**
 * Get all feedback for admin portal with search, pagination, and filters
 */
export const getAdminFeedbackAll = async (req, res) => {
  const { page = 1, limit = 20, rating, search, exportCsv } = req.query;
  try {
    const query = {};
    if (rating) {
      query.rating = Number(rating);
    }
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { studentName: rx },
        { teacherName: rx },
        { suggestion: rx }
      ];
    }

    // Export to CSV Flow
    if (exportCsv === 'true') {
      const allFeedback = await TeacherFeedback.find(query).sort({ date: -1 });
      
      let csvContent = 'Date,Student Name,Teacher Name,Teacher ID,Rating,Suggestion,Submitted By\n';
      allFeedback.forEach(f => {
        const dateStr = f.date ? new Date(f.date).toISOString().split('T')[0] : '';
        const escapeCSV = (str) => `"${(str || '').replace(/"/g, '""')}"`;
        
        csvContent += `${dateStr},${escapeCSV(f.studentName)},${escapeCSV(f.teacherName)},${escapeCSV(f.teacherId)},${f.rating},${escapeCSV(f.suggestion)},${f.submittedBy}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="teacher_feedback_export.csv"');
      return res.status(200).send(csvContent);
    }

    // Standard JSON Response with Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const total = await TeacherFeedback.countDocuments(query);
    const feedbackList = await TeacherFeedback.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Fetch student profiles for these user IDs to get roll numbers
    const studentUserIds = feedbackList.map(f => f.student).filter(Boolean);
    const studentProfiles = await Student.find({ user: { $in: studentUserIds } }).lean();
    
    // Create a map from student user ID to roll number
    const rollMap = {};
    studentProfiles.forEach(p => {
      if (p.user) {
        rollMap[p.user.toString()] = p.rollNumber || 'N/A';
      }
    });

    // Add rollNumber directly to the returned objects
    const enrichedList = feedbackList.map(f => {
      const fObj = f.toObject ? f.toObject() : { ...f };
      fObj.rollNumber = rollMap[fObj.student?.toString()] || 'N/A';
      return fObj;
    });

    return res.status(200).json({
      status: true,
      data: {
        feedback: enrichedList,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    return safeError(res, error, 'AdminFeedbackAll');
  }
};

/**
 * Get all feedback/reviews for a specific video (accessible to authenticated users)
 */
export const getVideoFeedback = async (req, res) => {
  const { videoId } = req.params;
  try {
    if (!videoId) {
      return res.status(400).json({ status: false, message: 'videoId is required' });
    }
    const feedbackList = await TeacherFeedback.find({ videoId }).sort({ date: -1 });
    return res.status(200).json({
      status: true,
      data: feedbackList
    });
  } catch (error) {
    return safeError(res, error, 'GetVideoFeedback');
  }
};

/**
 * Delete feedback (Parent only)
 */
export const deleteFeedback = async (req, res) => {
  if (!checkParentProfile(req, res)) return;

  const { id } = req.params;
  try {
    const feedback = await TeacherFeedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ status: false, message: 'Feedback not found' });
    }

    // Check ownership
    if (feedback.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: false, message: 'Unauthorized to delete this feedback' });
    }

    await TeacherFeedback.findByIdAndDelete(id);
    auditLog('FEEDBACK_DELETED', { feedbackId: id, deletedBy: req.user._id });

    return res.status(200).json({
      status: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    return safeError(res, error, 'DeleteFeedback');
  }
};
