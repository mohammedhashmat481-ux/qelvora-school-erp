import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

import { Expense } from '../models/Expense.js';
import { ExpenseCategory } from '../models/ExpenseCategory.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  ensureDefaultCategories,
  getNextExpenseNumber,
  getFinancialYearRange,
  getWeekRange,
  getMonthRange,
  getSchoolBranding
} from '../services/expenseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ── File Upload Config for Receipts & Bills ──────────────────────────────────
const uploadDir = path.resolve(__dirname, '../../uploads/expenses');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e4)}`;
    cb(null, `receipt_${cleanName}_${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, and WebP receipts are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// ── Multi-Tenant School ID Helper ───────────────────────────────────────────
// Never trust school IDs supplied by the frontend; derive from authenticated user
const getSchoolId = (req) => {
  return (
    req.user?.schoolId ||
    req.user?.school_id ||
    req.user?.school?.id ||
    'default_school'
  );
};

// Check expense management permission
const checkExpensePermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const role = (req.user.role || '').toLowerCase();
  const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];

  const isAllowed =
    role === 'admin' ||
    role === 'super admin' ||
    role === 'principal' ||
    role === 'accountant' ||
    permissions.includes('all') ||
    permissions.includes('expense_management') ||
    permissions.includes('admin_panel');

  if (!isAllowed) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to access Expense Management'
    });
  }
  next();
};

// Apply auth & permission to all expense endpoints
router.use(protect, checkExpensePermission);

