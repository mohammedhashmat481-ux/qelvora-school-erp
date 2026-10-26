import express from 'express';
import { previousBalanceStore } from '../db/previousBalanceStore.js';
import { prisma } from '../db/prisma.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/previous-balance - List all previous balance records
router.get('/', protect, async (req, res) => {
  try {
    const { standard, section, status, search, academicYear } = req.query;
    const records = await previousBalanceStore.getAll({
      standard,
      section,
      status,
      search,
      academicYear
    });

    res.json({
      success: true,
      data: records
    });
  } catch (err) {
    console.error('Error fetching previous balances:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/previous-balance/summary - KPI Summary statistics
router.get('/summary', protect, async (req, res) => {
  try {
    const { academicYear } = req.query;
    const summary = await previousBalanceStore.getSummary(academicYear);
    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    console.error('Error fetching previous balance summary:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/previous-balance/students - Available active students for dropdown selection
router.get('/students', protect, async (req, res) => {
  try {
    const { standard, section } = req.query;
    const where = { leftSchoolStatus: false };
    if (standard && standard !== 'all') where.standard = standard;
    if (section && section !== 'all') where.section = section;

    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        name: true,
        rollNumber: true,
        admissionNumber: true,
        standard: true,
        section: true,
        parentPhone: true
      },
      orderBy: [{ standard: 'asc' }, { rollNumber: 'asc' }]
    });

    res.json({
      success: true,
      data: students
    });
  } catch (err) {
    console.error('Error fetching students for previous balance:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/previous-balance - Add a new previous year balance entry
router.post('/', protect, async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      rollNumber,
      admissionNumber,
      standard,
      section,
      academicYear,
      previousYear,
      openingBalance,
      remarks
    } = req.body;

    if (!openingBalance || Number(openingBalance) <= 0) {
      return res.status(400).json({ success: false, message: 'Opening balance must be greater than 0' });
    }

    const created = await previousBalanceStore.addRecord({
      studentId,
      studentName,
      rollNumber,
      admissionNumber,
      standard,
      section,
      academicYear,
      previousYear,
      openingBalance,
      remarks
    });

    res.json({
      success: true,
      message: 'Previous year balance record created successfully',
      data: created
    });
  } catch (err) {
    console.error('Error adding previous balance:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/previous-balance/:id - Update previous year balance details
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { openingBalance, remarks, previousYear, academicYear } = req.body;

    const updated = await previousBalanceStore.updateRecord(id, {
      openingBalance,
      remarks,
      previousYear,
      academicYear
    });

    res.json({
      success: true,
      message: 'Record updated successfully',
      data: updated
    });
  } catch (err) {
    console.error('Error updating previous balance:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/previous-balance/:id/payment - Record collection against previous year balance
router.post('/:id/payment', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMode, transactionRef, remarks } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
    }

    const collectedBy = req.user?.name || 'Accounts Staff';
    const result = await previousBalanceStore.recordPayment(id, {
      amount,
      paymentMode,
      transactionRef,
      remarks,
      collectedBy
    });

    res.json({
      success: true,
      message: `Payment of ₹${amount} recorded successfully. Receipt #${result.receipt.receiptNumber} generated.`,
      data: result
    });
  } catch (err) {
    console.error('Error recording payment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/previous-balance/:id - Delete or waive off record
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await previousBalanceStore.deleteRecord(id);
    res.json({
      success: true,
      message: 'Record deleted successfully',
      data: deleted
    });
  } catch (err) {
    console.error('Error deleting record:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
