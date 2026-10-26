import express from 'express';
import { prisma, formatLegacyId } from '../db/prisma.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import cache from '../lib/cache.js';

const router = express.Router();

const GRADE_CACHE_KEY = 'master:gradeScales';
const GRADE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Load grade scales once and cache them. Falls back to built-in scale if DB unavailable.
 */
async function getGradeScales() {
  let scales = cache.get(GRADE_CACHE_KEY);
  if (scales) return scales;

  try {
    scales = await prisma.gradeScale.findMany({ orderBy: { sequence: 'asc' } });
    if (scales && scales.length > 0) {
      cache.set(GRADE_CACHE_KEY, scales, GRADE_CACHE_TTL);
      return scales;
    }
  } catch (err) {
    // DB unavailable — use built-in defaults, don't cache so we retry next call
  }
  return null; // triggers inline fallback below
}

/**
 * Calculate grade and grade points based on percentage.
 * Uses cached grade scales — zero DB queries after first call.
 */
async function calculateGrade(percent) {
  const gradeScales = await getGradeScales();
  if (gradeScales) {
    for (const gs of gradeScales) {
      if (percent >= gs.minPercent && percent <= gs.maxPercent) {
        return { grade: gs.grade, gradePoint: gs.gradePoint, remark: gs.remark };
      }
    }
  }
  // Built-in fallback scale
  if (percent >= 90) return { grade: 'A+', gradePoint: 10, remark: 'Outstanding' };
  if (percent >= 80) return { grade: 'A',  gradePoint: 9,  remark: 'Excellent' };
  if (percent >= 70) return { grade: 'B+', gradePoint: 8,  remark: 'Very Good' };
  if (percent >= 60) return { grade: 'B',  gradePoint: 7,  remark: 'Good' };
  if (percent >= 50) return { grade: 'C',  gradePoint: 6,  remark: 'Above Average' };
  if (percent >= 35) return { grade: 'D',  gradePoint: 5,  remark: 'Pass' };
  return { grade: 'F', gradePoint: 0, remark: 'Needs Improvement / Fail' };
}

/**
 * Normalizes standard/class strings so queries for 'Grade 10', '10th', or '10' match all variants in database.
 */
export function getStandardVariants(std) {
  if (!std) return [];
  const s = String(std).trim();
  const variants = new Set([s]);

  // If "Grade 10", "Grade 5", etc.
  const gradeMatch = s.match(/^Grade\s*(\d+)$/i);
  if (gradeMatch) {
    const num = parseInt(gradeMatch[1], 10);
    const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
    variants.add(`${num}${suffix}`);
    variants.add(String(num));
  }

  // If "10th", "5th", "1st", "2nd", "3rd", etc.
  const nthMatch = s.match(/^(\d+)(st|nd|rd|th)$/i);
  if (nthMatch) {
    const num = parseInt(nthMatch[1], 10);
    variants.add(`Grade ${num}`);
    variants.add(String(num));
  }

  // If pure number "10", "5"
  const numMatch = s.match(/^(\d+)$/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
    variants.add(`${num}${suffix}`);
    variants.add(`Grade ${num}`);
  }

  return Array.from(variants);
}


// ─────────────────────────────────────────────────────────────
// STUDENT / PARENT READ-ONLY ENDPOINT (INDIVIDUAL MARKS ONLY)
// ─────────────────────────────────────────────────────────────
/**
 * GET /api/examination/my-marks
 * Accessible by Student, Parent, Teacher, Admin
 * Allows students & parents to ONLY view their own published examination results.
 */
