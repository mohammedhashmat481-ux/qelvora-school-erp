import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teachers = await prisma.teacher.findMany({
    select: {
      id: true,
      name: true,
      employeeId: true,
      assignedClass: true,
      assignedSection: true,
      primary_subject: true,
      secondary_subject: true,
      department: true,
      designation: true
    }
  });
  console.log('Teachers count:', teachers.length);
  console.log('Teachers:', JSON.stringify(teachers, null, 2));

  const subjects = await prisma.subject.findMany({
    select: { id: true, name: true, code: true, standard: true, section: true }
  });
  console.log('Subjects count:', subjects.length);
  console.log('Sample subjects:', JSON.stringify(subjects.slice(0, 15), null, 2));

  const mappings = await prisma.teacherClassSubjectMapping.findMany();
  console.log('Mappings count:', mappings.length);
  console.log('Sample mappings:', JSON.stringify(mappings.slice(0, 15), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
