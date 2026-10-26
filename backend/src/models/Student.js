import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    studentId: {
      type: String,
      unique: true,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    standard: {
      type: String,
      required: true
    },
    section: {
      type: String,
      required: true
    },
    rollNumber: {
      type: String
    },
    parentName: {
      type: String,
      trim: true
    },
    parentPhone: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

StudentSchema.index({ standard: 1, section: 1 });
StudentSchema.index({ user: 1 });

const Student = mongoose.model('Student', StudentSchema);
export default Student;
