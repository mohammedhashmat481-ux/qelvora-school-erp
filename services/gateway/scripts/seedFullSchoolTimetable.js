import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIOD_TIMES = [
  { period: 1, start: '08:30', end: '09:15', slot: '08:30 - 09:15' },
  { period: 2, start: '09:15', end: '10:00', slot: '09:15 - 10:00' },
  { period: 3, start: '10:00', end: '10:45', slot: '10:00 - 10:45' },
  { period: 4, start: '11:00', end: '11:45', slot: '11:00 - 11:45' },
  { period: 5, start: '11:45', end: '12:30', slot: '11:45 - 12:30' },
  { period: 6, start: '12:30', end: '01:15', slot: '12:30 - 01:15' }
];

async function seed() {
  console.log('🚀 Seeding comprehensive full-school teachers, subjects, mappings, and timetables...');

  const defaultPassword = 'Welcome@123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // 1. Defined Class Teachers (One Class Teacher per Class/Section)
  const classTeachersConfig = [
    { name: 'Dr. Rajesh Sharma', empId: 'EMP001', email: 'rajesh.sharma@qelvora.in', std: '10th', sec: 'A', primary: 'Mathematics', secSub: 'Physics', dept: 'Mathematics' },
    { name: 'Ananya Sen', empId: 'EMP003', email: 'ananya.sen@qelvora.in', std: '10th', sec: 'B', primary: 'Chemistry', secSub: 'Biology', dept: 'Chemistry' },
    { name: 'Vikram Singh', empId: 'EMP004', email: 'vikram.singh@qelvora.in', std: '9th', sec: 'A', primary: 'Biology', secSub: 'Science', dept: 'Life Sciences' },
    { name: 'Sneha Reddy', empId: 'EMP005', email: 'sneha.reddy@qelvora.in', std: '9th', sec: 'B', primary: 'English Literature', secSub: 'Social Studies', dept: 'English' },
    { name: 'Arjun Nair', empId: 'EMP006', email: 'arjun.nair@qelvora.in', std: '7th', sec: 'A', primary: 'Computer Science', secSub: 'AI & Coding', dept: 'Computer Science' },
    { name: 'Priya Patel', empId: 'EMP002', email: 'priya.patel@qelvora.in', std: '6th', sec: 'A', primary: 'Physics', secSub: 'Mathematics', dept: 'Science' },
    { name: 'Suresh Kumar', empId: 'EMP007', email: 'suresh.kumar@qelvora.in', std: '8th', sec: 'A', primary: 'General Science', secSub: 'Mathematics', dept: 'Science' },
    { name: 'Anita Desai', empId: 'EMP008', email: 'anita.desai@qelvora.in', std: '8th', sec: 'B', primary: 'Social Studies', secSub: 'English', dept: 'Humanities' },
    { name: 'Pooja Sharma', empId: 'EMP009', email: 'pooja.sharma@qelvora.in', std: '5th', sec: 'A', primary: 'Environmental Science', secSub: 'Hindi', dept: 'Primary' },
    { name: 'Sunita Rao', empId: 'EMP015', email: 'sunita.rao@qelvora.in', std: '1st', sec: 'A', primary: 'English', secSub: 'Mathematics', dept: 'Primary' },
    { name: 'Meenakshi Sundaram', empId: 'EMP016', email: 'meenakshi.s@qelvora.in', std: 'UKG', sec: 'A', primary: 'Early Foundations', secSub: 'Rhymes', dept: 'Pre-Primary' },
    { name: 'Geeta Menon', empId: 'EMP017', email: 'geeta.menon@qelvora.in', std: 'LKG', sec: 'A', primary: 'Storytelling & Art', secSub: 'Music', dept: 'Pre-Primary' },
    { name: 'Deepa Pillai', empId: 'EMP018', email: 'deepa.pillai@qelvora.in', std: 'Nursery', sec: 'A', primary: 'Pre-Primary Activity', secSub: 'Play', dept: 'Pre-Primary' }
  ];

  // 2. Normal Subject Teachers (NOT Class Teachers: assignedClass = null, assignedSection = null)
  const normalSubjectTeachersConfig = [
    { name: 'Ramesh Verma', empId: 'EMP010', email: 'ramesh.verma@qelvora.in', primary: 'Mathematics', secSub: 'Physics', dept: 'Mathematics' },
    { name: 'Kavita Joshi', empId: 'EMP011', email: 'kavita.joshi@qelvora.in', primary: 'English Literature', secSub: 'Hindi', dept: 'Languages' },
    { name: 'Manoj Tiwari', empId: 'EMP012', email: 'manoj.tiwari@qelvora.in', primary: 'Science', secSub: 'Chemistry', dept: 'Science' },
    { name: 'Harish Chandra', empId: 'EMP013', email: 'harish.chandra@qelvora.in', primary: 'Social Studies', secSub: 'History', dept: 'Humanities' },
    { name: 'Neha Gupta', empId: 'EMP014', email: 'neha.gupta@qelvora.in', primary: 'Hindi', secSub: 'Sanskrit', dept: 'Languages' }
  ];

  const teacherMapByName = {};

  // Upsert Class Teachers
  for (const ct of classTeachersConfig) {
    let user = await prisma.user.findFirst({ where: { email: ct.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: ct.name,
          email: ct.email,
          password_hash: hashedPassword,
          role: 'teacher',
          skip_face: true,
          skip_location: true
        }
      });
    }

    let teacher = await prisma.teacher.findFirst({
      where: { OR: [{ email: ct.email }, { employeeId: ct.empId }, { name: ct.name }] }
    });

    if (teacher) {
      teacher = await prisma.teacher.update({
        where: { id: teacher.id },
        data: {
          userId: user.id,
          employeeId: ct.empId,
          name: ct.name,
          assignedClass: ct.std,
          assignedSection: ct.sec,
          primary_subject: ct.primary,
          secondary_subject: ct.secSub,
          department: ct.dept,
          plain_password: defaultPassword
        }
      });
    } else {
      teacher = await prisma.teacher.create({
        data: {
          userId: user.id,
          employeeId: ct.empId,
          name: ct.name,
          email: ct.email,
          assignedClass: ct.std,
          assignedSection: ct.sec,
          primary_subject: ct.primary,
          secondary_subject: ct.secSub,
          department: ct.dept,
          plain_password: defaultPassword
        }
      });
    }
    teacherMapByName[ct.name] = teacher;
  }

  // Upsert Normal Subject Teachers
  for (const nt of normalSubjectTeachersConfig) {
    let user = await prisma.user.findFirst({ where: { email: nt.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: nt.name,
          email: nt.email,
          password_hash: hashedPassword,
          role: 'teacher',
          skip_face: true,
          skip_location: true
        }
      });
    }

    let teacher = await prisma.teacher.findFirst({
      where: { OR: [{ email: nt.email }, { employeeId: nt.empId }, { name: nt.name }] }
    });

    if (teacher) {
      teacher = await prisma.teacher.update({
        where: { id: teacher.id },
        data: {
          userId: user.id,
          employeeId: nt.empId,
          name: nt.name,
          assignedClass: null,
          assignedSection: null,
          primary_subject: nt.primary,
          secondary_subject: nt.secSub,
          department: nt.dept,
          plain_password: defaultPassword
        }
      });
    } else {
      teacher = await prisma.teacher.create({
        data: {
          userId: user.id,
          employeeId: nt.empId,
          name: nt.name,
          email: nt.email,
          assignedClass: null,
          assignedSection: null,
          primary_subject: nt.primary,
          secondary_subject: nt.secSub,
          department: nt.dept,
          plain_password: defaultPassword
        }
      });
    }
    teacherMapByName[nt.name] = teacher;
  }

  console.log(`✅ Upserted ${Object.keys(teacherMapByName).length} faculty members.`);

  // 3. Ensure all classes exist and link their Class Teacher
  const classesList = [
    { standard: 'Nursery', section: 'A', room: 'Room 001', ctName: 'Deepa Pillai' },
    { standard: 'LKG', section: 'A', room: 'Room 002', ctName: 'Geeta Menon' },
    { standard: 'UKG', section: 'A', room: 'Room 003', ctName: 'Meenakshi Sundaram' },
    { standard: '1st', section: 'A', room: 'Room 101', ctName: 'Sunita Rao' },
    { standard: '5th', section: 'A', room: 'Room 105', ctName: 'Pooja Sharma' },
    { standard: '6th', section: 'A', room: 'Room 201', ctName: 'Priya Patel' },
    { standard: '7th', section: 'A', room: 'Room 202', ctName: 'Arjun Nair' },
    { standard: '8th', section: 'A', room: 'Room 203', ctName: 'Suresh Kumar' },
    { standard: '8th', section: 'B', room: 'Room 204', ctName: 'Anita Desai' },
    { standard: '9th', section: 'A', room: 'Room 301', ctName: 'Vikram Singh' },
    { standard: '9th', section: 'B', room: 'Room 302', ctName: 'Sneha Reddy' },
    { standard: '10th', section: 'A', room: 'Room 303', ctName: 'Dr. Rajesh Sharma' },
    { standard: '10th', section: 'B', room: 'Room 304', ctName: 'Ananya Sen' }
  ];

  const dbClasses = {};
  for (const c of classesList) {
    const ctTeacher = teacherMapByName[c.ctName];
    let cls = await prisma.class.findFirst({
      where: { standard: c.standard, section: c.section }
    });

    if (cls) {
      cls = await prisma.class.update({
        where: { id: cls.id },
        data: {
          classTeacherId: ctTeacher?.id || null,
          classTeacherName: ctTeacher?.name || c.ctName,
          roomNumber: c.room,
          board: 'CBSE'
        }
      });
    } else {
      cls = await prisma.class.create({
        data: {
          standard: c.standard,
          section: c.section,
          board: 'CBSE',
          classTeacherId: ctTeacher?.id || null,
          classTeacherName: ctTeacher?.name || c.ctName,
          roomNumber: c.room,
          strength: 32
        }
      });
    }
    dbClasses[`${c.standard}-${c.section}`] = cls;
  }
  console.log(`✅ Configured ${Object.keys(dbClasses).length} classes with unique Class Teachers.`);

  // 4. Clean old timetable entries and recreate clean, conflict-free weekly schedules
  await prisma.timetable.deleteMany({});
  await prisma.teacherClassSubjectMapping.deleteMany({});
  console.log('🧹 Purged previous timetable entries and mappings.');

  // Subject schedule plan per grade level:
  // Primary / Middle / High School syllabus with balanced faculty distribution:
  const gradeSchedules = {
    '10th-A': [
      { sub: 'Mathematics', teacherName: 'Dr. Rajesh Sharma' },
      { sub: 'Physics', teacherName: 'Priya Patel' },
      { sub: 'Chemistry', teacherName: 'Ananya Sen' },
      { sub: 'English Literature', teacherName: 'Sneha Reddy' },
      { sub: 'Computer Science', teacherName: 'Arjun Nair' },
      { sub: 'Physical Education', teacherName: 'Vikram Singh' }
    ],
    '10th-B': [
      { sub: 'Chemistry', teacherName: 'Ananya Sen' },
      { sub: 'Mathematics', teacherName: 'Ramesh Verma' },
      { sub: 'Physics', teacherName: 'Priya Patel' },
      { sub: 'English Literature', teacherName: 'Kavita Joshi' },
      { sub: 'Computer Science', teacherName: 'Arjun Nair' },
      { sub: 'Physical Education', teacherName: 'Suresh Kumar' }
    ],
    '9th-A': [
      { sub: 'Biology', teacherName: 'Vikram Singh' },
      { sub: 'Mathematics', teacherName: 'Ramesh Verma' },
      { sub: 'Science', teacherName: 'Manoj Tiwari' },
      { sub: 'English Literature', teacherName: 'Sneha Reddy' },
      { sub: 'Social Studies', teacherName: 'Harish Chandra' },
      { sub: 'Hindi', teacherName: 'Neha Gupta' }
    ],
    '9th-B': [
      { sub: 'English Literature', teacherName: 'Sneha Reddy' },
      { sub: 'Biology', teacherName: 'Vikram Singh' },
      { sub: 'Mathematics', teacherName: 'Dr. Rajesh Sharma' },
      { sub: 'Chemistry', teacherName: 'Ananya Sen' },
      { sub: 'Social Studies', teacherName: 'Harish Chandra' },
      { sub: 'Hindi', teacherName: 'Neha Gupta' }
    ],
    '8th-A': [
      { sub: 'General Science', teacherName: 'Suresh Kumar' },
      { sub: 'Mathematics', teacherName: 'Ramesh Verma' },
      { sub: 'Social Studies', teacherName: 'Harish Chandra' },
      { sub: 'English Literature', teacherName: 'Kavita Joshi' },
      { sub: 'Science', teacherName: 'Manoj Tiwari' },
      { sub: 'Hindi', teacherName: 'Neha Gupta' }
    ],
    '8th-B': [
      { sub: 'Social Studies', teacherName: 'Anita Desai' },
      { sub: 'Science', teacherName: 'Manoj Tiwari' },
      { sub: 'Mathematics', teacherName: 'Suresh Kumar' },
      { sub: 'English Literature', teacherName: 'Kavita Joshi' },
      { sub: 'Hindi', teacherName: 'Neha Gupta' },
      { sub: 'Computer Science', teacherName: 'Arjun Nair' }
    ],
    '7th-A': [
      { sub: 'Computer Science', teacherName: 'Arjun Nair' },
      { sub: 'Mathematics', teacherName: 'Ramesh Verma' },
      { sub: 'Science', teacherName: 'Manoj Tiwari' },
      { sub: 'English Literature', teacherName: 'Kavita Joshi' },
      { sub: 'Social Studies', teacherName: 'Harish Chandra' },
      { sub: 'Hindi', teacherName: 'Neha Gupta' }
    ],
    '6th-A': [
      { sub: 'Mathematics', teacherName: 'Ramesh Verma' },
      { sub: 'English Literature', teacherName: 'Kavita Joshi' },
      { sub: 'Science', teacherName: 'Manoj Tiwari' },
      { sub: 'Social Studies', teacherName: 'Harish Chandra' },
      { sub: 'Physics', teacherName: 'Priya Patel' },
      { sub: 'Hindi', teacherName: 'Neha Gupta' }
    ],
    '5th-A': [
      { sub: 'Environmental Science', teacherName: 'Pooja Sharma' },
      { sub: 'Mathematics', teacherName: 'Suresh Kumar' },
      { sub: 'English', teacherName: 'Kavita Joshi' },
      { sub: 'Hindi', teacherName: 'Neha Gupta' },
      { sub: 'General Knowledge', teacherName: 'Anita Desai' },
      { sub: 'Art & Craft', teacherName: 'Pooja Sharma' }
    ],
    '1st-A': [
      { sub: 'English Alphabet & Phonics', teacherName: 'Sunita Rao' },
      { sub: 'Basic Mathematics', teacherName: 'Sunita Rao' },
      { sub: 'Environmental Studies', teacherName: 'Pooja Sharma' },
      { sub: 'Hindi Varnamala', teacherName: 'Neha Gupta' },
      { sub: 'Drawing & Coloring', teacherName: 'Sunita Rao' },
      { sub: 'Rhymes & Story', teacherName: 'Sunita Rao' }
    ],
    'UKG-A': [
      { sub: 'Early Foundations', teacherName: 'Meenakshi Sundaram' },
      { sub: 'Number Fun', teacherName: 'Meenakshi Sundaram' },
      { sub: 'English Rhymes', teacherName: 'Meenakshi Sundaram' },
      { sub: 'Art & Play', teacherName: 'Geeta Menon' },
      { sub: 'Sensory Activities', teacherName: 'Meenakshi Sundaram' },
      { sub: 'Story Session', teacherName: 'Meenakshi Sundaram' }
    ],
    'LKG-A': [
      { sub: 'Storytelling & Art', teacherName: 'Geeta Menon' },
      { sub: 'Shapes & Colors', teacherName: 'Geeta Menon' },
      { sub: 'Action Songs', teacherName: 'Geeta Menon' },
      { sub: 'Play Dough & Motor Skills', teacherName: 'Deepa Pillai' },
      { sub: 'Alphabet Play', teacherName: 'Geeta Menon' },
      { sub: 'Fun Time', teacherName: 'Geeta Menon' }
    ],
    'Nursery-A': [
      { sub: 'Pre-Primary Activity', teacherName: 'Deepa Pillai' },
      { sub: 'Finger Painting', teacherName: 'Deepa Pillai' },
      { sub: 'Nursery Rhymes', teacherName: 'Deepa Pillai' },
      { sub: 'Free Play & Toys', teacherName: 'Deepa Pillai' },
      { sub: 'Music & Movement', teacherName: 'Geeta Menon' },
      { sub: 'Nap & Care', teacherName: 'Deepa Pillai' }
    ]
  };

  // Create Mappings and rotate periods per day to avoid conflict
  const createdMappings = new Set();
  const timetableRecords = [];

  const classKeys = Object.keys(gradeSchedules);

  DAYS.forEach((day, dayIdx) => {
    classKeys.forEach((classKey, classIdx) => {
      const cls = dbClasses[classKey];
      const subjectsPool = gradeSchedules[classKey];
      const [std, sec] = classKey.split('-');

      PERIOD_TIMES.forEach((pTime, pIdx) => {
        // Rotate subjects across days so the schedule is varied
        const subIndex = (pIdx + dayIdx + classIdx) % subjectsPool.length;
        const subItem = subjectsPool[subIndex];
        const teacherObj = teacherMapByName[subItem.teacherName];

        // Track mapping
        const mapKey = `${classKey}-${subItem.sub}-${subItem.teacherName}`;
        if (!createdMappings.has(mapKey)) {
          createdMappings.add(mapKey);
        }

        timetableRecords.push({
          classId: cls.id,
          standard: std,
          section: sec,
          board: 'CBSE',
          day: day,
          period: pTime.period,
          subject: subItem.sub,
          subjectCode: `${subItem.sub.substring(0, 3).toUpperCase()}-${std}`,
          teacherId: teacherObj ? teacherObj.id : null,
          teacher: subItem.teacherName,
          employeeId: teacherObj ? teacherObj.employeeId : 'FAC',
          room: cls.roomNumber || 'Room 101',
          startTime: pTime.start,
          endTime: pTime.end,
          timeSlot: pTime.slot
        });
      });
    });
  });

  // Bulk insert mappings
  const mappingsToInsert = [];
  for (const [classKey, subjects] of Object.entries(gradeSchedules)) {
    const cls = dbClasses[classKey];
    const [std, sec] = classKey.split('-');
    const uniqueSubs = new Map();
    subjects.forEach(s => {
      if (!uniqueSubs.has(s.sub)) uniqueSubs.set(s.sub, s.teacherName);
    });

    for (const [subName, tName] of uniqueSubs.entries()) {
      const tObj = teacherMapByName[tName];
      mappingsToInsert.push({
        teacherId: tObj ? tObj.id : null,
        teacherName: tName,
        employeeId: tObj ? tObj.employeeId : 'FAC',
        classId: cls.id,
        standard: std,
        section: sec,
        board: 'CBSE',
        subject: subName,
        subjectCode: `${subName.substring(0, 3).toUpperCase()}-${std}`,
        roomNumber: cls.roomNumber || 'Room 101'
      });
    }
  }

  await prisma.teacherClassSubjectMapping.createMany({
    data: mappingsToInsert
  });
  console.log(`✅ Created ${mappingsToInsert.length} teacher-class-subject mappings.`);

  // Insert timetable in chunks
  const chunkSize = 50;
  for (let i = 0; i < timetableRecords.length; i += chunkSize) {
    const chunk = timetableRecords.slice(i, i + chunkSize);
    await prisma.timetable.createMany({ data: chunk });
  }
  console.log(`🎉 Successfully seeded ${timetableRecords.length} timetable periods across all 13 classes for Monday-Saturday!`);
}

seed().catch(console.error).finally(() => prisma.$disconnect());

