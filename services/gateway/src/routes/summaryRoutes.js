import express from 'express';
import { prisma } from '../db/prisma.js';
import { protect, allowTeacherAndAdmin } from '../middleware/authMiddleware.js';
import { generateTopicSummary } from '../lib/ai/summaryGenerator.js';
import { sanitizeForDb } from '../lib/studyMaterial/studyMaterialService.js';

const router = express.Router();

/**
 * POST /api/summary/generate & POST /api/summary
 * Generate age-appropriate academic topic summary grounded in shared library
 */
const handleGenerateSummary = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const schoolId = req.user?.schoolId || null;

    const {
      standard = '10th',
      board = req.body.syllabus || 'CBSE',
      syllabus,
      subject = 'Science',
      topic = '',
      style = 'Standard Notes',
      teacherInstructions = req.body.instructions || '',
      selectedResourceIds = []
    } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ status: false, message: 'Topic name is required.' });
    }

    const result = await generateTopicSummary({
      standard,
      board: syllabus || board,
      subject,
      topic: topic.trim(),
      style,
      teacherInstructions,
      selectedResourceIds,
      userId,
      schoolId
    });

    return res.json({
      status: true,
      success: true,
      data: result,
      summary: result.summary, // for direct backwards-compatibility with existing SummaryPage
      topic: result.topic,
      standard: result.standard,
      subject: result.subject,
      sourcesUsed: result.sourcesUsed
    });
  } catch (err) {
    console.error('Error in topic summary generation:', err.message);
    return res.status(500).json({
      status: false,
      message: err.message || 'Failed to generate topic summary'
    });
  }
};

/**
 * Handle Save or Generate for POST /api/summary
 */
const handleSaveOrGenerateSummary = async (req, res) => {
  if (req.body.summary && typeof req.body.summary === 'string' && req.body.summary.trim().length > 0) {
    try {
      const userId = req.user?.id || req.user?._id;
      const schoolId = req.user?.schoolId || null;
      const {
        standard = '10th',
        board = 'CBSE',
        subject = 'Science',
        topic = 'Untitled Topic',
        style = 'Standard Notes',
        title,
        summary,
        teacherInstructions = '',
        sourcesUsed = []
      } = req.body;

      const safeTitle = sanitizeForDb(title || `${topic} - ${style}`);
      const safeSummary = sanitizeForDb(summary);
      const safeTopic = sanitizeForDb(topic);
      const safeInstructions = sanitizeForDb(teacherInstructions);

      const saved = await prisma.topicSummary.create({
        data: {
          userId,
          schoolId,
          standard,
          board,
          subject,
          topic: safeTopic,
          style,
          title: safeTitle,
          summary: safeSummary,
          teacherInstructions: safeInstructions,
          sourcesUsed: sourcesUsed || [],
          provider: 'user-saved',
          model: 'custom'
        }
      });

      return res.status(201).json({
        status: true,
        message: 'Summary saved successfully',
        data: saved
      });
    } catch (saveErr) {
      console.error('Error saving summary:', saveErr.message);
      return res.status(500).json({ status: false, message: 'Failed to save summary: ' + saveErr.message });
    }
  }

  return handleGenerateSummary(req, res);
};

router.post('/summary/generate', protect, allowTeacherAndAdmin, handleGenerateSummary);
router.post('/summary', protect, allowTeacherAndAdmin, handleSaveOrGenerateSummary);

/**
 * GET /api/summary/history
 * List past generated topic summaries
 */
router.get('/summary/history', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const summaries = await prisma.topicSummary.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: 'desc' },
      take: 40
    });

    return res.json({ status: true, data: summaries });
  } catch (err) {
    console.error('Error fetching summary history:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * GET /api/summary/:id
 * Retrieve specific saved summary
 */
router.get('/summary/:id', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const summary = await prisma.topicSummary.findUnique({ where: { id } });
    if (!summary) {
      return res.status(404).json({ status: false, message: 'Summary not found.' });
    }
    return res.json({ status: true, data: summary });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * PUT /api/summary/:id
 * Update / Edit saved summary content
 */
router.put('/summary/:id', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    const { title, summary } = req.body;

    const existing = await prisma.topicSummary.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Summary not found.' });
    }

    if (existing.userId && existing.userId !== userId) {
      return res.status(403).json({ status: false, message: 'Unauthorized to modify this summary.' });
    }

    const safeTitle = title ? sanitizeForDb(title) : existing.title;
    const safeSummary = summary ? sanitizeForDb(summary) : existing.summary;

    const updated = await prisma.topicSummary.update({
      where: { id },
      data: {
        title: safeTitle,
        summary: safeSummary
      }
    });

    return res.json({ status: true, message: 'Summary updated successfully.', data: updated });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * DELETE /api/summary/:id
 * Remove summary
 */
router.delete('/summary/:id', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    const existing = await prisma.topicSummary.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Summary not found.' });
    }

    if (existing.userId && existing.userId !== userId) {
      return res.status(403).json({ status: false, message: 'Unauthorized to delete this summary.' });
    }

    await prisma.topicSummary.delete({ where: { id } });
    return res.json({ status: true, message: 'Summary deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

export default router;
