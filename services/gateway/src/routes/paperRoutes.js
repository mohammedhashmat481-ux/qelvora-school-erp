import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { prisma } from '../db/prisma.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  generateMultiSubjectPaper,
  regenerateSingleQuestion,
  enforceExactMarks,
  validateAiConfig,
  redactSecrets,
  computeAutoDistribution,
  generateBlueprintPlan
} from '../lib/ai/providers.js';
import {
  extractPdfText,
  chunkDocumentText,
  retrieveRelevantChunks
} from '../lib/pdf/ragService.js';
import {
  listStudyMaterials,
  uploadStudyMaterial,
  reprocessStudyMaterial,
  deleteStudyMaterial
} from '../lib/studyMaterial/studyMaterialService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure secure Multer storage for educational PDF resources
const uploadDir = path.resolve(__dirname, '../../uploads/resources');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${cleanName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are supported for Knowledge Library upload.'));
    }
  }
});

const handlePdfUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: false,
          message: 'File size exceeds 150MB limit. Please upload a PDF under 150MB.'
        });
      }
      return res.status(400).json({ status: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ status: false, message: err.message });
    }
    next();
  });
};

const router = express.Router();

/**
 * Authorization Middleware: Allows teacher and admin roles only
 */
export const allowTeacherAndAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ status: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  const role = (req.user.role || '').toLowerCase();
  const isTeacherOrAdmin = (
    role === 'admin' ||
    role.includes('teacher') ||
    role.includes('educator') ||
    role.includes('principal') ||
    role.includes('head') ||
    role.includes('coordinator') ||
    role === 'staff'
  );

  if (!isTeacherOrAdmin) {
    return res.status(403).json({
      status: false,
      error: 'FORBIDDEN',
      message: `User role "${req.user.role}" is not authorized to access question paper management`
    });
  }
  next();
};

