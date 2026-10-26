import { prisma } from '../src/db/prisma.js';

async function seed() {
  console.log('🌱 Starting Comprehensive Demo Data Seeding...\n');

  // ───────────────────────────────────────────────────────────────────────────
  // 1. SEED STUDENTS ACROSS CLASSES
  // ───────────────────────────────────────────────────────────────────────────
  console.log('1. Seeding Students...');

  const demoStudents = [
    // Class 10th Section A
    { name: 'Aarav Sharma', standard: '10th', section: 'A', rollNumber: '01', gender: 'Male', parentName: 'Rajesh Sharma', parentPhone: '9876543201', parentEmail: 'rajesh.sharma@example.com', studentId: 'ADM-10A-001' },
    { name: 'Aaradhya Deshmukh', standard: '10th', section: 'A', rollNumber: '02', gender: 'Female', parentName: 'Sanjay Deshmukh', parentPhone: '9876543202', parentEmail: 'sanjay.deshmukh@example.com', studentId: 'ADM-10A-002' },
    { name: 'Ananya Roy', standard: '10th', section: 'A', rollNumber: '03', gender: 'Female', parentName: 'Subhash Roy', parentPhone: '9876543203', parentEmail: 'subhash.roy@example.com', studentId: 'ADM-10A-003' },
    { name: 'Vihaan Patel', standard: '10th', section: 'A', rollNumber: '04', gender: 'Male', parentName: 'Dharmesh Patel', parentPhone: '9876543204', parentEmail: 'dharmesh.patel@example.com', studentId: 'ADM-10A-004' },
    { name: 'Rahul Student', standard: '10th', section: 'A', rollNumber: '05', gender: 'Male', parentName: 'Kishore Verma', parentPhone: '9876543205', parentEmail: 'kishore.verma@example.com', studentId: 'ADM-10A-005' },
    { name: 'Isha Kulkarni', standard: '10th', section: 'A', rollNumber: '06', gender: 'Female', parentName: 'Anil Kulkarni', parentPhone: '9876543206', parentEmail: 'anil.kulkarni@example.com', studentId: 'ADM-10A-006' },
    { name: 'Kabir Mehta', standard: '10th', section: 'A', rollNumber: '07', gender: 'Male', parentName: 'Gaurav Mehta', parentPhone: '9876543207', parentEmail: 'gaurav.mehta@example.com', studentId: 'ADM-10A-007' },
    { name: 'Tanvi Nair', standard: '10th', section: 'A', rollNumber: '08', gender: 'Female', parentName: 'Ramesh Nair', parentPhone: '9876543208', parentEmail: 'ramesh.nair@example.com', studentId: 'ADM-10A-008' },
    { name: 'Aditya Sen', standard: '10th', section: 'A', rollNumber: '09', gender: 'Male', parentName: 'Pradeep Sen', parentPhone: '9876543209', parentEmail: 'pradeep.sen@example.com', studentId: 'ADM-10A-009' },
    { name: 'Sneha Rao', standard: '10th', section: 'A', rollNumber: '10', gender: 'Female', parentName: 'Manohar Rao', parentPhone: '9876543210', parentEmail: 'manohar.rao@example.com', studentId: 'ADM-10A-010' },

    // Class 10th Section B
    { name: 'Devansh Pandey', standard: '10th', section: 'B', rollNumber: '01', gender: 'Male', parentName: 'Manoj Pandey', parentPhone: '9876543211', parentEmail: 'manoj.pandey@example.com', studentId: 'ADM-10B-001' },
    { name: 'Anika Gupta', standard: '10th', section: 'B', rollNumber: '02', gender: 'Female', parentName: 'Sunil Gupta', parentPhone: '9876543212', parentEmail: 'sunil.gupta@example.com', studentId: 'ADM-10B-002' },
    { name: 'Rohan Das', standard: '10th', section: 'B', rollNumber: '03', gender: 'Male', parentName: 'Debashish Das', parentPhone: '9876543213', parentEmail: 'debashish.das@example.com', studentId: 'ADM-10B-003' },
    { name: 'Pooja Hegde', standard: '10th', section: 'B', rollNumber: '04', gender: 'Female', parentName: 'Naveen Hegde', parentPhone: '9876543214', parentEmail: 'naveen.hegde@example.com', studentId: 'ADM-10B-004' },

    // Class 9th Section A
    { name: 'Diya Iyer', standard: '9th', section: 'A', rollNumber: '01', gender: 'Female', parentName: 'Venkatesh Iyer', parentPhone: '9876543221', parentEmail: 'venkat.iyer@example.com', studentId: 'ADM-9A-001' },
    { name: 'Aryan Mishra', standard: '9th', section: 'A', rollNumber: '02', gender: 'Male', parentName: 'Ashok Mishra', parentPhone: '9876543222', parentEmail: 'ashok.mishra@example.com', studentId: 'ADM-9A-002' },
    { name: 'Meera Chawla', standard: '9th', section: 'A', rollNumber: '03', gender: 'Female', parentName: 'Kunal Chawla', parentPhone: '9876543223', parentEmail: 'kunal.chawla@example.com', studentId: 'ADM-9A-003' },

    // Class 8th Section A
    { name: 'Kyra Joshi', standard: '8th', section: 'A', rollNumber: '01', gender: 'Female', parentName: 'Hemant Joshi', parentPhone: '9876543231', parentEmail: 'hemant.joshi@example.com', studentId: 'ADM-8A-001' },
    { name: 'Yash Vardhan', standard: '8th', section: 'A', rollNumber: '02', gender: 'Male', parentName: 'Alok Vardhan', parentPhone: '9876543232', parentEmail: 'alok.vardhan@example.com', studentId: 'ADM-8A-002' }
  ];

  const studentMap = {};
  for (const s of demoStudents) {
    const existing = await prisma.student.findFirst({
      where: {
        OR: [
          { studentId: s.studentId },
          { name: s.name, standard: s.standard, section: s.section }
        ]
      }
    });

    if (existing) {
      const updated = await prisma.student.update({
        where: { id: existing.id },
        data: {
          rollNumber: s.rollNumber,
          standard: s.standard,
          section: s.section,
          parentName: s.parentName,
          parentPhone: s.parentPhone,
          parentEmail: s.parentEmail,
          leftSchoolStatus: false
        }
      });
      studentMap[`${s.standard}-${s.section}-${s.rollNumber}`] = updated;
    } else {
      const created = await prisma.student.create({
        data: {
          name: s.name,
          studentId: s.studentId,
          rollNumber: s.rollNumber,
          standard: s.standard,
          section: s.section,
          gender: s.gender,
          dob: '2010-06-15',
          parentName: s.parentName,
          parentPhone: s.parentPhone,
          parentEmail: s.parentEmail,
          address: '42 Knowledge Enclave, Cyber City',
          leftSchoolStatus: false
        }
      });
      studentMap[`${s.standard}-${s.section}-${s.rollNumber}`] = created;
    }
  }
  console.log(`✅ Seeded ${Object.keys(studentMap).length} students across classes 8th, 9th, 10th.`);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. SEED EXAM TYPES & SCHEDULED EXAM NAMES
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n2. Seeding Exam Types & Schedules...');

  const examTypesData = [
    { name: 'FA1', fullMarks: 25, minPassMarks: 9, type: 'CCE', sequence: 1 },
    { name: 'FA2', fullMarks: 25, minPassMarks: 9, type: 'CCE', sequence: 2 },
    { name: 'Mid Term', fullMarks: 100, minPassMarks: 35, type: 'Term/Semester', sequence: 3 },
    { name: 'FA3', fullMarks: 25, minPassMarks: 9, type: 'CCE', sequence: 4 },
    { name: 'Final', fullMarks: 100, minPassMarks: 35, type: 'Term/Semester', sequence: 5 }
  ];

  const typeMap = {};
  for (const t of examTypesData) {
    let et = await prisma.examType.findFirst({ where: { name: t.name } });
    if (!et) {
      et = await prisma.examType.create({ data: t });
    }
    typeMap[t.name] = et;
  }

  const examNamesData = [
    { name: 'Annual Final Examination 2026-27', examTypeName: 'Final', academicYear: '2026-2027', startDate: new Date('2027-03-01'), endDate: new Date('2027-03-15') },
    { name: 'Mid Term Examination 2026-27', examTypeName: 'Mid Term', academicYear: '2026-2027', startDate: new Date('2026-10-05'), endDate: new Date('2026-10-20') },
    { name: 'Formative Assessment 1 (FA1) 2026-27', examTypeName: 'FA1', academicYear: '2026-2027', startDate: new Date('2026-07-10'), endDate: new Date('2026-07-15') },
    { name: 'Formative Assessment 2 (FA2) 2026-27', examTypeName: 'FA2', academicYear: '2026-2027', startDate: new Date('2026-08-20'), endDate: new Date('2026-08-25') }
  ];

  const examMap = {};
  for (const en of examNamesData) {
    let examObj = await prisma.examName.findFirst({
      where: { name: en.name, academicYear: en.academicYear }
    });
    const typeId = typeMap[en.examTypeName].id;
    if (!examObj) {
      examObj = await prisma.examName.create({
        data: {
          name: en.name,
          examTypeId: typeId,
          academicYear: en.academicYear,
          startDate: en.startDate,
          endDate: en.endDate,
          isLocked: false,
          isPublished: true
        }
      });
    }
    examMap[en.name] = examObj;
  }
  console.log(`✅ Exam types and scheduled instances ready.`);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. SEED TEACHER ALLOCATIONS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n3. Seeding Teacher Allocations...');
  const subjects = ['Mathematics', 'Science', 'English', 'Social Science', 'Hindi', 'Computer Science'];
  const finalExam = examMap['Annual Final Examination 2026-27'];
  const midTermExam = examMap['Mid Term Examination 2026-27'];

  for (const examObj of [finalExam, midTermExam]) {
    for (const sub of subjects) {
      const existingAlloc = await prisma.examAllocation.findFirst({
        where: {
          examNameId: examObj.id,
          standard: '10th',
          section: 'A',
          subjectName: sub
        }
      });
      if (!existingAlloc) {
        await prisma.examAllocation.create({
          data: {
            examNameId: examObj.id,
            standard: '10th',
            section: 'A',
            subjectName: sub,
            teacherName: 'Admin User',
            employeeId: 'EMP-ADM-01'
          }
        });
      }
    }
  }
  console.log(`✅ Allocated Admin User as Faculty In-Charge for all core subjects.`);

  // ───────────────────────────────────────────────────────────────────────────
  // 4. SEED DETAILED MARKS ENTRY FOR 10th-A STUDENTS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n4. Seeding Comprehensive Marks Records...');

  const class10AStudents = Object.values(studentMap).filter(s => s.standard === '10th' && s.section === 'A');

  const baseScores = {
    '01': { Mathematics: 92, Science: 89, English: 84, 'Social Science': 88, Hindi: 80, 'Computer Science': 96 },
    '02': { Mathematics: 95, Science: 97, English: 91, 'Social Science': 94, Hindi: 88, 'Computer Science': 98 },
    '03': { Mathematics: 82, Science: 85, English: 78, 'Social Science': 80, Hindi: 75, 'Computer Science': 86 },
    '04': { Mathematics: 88, Science: 84, English: 79, 'Social Science': 85, Hindi: 72, 'Computer Science': 90 },
    '05': { Mathematics: 78, Science: 76, English: 74, 'Social Science': 82, Hindi: 70, 'Computer Science': 84 },
    '06': { Mathematics: 91, Science: 93, English: 87, 'Social Science': 90, Hindi: 85, 'Computer Science': 92 },
    '07': { Mathematics: 85, Science: 80, English: 82, 'Social Science': 78, Hindi: 76, 'Computer Science': 88 },
    '08': { Mathematics: 94, Science: 91, English: 89, 'Social Science': 92, Hindi: 86, 'Computer Science': 95 },
    '09': { Mathematics: 76, Science: 74, English: 72, 'Social Science': 75, Hindi: 68, 'Computer Science': 80 },
    '10': { Mathematics: 89, Science: 90, English: 86, 'Social Science': 87, Hindi: 82, 'Computer Science': 91 }
  };

  function getGrade(marks) {
    if (marks >= 90) return { grade: 'A+', gradePoint: 10, remarks: 'Outstanding' };
    if (marks >= 80) return { grade: 'A', gradePoint: 9, remarks: 'Excellent' };
    if (marks >= 70) return { grade: 'B+', gradePoint: 8, remarks: 'Very Good' };
    if (marks >= 60) return { grade: 'B', gradePoint: 7, remarks: 'Good' };
    if (marks >= 50) return { grade: 'C+', gradePoint: 6, remarks: 'Satisfactory' };
    return { grade: 'C', gradePoint: 5, remarks: 'Pass' };
  }

  let marksCount = 0;
  for (const st of class10AStudents) {
    const scores = baseScores[st.rollNumber] || baseScores['01'];

    for (const [examName, examObj] of Object.entries(examMap)) {
      const isFA = examName.includes('FA');
      const maxMarks = isFA ? 25 : 100;
      const minMarks = isFA ? 9 : 35;

      for (const sub of subjects) {
        const rawScore = scores[sub] || 85;
        const marksObtained = isFA ? Math.round((rawScore / 100) * 25) : rawScore;
        const { grade, gradePoint, remarks } = getGrade(isFA ? (marksObtained / 25) * 100 : marksObtained);

        const existingMark = await prisma.examMarks.findFirst({
          where: {
            examNameId: examObj.id,
            studentId: st.id,
            subjectName: sub
          }
        });

        if (existingMark) {
          await prisma.examMarks.update({
            where: { id: existingMark.id },
            data: {
              marksObtained,
              maxMarks,
              minMarks,
              isPassed: true,
              isAbsent: false,
              grade,
              gradePoint,
              remarks
            }
          });
        } else {
          await prisma.examMarks.create({
            data: {
              examNameId: examObj.id,
              studentId: st.id,
              studentName: st.name,
              standard: st.standard,
              section: st.section,
              subjectName: sub,
              marksObtained,
              maxMarks,
              minMarks,
              isPassed: true,
              isAbsent: false,
              grade,
              gradePoint,
              remarks,
              isLocked: false
            }
          });
        }
        marksCount++;
      }
    }
  }
  console.log(`✅ Seeded/Updated ${marksCount} marks records across all 4 exams & 6 subjects.`);

  // ───────────────────────────────────────────────────────────────────────────
  // 5. SEED QUESTION BANK & ONLINE EXAMS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n5. Seeding Question Bank & Online MCQ Exams...');

  const questionBankItems = [
    {
      subject: 'Mathematics',
      chapter: 'Real Numbers',
      topic: 'Euclid Division',
      questionText: 'If two positive integers a and b are written as a = x^3 * y^2 and b = x * y^3, where x, y are prime numbers, then HCF(a, b) is:',
      difficulty: 'MEDIUM',
      type: 'SINGLE_CHOICE',
      marks: 2,
      negativeMarks: 0.5,
      explanation: 'HCF is the product of the smallest power of each common prime factor: x^1 * y^2 = xy^2.',
      options: [
        { optionKey: 'A', optionText: 'xy', isCorrect: false },
        { optionKey: 'B', optionText: 'xy^2', isCorrect: true },
        { optionKey: 'C', optionText: 'x^3 * y^3', isCorrect: false },
        { optionKey: 'D', optionText: 'x^2 * y^2', isCorrect: false }
      ]
    },
    {
      subject: 'Mathematics',
      chapter: 'Polynomials',
      topic: 'Zeros of Polynomial',
      questionText: 'If one zero of the quadratic polynomial x^2 + 3x + k is 2, then the value of k is:',
      difficulty: 'EASY',
      type: 'SINGLE_CHOICE',
      marks: 2,
      negativeMarks: 0.5,
      explanation: 'Substitute x = 2: (2)^2 + 3(2) + k = 0 => 4 + 6 + k = 0 => k = -10.',
      options: [
        { optionKey: 'A', optionText: '10', isCorrect: false },
        { optionKey: 'B', optionText: '-10', isCorrect: true },
        { optionKey: 'C', optionText: '-7', isCorrect: false },
        { optionKey: 'D', optionText: '-2', isCorrect: false }
      ]
    },
    {
      subject: 'Science',
      chapter: 'Light Reflection and Refraction',
      topic: 'Lenses',
      questionText: 'A concave mirror gives an image of the same size as the object when the object is placed:',
      difficulty: 'EASY',
      type: 'SINGLE_CHOICE',
      marks: 2,
      negativeMarks: 0.5,
      explanation: 'When placed at the Centre of Curvature (C), image size is equal to object size.',
      options: [
        { optionKey: 'A', optionText: 'At infinity', isCorrect: false },
        { optionKey: 'B', optionText: 'Between focus and pole', isCorrect: false },
        { optionKey: 'C', optionText: 'At the centre of curvature', isCorrect: true },
        { optionKey: 'D', optionText: 'At principal focus', isCorrect: false }
      ]
    },
    {
      subject: 'Science',
      chapter: 'Chemical Reactions and Equations',
      topic: 'Oxidation and Reduction',
      questionText: 'The reaction between silver chloride and sunlight is an example of which type of reaction?',
      difficulty: 'MEDIUM',
      type: 'SINGLE_CHOICE',
      marks: 2,
      negativeMarks: 0.5,
      explanation: '2AgCl -> 2Ag + Cl2 in presence of sunlight is a Photochemical Decomposition reaction.',
      options: [
        { optionKey: 'A', optionText: 'Combination Reaction', isCorrect: false },
        { optionKey: 'B', optionText: 'Photolytic Decomposition', isCorrect: true },
        { optionKey: 'C', optionText: 'Displacement Reaction', isCorrect: false },
        { optionKey: 'D', optionText: 'Double Displacement Reaction', isCorrect: false }
      ]
    },
    {
      subject: 'Computer Science',
      chapter: 'Networking',
      topic: 'Protocols',
      questionText: 'Which protocol is primarily used for secure web browsing communication?',
      difficulty: 'EASY',
      type: 'SINGLE_CHOICE',
      marks: 1,
      negativeMarks: 0.25,
      explanation: 'HTTPS (HyperText Transfer Protocol Secure) provides end-to-end TLS encryption.',
      options: [
        { optionKey: 'A', optionText: 'HTTP', isCorrect: false },
        { optionKey: 'B', optionText: 'FTP', isCorrect: false },
        { optionKey: 'C', optionText: 'HTTPS', isCorrect: true },
        { optionKey: 'D', optionText: 'SMTP', isCorrect: false }
      ]
    }
  ];

  const qIds = [];
  for (const q of questionBankItems) {
    const existing = await prisma.onlineQuestion.findFirst({
      where: { questionText: q.questionText }
    });
    if (existing) {
      qIds.push(existing.id);
    } else {
      const created = await prisma.onlineQuestion.create({
        data: {
          subject: q.subject,
          chapter: q.chapter,
          topic: q.topic,
          questionText: q.questionText,
          difficulty: q.difficulty,
          type: q.type,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          explanation: q.explanation,
          createdBy: 'Administrator',
          options: {
            create: q.options.map((opt, idx) => ({
              optionKey: opt.optionKey,
              optionText: opt.optionText,
              isCorrect: opt.isCorrect,
              orderIndex: idx
            }))
          }
        }
      });
      qIds.push(created.id);
    }
  }
  console.log(`✅ Seeded ${qIds.length} high-quality MCQs into Question Bank.`);

  console.log('\n🎉 COMPREHENSIVE DEMO DATA SEEDED SUCCESSFULLY!');
}

seed().then(() => process.exit(0)).catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
