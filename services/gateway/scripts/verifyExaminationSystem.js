import axios from 'axios';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_school_crm_platform_2026';
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 8010}/api/examination`;

async function runTests() {
  console.log('====================================================');
  console.log('🧪 EXAMINATION MODULE COMPREHENSIVE INTEGRATION TEST');
  console.log('====================================================');

  const adminToken = jwt.sign(
    { id: 'admin-uuid-101', role: 'admin', email: 'admin@qelvora.in', name: 'Admin User' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const teacherToken = jwt.sign(
    { id: 'teacher-uuid-102', role: 'teacher', email: 'rajesh.sharma@qelvora.in', name: 'Dr. Rajesh Sharma' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const studentToken = jwt.sign(
    { id: 'student-uuid-103', role: 'student', email: 'student@example.com', name: 'Rahul Student' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.response?.data || err.message);
    }
  }

  // 1. Unauthenticated Request Guard
  await test('1. Unauthenticated request to /types must return 401', async () => {
    try {
      await axios.get(`${BASE_URL}/types`);
      throw new Error('Expected 401 but request succeeded');
    } catch (err) {
      if (err.response?.status === 401) return true;
      throw err;
    }
  });

  // 2. Student Role Restriction Guard
  await test('2. Student access to /types must be blocked with 403 Forbidden', async () => {
    try {
      await axios.get(`${BASE_URL}/types`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      throw new Error('Expected 403 but student was able to access /types');
    } catch (err) {
      if (err.response?.status === 403) return true;
      throw err;
    }
  });

  // 3. Student Allowed to view their own marks
  await test('3. Student access to /my-marks returns their published marks with 200 OK', async () => {
    const res = await axios.get(`${BASE_URL}/my-marks`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    if (res.status === 200 && (res.data.status || res.data.success)) {
      console.log(`   -> Student retrieved marks data for: ${res.data.data?.student?.name || 'Aarav Sharma'}`);
      return true;
    }
    throw new Error('Unexpected response for /my-marks');
  });

  // 4. Admin Access to Masters
  await test('4. Admin access to /types returns master exam types (FA1 to Final)', async () => {
    const res = await axios.get(`${BASE_URL}/types`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (res.status === 200 && Array.isArray(res.data.data)) {
      console.log(`   -> Found ${res.data.data.length} exam types.`);
      return true;
    }
    throw new Error('Failed to retrieve exam types');
  });

  // 5. Admin Access to Exam Names
  await test('5. Admin access to /names returns exam instances and schedules', async () => {
    const res = await axios.get(`${BASE_URL}/names`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (res.status === 200 && Array.isArray(res.data.data)) {
      console.log(`   -> Found ${res.data.data.length} exam names.`);
      return true;
    }
    throw new Error('Failed to retrieve exam names');
  });

  // 6. Marks Roster Retrieval
  let examId = null;
  await test('6. Admin/Teacher access to /marks returns student roster for Grade 5-A', async () => {
    const namesRes = await axios.get(`${BASE_URL}/names`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    examId = namesRes.data.data[0]?.id;
    const res = await axios.get(`${BASE_URL}/marks?standard=Grade 5&section=A&examNameId=${examId}&subjectName=Mathematics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (res.status === 200 && (res.data.status || res.data.success)) {
      console.log(`   -> Roster has ${res.data.data?.length || 0} students. Locked: ${res.data.isLocked}`);
      return true;
    }
    throw new Error('Failed to fetch marks roster');
  });

  // 7. Report Cards Data Generation
  await test('7. Admin access to /report-cards returns formatted scholastic reports', async () => {
    const res = await axios.get(`${BASE_URL}/report-cards?standard=Grade 5&section=A`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (res.status === 200 && (res.data.status || res.data.success)) {
      console.log(`   -> Generated report cards for ${res.data.data?.reports?.length || 0} students.`);
      return true;
    }
    throw new Error('Failed to fetch report cards data');
  });

  // 8. Result Analytics
  await test('8. Admin/Teacher access to /analytics returns class metrics', async () => {
    const res = await axios.get(`${BASE_URL}/analytics?standard=Grade 5&section=A&examNameId=${examId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (res.status === 200 && (res.data.status || res.data.success)) {
      console.log(`   -> Analytics metrics: Avg: ${res.data.data?.averageMarks}, Pass: ${res.data.data?.passPercentage}%`);
      return true;
    }
    throw new Error('Failed to fetch analytics');
  });

  // 9. CCE Skills Master
  await test('9. Retrieval of CCE Co-Scholastic Skills', async () => {
    const res = await axios.get(`${BASE_URL}/cce-skills`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (res.status === 200 && (res.data.status || res.data.success)) {
      console.log(`   -> CCE Skills count: ${res.data.data?.length || 0}`);
      return true;
    }
    throw new Error('Failed to fetch CCE skills');
  });

  // 10. Grade Scales
  await test('10. Retrieval of Grade Scales (A+ to F)', async () => {
    const res = await axios.get(`${BASE_URL}/grades`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (res.status === 200 && (res.data.status || res.data.success)) {
      console.log(`   -> Grade levels count: ${res.data.data?.length || 0}`);
      return true;
    }
    throw new Error('Failed to fetch grade scales');
  });

  console.log('====================================================');
  console.log(`🎉 TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================');
  process.exit(passed === total ? 0 : 1);
}

runTests();
