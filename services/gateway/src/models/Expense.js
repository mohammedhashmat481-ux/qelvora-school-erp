import mongoose from 'mongoose';

const AuditHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DELETE', 'RESTORE'],
      required: true
    },
    performedBy: {
      id: String,
      name: String,
      role: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const ExpenseSchema = new mongoose.Schema(
  {
    schoolId: {
      type: String,
      required: [true, 'School ID is required'],
      index: true,
      trim: true
    },
    expenseNumber: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    date: {
      type: Date,
      required: [true, 'Expense date is required'],
      index: true
    },
    dateString: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      trim: true,
      index: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExpenseCategory',
      default: null
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Expense amount must be greater than zero']
    },
    amountPaise: {
      type: Number,
      required: true,
      min: [1, 'Expense amount in paise must be at least 1']
    },
    paidTo: {
      type: String,
      required: [true, 'Paid To / Vendor Name is required'],
      trim: true,
      maxlength: [150, 'Vendor name cannot exceed 150 characters']
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'],
      default: 'Cash',
      index: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: ''
    },
    receiptUrl: {
      type: String,
      default: ''
    },
    receiptFileName: {
      type: String,
      default: ''
    },
    academicYear: {
      type: String,
      default: '2026-2027',
      index: true
    },
    createdBy: {
      id: String,
      name: String,
      role: String
    },
    updatedBy: {
      id: String,
      name: String,
      role: String
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      id: String,
      name: String,
      role: String
    },
    auditHistory: [AuditHistorySchema]
  },
  {
    timestamps: true
  }
);

// High performance compound indexes for fast filtering and reporting
ExpenseSchema.index({ schoolId: 1, isDeleted: 1, date: -1 });
ExpenseSchema.index({ schoolId: 1, isDeleted: 1, dateString: 1 });
ExpenseSchema.index({ schoolId: 1, isDeleted: 1, category: 1 });
ExpenseSchema.index({ schoolId: 1, isDeleted: 1, paymentMethod: 1 });

export const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
export default Expense;
