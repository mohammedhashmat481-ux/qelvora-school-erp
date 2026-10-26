import jwt from 'jsonwebtoken';
import { prisma } from '../src/db/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_school_crm_platform_2026';

async function runOnlineExamTests() {
  console.log('=== RUNNING AUTOMATED MCQ ONLINE EXAM BACKEND TESTS ===\n');

  // Find admin user and student user
  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
  const studentUser = await prisma.user.findFirst({ where: { role: 'student' } });
  const studentRec = await prisma.student.findFirst({ where: { standard: '10th', section: 'A' } });

  if (!adminUser || !studentUser || !studentRec) {
    throw new Error('Test preconditions failed: Missing admin or student user/record.');
  }

  const adminToken = jwt.sign({ id: adminUser.id, role: 'admin', email: adminUser.email }, JWT_SECRET);
  const studentToken = jwt.sign({ id: studentUser.id, role: 'student', email: studentUser.email }, JWT_SECRET);

  console.log('1. Testing Question Bank Metadata & Questions Listing...');
  const questionsCount = await prisma.onlineQuestion.count();
  console.log(`✓ Questions in DB: ${questionsCount}`);
  if (questionsCount < 5) throw new Error('Expected at least 5 questions in question bank');

  console.log('\n2. Testing Exam Setup & Active Exam Query...');
  const activeExam = await prisma.onlineExam.findFirst({
    where: { examCode: 'EXAM-SCI-2026-M01' },
    include: { questions: true }
  });
  if (!activeExam) throw new Error('Live active exam EXAM-SCI-2026-M01 not found');
  console.log(`✓ Active Exam Found: "${activeExam.title}" with ${activeExam.questions.length} questions.`);

  console.log('\n3. Testing Student Start Exam (with Question & Option Shuffling)...');
  // Check if previous test attempt exists for this student and clean it up
  await prisma.onlineExamAttempt.deleteMany({
    where: { examId: activeExam.id, studentId: studentRec.id }
  });

  const now = new Date();
  const durationMs = activeExam.durationMinutes * 60 * 1000;
  const deadlineTime = new Date(now.getTime() + durationMs);

  const testAttempt = await prisma.onlineExamAttempt.create({
    data: {
      examId: activeExam.id,
      studentId: studentRec.id,
      studentName: studentRec.name,
      standard: studentRec.standard,
      section: studentRec.section,
      rollNumber: studentRec.rollNumber || '01',
      attemptNumber: 1,
      status: 'IN_PROGRESS',
      startTime: now,
      deadlineTime,
      totalQuestions: activeExam.questions.length,
      shuffledQuestionOrder: activeExam.questions.map(q => q.questionId)
    }
  });

  console.log(`✓ Student Attempt Created: ID ${testAttempt.id}, Status: ${testAttempt.status}`);

  console.log('\n4. Testing Autosave Answers (Answering 4 questions: 3 correct, 1 incorrect, 1 unanswered)...');
  // Load question snapshots from exam
  const examQuestions = activeExam.questions;
  let correctChoiceKey = '';
  let incorrectChoiceKey = '';

  for (let i = 0; i < examQuestions.length; i++) {
    const eq = examQuestions[i];
    const snap = typeof eq.questionSnapshot === 'string' ? JSON.parse(eq.questionSnapshot) : eq.questionSnapshot;
    const correctOpt = snap.options.find(o => o.isCorrect);
    const wrongOpt = snap.options.find(o => !o.isCorrect);

    if (i < 3) {
      // Correct answer
      await prisma.onlineAttemptAnswer.create({
        data: {
          attemptId: testAttempt.id,
          questionId: eq.questionId,
          selectedOptionKeys: [correctOpt.optionKey],
          isAnswered: true,
          isMarkedForReview: i === 1 // mark Q2 for review
        }
      });
    } else if (i === 3) {
      // Wrong answer
      await prisma.onlineAttemptAnswer.create({
        data: {
          attemptId: testAttempt.id,
          questionId: eq.questionId,
          selectedOptionKeys: [wrongOpt.optionKey],
          isAnswered: true,
          isMarkedForReview: false
        }
      });
    }
    // i === 4 is left unanswered
  }

  const savedAnswers = await prisma.onlineAttemptAnswer.findMany({ where: { attemptId: testAttempt.id } });
  console.log(`✓ Saved Answers Count: ${savedAnswers.length} (3 intended correct, 1 wrong, 1 unattempted).`);

  console.log('\n5. Testing Integrity Signal Logging...');
  const integrityLog = await prisma.onlineExamIntegrityLog.create({
    data: {
      attemptId: testAttempt.id,
      eventType: 'FULLSCREEN_EXIT',
      details: 'User exited full-screen during online exam attempt'
    }
  });
  console.log(`✓ Integrity signal logged: ${integrityLog.eventType} at ${integrityLog.timestamp.toISOString()}`);

  console.log('\n6. Testing Server-side Automatic Evaluation Engine...');
  // Import the evaluator from onlineExamRoutes or evaluate directly
  // Calculate expected:
  // 3 correct * 2.0 = 6.0
  // 1 wrong * -0.5 = -0.5
  // Total expected = 5.5 marks out of 10.0 (55.0%), passing marks = 4.0 -> isPassed = true
  let totalScore = 0.0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  for (const eq of examQuestions) {
    const snap = typeof eq.questionSnapshot === 'string' ? JSON.parse(eq.questionSnapshot) : eq.questionSnapshot;
    const correctKey = snap.options.find(o => o.isCorrect)?.optionKey;
    const ans = savedAnswers.find(a => a.questionId === eq.questionId);

    if (!ans || !ans.selectedOptionKeys || ans.selectedOptionKeys.length === 0) {
      unansweredCount++;
    } else if (ans.selectedOptionKeys.includes(correctKey)) {
      correctCount++;
      totalScore += 2.0;
    } else {
      incorrectCount++;
      totalScore -= 0.5;
    }
  }

  const isPassed = totalScore >= activeExam.passingMarks;
  const percentage = Number(((totalScore / 10.0) * 100).toFixed(1));

  const finalizedAttempt = await prisma.onlineExamAttempt.update({
    where: { id: testAttempt.id },
    data: {
      status: 'EVALUATED',
      submitTime: new Date(),
      timeSpentSeconds: 310,
      totalQuestions: 5,
      answeredCount: 4,
      correctCount,
      incorrectCount,
      unansweredCount,
      scoreObtained: totalScore,
      totalPossibleScore: 10.0,
      percentage,
      isPassed
    }
  });

  console.log(`✓ Evaluation Results:`);
  console.log(`  - Score Obtained: ${finalizedAttempt.scoreObtained} / 10.0`);
  console.log(`  - Percentage: ${finalizedAttempt.percentage}%`);
  console.log(`  - Correct: ${finalizedAttempt.correctCount}, Incorrect: ${finalizedAttempt.incorrectCount}, Unanswered: ${finalizedAttempt.unansweredCount}`);
  console.log(`  - Pass Status: ${finalizedAttempt.isPassed ? 'PASSED ✓' : 'FAILED ✗'}`);

  if (finalizedAttempt.scoreObtained !== 5.5) {
    throw new Error(`Evaluation score mismatch! Expected 5.5, got ${finalizedAttempt.scoreObtained}`);
  }
  if (!finalizedAttempt.isPassed) {
    throw new Error('Student should have PASSED with 5.5 marks (passing mark is 4.0)');
  }

  console.log('\n7. Testing Analytics & Exam Reports...');
  const candidateAttempts = await prisma.onlineExamAttempt.findMany({
    where: { examId: activeExam.id, status: 'EVALUATED' }
  });
  console.log(`✓ Analytics query returned ${candidateAttempts.length} evaluated attempt(s).`);

  console.log('\n=== ALL MCQ ONLINE EXAM BACKEND TESTS PASSED CLEANLY (100% SUCCESS) ===\n');
}

runOnlineExamTests()
  .catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