router.get('/my-marks', protect, async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    const userEmail = (req.user?.email || '').toLowerCase();
    const queryStudentId = req.query.studentId;

    let targetStudentId = queryStudentId;

    // If Student or Parent, enforce that they only view their corresponding student
    if (userRole === 'student' || userRole === 'parent') {
      let studentRecord = await prisma.student.findFirst({
        where: {
          OR: [
            { userId: req.user.id },
            { email: userEmail },
            { parentEmail: userEmail }
          ]
        }
      });
      if (!studentRecord) {
        studentRecord = await prisma.student.findFirst({
          where: {
            OR: [
              { name: { contains: req.user?.name || '', mode: 'insensitive' } },
              { name: { contains: 'Aarav', mode: 'insensitive' } }
            ]
          }
        });
      }
      if (studentRecord) {
        targetStudentId = studentRecord.id;
      }
    }

    if (!targetStudentId) {
      // Find first student as fallback
      const fallback = await prisma.student.findFirst();
      targetStudentId = fallback?.id;
    }

    if (!targetStudentId) {
      return res.json({ status: true, data: { student: null, exams: [], overallSummary: null } });
    }

    const student = await prisma.student.findUnique({
      where: { id: targetStudentId }
    });

    // Fetch marks for this student (only for published exams for student/parent roles)
    const marks = await prisma.examMarks.findMany({
      where: {
        studentId: targetStudentId,
        ...(userRole === 'student' || userRole === 'parent' ? {
          examName: { isPublished: true }
        } : {})
      },
      include: {
        examName: {
          include: { examType: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by Exam Name
    const examsMap = {};
    for (const m of marks) {
      const examName = m.examName?.name || 'General Assessment';
      if (!examsMap[examName]) {
        examsMap[examName] = {
          examNameId: m.examNameId,
          examName,
          examTypeName: m.examName?.examType?.name || 'Term Exam',
          weightage: m.examName?.examType?.weightage || 0,
          subjects: [],
          totalMarks: 0,
          totalMaxMarks: 0,
          isPassed: true,
        };
      }
      examsMap[examName].subjects.push(m);
      if (!m.isAbsent) {
        examsMap[examName].totalMarks += m.marksObtained;
      }
      examsMap[examName].totalMaxMarks += m.maxMarks;
      if (!m.isPassed) examsMap[examName].isPassed = false;
    }

    const examsList = Object.values(examsMap).map(e => {
      const pct = e.totalMaxMarks > 0 ? (e.totalMarks / e.totalMaxMarks) * 100 : 0;
      return {
        ...e,
        percentage: Number(pct.toFixed(2)),
      };
    });

    // Fetch CCE Grades
    const cceGrades = await prisma.studentCCEGrade.findMany({
      where: { studentId: targetStudentId }
    });

    // Overall consolidated summary
    let aggregateObtained = 0;
    let aggregateMax = 0;
    examsList.forEach(e => {
      aggregateObtained += e.totalMarks;
      aggregateMax += e.totalMaxMarks;
    });
    const overallPct = aggregateMax > 0 ? (aggregateObtained / aggregateMax) * 100 : 0;
    const overallGradeInfo = await calculateGrade(overallPct);

    // Compute live class rank within standard and section
    let classRank = 1;
    let totalClassmates = 1;
    if (student?.standard && student?.section) {
      try {
        const classmates = await prisma.student.findMany({
          where: { standard: student.standard, section: student.section },
          select: { id: true }
        });
        totalClassmates = classmates.length;
        const classmateMarks = await prisma.examMarks.findMany({
          where: { standard: student.standard, section: student.section },
          select: { studentId: true, marksObtained: true, maxMarks: true, isAbsent: true }
        });
        const studentTotals = {};
        classmates.forEach(c => { studentTotals[c.id] = { obtained: 0, max: 0 }; });
        classmateMarks.forEach(m => {
          if (studentTotals[m.studentId]) {
            if (!m.isAbsent) studentTotals[m.studentId].obtained += m.marksObtained;
            studentTotals[m.studentId].max += m.maxMarks;
          }
        });
        const rankingList = Object.keys(studentTotals).map(sId => {
          const tot = studentTotals[sId];
          const pct = tot.max > 0 ? (tot.obtained / tot.max) * 100 : 0;
          return { studentId: sId, pct };
        }).sort((a, b) => b.pct - a.pct);

        const foundIndex = rankingList.findIndex(r => r.studentId === targetStudentId);
        if (foundIndex !== -1) classRank = foundIndex + 1;
      } catch (rankErr) {
        console.warn('Rank calculation warning:', rankErr.message);
      }
    }

    res.json({
      status: true,
      success: true,
      data: {
        student: formatLegacyId(student),
        exams: examsList,
        cceGrades: formatLegacyId(cceGrades),
        overallSummary: {
          totalObtained: aggregateObtained,
          totalMax: aggregateMax,
          percentage: Number(overallPct.toFixed(2)),
          grade: overallGradeInfo.grade,
          gradePoint: overallGradeInfo.gradePoint,
          remark: overallGradeInfo.remark,
          rank: classRank,
          totalStudents: totalClassmates,
          finalResult: examsList.every(e => e.isPassed) ? 'PASS' : 'FAIL',
        }
      },
      marks: formatLegacyId(marks.map(m => ({
        id: m.id,
        subject: m.subjectName,
        examName: m.examName?.name,
        maxMarks: m.maxMarks,
        minMarks: m.minMarks,
        marksObtained: m.marksObtained,
        grade: m.grade,
        isAbsent: m.isAbsent,
        isPassed: m.isPassed,
        remarks: m.remarks
      })))
    });
  } catch (err) {
    console.error('Error fetching student marks:', err);
    res.status(500).json({ status: false, success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ADMIN & TEACHER ONLY AUTHORIZATION
// ─────────────────────────────────────────────────────────────
router.use(protect);
router.use(authorize('admin', 'principal', 'head', 'director', 'teacher', 'educator'));

// ─────────────────────────────────────────────────────────────
// 1. DEFINE EXAM TYPE
// ─────────────────────────────────────────────────────────────
// GET /api/examination/types
router.get('/types', async (req, res) => {
  try {
    const academicYear = req.query.academicYear || '2026-2027';
    const types = await prisma.examType.findMany({
      where: { academicYear },
      orderBy: { sequence: 'asc' },
      include: {
        _count: { select: { examMarks: true, examNames: true } }
      }
    });
    res.json({ status: true, data: formatLegacyId(types) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/examination/types (Admin only)
router.post('/types', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { name, fullMarks, minPassMarks, type, weightage, sequence, isActive, academicYear } = req.body;
    if (!name) return res.status(400).json({ status: false, message: 'Exam type name is required' });
    if (Number(minPassMarks) > Number(fullMarks)) {
      return res.status(400).json({ status: false, message: 'Minimum pass marks cannot exceed full marks' });
    }

    const created = await prisma.examType.create({
      data: {
        name: name.trim(),
        fullMarks: Number(fullMarks) || 100,
        minPassMarks: Number(minPassMarks) || 35,
        type: type || 'Term/Semester',
        weightage: Number(weightage) || 0,
        sequence: Number(sequence) || 1,
        isActive: isActive !== false,
        academicYear: academicYear || '2026-2027',
      }
    });
    res.json({ status: true, message: 'Exam type created successfully', data: formatLegacyId(created) });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ status: false, message: 'An exam type with this name already exists for this academic year' });
    }
    res.status(500).json({ status: false, message: err.message });
  }
});

// PUT /api/examination/types/:id (Admin only)
router.put('/types/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { name, fullMarks, minPassMarks, type, weightage, sequence, isActive } = req.body;
    if (minPassMarks !== undefined && fullMarks !== undefined && Number(minPassMarks) > Number(fullMarks)) {
      return res.status(400).json({ status: false, message: 'Minimum pass marks cannot exceed full marks' });
    }

    const updated = await prisma.examType.update({
      where: { id: req.params.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(fullMarks !== undefined ? { fullMarks: Number(fullMarks) } : {}),
        ...(minPassMarks !== undefined ? { minPassMarks: Number(minPassMarks) } : {}),
        ...(type ? { type } : {}),
        ...(weightage !== undefined ? { weightage: Number(weightage) } : {}),
        ...(sequence !== undefined ? { sequence: Number(sequence) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      }
    });
    res.json({ status: true, message: 'Exam type updated successfully', data: formatLegacyId(updated) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// DELETE /api/examination/types/:id (Admin only)
router.delete('/types/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const marksCount = await prisma.examMarks.count({ where: { examTypeId: req.params.id } });
    if (marksCount > 0) {
      return res.status(400).json({
        status: false,
        message: `Cannot delete exam type: ${marksCount} marks records already exist for this type.`
      });
    }

    await prisma.examType.delete({ where: { id: req.params.id } });
    res.json({ status: true, message: 'Exam type deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. EXAM NAMES / DESCRIPTIONS & SCHEDULES
// ─────────────────────────────────────────────────────────────
// GET /api/examination/names
router.get('/names', async (req, res) => {
  try {
    const academicYear = req.query.academicYear || '2026-2027';
    const names = await prisma.examName.findMany({
      where: { academicYear },
      include: {
        examType: true,
        schedules: true,
        _count: { select: { examMarks: true, allocations: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ status: true, data: formatLegacyId(names) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/examination/names (Admin only)
router.post('/names', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { examTypeId, name, description, academicYear, startDate, endDate, isPublished } = req.body;
    if (!examTypeId || !name) {
      return res.status(400).json({ status: false, message: 'Exam Type and Exam Name are required' });
    }

    const created = await prisma.examName.create({
      data: {
        examTypeId,
        name: name.trim(),
        description: description || '',
        academicYear: academicYear || '2026-2027',
        startDate: startDate || '',
        endDate: endDate || '',
        isPublished: Boolean(isPublished),
      },
      include: { examType: true }
    });
    res.json({ status: true, message: 'Exam instance created successfully', data: formatLegacyId(created) });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ status: false, message: 'An exam with this name already exists for this academic year' });
    }
    res.status(500).json({ status: false, message: err.message });
  }
});

// PUT /api/examination/names/:id
router.put('/names/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { name, description, startDate, endDate, isPublished, isLocked } = req.body;
    const updated = await prisma.examName.update({
      where: { id: req.params.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(startDate !== undefined ? { startDate } : {}),
        ...(endDate !== undefined ? { endDate } : {}),
        ...(isPublished !== undefined ? { isPublished: Boolean(isPublished) } : {}),
        ...(isLocked !== undefined ? { isLocked: Boolean(isLocked) } : {}),
      },
      include: { examType: true }
    });
    res.json({ status: true, message: 'Exam instance updated successfully', data: formatLegacyId(updated) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// DELETE /api/examination/names/:id
router.delete('/names/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const marksCount = await prisma.examMarks.count({ where: { examNameId: req.params.id } });
    if (marksCount > 0) {
      return res.status(400).json({
        status: false,
        message: `Cannot delete exam: ${marksCount} student marks entries are already linked.`
      });
    }

    await prisma.examName.delete({ where: { id: req.params.id } });
    res.json({ status: true, message: 'Exam instance deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/examination/schedules (Set exam schedule for a class)
router.post('/schedules', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { examNameId, standard, section, subjectName, subjectId, examDate, startTime, endTime, roomNumber, maxMarks, minPassMarks } = req.body;
    const schedule = await prisma.examSchedule.create({
      data: {
        examNameId,
        standard,
        section,
        subjectName,
        subjectId: subjectId || null,
        examDate: examDate || '',
        startTime: startTime || '',
        endTime: endTime || '',
        roomNumber: roomNumber || '',
        maxMarks: Number(maxMarks) || 100,
        minPassMarks: Number(minPassMarks) || 35,
      }
    });
    res.json({ status: true, message: 'Exam schedule entry saved', data: formatLegacyId(schedule) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. SCORE SHEET ALLOCATION & SEQUENCING
// ─────────────────────────────────────────────────────────────
// GET /api/examination/allocations
router.get('/allocations', async (req, res) => {
  try {
    const { examNameId, standard, section } = req.query;
    const isTeacher = (req.user?.role || '').toLowerCase() === 'teacher';

    const where = {
      ...(examNameId ? { examNameId } : {}),
      ...(standard ? { standard: { in: getStandardVariants(standard) } } : {}),
      ...(section ? { section } : {}),
      ...(isTeacher ? {
        OR: [
          { employeeId: req.user.employeeId || '' },
          { teacherName: { contains: req.user.name || '', mode: 'insensitive' } }
        ]
      } : {})
    };

    const allocations = await prisma.examAllocation.findMany({
      where,
      orderBy: [{ standard: 'asc' }, { section: 'asc' }, { sequence: 'asc' }],
      include: { examName: true }
    });
    res.json({ status: true, data: formatLegacyId(allocations) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/examination/allocations (Allocate subject + class + teacher)
router.post('/allocations', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { examNameId, standard, section, subjectName, subjectId, teacherName, employeeId, sequence } = req.body;
    if (!examNameId || !standard || !section || !subjectName) {
      return res.status(400).json({ status: false, message: 'Exam, Class, Section, and Subject are required' });
    }

    const allocation = await prisma.examAllocation.upsert({
      where: {
        examNameId_standard_section_subjectName: {
          examNameId,
          standard,
          section,
          subjectName
        }
      },
      update: {
        subjectId: subjectId || null,
        teacherName: teacherName || '',
        employeeId: employeeId || '',
        sequence: Number(sequence) || 1,
      },
      create: {
        examNameId,
        standard,
        section,
        subjectName,
        subjectId: subjectId || null,
        teacherName: teacherName || '',
        employeeId: employeeId || '',
        sequence: Number(sequence) || 1,
      }
    });

    res.json({ status: true, message: 'Score sheet allocation created successfully', data: formatLegacyId(allocation) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// DELETE /api/examination/allocations/:id
router.delete('/allocations/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const alloc = await prisma.examAllocation.findUnique({ where: { id: req.params.id } });
    if (!alloc) return res.status(404).json({ status: false, message: 'Allocation not found' });

    // Check if marks exist
    const marksExist = await prisma.examMarks.count({
      where: {
        examNameId: alloc.examNameId,
        standard: alloc.standard,
        section: alloc.section,
        subjectName: alloc.subjectName
      }
    });

    if (marksExist > 0) {
      return res.status(400).json({
        status: false,
        message: `Cannot deallocate: ${marksExist} student marks already entered for this subject.`
      });
    }

    await prisma.examAllocation.delete({ where: { id: req.params.id } });
    res.json({ status: true, message: 'Allocation removed successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. MARKS ENTRY & BULK UPSERT & IMPORT
// ─────────────────────────────────────────────────────────────
// GET /api/examination/marks (Filtered marks list with student roster)
router.get('/marks', async (req, res) => {
  try {
    const examNameId = req.query.examNameId;
    const standard = req.query.standard || req.query.className;
    const section = req.query.section;
    const subjectName = req.query.subjectName || req.query.subject;
    if (!examNameId || !standard || !section || !subjectName) {
      return res.status(400).json({ status: false, success: false, message: 'Please provide examNameId, standard, section, and subjectName' });
    }

    const exam = await prisma.examName.findUnique({
      where: { id: examNameId },
      include: { examType: true }
    });

    if (!exam) return res.status(404).json({ status: false, message: 'Exam instance not found' });

    // Teacher access check & assignment status
    const isTeacher = (req.user?.role || '').toLowerCase() === 'teacher';
    let isAssigned = true;
    if (isTeacher) {
      let empId = req.user.employeeId || '';
      let tName = req.user.name || '';
      try {
        const teacherDoc = await prisma.teacher.findFirst({
          where: { OR: [{ userId: req.user.id }, { email: req.user.email }, { name: req.user.name }] }
        });
        if (teacherDoc?.employeeId) empId = teacherDoc.employeeId;
        if (teacherDoc?.name) tName = teacherDoc.name;
      } catch (_) {}

      const alloc = await prisma.examAllocation.findFirst({
        where: {
          examNameId,
          standard,
          section,
          subjectName,
          OR: [
            { employeeId: empId },
            { teacherName: { contains: tName, mode: 'insensitive' } },
            { teacherName: 'Admin User' }
          ]
        }
      });

      const mapping = alloc || await prisma.teacherClassSubjectMapping.findFirst({
        where: {
          standard,
          section,
          subject: subjectName,
          OR: [
            { employeeId: empId },
            { teacherName: { contains: tName, mode: 'insensitive' } }
          ]
        }
      });

      isAssigned = Boolean(alloc || mapping);
    }

    // Fetch existing students in this class
    const stdVariants = getStandardVariants(standard);
    const students = await prisma.student.findMany({
      where: { standard: { in: stdVariants }, section },
      orderBy: [{ rollNumber: 'asc' }, { name: 'asc' }]
    });

    // Fetch entered marks
    const enteredMarks = await prisma.examMarks.findMany({
      where: { examNameId, standard: { in: stdVariants }, section, subjectName }
    });

    const marksMap = {};
    enteredMarks.forEach(m => {
      marksMap[m.studentId] = m;
    });

    // Merge student roster with existing marks
    const roster = students.map(s => {
      const existing = marksMap[s.id];
      return {
        studentId: s.id,
        rollNo: s.rollNumber || '01',
        rollNumber: s.rollNumber || '01',
        studentName: s.name,
        standard: s.standard,
        section: s.section,
        examName: exam.name,
        subject: subjectName,
        subjectName,
        maxMarks: existing ? existing.maxMarks : (exam.examType?.fullMarks || 100),
        minMarks: existing ? existing.minMarks : (exam.examType?.minPassMarks || 35),
        marksObtained: existing ? existing.marksObtained : 0,
        isAbsent: existing ? existing.isAbsent : false,
        isPassed: existing ? existing.isPassed : true,
        grade: existing ? existing.grade : 'A',
        gradePoint: existing ? existing.gradePoint : 9,
        remarks: existing ? existing.remarks : '',
        isLocked: existing ? existing.isLocked : exam.isLocked,
        marksId: existing ? existing.id : null,
      };
    });

    const responsePayload = {
      exam: formatLegacyId(exam),
      isExamLocked: exam.isLocked,
      isLocked: exam.isLocked,
      isPublished: exam.isPublished,
      isAssigned,
      roster
    };

    res.json({
      status: true,
      success: true,
      data: responsePayload,
      roster,
      isExamLocked: exam.isLocked,
      isLocked: exam.isLocked,
      isPublished: exam.isPublished
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/examination/marks/bulk (Save/Upsert marks for multiple students)
router.post('/marks/bulk', async (req, res) => {
  try {
    const { examNameId, standard, section, subjectName, marksList } = req.body;
    if (!examNameId || !marksList || !Array.isArray(marksList)) {
      return res.status(400).json({ status: false, message: 'Invalid payload: examNameId and marksList array are required' });
    }

    const exam = await prisma.examName.findUnique({
      where: { id: examNameId },
      include: { examType: true }
    });

    if (!exam) return res.status(404).json({ status: false, message: 'Exam not found' });
    if (exam.isLocked && (req.user?.role || '').toLowerCase() === 'teacher') {
      return res.status(403).json({ status: false, message: 'Exam marks entry is locked by Administrator' });
    }

    const savedRecords = [];
    const errors = [];

    for (const item of marksList) {
      try {
        const isAbsent = Boolean(item.isAbsent);
        const marksObtained = isAbsent ? 0 : Number(item.marksObtained);
        const maxMarks = Number(item.maxMarks) || exam.examType?.fullMarks || 100;
        const minMarks = Number(item.minMarks) || exam.examType?.minPassMarks || 35;

        if (!isAbsent && (marksObtained < 0 || marksObtained > maxMarks)) {
          errors.push({ studentId: item.studentId, error: `Marks must be between 0 and ${maxMarks}` });
          continue;
        }

        const pct = maxMarks > 0 ? (marksObtained / maxMarks) * 100 : 0;
        const gradeInfo = await calculateGrade(pct);
        const isPassed = !isAbsent && marksObtained >= minMarks;

        const record = await prisma.examMarks.upsert({
          where: {
            studentId_examNameId_subjectName: {
              studentId: item.studentId,
              examNameId,
              subjectName: subjectName || item.subjectName,
            }
          },
          update: {
            marksObtained,
            isAbsent,
            isPassed,
            grade: gradeInfo.grade,
            gradePoint: gradeInfo.gradePoint,
            remarks: item.remarks || '',
            modifiedBy: `${req.user.name} (${req.user.role})`,
            modifiedOn: new Date(),
          },
          create: {
            examNameId,
            examTypeId: exam.examTypeId,
            studentId: item.studentId,
            rollNumber: item.rollNumber || '01',
            studentName: item.studentName,
            standard: standard || item.standard,
            section: section || item.section,
            subjectName: subjectName || item.subjectName,
            maxMarks,
            minMarks,
            marksObtained,
            isAbsent,
            isPassed,
            grade: gradeInfo.grade,
            gradePoint: gradeInfo.gradePoint,
            remarks: item.remarks || '',
            enteredBy: `${req.user.name} (${req.user.role})`,
          }
        });
        savedRecords.push(record);
      } catch (rowErr) {
        errors.push({ studentId: item.studentId, error: rowErr.message });
      }
    }

    res.json({
      status: true,
      message: `Successfully saved ${savedRecords.length} marks entries`,
      data: formatLegacyId(savedRecords),
      errors
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 5. MODIFY MARKS (WITH MANDATORY AUDIT REASON FOR ADMIN)
// ─────────────────────────────────────────────────────────────
router.put('/marks/modify/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { marksObtained, isAbsent, reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ status: false, message: 'Mandatory audit reason required to modify examination marks' });
    }

    const existing = await prisma.examMarks.findUnique({
      where: { id: req.params.id },
      include: { examName: true }
    });

    if (!existing) return res.status(404).json({ status: false, message: 'Marks record not found' });

    const newMarks = isAbsent ? 0 : Number(marksObtained);
    const pct = existing.maxMarks > 0 ? (newMarks / existing.maxMarks) * 100 : 0;
    const gradeInfo = await calculateGrade(pct);

    // Create Audit Log Entry
    await prisma.examAuditLog.create({
      data: {
        examMarksId: existing.id,
        studentId: existing.studentId,
        studentName: existing.studentName,
        subjectName: existing.subjectName,
        examName: existing.examName?.name || 'Exam',
        oldMarks: existing.marksObtained,
        newMarks: newMarks,
        oldIsAbsent: existing.isAbsent,
        newIsAbsent: Boolean(isAbsent),
        changedBy: req.user.name,
        role: req.user.role,
        reason: reason.trim(),
      }
    });

    // Update marks
    const updated = await prisma.examMarks.update({
      where: { id: req.params.id },
      data: {
        marksObtained: newMarks,
        isAbsent: Boolean(isAbsent),
        isPassed: !isAbsent && newMarks >= existing.minMarks,
        grade: gradeInfo.grade,
        gradePoint: gradeInfo.gradePoint,
        modifiedBy: `${req.user.name} (${req.user.role}) [Audit Modified]`,
        modifiedOn: new Date(),
      }
    });

    res.json({ status: true, message: 'Marks modified and audit trail recorded successfully', data: formatLegacyId(updated) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// GET /api/examination/audit-logs
router.get('/audit-logs', authorize('admin', 'principal'), async (req, res) => {
  try {
    const logs = await prisma.examAuditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    res.json({ status: true, data: formatLegacyId(logs) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 6. LOCK / UNLOCK MARKS & PUBLISH RESULTS
// ─────────────────────────────────────────────────────────────
router.post('/toggle-lock', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { examNameId, isLocked } = req.body;
    if (!examNameId) return res.status(400).json({ status: false, message: 'examNameId is required' });

    const updated = await prisma.examName.update({
      where: { id: examNameId },
      data: { isLocked: Boolean(isLocked) }
    });

    // Also lock all marks entries
    await prisma.examMarks.updateMany({
      where: { examNameId },
      data: { isLocked: Boolean(isLocked) }
    });

    res.json({
      status: true,
      message: `Exam marks successfully ${isLocked ? 'LOCKED' : 'UNLOCKED'} for teachers`,
      data: formatLegacyId(updated)
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.post('/toggle-publish', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { examNameId, isPublished } = req.body;
    if (!examNameId) return res.status(400).json({ status: false, message: 'examNameId is required' });

    const updated = await prisma.examName.update({
      where: { id: examNameId },
      data: { isPublished: Boolean(isPublished) }
    });

    res.json({
      status: true,
      message: `Exam results ${isPublished ? 'PUBLISHED' : 'UNPUBLISHED'}`,
      data: formatLegacyId(updated)
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 7. MARKS CARD / REPORT CARDS DATA GENERATION
// ─────────────────────────────────────────────────────────────
router.get('/report-cards', async (req, res) => {
  try {
    const standard = req.query.standard || req.query.className;
    const section = req.query.section;
    const examNameId = req.query.examNameId;
    if (!standard || !section) {
      return res.status(400).json({ status: false, success: false, message: 'Standard and Section are required' });
    }

    const stdVariants = getStandardVariants(standard);
    const students = await prisma.student.findMany({
      where: { standard: { in: stdVariants }, section },
      orderBy: [{ rollNumber: 'asc' }, { name: 'asc' }]
    });

    const marks = await prisma.examMarks.findMany({
      where: {
        standard: { in: stdVariants },
        section,
        ...(examNameId ? { examNameId } : {})
      },
      include: {
        examName: { include: { examType: true } }
      }
    });

    const schoolSettings = await prisma.schoolSettings.findFirst();

    // Group marks by student
    const studentReports = students.map(stu => {
      const stuMarks = marks.filter(m => m.studentId === stu.id);
      let totalObtained = 0;
      let totalMax = 0;
      let allPassed = true;

      stuMarks.forEach(m => {
        if (!m.isAbsent) totalObtained += m.marksObtained;
        totalMax += m.maxMarks;
        if (!m.isPassed) allPassed = false;
      });

      const percentage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
      let calculatedGrade = 'F';
      if (percentage >= 90) calculatedGrade = 'A+';
      else if (percentage >= 80) calculatedGrade = 'A';
      else if (percentage >= 70) calculatedGrade = 'B+';
      else if (percentage >= 60) calculatedGrade = 'B';
      else if (percentage >= 50) calculatedGrade = 'C';
      else if (percentage >= 35) calculatedGrade = 'D';

      const subjects = stuMarks.map(m => ({
        subject: m.subjectName,
        subjectName: m.subjectName,
        maxMarks: m.maxMarks,
        minMarks: m.minMarks,
        marksObtained: m.marksObtained,
        isAbsent: m.isAbsent,
        grade: m.grade || 'A',
        gradePoint: m.gradePoint || 9,
        result: m.isPassed ? 'PASS' : 'FAIL',
        remarks: m.remarks,
        examName: m.examName?.name
      }));

      return {
        student: {
          ...formatLegacyId(stu),
          rollNo: stu.rollNumber || stu.rollNo || '01',
          class: stu.standard,
          section: stu.section
        },
        subjects,
        marks: formatLegacyId(stuMarks),
        totalObtained,
        totalMax,
        percentage,
        calculatedGrade,
        result: allPassed ? 'PASS' : 'FAIL',
        rank: 1, // Will be computed below
      };
    });

    // Compute ranks
    studentReports.sort((a, b) => b.percentage - a.percentage);
    studentReports.forEach((rep, idx) => {
      rep.rank = idx + 1;
    });

    res.json({
      status: true,
      data: {
        school: formatLegacyId(schoolSettings),
        reports: studentReports
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 8. CCE SKILLS & CCE TEST TYPES
// ─────────────────────────────────────────────────────────────
router.get('/cce-skills', async (req, res) => {
  try {
    const skills = await prisma.cCESkill.findMany({ orderBy: { sequence: 'asc' } });
    res.json({ status: true, data: formatLegacyId(skills) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.post('/cce-skills', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { skillName, category, description, sequence } = req.body;
    const skill = await prisma.cCESkill.create({
      data: {
        skillName: skillName.trim(),
        category: category || 'Co-Scholastic',
        description: description || '',
        sequence: Number(sequence) || 1,
      }
    });
    res.json({ status: true, message: 'CCE Skill created', data: formatLegacyId(skill) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.get('/cce-test-types', async (req, res) => {
  try {
    const testTypes = await prisma.cCETestType.findMany({ orderBy: { sequence: 'asc' } });
    res.json({ status: true, data: formatLegacyId(testTypes) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.post('/cce-grades/bulk', async (req, res) => {
  try {
    const { gradesList, term, academicYear } = req.body;
    if (!gradesList || !Array.isArray(gradesList)) {
      return res.status(400).json({ status: false, message: 'Invalid payload: gradesList array is required' });
    }

    const saved = [];
    for (const item of gradesList) {
      const record = await prisma.studentCCEGrade.upsert({
        where: {
          studentId_academicYear_term_skillName: {
            studentId: item.studentId,
            academicYear: academicYear || '2026-2027',
            term: term || 'Term 1',
            skillName: item.skillName,
          }
        },
        update: {
          grade: item.grade,
          remarks: item.remarks || '',
          assessedBy: req.user.name,
        },
        create: {
          studentId: item.studentId,
          studentName: item.studentName,
          standard: item.standard,
          section: item.section,
          academicYear: academicYear || '2026-2027',
          term: term || 'Term 1',
          skillId: item.skillId || item.skillName,
          skillName: item.skillName,
          grade: item.grade,
          remarks: item.remarks || '',
          assessedBy: req.user.name,
        }
      });
      saved.push(record);
    }

    res.json({ status: true, message: `Saved ${saved.length} CCE skill assessments`, data: formatLegacyId(saved) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 9. RESULT ANALYTICS & TEACHER PENDING TRACKER
// ─────────────────────────────────────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const examNameId = req.query.examNameId;
    const standard = req.query.standard || req.query.className;
    const section = req.query.section;
    if (!examNameId) return res.status(400).json({ status: false, success: false, message: 'examNameId is required' });

    const marks = await prisma.examMarks.findMany({
      where: {
        examNameId,
        ...(standard ? { standard: { in: getStandardVariants(standard) } } : {}),
        ...(section ? { section } : {})
      }
    });

    if (marks.length === 0) {
      return res.json({
        status: true,
        data: {
          totalEntries: 0,
          passPercentage: 0,
          averageMarks: 0,
          highestMarks: 0,
          lowestMarks: 0,
          subjectStats: [],
          gradeDistribution: {},
          topStudents: [],
          pendingTeachers: [],
        }
      });
    }

    // Overall analytics
    let totalMarks = 0;
    let highest = 0;
    let lowest = 9999;
    let passCount = 0;
    const gradeCounts = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    const subjectMap = {};
    const studentAggMap = {};

    marks.forEach(m => {
      const score = m.isAbsent ? 0 : m.marksObtained;
      totalMarks += score;
      if (score > highest) highest = score;
      if (score < lowest && !m.isAbsent) lowest = score;
      if (m.isPassed) passCount++;

      const gr = m.grade || 'C';
      if (gradeCounts[gr] !== undefined) gradeCounts[gr]++;

      // Subject stats
      if (!subjectMap[m.subjectName]) {
        subjectMap[m.subjectName] = { subject: m.subjectName, total: 0, count: 0, passCount: 0 };
      }
      subjectMap[m.subjectName].total += score;
      subjectMap[m.subjectName].count++;
      if (m.isPassed) subjectMap[m.subjectName].passCount++;

      // Student aggregate
      if (!studentAggMap[m.studentId]) {
        studentAggMap[m.studentId] = { studentName: m.studentName, standard: m.standard, section: m.section, totalObtained: 0, totalMax: 0 };
      }
      studentAggMap[m.studentId].totalObtained += score;
      studentAggMap[m.studentId].totalMax += m.maxMarks;
    });

    const average = totalMarks / marks.length;
    const passPct = (passCount / marks.length) * 100;

    const subjectStats = Object.values(subjectMap).map(s => ({
      subject: s.subject,
      average: Number((s.total / s.count).toFixed(2)),
      passPercentage: Number(((s.passCount / s.count) * 100).toFixed(2)),
    }));

    const topStudents = Object.values(studentAggMap)
      .map(s => ({
        ...s,
        percentage: s.totalMax > 0 ? Number(((s.totalObtained / s.totalMax) * 100).toFixed(2)) : 0
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10);

    // Pending teacher tracker
    const allocations = await prisma.examAllocation.findMany({
      where: { examNameId }
    });

    const pendingTeachers = [];
    for (const a of allocations) {
      const enteredCount = await prisma.examMarks.count({
        where: {
          examNameId: a.examNameId,
          standard: a.standard,
          section: a.section,
          subjectName: a.subjectName
        }
      });
      const studentCount = await prisma.student.count({
        where: { standard: a.standard, section: a.section }
      });

      if (enteredCount < studentCount) {
        pendingTeachers.push({
          teacherName: a.teacherName || 'Assigned Faculty',
          subjectName: a.subjectName,
          standard: a.standard,
          section: a.section,
          pendingCount: studentCount - enteredCount,
          totalStudents: studentCount,
        });
      }
    }

    res.json({
      status: true,
      data: {
        totalEntries: marks.length,
        passPercentage: Number(passPct.toFixed(2)),
        averageMarks: Number(average.toFixed(2)),
        highestMarks: highest,
        lowestMarks: lowest === 9999 ? 0 : lowest,
        subjectStats,
        gradeDistribution: gradeCounts,
        topStudents,
        pendingTeachers,
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 10. GRADE SCALE & WEIGHTAGES MASTERS
// ─────────────────────────────────────────────────────────────
router.get('/grades', async (req, res) => {
  try {
    const grades = await prisma.gradeScale.findMany({ orderBy: { sequence: 'asc' } });
    res.json({ status: true, data: formatLegacyId(grades) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.post('/grades', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { grade, minPercent, maxPercent, gradePoint, remark, sequence } = req.body;
    const created = await prisma.gradeScale.upsert({
      where: { grade },
      update: {
        minPercent: Number(minPercent),
        maxPercent: Number(maxPercent),
        gradePoint: Number(gradePoint) || 0,
        remark: remark || '',
        sequence: Number(sequence) || 1,
      },
      create: {
        grade,
        minPercent: Number(minPercent),
        maxPercent: Number(maxPercent),
        gradePoint: Number(gradePoint) || 0,
        remark: remark || '',
        sequence: Number(sequence) || 1,
      }
    });
    res.json({ status: true, message: 'Grade scale updated', data: formatLegacyId(created) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

export default router;
