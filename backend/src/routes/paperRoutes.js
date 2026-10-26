import express from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import Paper from '../models/Paper.js';
import NCERT_LESSONS from '../data/ncertData.js';
import { buildPdf } from '../utils/pdfGenerator.js';
import faceConfig from '../config/faceConfig.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ---------- Education Options ----------
const EDUCATION_OPTIONS = {
  standards: [
    "Nursery", "LKG", "UKG",
    "1st", "2nd", "3rd", "4th", "5th",
    "6th", "7th", "8th", "9th", "10th",
    "PUC 1st Year", "PUC 2nd Year",
    "ITI", "Diploma 1st Year", "Diploma 2nd Year", "Diploma 3rd Year",
    "Degree 1st Year", "Degree 2nd Year", "Degree 3rd Year",
    "Engineering 1st Year", "Engineering 2nd Year",
    "Engineering 3rd Year", "Engineering 4th Year",
    "MBBS", "Law", "MBA", "MA", "MSc",
    "MTech", "MPhil", "PhD"
  ],
  subjects: [
    "Mathematics", "Physics", "Chemistry", "Biology", "Science",
    "English", "Social Science", "History", "Geography", "Civics",
    "Economics", "Commerce", "Accountancy", "Business Studies",
    "Computer Science", "Coding & Programming", "Data Structures",
    "Algorithms", "Artificial Intelligence", "Machine Learning",
    "Mechanical Engineering", "Civil Engineering", "Electrical Engineering",
    "Electronics", "Anatomy", "Physiology", "Pharmacology",
    "Constitutional Law", "Criminal Law", "Hindi", "Kannada", "Sanskrit",
    "Art & Craft", "Music", "Physical Education"
  ],
  syllabuses: [
    "CBSE", "ICSE", "State Board", "NCERT",
    "Karnataka State", "Maharashtra State", "Tamil Nadu State",
    "VTU", "Anna University", "JNTU",
    "NEET", "JEE Main", "JEE Advanced", "GATE", "UPSC", "CAT", "UGC NET"
  ],
  languages: [
    "English", "Hindi", "Kannada", "Tamil", "Telugu",
    "Marathi", "Bengali", "Gujarati", "Malayalam", "Punjabi", "Urdu"
  ],
  difficulties: ["Easy", "Medium", "Hard"]
};

