import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import xlsx from 'xlsx';
import { prisma, formatLegacyId } from '../db/prisma.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 150 * 1024 * 1024 } });

// =========================================================================
// HELPER UTILITIES
// =========================================================================

/**
 * Fisher-Yates array shuffle (returns a new shuffled array)
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Evaluate an attempt against the frozen exam question snapshots
 */
async function evaluateAttemptOnServer(attemptId, prismaClient = prisma) {
  const attempt = await prismaClient.onlineExamAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          questions: true
        }
      },
      answers: true
    }
  });

  if (!attempt) throw new Error('Attempt not found for evaluation');

  const exam = attempt.exam;
  const questionsMap = new Map();
  exam.questions.forEach(eq => {
    // eq.questionSnapshot is JSON containing { id, questionText, type, marks, negativeMarks, options: [...] }
    const snapshot = typeof eq.questionSnapshot === 'string' 
      ? JSON.parse(eq.questionSnapshot) 
      : eq.questionSnapshot;
    questionsMap.set(eq.questionId, {
      ...snapshot,
      effectiveMarks: Number(eq.marks ?? snapshot.marks ?? 1.0),
      effectiveNegativeMarks: Number(eq.negativeMarks ?? (exam.negativeMarking ? (exam.negativeMarkValue || snapshot.negativeMarks || 0) : 0))
    });
  });

  let totalQuestions = exam.questions.length;
  let answeredCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let totalScore = 0.0;
  let totalPossibleScore = 0.0;

  // Track answer updates
  const answerUpdates = [];

  for (const [qId, qData] of questionsMap.entries()) {
    const qMarks = qData.effectiveMarks;
    const qNeg = qData.effectiveNegativeMarks;
    totalPossibleScore += qMarks;

    const studentAnswer = attempt.answers.find(a => a.questionId === qId);
    const selectedKeys = studentAnswer?.selectedOptionKeys || [];

    // Find correct option keys from snapshot
    const correctKeys = (qData.options || [])
      .filter(o => o.isCorrect)
      .map(o => String(o.optionKey).trim().toUpperCase());

    if (!selectedKeys || selectedKeys.length === 0) {
      unansweredCount++;
      if (studentAnswer) {
        answerUpdates.push({
          id: studentAnswer.id,
          isCorrect: false,
          marksAwarded: 0.0,
          isAnswered: false,
          evaluatedAt: new Date()
        });
      }
    } else {
      answeredCount++;
      const normSelected = selectedKeys.map(k => String(k).trim().toUpperCase());

      if (qData.type === 'MULTIPLE_CHOICE' && exam.allowPartialCredit) {
        // Partial credit scoring:
        // + (marks / totalCorrect) per correct selected
        // - (marks / totalCorrect) per wrong selected
        let awarded = 0.0;
        const totalCorrect = Math.max(1, correctKeys.length);
        const markPerCorrect = qMarks / totalCorrect;

        let numCorrectSelected = 0;
        let numWrongSelected = 0;

        normSelected.forEach(sel => {
          if (correctKeys.includes(sel)) numCorrectSelected++;
          else numWrongSelected++;
        });

        awarded = (numCorrectSelected * markPerCorrect) - (numWrongSelected * markPerCorrect);
        if (awarded < 0) awarded = 0; // Don't award negative within partial question

        const isFullyCorrect = numWrongSelected === 0 && numCorrectSelected === correctKeys.length;
        if (isFullyCorrect) correctCount++;
        else incorrectCount++;

        totalScore += awarded;
        answerUpdates.push({
          id: studentAnswer.id,
          isCorrect: isFullyCorrect,
          marksAwarded: Number(awarded.toFixed(2)),
          isAnswered: true,
          evaluatedAt: new Date()
        });
      } else {
        // Single choice or all-or-nothing multi-choice
        const isSetEqual = correctKeys.length === normSelected.length && 
          correctKeys.every(k => normSelected.includes(k));

        if (isSetEqual) {
          correctCount++;
          totalScore += qMarks;
          answerUpdates.push({
            id: studentAnswer.id,
            isCorrect: true,
            marksAwarded: qMarks,
            isAnswered: true,
            evaluatedAt: new Date()
          });
        } else {
          incorrectCount++;
          const penalty = exam.negativeMarking ? qNeg : 0;
          totalScore -= penalty;
          answerUpdates.push({
            id: studentAnswer.id,
            isCorrect: false,
            marksAwarded: -penalty,
            isAnswered: true,
            evaluatedAt: new Date()
          });
        }
      }
    }
  }

  // Cap score: minimum 0 (unless negative score explicitly allowed)
  if (totalScore < 0) totalScore = 0.0;
  totalScore = Number(totalScore.toFixed(2));
  totalPossibleScore = Number(totalPossibleScore.toFixed(2));

  const percentage = totalPossibleScore > 0 
    ? Number(((totalScore / totalPossibleScore) * 100).toFixed(2)) 
    : 0.0;
  const isPassed = totalScore >= exam.passingMarks;

  // Persist answers evaluation
  for (const au of answerUpdates) {
    await prismaClient.onlineAttemptAnswer.update({
      where: { id: au.id },
      data: {
        isCorrect: au.isCorrect,
        marksAwarded: au.marksAwarded,
        isAnswered: au.isAnswered,
        evaluatedAt: au.evaluatedAt
      }
    });
  }

  // Update attempt status and summary
  const updatedAttempt = await prismaClient.onlineExamAttempt.update({
    where: { id: attemptId },
    data: {
      status: 'EVALUATED',
      totalQuestions,
      answeredCount,
      correctCount,
      incorrectCount,
      unansweredCount,
      scoreObtained: totalScore,
      totalPossibleScore,
      percentage,
      isPassed
    }
  });

  return updatedAttempt;
}

// =========================================================================
// 1. QUESTION BANK APIs
// =========================================================================

/**
 * GET /api/online-exam/questions/metadata
 * Get counts, distinct subjects, topics, and difficulties
 */
