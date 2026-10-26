import mongoose from 'mongoose';

const TeacherFeedbackSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    studentName: {
      type: String,
      required: true,
      trim: true
    },
    teacherId: {
      type: String,
      required: true,
      trim: true
    },
    teacherName: {
      type: String,
      required: true,
      trim: true
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassroomVideo',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    suggestion: {
      type: String,
      trim: true
    },
    submittedBy: {
      type: String,
      enum: ['parent', 'student'],
      default: 'parent'
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Enforce unique feedback per student user and video recording
TeacherFeedbackSchema.index({ student: 1, videoId: 1 }, { unique: true });
TeacherFeedbackSchema.index({ teacherId: 1 });

const TeacherFeedback = mongoose.model('TeacherFeedback', TeacherFeedbackSchema);
export default TeacherFeedback;