// ---------- Zod Validation Schema ----------
const generatePaperSchema = z.object({
  standard: z.string().min(1, 'Standard is required'),
  subject: z.string().min(1, 'Subject is required'),
  syllabus: z.string().min(1, 'Syllabus is required'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium'),
  language: z.string().default('English'),
  topic: z.string().nullable().optional(),
  total_marks: z.number().default(80),
  duration_minutes: z.number().default(180),
  mcq_count: z.number().default(10),
  two_mark_count: z.number().default(5),
  five_mark_count: z.number().default(4),
  ten_mark_count: z.number().default(2),
  include_coding: z.boolean().default(false),
  pattern: z.enum(['Standard', 'Techno']).default('Standard'),
  math_track_a_topic: z.string().nullable().optional(),
  math_track_b_topic: z.string().nullable().optional(),
  physics_topic: z.string().nullable().optional(),
  chemistry_topic: z.string().nullable().optional()
});

// ---------- Helper Prompts Generator ----------
function makeTechnoPaperPrompt(req) {
  const totalQ = req.mcq_count || 60;
  const qPerSec = Math.floor(totalQ / 4);
  const fbtPerSec = Math.floor(qPerSec / 3);
  const straightPerSec = qPerSec - fbtPerSec;
  
  const mAStraightEnd = straightPerSec;
  const mBStraightStart = mAStraightEnd + 1;
  const mBStraightEnd = mAStraightEnd + straightPerSec;
  const pStraightStart = mBStraightEnd + 1;
  const pStraightEnd = mBStraightEnd + straightPerSec;
  const cStraightStart = pStraightEnd + 1;
  const cStraightEnd = pStraightEnd + straightPerSec;
  
  const fbtMAStart = cStraightEnd + 1;
  const fbtMAEnd = cStraightEnd + fbtPerSec;
  const fbtMBStart = fbtMAEnd + 1;
  const fbtMBEnd = fbtMAEnd + fbtPerSec;
  const fbtPStart = fbtMBEnd + 1;
  const fbtPEnd = fbtMBEnd + fbtPerSec;
  const fbtCStart = fbtPEnd + 1;
  const fbtCEnd = totalQ;
  const fbtCCount = fbtCEnd - fbtCStart + 1;

  const markPerQuestion = totalQ > 0 ? req.total_marks / totalQ : 1.0;

  return (
    `Generate a complete examination question paper following the 'Techno Objective Test' multi-subject pattern. ` +
    `Output STRICT JSON with two keys: ` +
    `"paper" (the question paper markdown) and "answer_key" (the answer key markdown).\n\n` +
    `Specifications:\n` +
    `- Standard: ${req.standard}\n` +
    `- Syllabus: ${req.syllabus}\n` +
    `- Difficulty: ${req.difficulty}\n` +
    `- Language: ${req.language}\n` +
    `- Total marks: ${req.total_marks}\n` +
    `- Duration: ${req.duration_minutes} minutes\n\n` +
    `Syllabus coverage and topics:\n` +
    `- Mathematics (Track A) Topic: ${req.math_track_a_topic || 'General Algebra & Numbers'}\n` +
    `- Mathematics (Track B) Topic: ${req.math_track_b_topic || 'General Arithmetic & Mensuration'}\n` +
    `- Physics Topic: ${req.physics_topic || 'General Force & Light'}\n` +
    `- Chemistry Topic: ${req.chemistry_topic || 'General Matter & Changes'}\n\n` +
    `Structure required (Strictly numbered Q1 to Q${totalQ}, all questions are 4-option MCQs/Straight Objective type worth ${markPerQuestion.toFixed(2)} mark each):\n` +
    `- **Mathematics Track - A**: Questions 1 to ${mAStraightEnd} (${straightPerSec} questions)\n` +
    `- **Mathematics Track - B**: Questions ${mBStraightStart} to ${mBStraightEnd} (${straightPerSec} questions)\n` +
    `- **Physics**: Questions ${pStraightStart} to ${pStraightEnd} (${straightPerSec} questions)\n` +
    `- **Chemistry**: Questions ${cStraightStart} to ${cStraightEnd} (${straightPerSec} questions)\n` +
    `- **Techno Foundation Examination (FBT) Pattern**:\n` +
    `  - Math (A): Questions ${fbtMAStart} to ${fbtMAEnd} (${fbtPerSec} questions)\n` +
    `  - Math (B): Questions ${fbtMBStart} to ${fbtMBEnd} (${fbtPerSec} questions)\n` +
    `  - Physics: Questions ${fbtPStart} to ${fbtPEnd} (${fbtPerSec} questions)\n` +
    `  - Chemistry: Questions ${fbtCStart} to ${fbtCEnd} (${fbtCCount} questions)\n\n` +
    `Formatting:\n` +
    `- Use markdown with headings: ## Mathematics Track - A, ## Mathematics Track - B, ## Physics, ## Chemistry, and ## Techno Foundation Examination (FBT).\n` +
    `- Number questions sequentially from 1 to ${totalQ} across the entire paper.\n` +
    `- Answer key must mirror the question numbers 1 to ${totalQ} and give concise correct options (A, B, C, D) with short explanations.\n\n` +
    `Return only valid JSON like: {"paper": "...", "answer_key": "..."}`
  );
}

function makePaperPrompt(req) {
  const topicLine = req.topic ? `Focus topic: ${req.topic}\n` : '';
  const codingLine = req.include_coding
    ? '- Coding / Programming Section: Include 2 coding problems with full solution.\n'
    : '';

  return (
    `Generate a complete examination question paper. Output STRICT JSON with two keys: ` +
    `"paper" (the question paper markdown) and "answer_key" (the answer key markdown).\n\n` +
    `Specifications:\n` +
    `- Standard: ${req.standard}\n` +
    `- Subject: ${req.subject}\n` +
    `- Syllabus: ${req.syllabus}\n` +
    `- Difficulty: ${req.difficulty}\n` +
    `- Language: ${req.language}\n` +
    `${topicLine}` +
    `- Total marks: ${req.total_marks}\n` +
    `- Duration: ${req.duration_minutes} minutes\n\n` +
    `Sections required (each clearly labelled, with marks distribution):\n` +
    `- Section A: ${req.mcq_count} MCQ questions (1 mark each) with 4 options labelled A, B, C, D.\n` +
    `- Section B: ${req.two_mark_count} short-answer questions (2 marks each).\n` +
    `- Section C: ${req.five_mark_count} medium-answer questions (5 marks each).\n" +
    "- Section D: ${req.ten_mark_count} long-answer questions (10 marks each).\n` +
    `${codingLine}\n` +
    `Formatting:\n` +
    `- Use markdown with proper headings (## Section A, ## Section B...).\n` +
    `- Number questions sequentially within each section.\n` +
    `- Answer key must mirror the question numbering and give concise correct answers.\n` +
    `- Stay strictly within the ${req.syllabus} curriculum for ${req.standard} ${req.subject}.\n\n` +
    `Return only valid JSON like: {"paper": "...", "answer_key": "..."}`
  );
}

// ---------- API Routes ----------

// Options config endpoint
router.get('/options', (req, res) => {
  res.json(EDUCATION_OPTIONS);
});

// Lessons endpoint (utilizes in-memory cached lessons)
router.get('/lessons', (req, res) => {
  const { standard, subject } = req.query;
  if (!standard || !subject) {
    return res.status(400).json({ status: false, message: 'Missing standard or subject query parameters' });
  }

  const stdKey = standard.trim();
  const subjKey = subject.trim();

  if (!(stdKey in NCERT_LESSONS)) {
    return res.json({ lessons: [] });
  }

  const stdLessons = NCERT_LESSONS[stdKey];

  // Direct subject match (e.g. Mathematics, Physics, Chemistry, Biology)
  if (subjKey in stdLessons) {
    return res.json({ lessons: stdLessons[subjKey] });
  }

  // Fallback for "Science" -> merge Physics, Chemistry, and Biology
  if (subjKey.toLowerCase() === 'science') {
    const merged = [];
    if (stdLessons.Physics) merged.push(...stdLessons.Physics);
    if (stdLessons.Chemistry) merged.push(...stdLessons.Chemistry);
    if (stdLessons.Biology) merged.push(...stdLessons.Biology);
    return res.json({ lessons: merged });
  }

  res.json({ lessons: [] });
});

// List generated papers
router.get('/paper/list', async (req, res) => {
  try {
    const papers = await Paper.find({}, { paper: 0, answer_key: 0 }).sort({ created_at: -1 }).limit(50);
    res.json({ papers });
  } catch (error) {
    logger.error('Failed to list papers:', error);
    res.status(500).json({ status: false, message: 'Failed to retrieve papers list' });
  }
});

// Fetch detailed paper
router.get('/paper/:paper_id', async (req, res) => {
  try {
    const paper = await Paper.findOne({ id: req.params.paper_id });
    if (!paper) {
      return res.status(404).json({ status: false, message: 'Question paper not found' });
    }
    res.json(paper);
  } catch (error) {
    logger.error('Failed to get paper:', error);
    res.status(500).json({ status: false, message: 'Failed to retrieve paper details' });
  }
});

// Download PDF
router.get('/paper/:paper_id/pdf', async (req, res) => {
  try {
    const paper = await Paper.findOne({ id: req.params.paper_id });
    if (!paper) {
      return res.status(404).json({ status: false, message: 'Question paper not found' });
    }

    const reqData = paper.request || {};
    const pattern = reqData.pattern || 'Standard';

    const pdfBytes = await buildPdf(
      paper.title,
      paper.paper,
      paper.answer_key || '',
      pattern,
      reqData
    );

    const filename = `school-crm-paper-${paper.id.substring(0, 8)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBytes);
  } catch (error) {
    logger.error('Failed to generate PDF:', error);
    res.status(500).json({ status: false, message: 'Failed to build PDF document' });
  }
});

// Generate Exam Paper using Gemini (with model fallbacks and retry logic)
router.post('/paper/generate', async (req, res) => {
  // Validate request body using Zod
  const validation = generatePaperSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ status: false, message: 'Invalid payload parameters', errors: validation.error.format() });
  }

  const payload = validation.data;

  // Custom adjustments for Techno pattern
  if (payload.pattern === 'Techno') {
    if (payload.mcq_count === 10) payload.mcq_count = 60;
    if (payload.total_marks === 80) payload.total_marks = 60;
    if (payload.duration_minutes === 180) payload.duration_minutes = 90;
    payload.two_mark_count = 0;
    payload.five_mark_count = 0;
    payload.ten_mark_count = 0;
  }

  const systemMsg = 'You are Qelvora AI, an expert exam paper designer for Indian boards & universities. Always respond with valid JSON only, no markdown fences. Stay strictly within the syllabus.';
  const prompt = payload.pattern === 'Techno' ? makeTechnoPaperPrompt(payload) : makePaperPrompt(payload);
  
  let reply = null;
  let lastError = null;
  const apiKey = faceConfig.geminiApiKey;

  if (!apiKey) {
    return res.status(500).json({ status: false, message: 'Gemini API key is not configured in backend settings' });
  }

  // Iterate over models with retries
  logger.info(`[AI Paper] Requesting paper generation for Standard: ${payload.standard}, Subject: ${payload.subject}`);
  
  for (const model of faceConfig.geminiModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for paper generation

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemMsg }] }
          })
        });
        
        clearTimeout(timeout);
        const data = await response.json();

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          reply = data.candidates[0].content.parts[0].text;
          break;
        }

        lastError = data.error?.message || `Status ${response.status}`;
        logger.warn(`[AI Paper] Model ${model} attempt ${attempt + 1} failed: ${lastError}`);
      } catch (err) {
        lastError = err.message;
        logger.error(`[AI Paper] Model ${model} attempt ${attempt + 1} error: ${err.message}`);
      }
      
      if (attempt === 0) await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
    }
    if (reply) break;
  }

  if (!reply) {
    logger.warn(`[AI Paper] All Gemini models failed. Generating local mock fallback paper. Last error: ${lastError}`);
    reply = makeMockPaper(payload);
  }

  // Parse JSON from Gemini reply (tolerant of code fences)
  let raw = reply.trim();
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(json)?/, '').replace(/```$/, '').trim();
  }

  let paperMd = '';
  let answerMd = '';

  try {
    const data = JSON.parse(raw);
    paperMd = data.paper || '';
    answerMd = data.answer_key || '';
  } catch (e) {
    // Fallback if AI outputs plain text instead of strict JSON structure
    paperMd = reply;
    answerMd = '';
    logger.warn('[AI Paper] Failed to parse reply as JSON. Storing raw output.');
  }

  const paperId = crypto.randomUUID();
  const title = payload.pattern === 'Techno'
    ? `Techno Objective Test - Class ${payload.standard} (${payload.difficulty})`
    : `${payload.syllabus} - ${payload.standard} ${payload.subject} (${payload.difficulty})`;

  try {
    const paperObj = await Paper.create({
      id: paperId,
      title,
      paper: paperMd,
      answer_key: answerMd,
      request: payload
    });

    logger.info(`[AI Paper] Saved generated paper ${paperId} to MongoDB`);
    res.json({
      id: paperId,
      title,
      paper: paperMd,
      answer_key: answerMd,
      created_at: paperObj.created_at
    });
  } catch (error) {
    logger.error('Failed to save paper in MongoDB:', error);
    res.status(500).json({ status: false, message: 'Question paper generated but failed to save to database' });
  }
});

