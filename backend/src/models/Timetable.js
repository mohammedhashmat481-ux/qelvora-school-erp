import mongoose from 'mongoose';

const TimetableSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    },
    day: {
      type: String,
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    period: {
      type: Number,
      required: true
    },
    timeSlot: {
      type: String,
      required: true // e.g., "09:00-09:45"
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    date: {
      type: String, // YYYY-MM-DD
      required: false
    }
  },
  {
    timestamps: true
  }
);

// Prevent overlapping periods for the same class on the same day/date
TimetableSchema.index({ class: 1, day: 1, period: 1, date: 1 }, { unique: true });

const Timetable = mongoose.model('Timetable', TimetableSchema);
export default Timetable;