// Curriculum Lesson Datasets
const CLASS_SUBJECT_LESSONS = {
  '12th': {
    'Physics': [
      'Electric Charges and Fields', 'Electrostatic Potential and Capacitance', 'Current Electricity',
      'Moving Charges and Magnetism', 'Magnetism and Matter', 'Electromagnetic Induction',
      'Alternating Current', 'Electromagnetic Waves', 'Ray Optics and Optical Instruments',
      'Wave Optics', 'Dual Nature of Radiation and Matter', 'Atoms', 'Nuclei', 'Semiconductor Electronics'
    ],
    'Chemistry': [
      'Solutions', 'Electrochemistry', 'Chemical Kinetics', 'The d- and f-Block Elements',
      'Coordination Compounds', 'Haloalkanes and Haloarenes', 'Alcohols, Phenols and Ethers',
      'Aldehydes, Ketones and Carboxylic Acids', 'Amines', 'Biomolecules'
    ],
    'Biology': [
      'Sexual Reproduction in Flowering Plants', 'Human Reproduction', 'Reproductive Health',
      'Principles of Inheritance and Variation', 'Molecular Basis of Inheritance', 'Evolution',
      'Human Health and Disease', 'Microbes in Human Welfare', 'Biotechnology: Principles and Processes',
      'Biotechnology and its Applications', 'Organisms and Populations', 'Ecosystem', 'Biodiversity and Conservation'
    ],
    'Mathematics': [
      'Relations and Functions', 'Inverse Trigonometric Functions', 'Matrices', 'Determinants',
      'Continuity and Differentiability', 'Applications of Derivatives', 'Integrals',
      'Applications of Integrals', 'Differential Equations', 'Vector Algebra', 'Three Dimensional Geometry',
      'Linear Programming', 'Probability'
    ]
  },
  '11th': {
    'Physics': [
      'Units and Measurements', 'Motion in a Straight Line', 'Motion in a Plane', 'Laws of Motion',
      'Work, Energy and Power', 'System of Particles and Rotational Motion', 'Gravitation',
      'Mechanical Properties of Solids', 'Mechanical Properties of Fluids', 'Thermal Properties of Matter',
      'Thermodynamics', 'Kinetic Theory', 'Oscillations', 'Waves'
    ],
    'Chemistry': [
      'Some Basic Concepts of Chemistry', 'Structure of Atom', 'Classification of Elements and Periodicity in Properties',
      'Chemical Bonding and Molecular Structure', 'Thermodynamics', 'Equilibrium', 'Redox Reactions',
      'Organic Chemistry: Some Basic Principles and Techniques', 'Hydrocarbons'
    ],
    'Biology': [
      'The Living World', 'Biological Classification', 'Plant Kingdom', 'Animal Kingdom',
      'Morphology of Flowering Plants', 'Anatomy of Flowering Plants', 'Structural Organisation in Animals',
      'Cell: The Unit of Life', 'Biomolecules', 'Cell Cycle and Cell Division',
      'Photosynthesis in Higher Plants', 'Respiration in Plants', 'Plant Growth and Development',
      'Breathing and Exchange of Gases', 'Body Fluids and Circulation', 'Excretory Products and their Elimination',
      'Locomotion and Movement', 'Neural Control and Coordination', 'Chemical Coordination and Integration'
    ],
    'Mathematics': [
      'Sets', 'Relations and Functions', 'Trigonometric Functions', 'Complex Numbers and Quadratic Equations',
      'Linear Inequalities', 'Permutations and Combinations', 'Binomial Theorem', 'Sequences and Series',
      'Straight Lines', 'Conic Sections', 'Introduction to Three Dimensional Geometry', 'Limits and Derivatives', 'Statistics', 'Probability'
    ]
  },
  '10th': {
    'Physics': [
      'Light – Reflection and Refraction', 'The Human Eye and the Colorful World',
      'Electricity', 'Magnetic Effects of Electric Current', 'Sources of Energy'
    ],
    'Chemistry': [
      'Chemical Reactions and Equations', 'Acids, Bases and Salts', 'Metals and Non-metals',
      'Carbon and its Compounds', 'Periodic Classification of Elements'
    ],
    'Biology': [
      'Life Processes', 'Control and Coordination', 'How do Organisms Reproduce?',
      'Heredity and Evolution', 'Our Environment', 'Sustainable Management of Natural Resources'
    ],
    'Mathematics': [
      'Real Numbers', 'Polynomials', 'Pair of Linear Equations in Two Variables',
      'Quadratic Equations', 'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry',
      'Introduction to Trigonometry', 'Some Applications of Trigonometry', 'Circles',
      'Constructions', 'Areas Related to Circles', 'Surface Areas and Volumes', 'Statistics', 'Probability'
    ],
    'Science': [
      'Chemical Reactions, Acids & Bases', 'Life Processes, Control & Reproduction',
      'Light, Electricity & Magnetism', 'Carbon Compounds & Periodic Classification', 'Environment & Natural Resources'
    ],
    'Social Science': [
      'The Rise of Nationalism in Europe', 'Nationalism in India', 'The Making of a Global World',
      'Resources and Development', 'Forest and Wildlife Resources', 'Water Resources', 'Agriculture',
      'Minerals and Energy Resources', 'Power Sharing', 'Federalism', 'Gender, Religion and Caste',
      'Development', 'Sectors of the Indian Economy', 'Money and Credit', 'Globalization'
    ],
    'English': [
      'A Letter to God & Nelson Mandela', 'Stories About Flying & From the Diary of Anne Frank',
      'Glimpses of India & Madam Rides the Bus', 'The Sermon at Benares & The Proposal',
      'Formal Letter Writing & Analytical Paragraph', 'Tenses, Modals & Reported Speech'
    ]
  },
  '9th': {
    'Physics': [
      'Motion', 'Force and Laws of Motion', 'Gravitation', 'Work and Energy', 'Sound'
    ],
    'Chemistry': [
      'Matter in Our Surroundings', 'Is Matter Around Us Pure', 'Atoms and Molecules', 'Structure of the Atom'
    ],
    'Biology': [
      'The Fundamental Unit of Life', 'Tissues', 'Diversity in Living Organisms', 'Why Do We Fall Ill', 'Natural Resources'
    ],
    'Mathematics': [
      'Number Systems', 'Polynomials', 'Coordinate Geometry', 'Linear Equations in Two Variables',
      'Introduction to Euclid’s Geometry', 'Lines and Angles', 'Triangles', 'Quadrilaterals',
      'Circles', 'Heron’s Formula', 'Surface Areas and Volumes', 'Statistics'
    ],
    'Science': [
      'Matter & Atoms', 'Cell & Tissues', 'Motion & Forces', 'Work, Energy & Gravitation', 'Sound & Health'
    ]
  }
};

