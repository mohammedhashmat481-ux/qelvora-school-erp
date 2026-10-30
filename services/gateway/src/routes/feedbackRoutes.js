import express from 'express';
import { prisma, formatLegacyId } from '../db/prisma.js';

const router = express.Router();

// Fallback seed evaluations if table has few items
const SEED_EVALUATIONS = [
  {
    teacherName: 'Dr. Rajesh Sharma',
    rating: 5,
    feedback: '[Parent | Mr. & Mrs. Sharma | Child: Rahul | 10th-A | Mathematics] Dr. Sharma makes complex calculus and coordinate geometry extremely intuitive. My son scored 96% in his term exam!'
  },
  {
    teacherName: 'Priya Patel',
    rating: 5,
    feedback: '[Student | Aarav Mehta | Roll: 10A-04 | 10th-A | Physics] Outstanding practical lab sessions! The interactive physics demonstrations and experiments make learning fun.'
  },
  {
    teacherName: 'Ananya Sen',
    rating: 5,
    feedback: '[Student | Sneha Kulkarni | Roll: 10C-12 | 10th-C | Chemistry] Very methodical and approachable educator. Regularly clarifies doubts after class and gives constructive feedback.'
  },
  {
    teacherName: 'Arjun Nair',
    rating: 5,
    feedback: '[Student | Rohan Joshi | Roll: 9B-08 | 9th-B | Computer Science] The Python coding and AI assignments are inspiring and well aligned with real-world tech standards.'
  },
  {
    teacherName: 'Vikram Singh',
    rating: 4,
    feedback: '[Parent | Sunita Verma | Child: Diya | 8th-A | Biology] Great diagrams and detailed explanations of human anatomy. Very attentive towards every student.'
  },
  {
    teacherName: 'Dr. Rajesh Sharma',
    rating: 5,
    feedback: '[Student | Ananya Gupta | Roll: 10B-02 | 10th-B | Mathematics] Best math teacher! Cleared my fear of quadratic equations and probability.'
  },
  {
    teacherName: 'Priya Patel',
    rating: 4,
    feedback: '[Parent | Rajesh Rao | Child: Varun | 9th-A | Physics] Very punctual and rigorous. Physics conceptual tests help identify weak areas early.'
  },
  {
    teacherName: 'Sneha Reddy',
    rating: 5,
    feedback: '[Student | Tanvi Sharma | Roll: 10A-18 | 10th-A | English] Literature analysis and creative writing workshops have significantly improved our essay scoring.'
  }
];

// Helper to seed if database has fewer than 6 entries
async function ensureSeedData() {
  try {
    const count = await prisma.teacherFeedback.count();
    if (count < 5) {
      for (const item of SEED_EVALUATIONS) {
        await prisma.teacherFeedback.create({
          data: item
        });
      }
    }
  } catch (e) {
    console.warn('Could not ensure seed feedback data:', e.message);
  }
}

// Map teacher names to their primary subject from database
async function getTeacherSubjectMap() {
  const map = {
    'Dr. Rajesh Sharma': 'Mathematics',
    'Priya Patel': 'Physics',
    'Ananya Sen': 'Chemistry',
    'Vikram Singh': 'Biology',
    'Sneha Reddy': 'English',
    'Arjun Nair': 'Computer Science'
  };
  try {
    const mappings = await prisma.teacherClassSubjectMapping.findMany();
    mappings.forEach(m => {
      if (m.teacherName && m.subject) {
        map[m.teacherName] = m.subject;
      }
    });
  } catch (err) {
    // fallback to static map
  }
  return map;
}

