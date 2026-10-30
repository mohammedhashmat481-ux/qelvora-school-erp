import express from 'express';
import axios from 'axios';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5010';
const AI_INTERNAL_SECRET = process.env.AI_INTERNAL_SECRET || 'internal_shared_secret_school_crm_ai_service_token';

// Proxy all /api/vidya requests to private Python AI microservice
router.all('/*', protect, async (req, res) => {
  try {
    const targetUrl = `${AI_SERVICE_URL}/api/vidya${req.path}`;
    const aiRes = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      params: req.query,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-ai-secret': AI_INTERNAL_SECRET
      }
    });

    res.status(aiRes.status).json(aiRes.data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    res.status(500).json({ error: 'Failed to connect to internal AI microservice', details: err.message });
  }
});

export default router;
