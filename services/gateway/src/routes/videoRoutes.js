import express from 'express';

const router = express.Router();

const DEMO_VIDEOS = [
  {
    _id: "v1",
    id: "v1",
    title: "Grade 10 Mathematics — Quadratic Equations",
    url: "https://www.w3schools.com/html/mov_bbb.mp4",
    standard: "10th",
    section: "A",
    subject: "Mathematics",
    teacherName: "Dr. Rajesh Sharma",
    description: "Full recording of Period 1 lecture covering quadratic formulas and roots derivation.",
    createdAt: new Date().toISOString()
  },
  {
    _id: "v2",
    id: "v2",
    title: "Grade 9 Physics — Newton's Laws of Motion",
    url: "https://www.w3schools.com/html/mov_bbb.mp4",
    standard: "9th",
    section: "A",
    subject: "Physics",
    teacherName: "Priya Patel",
    description: "Interactive session on momentum and action-reaction force pairs.",
    createdAt: new Date().toISOString()
  }
];

// GET /api/videos
router.get('/', async (req, res) => {
  res.json({ status: true, data: DEMO_VIDEOS });
});

// POST /api/videos
router.post('/', async (req, res) => {
  const { title, subject, standard, section, description } = req.body || {};
  const newVideo = {
    _id: `vid-${Date.now()}`,
    id: `vid-${Date.now()}`,
    title: title || 'Classroom Recording',
    url: "https://www.w3schools.com/html/mov_bbb.mp4",
    standard: standard || '10th',
    section: section || 'A',
    subject: subject || 'General',
    teacherName: 'Faculty',
    description: description || 'Lecture video recording',
    createdAt: new Date().toISOString()
  };
  DEMO_VIDEOS.unshift(newVideo);
  res.status(201).json({ status: true, message: 'Video uploaded successfully', data: newVideo });
});

// DELETE /api/videos/:id
router.delete('/:id', async (req, res) => {
  const idx = DEMO_VIDEOS.findIndex(v => v._id === req.params.id || v.id === req.params.id);
  if (idx !== -1) {
    DEMO_VIDEOS.splice(idx, 1);
  }
  res.json({ status: true, message: 'Video deleted successfully' });
});

export default router;
