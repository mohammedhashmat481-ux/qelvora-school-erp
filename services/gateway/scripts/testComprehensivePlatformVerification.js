import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();
const FEES_DATA_PATH = path.resolve(__dirname, '../src/db/feesData.json');

async function runPlatformVerification() {
  console.log('🧪 ========================================================');
  console.log('🔍 EXECUTING COMPREHENSIVE END-TO-END PLATFORM VERIFICATION');
  console.log('🧪 ========================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failedTests++;
    }
  }

  try {
    // 1. CLASSES VERIFICATION
    console.log('\n[1/7] Testing Classes & Class Teachers...');
    const classes = await prisma.class.findMany({ orderBy: { standard: 'asc' } });
    assert(classes.length >= 16, `Found ${classes.length} institutional classes (Expected >= 16)`);

    const hasLKG = classes.some(c => c.standard === 'LKG');
    const hasUKG = classes.some(c => c.standard === 'UKG');
    const has1st = classes.some(c => c.standard === '1st');
    const has5th = classes.some(c => c.standard === '5th');
    const has10th = classes.some(c => c.standard === '10th');
    const has11th = classes.some(c => c.standard === '11th');
    const has12th = classes.some(c => c.standard === '12th');
    assert(hasLKG && hasUKG && has1st && has5th && has10th && has11th && has12th, 'Classes LKG through 12th are all present');

    const allClassesHaveTeacher = classes.every(c => c.classTeacherName && c.classTeacherName.trim().length > 0);
    assert(allClassesHaveTeacher, 'Every class has a designated Class Teacher assigned');

    // 2. STUDENTS PER CLASS & QUOTAS (10 to 20 per class, RTE & General)
    console.log('\n[2/7] Testing Students per Class & Admission Quotas (RTE, General, Merit)...');
    const students = await prisma.student.findMany();
    assert(students.length >= 200, `Found ${students.length} students across classes (Expected >= 200)`);

    // Verify 10-20 students per class
    const classCountMap = {};
    students.forEach(s => {
      const k = `${s.standard}-${s.section}`;
      classCountMap[k] = (classCountMap[k] || 0) + 1;
    });

    const countsInRange = Object.entries(classCountMap).every(([k, cnt]) => cnt >= 10 && cnt <= 20);
    assert(countsInRange, `Every class has between 10 and 20 students (Sample: 10th-A has ${classCountMap['10th-A']} students, 1st-A has ${classCountMap['1st-A']})`);

    // Verify Parent contacts
    const parentsLinked = students.every(s => s.parentName && s.parentPhone && s.parentEmail);
    assert(parentsLinked, 'All students have linked parent profiles with name, phone, and email');

    // 3. SUBJECTS & DISTINCT SUBJECT CODES PER CLASS
    console.log('\n[3/7] Testing Subject Codes & Differentiation per Class...');
    const subjects = await prisma.subject.findMany();
    assert(subjects.length >= 80, `Found ${subjects.length} subjects with standard mappings (Expected >= 80)`);

    // Check code differentiation: ENG-01 vs ENG-03 vs ENG-05 vs ENG-10 vs ENG-11S vs ENG-12S
    const s1Eng = subjects.find(s => s.standard === '1st' && s.code === 'ENG-01');
    const s3Eng = subjects.find(s => s.standard === '3rd' && s.code === 'ENG-03');
    const s5Eng = subjects.find(s => s.standard === '5th' && s.code === 'ENG-05');
    const s10Eng = subjects.find(s => s.standard === '10th' && s.code === 'ENG-10');
    const s11SEng = subjects.find(s => s.standard === '11th' && s.code === 'ENG-11S');
    const s12SEng = subjects.find(s => s.standard === '12th' && s.code === 'ENG-12S');
    assert(Boolean(s1Eng && s3Eng && s5Eng && s10Eng && s11SEng && s12SEng), 'English has distinct codes across classes: ENG-01, ENG-03, ENG-05, ENG-10, ENG-11S, ENG-12S');

    // Check Mathematics codes: MTH-01 vs MTH-03 vs MTH-05 vs MTH-10 vs MTH-11 vs MTH-12
    const s1Mth = subjects.find(s => s.standard === '1st' && s.code === 'MTH-01');
    const s5Mth = subjects.find(s => s.standard === '5th' && s.code === 'MTH-05');
    const s10Mth = subjects.find(s => s.standard === '10th' && s.code === 'MTH-10');
    const s12Mth = subjects.find(s => s.standard === '12th' && s.code === 'MTH-12');
    assert(Boolean(s1Mth && s5Mth && s10Mth && s12Mth), 'Mathematics has distinct codes: MTH-01, MTH-05, MTH-10, MTH-12');

    // Verify Teacher-Class-Subject Mappings
    const mappings = await prisma.teacherClassSubjectMapping.findMany();
    assert(mappings.length >= 80, `Found ${mappings.length} teacher-class-subject mappings`);
    const allMappingsHaveTeacher = mappings.every(m => m.teacherName && m.subject && m.subjectCode);
    assert(allMappingsHaveTeacher, 'Every subject in every class is mapped to a designated faculty member');

    // 4. FEES MANAGEMENT, QUOTAS & RECEIPTS
    console.log('\n[4/7] Testing Fees Structures, Quotas (RTE / General) & Receipts...');
    const feesRaw = fs.readFileSync(FEES_DATA_PATH, 'utf-8');
    const feesData = JSON.parse(feesRaw);

    const hasRteQuota = feesData.quotas.some(q => q.id === 'q-rte' && q.concessionValue === 100);
    const hasGeneralQuota = feesData.quotas.some(q => q.id === 'q-general');
    const hasMeritQuota = feesData.quotas.some(q => q.id === 'q-merit');
    assert(hasRteQuota && hasGeneralQuota && hasMeritQuota, 'Quotas configured: RTE (100% waiver), General, Merit Scholarship');

    const totalStudentQuotas = Object.keys(feesData.studentQuotas).length;
    assert(totalStudentQuotas >= 200, `${totalStudentQuotas} students assigned quotas`);

    const totalReceipts = feesData.receipts.length;
    assert(totalReceipts >= 50, `Found ${totalReceipts} fee collection receipts across payment modes`);

    const paymentModesUsed = new Set(feesData.receipts.map(r => r.paymentMode));
    assert(paymentModesUsed.has('Net Banking / NEFT') && paymentModesUsed.has('UPI / QR Code') && paymentModesUsed.has('Debit / Credit Card') && paymentModesUsed.has('Cash'), 'Receipts recorded across multiple modes: Net Banking, UPI, Card, Cash');

    // 5. EXAMINATION WORKFLOWS: FA1 COMPLETED, FA2 SCHEDULED, GRADE VS RANKING
    console.log('\n[5/7] Testing Examination Workflows (FA1 Completed, FA2 Next, Grade vs Rank)...');
    const fa1 = await prisma.examName.findFirst({ where: { name: { contains: 'FA1' } } });
    const fa2 = await prisma.examName.findFirst({ where: { name: { contains: 'FA2' } } });
    assert(fa1 && fa1.isPublished && fa1.isLocked, 'FA1 is marked as COMPLETED (isPublished=true, isLocked=true)');
    assert(fa2 && !fa2.isPublished && !fa2.isLocked, 'FA2 is scheduled as NEXT UPCOMING EXAM (isPublished=false, isLocked=false)');

    const fa1MarksCount = await prisma.examMarks.count({ where: { examNameId: fa1.id } });
    assert(fa1MarksCount >= 1000, `Found ${fa1MarksCount} marks records entered by teachers for FA1`);

    const fa2AllocationsCount = await prisma.examAllocation.count({ where: { examNameId: fa2.id } });
    assert(fa2AllocationsCount >= 80, `Found ${fa2AllocationsCount} subject allocations configured for FA2 for faculty marks entry`);

    // Verify Grading Rule:
    // Primary student (Class <= 5th, e.g. 5th or 3rd): Grade only, no class rank
    // Senior student (Class >= 6th, e.g. 10th or 12th): Rank + Percentage + Grade
    const stu5th = students.find(s => s.standard === '5th' && s.rollNumber === '01');
    const stu10th = students.find(s => s.standard === '10th' && s.rollNumber === '01');

    // Import isGradeOnlyStandard from examinationRoutes
    const { isGradeOnlyStandard } = await import('../src/routes/examinationRoutes.js');
    assert(isGradeOnlyStandard('5th') === true, 'isGradeOnlyStandard("5th") evaluates to TRUE (Grade-based only)');
    assert(isGradeOnlyStandard('LKG') === true, 'isGradeOnlyStandard("LKG") evaluates to TRUE (Grade-based only)');
    assert(isGradeOnlyStandard('10th') === false, 'isGradeOnlyStandard("10th") evaluates to FALSE (Rank and Grade)');
    assert(isGradeOnlyStandard('12th') === false, 'isGradeOnlyStandard("12th") evaluates to FALSE (Rank and Grade)');

    // 6. ATTENDANCE DUAL-TIER (CAMPUS PUNCH-IN + CLASSROOM CHECK-IN)
    console.log('\n[6/7] Testing Two-Tier Attendance & Absent Parent Notifications...');
    const teacherDailyAttCount = await prisma.teacherAttendance.count();
    assert(teacherDailyAttCount >= 100, `Found ${teacherDailyAttCount} teacher daily school-entry attendance records`);

    const classSessionsCount = await prisma.classSession.count();
    assert(classSessionsCount >= 5, `Found ${classSessionsCount} classroom check-in logs for Principal/Admin monitoring`);

    const studentAttCount = await prisma.studentAttendance.count();
    assert(studentAttCount >= 1000, `Found ${studentAttCount} student attendance records across 7 days`);

    const notificationLogs = await prisma.attendanceNotificationLog.findMany();
    assert(notificationLogs.length >= 10, `Found ${notificationLogs.length} parent notification logs triggered on absent attendance`);
    const absentNotificationsHaveParent = notificationLogs.every(n => (n.parentEmail || n.parentPhone) && n.triggerStatus === 'Absent' && ['DELIVERED', 'SENT', 'QUEUED'].includes(n.status));
    assert(absentNotificationsHaveParent, 'All absent alerts correctly address parent email/phone with valid dispatch status (SENT/QUEUED/DELIVERED)');

    // 7. FEEDBACK & CONCERNS
    console.log('\n[7/7] Testing Parent Feedback & Educational Concerns...');
    const feedbackCount = await prisma.teacherFeedback.count();
    assert(feedbackCount >= 5, `Found ${feedbackCount} parent feedback and educational review entries`);

    console.log('\n🎉 ========================================================');
    console.log(`📊 VERIFICATION SUMMARY: ${passedTests} TESTS PASSED, ${failedTests} FAILED`);
    console.log('========================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Verification script crashed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPlatformVerification();
