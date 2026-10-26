import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import http from 'http';

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

async function auditParentNotificationsAndIsolation() {
  console.log('🧪 ========================================================');
  console.log('🔍 AUDIT 5 & 6: PARENT NOTIFICATIONS & ACCESS ISOLATION');
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
    // 1. SETUP TWO DISTINCT FAMILIES FOR ISOLATION TESTING
    console.log('[1/4] Selecting two distinct student-parent entities for isolation test...');
    const allStudents = await prisma.student.findMany({
      where: { parentEmail: { not: null } },
      take: 2
    });

    const student1 = allStudents[0];
    const student2 = allStudents[1];

    console.log(`  ℹ️ Family 1: Student ${student1.name} (${student1.standard}-${student1.section}), Parent: ${student1.parentName} (${student1.parentEmail})`);
    console.log(`  ℹ️ Family 2: Student ${student2.name} (${student2.standard}-${student2.section}), Parent: ${student2.parentName} (${student2.parentEmail})`);

    const parent1Token = jwt.sign(
      {
        id: 'parent1-uuid',
        name: student1.parentName,
        email: student1.parentEmail,
        role: 'parent'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const adminToken = jwt.sign(
      {
        id: 'admin-uuid',
        name: 'System Admin',
        email: 'admin@qelvora.in',
        role: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. AUDIT 5: ABSENT STUDENT TRIGGER & INTERNAL NOTIFICATION RECORD
    console.log('\n[2/4] Testing Absent Student Notification Dispatch & Provider Distinction...');
    const testDate = '2026-10-26';

    // Submit manual attendance marking Student 1 as 'Absent'
    const markRes = await apiRequest('POST', '/api/student-attendance/save-manual', {
      date: testDate,
      classId: 'DEFAULT_CLASS',
      session: 'FULL_DAY',
      academicYear: '2026-2027',
      notifyParents: true,
      attendanceList: [
        {
          studentId: student1.id,
          studentName: student1.name,
          standard: student1.standard,
          section: student1.section,
          status: 'Absent',
          parentPhone: student1.parentPhone,
          parentEmail: student1.parentEmail,
          remarks: 'Unannounced absence audit test'
        }
      ]
    }, adminToken);

    assert(markRes.status === 200, `Attendance successfully recorded with Absent status (HTTP ${markRes.status})`);

    // Verify Notification Log entry in database
    const notificationRecord = await prisma.attendanceNotificationLog.findFirst({
      where: {
        studentId: student1.id,
        triggerStatus: 'Absent'
      },
      orderBy: { sentAt: 'desc' }
    });

    assert(Boolean(notificationRecord), 'AttendanceNotificationLog entry generated on absent attendance trigger');
    assert(
      notificationRecord?.parentEmail === student1.parentEmail || notificationRecord?.parentPhone === student1.parentPhone,
      `Notification record accurately targets the student parent (${notificationRecord?.parentEmail || notificationRecord?.parentPhone})`
    );

    // CRITICAL REQUIREMENT 5 AUDIT: Internal Notification vs External Provider Delivery
    console.log(`  ℹ️ Notification Record ID: ${notificationRecord?.id}`);
    console.log(`  ℹ️ Notification Channel: ${notificationRecord?.channel}`);
    console.log(`  ℹ️ Notification Database Status: ${notificationRecord?.status}`);
    console.log(`  ℹ️ Notification Message: "${notificationRecord?.message}"`);

    // Distinguish factual internal record from external provider delivery:
    // In dev_inkedu-main, SMS/Email logs are generated and recorded into PostgreSQL table `AttendanceNotificationLog`.
    // There is no active external webhook (Twilio / SendGrid / Gupshup) configured with live keys.
    // Therefore, this status represents INTERNAL APPLICATION DISPATCH / QUEUE RECORD, NOT confirmed carrier delivery.
    assert(
      notificationRecord?.status === 'SENT' || notificationRecord?.status === 'QUEUED' || notificationRecord?.status === 'DELIVERED',
      'Notification dispatch recorded in internal audit log (DISTINCTION: Internal CRM record; NOT external telecom carrier delivery confirmation)'
    );

    // 3. AUDIT 6: PARENT ACCESS ISOLATION (REPORT CARDS, FEES, RECEIPTS, RBAC)
    console.log('\n[3/4] Testing Parent Access Isolation & Role-Based Authorization...');

    // A1. Self-Child Report Card: Parent 1 querying my-marks with their own child's ID
    const selfMarksRes = await apiRequest('GET', `/api/examination/my-marks?studentId=${student1.id}`, null, parent1Token);
    assert(
      selfMarksRes.status === 200 && selfMarksRes.data?.data?.student?.id === student1.id,
      `Parent 1 allowed to view report card marks for their own ward ${student1.name} (ID: ${student1.id})`
    );

    // A2. Stranger Report Card Isolation: Parent 1 querying my-marks with stranger student2 ID
    const strangerMarksRes = await apiRequest('GET', `/api/examination/my-marks?studentId=${student2.id}`, null, parent1Token);
    assert(
      strangerMarksRes.status === 200 &&
      strangerMarksRes.data?.data?.student?.id !== student2.id &&
      strangerMarksRes.data?.data?.student?.parentEmail === student1.parentEmail,
      `Parent 1 requesting marks for stranger child (${student2.name}) is strictly blocked from stranger data and scoped only to parent's own ward (Protected from data leak)`
    );

    // B. Fees Record Isolation: Parent 1 requesting Student 1 fee details -> MUST Succeed (200)
    const selfFeeRes = await apiRequest('GET', `/api/fees/collection/student-details/${student1.id}`, null, parent1Token);
    assert(
      selfFeeRes.status === 200 && selfFeeRes.data?.success === true,
      `Parent 1 allowed to view fee details for their own child ${student1.name} (HTTP 200)`
    );

    // C. Fees Record Isolation: Parent 1 requesting Student 2 fee details -> MUST be Blocked (403)
    const otherFeeRes = await apiRequest('GET', `/api/fees/collection/student-details/${student2.id}`, null, parent1Token);
    assert(
      otherFeeRes.status === 403,
      `Parent 1 blocked with 403 Forbidden when attempting to view Student 2 (${student2.name}) fee details (HTTP ${otherFeeRes.status})`
    );

    // D. Receipt Cancellation RBAC: Parent 1 attempting to cancel a receipt -> MUST be Blocked (403)
    const cancelRes = await apiRequest('POST', '/api/fees/receipts/rec-test-101/cancel', {
      cancelReason: 'Parent unauthorized cancel attempt'
    }, parent1Token);
    assert(
      cancelRes.status === 403,
      `Parent 1 blocked with 403 Forbidden when attempting to cancel receipt (HTTP ${cancelRes.status})`
    );

    // E. Fee Collection RBAC: Parent 1 attempting to collect fees -> MUST be Blocked (403)
    const collectRes = await apiRequest('POST', '/api/fees/collection/collect', {
      studentId: student1.id,
      subTotal: 1000
    }, parent1Token);
    assert(
      collectRes.status === 403,
      `Parent 1 blocked with 403 Forbidden when attempting to execute fee collection transaction (HTTP ${collectRes.status})`
    );

    // 4. PARENT FEEDBACK SUBMISSION
    console.log('\n[4/4] Testing Parent Feedback Submission Endpoint (POST /api/feedback)...');
    const feedbackPayload = {
      evaluatorType: 'Parent',
      parentName: student1.parentName,
      studentName: student1.name,
      standard: student1.standard,
      section: student1.section,
      subject: 'Mathematics',
      teacherName: 'Dr. Rajesh Sharma',
      rating: 5,
      comment: 'Excellent teaching methodologies and regular homework review!'
    };

    const feedbackRes = await apiRequest('POST', '/api/feedback', feedbackPayload, parent1Token);
    assert(
      feedbackRes.status === 201 && feedbackRes.data?.status === true,
      `Parent successfully submitted feedback for faculty member (HTTP ${feedbackRes.status})`
    );

    const feedbackEntry = await prisma.teacherFeedback.findFirst({
      where: {
        feedback: { contains: student1.name }
      },
      orderBy: { createdAt: 'desc' }
    });

    assert(Boolean(feedbackEntry), 'Submitted feedback persisted in TeacherFeedback database table');

    // Clean up test feedback entry
    if (feedbackEntry) {
      await prisma.teacherFeedback.delete({ where: { id: feedbackEntry.id } });
      console.log('  ℹ️ Cleaned up ephemeral test feedback entry');
    }

    console.log('\n========================================================');
    console.log(`📊 AUDIT 5 & 6 RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('❌ Audit 5 & 6 crashed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

auditParentNotificationsAndIsolation();