const MIDDLE_SCHOOL_LESSONS = {
  'Science': ['Food and Nutrition', 'Components of Food', 'Fibre to Fabric', 'Sorting Materials', 'Separation of Substances', 'Changes Around Us', 'Getting to Know Plants', 'Body Movements', 'The Living Organisms and Surroundings', 'Motion and Measurement of Distances', 'Light, Shadows and Reflections', 'Electricity and Circuits', 'Fun with Magnets', 'Water and Air'],
  'Mathematics': ['Knowing Our Numbers', 'Whole Numbers', 'Playing with Numbers', 'Basic Geometrical Ideas', 'Understanding Elementary Shapes', 'Integers', 'Fractions', 'Decimals', 'Data Handling', 'Mensuration', 'Algebra', 'Ratio and Proportion', 'Symmetry'],
  'Physics': ['Physical Quantities & Measurement', 'Force and Pressure', 'Friction', 'Sound and Resonance', 'Chemical Effects of Electric Current', 'Some Natural Phenomena', 'Light'],
  'Chemistry': ['Synthetic Fibres and Plastics', 'Materials: Metals and Non-Metals', 'Coal and Petroleum', 'Combustion and Flame'],
  'Biology': ['Crop Production and Management', 'Microorganisms: Friend and Foe', 'Conservation of Plants and Animals', 'Cell – Structure and Functions', 'Reproduction in Animals', 'Reaching the Age of Adolescence']
};

// -------------------------------------------------------------
// 1. GET /api/options - Available standards, boards, subjects
// -------------------------------------------------------------
router.get('/options', protect, allowTeacherAndAdmin, (req, res) => {
  res.json({
    status: true,
    standards: ['6th', '7th', '8th', '9th', '10th', '11th', '12th'],
    subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Science', 'Social Science', 'English'],
    syllabuses: ['CBSE', 'State Board', 'ICSE', 'NEET', 'JEE'],
    difficulties: ['Easy', 'Medium', 'Hard'],
    languages: ['English', 'Hindi']
  });
});

// -------------------------------------------------------------
// 2. GET /api/lessons - Class-specific chapters
// -------------------------------------------------------------
router.get('/lessons', protect, allowTeacherAndAdmin, (req, res) => {
  const { subject, standard } = req.query;
  const std = standard || '10th';
  const subj = subject || 'Science';

  let list = [];
  if (CLASS_SUBJECT_LESSONS[std] && CLASS_SUBJECT_LESSONS[std][subj]) {
    list = CLASS_SUBJECT_LESSONS[std][subj];
  } else if (MIDDLE_SCHOOL_LESSONS[subj]) {
    list = MIDDLE_SCHOOL_LESSONS[subj];
  } else if (CLASS_SUBJECT_LESSONS['10th']?.[subj]) {
    list = CLASS_SUBJECT_LESSONS['10th'][subj];
  } else {
    list = ['Foundational Concepts', 'Core Principles', 'Applied Systems', 'Comprehensive Chapter Review'];
  }

  res.json({
    status: true,
    success: true,
    standard: std,
    subject: subj,
    lessons: list
  });
});

