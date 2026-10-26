import { prisma } from '../src/db/prisma.js';

async function seedOnlineExams() {
  console.log('--- Seeding MCQ Online Examination Module Data ---');

  // Check if questions already exist
  const existingQCount = await prisma.onlineQuestion.count();
  if (existingQCount > 5) {
    console.log(`Question Bank already contains ${existingQCount} questions. Ensuring demo exams...`);
  }

  // 1. SEED QUESTION BANK
  const sampleQuestions = [
    // SCIENCE (Physics)
    {
      subject: 'Science',
      chapter: 'Electricity',
      topic: 'Ohm Law',
      difficulty: 'EASY',
      type: 'SINGLE_CHOICE',
      questionText: 'What is the SI unit of electrical potential difference (voltage)?',
      marks: 2.0,
      negativeMarks: 0.5,
      explanation: 'Potential difference is measured in Volts (V), named after Alessandro Volta.',
      options: [
        { optionKey: 'A', optionText: 'Ampere (A)', isCorrect: false },
        { optionKey: 'B', optionText: 'Volt (V)', isCorrect: true },
        { optionKey: 'C', optionText: 'Ohm', isCorrect: false },
        { optionKey: 'D', optionText: 'Watt (W)', isCorrect: false }
      ]
    },
    {
      subject: 'Science',
      chapter: 'Electricity',
      topic: 'Resistance & Factors',
      difficulty: 'MEDIUM',
      type: 'SINGLE_CHOICE',
      questionText: 'A cylindrical wire of length L and cross-sectional area A has resistance R. If its length is doubled and radius is halved, its new resistance becomes:',
      marks: 2.0,
      negativeMarks: 0.5,
      explanation: 'R = rho * L / A. When length is doubled (2L) and radius is halved, area becomes A/4. Thus R_new = rho * 2L / (A/4) = 8 * (rho*L/A) = 8R.',
      options: [
        { optionKey: 'A', optionText: '2 R', isCorrect: false },
        { optionKey: 'B', optionText: '4 R', isCorrect: false },
        { optionKey: 'C', optionText: '8 R', isCorrect: true },
        { optionKey: 'D', optionText: '16 R', isCorrect: false }
      ]
    },
    {
      subject: 'Science',
      chapter: 'Light - Reflection & Refraction',
      topic: 'Spherical Mirrors',
      difficulty: 'EASY',
      type: 'SINGLE_CHOICE',
      questionText: 'Which type of mirror is primarily used as a rear-view mirror in automobiles?',
      marks: 2.0,
      negativeMarks: 0.5,
      explanation: 'Convex mirrors give a virtual, erect, and diminished image and offer a wider field of view.',
      options: [
        { optionKey: 'A', optionText: 'Concave mirror', isCorrect: false },
        { optionKey: 'B', optionText: 'Plane mirror', isCorrect: false },
        { optionKey: 'C', optionText: 'Convex mirror', isCorrect: true },
        { optionKey: 'D', optionText: 'Cylindrical mirror', isCorrect: false }
      ]
    },
    {
      subject: 'Science',
      chapter: 'Chemical Reactions and Equations',
      topic: 'Types of Reactions',
      difficulty: 'MEDIUM',
      type: 'SINGLE_CHOICE',
      questionText: 'When iron nails are placed in a copper sulphate solution, what change is observed after 30 minutes?',
      marks: 2.0,
      negativeMarks: 0.5,
      explanation: 'Iron displaces copper from copper sulphate solution (Fe + CuSO4 -> FeSO4 + Cu). The blue solution turns light greenish due to FeSO4 formation, and brown copper deposits on nails.',
      options: [
        { optionKey: 'A', optionText: 'Solution remains blue and nails turn black', isCorrect: false },
        { optionKey: 'B', optionText: 'Blue solution turns light green and reddish-brown deposit on nails', isCorrect: true },
        { optionKey: 'C', optionText: 'No reaction takes place because iron is less reactive', isCorrect: false },
        { optionKey: 'D', optionText: 'Solution turns completely yellow with effervescence', isCorrect: false }
      ]
    },
    {
      subject: 'Science',
      chapter: 'Life Processes',
      topic: 'Human Respiration',
      difficulty: 'HARD',
      type: 'SINGLE_CHOICE',
      questionText: 'During strenuous physical exercise, cramps in human muscles are caused due to the accumulation of:',
      marks: 2.0,
      negativeMarks: 0.5,
      explanation: 'In the lack of sufficient oxygen, pyruvate converts into lactic acid in human muscle cells, causing fatigue and cramps.',
      options: [
        { optionKey: 'A', optionText: 'Ethanol and carbon dioxide', isCorrect: false },
        { optionKey: 'B', optionText: 'Lactic acid and energy', isCorrect: true },
        { optionKey: 'C', optionText: 'Hydrochloric acid', isCorrect: false },
        { optionKey: 'D', optionText: 'Pyruvate crystal deposits', isCorrect: false }
      ]
    },
    // MATHEMATICS
    {
      subject: 'Mathematics',
      chapter: 'Quadratic Equations',
      topic: 'Nature of Roots',
      difficulty: 'EASY',
      type: 'SINGLE_CHOICE',
      questionText: 'For a quadratic equation ax^2 + bx + c = 0 to have two equal real roots, the discriminant D must be:',
      marks: 2.0,
      negativeMarks: 0.5,
      explanation: 'D = b^2 - 4ac = 0 indicates two equal real roots.',
      options: [
        { optionKey: 'A', optionText: 'D > 0', isCorrect: false },
        { optionKey: 'B', optionText: 'D = 0', isCorrect: true },
        { optionKey: 'C', optionText: 'D < 0', isCorrect: false },
        { optionKey: 'D', optionText: 'D is negative', isCorrect: false }
      ]
    },
    {
      subject: 'Mathematics',
      chapter: 'Trigonometry',
      topic: 'Identities',
      difficulty: 'MEDIUM',
      type: 'SINGLE_CHOICE',
      questionText: 'What is the numerical value of (sin^2 30 deg + cos^2 30 deg) + (sec^2 45 deg - tan^2 45 deg)?',
      marks: 2.0,
      negativeMarks: 0.5,
      explanation: 'sin^2 theta + cos^2 theta = 1, and sec^2 theta - tan^2 theta = 1. Therefore 1 + 1 = 2.',
      options: [
        { optionKey: 'A', optionText: '0', isCorrect: false },
        { optionKey: 'B', optionText: '1', isCorrect: false },
        { optionKey: 'C', optionText: '2', isCorrect: true },
        { optionKey: 'D', optionText: '4', isCorrect: false }
      ]
    },
    {
      subject: 'Mathematics',
      chapter: 'Arithmetic Progressions',
      topic: 'nth Term',
      difficulty: 'MEDIUM',
      type: 'SINGLE_CHOICE',
      questionText: 'Find the 10th term of the AP: 2, 7, 12, 17, ...',
      marks: 2.0,
      negativeMarks: 0.5,
      explanation: 'First term a = 2, common difference d = 5. a_10 = a + 9d = 2 + 9(5) = 47.',
      options: [
        { optionKey: 'A', optionText: '42', isCorrect: false },
        { optionKey: 'B', optionText: '45', isCorrect: false },
        { optionKey: 'C', optionText: '47', isCorrect: true },
        { optionKey: 'D', optionText: '52', isCorrect: false }
      ]
    },
    // COMPUTER SCIENCE
    {
      subject: 'Computer Science',
      chapter: 'Python Basics',
      topic: 'Data Types',
      difficulty: 'EASY',
      type: 'SINGLE_CHOICE',
      questionText: 'Which of the following built-in data types in Python is IMMUTABLE?',
      marks: 2.0,
      negativeMarks: 0.5,
      explanation: 'Tuples, strings, and integers are immutable in Python, whereas lists and dictionaries are mutable.',
      options: [
        { optionKey: 'A', optionText: 'List', isCorrect: false },
        { optionKey: 'B', optionText: 'Dictionary', isCorrect: false },
        { optionKey: 'C', optionText: 'Tuple', isCorrect: true },
        { optionKey: 'D', optionText: 'Set', isCorrect: false }
      ]
    },
    {
      subject: 'Computer Science',
      chapter: 'Computer Networks',
      topic: 'Topologies',
      difficulty: 'MEDIUM',
      type: 'SINGLE_CHOICE',
      questionText: 'In which network topology is every node connected to a central hub or switch?',
      marks: 2.0,
      negativeMarks: 0.5,
      explanation: 'Star topology features individual connections from each network host to a central hub or switch.',
      options: [
        { optionKey: 'A', optionText: 'Ring Topology', isCorrect: false },
        { optionKey: 'B', optionText: 'Bus Topology', isCorrect: false },
        { optionKey: 'C', optionText: 'Star Topology', isCorrect: true },
        { optionKey: 'D', optionText: 'Mesh Topology', isCorrect: false }
      ]
    }
  ];

  const createdQuestions = [];
  for (const q of sampleQuestions) {
    const existing = await prisma.onlineQuestion.findFirst({
      where: { questionText: q.questionText }
    });

    if (!existing) {
      const newQ = await prisma.onlineQuestion.create({
        data: {
          subject: q.subject,
          chapter: q.chapter,
          topic: q.topic,
          difficulty: q.difficulty,
          type: q.type,
          questionText: q.questionText,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          explanation: q.explanation,
          tags: [q.subject.toLowerCase(), q.chapter.toLowerCase().replace(/\s+/g, '-')],
          createdBy: 'Principal / Senior Academic Faculty',
          options: {
            create: q.options.map((opt, idx) => ({
              optionKey: opt.optionKey,
              optionText: opt.optionText,
              isCorrect: opt.isCorrect,
              orderIndex: idx
            }))
          }
        },
        include: { options: true }
      });
      createdQuestions.push(newQ);
    } else {
      createdQuestions.push(existing);
    }
  }

  console.log(`Seeded / verified ${createdQuestions.length} questions in Question Bank.`);

  // 2. SEED ACTIVE LIVE EXAM (Science Mid-Term)
  const scienceQuestions = await prisma.onlineQuestion.findMany({
    where: { subject: 'Science' },
    include: { options: true }
  });

  const now = new Date();
  const startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // started 2 hours ago
  const endTime = new Date(now.getTime() + 48 * 60 * 60 * 1000); // ends in 2 days

  const exam1Code = 'EXAM-SCI-2026-M01';
  let exam1 = await prisma.onlineExam.findUnique({ where: { examCode: exam1Code } });

  if (!exam1) {
    exam1 = await prisma.onlineExam.create({
      data: {
        examCode: exam1Code,
        title: 'CBSE Class 10 Mid-Term Science Online MCQ Exam 2026',
        description: 'Comprehensive mid-term evaluation covering Electricity, Light (Reflection & Refraction), Chemical Reactions, and Life Processes.',
        instructions: '1. Total 5 questions, 2 marks each.\n2. Negative marking: 0.5 marks deducted for each incorrect answer.\n3. Timer will submit automatically upon expiration.\n4. Do not switch tabs or exit fullscreen.',
        academicYear: '2026-2027',
        standard: '10th',
        section: 'All',
        subject: 'Science',
        durationMinutes: 30,
        totalMarks: 10.0,
        passingMarks: 4.0,
        negativeMarking: true,
        negativeMarkValue: 0.5,
        maxAttempts: 2,
        shuffleQuestions: true,
        shuffleOptions: true,
        navigationMode: 'FREE',
        layoutMode: 'PAGINATED',
        resultReleaseMode: 'IMMEDIATE',
        answerKeyReleaseMode: 'WITH_RESULTS',
        enableIntegrityShield: true,
        maxIntegrityViolations: 5,
        status: 'ACTIVE',
        isVersionLocked: true,
        startDateTime: startTime,
        endDateTime: endTime,
        createdBy: 'Admin / Science Department',
        assignments: {
          create: [
            { standard: '10th', section: 'A' },
            { standard: '10th', section: 'All' }
          ]
        }
      }
    });

    // Link questions with frozen snapshot
    for (let i = 0; i < scienceQuestions.length; i++) {
      const q = scienceQuestions[i];
      await prisma.onlineExamQuestion.create({
        data: {
          examId: exam1.id,
          questionId: q.id,
          orderIndex: i,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          questionSnapshot: q
        }
      });
    }
    console.log(`Created live active exam: ${exam1.title} (${exam1.examCode})`);
  }

  // 3. SEED COMPLETED EXAM WITH STUDENT ATTEMPTS (for analytics & reporting)
  const mathQuestions = await prisma.onlineQuestion.findMany({
    where: { subject: 'Mathematics' },
    include: { options: true }
  });

  const exam2Code = 'EXAM-MTH-2026-T01';
  let exam2 = await prisma.onlineExam.findUnique({ where: { examCode: exam2Code } });

  if (!exam2) {
    const pastStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const pastEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    exam2 = await prisma.onlineExam.create({
      data: {
        examCode: exam2Code,
        title: 'Class 10 Mathematics Chapter Diagnostic Assessment',
        description: 'Standard diagnostic on Quadratic Equations, Trigonometric Identities, and Arithmetic Progressions.',
        instructions: 'Mandatory chapter evaluation. 2 marks per question.',
        academicYear: '2026-2027',
        standard: '10th',
        section: 'A',
        subject: 'Mathematics',
        durationMinutes: 20,
        totalMarks: 6.0,
        passingMarks: 2.0,
        negativeMarking: false,
        maxAttempts: 1,
        shuffleQuestions: true,
        shuffleOptions: true,
        status: 'COMPLETED',
        isVersionLocked: true,
        startDateTime: pastStart,
        endDateTime: pastEnd,
        createdBy: 'Admin / Mathematics Department',
        assignments: {
          create: [{ standard: '10th', section: 'A' }]
        }
      }
    });

    for (let i = 0; i < mathQuestions.length; i++) {
      const q = mathQuestions[i];
      await prisma.onlineExamQuestion.create({
        data: {
          examId: exam2.id,
          questionId: q.id,
          orderIndex: i,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          questionSnapshot: q
        }
      });
    }

    // Seed mock attempts for students in 10th A
    const students = await prisma.student.findMany({
      where: { standard: '10th', section: 'A' },
      take: 4
    });

    const mockScores = [
      { score: 6.0, correct: 3, incorrect: 0, time: 420 },
      { score: 4.0, correct: 2, incorrect: 1, time: 610 },
      { score: 4.0, correct: 2, incorrect: 1, time: 780 },
      { score: 2.0, correct: 1, incorrect: 2, time: 920 }
    ];

    for (let i = 0; i < students.length; i++) {
      const st = students[i];
      const sc = mockScores[i] || mockScores[0];
      await prisma.onlineExamAttempt.create({
        data: {
          examId: exam2.id,
          studentId: st.id,
          studentName: st.name,
          standard: st.standard,
          section: st.section,
          rollNumber: st.rollNumber || `10${i+1}`,
          attemptNumber: 1,
          status: 'EVALUATED',
          startTime: pastStart,
          submitTime: new Date(pastStart.getTime() + sc.time * 1000),
          timeSpentSeconds: sc.time,
          totalQuestions: 3,
          answeredCount: 3,
          correctCount: sc.correct,
          incorrectCount: sc.incorrect,
          unansweredCount: 0,
          scoreObtained: sc.score,
          totalPossibleScore: 6.0,
          percentage: Number(((sc.score / 6.0) * 100).toFixed(1)),
          isPassed: sc.score >= 2.0,
          integrityViolationsCount: i === 2 ? 1 : 0
        }
      });
    }
    console.log(`Created completed exam with candidate attempts for analytics: ${exam2.title}`);
  }

  console.log('--- Online Examination Module Seeding Completed Successfully ---');
}

seedOnlineExams()
  .catch(err => {
    console.error('Error during online exam seeding:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