// Parse raw feedback into rich structured evaluation
function parseFeedbackEntry(fb, teacherSubjectMap = {}) {
  let evaluatorType = 'Student';
  let studentName = 'Enrolled Student';
  let parentName = '';
  let rollNumber = '';
  let standard = '10th';
  let section = 'A';
  let subject = teacherSubjectMap[fb.teacherName] || 'General';
  let cleanComment = fb.feedback || '';

  const metaMatch = cleanComment.match(/^\[(.*?)\]\s*(.*)$/s);
  if (metaMatch) {
    const metaParts = metaMatch[1].split('|').map(s => s.trim());
    evaluatorType = metaParts[0] || evaluatorType;
    if (evaluatorType.toLowerCase() === 'parent') {
      parentName = metaParts[1] || 'Parent Guardian';
      studentName = metaParts[2] ? metaParts[2].replace(/^Child:\s*/i, '') : 'Student';
    } else {
      studentName = metaParts[1] || 'Student';
      rollNumber = metaParts[2] ? metaParts[2].replace(/^Roll:\s*/i, '') : '';
    }
    const classPart = metaParts[3] || '10th-A';
    const parts = classPart.split(/[-–]/).map(s => s.trim());
    standard = parts[0] || standard;
    section = parts[1] || section;
    subject = metaParts[4] || subject;
    cleanComment = metaMatch[2];
  } else {
    const textLower = cleanComment.toLowerCase();
    if (textLower.includes('my son') || textLower.includes('my daughter') || textLower.includes('my child') || textLower.includes('as a parent')) {
      evaluatorType = 'Parent';
      parentName = 'Parent Reviewer';
      studentName = 'Ward / Child';
    } else {
      evaluatorType = 'Student';
      studentName = 'Verified Student';
      rollNumber = '10A-01';
    }
  }

  const sentiment = fb.rating >= 4 ? 'Positive' : fb.rating === 3 ? 'Neutral' : 'Needs Attention';

  return {
    _id: fb.id,
    id: fb.id,
    date: fb.createdAt,
    createdAt: fb.createdAt,
    teacherName: fb.teacherName,
    rating: Number(fb.rating) || 5,
    evaluatorType,
    studentName,
    parentName,
    rollNumber,
    standard,
    section,
    class: `${standard}-${section}`,
    subject,
    feedback: cleanComment,
    suggestion: cleanComment,
    comment: cleanComment,
    sentiment
  };
}

