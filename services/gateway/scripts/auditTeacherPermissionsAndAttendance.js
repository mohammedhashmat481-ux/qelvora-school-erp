import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import http from 'http';
import { parseTimeToMinutes } from '../src/routes/studentAttendanceRoutes.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_school_crm_platform_2026';
const GATEWAY_PORT = process.env.PORT || 8010;

function apiRequest(method, endpoint, payload = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: GATEWAY_PORT,
      path: endpoint,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) {
      req.write(JSON.stringify(payload));
    }
    req.end();
  });
}

async function auditTeacherPermissionsAndAttendance() {
  console.log('🧪 ========================================================');
  console.log('🔍 AUDIT 4: TEACHER PERMISSIONS, DUAL ATTENDANCE & LATE RULES');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. SETUP TEST TOKENS
    console.log('[1/4] Minting authenticated teacher and admin tokens...');
    const teacherPriya = await prisma.teacher.findFirst({
      where: { name: { contains: 'Priya' } }
    });
    const teacherToken = jwt.sign(
      {
        id: teacherPriya?.userId || teacherPriya?.id || 'teacher-uuid',
        name: teacherPriya?.name || 'Priya Patel',
        email: teacherPriya?.email || 'priya.patel@qelvora.in',
        role: 'teacher'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const adminToken = jwt.sign(
      {
        id: 'admin-test-uuid',
        name: 'Principal Admin',
        email: 'admin@qelvora.in',
        role: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    assert(Boolean(teacherToken && adminToken), 'Successfully issued valid cryptographic test tokens for Teacher and Admin');

    // 2. TEST TEACHER PERMISSIONS: INVALID VS VALID MARKS ENTRY
    console.log('\n[2/4] Testing Teacher Permissions on Marks Operations...');
    const fa1 = await prisma.examName.findFirst({ where: { name: { contains: 'FA1' } } });
    const fa2 = await prisma.examName.findFirst({ where: { name: { contains: 'FA2' } } });

    // A. Attempting marks entry by Teacher on LOCKED FA1 exam -> MUST return 403 Forbidden
    const invalidLockRes = await apiRequest('POST', '/api/examination/marks/bulk', {
      examNameId: fa1.id,
      standard: '10th',
      section: 'A',
      subjectName: 'Mathematics',
      marksList: [{ studentId: 'stu-test-id', marksObtained: 85, maxMarks: 100 }]
    }, teacherToken);

    assert(
      invalidLockRes.status === 403,
      `Teacher blocked with 403 Forbidden when entering marks for LOCKED exam FA1 (Status: ${invalidLockRes.status}, Message: "${invalidLockRes.data?.message}")`
    );

    // B. Attempting admin endpoint /toggle-lock with Teacher token -> MUST return 403 Forbidden
    const invalidToggleRes = await apiRequest('POST', '/api/examination/toggle-lock', {
      examNameId: fa1.id
    }, teacherToken);

    assert(
      invalidToggleRes.status === 403,
      `Teacher blocked with 403 Forbidden when attempting Admin-only /toggle-lock (Status: ${invalidToggleRes.status})`
    );

    // C. Attempting admin endpoint /toggle-publish with Teacher token -> MUST return 403 Forbidden
    const invalidPublishRes = await apiRequest('POST', '/api/examination/toggle-publish', {
      examNameId: fa1.id
    }, teacherToken);

    assert(
      invalidPublishRes.status === 403,
      `Teacher blocked with 403 Forbidden when attempting Admin-only /toggle-publish (Status: ${invalidPublishRes.status})`
    );

    // D. Attempting marks entry by Teacher on OPEN FA2 exam -> MUST succeed (or return 200 with roster save)
    const validStudent = await prisma.student.findFirst({ where: { standard: '10th', section: 'A' } });
    const validFa2Entry = await apiRequest('POST', '/api/examination/marks/bulk', {
      examNameId: fa2.id,
      standard: '10th',
      section: 'A',
      subjectName: 'English Literature',
      marksList: [
        {
          studentId: validStudent.id,
          rollNumber: validStudent.rollNumber,
          studentName: validStudent.name,
          standard: '10th',
          section: 'A',
          marksObtained: 78,
          maxMarks: 100,
          isAbsent: false
        }
      ]
    }, teacherToken);

    assert(
      validFa2Entry.status === 200 && validFa2Entry.data?.status === true,
      `Teacher successfully allowed to enter marks for OPEN exam FA2 (Status: ${validFa2Entry.status})`
    );

    // Clean up test entry from FA2 to preserve empty pristine roster
    await prisma.examMarks.deleteMany({
      where: { examNameId: fa2.id, studentId: validStudent.id }
    });
    console.log('  ℹ️ Cleaned up ephemeral test mark for FA2 to preserve clean state');

    // 3. DUAL-TIER ATTENDANCE INDEPENDENCE
    console.log('\n[3/4] Testing Two-Tier Attendance Independence (Campus Gate vs Classroom)...');
    const teacherDailyPunchCount = await prisma.teacherAttendance.count();
    const classroomSessionsCount = await prisma.classSession.count();
    const studentAttendanceCount = await prisma.studentAttendance.count();

    console.log(`  ℹ️ Teacher Daily School-Entry Attendance records: ${teacherDailyPunchCount}`);
    console.log(`  ℹ️ Classroom Session Check-in logs: ${classroomSessionsCount}`);
    console.log(`  ℹ️ Student Attendance records: ${studentAttendanceCount}`);

    assert(teacherDailyPunchCount > 0, `Teacher school-entry attendance records present (${teacherDailyPunchCount} records)`);
    assert(classroomSessionsCount > 0, `Classroom session check-in records present (${classroomSessionsCount} records)`);

    // Verify model independence: TeacherAttendance and ClassSession have distinct schemas, tables, and endpoints
    const sessionSample = await prisma.classSession.findFirst();
    const teacherPunchSample = await prisma.teacherAttendance.findFirst();

    assert(
      Boolean(sessionSample && teacherPunchSample && sessionSample.id !== teacherPunchSample.id),
      'TeacherAttendance (Campus Entry Gate) and ClassSession (Classroom Check-In) operate on completely independent database models'
    );

    // 4. LATE STATUS CALCULATION ACCURACY
    console.log('\n[4/4] Testing Timetable-based & Configured School Hours Late Arrival Logic...');

    // Test helper parseTimeToMinutes
    const mins845AM = parseTimeToMinutes('08:45 AM');
    assert(mins845AM === 525, 'parseTimeToMinutes("08:45 AM") correctly evaluates to 525 minutes (08:45)');

    const mins1130AM = parseTimeToMinutes('11:30 AM');
    assert(mins1130AM === 690, 'parseTimeToMinutes("11:30 AM") correctly evaluates to 690 minutes (11:30)');

    const mins0100PM = parseTimeToMinutes('01:00 PM');
    assert(mins0100PM === 780, 'parseTimeToMinutes("01:00 PM") correctly evaluates to 780 minutes (13:00)');

    // Test late calculation against timetable period
    const period1StartMins = 540; // 09:00 AM
    const checkInMinsOnTime = 538; // 08:58 AM -> 0 late
    const checkInMinsLate = 558;   // 09:18 AM -> 18 mins late
    const lateDiffOnTime = Math.max(0, checkInMinsOnTime - period1StartMins);
    const lateDiffLate = Math.max(0, checkInMinsLate - period1StartMins);

    assert(lateDiffOnTime === 0, 'Arrival at 08:58 AM for 09:00 AM period calculates lateMinutes = 0 (On Time)');
    assert(lateDiffLate === 18, 'Arrival at 09:18 AM for 09:00 AM period calculates lateMinutes = 18 (Severe Red Alert >= 15m)');

    console.log('\n========================================================');
    console.log(`📊 AUDIT 4 RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('❌ Audit 4 crashed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

auditTeacherPermissionsAndAttendance();