// -------------------------------------------------------------
// 3. POST /api/school-crm-ai/generate & POST /api/paper/generate
// -------------------------------------------------------------
// -------------------------------------------------------------
// 2.5 KNOWLEDGE LIBRARY & QUESTION PAPER RESOURCES (RAG)
// -------------------------------------------------------------

// GET /api/paper/resources - List and filter resources
router.get('/paper/resources', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const { board, standard, subject, documentType, academicYear, search } = req.query;

    const where = {};
    if (board && board !== 'all') where.board = board;
    if (standard && standard !== 'all') where.standard = standard;
    if (subject && subject !== 'all') where.subject = subject;
    if (documentType && documentType !== 'all') where.documentType = documentType;
    if (academicYear && academicYear !== 'all') where.academicYear = academicYear;
    if (search && search.trim()) {
      where.title = { contains: search.trim(), mode: 'insensitive' };
    }

    const resources = await prisma.questionPaperResource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        board: true,
        academicYear: true,
        standard: true,
        subject: true,
        chapters: true,
        documentType: true,
        fileName: true,
        filePath: true,
        fileSize: true,
        status: true,
        errorMessage: true,
        uploaderName: true,
        createdAt: true,
        updatedAt: true,
        metadata: true
      }
    });

    return res.json({ status: true, data: resources });
  } catch (err) {
    console.error('Error fetching paper resources:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/paper/resources/upload - Upload reference PDF and process RAG chunks
router.post('/paper/resources/upload', protect, allowTeacherAndAdmin, handlePdfUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: false, message: 'No PDF file was provided for upload.' });
    }

    const {
      title,
      board = 'CBSE',
      standard = '10th',
      subject = 'Physics',
      documentType = 'textbook',
      academicYear = '2024-2025'
    } = req.body;

    const result = await uploadStudyMaterial({
      file: req.file,
      title: title || req.file.originalname,
      board,
      standard,
      subject,
      chapters: req.body.chapters || [],
      documentType,
      academicYear,
      user: req.user,
      schoolId: req.user?.schoolId
    });

    return res.json({
      status: true,
      message: result.message,
      isDuplicate: result.isDuplicate,
      data: result.data
    });
  } catch (err) {
    console.error('Error uploading resource:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// GET /api/paper/resources/:id/download - Stream or download PDF file
router.get('/paper/resources/:id/download', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await prisma.questionPaperResource.findUnique({ where: { id } });
    if (!resource || !fs.existsSync(resource.filePath)) {
      return res.status(404).json({ status: false, message: 'Resource file not found on disk.' });
    }
    return res.download(resource.filePath, `${resource.title}.pdf`);
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

// DELETE /api/paper/resources/:id - Delete resource and file
router.delete('/paper/resources/:id', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteStudyMaterial(id, req.user?.id);
    return res.json({ status: true, message: result.message });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/paper/resources/:id/reprocess - Reprocess failed or warning document
router.post('/paper/resources/:id/reprocess', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await reprocessStudyMaterial(id);
    return res.json({ status: true, message: 'Document reprocessed successfully', data: updated });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 3. POST /api/school-crm-ai/generate & POST /api/paper/generate
// -------------------------------------------------------------
const handlePaperGeneration = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const body = req.body || {};
    const standard = body.standard || body.classLevel || '10th';
    const syllabus = body.syllabus || body.board || 'CBSE';

    let subjects = body.subjects;
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      subjects = body.subject ? [body.subject] : ['Science'];
    }

    let chapters = body.chapters || {};
    if (body.topic && (!chapters[subjects[0]] || chapters[subjects[0]].length === 0)) {
      chapters[subjects[0]] = [body.topic];
    }

    const totalMarks = parseInt(body.totalMarks, 10) || 80;
    const durationMinutes = parseInt(body.durationMinutes || body.duration, 10) || 180;
    const pattern = body.pattern || 'Standard Custom Pattern';
    const distributionMode = body.distributionMode || 'ai_auto';
    const teacherInstructions = body.teacherInstructions || body.instructions || '';
    const selectedResourceIds = body.selectedResourceIds || [];

    let questionDistribution = body.questionDistribution || body.distribution;
    const hasManualDist = questionDistribution && typeof questionDistribution === 'object' &&
      Object.values(questionDistribution).some(r => r && r.enabled && Number(r.count) > 0);

    if (distributionMode === 'ai_auto' || !questionDistribution || !hasManualDist || questionDistribution.isAuto) {
      questionDistribution = computeAutoDistribution(totalMarks, teacherInstructions);
    }

    const difficulty = body.difficulty || body.difficultyMix || { easy: 30, medium: 50, hard: 20 };

    const options = body.options || {
      includeAnswerKey: true,
      includeSolutions: true,
      includeMarkingScheme: true,
      schoolName: body.schoolName,
      paperTitle: body.paperTitle
    };

    // RAG RETRIEVAL: Find matching educational resources from library
    let matchingResources = [];
    if (Array.isArray(selectedResourceIds) && selectedResourceIds.length > 0) {
      matchingResources = await prisma.questionPaperResource.findMany({
        where: { id: { in: selectedResourceIds } }
      });
    } else {
      // Automatic lookup matching board, standard and subject(s)
      matchingResources = await prisma.questionPaperResource.findMany({
        where: {
          board: syllabus,
          standard,
          subject: { in: subjects }
        },
        take: 10
      });
    }

    // Extract all selected chapter names
    const allSelectedChapters = [];
    Object.values(chapters).forEach(list => {
      if (Array.isArray(list)) allSelectedChapters.push(...list);
    });

    const ragResult = retrieveRelevantChunks({
      resources: matchingResources,
      selectedChapters: allSelectedChapters,
      maxChunksPerSubject: 8
    });

    // Execute generation with RAG context and teacher instructions
    const result = await generateMultiSubjectPaper({
      standard,
      syllabus,
      subjects,
      chapters,
      pattern,
      totalMarks,
      durationMinutes,
      questionDistribution,
      difficulty,
      options,
      teacherInstructions,
      groundedContext: ragResult.contextText,
      selectedResources: ragResult.sourcesSummary
    }, userId);

    // Helper to sanitize non-ASCII/WIN-1252 incompatible characters
    const cleanForDb = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/ρ/g, 'rho')
        .replace(/Ω/g, 'Ohm')
        .replace(/θ/g, 'theta')
        .replace(/α/g, 'alpha')
        .replace(/β/g, 'beta')
        .replace(/λ/g, 'lambda')
        .replace(/π/g, 'pi')
        .replace(/₹/g, 'Rs.')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2022]/g, '*')
        .replace(/[^\x00-\x7F]/g, '');
    };

    // Save paper to database
    let savedRecord = null;
    try {
      const cleanPaper = cleanForDb(result.paper);
      const cleanAnswerKey = cleanForDb(result.answerKey);
      const cleanMarkingScheme = cleanForDb(result.markingScheme);
      const cleanTitle = cleanForDb(result.title);
      const cleanStructured = JSON.parse(cleanForDb(JSON.stringify(result.structuredData || {})));

      savedRecord = await prisma.paper.create({
        data: {
          id: result.id,
          userId: userId || null,
          provider: result.provider,
          model: result.model || '',
          title: cleanTitle,
          paper: cleanPaper,
          answerKey: cleanAnswerKey,
          markingScheme: cleanMarkingScheme,
          structuredData: cleanStructured,
          request: {
            standard,
            syllabus,
            subjects,
            chapters,
            totalMarks,
            durationMinutes,
            pattern,
            teacherInstructions,
            provider: result.provider,
            model: result.model,
            isMock: result.isMock,
            sourcesCount: ragResult.sourcesSummary.length
          }
        }
      });
    } catch (dbSaveErr) {
      console.warn('⚠️ Warning: Failed to save paper to database:', dbSaveErr.message);
    }

    return res.json({
      status: true,
      success: true,
      id: result.id,
      paper_id: result.id,
      title: result.title,
      paper: result.paper,
      paper_content: result.paper,
      answerKey: result.answerKey,
      answer_key: result.answerKey,
      markingScheme: result.markingScheme,
      marking_scheme: result.markingScheme,
      structuredData: result.structuredData,
      sourcesUsed: ragResult.sourcesSummary,
      provider: result.provider,
      model: result.model,
      isMock: result.isMock,
      totalMarks: result.totalMarks,
      durationMinutes: result.durationMinutes,
      standard: result.standard,
      subjects: result.subjects,
      createdAt: result.createdAt
    });
  } catch (err) {
    console.error('❌ Question paper generation error:', redactSecrets(err.message));

    if (err.code === 'AI_UNAVAILABLE' || err.status === 503) {
      return res.status(503).json({
        status: false,
        error: 'AI_UNAVAILABLE',
        message: 'AI is busy or not configured. Please try again.',
        details: err.details || []
      });
    }

    if (err.code === 'RATE_LIMIT_EXCEEDED' || err.status === 429) {
      return res.status(429).json({
        status: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: err.message
      });
    }

    return res.status(err.status || 500).json({
      status: false,
      error: 'GENERATION_ERROR',
      message: err.message || 'An error occurred during paper generation.'
    });
  }
};

