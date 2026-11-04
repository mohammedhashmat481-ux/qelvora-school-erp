import { prisma } from '../src/db/prisma.js';
import bcrypt from 'bcryptjs';

async function seedTeachersAndTimetable() {
  console.log('--- Starting Seed Script for Teachers, Classes, Subjects & Timetable ---');

  const defaultPassword = 'Welcome@123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // 1. Ensure Class 6th-A exists
  let class6A = await prisma.class.findFirst({
    where: { standard: '6th', section: 'A' }
  });

  if (!class6A) {
    class6A = await prisma.class.create({
      data: {
        standard: '6th',
        section: 'A',
        board: 'CBSE',
        roomNumber: 'Room 205',
        strength: 32
      }
    });
  }

  // 2. Class Teacher: Priya Patel (EMP002)
  let priya = await prisma.teacher.findFirst({
    where: { OR: [{ employeeId: 'EMP002' }, { email: 'priya.patel@qelvora.in' }, { name: 'Priya Patel' }] }
  });

  if (priya) {
    priya = await prisma.teacher.update({
      where: { id: priya.id },
      data: {
        assignedClass: '6th',
        assignedSection: 'A',
        primary_subject: 'Physics',
        secondary_subject: 'Mathematics',
        plain_password: defaultPassword
      }
    });
  } else {
    let priyaUser = await prisma.user.findFirst({ where: { email: 'priya.patel@qelvora.in' } });
    if (!priyaUser) {
      priyaUser = await prisma.user.create({
        data: {
          name: 'Priya Patel',
          email: 'priya.patel@qelvora.in',
          phone: '+91 98765 00002',
          password_hash: hashedPassword,
          role: 'Teacher',
          skip_face: true,
          skip_location: true,
          isActive: true
        }
      });
    }
    priya = await prisma.teacher.create({
      data: {
        userId: priyaUser.id,
        employeeId: 'EMP002',
        name: 'Priya Patel',
        email: 'priya.patel@qelvora.in',
        phone: '+91 98765 00002',
        qualification: 'M.Sc Physics, B.Ed',
        designation: 'Teacher',
        experience: 7,
        primary_subject: 'Physics',
        secondary_subject: 'Mathematics',
        assignedClass: '6th',
        assignedSection: 'A',
        plain_password: defaultPassword
      }
    });
  }

  // Set Priya as Class Teacher of Class 6th-A
  await prisma.class.update({
    where: { id: class6A.id },
    data: {
      classTeacherId: priya.id,
      classTeacherName: priya.name
    }
  });
  console.log(`✅ Class 6th-A Class Teacher set to: ${priya.name} (${priya.employeeId})`);

  // 3. Normal Subject Teachers (NOT class teachers, assignedClass = null)
  const subjectTeachersData = [
    {
      name: 'Ramesh Verma',
      email: 'ramesh.verma@qelvora.in',
      phone: '+91 98765 00010',
      employeeId: 'EMP010',
      qualification: 'M.Sc Mathematics, B.Ed',
      primary_subject: 'Mathematics',
      secondary_subject: 'Physics',
      experience: 6
    },
    {
      name: 'Kavita Desai',
      email: 'kavita.desai@qelvora.in',
      phone: '+91 98765 00011',
      employeeId: 'EMP011',
      qualification: 'M.A English Literature, B.Ed',
      primary_subject: 'English Literature',
      secondary_subject: 'Social Studies',
      experience: 8
    },
    {
      name: 'Manoj Kumar',
      email: 'manoj.kumar@qelvora.in',
      phone: '+91 98765 00012',
      employeeId: 'EMP012',
      qualification: 'M.Sc Botany, B.Ed',
      primary_subject: 'Science',
      secondary_subject: 'Biology',
      experience: 5
    }
  ];

  const normalTeachers = [];
  for (const st of subjectTeachersData) {
    let user = await prisma.user.findFirst({ where: { email: st.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: st.name,
          email: st.email,
          phone: st.phone,
          password_hash: hashedPassword,
          role: 'Teacher',
          skip_face: true,
          skip_location: true,
          isActive: true
        }
      });
    }

    let teacher = await prisma.teacher.findFirst({
      where: { OR: [{ employeeId: st.employeeId }, { email: st.email }] }
    });

    if (teacher) {
      teacher = await prisma.teacher.update({
        where: { id: teacher.id },
        data: {
          name: st.name,
          email: st.email,
          phone: st.phone,
          qualification: st.qualification,
          experience: st.experience,
          primary_subject: st.primary_subject,
          secondary_subject: st.secondary_subject,
          assignedClass: null, // Normal Subject Teacher!
          assignedSection: null,
          plain_password: defaultPassword
        }
      });
    } else {
      teacher = await prisma.teacher.create({
        data: {
          userId: user.id,
          employeeId: st.employeeId,
          name: st.name,
          email: st.email,
          phone: st.phone,
          qualification: st.qualification,
          designation: 'Teacher',
          experience: st.experience,
          primary_subject: st.primary_subject,
          secondary_subject: st.secondary_subject,
          assignedClass: null, // Normal Subject Teacher!
          assignedSection: null,
          plain_password: defaultPassword
        }
      });
    }
    normalTeachers.push(teacher);
    console.log(`✅ Created/Updated Normal Subject Teacher: ${teacher.name} (${teacher.employeeId}) - Primary: ${teacher.primary_subject}, Sec: ${teacher.secondary_subject}`);
  }

  // 4. Create Subjects for Class 6th-A
  const subjectsToCreate = [
    { name: 'Mathematics', code: 'MATH-6A', type: 'Core', weeklyHours: 5, teacher: normalTeachers[0] },
    { name: 'English Literature', code: 'ENG-6A', type: 'Language', weeklyHours: 4, teacher: normalTeachers[1] },
    { name: 'Science', code: 'SCI-6A', type: 'Core', weeklyHours: 5, teacher: normalTeachers[2] },
    { name: 'Social Studies', code: 'SST-6A', type: 'Core', weeklyHours: 4, teacher: priya }
  ];

  const seededSubjects = [];
  for (const s of subjectsToCreate) {
    let sub = await prisma.subject.findFirst({
      where: { name: s.name, standard: '6th' }
    });

    if (sub) {
      sub = await prisma.subject.update({
        where: { id: sub.id },
        data: {
          code: s.code,
          classId: class6A.id,
          standard: '6th',
          section: 'A',
          board: 'CBSE',
          type: s.type,
          weeklyHours: s.weeklyHours
        }
      });
    } else {
      sub = await prisma.subject.create({
        data: {
          name: s.name,
          code: s.code,
          classId: class6A.id,
          standard: '6th',
          section: 'A',
          board: 'CBSE',
          type: s.type,
          weeklyHours: s.weeklyHours
        }
      });
    }
    seededSubjects.push({ sub, teacher: s.teacher });
    console.log(`✅ Subject ready: ${sub.name} (${sub.code}) for Class 6th-A`);
  }

  // 5. Create TeacherClassSubjectMapping
  for (const item of seededSubjects) {
    const { sub, teacher } = item;
    const existing = await prisma.teacherClassSubjectMapping.findFirst({
      where: {
        standard: '6th',
        section: 'A',
        subject: sub.name
      }
    });

    if (existing) {
      await prisma.teacherClassSubjectMapping.update({
        where: { id: existing.id },
        data: {
          teacherId: teacher.id,
          teacherName: teacher.name,
          employeeId: teacher.employeeId,
          classId: class6A.id,
          subjectId: sub.id,
          subjectCode: sub.code
        }
      });
    } else {
      await prisma.teacherClassSubjectMapping.create({
        data: {
          teacherId: teacher.id,
          teacherName: teacher.name,
          employeeId: teacher.employeeId,
          classId: class6A.id,
          standard: '6th',
          section: 'A',
          board: 'CBSE',
          subjectId: sub.id,
          subject: sub.name,
          subjectCode: sub.code,
          roomNumber: class6A.roomNumber
        }
      });
    }
    console.log(`✅ Mapping created: Class 6th-A -> ${sub.name} taught by ${teacher.name} (${teacher.employeeId})`);
  }

  // 6. Timetable for Class 6th-A
  await prisma.timetable.deleteMany({
    where: { standard: '6th', section: 'A' }
  });

  const timetableEntries = [
    // Monday
    { day: 'Monday', period: 1, sub: seededSubjects[0], timeSlot: '08:30-09:15', start: '08:30', end: '09:15' }, // Maths - Ramesh
    { day: 'Monday', period: 2, sub: seededSubjects[1], timeSlot: '09:15-10:00', start: '09:15', end: '10:00' }, // English - Kavita
    { day: 'Monday', period: 3, sub: seededSubjects[2], timeSlot: '10:00-10:45', start: '10:00', end: '10:45' }, // Science - Manoj
    { day: 'Monday', period: 4, sub: seededSubjects[3], timeSlot: '11:00-11:45', start: '11:00', end: '11:45' }, // SST - Priya

    // Tuesday
    { day: 'Tuesday', period: 1, sub: seededSubjects[2], timeSlot: '08:30-09:15', start: '08:30', end: '09:15' }, // Science - Manoj
    { day: 'Tuesday', period: 2, sub: seededSubjects[0], timeSlot: '09:15-10:00', start: '09:15', end: '10:00' }, // Maths - Ramesh
    { day: 'Tuesday', period: 3, sub: seededSubjects[3], timeSlot: '10:00-10:45', start: '10:00', end: '10:45' }, // SST - Priya
    { day: 'Tuesday', period: 4, sub: seededSubjects[1], timeSlot: '11:00-11:45', start: '11:00', end: '11:45' }, // English - Kavita

    // Wednesday
    { day: 'Wednesday', period: 1, sub: seededSubjects[1], timeSlot: '08:30-09:15', start: '08:30', end: '09:15' }, // English - Kavita
    { day: 'Wednesday', period: 2, sub: seededSubjects[2], timeSlot: '09:15-10:00', start: '09:15', end: '10:00' }, // Science - Manoj
    { day: 'Wednesday', period: 3, sub: seededSubjects[0], timeSlot: '10:00-10:45', start: '10:00', end: '10:45' }, // Maths - Ramesh
    { day: 'Wednesday', period: 4, sub: seededSubjects[3], timeSlot: '11:00-11:45', start: '11:00', end: '11:45' }, // SST - Priya

    // Thursday
    { day: 'Thursday', period: 1, sub: seededSubjects[0], timeSlot: '08:30-09:15', start: '08:30', end: '09:15' }, // Maths - Ramesh
    { day: 'Thursday', period: 2, sub: seededSubjects[3], timeSlot: '09:15-10:00', start: '09:15', end: '10:00' }, // SST - Priya
    { day: 'Thursday', period: 3, sub: seededSubjects[1], timeSlot: '10:00-10:45', start: '10:00', end: '10:45' }, // English - Kavita
    { day: 'Thursday', period: 4, sub: seededSubjects[2], timeSlot: '11:00-11:45', start: '11:00', end: '11:45' }, // Science - Manoj

    // Friday
    { day: 'Friday', period: 1, sub: seededSubjects[3], timeSlot: '08:30-09:15', start: '08:30', end: '09:15' }, // SST - Priya
    { day: 'Friday', period: 2, sub: seededSubjects[0], timeSlot: '09:15-10:00', start: '09:15', end: '10:00' }, // Maths - Ramesh
    { day: 'Friday', period: 3, sub: seededSubjects[2], timeSlot: '10:00-10:45', start: '10:00', end: '10:45' }, // Science - Manoj
    { day: 'Friday', period: 4, sub: seededSubjects[1], timeSlot: '11:00-11:45', start: '11:00', end: '11:45' }  // English - Kavita
  ];

  for (const slot of timetableEntries) {
    await prisma.timetable.create({
      data: {
        classId: class6A.id,
        standard: '6th',
        section: 'A',
        board: 'CBSE',
        day: slot.day,
        period: slot.period,
        subjectId: slot.sub.sub.id,
        subject: slot.sub.sub.name,
        subjectCode: slot.sub.sub.code,
        teacherId: slot.sub.teacher.id,
        teacher: slot.sub.teacher.name,
        employeeId: slot.sub.teacher.employeeId,
        room: class6A.roomNumber,
        startTime: slot.start,
        endTime: slot.end,
        timeSlot: slot.timeSlot
      }
    });
  }
  console.log(`✅ Created 20 weekly timetable slots for Class 6th-A!`);

  // 7. Fix other classes' Class Teachers
  const otherClassTeachers = [
    { std: '10th', sec: 'A', emp: 'EMP001' }, // Dr. Rajesh Sharma
    { std: '10th', sec: 'B', emp: 'EMP003' }, // Ananya Sen
    { std: '9th', sec: 'A', emp: 'EMP004' },  // Vikram Singh
    { std: '9th', sec: 'B', emp: 'EMP005' },  // Sneha Reddy
  ];

  for (const oct of otherClassTeachers) {
    const t = await prisma.teacher.findFirst({ where: { employeeId: oct.emp } });
    const c = await prisma.class.findFirst({ where: { standard: oct.std, section: oct.sec } });
    if (t && c) {
      await prisma.class.update({
        where: { id: c.id },
        data: { classTeacherId: t.id, classTeacherName: t.name }
      });
      await prisma.teacher.update({
        where: { id: t.id },
        data: { assignedClass: oct.std, assignedSection: oct.sec }
      });
      console.log(`✅ Linked Class Teacher for ${oct.std}-${oct.sec}: ${t.name}`);
    }
  }

  // 8. Fix existing Timetable entries that had null teacherId by resolving from Teacher name
  const unlinkedSlots = await prisma.timetable.findMany({ where: { teacherId: null } });
  for (const slot of unlinkedSlots) {
    if (slot.teacher) {
      const match = await prisma.teacher.findFirst({
        where: { name: { equals: slot.teacher.trim(), mode: 'insensitive' } }
      });
      if (match) {
        await prisma.timetable.update({
          where: { id: slot.id },
          data: { teacherId: match.id, employeeId: match.employeeId }
        });
      }
    }
  }
  console.log(`✅ Backfilled teacher IDs on timetable entries.`);

  console.log('🎉 Seeding and relationship linking completed successfully!');
  await prisma.$disconnect();
}

seedTeachersAndTimetable().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});

