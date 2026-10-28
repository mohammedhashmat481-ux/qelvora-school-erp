import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function syncMappings() {
  console.log('Ensuring Priya Patel and faculty mappings in database...');
  
  // Find Priya Patel
  let priya = await prisma.teacher.findFirst({
    where: {
      OR: [
        { email: 'priya.patel@qelvora.in' },
        { name: 'Priya Patel' },
        { employeeId: 'EMP002' }
      ]
    }
  });

  if (!priya) {
    console.log('Creating Priya Patel teacher record...');
    priya = await prisma.teacher.create({
      data: {
        id: 'c22e8fca-d9fc-4f3b-9a43-86622cf55c5d',
        name: 'Priya Patel',
        email: 'priya.patel@qelvora.in',
        employeeId: 'EMP002',
        phone: '+91 9876543211',
        designation: 'Senior Faculty',
        department: 'Science & Mathematics',
        qualification: 'M.Sc. Physics, B.Ed',
        assignedClass: '10th',
        assignedSection: 'A',
        status: 'Active'
      }
    });
  }

  // Ensure Priya Patel is registered as a user too for seamless login
  const priyaUser = await prisma.user.findFirst({
    where: { email: 'priya.patel@qelvora.in' }
  });
  if (!priyaUser) {
    console.log('Creating Priya Patel user login...');
    await prisma.user.create({
      data: {
        name: 'Priya Patel',
        email: 'priya.patel@qelvora.in',
        password_hash: '$2a$10$wT51qEa0q2qO9Lq1uV0.0.uP2sQk9p.dK3mB5l6n9t0v.y1z2a3b', // demo hash
        role: 'teacher',
        phone: '+91 9876543211',
        skip_face: true,
        skip_location: true
      }
    });
  }

  // Mappings for Priya Patel: 8th-A, 9th-A, 10th-A for Mathematics and Science
  const priyaTargets = [
    { standard: '8th', section: 'A', subject: 'Mathematics', subjectCode: 'MATH-8' },
    { standard: '8th', section: 'A', subject: 'Science', subjectCode: 'SCI-8' },
    { standard: '9th', section: 'A', subject: 'Mathematics', subjectCode: 'MATH-9' },
    { standard: '9th', section: 'A', subject: 'Science', subjectCode: 'SCI-9' },
    { standard: '10th', section: 'A', subject: 'Mathematics', subjectCode: 'MATH-10' },
    { standard: '10th', section: 'A', subject: 'Science', subjectCode: 'SCI-10' }
  ];

  for (const m of priyaTargets) {
    const existing = await prisma.teacherClassSubjectMapping.findFirst({
      where: {
        teacherName: 'Priya Patel',
        standard: m.standard,
        section: m.section,
        subject: m.subject
      }
    });

    if (!existing) {
      await prisma.teacherClassSubjectMapping.create({
        data: {
          teacherId: priya.id,
          teacherName: priya.name,
          employeeId: priya.employeeId,
          standard: m.standard,
          section: m.section,
          board: 'CBSE',
          subject: m.subject,
          subjectCode: m.subjectCode,
          roomNumber: `Room ${m.standard}`
        }
      });
      console.log(`Created mapping: Priya Patel -> Class ${m.standard}-${m.section} (${m.subject})`);
    } else {
      await prisma.teacherClassSubjectMapping.update({
        where: { id: existing.id },
        data: {
          teacherId: priya.id,
          employeeId: priya.employeeId
        }
      });
      console.log(`Updated mapping id: ${existing.id}`);
    }
  }

  // Also ensure Timetable entries for Priya Patel
  const timetableSlots = [
    { standard: '8th', section: 'A', day: 'Monday', period: 1, subject: 'Mathematics', teacher: 'Priya Patel', teacherId: priya.id },
    { standard: '8th', section: 'A', day: 'Monday', period: 3, subject: 'Science', teacher: 'Priya Patel', teacherId: priya.id },
    { standard: '9th', section: 'A', day: 'Tuesday', period: 2, subject: 'Mathematics', teacher: 'Priya Patel', teacherId: priya.id },
    { standard: '9th', section: 'A', day: 'Tuesday', period: 4, subject: 'Science', teacher: 'Priya Patel', teacherId: priya.id },
    { standard: '10th', section: 'A', day: 'Wednesday', period: 1, subject: 'Mathematics', teacher: 'Priya Patel', teacherId: priya.id },
    { standard: '10th', section: 'A', day: 'Wednesday', period: 5, subject: 'Science', teacher: 'Priya Patel', teacherId: priya.id }
  ];

  for (const ts of timetableSlots) {
    const exSlot = await prisma.timetable.findFirst({
      where: {
        standard: ts.standard,
        section: ts.section,
        day: ts.day,
        period: ts.period
      }
    });
    if (!exSlot) {
      await prisma.timetable.create({ data: ts });
      console.log(`Created timetable slot: ${ts.day} P${ts.period} Class ${ts.standard}-${ts.section} (${ts.subject})`);
    } else {
      await prisma.timetable.update({
        where: { id: exSlot.id },
        data: {
          teacher: ts.teacher,
          teacherId: ts.teacherId,
          subject: ts.subject
        }
      });
    }
  }

  // Also ensure Exam Allocations for Priya Patel
  const midTermExam = await prisma.examName.findFirst({
    where: { name: { contains: 'Mid Term', mode: 'insensitive' } }
  });
  if (midTermExam) {
    for (const alloc of [
      { standard: '8th', section: 'A', subject: 'Mathematics' },
      { standard: '8th', section: 'A', subject: 'Science' },
      { standard: '9th', section: 'A', subject: 'Mathematics' },
      { standard: '9th', section: 'A', subject: 'Science' },
      { standard: '10th', section: 'A', subject: 'Mathematics' },
      { standard: '10th', section: 'A', subject: 'Science' }
    ]) {
      const exAlloc = await prisma.examAllocation.findFirst({
        where: {
          examNameId: midTermExam.id,
          standard: alloc.standard,
          section: alloc.section,
          subjectName: alloc.subject
        }
      });
      if (!exAlloc) {
        await prisma.examAllocation.create({
          data: {
            examNameId: midTermExam.id,
            standard: alloc.standard,
            section: alloc.section,
            subjectName: alloc.subject,
            teacherId: priya.id,
            teacherName: priya.name
          }
        });
        console.log(`Created exam allocation for Mid Term: ${alloc.standard}-${alloc.section} ${alloc.subject}`);
      } else {
        await prisma.examAllocation.update({
          where: { id: exAlloc.id },
          data: { teacherId: priya.id, teacherName: priya.name }
        });
      }
    }
  }

  console.log('Teacher mappings sync completed successfully.');
}

syncMappings().finally(() => prisma.$disconnect());