router.get('/questions/metadata', protect, async (req, res) => {
  try {
    const questions = await prisma.onlineQuestion.findMany({
      where: { status: { not: 'ARCHIVED' } },
      select: { subject: true, topic: true, difficulty: true, type: true }
    });

    const subjects = [...new Set(questions.map(q => q.subject).filter(Boolean))].sort();
    const topics = [...new Set(questions.map(q => q.topic).filter(Boolean))].sort();
    const difficulties = ['EASY', 'MEDIUM', 'HARD'];

    const countByDifficulty = {
      EASY: questions.filter(q => q.difficulty === 'EASY').length,
      MEDIUM: questions.filter(q => q.difficulty === 'MEDIUM').length,
      HARD: questions.filter(q => q.difficulty === 'HARD').length
    };

    const countBySubject = {};
    subjects.forEach(s => {
      countBySubject[s] = questions.filter(q => q.subject === s).length;
    });

    res.json({
      success: true,
      data: {
        total: questions.length,
        subjects,
        topics,
        difficulties,
        countByDifficulty,
        countBySubject
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/online-exam/questions
 * List questions with search, filters, and pagination
 */
router.get('/questions', protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      subject,
      topic,
      difficulty,
      type,
      status = 'ACTIVE',
      search
    } = req.query;

    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (subject && subject !== 'ALL') where.subject = subject;
    if (topic && topic !== 'ALL') where.topic = topic;
    if (difficulty && difficulty !== 'ALL') where.difficulty = difficulty;
    if (type && type !== 'ALL') where.type = type;

    if (search && search.trim()) {
      where.OR = [
        { questionText: { contains: search.trim(), mode: 'insensitive' } },
        { subject: { contains: search.trim(), mode: 'insensitive' } },
        { topic: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const [total, questions] = await Promise.all([
      prisma.onlineQuestion.count({ where }),
      prisma.onlineQuestion.findMany({
        where,
        include: {
          options: {
            orderBy: { orderIndex: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    res.json({
      success: true,
      data: formatLegacyId(questions),
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/online-exam/questions/:id
 * Get single question with options
 */
/**
 * GET /api/online-exam/questions/template
 * Download clean Excel / CSV import template (accessible without token for direct browser downloads)
 */
router.get('/questions/template', (req, res) => {
  try {
    const format = (req.query.format || 'xlsx').toLowerCase();
    const templateData = [
      {
        'Subject': 'Science',
        'Chapter': 'Electricity',
        'Topic': 'Ohm Law',
        'Difficulty': 'MEDIUM',
        'Type': 'SINGLE_CHOICE',
        'Question Text': 'What is the SI unit of electrical resistance?',
        'Option A': 'Volt',
        'Option B': 'Ohm',
        'Option C': 'Ampere',
        'Option D': 'Coulomb',
        'Correct Option': 'B',
        'Marks': 1.0,
        'Negative Marks': 0.25,
        'Explanation': 'Resistance is measured in Ohms (symbol: Ω).',
        'Tags': 'physics, electricity, cbse10'
      },
      {
        'Subject': 'Science',
        'Chapter': 'Light',
        'Topic': 'Refraction',
        'Difficulty': 'EASY',
        'Type': 'SINGLE_CHOICE',
        'Question Text': 'Which of the following optical media has the highest refractive index?',
        'Option A': 'Water',
        'Option B': 'Glass',
        'Option C': 'Diamond',
        'Option D': 'Air',
        'Correct Option': 'C',
        'Marks': 1.0,
        'Negative Marks': 0,
        'Explanation': 'Diamond has an optical refractive index of approximately 2.42.',
        'Tags': 'physics, optics, cbse10'
      },
      {
        'Subject': 'Mathematics',
        'Chapter': 'Quadratic Equations',
        'Topic': 'Discriminant',
        'Difficulty': 'HARD',
        'Type': 'SINGLE_CHOICE',
        'Question Text': 'If discriminant D > 0 and not a perfect square, what is the nature of the roots?',
        'Option A': 'Real, unequal and irrational',
        'Option B': 'Real and equal',
        'Option C': 'Imaginary / No real roots',
        'Option D': 'Real, unequal and rational',
        'Correct Option': 'A',
        'Marks': 2.0,
        'Negative Marks': 0.5,
        'Explanation': 'When D > 0 and not a square, the roots are irrational conjugate pairs.',
        'Tags': 'maths, algebra, cbse10'
      }
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(templateData);
    xlsx.utils.book_append_sheet(wb, ws, 'Questions_Template');

    if (format === 'csv') {
      const csv = xlsx.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="question_bank_template.csv"');
      return res.send(csv);
    } else {
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="question_bank_template.xlsx"');
      return res.send(buf);
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/questions/:id', protect, async (req, res) => {
  try {
    const question = await prisma.onlineQuestion.findUnique({
      where: { id: req.params.id },
      include: {
        options: { orderBy: { orderIndex: 'asc' } }
      }
    });

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    res.json({ success: true, data: formatLegacyId(question) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/online-exam/questions
 * Create question in question bank
 */
router.post('/questions', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const {
      subject,
      chapter,
      topic,
      difficulty = 'MEDIUM',
      type = 'SINGLE_CHOICE',
      questionText,
      questionImage,
      marks = 1.0,
      negativeMarks = 0.0,
      explanation,
      explanationImage,
      language = 'en',
      tags = [],
      options = []
    } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Subject is mandatory' });
    }
    if (!questionText || !questionText.trim()) {
      return res.status(400).json({ success: false, message: 'Question text is mandatory' });
    }
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: 'At least 2 options are required' });
    }

    const hasCorrect = options.some(o => o.isCorrect);
    if (!hasCorrect) {
      return res.status(400).json({ success: false, message: 'At least one option must be marked as correct' });
    }

    if (type === 'SINGLE_CHOICE') {
      const correctCount = options.filter(o => o.isCorrect).length;
      if (correctCount > 1) {
        return res.status(400).json({ success: false, message: 'Single Choice question cannot have multiple correct answers' });
      }
    }

    const newQuestion = await prisma.onlineQuestion.create({
      data: {
        subject: subject.trim(),
        chapter: chapter?.trim() || null,
        topic: topic?.trim() || null,
        difficulty,
        type,
        questionText: questionText.trim(),
        questionImage: questionImage || null,
        marks: Number(marks) || 1.0,
        negativeMarks: Number(negativeMarks) || 0.0,
        explanation: explanation?.trim() || null,
        explanationImage: explanationImage || null,
        language,
        tags: Array.isArray(tags) ? tags : [],
        createdBy: req.user.name || req.user.email,
        options: {
          create: options.map((opt, idx) => ({
            optionKey: opt.optionKey || String.fromCharCode(65 + idx),
            optionText: opt.optionText || '',
            optionImage: opt.optionImage || null,
            isCorrect: Boolean(opt.isCorrect),
            orderIndex: idx
          }))
        }
      },
      include: {
        options: { orderBy: { orderIndex: 'asc' } }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Question created successfully in Question Bank',
      data: formatLegacyId(newQuestion)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/online-exam/questions/:id
 * Update question in question bank
 */
router.put('/questions/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      subject,
      chapter,
      topic,
      difficulty,
      type,
      questionText,
      questionImage,
      marks,
      negativeMarks,
      explanation,
      explanationImage,
      language,
      tags,
      options,
      status
    } = req.body;

    const existing = await prisma.onlineQuestion.findUnique({
      where: { id },
      include: { options: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Replace options if provided
    if (Array.isArray(options) && options.length >= 2) {
      const hasCorrect = options.some(o => o.isCorrect);
      if (!hasCorrect) {
        return res.status(400).json({ success: false, message: 'At least one option must be marked as correct' });
      }

      await prisma.onlineQuestionOption.deleteMany({ where: { questionId: id } });
      await prisma.onlineQuestionOption.createMany({
        data: options.map((opt, idx) => ({
          questionId: id,
          optionKey: opt.optionKey || String.fromCharCode(65 + idx),
          optionText: opt.optionText || '',
          optionImage: opt.optionImage || null,
          isCorrect: Boolean(opt.isCorrect),
          orderIndex: idx
        }))
      });
    }

    const updated = await prisma.onlineQuestion.update({
      where: { id },
      data: {
        subject: subject !== undefined ? subject.trim() : existing.subject,
        chapter: chapter !== undefined ? chapter?.trim() : existing.chapter,
        topic: topic !== undefined ? topic?.trim() : existing.topic,
        difficulty: difficulty || existing.difficulty,
        type: type || existing.type,
        questionText: questionText !== undefined ? questionText.trim() : existing.questionText,
        questionImage: questionImage !== undefined ? questionImage : existing.questionImage,
        marks: marks !== undefined ? Number(marks) : existing.marks,
        negativeMarks: negativeMarks !== undefined ? Number(negativeMarks) : existing.negativeMarks,
        explanation: explanation !== undefined ? explanation?.trim() : existing.explanation,
        explanationImage: explanationImage !== undefined ? explanationImage : existing.explanationImage,
        language: language || existing.language,
        tags: Array.isArray(tags) ? tags : existing.tags,
        status: status || existing.status
      },
      include: {
        options: { orderBy: { orderIndex: 'asc' } }
      }
    });

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: formatLegacyId(updated)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/online-exam/questions/:id/duplicate
 * Duplicate question
 */
router.post('/questions/:id/duplicate', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const question = await prisma.onlineQuestion.findUnique({
      where: { id: req.params.id },
      include: { options: true }
    });

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const duplicated = await prisma.onlineQuestion.create({
      data: {
        subject: question.subject,
        chapter: question.chapter,
        topic: question.topic,
        difficulty: question.difficulty,
        type: question.type,
        questionText: `${question.questionText} (Copy)`,
        questionImage: question.questionImage,
        marks: question.marks,
        negativeMarks: question.negativeMarks,
        explanation: question.explanation,
        explanationImage: question.explanationImage,
        language: question.language,
        tags: question.tags,
        status: 'ACTIVE',
        createdBy: req.user.name || req.user.email,
        options: {
          create: question.options.map(o => ({
            optionKey: o.optionKey,
            optionText: o.optionText,
            optionImage: o.optionImage,
            isCorrect: o.isCorrect,
            orderIndex: o.orderIndex
          }))
        }
      },
      include: {
        options: { orderBy: { orderIndex: 'asc' } }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Question duplicated successfully',
      data: formatLegacyId(duplicated)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/online-exam/questions/:id
 * Soft delete/archive question
 */
router.delete('/questions/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    // Check if question is used in any published exam
    const usedInExams = await prisma.onlineExamQuestion.count({
      where: { questionId: id }
    });

    if (usedInExams > 0) {
      // Soft-archive to preserve references
      await prisma.onlineQuestion.update({
        where: { id },
        data: { status: 'ARCHIVED' }
      });
      return res.json({
        success: true,
        message: 'Question archived because it is referenced in exams'
      });
    }

    // Otherwise complete delete
    await prisma.onlineQuestion.delete({ where: { id } });
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/online-exam/questions/template
 * Download clean Excel / CSV import template
 */
router.get('/questions/template', protect, (req, res) => {
  try {
    const format = (req.query.format || 'xlsx').toLowerCase();
    const templateData = [
      {
        'Subject': 'Science',
        'Chapter': 'Electricity',
        'Topic': 'Ohm Law',
        'Difficulty': 'MEDIUM',
        'Type': 'SINGLE_CHOICE',
        'Question Text': 'What is the SI unit of electrical resistance?',
        'Option A': 'Volt',
        'Option B': 'Ohm',
        'Option C': 'Ampere',
        'Option D': 'Coulomb',
        'Correct Option': 'B',
        'Marks': 1.0,
        'Negative Marks': 0.25,
        'Explanation': 'Resistance is measured in Ohms (symbol: Ω).',
        'Tags': 'physics, electricity, cbse10'
      },
      {
        'Subject': 'Mathematics',
        'Chapter': 'Quadratic Equations',
        'Topic': 'Discriminant',
        'Difficulty': 'EASY',
        'Type': 'SINGLE_CHOICE',
        'Question Text': 'If discriminant D > 0, the roots of the quadratic equation are:',
        'Option A': 'Real and Equal',
        'Option B': 'Real and Distinct',
        'Option C': 'Imaginary / No real roots',
        'Option D': 'Undefined',
        'Correct Option': 'B',
        'Marks': 1.0,
        'Negative Marks': 0.25,
        'Explanation': 'For D = b^2 - 4ac > 0, roots are real and unequal/distinct.',
        'Tags': 'maths, algebra, cbse10'
      }
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(templateData);
    xlsx.utils.book_append_sheet(wb, ws, 'Questions_Template');

    if (format === 'csv') {
      const csv = xlsx.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="question_bank_template.csv"');
      return res.send(csv);
    } else {
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="question_bank_template.xlsx"');
      return res.send(buf);
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/online-exam/questions/export
 * Export question bank to Excel/CSV with applied filters
 */
router.get('/questions/export', protect, async (req, res) => {
  try {
    const { subject, difficulty, format = 'xlsx' } = req.query;
    const where = { status: { not: 'ARCHIVED' } };
    if (subject && subject !== 'ALL') where.subject = subject;
    if (difficulty && difficulty !== 'ALL') where.difficulty = difficulty;

    const questions = await prisma.onlineQuestion.findMany({
      where,
      include: {
        options: { orderBy: { orderIndex: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const exportRows = questions.map(q => {
      const optA = q.options.find(o => o.optionKey === 'A')?.optionText || '';
      const optB = q.options.find(o => o.optionKey === 'B')?.optionText || '';
      const optC = q.options.find(o => o.optionKey === 'C')?.optionText || '';
      const optD = q.options.find(o => o.optionKey === 'D')?.optionText || '';
      const correctKeys = q.options.filter(o => o.isCorrect).map(o => o.optionKey).join(', ');

      return {
        'ID': q.id,
        'Subject': q.subject,
        'Chapter': q.chapter || '',
        'Topic': q.topic || '',
        'Difficulty': q.difficulty,
        'Type': q.type,
        'Question Text': q.questionText,
        'Option A': optA,
        'Option B': optB,
        'Option C': optC,
        'Option D': optD,
        'Correct Option': correctKeys,
        'Marks': q.marks,
        'Negative Marks': q.negativeMarks,
        'Explanation': q.explanation || '',
        'Status': q.status
      };
    });

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(exportRows);
    xlsx.utils.book_append_sheet(wb, ws, 'QuestionBank');

    if (format === 'csv') {
      const csv = xlsx.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="question_bank_export.csv"');
      return res.send(csv);
    } else {
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="question_bank_export.xlsx"');
      return res.send(buf);
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/online-exam/questions/import
 * Bulk upload and import questions from Excel or CSV
 */
/**
 * POST /api/online-exam/upload-paper
 * Upload official question paper file (PDF, DOCX, XLSX, etc.) up to 150MB
 */
router.post('/upload-paper', protect, authorize('admin', 'teacher'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No question paper file provided' });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'question_papers');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${sanitizedName}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);

    const fileUrl = `/uploads/question_papers/${filename}`;
    const isSpreadsheet = Boolean(req.file.originalname.match(/\.(xlsx|xls|csv)$/i));

    res.json({
      success: true,
      message: `Question paper "${req.file.originalname}" (${(req.file.size / 1024).toFixed(1)} KB) uploaded successfully!`,
      data: {
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        isSpreadsheet
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/questions/import', protect, authorize('admin', 'teacher'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel, CSV, or PDF file' });
    }

    const isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');
    const isDoc = req.file.originalname.toLowerCase().endsWith('.doc') || req.file.originalname.toLowerCase().endsWith('.docx');

    if (isPdf || isDoc) {
      // Save question paper file to uploads directory
      const uploadsDir = path.join(process.cwd(), 'uploads', 'question_papers');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `${Date.now()}-${sanitizedName}`;
      fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
      const fileUrl = `/uploads/question_papers/${filename}`;

      const targetExamId = req.body?.examId || req.query?.examId;
      if (targetExamId) {
        try {
          await prisma.onlineExam.update({
            where: { id: targetExamId },
            data: {
              questionPaperUrl: fileUrl,
              questionPaperName: req.file.originalname,
              questionPaperSize: req.file.size
            }
          });
        } catch (e) {
          console.error('Error updating exam with paper info:', e);
        }
      }

      return res.json({
        success: true,
        isPdf: true,
        message: `Question paper "${req.file.originalname}" (${(req.file.size / 1024).toFixed(1)} KB) uploaded and attached successfully!`,
        paperUrl: fileUrl,
        paperName: req.file.originalname,
        paperSize: req.file.size,
        questionIds: []
      });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Uploaded file is empty' });
    }

    const errors = [];
    const validQuestions = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // header is row 1
      const subject = String(row['Subject'] || row['subject'] || '').trim();
      const questionText = String(row['Question Text'] || row['Question'] || row['questionText'] || '').trim();
      const optA = String(row['Option A'] || row['optionA'] || '').trim();
      const optB = String(row['Option B'] || row['optionB'] || '').trim();
      const optC = String(row['Option C'] || row['optionC'] || '').trim();
      const optD = String(row['Option D'] || row['optionD'] || '').trim();
      const correctRaw = String(row['Correct Option'] || row['Correct'] || row['correctOption'] || '').trim().toUpperCase();
      const difficulty = String(row['Difficulty'] || row['difficulty'] || 'MEDIUM').trim().toUpperCase();
      const type = String(row['Type'] || row['type'] || 'SINGLE_CHOICE').trim().toUpperCase();
      const marks = parseFloat(row['Marks'] || row['marks'] || '1.0');
      const negativeMarks = parseFloat(row['Negative Marks'] || row['negativeMarks'] || '0.0');
      const chapter = String(row['Chapter'] || row['chapter'] || '').trim();
      const topic = String(row['Topic'] || row['topic'] || '').trim();
      const explanation = String(row['Explanation'] || row['explanation'] || '').trim();
      const tagsRaw = String(row['Tags'] || row['tags'] || '').trim();

      const rowErrors = [];

      if (!subject) rowErrors.push('Missing Subject');
      if (!questionText) rowErrors.push('Missing Question Text');
      if (!optA || !optB) rowErrors.push('Both Option A and Option B are required');
      if (!correctRaw) rowErrors.push('Missing Correct Option');

      const options = [
        { optionKey: 'A', optionText: optA, orderIndex: 0 },
        { optionKey: 'B', optionText: optB, orderIndex: 1 }
      ];
      if (optC) options.push({ optionKey: 'C', optionText: optC, orderIndex: 2 });
      if (optD) options.push({ optionKey: 'D', optionText: optD, orderIndex: 3 });

      // Parse correct options (e.g. "A" or "A, B")
      const correctKeys = correctRaw.split(/[,;\s]+/).map(k => k.trim().toUpperCase()).filter(Boolean);
      const validKeys = options.map(o => o.optionKey);
      const invalidKeys = correctKeys.filter(k => !validKeys.includes(k));

      if (invalidKeys.length > 0) {
        rowErrors.push(`Correct Option '${correctRaw}' references non-existent option (${invalidKeys.join(',')})`);
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, errors: rowErrors, questionSnippet: questionText.slice(0, 30) });
      } else {
        const mappedOptions = options.map(o => ({
          ...o,
          isCorrect: correctKeys.includes(o.optionKey)
        }));

        validQuestions.push({
          subject,
          chapter: chapter || null,
          topic: topic || null,
          difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(difficulty) ? difficulty : 'MEDIUM',
          type: type.includes('MULTI') ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE',
          questionText,
          marks: isNaN(marks) ? 1.0 : marks,
          negativeMarks: isNaN(negativeMarks) ? 0.0 : negativeMarks,
          explanation: explanation || null,
          tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
          options: mappedOptions,
          createdBy: req.user.name || req.user.email
        });
      }
    });

    if (errors.length > 0 && validQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Import failed: All rows contain validation errors',
        errors,
        importedCount: 0,
        totalRows: rows.length
      });
    }

    // Persist valid questions
    let importedCount = 0;
    const createdQuestions = [];
    for (const q of validQuestions) {
      const createdQ = await prisma.onlineQuestion.create({
        data: {
          subject: q.subject,
          chapter: q.chapter,
          topic: q.topic,
          difficulty: q.difficulty,
          type: q.type,
          questionText: q.questionText,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          explanation: q.explanation,
          tags: q.tags,
          createdBy: q.createdBy,
          options: {
            create: q.options
          }
        },
        include: {
          options: { orderBy: { orderIndex: 'asc' } }
        }
      });
      createdQuestions.push(formatLegacyId(createdQ));
      importedCount++;
    }

    // If an examId was passed, immediately link these imported questions into the exam
    const targetExamId = req.body?.examId || req.query?.examId;
    if (targetExamId && createdQuestions.length > 0) {
      try {
        const existingExam = await prisma.onlineExam.findUnique({
          where: { id: targetExamId },
          include: { _count: { select: { questions: true } } }
        });
        if (existingExam) {
          let startIndex = existingExam._count.questions;
          for (const q of createdQuestions) {
            await prisma.onlineExamQuestion.create({
              data: {
                examId: targetExamId,
                questionId: q.id,
                orderIndex: startIndex++,
                marks: q.marks,
                negativeMarks: q.negativeMarks,
                questionSnapshot: q
              }
            });
          }
        }
      } catch (linkErr) {
        console.error('Error linking imported questions to exam:', linkErr);
      }
    }

    res.json({
      success: true,
      message: `Successfully imported ${importedCount} of ${rows.length} questions`,
      importedCount,
      failedCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      questions: createdQuestions,
      questionIds: createdQuestions.map(q => q.id)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 2. EXAM MANAGEMENT APIs
// =========================================================================

/**
 * GET /api/online-exam/exams
 * List exams with filters and counts
 */
router.get('/exams', protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      standard,
      status,
      subject,
      search
    } = req.query;

    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (standard && standard !== 'ALL') where.standard = standard;
    if (subject && subject !== 'ALL') where.subject = subject;

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { examCode: { contains: search.trim(), mode: 'insensitive' } },
        { subject: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    // Auto-update status for ACTIVE or COMPLETED if current time passed
    const now = new Date();

    const [total, exams] = await Promise.all([
      prisma.onlineExam.count({ where }),
      prisma.onlineExam.findMany({
        where,
        include: {
          questions: { select: { id: true, marks: true } },
          assignments: true,
          _count: { select: { attempts: true, questions: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    res.json({
      success: true,
      data: formatLegacyId(exams),
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/online-exam/exams/:id
 * Get full exam details with questions and assignment info
 */
router.get('/exams/:id', protect, async (req, res) => {
  try {
    const exam = await prisma.onlineExam.findUnique({
      where: { id: req.params.id },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            question: {
              include: {
                options: { orderBy: { orderIndex: 'asc' } }
              }
            }
          }
        },
        assignments: true,
        _count: { select: { attempts: true } }
      }
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    res.json({ success: true, data: formatLegacyId(exam) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/online-exam/exams
 * Create draft exam
 */
router.post('/exams', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const {
      title,
      examCode,
      description,
      instructions,
      academicYear = '2026-2027',
      standard,
      section,
      subject,
      durationMinutes = 60,
      totalMarks = 100.0,
      passingMarks = 35.0,
      negativeMarking = false,
      negativeMarkValue = 0.25,
      allowPartialCredit = false,
      maxAttempts = 1,
      shuffleQuestions = true,
      shuffleOptions = true,
      enableQuestionRandomization = false,
      randomPoolConfig = null,
      navigationMode = 'FREE',
      layoutMode = 'PAGINATED',
      resultReleaseMode = 'IMMEDIATE',
      resultReleaseTime = null,
      answerKeyReleaseMode = 'WITH_RESULTS',
      enableIntegrityShield = true,
      maxIntegrityViolations = 5,
      startDateTime,
      endDateTime,
      questionIds = [],
      assignedClasses = [],
      questionPaperUrl,
      questionPaperName,
      questionPaperSize
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Exam Title is required' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Subject is required' });
    }
    if (!startDateTime || !endDateTime) {
      return res.status(400).json({ success: false, message: 'Start and End date/time are required' });
    }

    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);
    if (endDate <= startDate) {
      return res.status(400).json({ success: false, message: 'End date/time must be after Start date/time' });
    }

    // Generate unique code if not provided
    const code = examCode && examCode.trim() 
      ? examCode.trim().toUpperCase() 
      : `EXAM-${subject.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    // Check duplicate code
    const existing = await prisma.onlineExam.findUnique({ where: { examCode: code } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Exam code '${code}' already exists` });
    }

    // Create exam
    const createdExam = await prisma.onlineExam.create({
      data: {
        title: title.trim(),
        examCode: code,
        description: description?.trim() || null,
        instructions: instructions?.trim() || null,
        academicYear,
        standard: standard || 'All',
        section: section || 'All',
        subject: subject.trim(),
        durationMinutes: parseInt(durationMinutes, 10) || 60,
        totalMarks: parseFloat(totalMarks) || 100.0,
        passingMarks: parseFloat(passingMarks) || 35.0,
        negativeMarking: Boolean(negativeMarking),
        negativeMarkValue: parseFloat(negativeMarkValue) || 0.25,
        allowPartialCredit: Boolean(allowPartialCredit),
        maxAttempts: parseInt(maxAttempts, 10) || 1,
        shuffleQuestions: Boolean(shuffleQuestions),
        shuffleOptions: Boolean(shuffleOptions),
        enableQuestionRandomization: Boolean(enableQuestionRandomization),
        randomPoolConfig: randomPoolConfig || null,
        navigationMode,
        layoutMode,
        resultReleaseMode,
        resultReleaseTime: resultReleaseTime ? new Date(resultReleaseTime) : null,
        answerKeyReleaseMode,
        enableIntegrityShield: Boolean(enableIntegrityShield),
        maxIntegrityViolations: parseInt(maxIntegrityViolations, 10) || 5,
        status: 'DRAFT',
        startDateTime: startDate,
        endDateTime: endDate,
        createdBy: req.user.name || req.user.email,
        questionPaperUrl: questionPaperUrl || null,
        questionPaperName: questionPaperName || null,
        questionPaperSize: questionPaperSize ? parseInt(questionPaperSize, 10) : null
      }
    });

    // Link initial questions if provided
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      const questionsData = await prisma.onlineQuestion.findMany({
        where: { id: { in: questionIds } },
        include: { options: true }
      });

      for (let i = 0; i < questionsData.length; i++) {
        const q = questionsData[i];
        await prisma.onlineExamQuestion.create({
          data: {
            examId: createdExam.id,
            questionId: q.id,
            orderIndex: i,
            marks: q.marks,
            negativeMarks: q.negativeMarks,
            questionSnapshot: q
          }
        });
      }
    }

    // Link assignments if provided
    if (Array.isArray(assignedClasses) && assignedClasses.length > 0) {
      await prisma.onlineExamAssignment.createMany({
        data: assignedClasses.map(c => ({
          examId: createdExam.id,
          standard: c.standard || 'All',
          section: c.section || 'All'
        }))
      });
    }

    const fullExam = await prisma.onlineExam.findUnique({
      where: { id: createdExam.id },
      include: { questions: true, assignments: true }
    });

    res.status(201).json({
      success: true,
      message: 'Exam draft created successfully',
      data: formatLegacyId(fullExam)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/online-exam/exams/:id
 * Update draft exam
 */
router.put('/exams/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.onlineExam.findUnique({
      where: { id },
      include: { attempts: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (existing.isVersionLocked && existing.attempts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This exam is locked because attempts already exist. Modifications to scoring or questions must be performed through an audited correction workflow or new exam version.'
      });
    }

    const {
      title,
      description,
      instructions,
      academicYear,
      standard,
      section,
      subject,
      durationMinutes,
      totalMarks,
      passingMarks,
      negativeMarking,
      negativeMarkValue,
      allowPartialCredit,
      maxAttempts,
      shuffleQuestions,
      shuffleOptions,
      enableQuestionRandomization,
      randomPoolConfig,
      navigationMode,
      layoutMode,
      resultReleaseMode,
      resultReleaseTime,
      answerKeyReleaseMode,
      enableIntegrityShield,
      maxIntegrityViolations,
      startDateTime,
      endDateTime,
      questionIds,
      assignedClasses,
      status
    } = req.body;

    // Update questions link if provided and exam not locked
    if (Array.isArray(questionIds)) {
      await prisma.onlineExamQuestion.deleteMany({ where: { examId: id } });
      const questionsData = await prisma.onlineQuestion.findMany({
        where: { id: { in: questionIds } },
        include: { options: true }
      });

      for (let i = 0; i < questionsData.length; i++) {
        const q = questionsData[i];
        await prisma.onlineExamQuestion.create({
          data: {
            examId: id,
            questionId: q.id,
            orderIndex: i,
            marks: q.marks,
            negativeMarks: q.negativeMarks,
            questionSnapshot: q
          }
        });
      }
    }

    // Update assignments if provided
    if (Array.isArray(assignedClasses)) {
      await prisma.onlineExamAssignment.deleteMany({ where: { examId: id } });
      await prisma.onlineExamAssignment.createMany({
        data: assignedClasses.map(c => ({
          examId: id,
          standard: c.standard || 'All',
          section: c.section || 'All'
        }))
      });
    }

    const updated = await prisma.onlineExam.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : existing.title,
        description: description !== undefined ? description?.trim() : existing.description,
        instructions: instructions !== undefined ? instructions?.trim() : existing.instructions,
        academicYear: academicYear || existing.academicYear,
        standard: standard || existing.standard,
        section: section || existing.section,
        subject: subject !== undefined ? subject.trim() : existing.subject,
        durationMinutes: durationMinutes !== undefined ? parseInt(durationMinutes, 10) : existing.durationMinutes,
        totalMarks: totalMarks !== undefined ? parseFloat(totalMarks) : existing.totalMarks,
        passingMarks: passingMarks !== undefined ? parseFloat(passingMarks) : existing.passingMarks,
        negativeMarking: negativeMarking !== undefined ? Boolean(negativeMarking) : existing.negativeMarking,
        negativeMarkValue: negativeMarkValue !== undefined ? parseFloat(negativeMarkValue) : existing.negativeMarkValue,
        allowPartialCredit: allowPartialCredit !== undefined ? Boolean(allowPartialCredit) : existing.allowPartialCredit,
        maxAttempts: maxAttempts !== undefined ? parseInt(maxAttempts, 10) : existing.maxAttempts,
        shuffleQuestions: shuffleQuestions !== undefined ? Boolean(shuffleQuestions) : existing.shuffleQuestions,
        shuffleOptions: shuffleOptions !== undefined ? Boolean(shuffleOptions) : existing.shuffleOptions,
        enableQuestionRandomization: enableQuestionRandomization !== undefined ? Boolean(enableQuestionRandomization) : existing.enableQuestionRandomization,
        randomPoolConfig: randomPoolConfig !== undefined ? randomPoolConfig : existing.randomPoolConfig,
        navigationMode: navigationMode || existing.navigationMode,
        layoutMode: layoutMode || existing.layoutMode,
        resultReleaseMode: resultReleaseMode || existing.resultReleaseMode,
        resultReleaseTime: resultReleaseTime !== undefined ? (resultReleaseTime ? new Date(resultReleaseTime) : null) : existing.resultReleaseTime,
        answerKeyReleaseMode: answerKeyReleaseMode || existing.answerKeyReleaseMode,
        enableIntegrityShield: enableIntegrityShield !== undefined ? Boolean(enableIntegrityShield) : existing.enableIntegrityShield,
        maxIntegrityViolations: maxIntegrityViolations !== undefined ? parseInt(maxIntegrityViolations, 10) : existing.maxIntegrityViolations,
        startDateTime: startDateTime ? new Date(startDateTime) : existing.startDateTime,
        endDateTime: endDateTime ? new Date(endDateTime) : existing.endDateTime,
        status: status || existing.status
      },
      include: {
        questions: {
          include: { question: { include: { options: true } } }
        },
        assignments: true
      }
    });

    res.json({
      success: true,
      message: 'Exam updated successfully',
      data: formatLegacyId(updated)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/online-exam/exams/:id/duplicate
 * Duplicate exam configuration
 */
router.post('/exams/:id/duplicate', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const exam = await prisma.onlineExam.findUnique({
      where: { id: req.params.id },
      include: { questions: true, assignments: true }
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const code = `EXAM-${exam.subject.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const duplicated = await prisma.onlineExam.create({
      data: {
        title: `${exam.title} (Copy)`,
        examCode: code,
        description: exam.description,
        instructions: exam.instructions,
        academicYear: exam.academicYear,
        standard: exam.standard,
        section: exam.section,
        subject: exam.subject,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        negativeMarking: exam.negativeMarking,
        negativeMarkValue: exam.negativeMarkValue,
        allowPartialCredit: exam.allowPartialCredit,
        maxAttempts: exam.maxAttempts,
        shuffleQuestions: exam.shuffleQuestions,
        shuffleOptions: exam.shuffleOptions,
        enableQuestionRandomization: exam.enableQuestionRandomization,
        randomPoolConfig: exam.randomPoolConfig,
        navigationMode: exam.navigationMode,
        layoutMode: exam.layoutMode,
        resultReleaseMode: exam.resultReleaseMode,
        resultReleaseTime: exam.resultReleaseTime,
        answerKeyReleaseMode: exam.answerKeyReleaseMode,
        enableIntegrityShield: exam.enableIntegrityShield,
        maxIntegrityViolations: exam.maxIntegrityViolations,
        status: 'DRAFT',
        startDateTime: new Date(),
        endDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: req.user.name || req.user.email
      }
    });

    // Copy questions
    for (const q of exam.questions) {
      await prisma.onlineExamQuestion.create({
        data: {
          examId: duplicated.id,
          questionId: q.questionId,
          orderIndex: q.orderIndex,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          questionSnapshot: q.questionSnapshot
        }
      });
    }

    // Copy assignments
    for (const a of exam.assignments) {
      await prisma.onlineExamAssignment.create({
        data: {
          examId: duplicated.id,
          standard: a.standard,
          section: a.section,
          studentId: a.studentId
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Exam duplicated as draft successfully',
      data: formatLegacyId(duplicated)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/online-exam/exams/:id/publish
 * Validate blueprint, freeze immutable questions snapshot, lock version, and transition to PUBLISHED
 */
router.post('/exams/:id/publish', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await prisma.onlineExam.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            question: { include: { options: true } }
          }
        },
        assignments: true
      }
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish exam: At least 1 question must be added to the exam.'
      });
    }

    if (exam.assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish exam: At least one class/section or student must be assigned.'
      });
    }

    // Freeze snapshot for all questions to guarantee immutable reproduction
    for (const eq of exam.questions) {
      const fullQ = eq.question;
      const snapshot = {
        id: fullQ.id,
        subject: fullQ.subject,
        chapter: fullQ.chapter,
        topic: fullQ.topic,
        difficulty: fullQ.difficulty,
        type: fullQ.type,
        questionText: fullQ.questionText,
        questionImage: fullQ.questionImage,
        marks: Number(eq.marks ?? fullQ.marks),
        negativeMarks: Number(eq.negativeMarks ?? fullQ.negativeMarks),
        explanation: fullQ.explanation,
        options: fullQ.options.map(o => ({
          id: o.id,
          optionKey: o.optionKey,
          optionText: o.optionText,
          optionImage: o.optionImage,
          isCorrect: o.isCorrect,
          orderIndex: o.orderIndex
        }))
      };

      await prisma.onlineExamQuestion.update({
        where: { id: eq.id },
        data: { questionSnapshot: snapshot }
      });
    }

    // Determine status: ACTIVE if current time is within window, else PUBLISHED
    const now = new Date();
    const isLive = now >= new Date(exam.startDateTime) && now <= new Date(exam.endDateTime);
    const newStatus = isLive ? 'ACTIVE' : 'PUBLISHED';

    const publishedExam = await prisma.onlineExam.update({
      where: { id },
      data: {
        status: newStatus,
        isVersionLocked: true
      }
    });

    // Audit log
    await prisma.onlineExamAuditLog.create({
      data: {
        examId: id,
        action: 'PUBLISH',
        actorId: req.user.id,
        actorName: req.user.name,
        actorRole: req.user.role,
        details: {
          questionsCount: exam.questions.length,
          totalMarks: exam.totalMarks,
          status: newStatus
        }
      }
    });

    res.json({
      success: true,
      message: `Exam published successfully! Current status: ${newStatus}`,
      data: formatLegacyId(publishedExam)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/online-exam/exams/:id/archive
 * Archive completed or inactive exam
 */
router.post('/exams/:id/archive', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const updated = await prisma.onlineExam.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' }
    });

    await prisma.onlineExamAuditLog.create({
      data: {
        examId: req.params.id,
        action: 'ARCHIVE',
        actorId: req.user.id,
        actorName: req.user.name,
        actorRole: req.user.role
      }
    });

    res.json({ success: true, message: 'Exam archived successfully', data: formatLegacyId(updated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/online-exam/exams/:id
 * Delete draft exam
 */
router.delete('/exams/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await prisma.onlineExam.findUnique({
      where: { id },
      include: { attempts: true }
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.attempts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete exam with existing student attempts. Archive the exam instead to preserve historical records.'
      });
    }

    await prisma.onlineExam.delete({ where: { id } });
    res.json({ success: true, message: 'Exam deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/online-exam/exams/:id/randomize-pool
 * Pick questions from Question Bank satisfying blueprint criteria
 */
router.post('/exams/:id/randomize-pool', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, count = 10, difficultyDistribution } = req.body;
    // difficultyDistribution: { EASY: 4, MEDIUM: 4, HARD: 2 }

    const exam = await prisma.onlineExam.findUnique({ where: { id } });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    let selectedQuestionIds = [];

    if (difficultyDistribution && typeof difficultyDistribution === 'object') {
      for (const [diff, num] of Object.entries(difficultyDistribution)) {
        if (num > 0) {
          const available = await prisma.onlineQuestion.findMany({
            where: {
              subject: subject || exam.subject,
              difficulty: diff,
              status: 'ACTIVE'
            },
            select: { id: true }
          });

          if (available.length < num) {
            return res.status(400).json({
              success: false,
              message: `Insufficient questions for difficulty '${diff}'. Required: ${num}, Available: ${available.length}. Please add more questions to the Question Bank or adjust your blueprint.`
            });
          }

          const shuffled = shuffleArray(available);
          selectedQuestionIds.push(...shuffled.slice(0, num).map(q => q.id));
        }
      }
    } else {
      const available = await prisma.onlineQuestion.findMany({
        where: {
          subject: subject || exam.subject,
          status: 'ACTIVE'
        },
        select: { id: true }
      });

      if (available.length < count) {
        return res.status(400).json({
          success: false,
          message: `Insufficient questions in pool for '${subject || exam.subject}'. Required: ${count}, Available: ${available.length}.`
        });
      }

      const shuffled = shuffleArray(available);
      selectedQuestionIds = shuffled.slice(0, count).map(q => q.id);
    }

    // Replace exam questions
    await prisma.onlineExamQuestion.deleteMany({ where: { examId: id } });

    const questionsData = await prisma.onlineQuestion.findMany({
      where: { id: { in: selectedQuestionIds } },
      include: { options: true }
    });

    for (let i = 0; i < questionsData.length; i++) {
      const q = questionsData[i];
      await prisma.onlineExamQuestion.create({
        data: {
          examId: id,
          questionId: q.id,
          orderIndex: i,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          questionSnapshot: q
        }
      });
    }

    res.json({
      success: true,
      message: `Successfully randomized and linked ${questionsData.length} questions from Question Bank pool`,
      linkedCount: questionsData.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 3. STUDENT EXAMINATION WORKFLOW & ATTEMPTS APIs
// =========================================================================

/**
 * GET /api/online-exam/student/my-exams
 * List exams available, upcoming, or completed for logged-in student
 */
router.get('/student/my-exams', protect, async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    const userEmail = (req.user?.email || '').toLowerCase();

    let student = null;
    if (userRole === 'student' || userRole === 'parent') {
      student = await prisma.student.findFirst({
        where: {
          OR: [
            { userId: req.user.id },
            { email: userEmail },
            { parentEmail: userEmail }
          ]
        }
      });
    }

    // If query contains specific studentId (e.g. for testing or admin preview)
    if (!student && req.query.studentId) {
      student = await prisma.student.findUnique({ where: { id: req.query.studentId } });
    }

    // Fallback: if student record not linked, get first matching student or demo student
    if (!student) {
      student = await prisma.student.findFirst({
        where: { leftSchoolStatus: false }
      }) || { id: 'demo-student-1', name: req.user.name, standard: '10th', section: 'A' };
    }

    const now = new Date();

    // Find all exams matching student's standard, section, or studentId
    const exams = await prisma.onlineExam.findMany({
      where: {
        status: { in: ['PUBLISHED', 'ACTIVE', 'COMPLETED'] },
        assignments: {
          some: {
            OR: [
              { standard: 'All' },
              { standard: student.standard, section: 'All' },
              { standard: student.standard, section: student.section },
              { studentId: student.id }
            ]
          }
        }
      },
      include: {
        attempts: {
          where: { studentId: student.id },
          orderBy: { attemptNumber: 'desc' }
        },
        _count: { select: { questions: true } }
      },
      orderBy: { startDateTime: 'asc' }
    });

    // Categorize
    const categorized = exams.map(e => {
      const attempts = e.attempts || [];
      const latestAttempt = attempts[0] || null;
      const isPast = now > new Date(e.endDateTime);
      const isFuture = now < new Date(e.startDateTime);
      const isLive = now >= new Date(e.startDateTime) && now <= new Date(e.endDateTime);

      let studentStatus = 'ELIGIBLE';
      if (latestAttempt?.status === 'IN_PROGRESS') {
        studentStatus = 'IN_PROGRESS';
      } else if (attempts.length >= e.maxAttempts) {
        studentStatus = 'COMPLETED';
      } else if (isPast) {
        studentStatus = 'EXPIRED';
      } else if (isFuture) {
        studentStatus = 'UPCOMING';
      }

      return {
        id: e.id,
        examCode: e.examCode,
        title: e.title,
        description: e.description,
        subject: e.subject,
        standard: e.standard,
        durationMinutes: e.durationMinutes,
        totalMarks: e.totalMarks,
        passingMarks: e.passingMarks,
        negativeMarking: e.negativeMarking,
        negativeMarkValue: e.negativeMarkValue,
        maxAttempts: e.maxAttempts,
        questionsCount: e._count.questions,
        startDateTime: e.startDateTime,
        endDateTime: e.endDateTime,
        isLive,
        isFuture,
        isPast,
        studentStatus,
        attemptsCount: attempts.length,
        latestAttemptId: latestAttempt?.id || null,
        latestAttemptScore: latestAttempt?.scoreObtained ?? null,
        latestAttemptStatus: latestAttempt?.status || null
      };
    });

    res.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        standard: student.standard,
        section: student.section
      },
      data: formatLegacyId(categorized)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/online-exam/student/exams/:id/lobby
 * Exam instructions, rules, and student eligibility check
 * Supports :id being an examId, attemptId, or examCode
 */
router.get('/student/exams/:id/lobby', protect, async (req, res) => {
  try {
    let examId = req.params.id;
    let exam = await prisma.onlineExam.findUnique({
      where: { id: examId },
      include: {
        assignments: true,
        _count: { select: { questions: true } }
      }
    });

    let linkedAttempt = null;
    if (!exam) {
      // Check if :id is an attemptId
      linkedAttempt = await prisma.onlineExamAttempt.findUnique({
        where: { id: examId },
        include: {
          exam: {
            include: {
              assignments: true,
              _count: { select: { questions: true } }
            }
          }
        }
      });

      if (linkedAttempt?.exam) {
        exam = linkedAttempt.exam;
        examId = exam.id;
      } else {
        // Also check by examCode
        exam = await prisma.onlineExam.findUnique({
          where: { examCode: req.params.id },
          include: {
            assignments: true,
            _count: { select: { questions: true } }
          }
        });
        if (exam) examId = exam.id;
      }
    }

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    // Check student eligibility
    const userRole = (req.user?.role || '').toLowerCase();
    const userEmail = (req.user?.email || '').toLowerCase();
    const isStaff = ['admin', 'teacher'].includes(userRole);

    let student = await prisma.student.findFirst({
      where: {
        OR: [
          { userId: req.user.id },
          { email: userEmail },
          { parentEmail: userEmail }
        ]
      }
    });

    if (!student && req.query.studentId) {
      student = await prisma.student.findUnique({ where: { id: req.query.studentId } });
    }

    if (!student) {
      student = await prisma.student.findFirst({ where: { leftSchoolStatus: false } }) || 
        { id: 'demo-student-1', name: req.user.name, standard: '10th', section: 'A' };
    }

    // Check past attempts
    const attempts = await prisma.onlineExamAttempt.findMany({
      where: { examId: exam.id, studentId: student.id },
      orderBy: { attemptNumber: 'desc' }
    });

    const activeAttempt = attempts.find(a => a.status === 'IN_PROGRESS') || (linkedAttempt?.status === 'IN_PROGRESS' ? linkedAttempt : null);
    const completedAttempt = attempts.find(a => ['EVALUATED', 'SUBMITTED'].includes(a.status)) || (['EVALUATED', 'SUBMITTED'].includes(linkedAttempt?.status) ? linkedAttempt : null);

    const now = new Date();
    const isLive = (now >= new Date(exam.startDateTime) && now <= new Date(exam.endDateTime)) || isStaff;
    const canAttempt = isLive && (attempts.length < exam.maxAttempts || activeAttempt || isStaff);

    // If an attempt was completed and no more attempts allowed, provide direct redirect info
    const isCompleted = !activeAttempt && completedAttempt && (attempts.length >= exam.maxAttempts && !isStaff);

    res.json({
      success: true,
      isCompleted: Boolean(isCompleted),
      data: {
        id: exam.id,
        examCode: exam.examCode,
        title: exam.title,
        description: exam.description,
        instructions: exam.instructions || 'Read all questions carefully. Choose the best answer. Auto-submission will trigger when timer reaches 0.',
        subject: exam.subject,
        standard: exam.standard,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        negativeMarking: exam.negativeMarking,
        negativeMarkValue: exam.negativeMarkValue,
        maxAttempts: exam.maxAttempts,
        navigationMode: exam.navigationMode,
        layoutMode: exam.layoutMode,
        enableIntegrityShield: exam.enableIntegrityShield,
        maxIntegrityViolations: exam.maxIntegrityViolations,
        questionsCount: exam._count.questions,
        startDateTime: exam.startDateTime,
        endDateTime: exam.endDateTime,
        isLive,
        canAttempt: Boolean(canAttempt),
        attemptsTaken: attempts.length,
        hasActiveAttempt: Boolean(activeAttempt),
        activeAttemptId: activeAttempt?.id || null,
        completedAttemptId: completedAttempt?.id || null,
        isCompleted: Boolean(isCompleted),
        student: {
          id: student.id,
          name: student.name,
          standard: student.standard,
          section: student.section
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/online-exam/student/attempts/:attemptId/session
 * Authoritative session retrieval for an ongoing exam attempt
 */
router.get('/student/attempts/:attemptId/session', protect, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await prisma.onlineExamAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: true,
        exam: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: {
                question: {
                  include: {
                    options: { orderBy: { orderIndex: 'asc' } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt session not found' });
    }

    if (attempt.status === 'EVALUATED' || attempt.status === 'SUBMITTED') {
      return res.json({
        success: true,
        isCompleted: true,
        data: {
          attemptId: attempt.id,
          status: attempt.status,
          isCompleted: true
        }
      });
    }

    const exam = attempt.exam;
    const now = new Date();
    if (now >= new Date(attempt.deadlineTime)) {
      await evaluateAttemptOnServer(attempt.id);
      return res.status(400).json({
        success: false,
        isExpired: true,
        attemptId: attempt.id,
        message: 'Examination time has expired. The attempt has been submitted automatically.'
      });
    }

    const orderedQIds = attempt.shuffledQuestionOrder || exam.questions.map(eq => eq.questionId);
    const optionOrdersMap = attempt.shuffledOptionOrders || {};
    const clientQuestions = [];

    for (const qId of orderedQIds) {
      const eq = exam.questions.find(item => item.questionId === qId);
      if (!eq) continue;

      const q = eq.question;
      const customOptionOrder = optionOrdersMap[qId];

      let sortedOptions = [...(q.options || [])];
      if (Array.isArray(customOptionOrder) && customOptionOrder.length > 0) {
        sortedOptions.sort((a, b) => {
          return customOptionOrder.indexOf(a.optionKey) - customOptionOrder.indexOf(b.optionKey);
        });
      }

      const safeOptions = sortedOptions.map(o => ({
        id: o.id,
        optionKey: o.optionKey,
        optionText: o.optionText,
        optionImage: o.optionImage
      }));

      const savedAns = attempt.answers.find(a => a.questionId === qId);

      clientQuestions.push({
        id: q.id,
        subject: q.subject,
        chapter: q.chapter,
        topic: q.topic,
        type: q.type,
        marks: Number(eq.marks ?? q.marks),
        negativeMarks: Number(eq.negativeMarks ?? (exam.negativeMarking ? exam.negativeMarkValue : 0)),
        questionText: q.questionText,
        questionImage: q.questionImage,
        options: safeOptions,
        savedAnswer: savedAns ? {
          selectedOptionKeys: savedAns.selectedOptionKeys || [],
          isMarkedForReview: savedAns.isMarkedForReview || false,
          isAnswered: savedAns.isAnswered || false
        } : null
      });
    }

    const remainingSeconds = Math.max(0, Math.floor((new Date(attempt.deadlineTime).getTime() - Date.now()) / 1000));

    res.json({
      success: true,
      data: {
        attemptId: attempt.id,
        attemptNumber: attempt.attemptNumber,
        startTime: attempt.startTime,
        deadlineTime: attempt.deadlineTime,
        remainingSeconds,
        totalQuestions: clientQuestions.length,
        navigationMode: exam.navigationMode,
        layoutMode: exam.layoutMode,
        enableIntegrityShield: exam.enableIntegrityShield,
        maxIntegrityViolations: exam.maxIntegrityViolations,
        title: exam.title,
        subject: exam.subject,
        examCode: exam.examCode,
        questions: clientQuestions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/online-exam/student/exams/:id/start
 * Start or resume exam attempt (authoritative server timer & question ordering, isCorrect stripped!)
 * Accepts either an examId, an attemptId, or an examCode in :id
 */
router.post('/student/exams/:id/start', protect, async (req, res) => {
  try {
    let examId = req.params.id;
    let existingAttempt = null;

    // 1. Check if :id is an existing attemptId directly
    const attemptById = await prisma.onlineExamAttempt.findUnique({
      where: { id: examId },
      include: {
        answers: true,
        exam: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: {
                question: {
                  include: {
                    options: { orderBy: { orderIndex: 'asc' } }
                  }
                }
              }
            },
            assignments: true
          }
        }
      }
    });

    let exam = null;
    if (attemptById) {
      existingAttempt = attemptById;
      exam = attemptById.exam;
      examId = exam.id;

      if (existingAttempt.status === 'EVALUATED' || existingAttempt.status === 'SUBMITTED') {
        return res.json({
          success: true,
          isCompleted: true,
          message: 'Examination attempt has already been submitted and evaluated.',
          data: {
            attemptId: existingAttempt.id,
            status: existingAttempt.status,
            isCompleted: true
          }
        });
      }
    } else {
      // 2. Look up exam by ID
      exam = await prisma.onlineExam.findUnique({
        where: { id: examId },
        include: {
          questions: {
            orderBy: { orderIndex: 'asc' },
            include: {
              question: {
                include: {
                  options: { orderBy: { orderIndex: 'asc' } }
                }
              }
            }
          },
          assignments: true
        }
      });

      // 3. Fallback: look up exam by examCode
      if (!exam) {
        exam = await prisma.onlineExam.findUnique({
          where: { examCode: examId },
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: {
                question: {
                  include: {
                    options: { orderBy: { orderIndex: 'asc' } }
                  }
                }
              }
            },
            assignments: true
          }
        });
        if (exam) examId = exam.id;
      }
    }

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const userRole = (req.user?.role || '').toLowerCase();
    const isStaff = ['admin', 'teacher'].includes(userRole);

    if (exam.status !== 'PUBLISHED' && exam.status !== 'ACTIVE' && !isStaff) {
      return res.status(400).json({ success: false, message: 'Exam is not currently published or active' });
    }

    const now = new Date();
    if (now < new Date(exam.startDateTime) && !isStaff) {
      return res.status(400).json({ success: false, message: 'This examination has not started yet' });
    }
    if (now > new Date(exam.endDateTime) && !isStaff) {
      return res.status(400).json({ success: false, message: 'This examination has ended' });
    }

    // Auto-link questions from Question Bank if exam has 0 questions
    if (!exam.questions || exam.questions.length === 0) {
      const poolQuestions = await prisma.onlineQuestion.findMany({
        where: {
          subject: { contains: exam.subject.trim(), mode: 'insensitive' },
          status: 'ACTIVE'
        },
        take: 10,
        include: { options: true }
      });

      if (poolQuestions.length > 0) {
        for (let i = 0; i < poolQuestions.length; i++) {
          await prisma.onlineExamQuestion.create({
            data: {
              examId: exam.id,
              questionId: poolQuestions[i].id,
              orderIndex: i,
              marks: poolQuestions[i].marks,
              negativeMarks: poolQuestions[i].negativeMarks,
              questionSnapshot: poolQuestions[i]
            }
          });
        }
        // Reload exam with questions
        exam = await prisma.onlineExam.findUnique({
          where: { id: exam.id },
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: {
                question: {
                  include: {
                    options: { orderBy: { orderIndex: 'asc' } }
                  }
                }
              }
            },
            assignments: true
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'This examination does not have any questions assigned yet. Please upload or link questions first.'
        });
      }
    }

    // Determine student
    const userEmail = (req.user?.email || '').toLowerCase();

    let student = await prisma.student.findFirst({
      where: {
        OR: [
          { userId: req.user.id },
          { email: userEmail },
          { parentEmail: userEmail }
        ]
      }
    });

    if (!student && req.body.studentId) {
      student = await prisma.student.findUnique({ where: { id: req.body.studentId } });
    }

    if (!student) {
      student = await prisma.student.findFirst({ where: { leftSchoolStatus: false } }) || 
        { id: 'demo-student-1', name: req.user.name, standard: '10th', section: 'A', rollNumber: '01' };
    }

    // Check if an in-progress attempt exists
    let attempt = existingAttempt;
    if (!attempt) {
      attempt = await prisma.onlineExamAttempt.findFirst({
        where: {
          examId: exam.id,
          studentId: student.id,
          status: 'IN_PROGRESS'
        },
        include: {
          answers: true
        }
      });
    }

    if (!attempt) {
      // Check attempt count
      const pastAttempts = await prisma.onlineExamAttempt.count({
        where: { examId: exam.id, studentId: student.id }
      });

      if (pastAttempts >= exam.maxAttempts && !isStaff) {
        return res.status(400).json({
          success: false,
          message: `Maximum attempts limit (${exam.maxAttempts}) reached for this exam`
        });
      }

      // Calculate server deadline: now + durationMinutes, capped at exam.endDateTime (unless staff)
      const durationMs = exam.durationMinutes * 60 * 1000;
      const calculatedDeadline = new Date(now.getTime() + durationMs);
      const deadlineTime = (!isStaff && calculatedDeadline > new Date(exam.endDateTime)) 
        ? new Date(exam.endDateTime) 
        : calculatedDeadline;

      // Question ordering
      let questionOrder = exam.questions.map(eq => eq.questionId);
      if (exam.shuffleQuestions) {
        questionOrder = shuffleArray(questionOrder);
      }

      // Option ordering
      const optionOrders = {};
      exam.questions.forEach(eq => {
        const opts = (eq.question?.options || []).map(o => o.optionKey);
        optionOrders[eq.questionId] = exam.shuffleOptions ? shuffleArray(opts) : opts;
      });

      // Create new attempt
      attempt = await prisma.onlineExamAttempt.create({
        data: {
          examId: exam.id,
          studentId: student.id,
          studentName: student.name,
          standard: student.standard,
          section: student.section,
          rollNumber: student.rollNumber || '',
          attemptNumber: pastAttempts + 1,
          status: 'IN_PROGRESS',
          startTime: now,
          deadlineTime,
          totalQuestions: exam.questions.length,
          shuffledQuestionOrder: questionOrder,
          shuffledOptionOrders: optionOrders
        },
        include: { answers: true }
      });

      // Pre-seed blank attempt answers for all questions
      for (const qId of questionOrder) {
        await prisma.onlineAttemptAnswer.create({
          data: {
            attemptId: attempt.id,
            questionId: qId,
            selectedOptionKeys: [],
            isAnswered: false,
            isMarkedForReview: false
          }
        });
      }

      // Reload with answers
      attempt = await prisma.onlineExamAttempt.findUnique({
        where: { id: attempt.id },
        include: { answers: true }
      });
    }

    // Check if attempt deadline already passed
    if (new Date() >= new Date(attempt.deadlineTime)) {
      // Auto-submit expired attempt
      await evaluateAttemptOnServer(attempt.id);
      return res.status(400).json({
        success: false,
        message: 'Examination time has expired. The attempt has been submitted automatically.',
        attemptId: attempt.id,
        isExpired: true
      });
    }

    // Build SAFE questions list for student client (STRIP OUT isCorrect and explanation!)
    const orderedQIds = attempt.shuffledQuestionOrder || exam.questions.map(eq => eq.questionId);
    const optionOrdersMap = attempt.shuffledOptionOrders || {};

    const clientQuestions = [];
    for (const qId of orderedQIds) {
      const eq = exam.questions.find(item => item.questionId === qId);
      if (!eq) continue;

      const q = eq.question;
      const customOptionOrder = optionOrdersMap[qId];

      let sortedOptions = [...(q.options || [])];
      if (Array.isArray(customOptionOrder) && customOptionOrder.length > 0) {
        sortedOptions.sort((a, b) => {
          return customOptionOrder.indexOf(a.optionKey) - customOptionOrder.indexOf(b.optionKey);
        });
      }

      // Strip correct answer flags
      const safeOptions = sortedOptions.map(o => ({
        id: o.id,
        optionKey: o.optionKey,
        optionText: o.optionText,
        optionImage: o.optionImage
      }));

      // Find saved response
      const savedAns = attempt.answers.find(a => a.questionId === qId);

      clientQuestions.push({
        id: q.id,
        subject: q.subject,
        chapter: q.chapter,
        topic: q.topic,
        type: q.type,
        marks: Number(eq.marks ?? q.marks),
        negativeMarks: Number(eq.negativeMarks ?? (exam.negativeMarking ? exam.negativeMarkValue : 0)),
        questionText: q.questionText,
        questionImage: q.questionImage,
        options: safeOptions,
        savedAnswer: savedAns ? {
          selectedOptionKeys: savedAns.selectedOptionKeys || [],
          isMarkedForReview: savedAns.isMarkedForReview || false,
          isAnswered: savedAns.isAnswered || false
        } : null
      });
    }

    const remainingSeconds = Math.max(0, Math.floor((new Date(attempt.deadlineTime).getTime() - Date.now()) / 1000));

    res.json({
      success: true,
      data: {
        attemptId: attempt.id,
        attemptNumber: attempt.attemptNumber,
        startTime: attempt.startTime,
        deadlineTime: attempt.deadlineTime,
        remainingSeconds,
        totalQuestions: clientQuestions.length,
        navigationMode: exam.navigationMode,
        layoutMode: exam.layoutMode,
        enableIntegrityShield: exam.enableIntegrityShield,
        maxIntegrityViolations: exam.maxIntegrityViolations,
        title: exam.title,
        subject: exam.subject,
        examCode: exam.examCode,
        questions: clientQuestions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/online-exam/student/attempts/:attemptId/answer
 * Autosave student answer or update review flag
 */
router.post('/student/attempts/:attemptId/answer', protect, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, selectedOptionKeys = [], isMarkedForReview = false } = req.body;

    const attempt = await prisma.onlineExamAttempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });

    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'Cannot save answer: Attempt is no longer active' });
    }

    // Check deadline
    if (new Date() >= new Date(attempt.deadlineTime)) {
      // Auto submit expired
      await evaluateAttemptOnServer(attemptId);
      return res.status(400).json({
        success: false,
        message: 'Deadline expired. Exam submitted automatically.',
        isExpired: true
      });
    }

    const isAnswered = Array.isArray(selectedOptionKeys) && selectedOptionKeys.length > 0;

    // Upsert answer
    const saved = await prisma.onlineAttemptAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId
        }
      },
      update: {
        selectedOptionKeys,
        isAnswered,
        isMarkedForReview: Boolean(isMarkedForReview),
        lastSavedAt: new Date()
      },
      create: {
        attemptId,
        questionId,
        selectedOptionKeys,
        isAnswered,
        isMarkedForReview: Boolean(isMarkedForReview),
        lastSavedAt: new Date()
      }
    });

    // Update counts on attempt
    const allAnswers = await prisma.onlineAttemptAnswer.findMany({ where: { attemptId } });
    const answeredCount = allAnswers.filter(a => a.isAnswered).length;
    const markedReviewCount = allAnswers.filter(a => a.isMarkedForReview).length;

    await prisma.onlineExamAttempt.update({
      where: { id: attemptId },
      data: { answeredCount, markedReviewCount }
    });

    res.json({
      success: true,
      message: 'Response autosaved',
      data: {
        questionId,
        selectedOptionKeys: saved.selectedOptionKeys,
        isAnswered: saved.isAnswered,
        isMarkedForReview: saved.isMarkedForReview,
        answeredCount,
        markedReviewCount,
        savedAt: saved.lastSavedAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/online-exam/student/attempts/:attemptId/integrity-event
 * Track integrity signals (fullscreen exit, tab switch, window blur)
 */
router.post('/student/attempts/:attemptId/integrity-event', protect, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { eventType = 'TAB_SWITCH', details = '' } = req.body;

    const attempt = await prisma.onlineExamAttempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return res.status(200).json({ success: false, message: 'Inactive attempt' });
    }

    const newViolationCount = (attempt.integrityViolationsCount || 0) + 1;

    await Promise.all([
      prisma.onlineExamIntegrityLog.create({
        data: {
          attemptId,
          eventType,
          details: String(details)
        }
      }),
      prisma.onlineExamAttempt.update({
        where: { id: attemptId },
        data: { integrityViolationsCount: newViolationCount }
      })
    ]);

    res.json({
      success: true,
      violationsCount: newViolationCount,
      warning: `Integrity signal recorded: ${eventType}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/online-exam/student/attempts/:attemptId/submit
 * Final submission & automated evaluation
 */
router.post('/student/attempts/:attemptId/submit', protect, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { isAuto = false } = req.body;

    const attempt = await prisma.onlineExamAttempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });

    if (attempt.status === 'EVALUATED' || attempt.status === 'SUBMITTED') {
      return res.json({
        success: true,
        message: 'Exam was already submitted and evaluated',
        attemptId: attempt.id,
        status: attempt.status
      });
    }

    const now = new Date();
    const timeSpent = Math.max(0, Math.floor((now.getTime() - new Date(attempt.startTime).getTime()) / 1000));

    // Update to SUBMITTED
    await prisma.onlineExamAttempt.update({
      where: { id: attemptId },
      data: {
        status: isAuto ? 'AUTO_SUBMITTED' : 'SUBMITTED',
        submitTime: now,
        timeSpentSeconds: timeSpent
      }
    });

    // Run evaluation engine immediately
    const evaluated = await evaluateAttemptOnServer(attemptId);

    res.json({
      success: true,
      message: 'Examination submitted and evaluated successfully!',
      data: {
        attemptId: evaluated.id,
        status: evaluated.status,
        scoreObtained: evaluated.scoreObtained,
        totalPossibleScore: evaluated.totalPossibleScore,
        percentage: evaluated.percentage,
        isPassed: evaluated.isPassed,
        answeredCount: evaluated.answeredCount,
        unansweredCount: evaluated.unansweredCount,
        correctCount: evaluated.correctCount,
        timeSpentSeconds: evaluated.timeSpentSeconds
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/online-exam/student/attempts/:attemptId/result
 * View score, performance metrics, and question review (enforcing release policies)
 */
router.get('/student/attempts/:attemptId/result', protect, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await prisma.onlineExamAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            questions: {
              include: { question: { include: { options: true } } }
            }
          }
        },
        answers: true
      }
    });

    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });

    const exam = attempt.exam;
    const now = new Date();

    // Check Result Release Mode
    let isResultReleased = true;
    if (exam.resultReleaseMode === 'MANUAL') {
      // Only released if exam is COMPLETED or explicitly released
      isResultReleased = exam.status === 'COMPLETED';
    } else if (exam.resultReleaseMode === 'SCHEDULED' && exam.resultReleaseTime) {
      isResultReleased = now >= new Date(exam.resultReleaseTime);
    }

    if (!isResultReleased) {
      return res.json({
        success: true,
        isPendingRelease: true,
        message: 'Results for this examination are scheduled and will be published once released by the institution.',
        releaseTime: exam.resultReleaseTime,
        examTitle: exam.title,
        attemptNumber: attempt.attemptNumber,
        submitTime: attempt.submitTime
      });
    }

    // Check Answer Key Release Mode
    let isAnswerKeyReleased = false;
    if (exam.answerKeyReleaseMode === 'WITH_RESULTS') {
      isAnswerKeyReleased = true;
    } else if (exam.answerKeyReleaseMode === 'AFTER_EXAM_END') {
      isAnswerKeyReleased = now > new Date(exam.endDateTime);
    } else if (exam.answerKeyReleaseMode === 'NEVER') {
      isAnswerKeyReleased = false;
    }

    // Compute rank among all student attempts for this exam
    const allExamAttempts = await prisma.onlineExamAttempt.findMany({
      where: { examId: exam.id, status: 'EVALUATED' },
      orderBy: [
        { scoreObtained: 'desc' },
        { timeSpentSeconds: 'asc' }
      ],
      select: { id: true, studentId: true, scoreObtained: true }
    });

    const rank = allExamAttempts.findIndex(a => a.id === attempt.id) + 1;

    // Build question breakdown
    const orderedQIds = attempt.shuffledQuestionOrder || exam.questions.map(eq => eq.questionId);
    const questionsBreakdown = [];

    for (const qId of orderedQIds) {
      const eq = exam.questions.find(item => item.questionId === qId);
      if (!eq) continue;

      const q = eq.question;
      const ans = attempt.answers.find(a => a.questionId === qId);

      // Options
      const options = (q.options || []).map(o => ({
        optionKey: o.optionKey,
        optionText: o.optionText,
        optionImage: o.optionImage,
        isCorrect: isAnswerKeyReleased ? o.isCorrect : undefined
      }));

      const correctKeys = (q.options || []).filter(o => o.isCorrect).map(o => o.optionKey);

      questionsBreakdown.push({
        questionId: q.id,
        questionText: q.questionText,
        questionImage: q.questionImage,
        type: q.type,
        marks: Number(eq.marks ?? q.marks),
        negativeMarks: Number(eq.negativeMarks ?? (exam.negativeMarking ? exam.negativeMarkValue : 0)),
        options,
        studentSelectedKeys: ans?.selectedOptionKeys || [],
        isAnswered: ans?.isAnswered || false,
        isCorrect: ans?.isCorrect ?? false,
        marksAwarded: ans?.marksAwarded ?? 0.0,
        correctKeys: isAnswerKeyReleased ? correctKeys : undefined,
        explanation: isAnswerKeyReleased ? q.explanation : undefined
      });
    }

    res.json({
      success: true,
      isPendingRelease: false,
      isAnswerKeyReleased,
      data: {
        attemptId: attempt.id,
        examId: exam.id,
        examTitle: exam.title,
        examCode: exam.examCode,
        subject: exam.subject,
        attemptNumber: attempt.attemptNumber,
        startTime: attempt.startTime,
        submitTime: attempt.submitTime,
        timeSpentSeconds: attempt.timeSpentSeconds,
        totalQuestions: attempt.totalQuestions,
        answeredCount: attempt.answeredCount,
        unansweredCount: attempt.unansweredCount,
        correctCount: attempt.correctCount,
        incorrectCount: attempt.incorrectCount,
        scoreObtained: attempt.scoreObtained,
        totalPossibleScore: attempt.totalPossibleScore,
        percentage: attempt.percentage,
        passingMarks: exam.passingMarks,
        isPassed: attempt.isPassed,
        rank: rank || 1,
        totalCandidates: allExamAttempts.length,
        integrityViolationsCount: attempt.integrityViolationsCount,
        questions: questionsBreakdown
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 4. ANALYTICS, REPORTS & INSTITUTION ADMIN APIs
// =========================================================================

/**
 * GET /api/online-exam/analytics/dashboard
 * Module-wide stats for dashboard
 */
router.get('/analytics/dashboard', protect, async (req, res) => {
  try {
    const [totalExams, activeExams, totalQuestions, attempts] = await Promise.all([
      prisma.onlineExam.count(),
      prisma.onlineExam.count({ where: { status: { in: ['PUBLISHED', 'ACTIVE'] } } }),
      prisma.onlineQuestion.count({ where: { status: 'ACTIVE' } }),
      prisma.onlineExamAttempt.findMany({
        where: { status: 'EVALUATED' },
        select: { scoreObtained: true, totalPossibleScore: true, isPassed: true }
      })
    ]);

    const totalSubmissions = attempts.length;
    let avgScorePercent = 0.0;
    let passCount = 0;

    if (totalSubmissions > 0) {
      let totalPerc = 0;
      attempts.forEach(a => {
        if (a.isPassed) passCount++;
        if (a.totalPossibleScore > 0) {
          totalPerc += (a.scoreObtained / a.totalPossibleScore) * 100;
        }
      });
      avgScorePercent = Number((totalPerc / totalSubmissions).toFixed(1));
    }

    const passRate = totalSubmissions > 0 ? Number(((passCount / totalSubmissions) * 100).toFixed(1)) : 0.0;

    res.json({
      success: true,
      data: {
        totalExams,
        activeExams,
        totalQuestions,
        totalSubmissions,
        avgScorePercent,
        passRate
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/online-exam/analytics/exam/:examId
 * In-depth analytics for a specific exam (rank list, question accuracy, score distribution)
 */
router.get('/analytics/exam/:examId', protect, async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await prisma.onlineExam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          include: { question: true }
        },
        attempts: {
          where: { status: { in: ['EVALUATED', 'SUBMITTED', 'AUTO_SUBMITTED'] } },
          include: {
            answers: true
          },
          orderBy: [
            { scoreObtained: 'desc' },
            { timeSpentSeconds: 'asc' }
          ]
        }
      }
    });

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const attempts = exam.attempts || [];

    // Candidate Rank List
    const rankList = attempts.map((att, idx) => ({
      rank: idx + 1,
      attemptId: att.id,
      studentId: att.studentId,
      studentName: att.studentName,
      standard: att.standard,
      section: att.section,
      rollNumber: att.rollNumber || '-',
      scoreObtained: att.scoreObtained,
      totalPossibleScore: att.totalPossibleScore,
      percentage: att.percentage,
      isPassed: att.isPassed,
      correctCount: att.correctCount,
      incorrectCount: att.incorrectCount,
      unansweredCount: att.unansweredCount,
      timeSpentSeconds: att.timeSpentSeconds,
      integrityViolationsCount: att.integrityViolationsCount,
      status: att.status,
      submittedAt: att.submitTime
    }));

    // Score Distribution
    const distribution = {
      '90-100%': 0,
      '75-89%': 0,
      '60-74%': 0,
      '35-59%': 0,
      'Below 35%': 0
    };

    attempts.forEach(a => {
      const p = a.percentage;
      if (p >= 90) distribution['90-100%']++;
      else if (p >= 75) distribution['75-89%']++;
      else if (p >= 60) distribution['60-74%']++;
      else if (p >= 35) distribution['35-59%']++;
      else distribution['Below 35%']++;
    });

    // Question-wise Accuracy
    const questionAccuracy = exam.questions.map(eq => {
      const qId = eq.questionId;
      let totalAnswered = 0;
      let correctAnswers = 0;

      attempts.forEach(att => {
        const ans = att.answers.find(a => a.questionId === qId);
        if (ans && ans.isAnswered) {
          totalAnswered++;
          if (ans.isCorrect) correctAnswers++;
        }
      });

      const accuracy = totalAnswered > 0 ? Number(((correctAnswers / totalAnswered) * 100).toFixed(1)) : 0.0;

      return {
        questionId: qId,
        questionText: eq.question?.questionText || '',
        subject: eq.question?.subject || exam.subject,
        difficulty: eq.question?.difficulty || 'MEDIUM',
        totalAttempts: attempts.length,
        totalAnswered,
        correctAnswers,
        accuracyPercent: accuracy
      };
    });

    res.json({
      success: true,
      data: {
        exam: {
          id: exam.id,
          title: exam.title,
          examCode: exam.examCode,
          subject: exam.subject,
          totalMarks: exam.totalMarks,
          passingMarks: exam.passingMarks,
          totalQuestions: exam.questions.length,
          totalSubmissions: attempts.length
        },
        rankList,
        distribution,
        questionAccuracy
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/online-exam/analytics/exam/:examId/export
 * Export candidate rank list to Excel or CSV
 */
router.get('/analytics/exam/:examId/export', protect, async (req, res) => {
  try {
    const { examId } = req.params;
    const { format = 'xlsx' } = req.query;

    const exam = await prisma.onlineExam.findUnique({
      where: { id: examId },
      include: {
        attempts: {
          where: { status: 'EVALUATED' },
          orderBy: [
            { scoreObtained: 'desc' },
            { timeSpentSeconds: 'asc' }
          ]
        }
      }
    });

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const rows = (exam.attempts || []).map((att, idx) => ({
      'Rank': idx + 1,
      'Student Name': att.studentName,
      'Standard': att.standard,
      'Section': att.section,
      'Roll Number': att.rollNumber || '',
      'Score': att.scoreObtained,
      'Max Score': att.totalPossibleScore,
      'Percentage (%)': att.percentage,
      'Status': att.isPassed ? 'PASSED' : 'FAILED',
      'Correct': att.correctCount,
      'Incorrect': att.incorrectCount,
      'Unanswered': att.unansweredCount,
      'Time Spent (Sec)': att.timeSpentSeconds,
      'Integrity Warnings': att.integrityViolationsCount,
      'Submitted At': att.submitTime ? new Date(att.submitTime).toLocaleString() : ''
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, 'Results');

    const cleanTitle = exam.title.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format === 'csv') {
      const csv = xlsx.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${cleanTitle}_Results.csv"`);
      return res.send(csv);
    } else {
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${cleanTitle}_Results.xlsx"`);
      return res.send(buf);
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/online-exam/admin/attempts/:attemptId/re-evaluate
 * Administrative controlled re-evaluation
 */
router.post('/admin/attempts/:attemptId/re-evaluate', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { reason = 'Supervisor Answer Key / Marks Correction' } = req.body;

    const before = await prisma.onlineExamAttempt.findUnique({ where: { id: attemptId } });
    if (!before) return res.status(404).json({ success: false, message: 'Attempt not found' });

    const evaluated = await evaluateAttemptOnServer(attemptId);

    // Save audit
    const reEvalEntry = {
      reEvaluatedAt: new Date(),
      actorName: req.user.name,
      reason,
      oldScore: before.scoreObtained,
      newScore: evaluated.scoreObtained
    };

    const history = Array.isArray(before.reEvaluationHistory) ? [...before.reEvaluationHistory, reEvalEntry] : [reEvalEntry];

    await prisma.onlineExamAttempt.update({
      where: { id: attemptId },
      data: { reEvaluationHistory: history }
    });

    await prisma.onlineExamAuditLog.create({
      data: {
        examId: before.examId,
        action: 'RE_EVALUATE',
        actorId: req.user.id,
        actorName: req.user.name,
        actorRole: req.user.role,
        details: reEvalEntry
      }
    });

    res.json({
      success: true,
      message: 'Attempt re-evaluated successfully',
      data: formatLegacyId(evaluated)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/online-exam/admin/attempts/:attemptId/invalidate
 * Invalidate an attempt due to disciplinary or misconduct reasons
 */
router.post('/admin/attempts/:attemptId/invalidate', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Mandatory reason required for invalidating an attempt' });
    }

    const updated = await prisma.onlineExamAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'INVALIDATED',
        invalidationReason: reason.trim()
      }
    });

    await prisma.onlineExamAuditLog.create({
      data: {
        examId: updated.examId,
        action: 'INVALIDATE',
        actorId: req.user.id,
        actorName: req.user.name,
        actorRole: req.user.role,
        details: { attemptId, reason }
      }
    });

    res.json({
      success: true,
      message: 'Attempt invalidated successfully',
      data: formatLegacyId(updated)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
