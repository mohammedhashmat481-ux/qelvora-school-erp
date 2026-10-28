import express from 'express';
import { prisma, formatLegacyId } from '../db/prisma.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/homework - List homework assignments based on role/class
router.get('/', protect, async (req, res) => {
  try {
    const user = req.user;
    const roleLower = (user?.role || '').toLowerCase();
    const { standard, section, subject, teacherId } = req.query;

    const where = {};
    if (standard && standard !== 'ALL') where.standard = standard;
    if (section && section !== 'ALL') where.section = section;
    if (subject && subject !== 'ALL') where.subject = subject;

    // If teacher, can optionally filter by their teacherId
    if (roleLower === 'teacher' && teacherId) {
      where.teacherId = teacherId;
    }

    // If student or parent, restrict to their standard and section
    let studentId = user.studentId || user.studentDbId;
    if (roleLower === 'student' || roleLower === 'parent') {
      let stu = null;
      if (studentId) {
        stu = await prisma.student.findUnique({ where: { id: studentId } }).catch(() => null);
      }
      if (!stu) {
        stu = await prisma.student.findFirst({
          where: {
            OR: [
              { userId: user.id },
              { email: { equals: user.email, mode: 'insensitive' } },
              { parentEmail: { equals: user.email, mode: 'insensitive' } }
            ]
          }
        }).catch(() => null);
      }

      if (stu) {
        where.standard = stu.standard;
        where.section = stu.section;
        studentId = stu.id;
      }
    }

    const homeworkList = await prisma.homework.findMany({
      where,
      include: {
        submissions: {
          select: {
            id: true,
            studentId: true,
            studentName: true,
            status: true,
            grade: true,
            feedback: true,
            submittedAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format for student/teacher view
    const formatted = homeworkList.map(hw => {
      const mySubmission = studentId
        ? hw.submissions.find(s => s.studentId === studentId)
        : null;

      return {
        id: hw.id,
        _id: hw.id,
        title: hw.title,
        description: hw.description,
        standard: hw.standard,
        section: hw.section,
        subject: hw.subject,
        teacherId: hw.teacherId,
        teacherName: hw.teacherName,
        dueDate: hw.dueDate,
        attachments: hw.attachments,
        createdAt: hw.createdAt,
        totalSubmissions: hw.submissions.length,
        // Student-specific fields:
        isSubmitted: !!mySubmission,
        studentStatus: mySubmission ? mySubmission.status : 'Pending',
        mySubmission: mySubmission || null,
        grade: mySubmission?.grade || null,
        feedback: mySubmission?.feedback || null
      };
    });

    res.json({ status: true, data: formatted });
  } catch (err) {
    console.error('Error fetching homework:', err);
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/homework - Teacher/Admin assigns new homework
router.post('/', protect, authorize('admin', 'principal', 'teacher', 'educator'), async (req, res) => {
  try {
    const { title, description, standard, section, subject, dueDate, attachments } = req.body;

    if (!title || !standard || !subject) {
      return res.status(400).json({ status: false, message: 'Title, Class Standard, and Subject are required.' });
    }

    const teacherName = req.user.name || 'Faculty Member';
    const teacherId = req.user.teacherId || req.user.id || null;

    const created = await prisma.homework.create({
      data: {
        title,
        description: description || '',
        standard,
        section: section || 'A',
        subject,
        teacherId,
        teacherName,
        dueDate: dueDate || 'Next Class Session',
        attachments: attachments || null
      }
    });

    // Also dispatch notification to students/parents of this class
    await prisma.notification.create({
      data: {
        recipientRole: 'STUDENT',
        targetStandard: standard,
        targetSection: section || 'A',
        senderName: teacherName,
        priority: 'NORMAL',
        title: `New Homework: ${subject} (${title})`,
        message: `${teacherName} assigned new homework for Class ${standard}-${section || 'A'}: "${title}". Due date: ${dueDate || 'Next Class'}.`
      }
    }).catch(() => null);

    res.status(201).json({
      status: true,
      message: 'Homework assigned successfully!',
      data: created
    });
  } catch (err) {
    console.error('Error creating homework:', err);
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/homework/:id/submit - Student submits homework
router.post('/:id/submit', protect, async (req, res) => {
  try {
    const homeworkId = req.params.id;
    const { submissionText = '', attachments = null } = req.body;
    const user = req.user;

    const homework = await prisma.homework.findUnique({ where: { id: homeworkId } });
    if (!homework) {
      return res.status(404).json({ status: false, message: 'Homework assignment not found.' });
    }

    let studentId = user.studentId || user.studentDbId || user.id;
    let studentName = user.name || 'Student';

    // Verify student record
    const stu = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentId },
          { userId: user.id },
          { email: { equals: user.email, mode: 'insensitive' } }
        ]
      }
    });
    if (stu) {
      studentId = stu.id;
      studentName = stu.name;
    }

    const submission = await prisma.homeworkSubmission.upsert({
      where: {
        homeworkId_studentId: {
          homeworkId,
          studentId
        }
      },
      update: {
        status: 'SUBMITTED',
        submissionText,
        attachments,
        submittedAt: new Date()
      },
      create: {
        homeworkId,
        studentId,
        studentName,
        status: 'SUBMITTED',
        submissionText,
        attachments,
        submittedAt: new Date()
      }
    });

    res.json({
      status: true,
      message: 'Homework submitted successfully!',
      data: submission
    });
  } catch (err) {
    console.error('Error submitting homework:', err);
    res.status(500).json({ status: false, message: err.message });
  }
});

// PUT /api/homework/submission/:id/grade - Teacher grades submission
router.put('/submission/:id/grade', protect, authorize('admin', 'principal', 'teacher', 'educator'), async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { grade, feedback } = req.body;

    const updated = await prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        grade: grade || 'A',
        feedback: feedback || '',
        status: 'REVIEWED',
        reviewedAt: new Date()
      }
    });

    res.json({
      status: true,
      message: 'Homework reviewed and graded successfully!',
      data: updated
    });
  } catch (err) {
    console.error('Error grading homework:', err);
    res.status(500).json({ status: false, message: err.message });
  }
});

// DELETE /api/homework/:id - Teacher/Admin deletes homework
router.delete('/:id', protect, authorize('admin', 'principal', 'teacher'), async (req, res) => {
  try {
    await prisma.homework.delete({ where: { id: req.params.id } });
    res.json({ status: true, message: 'Homework deleted successfully.' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

export default router;
