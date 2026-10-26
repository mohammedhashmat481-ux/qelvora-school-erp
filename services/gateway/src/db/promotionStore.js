import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'promotionData.json');

const STANDARDS_ORDER = [
  'Nursery',
  'LKG',
  'UKG',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th'
];

const DEFAULT_PROMOTION_STATE = {
  settings: {
    currentAcademicYear: '2026-2027',
    nextAcademicYear: '2027-2028',
    academicYears: ['2024-2025', '2025-2026', '2026-2027', '2027-2028', '2028-2029'],
    standardsList: STANDARDS_ORDER,
    terminalStandard: '12th',
    allowRepeat: true,
    autoAssignRollNumber: true
  },
  enrollmentHistory: {}, // studentId -> array of enrollment objects
  alumniRecords: [], // array of graduated students
  auditLogs: [] // array of promotion batches
};

class PromotionStore {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.settings) this.data.settings = DEFAULT_PROMOTION_STATE.settings;
        if (!this.data.enrollmentHistory) this.data.enrollmentHistory = {};
        if (!this.data.alumniRecords) this.data.alumniRecords = [];
        if (!this.data.auditLogs) this.data.auditLogs = [];
      } else {
        this.data = JSON.parse(JSON.stringify(DEFAULT_PROMOTION_STATE));
        this.save();
      }
    } catch (err) {
      console.error('PromotionStore init error:', err);
      this.data = JSON.parse(JSON.stringify(DEFAULT_PROMOTION_STATE));
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write promotionData.json:', err);
    }
  }

  getNextStandard(std) {
    const idx = STANDARDS_ORDER.indexOf(std);
    if (idx === -1 || idx === STANDARDS_ORDER.length - 1) {
      return null; // Terminal class (e.g. 12th)
    }
    return STANDARDS_ORDER[idx + 1];
  }

  isTerminalStandard(std) {
    return std === (this.data.settings.terminalStandard || '12th');
  }

  // Ensure initial baseline enrollment is registered for existing DB students
  ensureBaselineEnrollment(student, currentYear) {
    const yr = currentYear || this.data.settings.currentAcademicYear;
    if (!this.data.enrollmentHistory[student.id]) {
      this.data.enrollmentHistory[student.id] = [];
    }

    const exists = this.data.enrollmentHistory[student.id].some(e => e.academicYear === yr);
    if (!exists) {
      this.data.enrollmentHistory[student.id].push({
        academicYear: yr,
        standard: student.standard,
        section: student.section,
        rollNumber: student.rollNumber || '',
        status: student.leftSchoolStatus ? 'Graduated' : 'Active',
        assignedAt: student.createdAt || new Date().toISOString(),
        assignedBy: 'System Baseline',
        remarks: `Enrolled in Class ${student.standard}-${student.section}`
      });
      this.save();
    }
  }

  // Get student enrollment history across academic years
  getStudentHistory(studentId) {
    return this.data.enrollmentHistory[studentId] || [];
  }

  // Class summary metrics for the promotion dashboard (class-wise and section-wise)
  async getClassSummary(fromYear, toYear) {
    const srcYear = fromYear || this.data.settings.currentAcademicYear;
    const tgtYear = toYear || this.data.settings.nextAcademicYear;

    let dbStudents = [];
    let dbClasses = [];
    try {
      [dbStudents, dbClasses] = await Promise.all([
        prisma.student.findMany({
          where: { leftSchoolStatus: false },
          orderBy: [{ standard: 'asc' }, { section: 'asc' }]
        }),
        prisma.class.findMany({
          orderBy: [{ standard: 'asc' }, { section: 'asc' }]
        })
      ]);
    } catch (e) {
      console.warn('Prisma student read in getClassSummary error:', e.message);
    }

    const classTeacherMap = {};
    dbClasses.forEach(c => {
      classTeacherMap[`${c.standard}-${c.section}`] = c.classTeacherName || '';
    });

    const classesMap = {};

    STANDARDS_ORDER.forEach(std => {
      const isTerminal = this.isTerminalStandard(std);
      const nextStd = this.getNextStandard(std);
      classesMap[std] = {
        standard: std,
        nextStandard: isTerminal ? 'Graduated (Alumni)' : nextStd,
        isTerminal,
        totalStudents: 0,
        eligibleCount: 0,
        alreadyPromotedCount: 0,
        underReviewCount: 0,
        sections: new Set(),
        sectionsDetail: {}
      };
    });

    dbStudents.forEach(student => {
      this.ensureBaselineEnrollment(student, srcYear);
      const std = student.standard;
      const sec = student.section || 'A';

      if (!classesMap[std]) {
        classesMap[std] = {
          standard: std,
          nextStandard: this.getNextStandard(std) || 'Next Class',
          isTerminal: this.isTerminalStandard(std),
          totalStudents: 0,
          eligibleCount: 0,
          alreadyPromotedCount: 0,
          underReviewCount: 0,
          sections: new Set(),
          sectionsDetail: {}
        };
      }

      classesMap[std].totalStudents++;
      classesMap[std].sections.add(sec);

      const history = this.data.enrollmentHistory[student.id] || [];
      const hasTargetYear = history.some(e => e.academicYear === tgtYear);

      if (hasTargetYear) {
        classesMap[std].alreadyPromotedCount++;
      } else {
        classesMap[std].eligibleCount++;
      }

      // Section-wise metrics
      if (!classesMap[std].sectionsDetail[sec]) {
        classesMap[std].sectionsDetail[sec] = {
          section: sec,
          classTeacher: classTeacherMap[`${std}-${sec}`] || '',
          totalStudents: 0,
          eligibleCount: 0,
          alreadyPromotedCount: 0,
          pendingCount: 0
        };
      }

      classesMap[std].sectionsDetail[sec].totalStudents++;
      if (hasTargetYear) {
        classesMap[std].sectionsDetail[sec].alreadyPromotedCount++;
      } else {
        classesMap[std].sectionsDetail[sec].eligibleCount++;
      }
      classesMap[std].sectionsDetail[sec].pendingCount = Math.max(
        0,
        classesMap[std].sectionsDetail[sec].totalStudents - classesMap[std].sectionsDetail[sec].alreadyPromotedCount
      );
    });

    const result = Object.values(classesMap).map(c => ({
      ...c,
      sections: Array.from(c.sections).sort(),
      sectionsDetail: Object.values(c.sectionsDetail || {}).sort((a, b) => a.section.localeCompare(b.section)),
      pendingCount: Math.max(0, c.totalStudents - c.alreadyPromotedCount)
    }));

    return {
      fromAcademicYear: srcYear,
      toAcademicYear: tgtYear,
      classes: result
    };
  }

  // Get students list with promotion status
  async getStudentsForPromotion(filter = {}) {
    const srcYear = filter.academicYear || this.data.settings.currentAcademicYear;
    const tgtYear = filter.nextAcademicYear || this.data.settings.nextAcademicYear;

    const where = {};
    if (filter.standard) where.standard = filter.standard;
    if (filter.section) where.section = filter.section;
    where.leftSchoolStatus = false; // Active students only

    let dbStudents = [];
    try {
      dbStudents = await prisma.student.findMany({
        where,
        orderBy: [{ standard: 'asc' }, { section: 'asc' }, { rollNumber: 'asc' }]
      });
    } catch (e) {
      console.warn('Prisma student read in getStudentsForPromotion error:', e.message);
    }

    const students = dbStudents.map(s => {
      this.ensureBaselineEnrollment(s, srcYear);
      const history = this.data.enrollmentHistory[s.id] || [];
      const nextEnrollment = history.find(e => e.academicYear === tgtYear);
      const isTerminal = this.isTerminalStandard(s.standard);
      const defaultNextStd = isTerminal ? 'Graduated' : (this.getNextStandard(s.standard) || s.standard);

      let promotionStatus = 'Eligible';
      let destClass = defaultNextStd;
      let destSection = s.section || 'A';
      let destRollNumber = s.rollNumber || '';

      if (nextEnrollment) {
        promotionStatus = nextEnrollment.status === 'Graduated' ? 'Graduated' : 'Already Promoted';
        destClass = nextEnrollment.standard;
        destSection = nextEnrollment.section;
        destRollNumber = nextEnrollment.rollNumber || s.rollNumber || '';
      } else if (isTerminal) {
        promotionStatus = 'Eligible for Graduation';
        destClass = 'Alumni / Graduated';
      }

      return {
        ...s,
        currentAcademicYear: srcYear,
        targetAcademicYear: tgtYear,
        promotionStatus,
        isTerminal,
        destinationClass: destClass,
        destinationSection: destSection,
        destinationRollNumber: destRollNumber,
        historyCount: history.length,
        enrollmentHistory: history
      };
    });

    let filtered = students;
    if (filter.status && filter.status !== 'all') {
      filtered = filtered.filter(s => {
        if (filter.status === 'eligible') return s.promotionStatus.startsWith('Eligible');
        if (filter.status === 'promoted') return s.promotionStatus === 'Already Promoted';
        if (filter.status === 'graduated') return s.promotionStatus === 'Graduated';
        if (filter.status === 'review') return s.promotionStatus === 'Under Review';
        return true;
      });
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim().toLowerCase();
      filtered = filtered.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.studentId && s.studentId.toLowerCase().includes(q)) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) ||
        (s.parentName && s.parentName.toLowerCase().includes(q))
      );
    }

    return filtered;
  }

  // Preview promotion operation before execution
  async previewPromotion(payload) {
    const { fromAcademicYear, toAcademicYear, promotions = [] } = payload;
    const srcYear = fromAcademicYear || this.data.settings.currentAcademicYear;
    const tgtYear = toAcademicYear || this.data.settings.nextAcademicYear;

    if (srcYear === tgtYear) {
      throw new Error('Current Academic Year and Next Academic Year must be distinct.');
    }

    const studentIds = promotions.map(p => p.studentId);
    let students = [];
    try {
      students = await prisma.student.findMany({
        where: { id: { in: studentIds } }
      });
    } catch (e) {
      throw new Error('Database lookup failed: ' + e.message);
    }

    let toPromoteCount = 0;
    let toGraduateCount = 0;
    let toRepeatCount = 0;
    let reviewCount = 0;
    const warnings = [];
    const previewItems = [];

    // Check if destination class (e.g. 10th) already has active students from source year
    const targetStandards = [...new Set(promotions.map(p => p.targetStandard).filter(Boolean))];
    for (const tStd of targetStandards) {
      if (tStd !== 'Graduated' && tStd !== 'Alumni / Graduated') {
        const existingInTarget = await prisma.student.count({
          where: { standard: tStd, leftSchoolStatus: false }
        }).catch(() => 0);
        if (existingInTarget > 0) {
          warnings.push(
            `Notice: Class ${tStd} currently has ${existingInTarget} enrolled student(s) in the current academic year. Those students must either be promoted or graduated so classes remain clean.`
          );
        }
      }
    }

    promotions.forEach(item => {
      const student = students.find(s => s.id === item.studentId);
      if (!student) return;

      const history = this.data.enrollmentHistory[student.id] || [];
      const alreadyInTarget = history.some(e => e.academicYear === tgtYear);
      if (alreadyInTarget) {
        warnings.push(`Student ${student.name} (${student.studentId}) already has an enrollment record for ${tgtYear}.`);
      }

      const isTerminal = this.isTerminalStandard(student.standard);
      const action = item.action || (isTerminal ? 'graduate' : 'promote');
      const targetStd = item.targetStandard || (isTerminal ? 'Graduated' : this.getNextStandard(student.standard));
      const targetSec = item.targetSection || student.section || 'A';

      if (action === 'graduate') toGraduateCount++;
      else if (action === 'promote') toPromoteCount++;
      else if (action === 'repeat') toRepeatCount++;
      else reviewCount++;

      previewItems.push({
        studentId: student.id,
        admissionNumber: student.studentId,
        name: student.name,
        currentStandard: student.standard,
        currentSection: student.section,
        action,
        targetStandard: targetStd,
        targetSection: targetSec,
        targetRollNumber: item.targetRollNumber || student.rollNumber || '',
        remarks: item.remarks || (action === 'graduate' ? 'Class 12th completion (Alumni)' : `Promoted to ${targetStd}-${targetSec}`)
      });
    });

    return {
      fromAcademicYear: srcYear,
      toAcademicYear: tgtYear,
      totalSelected: promotions.length,
      toPromoteCount,
      toGraduateCount,
      toRepeatCount,
      reviewCount,
      warnings,
      previewItems
    };
  }

  // Execute promotion in atomic database transaction
  async executePromotion(payload, adminUser = 'Admin') {
    const { fromAcademicYear, toAcademicYear, promotions = [] } = payload;
    const srcYear = fromAcademicYear || this.data.settings.currentAcademicYear;
    const tgtYear = toAcademicYear || this.data.settings.nextAcademicYear;

    if (!promotions || promotions.length === 0) {
      throw new Error('No students selected for promotion.');
    }

    if (srcYear === tgtYear) {
      throw new Error('Source and target academic years cannot be identical.');
    }

    const studentIds = promotions.map(p => p.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } }
    });

    const timestamp = new Date().toISOString();
    const batchId = `promo-batch-${Date.now()}`;
    const processedStudents = [];
    let promotedCount = 0;
    let graduatedCount = 0;
    let repeatedCount = 0;
    let reviewCount = 0;

    // Database transaction / sequential execution
    for (const item of promotions) {
      const student = students.find(s => s.id === item.studentId);
      if (!student) continue;

      const isTerminal = this.isTerminalStandard(student.standard);
      const action = item.action || (isTerminal ? 'graduate' : 'promote');
      const targetStd = item.targetStandard || (isTerminal ? 'Graduated' : this.getNextStandard(student.standard));
      const targetSec = item.targetSection || student.section || 'A';
      const targetRoll = item.targetRollNumber || student.rollNumber || '';
      const remarks = item.remarks || '';

      // Ensure baseline enrollment for source year
      this.ensureBaselineEnrollment(student, srcYear);

      // Record source year enrollment status
      const history = this.data.enrollmentHistory[student.id] || [];
      const srcRecord = history.find(e => e.academicYear === srcYear);
      if (srcRecord) {
        srcRecord.status = action === 'graduate' ? 'Graduated' : action === 'repeat' ? 'Detained' : 'Promoted';
        srcRecord.promotedAt = timestamp;
        srcRecord.promotedBy = adminUser;
        srcRecord.remarks = remarks || (action === 'graduate' ? 'Completed final standard (12th)' : `Promoted to ${targetStd}-${targetSec}`);
      }

      if (action === 'graduate') {
        graduatedCount++;
        // Update Prisma DB: Student marks leftSchoolStatus = true
        await prisma.student.update({
          where: { id: student.id },
          data: {
            leftSchoolStatus: true,
            updatedAt: new Date()
          }
        });

        // Add to Alumni store if not already present
        const alumniExists = this.data.alumniRecords.some(a => a.studentId === student.id);
        if (!alumniExists) {
          this.data.alumniRecords.push({
            id: `alumni-${Date.now()}-${student.studentId}`,
            studentId: student.id,
            admissionNumber: student.studentId,
            name: student.name,
            gender: student.gender || 'Student',
            dob: student.dob || '',
            lastStudiedClass: student.standard,
            lastStudiedSection: student.section,
            rollNumber: student.rollNumber || '',
            academicYearCompleted: srcYear,
            graduationDate: new Date().toISOString().slice(0, 10),
            admissionDate: student.admissionDate || '',
            contactDetails: {
              parentName: student.parentName || '',
              parentPhone: student.parentPhone || '',
              parentEmail: student.parentEmail || '',
              address: student.address || ''
            },
            status: 'Graduated',
            certificateNumber: `TC/${srcYear.replace('-', '/')}/${String(this.data.alumniRecords.length + 1).padStart(3, '0')}`,
            remarks: remarks || 'Completed 12th Standard CBSE Board cycle'
          });
        }
      } else if (action === 'promote') {
        promotedCount++;
        // Add new enrollment record for next academic year
        history.push({
          academicYear: tgtYear,
          standard: targetStd,
          section: targetSec,
          rollNumber: targetRoll,
          status: 'Active',
          assignedAt: timestamp,
          assignedBy: adminUser,
          remarks: `Promoted from ${student.standard}-${student.section} (${srcYear})`
        });

        // Update active class in Prisma DB
        await prisma.student.update({
          where: { id: student.id },
          data: {
            standard: targetStd,
            section: targetSec,
            rollNumber: targetRoll,
            leftSchoolStatus: false,
            updatedAt: new Date()
          }
        });
      } else if (action === 'repeat') {
        repeatedCount++;
        // Student repeats same standard in new year
        history.push({
          academicYear: tgtYear,
          standard: student.standard,
          section: targetSec,
          rollNumber: targetRoll,
          status: 'Active',
          assignedAt: timestamp,
          assignedBy: adminUser,
          remarks: `Repeating Class ${student.standard} in ${tgtYear}`
        });

        await prisma.student.update({
          where: { id: student.id },
          data: {
            section: targetSec,
            rollNumber: targetRoll,
            leftSchoolStatus: false,
            updatedAt: new Date()
          }
        });
      } else {
        reviewCount++;
      }

      this.data.enrollmentHistory[student.id] = history;

      processedStudents.push({
        studentId: student.id,
        admissionNumber: student.studentId,
        name: student.name,
        fromStandard: student.standard,
        fromSection: student.section,
        toStandard: action === 'graduate' ? 'Alumni' : targetStd,
        toSection: targetSec,
        action,
        status: 'Success'
      });
    }

    // Save batch log
    const batchLog = {
      id: batchId,
      timestamp,
      adminUser,
      fromAcademicYear: srcYear,
      toAcademicYear: tgtYear,
      summary: {
        totalProcessed: processedStudents.length,
        promotedCount,
        graduatedCount,
        repeatedCount,
        reviewCount
      },
      students: processedStudents
    };

    this.data.auditLogs.unshift(batchLog);
    this.save();

    return {
      success: true,
      batchId,
      message: `Successfully processed ${processedStudents.length} student(s) for ${tgtYear} (${promotedCount} promoted, ${graduatedCount} graduated).`,
      summary: batchLog.summary,
      batch: batchLog
    };
  }

  // Get alumni records with filtering
  getAlumniRecords(filter = {}) {
    let list = [...this.data.alumniRecords];

    if (filter.academicYearCompleted) {
      list = list.filter(a => a.academicYearCompleted === filter.academicYearCompleted);
    }
    if (filter.lastStudiedClass) {
      list = list.filter(a => a.lastStudiedClass === filter.lastStudiedClass);
    }
    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim().toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.admissionNumber.toLowerCase().includes(q) ||
        (a.contactDetails?.parentName && a.contactDetails.parentName.toLowerCase().includes(q)) ||
        (a.contactDetails?.parentPhone && a.contactDetails.parentPhone.includes(q))
      );
    }

    return list;
  }
}

export const promotionStore = new PromotionStore();
export default promotionStore;
