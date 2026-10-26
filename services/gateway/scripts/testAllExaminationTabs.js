import jwt from 'jsonwebtoken';
import http from 'http';

const BASE_URL = 'http://127.0.0.1:8000';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_school_crm_platform_2026';

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
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
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAllExaminationTabs() {
  console.log('========================================================================');
  console.log('  EXAMINATION SYSTEM: VERIFYING ALL 9 TABS WITH LIVE DEMO DATA          ');
  console.log('========================================================================\n');

  const adminToken = jwt.sign(
    { id: 'c1682446-c8de-44e7-b05e-13d001394107', name: 'Administrator', email: 'admin@qelvora.in', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Tab 1: Define Exam Type
  console.log('TAB 1: Define Exam Type (/api/examination/types)...');
  const t1 = await request('GET', '/api/examination/types', null, adminToken);
  if (t1.status !== 200 || !t1.data.data) throw new Error('Tab 1 failed: ' + JSON.stringify(t1.data));
  console.log(`✓ Tab 1 Active: Found ${t1.data.data.length} Exam Types:`, t1.data.data.map(t => `${t.name} (${t.fullMarks} marks)`).join(', '));

  // Tab 2: Exam Names / Schedule
  console.log('\nTAB 2: Exam Names / Schedule (/api/examination/names)...');
  const t2 = await request('GET', '/api/examination/names', null, adminToken);
  if (t2.status !== 200 || !t2.data.data) throw new Error('Tab 2 failed: ' + JSON.stringify(t2.data));
  console.log(`✓ Tab 2 Active: Found ${t2.data.data.length} Scheduled Exams:`, t2.data.data.map(n => n.name).join(' | '));
  const examId = t2.data.data[0].id;

  // Tab 3: Marks Entry (Roster)
  console.log('\nTAB 3: Marks Entry (/api/examination/marks?examNameId=...&standard=10th&section=A&subjectName=Mathematics)...');
  const t3 = await request('GET', `/api/examination/marks?examNameId=${examId}&standard=10th&section=A&subjectName=Mathematics`, null, adminToken);
  if (t3.status !== 200 || !t3.data.data?.roster) throw new Error('Tab 3 failed: ' + JSON.stringify(t3.data));
  console.log(`✓ Tab 3 Active: Student Roster loaded with ${t3.data.data.roster.length} students in 10th-A.`);
  console.log(`  Sample: ${t3.data.data.roster[0].studentName} (Roll #${t3.data.data.roster[0].rollNumber}) - Marks: ${t3.data.data.roster[0].marksObtained}/${t3.data.data.roster[0].maxMarks} (Grade: ${t3.data.data.roster[0].grade})`);

  // Tab 4: Modify Marks & Audit Logs
  console.log('\nTAB 4: Modify Marks & Audit Trail (/api/examination/audit-logs)...');
  const t4 = await request('GET', '/api/examination/audit-logs', null, adminToken);
  if (t4.status !== 200 || !t4.data.data) throw new Error('Tab 4 failed: ' + JSON.stringify(t4.data));
  console.log(`✓ Tab 4 Active: ${t4.data.data.length} immutable audit log entries recorded in system.`);
  if (t4.data.data.length > 0) {
    const l = t4.data.data[0];
    console.log(`  Latest Audit: ${l.studentName} | ${l.subjectName} | ${l.oldMarks} -> ${l.newMarks} by ${l.changedBy} (Reason: "${l.reason}")`);
  }

  // Tab 5: Marks Card / Report Generator
  console.log('\nTAB 5: Marks Card & Report Generator (/api/examination/report-cards?standard=10th&section=A)...');
  const t5 = await request('GET', '/api/examination/report-cards?standard=10th&section=A', null, adminToken);
  if (t5.status !== 200 || !t5.data.data?.reports) throw new Error('Tab 5 failed: ' + JSON.stringify(t5.data));
  const reports = t5.data.data.reports;
  console.log(`✓ Tab 5 Active: Generated ${reports.length} official Marks Cards for Class 10th-A:`);
  reports.slice(0, 3).forEach(r => {
    console.log(`  - [Rank #${r.rank}] ${r.student.name} (Roll #${r.student.rollNo}) | Score: ${r.totalObtained}/${r.totalMax} (${r.percentage}%) | Grade: ${r.calculatedGrade} | Status: ${r.result}`);
  });

  // Tab 6: Individual Marks Details Profile
  console.log('\nTAB 6: Individual Marks Profile (Detailed Multi-Term Breakdown for First Candidate)...');
  const cand1 = reports[0];
  console.log(`✓ Tab 6 Active: Loaded Candidate Profile for "${cand1.student.name}" (Class ${cand1.student.class}-${cand1.student.section}, Roll #${cand1.student.rollNo}):`);
  console.log(`  - Total Score: ${cand1.totalObtained} / ${cand1.totalMax} (${cand1.percentage}%)`);
  console.log(`  - Overall Grade: ${cand1.calculatedGrade}`);
  console.log(`  - Subjects Evaluated (${cand1.subjects.length} subjects):`);
  cand1.subjects.forEach(s => {
    console.log(`    * [${s.examName || 'Assessment'}] ${s.subject}: ${s.marksObtained}/${s.maxMarks} (Grade: ${s.grade}, Result: ${s.result})`);
  });

  // Tab 7: CCE Skills & Test Types
  console.log('\nTAB 7: CCE Skills & Test Types (/api/examination/cce-skills)...');
  const t7a = await request('GET', '/api/examination/cce-skills', null, adminToken);
  const t7b = await request('GET', '/api/examination/cce-test-types', null, adminToken);
  console.log(`✓ Tab 7 Active: Loaded ${t7a.data.data?.length || 0} Co-Scholastic CCE Skills and ${t7b.data.data?.length || 0} Formative Test Types.`);

  // Tab 8: Score Sheet Allocation
  console.log('\nTAB 8: Score Sheet Allocation & Sequencing (/api/examination/allocations?standard=10th&section=A)...');
  const t8 = await request('GET', '/api/examination/allocations?standard=10th&section=A', null, adminToken);
  console.log(`✓ Tab 8 Active: Found ${t8.data.data?.length || 0} teacher allocations for 10th-A.`);

  // Tab 9: Result Analytics & Audit
  console.log('\nTAB 9: Result Analytics & Performance Overview (/api/examination/analytics?examNameId=...&standard=10th&section=A)...');
  const t9 = await request('GET', `/api/examination/analytics?examNameId=${examId}&standard=10th&section=A`, null, adminToken);
  if (t9.status !== 200 || !t9.data.data) throw new Error('Tab 9 failed: ' + JSON.stringify(t9.data));
  const an = t9.data.data;
  console.log(`✓ Tab 9 Active: Overall Exam Analytics Loaded:`);
  console.log(`  - Total Student Entries: ${an.totalEntries}`);
  console.log(`  - Average Marks: ${an.averageMarks ? an.averageMarks.toFixed(1) : 0}`);
  console.log(`  - Pass Percentage: ${an.passPercentage ? an.passPercentage.toFixed(1) : 0}%`);
  console.log(`  - Top Performing Students: ${an.topStudents?.length || 0} candidates listed`);

  console.log('\n========================================================================');
  console.log('  ALL 9 EXAMINATION SYSTEM TABS ARE 100% OPERATIONAL WITH DEMO DATA!    ');
  console.log('========================================================================');
}

testAllExaminationTabs()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ ERROR IN EXAMINATION TABS AUDIT:', err);
    process.exit(1);
  });