export default router;
export { EDUCATION_OPTIONS };

function makeMockPaper(payload) {
  if (payload.pattern === 'Techno') {
    const paperLines = [
      `# Techno Objective Test - Class ${payload.standard || '10th'}`,
      `**Time Allowed:** 90 Minutes  **Maximum Marks:** 60\n`,
      `## Mathematics Track - A`
    ];
    for (let i = 1; i <= 10; i++) {
      paperLines.push(`${i}. Mathematics Track A Question ${i} for standard ${payload.standard}?\n   A. Option A\n   B. Option B\n   C. Option C\n   D. Option D\n`);
    }
    
    paperLines.push(`## Mathematics Track - B`);
    for (let i = 11; i <= 20; i++) {
      paperLines.push(`${i}. Mathematics Track B Question ${i} for standard ${payload.standard}?\n   A. Option A\n   B. Option B\n   C. Option C\n   D. Option D\n`);
    }
    
    paperLines.push(`## Physics`);
    for (let i = 21; i <= 30; i++) {
      paperLines.push(`${i}. Physics Question ${i} regarding ${payload.topic || 'Mechanics'}?\n   A. Option A\n   B. Option B\n   C. Option C\n   D. Option D\n`);
    }
    
    paperLines.push(`## Chemistry`);
    for (let i = 31; i <= 40; i++) {
      paperLines.push(`${i}. Chemistry Question ${i} regarding ${payload.topic || 'Chemical Reactions'}?\n   A. Option A\n   B. Option B\n   C. Option C\n   D. Option D\n`);
    }
    
    paperLines.push(`## Techno Foundation Examination (FBT)`);
    for (let i = 41; i <= 60; i++) {
      let subj = "";
      if (41 <= i && i <= 45) subj = "Math A";
      else if (46 <= i && i <= 50) subj = "Math B";
      else if (51 <= i && i <= 55) subj = "Physics";
      else subj = "Chemistry";
      paperLines.push(`${i}. FBT (${subj}) Question ${i}?\n   A. Option A\n   B. Option B\n   C. Option C\n   D. Option D\n`);
    }

    const paperMd = paperLines.join('\n');
    
    const answerLines = [`# Answer Key\n`];
    for (let i = 1; i <= 60; i++) {
      answerLines.push(`${i}. A (Option A is correct for question ${i}.)`);
    }
    const answerMd = answerLines.join('\n');
    
    return JSON.stringify({ paper: paperMd, answer_key: answerMd });
  }

  // Standard paper
  const paperMd = `# ${payload.syllabus || 'CBSE'} ${payload.standard || '10th Standard'} ${payload.subject || 'Science'} Examination\n\n` +
    `**Time Allowed:** ${Math.floor((payload.duration_minutes || 180) / 60)} Hours  **Maximum Marks:** ${payload.total_marks || 80}\n\n` +
    `## Section A (${payload.mcq_count || 10} MCQ - 1 Mark Each)\n` +
    Array.from({ length: payload.mcq_count || 10 }, (_, idx) => 
      `${idx + 1}. Which of the following is a key concept in ${payload.subject} regarding ${payload.topic || 'Chapter 1'}?\n` +
      `   A. First Option\n` +
      `   B. Second Option\n` +
      `   C. Third Option\n` +
      `   D. Fourth Option\n`
    ).join('\n') + '\n' +
    `## Section B (${payload.two_mark_count || 5} Questions - 2 Marks Each)\n` +
    Array.from({ length: payload.two_mark_count || 5 }, (_, idx) => 
      `${idx + 1 + (payload.mcq_count || 10)}. Explain the basic principles of ${payload.subject} as they apply to ${payload.topic || 'Chapter 1'}.`
    ).join('\n') + '\n\n' +
    `## Section C (${payload.five_mark_count || 4} Questions - 5 Marks Each)\n` +
    Array.from({ length: payload.five_mark_count || 4 }, (_, idx) => 
      `${idx + 1 + (payload.mcq_count || 10) + (payload.two_mark_count || 5)}. Elaborate on the core theories of ${payload.subject} and discuss their real-world applications in detail.`
    ).join('\n') + '\n\n' +
    `## Section D (${payload.ten_mark_count || 2} Questions - 10 Marks Each)\n` +
    Array.from({ length: payload.ten_mark_count || 2 }, (_, idx) => 
      `${idx + 1 + (payload.mcq_count || 10) + (payload.two_mark_count || 5) + (payload.five_mark_count || 4)}. (a) Diagrammatically represent the main mechanisms of ${payload.subject}.\n` +
      `   (b) Solve a numerical scenario using the fundamental formulas of ${payload.subject}.`
    ).join('\n');

  const answerMd = `# Answer Key\n\n` +
    `## Section A\n` +
    Array.from({ length: payload.mcq_count || 10 }, (_, idx) => `${idx + 1}. A (Option A is correct based on the textbook definition.)`).join('\n') + '\n\n' +
    `## Section B\n` +
    Array.from({ length: payload.two_mark_count || 5 }, (_, idx) => `${idx + 1 + (payload.mcq_count || 10)}. Correct explanation containing the two key points.`).join('\n') + '\n\n' +
    `## Section C\n` +
    Array.from({ length: payload.five_mark_count || 4 }, (_, idx) => `${idx + 1 + (payload.mcq_count || 10) + (payload.two_mark_count || 5)}. Detailed essay answer containing the five required points.`).join('\n') + '\n\n' +
    `## Section D\n` +
    Array.from({ length: payload.ten_mark_count || 2 }, (_, idx) => `${idx + 1 + (payload.mcq_count || 10) + (payload.two_mark_count || 5) + (payload.five_mark_count || 4)}. (a) Correct diagram with accurate labeling.\n   (b) Calculation showing the steps and correct final answer.`).join('\n');

  return JSON.stringify({ paper: paperMd, answer_key: answerMd });
}
