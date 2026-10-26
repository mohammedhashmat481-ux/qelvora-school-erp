import jwt from 'jsonwebtoken';
import http from 'http';

const BASE_URL = 'http://localhost:8000';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_school_crm_platform_2026';

// Helper for making HTTP requests
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

async function runEndToEndExaminationTest() {
  console.log('================================================================');
  console.log('  STARTING FULL END-TO-END ONLINE EXAMINATION AUDIT & TEST      ');
  console.log('================================================================\n');

  // 1. Prepare Authentication Tokens
  const adminPayload = {
    id: 'c1682446-c8de-44e7-b05e-13d001394107',
    name: 'Admin User',
    email: 'admin@qelvora.in',
    role: 'admin'
  };
  const studentPayload = {
    id: '53d61bac-203c-4d8d-8078-36eaaa84ea16',
    name: 'Rahul Student',
    email: 'student@example.com',
    role: 'student'
  };

  const adminToken = jwt.sign(adminPayload, JWT_SECRET, { expiresIn: '1h' });
  const studentToken = jwt.sign(studentPayload, JWT_SECRET, { expiresIn: '1h' });

  // 2. Test Dashboard Analytics API
  console.log('STEP 1: Fetching Overview & Analytics Dashboard (/api/online-exam/analytics/dashboard)...');
  const statsRes = await request('GET', '/api/online-exam/analytics/dashboard', null, adminToken);
  console.log(`-> Response Status: ${statsRes.status}`);
  if (statsRes.status !== 200 || !statsRes.data.success) {
    throw new Error(`Analytics Dashboard API failed: ${JSON.stringify(statsRes.data)}`);
  }
  const summary = statsRes.data.data;
  console.log('✓ Stats loaded successfully:');
  console.log(`  - Total Exams: ${summary.totalExams}`);
  console.log(`  - Active Exams: ${summary.activeExams}`);
  console.log(`  - Question Bank Count: ${summary.totalQuestions}`);
  console.log(`  - Total Submissions: ${summary.totalSubmissions}`);
  console.log(`  - Pass Rate: ${summary.passRate}%\n`);

  // 3. Test Question Bank: Fetch Questions
  console.log('STEP 2: Querying Question Bank Items (/api/online-exam/questions)...');
  const questionsRes = await request('GET', '/api/online-exam/questions?limit=5', null, adminToken);
  if (questionsRes.status !== 200 || !questionsRes.data.success) {
    throw new Error(`Questions API failed: ${JSON.stringify(questionsRes.data)}`);
  }
  console.log(`✓ Fetched ${questionsRes.data.data.length} questions from bank (Total: ${questionsRes.data.pagination.total})\n`);

  // 4. Create a New Question via API
  console.log('STEP 3: Creating a New MCQ Question via API (/api/online-exam/questions)...');
  const newQuestionData = {
    subject: 'Mathematics',
    chapter: 'Linear Algebra',
    topic: 'Matrices',
    difficulty: 'MEDIUM',
    type: 'SINGLE_CHOICE',
    questionText: 'What is the determinant of a 2x2 identity matrix [[1, 0], [0, 1]]?',
    marks: 4.0,
    negativeMarks: 1.0,
    explanation: 'The determinant of an identity matrix of any order is always 1.',
    language: 'English',
    tags: ['algebra', 'matrices', 'determinant'],
    options: [
      { optionKey: 'A', optionText: '0', isCorrect: false },
      { optionKey: 'B', optionText: '1', isCorrect: true },
      { optionKey: 'C', optionText: '-1', isCorrect: false },
      { optionKey: 'D', optionText: '2', isCorrect: false }
    ]
  };

  const createQuestionRes = await request('POST', '/api/online-exam/questions', newQuestionData, adminToken);
  if (createQuestionRes.status !== 201 || !createQuestionRes.data.success) {
    throw new Error(`Create Question failed: ${JSON.stringify(createQuestionRes.data)}`);
  }
  const createdQuestion = createQuestionRes.data.data;
  console.log(`✓ Created Question ID: ${createdQuestion.id} ("${createdQuestion.questionText.slice(0, 45)}...")\n`);

  // 5. Create a New Online Exam
  console.log('STEP 4: Creating a New Online Examination (/api/online-exam/exams)...');
  const examCode = `E2E-TEST-${Date.now().toString().slice(-4)}`;
  const now = new Date();
  const startTime = new Date(now.getTime() - 10 * 60 * 1000); // started 10 mins ago
  const endTime = new Date(now.getTime() + 60 * 60 * 1000);   // ends in 1 hour

  const examData = {
    title: `Mathematics Assessment Exam ${examCode}`,
    examCode: examCode,
    description: 'End-to-End automated testing assessment for 10th standard.',
    instructions: '1. All questions are compulsory.\n2. Negative marking of 0.5 marks applies on incorrect answers.\n3. Server clock governs deadlines.',
    academicYear: '2025-2026',
    standard: '10th',
    section: 'A',
    subject: 'Mathematics',
    durationMinutes: 20,
    totalMarks: 8.0,
    passingMarks: 4.0,
    negativeMarking: true,
    negativeMarkValue: 0.5,
    allowPartialCredit: false,
    maxAttempts: 2,
    shuffleQuestions: false,
    shuffleOptions: false,
    enableQuestionRandomization: false,
    navigationMode: 'FREE',
    layoutMode: 'ONE_AT_A_TIME',
    resultReleaseMode: 'IMMEDIATE',
    answerKeyReleaseMode: 'IMMEDIATE',
    enableIntegrityShield: true,
    maxIntegrityViolations: 3,
    startDateTime: startTime.toISOString(),
    endDateTime: endTime.toISOString(),
    questionIds: [
      createdQuestion.id,
      questionsRes.data.data[0].id
    ],
    assignedClasses: [
      { standard: '10th', section: 'A' }
    ]
  };

  const createExamRes = await request('POST', '/api/online-exam/exams', examData, adminToken);
  if (createExamRes.status !== 201 || !createExamRes.data.success) {
    throw new Error(`Create Exam failed: ${JSON.stringify(createExamRes.data)}`);
  }
  const createdExam = createExamRes.data.data;
  console.log(`✓ Exam Created: "${createdExam.title}" (Code: ${createdExam.examCode}, Status: ${createdExam.status})\n`);

  // 6. Publish the Exam (Freeze Snapshots)
  console.log('STEP 5: Publishing Examination & Locking Blueprint Snapshot (/api/online-exam/exams/:id/publish)...');
  const publishRes = await request('POST', `/api/online-exam/exams/${createdExam.id}/publish`, null, adminToken);
  if (publishRes.status !== 200 || !publishRes.data.success) {
    throw new Error(`Publish Exam failed: ${JSON.stringify(publishRes.data)}`);
  }
  console.log(`✓ Exam Published Successfully! Status is now: ${publishRes.data.data.status}\n`);

  // 7. Student Flow: Check Available Exams
  console.log('STEP 6: Student Queries Available Exams (/api/online-exam/student/my-exams)...');
  const studentExamsRes = await request('GET', '/api/online-exam/student/my-exams', null, studentToken);
  if (studentExamsRes.status !== 200 || !studentExamsRes.data.success) {
    throw new Error(`Student My-Exams failed: ${JSON.stringify(studentExamsRes.data)}`);
  }
  const foundExam = studentExamsRes.data.data.find(e => e.id === createdExam.id);
  if (!foundExam) {
    throw new Error(`Newly published exam ${createdExam.id} was not returned in student's eligible list!`);
  }
  console.log(`✓ Student successfully discovered exam "${foundExam.title}" in status "${foundExam.studentStatus}"\n`);

  // 8. Student Enters Exam Lobby
  console.log('STEP 7: Student Enters Lobby (/api/online-exam/student/exams/:id/lobby)...');
  const lobbyRes = await request('GET', `/api/online-exam/student/exams/${createdExam.id}/lobby`, null, studentToken);
  if (lobbyRes.status !== 200 || !lobbyRes.data.success) {
    throw new Error(`Student Lobby failed: ${JSON.stringify(lobbyRes.data)}`);
  }
  console.log('✓ Lobby Loaded:');
  console.log(`  - Title: ${lobbyRes.data.data.title}`);
  console.log(`  - Duration: ${lobbyRes.data.data.durationMinutes} mins`);
  console.log(`  - Can Attempt: ${lobbyRes.data.data.canAttempt}`);
  console.log(`  - Student Name: ${lobbyRes.data.data.student.name}\n`);

  // 9. Student Starts Exam Attempt
  console.log('STEP 8: Student Commences Exam Attempt (/api/online-exam/student/exams/:id/start)...');
  const startRes = await request('POST', `/api/online-exam/student/exams/${createdExam.id}/start`, {}, studentToken);
  if (startRes.status !== 200 || !startRes.data.success) {
    throw new Error(`Start Exam failed: ${JSON.stringify(startRes.data)}`);
  }
  const attemptData = startRes.data.data;
  console.log(`✓ Exam Started! Attempt ID: ${attemptData.attemptId}`);
  console.log(`  - Authoritative Remaining Seconds: ${attemptData.remainingSeconds}s`);
  console.log(`  - Total Questions Delivered: ${attemptData.questions.length}`);

  // CRITICAL SECURITY CHECK: Ensure isCorrect and explanation are stripped for students!
  const hasLeakedKey = attemptData.questions.some(q => 
    q.options.some(opt => opt.isCorrect !== undefined) || q.explanation !== undefined
  );
  if (hasLeakedKey) {
    throw new Error('SECURITY VIOLATION: Correct answer keys or explanations were leaked to student client!');
  }
  console.log('✓ PROCTOR/SECURITY PASS: No answer keys or explanations were leaked in student payload.\n');

  // 10. Student Answers Question 1 (Correct: 'B')
  const q1 = attemptData.questions[0];
  console.log(`STEP 9: Autosaving Answer for Question 1 (${q1.questionText.slice(0, 40)}...)...`);
  const ans1Res = await request(
    'POST',
    `/api/online-exam/student/attempts/${attemptData.attemptId}/answer`,
    {
      questionId: q1.id,
      selectedOptionKeys: ['B'], // Correct answer!
      isMarkedForReview: false
    },
    studentToken
  );
  if (ans1Res.status !== 200 || !ans1Res.data.success) {
    throw new Error(`Autosave Answer 1 failed: ${JSON.stringify(ans1Res.data)}`);
  }
  console.log(`✓ Question 1 saved: Selected 'B', isAnswered = ${ans1Res.data.data.isAnswered}\n`);

  // 11. Student Answers Question 2 (Incorrect: purposely select wrong option)
  const q2 = attemptData.questions[1];
  console.log(`STEP 10: Autosaving Answer for Question 2 with Review Flag...`);
  const ans2Res = await request(
    'POST',
    `/api/online-exam/student/attempts/${attemptData.attemptId}/answer`,
    {
      questionId: q2.id,
      selectedOptionKeys: ['D'], // intentionally choosing D
      isMarkedForReview: true
    },
    studentToken
  );
  if (ans2Res.status !== 200 || !ans2Res.data.success) {
    throw new Error(`Autosave Answer 2 failed: ${JSON.stringify(ans2Res.data)}`);
  }
  console.log(`✓ Question 2 saved: isMarkedForReview = ${ans2Res.data.data.isMarkedForReview}, AnsweredCount = ${ans2Res.data.data.answeredCount}\n`);

  // 12. Student Submits Exam
  console.log('STEP 11: Final Submission & Server-Side Evaluation Engine Execution (/api/online-exam/student/attempts/:id/submit)...');
  const submitRes = await request(
    'POST',
    `/api/online-exam/student/attempts/${attemptData.attemptId}/submit`,
    { isAuto: false },
    studentToken
  );
  if (submitRes.status !== 200 || !submitRes.data.success) {
    throw new Error(`Submit Exam failed: ${JSON.stringify(submitRes.data)}`);
  }
  const evalData = submitRes.data.data;
  console.log('✓ EXAM EVALUATED INSTANTLY BY SERVER ENGINE:');
  console.log(`  - Status: ${evalData.status}`);
  console.log(`  - Score: ${evalData.scoreObtained} / ${evalData.totalPossibleScore}`);
  console.log(`  - Percentage: ${evalData.percentage}%`);
  console.log(`  - Passed: ${evalData.isPassed ? 'YES (PASSED)' : 'NO'}`);
  console.log(`  - Correct Count: ${evalData.correctCount}`);
  console.log(`  - Time Spent: ${evalData.timeSpentSeconds} seconds\n`);

  // 13. Student Views Instant Results & Answer Review
  console.log('STEP 12: Student Fetches Evaluation Result & Question Review (/api/online-exam/student/attempts/:id/result)...');
  const resultRes = await request(
    'GET',
    `/api/online-exam/student/attempts/${attemptData.attemptId}/result`,
    null,
    studentToken
  );
  if (resultRes.status !== 200 || !resultRes.data.success) {
    throw new Error(`Get Result failed: ${JSON.stringify(resultRes.data)}`);
  }
  console.log('✓ Result Details Retrieved:');
  console.log(`  - Candidate Attempt ID: ${resultRes.data.data.attemptId}`);
  console.log(`  - Exam: ${resultRes.data.data.examTitle}`);
  console.log(`  - Questions Reviewed: ${resultRes.data.data.questions.length}`);
  console.log(`  - Answer Key Released: ${resultRes.data.isAnswerKeyReleased ? 'YES' : 'NO'}\n`);

  // 14. Teacher / Admin Checks Exam Analytics & Rank Lists
  console.log('STEP 13: Teacher Queries Exam Analytics & Ranks (/api/online-exam/analytics/exam/:examId)...');
  const adminResultsRes = await request(
    'GET',
    `/api/online-exam/analytics/exam/${createdExam.id}`,
    null,
    adminToken
  );
  if (adminResultsRes.status !== 200 || !adminResultsRes.data.success) {
    throw new Error(`Admin Exam Analytics failed: ${JSON.stringify(adminResultsRes.data)}`);
  }
  const analyticsData = adminResultsRes.data.data;
  console.log(`✓ Admin fetched analytics (${analyticsData.rankList.length} candidate attempts):`);
  console.log(`  - Exam Total Submissions: ${analyticsData.exam.totalSubmissions}`);
  analyticsData.rankList.forEach((att, idx) => {
    console.log(`  [Rank #${att.rank || idx + 1}] ${att.studentName} (${att.standard}-${att.section}) - Score: ${att.scoreObtained}/${att.totalPossibleScore} (${att.percentage}%) - ${att.isPassed ? 'PASS' : 'FAIL'}`);
  });

  // 15. Teacher Re-evaluates Attempt (Audit / Correction Workflow)
  console.log('\nSTEP 14: Teacher Triggers Re-evaluation (/api/online-exam/admin/attempts/:id/re-evaluate)...');
  const reEvalRes = await request(
    'POST',
    `/api/online-exam/admin/attempts/${attemptData.attemptId}/re-evaluate`,
    {},
    adminToken
  );
  if (reEvalRes.status !== 200 || !reEvalRes.data.success) {
    throw new Error(`Re-evaluate failed: ${JSON.stringify(reEvalRes.data)}`);
  }
  console.log(`✓ Attempt Re-evaluated successfully: Score ${reEvalRes.data.data.scoreObtained}/${reEvalRes.data.data.totalPossibleScore} (Status: ${reEvalRes.data.data.status})`);

  console.log('\n================================================================');
  console.log('  ALL 14 END-TO-END STEPS PASSED SUCCESSFULLY (100% OPERATIONAL) ');
  console.log('================================================================');
}

runEndToEndExaminationTest()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ TEST FAILED WITH ERROR:', err);
    process.exit(1);
  });