// ─────────────────────────────────────────────────────────────────────────────
// 1. DASHBOARD & ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    await ensureDefaultCategories(schoolId, req.user);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Today Range
    const todayStart = new Date(todayStr + 'T00:00:00.000Z');
    const todayEnd = new Date(todayStr + 'T23:59:59.999Z');

    // Week Range
    const week = getWeekRange(now);

    // Month Range
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const month = getMonthRange(currentYear, currentMonth);

    // Financial Year Range
    const fy = getFinancialYearRange(now);

    const matchBase = { schoolId, isDeleted: false };

    // Aggregate key KPI numbers
    const [
      todayAgg,
      weekAgg,
      monthAgg,
      fyAgg,
      totalCount,
      categoryAgg,
      trendAgg,
      recentExpenses
    ] = await Promise.all([
      // 1. Today Total
      Expense.aggregate([
        { $match: { ...matchBase, dateString: todayStr } },
        { $group: { _id: null, totalPaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } }
      ]),

      // 2. Week Total
      Expense.aggregate([
        { $match: { ...matchBase, date: { $gte: week.start, $lte: week.end } } },
        { $group: { _id: null, totalPaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } }
      ]),

      // 3. Month Total
      Expense.aggregate([
        { $match: { ...matchBase, date: { $gte: month.start, $lte: month.end } } },
        { $group: { _id: null, totalPaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } }
      ]),

      // 4. Financial Year Total
      Expense.aggregate([
        { $match: { ...matchBase, date: { $gte: fy.start, $lte: fy.end } } },
        { $group: { _id: null, totalPaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } }
      ]),

      // 5. Total Transactions
      Expense.countDocuments(matchBase),

      // 6. Category-wise Breakdown (for current FY)
      Expense.aggregate([
        { $match: { ...matchBase, date: { $gte: fy.start, $lte: fy.end } } },
        {
          $group: {
            _id: '$category',
            totalPaise: { $sum: '$amountPaise' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalPaise: -1 } }
      ]),

      // 7. Monthly Trend (Past 6 months)
      Expense.aggregate([
        {
          $match: {
            ...matchBase,
            date: {
              $gte: new Date(new Date().setMonth(now.getMonth() - 5, 1))
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            totalPaise: { $sum: '$amountPaise' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // 8. Recent 5 Transactions
      Expense.find(matchBase)
        .sort({ date: -1, createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    const todayTotal = todayAgg[0] ? Number((todayAgg[0].totalPaise / 100).toFixed(2)) : 0;
    const weekTotal = weekAgg[0] ? Number((weekAgg[0].totalPaise / 100).toFixed(2)) : 0;
    const monthTotal = monthAgg[0] ? Number((monthAgg[0].totalPaise / 100).toFixed(2)) : 0;
    const fyTotal = fyAgg[0] ? Number((fyAgg[0].totalPaise / 100).toFixed(2)) : 0;

    // Highest category calculation
    let highestCategory = null;
    const categoryBreakdown = categoryAgg.map(cat => {
      const amount = Number((cat.totalPaise / 100).toFixed(2));
      const percentage = fyTotal > 0 ? Number(((amount / fyTotal) * 100).toFixed(1)) : 0;
      return {
        category: cat._id,
        amount,
        count: cat.count,
        percentage
      };
    });

    if (categoryBreakdown.length > 0) {
      highestCategory = categoryBreakdown[0];
    }

    // Format monthly trend chart data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendData = trendAgg.map(item => {
      const monthIndex = item._id.month - 1;
      const label = `${monthNames[monthIndex]} ${String(item._id.year).slice(-2)}`;
      return {
        year: item._id.year,
        month: item._id.month,
        label,
        amount: Number((item.totalPaise / 100).toFixed(2)),
        count: item.count
      };
    });

    res.json({
      success: true,
      data: {
        todayTotal,
        todayCount: todayAgg[0]?.count || 0,
        weekTotal,
        weekCount: weekAgg[0]?.count || 0,
        monthTotal,
        monthCount: monthAgg[0]?.count || 0,
        fyTotal,
        fyLabel: fy.label,
        totalTransactions: totalCount,
        highestCategory,
        categoryBreakdown,
        trendData,
        recentExpenses
      }
    });
  } catch (err) {
    console.error('Error fetching expense dashboard:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXPENSE CATEGORIES CRUD
// ─────────────────────────────────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    await ensureDefaultCategories(schoolId, req.user);

    const includeInactive = req.query.includeInactive === 'true';
    const filter = { schoolId };
    if (!includeInactive) filter.isActive = true;

    const categories = await ExpenseCategory.find(filter).sort({ name: 1 }).lean();

    // Attach transaction counts and total spent per category
    const stats = await Expense.aggregate([
      { $match: { schoolId, isDeleted: false } },
      { $group: { _id: '$category', count: { $sum: 1 }, totalPaise: { $sum: '$amountPaise' } } }
    ]);

    const statsMap = {};
    stats.forEach(s => {
      statsMap[s._id] = {
        count: s.count,
        totalAmount: Number((s.totalPaise / 100).toFixed(2))
      };
    });

    const enriched = categories.map(cat => ({
      ...cat,
      expenseCount: statsMap[cat.name]?.count || 0,
      totalSpent: statsMap[cat.name]?.totalAmount || 0
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { name, description, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const trimmedName = name.trim();
    const existing = await ExpenseCategory.findOne({
      schoolId,
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Category "${trimmedName}" already exists` });
    }

    const category = await ExpenseCategory.create({
      schoolId,
      name: trimmedName,
      description: description?.trim() || '',
      color: color || '#3B82F6',
      isActive: true,
      isDefault: false,
      createdBy: { id: req.user.id || req.user._id, name: req.user.name, role: req.user.role }
    });

    res.status(201).json({ success: true, message: 'Category added successfully', data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { name, description, color, isActive } = req.body;

    const category = await ExpenseCategory.findOne({ _id: req.params.id, schoolId });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const oldName = category.name;
    const newName = name ? name.trim() : oldName;

    if (name && newName.toLowerCase() !== oldName.toLowerCase()) {
      const duplicate = await ExpenseCategory.findOne({
        schoolId,
        _id: { $ne: category._id },
        name: { $regex: new RegExp(`^${newName}$`, 'i') }
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: `Category "${newName}" already exists` });
      }

      // If renamed, update category name in all past expenses
      await Expense.updateMany(
        { schoolId, category: oldName },
        { $set: { category: newName } }
      );
    }

    category.name = newName;
    if (description !== undefined) category.description = description.trim();
    if (color) category.color = color;
    if (isActive !== undefined) category.isActive = Boolean(isActive);
    category.updatedBy = { id: req.user.id || req.user._id, name: req.user.name, role: req.user.role };

    await category.save();

    res.json({ success: true, message: 'Category updated successfully', data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const category = await ExpenseCategory.findOne({ _id: req.params.id, schoolId });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Check if any expenses are linked to this category
    const usedCount = await Expense.countDocuments({ schoolId, category: category.name, isDeleted: false });
    if (usedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category "${category.name}" because it is linked to ${usedCount} expense(s). You can deactivate it instead.`
      });
    }

    await ExpenseCategory.deleteOne({ _id: category._id });
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. EXPENSES CRUD (LIST, ADD, EDIT, DELETE)
// ─────────────────────────────────────────────────────────────────────────────

// List with search, filtering, sorting, and pagination
router.get('/', async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const {
      search,
      category,
      paymentMethod,
      startDate,
      endDate,
      date,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const query = { schoolId, isDeleted: false };

    // Search filter
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { paidTo: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } },
        { referenceNumber: { $regex: s, $options: 'i' } },
        { expenseNumber: { $regex: s, $options: 'i' } },
        { category: { $regex: s, $options: 'i' } }
      ];
    }

    // Category filter
    if (category && category !== 'All' && category.trim()) {
      query.category = category.trim();
    }

    // Payment method filter
    if (paymentMethod && paymentMethod !== 'All' && paymentMethod.trim()) {
      query.paymentMethod = paymentMethod.trim();
    }

    // Date filters
    if (date) {
      query.dateString = date;
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        query.date.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    // Sorting
    const sort = {};
    if (sortBy === 'amount') {
      sort.amountPaise = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.date = sortOrder === 'asc' ? 1 : -1;
      sort.createdAt = sortOrder === 'asc' ? 1 : -1;
    }

    const [expenses, total, summaryAgg] = await Promise.all([
      Expense.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Expense.countDocuments(query),
      Expense.aggregate([
        { $match: query },
        { $group: { _id: null, totalPaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } }
      ])
    ]);

    const filteredTotal = summaryAgg[0] ? Number((summaryAgg[0].totalPaise / 100).toFixed(2)) : 0;

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1
        },
        summary: {
          filteredTotal,
          count: total
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add new expense
router.post('/', upload.single('receipt'), async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const {
      date,
      category,
      amount,
      paidTo,
      paymentMethod = 'Cash',
      description = '',
      referenceNumber = '',
      academicYear = '2026-2027'
    } = req.body;

    // Backend validation
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Expense category is required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Expense amount must be a positive number greater than 0' });
    }

    if (!paidTo || !paidTo.trim()) {
      return res.status(400).json({ success: false, message: 'Paid To / Vendor Name is required' });
    }

    const validMethods = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: `Invalid payment method. Must be one of: ${validMethods.join(', ')}` });
    }

    // Determine expense date
    let expDate = new Date();
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        expDate = parsedDate;
      }
    }
    const dateString = expDate.toISOString().slice(0, 10);

    // Exact decimal-safe amount representation in integer paise
    const amountPaise = Math.round(parsedAmount * 100);
    const normalizedAmount = Number((amountPaise / 100).toFixed(2));

    // Receipt details if uploaded
    let receiptUrl = '';
    let receiptFileName = '';
    if (req.file) {
      receiptUrl = `/uploads/expenses/${req.file.filename}`;
      receiptFileName = req.file.originalname;
    }

    // Generate unique sequential expense number: EXP-YYYYMM-XXXX
    const expenseNumber = await getNextExpenseNumber(schoolId, expDate);

    // Find category ID if exists
    const categoryDoc = await ExpenseCategory.findOne({ schoolId, name: category.trim() }).select('_id');

    const currentUser = {
      id: req.user.id || req.user._id,
      name: req.user.name,
      role: req.user.role
    };

    const initialAudit = {
      action: 'CREATE',
      performedBy: currentUser,
      timestamp: new Date(),
      changes: {
        amount: normalizedAmount,
        category: category.trim(),
        paidTo: paidTo.trim(),
        paymentMethod,
        date: dateString
      },
      notes: 'Expense recorded'
    };

    const expense = await Expense.create({
      schoolId,
      expenseNumber,
      date: expDate,
      dateString,
      category: category.trim(),
      categoryId: categoryDoc?._id || null,
      amount: normalizedAmount,
      amountPaise,
      paidTo: paidTo.trim(),
      paymentMethod,
      description: description?.trim() || '',
      referenceNumber: referenceNumber?.trim() || '',
      receiptUrl,
      receiptFileName,
      academicYear,
      createdBy: currentUser,
      updatedBy: currentUser,
      auditHistory: [initialAudit]
    });

    res.status(201).json({
      success: true,
      message: `Expense ${expenseNumber} recorded successfully!`,
      data: expense
    });
  } catch (err) {
    console.error('Error adding expense:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Single expense detail with full audit history
router.get('/:id', async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const expense = await Expense.findOne({ _id: req.params.id, schoolId }).lean();

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Edit expense with audit history
router.put('/:id', upload.single('receipt'), async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const expense = await Expense.findOne({ _id: req.params.id, schoolId, isDeleted: false });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found or has been deleted' });
    }

    const {
      date,
      category,
      amount,
      paidTo,
      paymentMethod,
      description,
      referenceNumber,
      editReason
    } = req.body;

    const changes = {};

    // Validate and update fields
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Expense amount must be a positive number greater than 0' });
      }
      const newAmountPaise = Math.round(parsedAmount * 100);
      const newAmount = Number((newAmountPaise / 100).toFixed(2));
      if (newAmount !== expense.amount) {
        changes.amount = { from: expense.amount, to: newAmount };
        expense.amount = newAmount;
        expense.amountPaise = newAmountPaise;
      }
    }

    if (category && category.trim() !== expense.category) {
      changes.category = { from: expense.category, to: category.trim() };
      expense.category = category.trim();
      const catDoc = await ExpenseCategory.findOne({ schoolId, name: category.trim() }).select('_id');
      expense.categoryId = catDoc?._id || null;
    }

    if (paidTo && paidTo.trim() !== expense.paidTo) {
      changes.paidTo = { from: expense.paidTo, to: paidTo.trim() };
      expense.paidTo = paidTo.trim();
    }

    if (paymentMethod && paymentMethod !== expense.paymentMethod) {
      changes.paymentMethod = { from: expense.paymentMethod, to: paymentMethod };
      expense.paymentMethod = paymentMethod;
    }

    if (description !== undefined && description.trim() !== expense.description) {
      changes.description = { from: expense.description, to: description.trim() };
      expense.description = description.trim();
    }

    if (referenceNumber !== undefined && referenceNumber.trim() !== expense.referenceNumber) {
      changes.referenceNumber = { from: expense.referenceNumber, to: referenceNumber.trim() };
      expense.referenceNumber = referenceNumber.trim();
    }

    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        const newDateStr = parsedDate.toISOString().slice(0, 10);
        if (newDateStr !== expense.dateString) {
          changes.date = { from: expense.dateString, to: newDateStr };
          expense.date = parsedDate;
          expense.dateString = newDateStr;
        }
      }
    }

    if (req.file) {
      const newUrl = `/uploads/expenses/${req.file.filename}`;
      changes.receipt = { from: expense.receiptFileName || 'None', to: req.file.originalname };
      expense.receiptUrl = newUrl;
      expense.receiptFileName = req.file.originalname;
    }

    const currentUser = {
      id: req.user.id || req.user._id,
      name: req.user.name,
      role: req.user.role
    };

    expense.updatedBy = currentUser;

    if (Object.keys(changes).length > 0) {
      expense.auditHistory.push({
        action: 'UPDATE',
        performedBy: currentUser,
        timestamp: new Date(),
        changes,
        notes: editReason?.trim() || 'Expense details updated'
      });
      await expense.save();
    }

    res.json({ success: true, message: 'Expense updated successfully', data: expense });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Soft delete with audit log
router.delete('/:id', async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const expense = await Expense.findOne({ _id: req.params.id, schoolId, isDeleted: false });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const currentUser = {
      id: req.user.id || req.user._id,
      name: req.user.name,
      role: req.user.role
    };

    expense.isDeleted = true;
    expense.deletedAt = new Date();
    expense.deletedBy = currentUser;
    expense.auditHistory.push({
      action: 'DELETE',
      performedBy: currentUser,
      timestamp: new Date(),
      changes: { isDeleted: true },
      notes: req.body.reason?.trim() || 'Expense deleted'
    });

    await expense.save();

    res.json({ success: true, message: `Expense ${expense.expenseNumber} deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. REPORTS: DAILY, WEEKLY, MONTHLY, CUSTOM
// ─────────────────────────────────────────────────────────────────────────────

// Helper function to aggregate category & payment method totals for reports
async function generateReportBreakdown(query) {
  const [expenses, categoryTotals, paymentMethodTotals, grandTotalAgg] = await Promise.all([
    Expense.find(query).sort({ date: -1, createdAt: -1 }).lean(),
    Expense.aggregate([
      { $match: query },
      { $group: { _id: '$category', totalPaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } },
      { $sort: { totalPaise: -1 } }
    ]),
    Expense.aggregate([
      { $match: query },
      { $group: { _id: '$paymentMethod', totalPaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } },
      { $sort: { totalPaise: -1 } }
    ]),
    Expense.aggregate([
      { $match: query },
      { $group: { _id: null, totalPaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } }
    ])
  ]);

  const grandTotal = grandTotalAgg[0] ? Number((grandTotalAgg[0].totalPaise / 100).toFixed(2)) : 0;

  const categories = categoryTotals.map(c => ({
    category: c._id,
    amount: Number((c.totalPaise / 100).toFixed(2)),
    count: c.count,
    percentage: grandTotal > 0 ? Number(((c.totalPaise / grandTotalAgg[0].totalPaise) * 100).toFixed(1)) : 0
  }));

  const paymentMethods = paymentMethodTotals.map(p => ({
    method: p._id,
    amount: Number((p.totalPaise / 100).toFixed(2)),
    count: p.count,
    percentage: grandTotal > 0 ? Number(((p.totalPaise / grandTotalAgg[0].totalPaise) * 100).toFixed(1)) : 0
  }));

  return { expenses, categories, paymentMethods, grandTotal, totalCount: expenses.length };
}

// Daily Report
router.get('/reports/daily', async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);

    const query = {
      schoolId,
      isDeleted: false,
      dateString: dateStr
    };

    const report = await generateReportBreakdown(query);
    const branding = await getSchoolBranding();

    res.json({
      success: true,
      data: {
        reportType: 'Daily Expense Report',
        date: dateStr,
        periodLabel: new Date(dateStr).toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        school: branding,
        ...report
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Weekly Report
router.get('/reports/weekly', async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;

    if (!startDate || !endDate) {
      const week = getWeekRange(req.query.date ? new Date(req.query.date) : new Date());
      startDate = week.start.toISOString().slice(0, 10);
      endDate = week.end.toISOString().slice(0, 10);
    }

    const query = {
      schoolId,
      isDeleted: false,
      date: {
        $gte: new Date(startDate + 'T00:00:00.000Z'),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      }
    };

    const [report, dailyTotalsAgg] = await Promise.all([
      generateReportBreakdown(query),
      Expense.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$dateString',
            totalPaise: { $sum: '$amountPaise' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const dailyBreakdown = dailyTotalsAgg.map(d => ({
      date: d._id,
      amount: Number((d.totalPaise / 100).toFixed(2)),
      count: d.count,
      dayName: new Date(d._id).toLocaleDateString('en-IN', { weekday: 'short' })
    }));

    const branding = await getSchoolBranding();

    res.json({
      success: true,
      data: {
        reportType: 'Weekly Expense Report',
        startDate,
        endDate,
        periodLabel: `${new Date(startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        school: branding,
        dailyBreakdown,
        ...report
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Monthly Report
router.get('/reports/monthly', async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;

    const { start, end } = getMonthRange(year, month);

    const query = {
      schoolId,
      isDeleted: false,
      date: { $gte: start, $lte: end }
    };

    const [report, dailyTotalsAgg] = await Promise.all([
      generateReportBreakdown(query),
      Expense.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$dateString',
            totalPaise: { $sum: '$amountPaise' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const dailyBreakdown = dailyTotalsAgg.map(d => ({
      date: d._id,
      amount: Number((d.totalPaise / 100).toFixed(2)),
      count: d.count
    }));

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthLabel = `${monthNames[month - 1]} ${year}`;

    const branding = await getSchoolBranding();

    res.json({
      success: true,
      data: {
        reportType: 'Monthly Expense Report',
        year,
        month,
        periodLabel: monthLabel,
        school: branding,
        dailyBreakdown,
        ...report
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Custom Date Range Report
router.get('/reports/custom', async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { startDate, endDate, category, paymentMethod } = req.query;

    const query = { schoolId, isDeleted: false };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate + 'T00:00:00.000Z');
      if (endDate) query.date.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    if (category && category !== 'All') {
      query.category = category.trim();
    }

    if (paymentMethod && paymentMethod !== 'All') {
      query.paymentMethod = paymentMethod.trim();
    }

    const report = await generateReportBreakdown(query);
    const branding = await getSchoolBranding();

    res.json({
      success: true,
      data: {
        reportType: 'Custom Expense Report',
        startDate: startDate || 'All Time',
        endDate: endDate || 'Present',
        periodLabel: `${startDate || 'All Time'} to ${endDate || 'Present'}`,
        school: branding,
        ...report
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. DOWNLOAD & EXPORT (EXCEL & PDF)
// ─────────────────────────────────────────────────────────────────────────────

// Export to Excel (.xlsx)
router.get('/export/excel', async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { type = 'all', date, startDate, endDate, month, year, category, paymentMethod } = req.query;

    const query = { schoolId, isDeleted: false };

    if (date) {
      query.dateString = date;
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate + 'T00:00:00.000Z');
      if (endDate) query.date.$lte = new Date(endDate + 'T23:59:59.999Z');
    } else if (month && year) {
      const mRange = getMonthRange(year, month);
      query.date = { $gte: mRange.start, $lte: mRange.end };
    }

    if (category && category !== 'All') query.category = category.trim();
    if (paymentMethod && paymentMethod !== 'All') query.paymentMethod = paymentMethod.trim();

    const report = await generateReportBreakdown(query);
    const branding = await getSchoolBranding();

    // 1. Transaction Sheet
    const txRows = report.expenses.map((exp, idx) => ({
      'S.No': idx + 1,
      'Expense #': exp.expenseNumber,
      'Date': exp.dateString,
      'Category': exp.category,
      'Paid To / Vendor': exp.paidTo,
      'Payment Method': exp.paymentMethod,
      'Amount (₹)': exp.amount,
      'Ref / Bill No': exp.referenceNumber || '-',
      'Description / Purpose': exp.description || '-',
      'Recorded By': exp.createdBy?.name || '-'
    }));

    // Add summary row
    txRows.push({
      'S.No': '',
      'Expense #': '',
      'Date': '',
      'Category': '',
      'Paid To / Vendor': '',
      'Payment Method': 'GRAND TOTAL',
      'Amount (₹)': report.grandTotal,
      'Ref / Bill No': '',
      'Description / Purpose': '',
      'Recorded By': ''
    });

    // 2. Category Summary Sheet
    const catRows = report.categories.map((c, idx) => ({
      'S.No': idx + 1,
      'Expense Category': c.category,
      'Transactions': c.count,
      'Total Amount (₹)': c.amount,
      'Share (%)': `${c.percentage}%`
    }));

    // 3. Payment Method Summary Sheet
    const pmRows = report.paymentMethods.map((p, idx) => ({
      'S.No': idx + 1,
      'Payment Method': p.method,
      'Transactions': p.count,
      'Total Amount (₹)': p.amount,
      'Share (%)': `${p.percentage}%`
    }));

    const workbook = XLSX.utils.book_new();

    const wsTx = XLSX.utils.json_to_sheet(txRows);
    const wsCat = XLSX.utils.json_to_sheet(catRows);
    const wsPm = XLSX.utils.json_to_sheet(pmRows);

    // Auto-fit column widths
    const setColWidths = (ws, rows) => {
      if (!rows.length) return;
      const keys = Object.keys(rows[0]);
      ws['!cols'] = keys.map(k => ({
        wch: Math.max(k.length, ...rows.map(r => String(r[k] || '').length)) + 4
      }));
    };

    setColWidths(wsTx, txRows);
    setColWidths(wsCat, catRows);
    setColWidths(wsPm, pmRows);

    XLSX.utils.book_append_sheet(workbook, wsTx, 'Expense Transactions');
    XLSX.utils.book_append_sheet(workbook, wsCat, 'Category Breakdown');
    XLSX.utils.book_append_sheet(workbook, wsPm, 'Payment Methods');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `Expense_Report_${branding.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Download PDF Report
router.get('/export/pdf', async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { type = 'all', date, startDate, endDate, month, year, category, paymentMethod } = req.query;

    const query = { schoolId, isDeleted: false };
    let periodText = 'All Expenses';

    if (date) {
      query.dateString = date;
      periodText = `Date: ${date}`;
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate + 'T00:00:00.000Z');
      if (endDate) query.date.$lte = new Date(endDate + 'T23:59:59.999Z');
      periodText = `Period: ${startDate || 'Start'} to ${endDate || 'End'}`;
    } else if (month && year) {
      const mRange = getMonthRange(year, month);
      query.date = { $gte: mRange.start, $lte: mRange.end };
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      periodText = `Month: ${monthNames[parseInt(month, 10) - 1]} ${year}`;
    }

    if (category && category !== 'All') query.category = category.trim();
    if (paymentMethod && paymentMethod !== 'All') query.paymentMethod = paymentMethod.trim();

    const report = await generateReportBreakdown(query);
    const branding = await getSchoolBranding();

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    const filename = `Expense_Report_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Header Branding
    doc.fillColor('#0F172A').fontSize(18).font('Helvetica-Bold').text(branding.schoolName, { align: 'center' });
    if (branding.logoSubtext) {
      doc.fillColor('#64748B').fontSize(10).font('Helvetica').text(branding.logoSubtext, { align: 'center' });
    }
    doc.moveDown(0.5);

    // Title & Report Meta
    doc.fillColor('#1E293B').fontSize(14).font('Helvetica-Bold').text('SCHOOL EXPENSE MANAGEMENT REPORT', { align: 'center' });
    doc.fillColor('#475569').fontSize(10).font('Helvetica').text(periodText, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
    doc.moveDown(1);

    // Horizontal divider
    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);

    // Summary Box
    doc.rect(40, doc.y, 515, 50).fillAndStroke('#F8FAFC', '#E2E8F0');
    const boxY = doc.y + 12;
    doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('TOTAL EXPENSES', 60, boxY);
    doc.fillColor('#0F172A').fontSize(16).font('Helvetica-Bold').text(`Rs. ${report.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 60, boxY + 14);

    doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('TRANSACTIONS', 240, boxY);
    doc.fillColor('#0F172A').fontSize(16).font('Helvetica-Bold').text(String(report.totalCount), 240, boxY + 14);

    doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('CATEGORIES ACTIVE', 400, boxY);
    doc.fillColor('#0F172A').fontSize(16).font('Helvetica-Bold').text(String(report.categories.length), 400, boxY + 14);

    doc.y = boxY + 45;
    doc.moveDown(1);

    // Category Breakdown Header
    doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('Top Expense Categories Breakdown');
    doc.moveDown(0.5);

    report.categories.slice(0, 8).forEach(cat => {
      doc.fillColor('#334155').fontSize(9).font('Helvetica').text(`${cat.category} (${cat.count} txns, ${cat.percentage}%): Rs. ${cat.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    });

    doc.moveDown(1);

    // Transactions Table Header
    doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('Recent Expense Records');
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.rect(40, tableTop, 515, 20).fill('#F1F5F9');
    doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold');
    doc.text('Date', 45, tableTop + 5);
    doc.text('Category', 110, tableTop + 5);
    doc.text('Paid To / Vendor', 210, tableTop + 5);
    doc.text('Payment', 350, tableTop + 5);
    doc.text('Amount (Rs.)', 470, tableTop + 5, { align: 'right', width: 80 });

    let rowY = tableTop + 22;
    doc.font('Helvetica').fontSize(8).fillColor('#334155');

    report.expenses.slice(0, 30).forEach((exp, i) => {
      if (rowY > 750) {
        doc.addPage();
        rowY = 40;
      }
      if (i % 2 === 1) {
        doc.rect(40, rowY - 2, 515, 16).fill('#F8FAFC');
      }
      doc.fillColor('#334155');
      doc.text(exp.dateString, 45, rowY);
      doc.text(exp.category.slice(0, 18), 110, rowY);
      doc.text((exp.paidTo || '').slice(0, 25), 210, rowY);
      doc.text(exp.paymentMethod, 350, rowY);
      doc.text(exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 470, rowY, { align: 'right', width: 80 });
      rowY += 16;
    });

    // Grand Total Row
    doc.rect(40, rowY, 515, 20).fill('#E2E8F0');
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9);
    doc.text('GRAND TOTAL', 45, rowY + 5);
    doc.text(`Rs. ${report.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, rowY + 5, { align: 'right', width: 80 });

    // Footer
    doc.fontSize(8).fillColor('#94A3B8').text(
      'Qelvora School ERP — Simple, Accurate & Audit-Ready Expense Management System',
      40,
      800,
      { align: 'center', width: 515 }
    );

    doc.end();
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
