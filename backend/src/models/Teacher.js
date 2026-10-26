import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: false,
      trim: true
    },
    qualification: {
      type: String,
      required: true
    },
    experience: {
      type: Number, // in years
      required: true,
      default: 0
    },
    qualificationsList: {
      type: [
        {
          degree: String,
          institution: String,
          year: String
        }
      ],
      default: []
    },
    experienceList: {
      type: [
        {
          role: String,
          institution: String,
          duration: String
        }
      ],
      default: []
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'On Leave'],
      default: 'Active'
    },
    primary_subject: {
      type: String,
      default: '',
      trim: true
    },
    secondary_subject: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const Teacher = mongoose.model('Teacher', TeacherSchema);
export default Teacher;
