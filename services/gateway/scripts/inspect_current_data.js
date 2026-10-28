import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function inspect() {
  const mappings = await prisma.teacherClassSubjectMapping.findMany();
  console.log('=== TeacherClassSubjectMapping ===');
  console.log(JSON.stringify(mappings, null, 2));

  const classes = await prisma.class.findMany();
  console.log('=== Classes ===');
  console.log(JSON.stringify(classes.map(c => ({ id: c.id, standard: c.standard, section: c.section, teacher: c.classTeacherName })), null, 2));

  const students = await prisma.student.findMany();
  console.log('=== Students ===');
  console.log(JSON.stringify(students.map(s => ({ id: s.id, studentId: s.studentId, name: s.name, standard: s.standard, section: s.section, roll: s.rollNumber, phone: s.parentPhone })), null, 2));

  const examNames = await prisma.examName.findMany();
  console.log('=== Exam Names ===');
  console.log(JSON.stringify(examNames.map(e => ({ id: e.id, name: e.name, isPublished: e.isPublished })), null, 2));
}

inspect().finally(() => prisma.$disconnect());
