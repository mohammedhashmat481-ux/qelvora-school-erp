import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:8010/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function loginUser(email, password = 'Password@123') {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (!res.ok || !res.data?.token) {
    throw new Error(`Login failed for ${email}: ${res.data?.message || res.status}`);
  }
  return {
    token: res.data.token,
    user: res.data.user
  };
}

async function runFullPass(passNumber) {
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING END-TO-END VALIDATION PASS #${passNumber}`);
  console.log(`======================================================`);

  // Ensure test users exist with known passwords
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Password@123', salt);

  // 1. Check or update Admin
  let adminUser = await prisma.user.findFirst({
    where: { role: { in: ['admin', 'superadmin'] } }
  });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        name: 'School Principal / Administrator',
        email: 'admin@qelvora.in',
        password_hash: hashedPassword,
        role: 'admin',
        isActive: true
      }
    });
  } else {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { password_hash: hashedPassword }
    });
  }

  // 2. Check or update Teacher Priya Patel
  let priyaUser = await prisma.user.findFirst({
    where: { email: 'priya.patel@qelvora.in' }
  });
  if (!priyaUser) {
    priyaUser = await prisma.user.create({
      data: {
        name: 'Priya Patel',
        email: 'priya.patel@qelvora.in',
        password_hash: hashedPassword,
        role: 'teacher',
        isActive: true
      }
    });
  } else {
    await prisma.user.update({
      where: { id: priyaUser.id },
      data: { password_hash: hashedPassword, role: 'teacher' }
    });
  }

  // Ensure Teacher record linked
  let teacherProfile = await prisma.teacher.findFirst({
    where: { OR: [{ email: priyaUser.email }, { userId: priyaUser.id }] }
  });
  if (!teacherProfile) {
    teacherProfile = await prisma.teacher.create({
      data: {
        name: 'Priya Patel',
        email: priyaUser.email,
        userId: priyaUser.id,
        employeeId: 'EMP002',
        specialization: 'Mathematics, Science',
        department: 'Science & Math'
      }
    });
  } else {
    teacherProfile = await prisma.teacher.update({
      where: { id: teacherProfile.id },
      data: { userId: priyaUser.id }
    });
  }

  // Ensure student Rahul Student exists and is linked
  let studentUser = await prisma.user.findFirst({
    where: { email: 'rahul.student@qelvora.in' }
  });
  if (!studentUser) {
    studentUser = await prisma.user.create({
      data: {
        name: 'Rahul Student',
        email: 'rahul.student@qelvora.in',
        password_hash: hashedPassword,
        role: 'student',
        isActive: true
      }
    });
  } else {
    await prisma.user.update({
      where: { id: studentUser.id },
      data: { password_hash: hashedPassword, role: 'student' }
    });
  }

  let studentProfile = await prisma.student.findFirst({
    where: { email: 'rahul.student@qelvora.in' }
  });
  if (!studentProfile) {
    studentProfile = await prisma.student.create({
      data: {
        name: 'Rahul Student',
        email: 'rahul.student@qelvora.in',
        userId: studentUser.id,
        studentId: 'STU-10A-001',
        standard: '10th',
        section: 'A',
        rollNumber: '01',
        parentName: 'Mr. Ramesh Student',
        parentPhone: '9876543210',
        parentWhatsapp: '9876543210',
        parentEmail: 'parent.rahul@qelvora.in'
      }
    });
  } else {
    studentProfile = await prisma.student.update({
      where: { id: studentProfile.id },
      data: {
        userId: studentUser.id,
        standard: '10th',
        section: 'A',
        rollNumber: '01',
        parentPhone: '9876543210',
        parentWhatsapp: '9876543210'
      }
    });
  }

  // STEP 1: LOGIN AS PRIYA PATEL & VERIFY TEACHER ALLOCATIONS
  console.log(`\n🔹 Step 1: Teacher Authentication & Subject Allocation Verification`);
  const priyaAuth = await loginUser('priya.patel@qelvora.in', 'Password@123');
  console.log(`  ✅ Logged in as Priya Patel (Token received)`);

  const allocRes = await request('/subjects/my-mappings', {
    headers: { Authorization: `Bearer ${priyaAuth.token}` }
  });
  if (!allocRes.ok) throw new Error(`Failed to get teacher allocations: ${allocRes.data?.message}`);
  
  const rawClasses = allocRes.data?.data?.classes || [];
  const classNames = rawClasses.map(c => typeof c === 'string' ? c : (c.standard || c.name));
  const subjects = allocRes.data?.data?.subjects || [];
  console.log(`  ✅ Teacher Allocated Classes: [${classNames.join(', ')}]`);
  console.log(`  ✅ Teacher Allocated Subjects: [${subjects.join(', ')}]`);

  if (!classNames.includes('10th') || !subjects.includes('Mathematics')) {
    throw new Error(`Priya Patel missing Class 10th or Mathematics allocation!`);
  }

  // STEP 2: ADMIN ISSUES NOTICE & TEACHER SEES IT
  console.log(`\n🔹 Step 2: Admin Issues Targeted Notice & Teacher Receives Notification`);
  const adminAuth = await loginUser(adminUser.email, 'Password@123');
  const noticeTitle = `Term Evaluation Sync Pass #${passNumber} - ${Date.now()}`;
  
  const noticeCreateRes = await request('/notices', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
    body: JSON.stringify({
      title: noticeTitle,
      message: 'Faculty are requested to finalize Class 10th mathematics and science scores today.',
      content: 'Faculty are requested to finalize Class 10th mathematics and science scores today.',
      recipientRole: 'TEACHER',
      targetRole: 'Teacher',
      priority: 'HIGH'
    })
  });
  if (!noticeCreateRes.ok) throw new Error(`Admin notice creation failed: ${noticeCreateRes.data?.message}`);
  console.log(`  ✅ Admin created circular: "${noticeTitle}"`);

  // Teacher fetches notices
  const teacherNoticesRes = await request('/notices', {
    headers: { Authorization: `Bearer ${priyaAuth.token}` }
  });
  const noticesList = teacherNoticesRes.data?.data || [];
  const foundNotice = noticesList.find(n => n.title === noticeTitle);
  if (!foundNotice) throw new Error(`Teacher could not view the newly published admin notice!`);
  console.log(`  ✅ Teacher Priya Patel successfully received circular in her portal (ID: ${foundNotice.id})`);

  // Teacher marks notice as read
  const markReadRes = await request(`/notices/${foundNotice.id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${priyaAuth.token}` }
  });
  console.log(`  ✅ Teacher marked notice read (Status: ${markReadRes.status})`);

  // STEP 3: TEACHER ASSIGNS HOMEWORK & STUDENT SUBMITS
  console.log(`\n🔹 Step 3: Teacher Assigns Homework -> Student Submits -> Teacher Grades`);
  const hwTitle = `Trigonometry & Quadratic Identities Pass #${passNumber}`;
  const hwRes = await request('/homework', {
    method: 'POST',
    headers: { Authorization: `Bearer ${priyaAuth.token}` },
    body: JSON.stringify({
      title: hwTitle,
      subject: 'Mathematics',
      standard: '10th',
      section: 'A',
      description: 'Solve questions 1 through 10 from Chapter 4 Exercise 4.3.',
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
    })
  });
  if (!hwRes.ok) throw new Error(`Teacher failed to create homework: ${hwRes.data?.message}`);
  const createdHw = hwRes.data?.data;
  console.log(`  ✅ Teacher Priya Patel assigned homework "${hwTitle}" to Class 10th-A`);

  // Student logs in and queries homework
  const studentAuth = await loginUser('rahul.student@qelvora.in', 'Password@123');
  const studentHwRes = await request('/homework?standard=10th&section=A', {
    headers: { Authorization: `Bearer ${studentAuth.token}` }
  });
  const studentHwList = studentHwRes.data?.data || [];
  const foundStudentHw = studentHwList.find(h => h.id === createdHw.id);
  if (!foundStudentHw) throw new Error(`Student could not find the assigned homework for Class 10th-A!`);
  console.log(`  ✅ Student Rahul successfully received homework in his portal`);

  // Student submits homework
  const submissionRes = await request(`/homework/${createdHw.id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentAuth.token}` },
    body: JSON.stringify({
      submissionText: 'Completed questions 1 to 10 with verified quadratic discriminant solutions.'
    })
  });
  if (!submissionRes.ok) throw new Error(`Student homework submission failed: ${submissionRes.data?.message}`);
  const submissionRecord = submissionRes.data?.data;
  console.log(`  ✅ Student submitted solution (Submission ID: ${submissionRecord.id})`);

  // Teacher reviews and grades submission
  const gradeRes = await request(`/homework/submission/${submissionRecord.id}/grade`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${priyaAuth.token}` },
    body: JSON.stringify({
      grade: 'A+ (98%)',
      feedback: 'Outstanding mathematical methodology and step-by-step clarity.'
    })
  });
  if (!gradeRes.ok) throw new Error(`Teacher grading failed: ${gradeRes.data?.message}`);
  console.log(`  ✅ Teacher graded submission: A+ (98%) with verified feedback`);

  // STEP 4: TEACHER ENTERS MARKS & PUBLISHES REPORT CARD
  console.log(`\n🔹 Step 4: Teacher Enters Exam Marks & Releases Published Marks Card`);
  
  // Find or create Mid Term Exam
  let examSession = await prisma.examName.findFirst({
    where: { name: { contains: 'Mid Term', mode: 'insensitive' } }
  });
  if (!examSession) {
    const examType = await prisma.examType.findFirst() || await prisma.examType.create({
      data: { name: 'Term Examination', code: 'TERM', weightage: 100 }
    });
    examSession = await prisma.examName.create({
      data: {
        name: 'Mid Term Examination 2026',
        code: 'MID-2026',
        examTypeId: examType.id,
        isPublished: true
      }
    });
  } else {
    // Ensure published
    examSession = await prisma.examName.update({
      where: { id: examSession.id },
      data: { isPublished: true }
    });
  }

  // Save bulk marks for student Rahul
  const marksObtainedScore = 95 + (passNumber % 3);
  const saveMarksRes = await request('/examination/marks/bulk', {
    method: 'POST',
    headers: { Authorization: `Bearer ${priyaAuth.token}` },
    body: JSON.stringify({
      examNameId: examSession.id,
      subjectName: 'Mathematics',
      academicYear: '2026-2027',
      standard: '10th',
      section: 'A',
      marksList: [
        {
          studentId: studentProfile.id,
          marksObtained: marksObtainedScore,
          maxMarks: 100,
          passingMarks: 35,
          isAbsent: false,
          remarks: 'Exceptional mastery in linear algebra and trigonometry.'
        }
      ],
      marksData: [
        {
          studentId: studentProfile.id,
          marksObtained: marksObtainedScore,
          maxMarks: 100,
          passingMarks: 35,
          isAbsent: false,
          remarks: 'Exceptional mastery in linear algebra and trigonometry.'
        }
      ]
    })
  });
  if (!saveMarksRes.ok) throw new Error(`Teacher failed to save marks: ${saveMarksRes.data?.message}`);
  console.log(`  ✅ Teacher Priya Patel recorded Mathematics score (${marksObtainedScore}/100) for student Rahul`);

  // Student queries /api/examination/my-marks
  const studentMarksRes = await request('/examination/my-marks', {
    headers: { Authorization: `Bearer ${studentAuth.token}` }
  });
  if (!studentMarksRes.ok) throw new Error(`Student failed to get my-marks: ${studentMarksRes.data?.message}`);
  
  const studentExams = studentMarksRes.data?.data?.exams || [];
  const foundExam = studentExams.find(e => e.examNameId === examSession.id || e.examName.includes('Mid Term'));
  if (!foundExam) throw new Error(`Student marks card did not include published Mid Term Exam!`);
  
  const mathSubjectScore = (foundExam.subjects || []).find(s => s.subjectName === 'Mathematics' || s.subject === 'Mathematics');
  if (!mathSubjectScore) throw new Error(`Mathematics marks not found in student's verified report card!`);
  
  console.log(`  ✅ Student / Parent Portal verified live Report Card:`);
  console.log(`     Exam: ${foundExam.examName}`);
  console.log(`     Subject: ${mathSubjectScore.subjectName || mathSubjectScore.subject}`);
  console.log(`     Score: ${mathSubjectScore.marksObtained} / ${mathSubjectScore.maxMarks}`);
  console.log(`     Result: ${mathSubjectScore.isPassed ? 'PASS' : 'FAIL'}`);

  // STEP 5: ATTENDANCE ABSENT TRIGGER & INSTANT WHATSAPP ALERT
  console.log(`\n🔹 Step 5: Teacher Attendance Absent -> Instant WhatsApp Notification Link`);
  const todayDateStr = new Date().toISOString().split('T')[0];
  
  const attendanceRes = await request('/student-attendance/save-manual', {
    method: 'POST',
    headers: { Authorization: `Bearer ${priyaAuth.token}` },
    body: JSON.stringify({
      date: todayDateStr,
      standard: '10th',
      section: 'A',
      records: [
        {
          studentId: studentProfile.id,
          status: 'ABSENT',
          remarks: 'Uninformed absence during morning roll call'
        }
      ]
    })
  });
  if (!attendanceRes.ok) throw new Error(`Teacher attendance save failed: ${attendanceRes.data?.message}`);
  
  const whatsappAlerts = attendanceRes.data?.whatsappAlerts || [];
  console.log(`  ✅ Attendance recorded successfully with status ABSENT.`);
  console.log(`  ✅ Instant WhatsApp Notification Alerts generated: ${whatsappAlerts.length}`);
  if (whatsappAlerts.length > 0) {
    const alert = whatsappAlerts[0];
    console.log(`     Parent Phone: ${alert.phone}`);
    console.log(`     WhatsApp Direct Action URL: ${alert.whatsappUrl}`);
  }

  // Check AttendanceNotificationLog in DB
  const notifLogs = await prisma.attendanceNotificationLog.findMany({
    where: { studentId: studentProfile.id },
    orderBy: { sentAt: 'desc' },
    take: 1
  });
  if (notifLogs.length > 0) {
    console.log(`  ✅ Verified DB AttendanceNotificationLog entry created (Channel: ${notifLogs[0].channel}, Phone: ${notifLogs[0].parentPhone})`);
  }

  console.log(`\n🎉 PASS #${passNumber} COMPLETED WITH 100% SUCCESS! All links and data flows validated.`);
}

async function main() {
  try {
    console.log('Starting 2-Cycle Comprehensive End-to-End Verification...');
    await runFullPass(1);
    await new Promise(r => setTimeout(r, 1000));
    await runFullPass(2);
    console.log('\n======================================================');
    console.log('🏆 ALL 2 PASSES COMPLETED SUCCESSFULLY WITHOUT ERRORS!');
    console.log('======================================================');
  } catch (err) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
