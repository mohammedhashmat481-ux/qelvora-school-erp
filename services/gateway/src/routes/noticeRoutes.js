import express from 'express';
import { prisma, formatLegacyId } from '../db/prisma.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/notices - List notices relevant to logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const user = req.user;
    const roleLower = (user?.role || '').toLowerCase();
    const isAdmin = roleLower === 'admin' || roleLower === 'principal';

    let where = {};
    if (!isAdmin) {
      const orList = [
        { recipientRole: 'ALL' },
        { recipientRole: 'all' }
      ];

      if (roleLower === 'teacher' || roleLower === 'educator') {
        orList.push({ recipientRole: 'TEACHER' });
        orList.push({ recipientRole: 'teacher' });
        if (user.teacherId) orList.push({ recipientId: user.teacherId });
        if (user.id) orList.push({ recipientId: user.id });
      } else if (roleLower === 'student') {
        orList.push({ recipientRole: 'STUDENT' });
        orList.push({ recipientRole: 'student' });
        if (user.standard) {
          orList.push({ targetStandard: user.standard });
        }
      } else if (roleLower === 'parent') {
        orList.push({ recipientRole: 'PARENT' });
        orList.push({ recipientRole: 'parent' });
        orList.push({ recipientRole: 'STUDENT' });
        if (user.standard) {
          orList.push({ targetStandard: user.standard });
        }
      }

      where = { OR: orList };
    }

    const notices = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ status: true, data: formatLegacyId(notices) });
  } catch (err) {
    console.error('Error fetching notices:', err);
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/notices - Admin/Principal creates and broadcasts a new notice
router.post('/', protect, authorize('admin', 'principal'), async (req, res) => {
  try {
    const {
      title,
      message,
      content,
      recipientRole,
      targetRole,
      targetStandard = '',
      targetSection = '',
      recipientId = '',
      priority = 'NORMAL'
    } = req.body;

    const noticeMessage = message || content || '';
    const resolvedRole = (recipientRole || targetRole || 'ALL').toUpperCase();

    if (!title || !noticeMessage) {
      return res.status(400).json({ status: false, message: 'Notice title and message/content are required.' });
    }

    const senderName = req.user.name || 'School Administration';

    const notice = await prisma.notification.create({
      data: {
        title,
        message: noticeMessage,
        recipientRole: resolvedRole,
        targetStandard: targetStandard || '',
        targetSection: targetSection || '',
        recipientId: recipientId || '',
        senderName,
        priority: priority || 'NORMAL'
      }
    });

    res.status(201).json({
      status: true,
      message: 'Notice broadcasted successfully!',
      data: notice
    });
  } catch (err) {
    console.error('Error creating notice:', err);
    res.status(500).json({ status: false, message: err.message });
  }
});

// PATCH /api/notices/:id/read - Mark notice as read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });
    res.json({ status: true, message: 'Notice marked as read' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

export default router;