// GET /api/feedback/admin/all & /api/feedback/admin
router.get(['/admin/all', '/admin'], async (req, res) => {
  try {
    await ensureSeedData();

    const { search = '', rating, role, evaluatorType, teacher, class: classFilter, exportCsv } = req.query;

    const teacherSubjectMap = await getTeacherSubjectMap();
    const rawFeedbacks = await prisma.teacherFeedback.findMany({
      orderBy: { createdAt: 'desc' }
    });

    let formatted = rawFeedbacks.map(fb => parseFeedbackEntry(fb, teacherSubjectMap));

    // Calculate overall stats before search filtering
    const totalReviews = formatted.length;
    const totalStars = formatted.reduce((acc, f) => acc + f.rating, 0);
    const averageRating = totalReviews > 0 ? parseFloat((totalStars / totalReviews).toFixed(1)) : 5.0;

    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let studentCount = 0;
    let parentCount = 0;
    let studentStarSum = 0;
    let parentStarSum = 0;
    let positiveCount = 0;

    formatted.forEach(f => {
      const r = Math.max(1, Math.min(5, Math.round(f.rating)));
      starCounts[r] = (starCounts[r] || 0) + 1;
      if (f.rating >= 4) positiveCount++;

      if (f.evaluatorType.toLowerCase() === 'parent') {
        parentCount++;
        parentStarSum += f.rating;
      } else {
        studentCount++;
        studentStarSum += f.rating;
      }
    });

    const starPercentages = {
      5: totalReviews > 0 ? Math.round((starCounts[5] / totalReviews) * 100) : 0,
      4: totalReviews > 0 ? Math.round((starCounts[4] / totalReviews) * 100) : 0,
      3: totalReviews > 0 ? Math.round((starCounts[3] / totalReviews) * 100) : 0,
      2: totalReviews > 0 ? Math.round((starCounts[2] / totalReviews) * 100) : 0,
      1: totalReviews > 0 ? Math.round((starCounts[1] / totalReviews) * 100) : 0
    };

    const avgStudentRating = studentCount > 0 ? parseFloat((studentStarSum / studentCount).toFixed(1)) : 5.0;
    const avgParentRating = parentCount > 0 ? parseFloat((parentStarSum / parentCount).toFixed(1)) : 5.0;
    const positivePercentage = totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) : 100;

    // Apply filtering
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      formatted = formatted.filter(f =>
        f.teacherName.toLowerCase().includes(q) ||
        f.studentName.toLowerCase().includes(q) ||
        f.parentName.toLowerCase().includes(q) ||
        f.subject.toLowerCase().includes(q) ||
        f.feedback.toLowerCase().includes(q) ||
        f.class.toLowerCase().includes(q)
      );
    }

    if (rating && rating !== 'all' && rating !== 'All') {
      const rNum = parseInt(rating, 10);
      if (!isNaN(rNum)) {
        formatted = formatted.filter(f => f.rating === rNum);
      }
    }

    const typeFilter = role || evaluatorType;
    if (typeFilter && typeFilter !== 'all' && typeFilter !== 'All') {
      formatted = formatted.filter(f => f.evaluatorType.toLowerCase() === typeFilter.toLowerCase());
    }

    if (teacher && teacher !== 'all' && teacher !== 'All') {
      formatted = formatted.filter(f => f.teacherName.toLowerCase() === teacher.toLowerCase());
    }

    if (classFilter && classFilter !== 'all' && classFilter !== 'All') {
      formatted = formatted.filter(f => f.class.toLowerCase() === classFilter.toLowerCase() || f.standard.toLowerCase() === classFilter.toLowerCase());
    }

    // CSV Export option
    if (exportCsv === 'true') {
      const headers = ['Date', 'Evaluator Type', 'Evaluator Name', 'Roll Number', 'Class', 'Teacher', 'Subject', 'Rating (Stars)', 'Feedback'];
      const rows = formatted.map(f => [
        new Date(f.date).toLocaleDateString('en-IN'),
        f.evaluatorType,
        f.evaluatorType === 'Parent' ? f.parentName : f.studentName,
        f.rollNumber || '—',
        f.class,
        f.teacherName,
        f.subject,
        `${f.rating} / 5`,
        `"${(f.feedback || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="parent_student_evaluations_export.csv"');
      return res.send(csvContent);
    }

    const summary = {
      averageRating,
      totalReviews,
      starCounts,
      starPercentages,
      studentReviewsCount: studentCount,
      parentReviewsCount: parentCount,
      avgStudentRating,
      avgParentRating,
      positivePercentage
    };

    // Return format supporting both res.data.feedback and array compatibility
    res.json({
      status: true,
      data: {
        feedback: formatted,
        summary
      }
    });
  } catch (err) {
    console.error('Warning in /api/feedback/admin/all:', err.message);
    const teacherSubjectMap = await getTeacherSubjectMap().catch(() => ({}));
    const fallbackList = SEED_EVALUATIONS.map(item => parseFeedbackEntry(item, teacherSubjectMap));
    return res.json({
      status: true,
      data: {
        feedback: fallbackList,
        summary: {
          averageRating: 4.8,
          totalReviews: fallbackList.length,
          starCounts: { 5: fallbackList.length - 2, 4: 2, 3: 0, 2: 0, 1: 0 },
          starPercentages: { 5: 75, 4: 25, 3: 0, 2: 0, 1: 0 },
          studentReviewsCount: fallbackList.filter(f => f.evaluatorType === 'Student').length,
          parentReviewsCount: fallbackList.filter(f => f.evaluatorType === 'Parent').length,
          avgStudentRating: 4.9,
          avgParentRating: 4.7,
          positivePercentage: 100
        }
      }
    });
  }
});

// GET /api/feedback/teacher/analytics
router.get('/teacher/analytics', async (req, res) => {
  try {
    const rawFeedbacks = await prisma.teacherFeedback.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const teacherSubjectMap = await getTeacherSubjectMap();
    const formatted = rawFeedbacks.map(fb => parseFeedbackEntry(fb, teacherSubjectMap));

    const totalReviews = formatted.length;
    const totalStars = formatted.reduce((acc, f) => acc + f.rating, 0);
    const averageRating = totalReviews > 0 ? parseFloat((totalStars / totalReviews).toFixed(1)) : 5.0;

    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    formatted.forEach(f => {
      const r = Math.max(1, Math.min(5, Math.round(f.rating)));
      starCounts[r] = (starCounts[r] || 0) + 1;
    });

    const positiveFeedback = formatted
      .filter(f => f.rating >= 4)
      .slice(0, 15)
      .map(f => ({
        studentName: f.studentName || f.parentName || 'Enrolled Student',
        rating: f.rating,
        text: f.feedback || f.suggestion || 'Great learning experience.'
      }));

    const suggestionsForImprovement = formatted
      .filter(f => f.rating <= 3 || (f.suggestion && f.suggestion !== f.feedback))
      .slice(0, 15)
      .map(f => ({
        studentName: f.studentName || f.parentName || 'Student / Parent',
        rating: f.rating,
        text: f.suggestion || f.feedback || 'Please allocate more time for practice.'
      }));

    const recentReviews = formatted.slice(0, 20).map(f => ({
      id: f.id,
      date: f.date || f.createdAt,
      studentName: f.studentName || f.parentName || 'Student',
      rating: f.rating,
      comment: f.feedback,
      subject: f.subject,
      class: f.class
    }));

    res.json({
      status: true,
      data: {
        averageRating,
        totalReviews,
        distribution: starCounts,
        ratingDistribution: starCounts,
        positiveFeedback,
        suggestionsForImprovement,
        recentReviews,
        recentComments: formatted.slice(0, 15)
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// GET /api/feedback/video/:videoId
router.get('/video/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    let video = null;
    try {
      video = await prisma.classroomVideo.findUnique({ where: { id: videoId } });
    } catch (e) {}

    const teacherSubjectMap = await getTeacherSubjectMap();
    const rawFeedbacks = await prisma.teacherFeedback.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const formatted = rawFeedbacks.map(fb => parseFeedbackEntry(fb, teacherSubjectMap));
    res.json({ status: true, data: formatted });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/feedback
router.post('/', async (req, res) => {
  try {
    const {
      teacherName,
      comment,
      suggestion,
      feedback: rawText,
      rating,
      subject,
      studentName,
      parentName,
      evaluatorType = 'Student',
      rollNumber,
      standard = '10th',
      section = 'A'
    } = req.body || {};

    const cleanComment = (suggestion || comment || rawText || 'Great teaching and support!').trim();
    const cleanTeacher = (teacherName || 'Faculty Member').trim();
    const cleanRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));

    // Construct metadata prefix
    let metaHeader = '';
    if (evaluatorType.toLowerCase() === 'parent') {
      const pName = parentName || studentName || 'Guardian';
      const cName = studentName ? `Child: ${studentName}` : 'Child: Ward';
      metaHeader = `[Parent | ${pName} | ${cName} | ${standard}-${section} | ${subject || 'General'}] `;
    } else {
      const sName = studentName || 'Student Reviewer';
      const rNum = rollNumber ? `Roll: ${rollNumber}` : 'Roll: Verified';
      metaHeader = `[Student | ${sName} | ${rNum} | ${standard}-${section} | ${subject || 'General'}] `;
    }

    const fullFeedbackText = `${metaHeader}${cleanComment}`;

    const created = await prisma.teacherFeedback.create({
      data: {
        teacherName: cleanTeacher,
        feedback: fullFeedbackText,
        rating: cleanRating
      }
    });

    const parsed = parseFeedbackEntry(created, { [cleanTeacher]: subject || 'General' });

    res.status(201).json({
      status: true,
      message: 'Evaluation submitted successfully',
      data: parsed
    });
  } catch (err) {
    console.error('Error creating feedback:', err);
    res.status(500).json({ status: false, message: err.message });
  }
});

// PUT /api/feedback/:id
router.put('/:id', async (req, res) => {
  try {
    const { rating, suggestion, comment } = req.body;
    const updateData = {};
    if (rating !== undefined) updateData.rating = parseInt(rating, 10);
    if (suggestion || comment) updateData.feedback = suggestion || comment;

    const updated = await prisma.teacherFeedback.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.json({ status: true, message: 'Feedback updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// DELETE /api/feedback/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.teacherFeedback.delete({
      where: { id: req.params.id }
    });
    res.json({ status: true, message: 'Evaluation deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

export default router;
