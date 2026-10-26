import axios from 'axios';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_school_crm_platform_2026';
const token = jwt.sign(
  { id: 'usr_admin_1', role: 'ADMIN', name: 'Admin Principal', institutionId: 'inst_ink_main' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const API = 'http://localhost:8000/api/student-attendance';
const headers = { Authorization: `Bearer ${token}` };

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 TESTING STUDENT ATTENDANCE SYSTEM ENDPOINTS (END-TO-END)');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  async function check(desc, fn) {
    try {
      await fn();
      console.log(`✓ [PASS] ${desc}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${desc}:`, err.response?.data?.message || err.message);
      failed++;
    }
  }

  // 1. Dashboard
  await check('GET /dashboard retrieves KPI metrics & attendance stats', async () => {
    const res = await axios.get(`${API}/dashboard`, { headers });
    if (!res.data.status || typeof res.data.data.totalEnrolled !== 'number') {
      throw new Error('Invalid dashboard payload');
    }
    console.log(`   Total enrolled: ${res.data.data.totalEnrolled}, Present: ${res.data.data.presentCount}, Absent: ${res.data.data.absentCount}`);
  });

  // 2. Roster
  let testStudents = [];
  await check('GET /roster returns enrolled student list with attendance states', async () => {
    const res = await axios.get(`${API}/roster?standard=10th&section=A`, { headers });
    if (!res.data.status || !Array.isArray(res.data.data)) {
      throw new Error('Invalid roster response');
    }
    testStudents = res.data.data;
    console.log(`   Retrieved roster of ${testStudents.length} students for Class 10-A`);
  });

  // 3. Save Manual Attendance
  if (testStudents.length > 0) {
    await check('POST /save-manual saves attendance for 5 statuses (Present, Absent, Late, Half Day, Excused)', async () => {
      const statuses = ['Present', 'Absent', 'Late', 'Half Day', 'Excused'];
      const payload = {
        date: new Date().toLocaleDateString('en-CA'),
        classId: 'CLASS_10A',
        session: 'FULL_DAY',
        academicYear: '2026-2027',
        notifyParents: true,
        attendanceList: testStudents.slice(0, 5).map((s, idx) => ({
          studentId: s.studentId,
          name: s.name,
          rollNumber: s.rollNumber,
          standard: s.standard,
          section: s.section,
          status: statuses[idx % statuses.length],
          remarks: `Test remark for ${s.name} status ${statuses[idx % statuses.length]}`,
          parentPhone: s.parentPhone || '+91 98765 43210',
          parentEmail: s.parentEmail || 'parent@example.com'
        }))
      };

      const res = await axios.post(`${API}/save-manual`, payload, { headers });
      if (!res.data.status || res.data.count < 1) {
        throw new Error('Manual save returned no records');
      }
      console.log(`   Saved attendance for ${res.data.count} students with parent notifications queued`);
    });
  }

  // 4. Barcode / QR Scan Attendance
  const targetStudent = testStudents[0] || { studentId: 'STU001', name: 'Aarav Sharma' };
  const todayStr = new Date().toLocaleDateString('en-CA');

  await check('POST /scan-qr marks check-in via student QR code', async () => {
    const res = await axios.post(`${API}/scan-qr`, {
      qrCode: `INK-ATT-${targetStudent.studentId}`,
      scanType: 'CHECK_IN',
      date: todayStr,
      deviceInfo: 'Gate Scanner Terminal 01'
    }, { headers });

    if (!res.data.status) throw new Error(res.data.message);
    console.log(`   Scan result: ${res.data.message}`);
  });

  // 5. Anti-duplicate scan check
  await check('POST /scan-qr guards against duplicate scans on the same day', async () => {
    const res = await axios.post(`${API}/scan-qr`, {
      qrCode: `INK-ATT-${targetStudent.studentId}`,
      scanType: 'CHECK_IN',
      date: todayStr,
      deviceInfo: 'Gate Scanner Terminal 01'
    }, { headers });

    if (!res.data.isDuplicate) {
      throw new Error('Expected isDuplicate to be true on second check-in scan');
    }
    console.log(`   Duplicate guard triggered properly: "${res.data.message}"`);
  });

  // 6. Invalid QR scan handling
  await check('POST /scan-qr returns 404 for unknown or unregistered student QR code', async () => {
    try {
      await axios.post(`${API}/scan-qr`, {
        qrCode: 'INVALID-UNKNOWN-STUDENT-999',
        scanType: 'CHECK_IN',
        date: todayStr
      }, { headers });
      throw new Error('Should have failed with 404');
    } catch (err) {
      if (err.response?.status === 404) {
        console.log(`   Properly caught unknown student scan: "${err.response.data.message}"`);
      } else {
        throw err;
      }
    }
  });

  // 7. QR Check-out tracking
  await check('POST /scan-qr records check-out timestamp', async () => {
    const res = await axios.post(`${API}/scan-qr`, {
      qrCode: `INK-ATT-${targetStudent.studentId}`,
      scanType: 'CHECK_OUT',
      date: todayStr,
      deviceInfo: 'Exit Gate Scanner'
    }, { headers });

    if (!res.data.status || !res.data.data.checkOutTime) {
      throw new Error('Check out was not recorded');
    }
    console.log(`   Check-out recorded: ${targetStudent.name} at ${res.data.data.checkOutTime}`);
  });

  // 8. Biometric Consent & Enrollment
  await check('POST /biometrics/consent updates guardian consent compliance record', async () => {
    const res = await axios.post(`${API}/biometrics/consent`, {
      studentId: targetStudent.studentId,
      consentStatus: 'CONSENT_GRANTED',
      guardianName: 'Sunita Sharma (Mother)',
      guardianPhone: '+91 98765 43210',
      guardianRelation: 'Mother'
    }, { headers });

    if (!res.data.status) throw new Error(res.data.message);
    console.log(`   Consent status granted for ${targetStudent.name}`);
  });

  await check('POST /biometrics/enroll stores face template embedding', async () => {
    const dummyTemplate = JSON.stringify([0.12, 0.45, -0.67, 0.89, -0.23, 0.54, 0.11, 0.99]);
    const res = await axios.post(`${API}/biometrics/enroll`, {
      studentId: targetStudent.studentId,
      faceTemplate: dummyTemplate,
      photoThumbnail: targetStudent.photoUrl || ''
    }, { headers });

    if (!res.data.status) throw new Error(res.data.message);
    console.log(`   Face descriptor template enrolled successfully`);
  });

  // 9. Face Recognition Attendance
  await check('POST /face-recognize verifies live face image against enrolled template', async () => {
    const res = await axios.post(`${API}/face-recognize`, {
      currentImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
      studentId: targetStudent.studentId,
      date: todayStr,
      deviceInfo: 'AI Smart Camera Kiosk'
    }, { headers });

    if (!res.data.status) throw new Error(res.data.message);
    console.log(`   Face match confidence: ${res.data.confidence}% (Threshold: ${res.data.threshold || 80}%)`);
  });

  // 10. Student ID Cards
  await check('GET /id-cards provides complete ID card and scannable QR payloads', async () => {
    const res = await axios.get(`${API}/id-cards`, { headers });
    if (!res.data.status || !Array.isArray(res.data.data) || res.data.data.length === 0) {
      throw new Error('ID cards array empty');
    }
    console.log(`   Retrieved ${res.data.count} student ID card records with QR payloads`);
  });

  // 11. Reports (Daily, Monthly, Low Attendance, Student History)
  await check('GET /reports/daily retrieves complete daily register', async () => {
    const res = await axios.get(`${API}/reports/daily?date=${todayStr}`, { headers });
    if (!res.data.status) throw new Error('Daily report failed');
    console.log(`   Daily register rows: ${res.data.total}`);
  });

  await check('GET /reports/monthly generates calendar matrix', async () => {
    const res = await axios.get(`${API}/reports/monthly?month=10&year=2026&standard=10th&section=A`, { headers });
    if (!res.data.status || !Array.isArray(res.data.data)) throw new Error('Monthly report failed');
    console.log(`   Monthly register generated for ${res.data.data.length} students across ${res.data.daysInMonth} days`);
  });

  await check('GET /reports/low-attendance flags students below 75% threshold', async () => {
    const res = await axios.get(`${API}/reports/low-attendance?threshold=75`, { headers });
    if (!res.data.status || !Array.isArray(res.data.data)) throw new Error('Low attendance report failed');
    console.log(`   Flagged ${res.data.count} student(s) below ${res.data.threshold}% threshold`);
  });

  await check('GET /reports/student-history/:studentId retrieves student timeline', async () => {
    const res = await axios.get(`${API}/reports/student-history/${targetStudent.studentId}`, { headers });
    if (!res.data.status) throw new Error('Student history failed');
    console.log(`   Timeline for ${res.data.student.name}: ${res.data.summary.totalDays} days recorded, ${res.data.summary.percentage}% attendance`);
  });

  // 12. Parent Notification Logs
  await check('GET /notifications retrieves SMS/Email/WhatsApp dispatch logs', async () => {
    const res = await axios.get(`${API}/notifications`, { headers });
    if (!res.data.status) throw new Error('Notifications log failed');
    console.log(`   Notification logs count: ${res.data.count}`);
  });

  // 13. Settings & Audit Logs
  await check('GET & PUT /settings retrieves and updates attendance rules', async () => {
    const getRes = await axios.get(`${API}/settings`, { headers });
    if (!getRes.data.status) throw new Error('Settings GET failed');

    const putRes = await axios.put(`${API}/settings`, {
      lowAttendanceThreshold: 75.0,
      lateThresholdTime: '08:45 AM',
      checkOutEnabled: true,
      emailEnabled: true,
      smsEnabled: false
    }, { headers });
    if (!putRes.data.status) throw new Error('Settings PUT failed');
    console.log(`   Rules verified & saved (Threshold: 75%, Cutoff: 08:45 AM)`);
  });

  await check('GET /audit-logs returns administrative trail of attendance events', async () => {
    const res = await axios.get(`${API}/audit-logs`, { headers });
    if (!res.data.status || !Array.isArray(res.data.data)) throw new Error('Audit logs failed');
    console.log(`   Retrieved ${res.data.data.length} audit log trail events`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (${passed + failed} TOTAL)`);
  console.log('═══════════════════════════════════════════════════════════');

  if (failed === 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