router.post('/qelvora-ai/generate', protect, allowTeacherAndAdmin, handlePaperGeneration);
router.post('/school-crm-ai/generate', protect, allowTeacherAndAdmin, handlePaperGeneration);
router.post('/paper/generate', protect, allowTeacherAndAdmin, handlePaperGeneration);

// -------------------------------------------------------------
// 3b. POST /api/paper/plan-blueprint & POST /api/qelvora-ai/plan-blueprint
// -------------------------------------------------------------
const handleBlueprintPlan = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const body = req.body || {};
    const plan = await generateBlueprintPlan({
      standard: body.standard || body.classLevel || '10th',
      classLevel: body.classLevel || body.standard || '10th',
      syllabus: body.syllabus || body.board || 'CBSE',
      subjects: body.subjects || (body.subject ? [body.subject] : ['Science']),
      chapters: body.chapters || body.chaptersBySubject || {},
      totalMarks: parseInt(body.totalMarks, 10) || 80,
      durationMinutes: parseInt(body.durationMinutes || body.duration, 10) || 180,
      difficulty: body.difficultyMix || body.difficulty || { easy: 30, medium: 50, hard: 20 },
      teacherInstructions: body.teacherInstructions || body.instructions || '',
      questionDistribution: body.questionDistribution || body.distribution,
      distributionMode: body.distributionMode || 'ai_auto'
    }, userId);

    return res.json({
      status: true,
      message: 'Blueprint implementation plan formulated successfully',
      data: plan
    });
  } catch (err) {
    console.error('Error in handleBlueprintPlan:', err);
    return res.status(500).json({ status: false, message: err.message || 'Failed to formulate blueprint plan' });
  }
};

