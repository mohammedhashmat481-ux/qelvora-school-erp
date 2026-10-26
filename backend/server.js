import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import http from 'http';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { spawn } from 'child_process';
import cluster from 'cluster';
import os from 'os';

// Safety net
process.on('uncaughtException', (err) => {
  console.error('[Safety Net] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Safety Net] Unhandled Rejection at:', promise, 'reason:', reason);
});

import mongoose from 'mongoose';
import { loadModels } from './src/services/faceService.js';
import paperRoutes from './src/routes/paperRoutes.js';
import connectDB from './src/config/db.js';
import { initSocket } from './src/config/socket.js';
import authRoutes from './src/routes/authRoutes.js';
import settingsRoutes from './src/routes/settingsRoutes.js';
import facultyRoutes from './src/routes/facultyRoutes.js';
import classRoutes from './src/routes/classRoutes.js';
import subjectRoutes from './src/routes/subjectRoutes.js';
import timetableRoutes from './src/routes/timetableRoutes.js';
import attendanceRoutes from './src/routes/attendanceRoutes.js';
import leaveRoutes from './src/routes/leaveRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import roleRoutes from './src/routes/roleRoutes.js';
import studentRoutes from './src/routes/studentRoutes.js';
import videoRoutes from './src/routes/videoRoutes.js';
import feedbackRoutes from './src/routes/feedbackRoutes.js';

const startWorker = () => {
  const app = express();
  const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Database Connection
connectDB();

// Create uploads folder if missing
const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Global Middlewares
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

// Always allow the production domain
allowedOrigins.push('https://iqraedu.in');
allowedOrigins.push('https://www.iqraedu.in');

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowedOpt => {
      if (allowedOpt === '*') return true;
      return allowedOpt.toLowerCase() === origin.toLowerCase();
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY] CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'X-Profile-Role', 'x-profile-role']
}));
// Security headers
app.use(helmet());

// Prevent NoSQL injection
app.use(mongoSanitize());

// Prevent HTTP parameter pollution
app.use(hpp());

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { status: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' || process.env.ENVIRONMENT === 'development'
});
app.use(globalLimiter);

// Strict rate limiter for auth endpoints and routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { status: false, message: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' || process.env.ENVIRONMENT === 'development'
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/face-login', authLimiter);
app.use('/api/auth/verify-face', authLimiter);
app.use('/api/auth/check-user', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/school-settings', settingsRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check route
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'UP',
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// AI Assistant & Paper Generation routes
app.use('/api', paperRoutes);

// Direct Gemini API Summary Generator — with retries and fallback
app.post('/api/summary', async (req, res) => {
  const { standard, subject, topic } = req.body;
  if (!topic || !subject || !standard) {
    return res.status(400).json({ status: false, message: 'Missing required fields: standard, subject, topic' });
  }

  let GEMINI_KEY = process.env.EMERGENT_LLM_KEY
    || process.env.GEMINI_API_KEY
    || process.env.GOOGLE_API_KEY
    || process.env.GEMINI_KEY;

  if (GEMINI_KEY && GEMINI_KEY.startsWith("QVEu")) {
    GEMINI_KEY = Buffer.from(GEMINI_KEY, 'base64').toString('utf-8');
  }

  if (!GEMINI_KEY) {
    console.warn('[Summary] No Gemini API key configured in environment variables.');
  }

  const prompt = `Generate a comprehensive, student-friendly academic summary for the topic '${topic}' of the subject '${subject}' for standard/level '${standard}'. Explain the key concepts, main definitions, and important points clearly. Use clean markdown formatting with headings, bullet points, and code blocks if applicable.`;
  const systemMsg = 'You are Qelvora AI, an expert academic tutor. Provide accurate, pedagogically-sound summaries.';

  // Try multiple models in order of preference
  const models = ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = null;

  for (const model of models) {
    // Retry each model up to 2 times
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const apiRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemMsg }] }
          })
        });
        clearTimeout(timeout);

        const data = await apiRes.json();

        if (apiRes.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          return res.json({ summary: data.candidates[0].content.parts[0].text });
        }

        lastError = data.error?.message || `Model ${model} returned status ${apiRes.status}`;
        console.error(`[Summary] Model ${model} attempt ${attempt + 1} failed:`, lastError);
      } catch (err) {
        lastError = err.message;
        console.error(`[Summary] Model ${model} attempt ${attempt + 1} exception:`, err.message);
      }

      // Brief backoff before retry
      if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
    }
  }

  // All API calls failed — return a locally-generated structured summary so the user always gets content
  console.warn(`[Summary] All Gemini models failed. Generating local fallback summary. Last error: ${lastError}`);
  const fallback = `# ${topic} — ${subject} (${standard})\n\n` +
    `## Overview\n` +
    `**${topic}** is an important topic in **${subject}** for **${standard}** students. ` +
    `This summary covers the key concepts and definitions you need to know.\n\n` +
    `## Key Concepts\n` +
    `- **Definition**: ${topic} refers to the fundamental principles and ideas central to this area of ${subject}.\n` +
    `- **Importance**: Understanding ${topic} is essential for building a strong foundation in ${subject}.\n` +
    `- **Applications**: The concepts of ${topic} are widely applied in real-world scenarios and higher-level studies.\n\n` +
    `## Important Points to Remember\n` +
    `1. Start by understanding the basic definitions and terminology related to ${topic}.\n` +
    `2. Practice with examples and solve related questions from your textbook.\n` +
    `3. Make notes on key formulas, dates, or definitions associated with ${topic}.\n` +
    `4. Review previous year question papers for questions on ${topic}.\n\n` +
    `## Study Tips\n` +
    `- Break down ${topic} into smaller sub-topics for easier understanding.\n` +
    `- Use diagrams, flowcharts, or mind maps to visualize the concepts.\n` +
    `- Discuss with classmates or teachers if you find any concept difficult.\n\n` +
    `> **Note**: This is a general overview. For a detailed AI-generated summary, please try again in a moment — the AI service may be temporarily busy.`;

  return res.json({ summary: fallback });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[ERROR] Unhandled:', err.stack);
  res.status(500).json({ status: false, message: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Node Server running on port ${PORT}`);
  
  // Load YuNet and SFace models on startup
  loadModels()
    .then(() => {
      console.log('[BIOMETRIC] Biometric models loaded successfully on boot.');
    })
    .catch((err) => {
      console.error('[BIOMETRIC] Critical error: failed to initialize models on boot:', err.message);
    });

  // Self-ping to keep Render container awake (prevent cold-starts)
  const selfPing = () => {
    const url = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
    if (url) {
      console.log(`[Self-Ping] Pinging self at ${url} to keep container awake...`);
      fetch(url)
        .then(res => console.log(`[Self-Ping] Status: ${res.status}`))
        .catch(err => console.error(`[Self-Ping] Error:`, err.message));
    }
  };

  if (process.env.RENDER_EXTERNAL_URL || process.env.APP_URL) {
    // Ping every 10 minutes
    setInterval(selfPing, 600000);
    // Initial ping after 1 minute
    setTimeout(selfPing, 60000);
  }
});

};

// Cluster orchestration (Load Balancing)
if (cluster.isPrimary && process.env.USE_CLUSTER === 'true') {
  const numCPUs = os.cpus().length;
  console.log(`Primary ${process.pid} is running. Forking ${numCPUs} workers for load balancing...`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died. Forking new worker...`);
    cluster.fork();
  });
} else {
  startWorker();
}
