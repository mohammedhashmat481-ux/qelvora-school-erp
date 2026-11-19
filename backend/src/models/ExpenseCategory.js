import mongoose from 'mongoose';

const ExpenseCategorySchema = new mongoose.Schema(
  {
    schoolId: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    color: {
      type: String,
      trim: true,
      default: '#3B82F6'
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isDefault: {
      type: Boolean,
      default: false
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
    }
  },
  {
    timestamps: true
  }
);

ExpenseCategorySchema.index({ schoolId: 1, name: 1 }, { unique: true });

export const ExpenseCategory = mongoose.models.ExpenseCategory || mongoose.model('ExpenseCategory', ExpenseCategorySchema);
export default ExpenseCategory;
