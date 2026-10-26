import mongoose from 'mongoose';

const PaperSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  paper: {
    type: String,
    required: true
  },
  answer_key: {
    type: String,
    default: ''
  },
  request: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  created_at: {
    type: String,
    default: () => new Date().toISOString()
  }
});

// Create model if not already compiled
const Paper = mongoose.models.Paper || mongoose.model('Paper', PaperSchema, 'papers');

export default Paper;
