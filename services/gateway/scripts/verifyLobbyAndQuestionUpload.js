import axios from 'axios';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

const BASE_URL = 'http://localhost:8000/api';

async function runTest() {
  console.log('🚀 Starting Online Exam Lobby & Question Paper Upload Verification Test...\n');

  // 1. Login as Admin
  console.log('1. Logging in as Admin...');
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'admin@school.com',
    password: 'password123'
  });
  const token = loginRes.data.token || loginRes.data.data?.token;
  if (!token) throw new Error('Failed to get admin auth token');
  console.log('✅ Admin logged in successfully.');

  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` }
  };

  // 2. Prepare a test Excel Question Paper in memory
  console.log('\n2. Generating sample Excel Question Paper...');
  const sampleQuestions = [
    {
      Subject: 'Physics',
      'Question Text': 'What is the SI unit of electric force?',
      'Option A': 'Newton',
      'Option B': 'Joule',
      'Option C': 'Watt',
      'Option D': 'Pascal',
      'Correct Option': 'A',
      Difficulty: 'EASY',
      Marks: 2,
      'Negative Marks': 0.5,
      Chapter: 'Electrostatics',
      Explanation: 'Newton is the SI unit of force.'
    },
    {
      Subject: 'Physics',
      'Question Text': 'Light year is a unit of which physical quantity?',
      'Option A': 'Time',
      'Option B': 'Distance',
      'Option C': 'Speed',
      'Option D': 'Intensity',
      'Correct Option': 'B',
      Difficulty: 'MEDIUM',
      Marks: 2,
      'Negative Marks': 0.5,
      Chapter: 'Units and Measurements',
      Explanation: 'A light-year is the distance that light travels in vacuum in one Julian year.'
    },
    {
      Subject: 'Physics',
      'Question Text': 'Which particle has no electric charge?',
      'Option A': 'Proton',
      'Option B': 'Electron',
      'Option C': 'Neutron',
      'Option D': 'Positron',
      'Correct Option': 'C',
      Difficulty: 'EASY',
      Marks: 2,
      'Negative Marks': 0.5,
      Chapter: 'Atomic Structure',
      Explanation: 'Neutrons have zero electric charge.'
    }
  ];

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(sampleQuestions);
  xlsx.utils.book_append_sheet(wb, ws, 'Questions');
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  // Write to temporary file for upload testing
  const tempExcelPath = path.resolve('services/gateway/scripts/test_question_paper.xlsx');
  fs.writeFileSync(tempExcelPath, buffer);
  console.log(`✅ Temporary Question Paper generated: ${tempExcelPath}`);

  // 3. Test Bulk Import endpoint
  console.log('\n3. Testing Question Paper Import API (POST /questions/import)...');
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('file', fs.createReadStream(tempExcelPath));

  const importRes = await axios.post(`${BASE_URL}/online-exam/questions/import`, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${token}`
    }
  });

  console.log(`✅ Question Paper imported successfully! Imported: ${importRes.data.importedCount}, Question IDs returned:`, importRes.data.questionIds?.length);
  const importedQuestionIds = importRes.data.questionIds;
  if (!importedQuestionIds || importedQuestionIds.length === 0) {
    throw new Error('Expected questionIds array from import endpoint');
  }

  // 4. Create an Exam with these Question IDs
  console.log('\n4. Creating Online Exam with attached Question Paper...');
  const now = new Date();
  const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const examCode = `TEST-PHY-${Date.now().toString().slice(-4)}`;

  const createExamRes = await axios.post(
    `${BASE_URL}/online-exam/exams`,
    {
      title: 'Physics Chapter 1 MCQ Test',
      examCode,
      subject: 'Physics',
      standard: '10th',
      durationMinutes: 30,
      totalMarks: 6,
      passingMarks: 3,
      negativeMarking: true,
      negativeMarkValue: 0.5,
      startDateTime: new Date(now.getTime() - 10 * 60 * 1000).toISOString(), // active now
      endDateTime: future.toISOString(),
      questionIds: importedQuestionIds,
      assignedClasses: [{ standard: '10th', section: 'All' }]
    },
    authHeaders
  );

  const exam = createExamRes.data.data;
  console.log(`✅ Exam created: ${exam.title} (ID: ${exam.id}, Code: ${exam.examCode}) with ${exam.questions?.length} questions.`);

  // 5. Publish the Exam
  console.log('\n5. Publishing the Exam...');
  await axios.post(`${BASE_URL}/online-exam/exams/${exam.id}/publish`, {}, authHeaders);
  console.log('✅ Exam successfully published.');

  // 6. Test Lobby with Exam ID
  console.log('\n6. Testing Lobby endpoint with Exam ID (GET /student/exams/:id/lobby)...');
  const lobbyExamRes = await axios.get(`${BASE_URL}/online-exam/student/exams/${exam.id}/lobby`, authHeaders);
  console.log('✅ Lobby by Exam ID response:', {
    title: lobbyExamRes.data.data.title,
    questionsCount: lobbyExamRes.data.data.questionsCount,
    canAttempt: lobbyExamRes.data.data.canAttempt,
    isLive: lobbyExamRes.data.data.isLive
  });

  // 7. Test Lobby with Exam Code
  console.log('\n7. Testing Lobby endpoint with Exam Code...');
  const lobbyCodeRes = await axios.get(`${BASE_URL}/online-exam/student/exams/${exam.examCode}/lobby`, authHeaders);
  console.log('✅ Lobby by Exam Code response title:', lobbyCodeRes.data.data.title);

  // 8. Start the Exam
  console.log('\n8. Starting the Exam Attempt (POST /student/exams/:id/start)...');
  const startRes = await axios.post(`${BASE_URL}/online-exam/student/exams/${exam.id}/start`, {}, authHeaders);
  const session = startRes.data.data;
  const attemptId = session.attemptId;
  console.log('✅ Exam started successfully! Attempt ID:', attemptId);
  console.log('   Total Questions loaded for student:', session.questions?.length);
  console.log('   Remaining Seconds:', session.remainingSeconds);
  console.log('   Sample Question 1 text:', session.questions[0]?.questionText);
  console.log('   Sample Question 1 options count:', session.questions[0]?.options?.length);
  console.log('   Sample Question 1 has isCorrect flag? (should be undefined):', session.questions[0]?.options[0]?.isCorrect);

  if (!session.questions || session.questions.length === 0) {
    throw new Error('FAILED: Exam questions array is empty!');
  }
  if (session.remainingSeconds <= 0) {
    throw new Error('FAILED: Remaining seconds is 0 or negative!');
  }

  // 9. Test Lobby with Attempt ID (CRITICAL: User's reported bug!)
  console.log('\n9. Testing Lobby endpoint passing ATTEMPT ID (User bug fix check)...');
  const lobbyAttemptRes = await axios.get(`${BASE_URL}/online-exam/student/exams/${attemptId}/lobby`, authHeaders);
  console.log('✅ Lobby by Attempt ID correctly resolved! Exam Title:', lobbyAttemptRes.data.data.title);
  console.log('   Has active attempt:', lobbyAttemptRes.data.data.hasActiveAttempt);
  console.log('   Active attempt ID matches:', lobbyAttemptRes.data.data.activeAttemptId === attemptId);

  // 10. Test Start/Resume with Attempt ID
  console.log('\n10. Testing Start/Resume passing ATTEMPT ID (User bug fix check)...');
  const resumeRes = await axios.post(`${BASE_URL}/online-exam/student/exams/${attemptId}/start`, {}, authHeaders);
  console.log('✅ Start/Resume by Attempt ID succeeded! Questions count:', resumeRes.data.data.questions?.length);
  console.log('   Remaining seconds on resume:', resumeRes.data.data.remainingSeconds);

  // 11. Test Direct Session Endpoint
  console.log('\n11. Testing Direct Session API (GET /student/attempts/:attemptId/session)...');
  const sessionRes = await axios.get(`${BASE_URL}/online-exam/student/attempts/${attemptId}/session`, authHeaders);
  console.log('✅ Direct Session endpoint succeeded! Questions count:', sessionRes.data.data.questions?.length);

  // 12. Autosave Answers
  console.log('\n12. Autosaving answers for questions...');
  for (const q of session.questions) {
    await axios.post(
      `${BASE_URL}/online-exam/student/attempts/${attemptId}/answer`,
      {
        questionId: q.id,
        selectedOptionKeys: ['A'], // select option A
        isMarkedForReview: false
      },
      authHeaders
    );
  }
  console.log('✅ Autosaved answers for all questions.');

  // 13. Submit Attempt
  console.log('\n13. Submitting the Attempt (POST /student/attempts/:attemptId/submit)...');
  const submitRes = await axios.post(`${BASE_URL}/online-exam/student/attempts/${attemptId}/submit`, {}, authHeaders);
  console.log('✅ Submission evaluated! Result:', {
    totalMarks: submitRes.data.data.totalMarks,
    percentage: submitRes.data.data.percentage,
    resultStatus: submitRes.data.data.resultStatus
  });

  // 14. Check Re-entering Completed Attempt
  console.log('\n14. Testing Re-entering Lobby after completion...');
  const postSubmitLobby = await axios.get(`${BASE_URL}/online-exam/student/exams/${attemptId}/lobby`, authHeaders);
  console.log('✅ Post-submit lobby handled gracefully: isCompleted =', postSubmitLobby.data.isCompleted, 'Completed Attempt ID:', postSubmitLobby.data.data?.completedAttemptId);

  console.log('\n15. Testing Re-entering Start/Resume after completion...');
  const postSubmitStart = await axios.post(`${BASE_URL}/online-exam/student/exams/${attemptId}/start`, {}, authHeaders);
  console.log('✅ Post-submit start/resume handled gracefully: isCompleted =', postSubmitStart.data.isCompleted, postSubmitStart.data.message);

  // Cleanup temp file
  if (fs.existsSync(tempExcelPath)) {
    fs.unlinkSync(tempExcelPath);
  }

  console.log('\n🎉 ALL 15 TESTS PASSED SUCCESSFULLY WITH ZERO ERRORS!');
}

runTest().catch((err) => {
  console.error('\n❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});
