import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './src/routes/authRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import studentRoutes from './src/routes/studentRoutes.js';
import attendanceRoutes from './src/routes/attendanceRoutes.js';
import timetableRoutes from './src/routes/timetableRoutes.js';
import subjectRoutes from './src/routes/subjectRoutes.js';
import settingsRoutes from './src/routes/settingsRoutes.js';
import vidyaProxyRoutes from './src/routes/vidyaProxyRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import leaveRoutes from './src/routes/leaveRoutes.js';
import videoRoutes from './src/routes/videoRoutes.js';
import feedbackRoutes from './src/routes/feedbackRoutes.js';
import feesRoutes from './src/routes/feesRoutes.js';
import promotionRoutes from './src/routes/promotionRoutes.js';
import previousBalanceRoutes from './src/routes/previousBalanceRoutes.js';
import paperRoutes from './src/routes/paperRoutes.js';
import summaryRoutes from './src/routes/summaryRoutes.js';
import studyMaterialRoutes from './src/routes/studyMaterialRoutes.js';
import examinationRoutes from './src/routes/examinationRoutes.js';
import onlineExamRoutes from './src/routes/onlineExamRoutes.js';
import studentAttendanceRoutes from './src/routes/studentAttendanceRoutes.js';
import reportRoutes from './src/routes/reportRoutes.js';
import aiAssistantRoutes from './src/routes/aiAssistantRoutes.js';
import homeworkRoutes from './src/routes/homeworkRoutes.js';
import noticeRoutes from './src/routes/noticeRoutes.js';
import { validateAiConfig } from './src/lib/ai/providers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from services/gateway/.env, root/.env, and cwd
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

// Validate that GEMINI_MODEL and GROQ_MODEL exist at startup
try {
  validateAiConfig();
  console.log('✅ AI Configuration Validated: GEMINI_MODEL and GROQ_MODEL loaded.');
} catch (aiCfgErr) {
  console.warn('⚠️ AI Configuration notice:', aiCfgErr.message);
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8010;

// ── Performance Middleware ──────────────────────────────────────────────────
// Gzip compression for all responses — reduces payload size 2-5×
app.use(compression({
  level: 6,         // Balanced compression level (1=fastest, 9=best compression)
  threshold: 1024,  // Only compress responses > 1 KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use(cors({
  origin: true,
  credentials: true,
  maxAge: 86400 // Cache CORS preflight for 24 hours to eliminate redundant OPTIONS roundtrips
}));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

// Add response time header for monitoring (X-Response-Time: Nms)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const dur = Date.now() - start;
    // Only log slow requests in production to avoid log spam
    if (process.env.NODE_ENV === 'production' && dur > 500) {
      console.warn(`⚠️ Slow request: ${req.method} ${req.path} → ${dur}ms`);
    }
  });
  next();
});

// Static uploads directory — with 7-day browser cache
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }
}));


// API Routes
app.use('/api', paperRoutes);
app.use('/api', summaryRoutes);
app.use('/api/study-materials', studyMaterialRoutes);
app.use('/api', adminRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/auth/attendance', attendanceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/mappings', (req, res, next) => {
  req.url = '/mappings' + (req.url === '/' ? '' : req.url);
  subjectRoutes(req, res, next);
});
app.use('/api/settings', settingsRoutes);
app.use('/api/vidya', vidyaProxyRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/promotion', promotionRoutes);
app.use('/api/previous-balance', previousBalanceRoutes);
app.use('/api/examination', examinationRoutes);
app.use('/api/online-exam', onlineExamRoutes);
app.use('/api/student-attendance', studentAttendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/notices', noticeRoutes);

// Enhanced Health check endpoint with DB ping and performance metrics
app.get(['/health', '/api/health'], async (req, res) => {
  let dbStatus = 'disconnected';
  let dbLatency = null;
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
    dbLatency = `${Date.now() - start}ms`;
  } catch (e) {
    dbStatus = `error: ${e.message}`;
  }

  const mem = process.memoryUsage();
  res.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    service: 'school-crm-gateway-node',
    uptime: `${Math.floor(process.uptime())}s`,
    database: {
      status: dbStatus,
      latency: dbLatency
    },
    memory: {
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`
    },
    timestamp: new Date().toISOString()
  });
});

// Real-time Socket.io setup for live bus GPS tracking & notifications
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  // Automated notifications & GPS socket channel
  console.log(`⚡ WebSocket client connected: ${socket.id}`);

  socket.on('driver:location-update', (data) => {
    // Broadcast live bus GPS location to connected parents & admins
    io.emit('bus:location-changed', data);
  });

  socket.on('student:left-school', (data) => {
    // Broadcast left-school status alert to parent portal
    io.emit('parent:student-left-school-alert', data);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
  });
});

import { execSync } from 'child_process';
import prisma from './src/db/prisma.js';

async function initRemoteDbIfNeeded() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes('hostname') || dbUrl.includes('localhost')) {
    console.warn('ℹ️ Running with fallback demo data. Add a live PostgreSQL DATABASE_URL to persist data.');
    return;
  }

  try {
    console.log('🔄 Checking PostgreSQL connection and synchronizing tables...');
    execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
    console.log('✅ PostgreSQL tables verified/created via prisma db push.');

    const userCount = await prisma.user.count().catch(() => 0);
    if (userCount === 0) {
      console.log('🌱 Database is empty. Automatically seeding demo data...');
      execSync('node scripts/seedMasterDemoData.js', { stdio: 'inherit' });
      console.log('✅ Master demo data successfully seeded!');
    }
  } catch (err) {
    console.warn('⚠️ Database auto-initialization skipped or failed:', err.message);
  }
}

server.listen(PORT, async () => {
  console.log(`🚀 Qelvora School CRM Gateway Server running on port ${PORT}`);
  await initRemoteDbIfNeeded();
});

export { app, server, io };