router.post('/paper/plan-blueprint', protect, allowTeacherAndAdmin, handleBlueprintPlan);
router.post('/qelvora-ai/plan-blueprint', protect, allowTeacherAndAdmin, handleBlueprintPlan);
router.post('/school-crm-ai/plan-blueprint', protect, allowTeacherAndAdmin, handleBlueprintPlan);

// -------------------------------------------------------------
// 4. POST /api/paper/regenerate-question - Regenerate single question
// -------------------------------------------------------------
router.post('/paper/regenerate-question', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const {
      classLevel = '10th',
      syllabus = 'CBSE',
      subject = 'Physics',
      chapter = 'Electricity',
      type = 'Short Answer',
      marks = 3,
      difficulty = 'Medium',
      teacherInstructions = ''
    } = req.body;

    const regenerated = await regenerateSingleQuestion({
      classLevel,
      syllabus,
      subject,
      chapter,
      type,
      marks,
      difficulty,
      teacherInstructions
    });

    return res.json({ status: true, question: regenerated });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 5. GET /api/paper/history - Get past papers owned by user
// -------------------------------------------------------------
router.get('/paper/history', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const role = (req.user?.role || '').toLowerCase();
    const isAdmin = role.includes('admin') || role.includes('principal') || role.includes('coordinator');

    const whereClause = isAdmin
      ? {}
      : { OR: [{ userId: userId }, { userId: null }] };

    const papers = await prisma.paper.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return res.json({ status: true, data: papers });
  } catch (err) {
    console.error('Error fetching paper history:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 6. GET /api/paper/:id - Fetch single paper by ID
// -------------------------------------------------------------
router.get('/paper/:id', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const paper = await prisma.paper.findUnique({ where: { id } });
    if (!paper) {
      return res.status(404).json({ status: false, message: 'Question paper not found' });
    }
    return res.json({ status: true, data: paper });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 7. PUT /api/paper/:id - Save edited paper & recalculate marks
// -------------------------------------------------------------
router.put('/paper/:id', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    const { title, allQuestions, targetMarks, paperMd, answerKeyMd, markingSchemeMd } = req.body;

    const existing = await prisma.paper.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Paper not found' });
    }
    if (existing.userId && existing.userId !== userId) {
      return res.status(403).json({ status: false, message: 'Unauthorized to modify this paper' });
    }

    // Auto-balance marks if allQuestions provided
    let updatedQuestions = allQuestions;
    if (Array.isArray(allQuestions) && targetMarks) {
      updatedQuestions = enforceExactMarks(allQuestions, targetMarks);
    }

    const cleanForDb = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/ρ/g, 'rho')
        .replace(/Ω/g, 'Ohm')
        .replace(/θ/g, 'theta')
        .replace(/α/g, 'alpha')
        .replace(/β/g, 'beta')
        .replace(/λ/g, 'lambda')
        .replace(/π/g, 'pi')
        .replace(/₹/g, 'Rs.')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2022]/g, '*')
        .replace(/[^\x00-\x7F]/g, '');
    };

    const cleanTitle = title ? cleanForDb(title) : existing.title;
    const cleanPaper = paperMd ? cleanForDb(paperMd) : existing.paper;
    const cleanAnswerKey = answerKeyMd ? cleanForDb(answerKeyMd) : existing.answerKey;
    const cleanMarkingScheme = markingSchemeMd ? cleanForDb(markingSchemeMd) : existing.markingScheme;
    const cleanStructured = updatedQuestions 
      ? JSON.parse(cleanForDb(JSON.stringify({ ...(existing.structuredData || {}), allQuestions: updatedQuestions }))) 
      : existing.structuredData;

    const updated = await prisma.paper.update({
      where: { id },
      data: {
        title: cleanTitle,
        paper: cleanPaper,
        answerKey: cleanAnswerKey,
        markingScheme: cleanMarkingScheme,
        structuredData: cleanStructured
      }
    });

    return res.json({ status: true, message: 'Paper updated successfully', data: updated });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 8. DELETE /api/paper/:id - Delete paper owned by requesting user
// -------------------------------------------------------------
router.delete('/paper/:id', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    const paper = await prisma.paper.findUnique({
      where: { id }
    });

    if (!paper) {
      return res.status(404).json({ status: false, message: 'Paper not found' });
    }

    if (paper.userId && paper.userId !== userId) {
      return res.status(403).json({
        status: false,
        error: 'FORBIDDEN',
        message: 'You are not authorized to delete papers created by another user'
      });
    }

    await prisma.paper.delete({
      where: { id }
    });

    return res.json({ status: true, message: 'Paper deleted successfully' });
  } catch (err) {
    console.error('Error deleting paper:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
});

export default router;

