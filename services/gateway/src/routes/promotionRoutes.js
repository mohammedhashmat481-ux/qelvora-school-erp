import express from 'express';
import { promotionStore } from '../db/promotionStore.js';
import { prisma } from '../db/prisma.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/promotion/settings
router.get('/settings', protect, (req, res) => {
  try {
    res.json({
      success: true,
      data: promotionStore.data.settings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/promotion/class-summary
router.get('/class-summary', protect, async (req, res) => {
  try {
    const { fromAcademicYear, toAcademicYear } = req.query;
    const summary = await promotionStore.getClassSummary(fromAcademicYear, toAcademicYear);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/promotion/students
router.get('/students', protect, async (req, res) => {
  try {
    const { academicYear, nextAcademicYear, standard, section, status, search } = req.query;
    const students = await promotionStore.getStudentsForPromotion({
      academicYear,
      nextAcademicYear,
      standard,
      section,
      status,
      search
    });
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/promotion/preview
router.post('/preview', protect, async (req, res) => {
  try {
    const previewData = await promotionStore.previewPromotion(req.body);
    res.json({ success: true, data: previewData });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/promotion/execute
router.post('/execute', protect, async (req, res) => {
  try {
    const adminUser = req.user?.name || 'Administrator';
    const result = await promotionStore.executePromotion(req.body, adminUser);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/promotion/history
router.get('/history', protect, (req, res) => {
  try {
    res.json({
      success: true,
      data: promotionStore.data.auditLogs
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/promotion/history/:batchId
router.get('/history/:batchId', protect, (req, res) => {
  try {
    const batch = promotionStore.data.auditLogs.find(b => b.id === req.params.batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, data: batch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/promotion/student-history/:studentId
router.get('/student-history/:studentId', protect, async (req, res) => {
  try {
    const sId = req.params.studentId;
    const student = await prisma.student.findFirst({
      where: { OR: [{ id: sId }, { studentId: sId }] }
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const history = promotionStore.getStudentHistory(student.id);
    res.json({
      success: true,
      data: {
        student,
        enrollmentHistory: history
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/promotion/alumni
router.get('/alumni', protect, (req, res) => {
  try {
    const { search, academicYearCompleted, lastStudiedClass } = req.query;
    const records = promotionStore.getAlumniRecords({
      search,
      academicYearCompleted,
      lastStudiedClass
    });
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/promotion/alumni/:id/update
router.post('/alumni/:id/update', protect, (req, res) => {
  try {
    const record = promotionStore.data.alumniRecords.find(a => a.id === req.params.id || a.studentId === req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Alumni record not found' });

    const { certificateNumber, remarks, higherEducation, employmentStatus } = req.body;
    if (certificateNumber) record.certificateNumber = certificateNumber;
    if (remarks) record.remarks = remarks;
    if (higherEducation) record.higherEducation = higherEducation;
    if (employmentStatus) record.employmentStatus = employmentStatus;

    promotionStore.save();
    res.json({ success: true, message: 'Alumni record updated successfully', data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
