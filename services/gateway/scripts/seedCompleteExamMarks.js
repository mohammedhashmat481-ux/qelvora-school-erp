import { prisma } from '../src/db/prisma.js';

async function seedCompleteExamMarks() {
  console.log('Seeding Mid Term & Annual Final Exam Marks for demo students...');

  const students = await prisma.student.findMany({
    where: { leftSchoolStatus: false }
  });

  const examNames = await prisma.examName.findMany({
    include: { examType: true }
  });

  const midTerm = examNames.find(e => e.name.includes('Mid Term'));
  const finalExam = examNames.find(e => e.name.includes('Annual Final') || e.name.includes('Final'));

  if (!midTerm || !finalExam) {
    console.error('Mid Term or Final exam not found!');
    return;
  }

  const subjects = ['Mathematics', 'Science', 'English', 'Social Science', 'Hindi', 'Computer Science'];

  const gradeFunc = (pct) => {
    if (pct >= 90) return { grade: 'A+', gradePoint: 10 };
    if (pct >= 80) return { grade: 'A', gradePoint: 9 };
    if (pct >= 70) return { grade: 'B+', gradePoint: 8 };
    if (pct >= 60) return { grade: 'B', gradePoint: 7 };
    if (pct >= 50) return { grade: 'C', gradePoint: 6 };
    return { grade: 'D', gradePoint: 5 };
  };

  let createdCount = 0;

  for (const student of students) {
    for (const exam of [midTerm, finalExam]) {
      for (let sIdx = 0; sIdx < subjects.length; sIdx++) {
        const sub = subjects[sIdx];
        const existing = await prisma.examMarks.findFirst({
          where: {
            studentId: student.id,
            examNameId: exam.id,
            subjectName: sub
          }
        });

        if (!existing) {
          // Generate score between 65 and 95
          const base = 70 + ((student.name.charCodeAt(0) * 7 + sIdx * 11) % 26);
          const score = Math.min(98, Math.max(55, base));
          const gr = gradeFunc(score);

          await prisma.examMarks.create({
            data: {
              examNameId: exam.id,
              examTypeId: exam.examTypeId,
              studentId: student.id,
              rollNumber: student.rollNumber || '01',
              studentName: student.name,
              standard: student.standard,
              section: student.section,
              subjectName: sub,
              maxMarks: 100,
              minMarks: 35,
              marksObtained: score,
              isAbsent: false,
              isPassed: true,
              grade: gr.grade,
              gradePoint: gr.gradePoint,
              remarks: score >= 90 ? 'Outstanding academic excellence' : score >= 80 ? 'Very good comprehension' : 'Good effort',
              enteredBy: 'Faculty Examination Board'
            }
          });
          createdCount++;
        }
      }
    }
  }

  console.log(`✓ Successfully seeded ${createdCount} new marks entries across Mid Term and Final exams.`);
  process.exit(0);
}

seedCompleteExamMarks().catch(e => {
  console.error(e);
  process.exit(1);
});
