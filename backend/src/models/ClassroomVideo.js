import mongoose from 'mongoose';

const ClassroomVideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    },
    teacherName: {
      type: String,
      required: true,
      trim: true
    },
    teacherId: {
      type: String,
      required: true,
      trim: true
    },
    standard: {
      type: String,
      required: true,
      trim: true
    },
    section: {
      type: String,
      required: true,
      trim: true
    },
    thumbnailUrl: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    duration: {
      type: String,
      default: '00:00'
    },
    videoUrl: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Approved', 'Pending'],
      default: 'Approved'
    }
  },
  {
    timestamps: true
  }
);

ClassroomVideoSchema.index({ standard: 1, section: 1 });

const ClassroomVideo = mongoose.model('ClassroomVideo', ClassroomVideoSchema);
export default ClassroomVideo;
