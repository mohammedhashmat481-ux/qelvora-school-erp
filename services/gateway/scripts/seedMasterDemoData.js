import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

const getTodayDateStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const ALL_STANDARDS = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Vihaan', 'Diya', 'Sai', 'Meera', 'Rohan', 'Ishaan', 'Kavya', 'Aditya',
  'Priya', 'Kabir', 'Zara', 'Arjun', 'Sneha', 'Vivaan', 'Kyra', 'Reyansh', 'Avani', 'Dhruv'
];

const LAST_NAMES = [
  'Sharma', 'Iyer', 'Patel', 'Sen', 'Krishna', 'Nair', 'Das', 'Roy', 'Reddy', 'Joshi'
];

async function seedMaster() {
  try {
    console.log('🚀 Seeding Master Demo Data into PostgreSQL via Prisma ORM...');
    const todayDate = getTodayDateStr();

    // Clear existing tables in safe order
    await prisma.pickupAuthorization.deleteMany();
    await prisma.studentAttendance.deleteMany();
    await prisma.teacherAttendance.deleteMany();
    await prisma.substituteAssignment.deleteMany();
    await prisma.timetable.deleteMany();
    await prisma.teacherClassSubjectMapping.deleteMany();
    await prisma.material.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.student.deleteMany();
    await prisma.teacher.deleteMany();
    await prisma.nonTeachingStaff.deleteMany();
    await prisma.class.deleteMany();
    await prisma.role.deleteMany();
    await prisma.classroomVideo.deleteMany();
    await prisma.teacherFeedback.deleteMany();
    await prisma.paper.deleteMany();
    await prisma.schoolSettings.deleteMany();
    await prisma.user.deleteMany();

    // 1. School Settings
    await prisma.schoolSettings.create({
      data: {
        schoolName: 'Qelvora School CRM',
        academicYear: '2026-2027',
        timings: { start: '08:00', end: '18:00', gracePeriod: 30 },
        period_duration_mins: 45,
        small_break_start: '10:30',
        small_break_mins: 15,
        lunch_break_start: '13:00',
        lunch_break_mins: 45
      }
    });
    console.log('✅ 1. School Settings seeded.');

    // 2. Roles
    await prisma.role.createMany({
      data: [
        { name: 'School Principal', permissions: ['all'] },
        { name: 'Department Head', permissions: ['class', 'attendance', 'reports'] },
        { name: 'Senior Educator', permissions: ['class', 'attendance'] },
        { name: 'Assistant Teacher', permissions: ['attendance'] },
        { name: 'Lab Coordinator', permissions: ['inventory'] }
      ]
    });
    console.log('✅ 2. Roles seeded.');

    // 3. Default Users & Teachers
    const hashedPassword = await bcrypt.hash('Welcome@123', 12);

    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@qelvora.in',
        password_hash: hashedPassword,
        role: 'admin',
        skip_face: true,
        skip_location: true
      }
    });

    const teacherUser = await prisma.user.create({
      data: {
        name: 'Dr. Rajesh Sharma',
        email: 'rajesh.sharma@qelvora.in',
        password_hash: hashedPassword,
        role: 'teacher',
        skip_face: true,
        skip_location: true
      }
    });

    const studentUser = await prisma.user.create({
      data: {
        name: 'Rahul Student',
        email: 'student@example.com',
        password_hash: hashedPassword,
        role: 'student',
        skip_face: true,
        skip_location: true
      }
    });

    const parentUser = await prisma.user.create({
      data: {
        name: 'Mr. & Mrs. Sharma',
        email: 'parent@example.com',
        password_hash: hashedPassword,
        role: 'parent',
        skip_face: true,
        skip_location: true
      }
    });

    const driverUser = await prisma.user.create({
      data: {
        name: 'Driver Ramesh',
        email: 'driver@example.com',
        password_hash: hashedPassword,
        role: 'driver',
        skip_face: true,
        skip_location: true
      }
    });

    const teacherData = [
      { employeeId: 'EMP001', name: 'Dr. Rajesh Sharma', email: 'rajesh.sharma@qelvora.in', qualification: 'Ph.D. in Mathematics', userId: teacherUser.id },
      { employeeId: 'EMP002', name: 'Priya Patel', email: 'priya.patel@qelvora.in', qualification: 'M.Sc. Physics' },
      { employeeId: 'EMP003', name: 'Ananya Sen', email: 'ananya.sen@qelvora.in', qualification: 'M.Sc. Chemistry' },
      { employeeId: 'EMP004', name: 'Vikram Singh', email: 'vikram.singh@qelvora.in', qualification: 'M.Sc. Biology' }
    ];

    for (const t of teacherData) {
      await prisma.teacher.create({ data: t });
    }
    console.log('✅ 3. Teachers & Core Users seeded.');

    // 4. Subjects
    await prisma.subject.create({ data: { name: 'Mathematics', code: 'MATH101', standard: 'All' } });
    await prisma.subject.create({ data: { name: 'Physics', code: 'PHYS101', standard: 'All' } });
    await prisma.subject.create({ data: { name: 'Chemistry', code: 'CHEM101', standard: 'All' } });

    console.log('✅ 4. Subjects seeded.');

    // 5. Classes & Students
    for (const std of ALL_STANDARDS) {
      for (const sec of ['A', 'B']) {
        const cls = await prisma.class.create({
          data: { standard: std, section: sec }
        });

        for (let i = 1; i <= 3; i++) {
          const fn = FIRST_NAMES[(i * 2) % FIRST_NAMES.length];
          const ln = LAST_NAMES[(i * 3) % LAST_NAMES.length];
          const stId = `STU-${std.toUpperCase()}-${sec}-0${i}`;

          const student = await prisma.student.create({
            data: {
              userId: studentUser.id,
              studentId: stId,
              name: `${fn} ${ln}`,
              email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${std.toLowerCase()}${sec.toLowerCase()}@qelvora.in`,
              standard: std,
              section: sec,
              rollNumber: `${sec === 'A' ? '1' : '2'}0${i}`,
              parentName: `Mr. & Mrs. ${ln}`,
              parentPhone: '+91 9876543210'
            }
          });

          await prisma.studentAttendance.create({
            data: {
              date: todayDate,
              classId: cls.id,
              studentName: student.name,
              rollNumber: student.rollNumber || '01',
              status: i === 3 ? 'Absent' : 'Present',
              markedTime: '08:30 AM'
            }
          });
        }
      }
    }
    console.log('✅ 5. Classes, Students, & Attendance grid seeded across Nursery to 12th.');

    // 6. Timetables
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    for (const day of days) {
      for (let period = 1; period <= 4; period++) {
        await prisma.timetable.create({
          data: {
            standard: 'Grade 9',
            section: 'A',
            day,
            period,
            subject: period % 2 === 0 ? 'Mathematics' : 'Physics',
            teacher: 'Dr. Rajesh Sharma',
            room: `Room 10${period}`,
            startTime: `0${8 + period}:00`,
            endTime: `0${8 + period}:45`
          }
        });
      }
    }
    console.log('✅ 6. Timetables seeded.');

    // 7. Question Papers
    await prisma.paper.create({
      data: {
        id: 'QP-MATH-09A-2026',
        title: 'Grade 9 Mathematics Mid-Term Assessment Paper',
        paper: 'SECTION A (10 Marks)\n1. Solve for x: 2x^2 + 5x - 12 = 0.',
        answerKey: '1. x = 1.5 or x = -4',
        request: { standard: 'Grade 9', subject: 'Mathematics', totalMarks: 25 }
      }
    });
    console.log('✅ 7. Question Papers seeded.');

    console.log('\n🎉 ALL MASTER DEMO DATA SUCCESSFULLY SEEDED INTO POSTGRESQL VIA PRISMA!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedMaster();
