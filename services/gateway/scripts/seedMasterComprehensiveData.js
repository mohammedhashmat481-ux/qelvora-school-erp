import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();
const FEES_DATA_PATH = path.resolve(__dirname, '../src/db/feesData.json');

const getDateDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export async function seedCompletePlatform() {
  console.log('🚀 ========================================================');
  console.log('🏫 STARTING MASTER COMPREHENSIVE DEMO DATA INITIALIZATION');
  console.log('🚀 ========================================================\n');

  try {
    // 1. CLEAR EXISTING DATA SAFELY IN REVERSE FK ORDER
    console.log('🧹 1. Clearing legacy records from database...');
    await prisma.studentCCEGrade.deleteMany();
    await prisma.examMarks.deleteMany();
    await prisma.examAllocation.deleteMany();
    await prisma.examWeightage.deleteMany();
    await prisma.examName.deleteMany();
    await prisma.examType.deleteMany();
    await prisma.gradeScale.deleteMany();
    await prisma.cCETestType.deleteMany();
    await prisma.cCESkill.deleteMany();

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
    await prisma.leaveRequest.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.classSession.deleteMany();
    await prisma.securityAuditLog.deleteMany();
    await prisma.schoolSettings.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Legacy records cleared.');

    // 2. MASTER SCHOOL SETTINGS
    console.log('⚙️ 2. Seeding Master School Configuration...');
    const schoolSettings = await prisma.schoolSettings.create({
      data: {
        schoolName: 'Qelvora School CRM',
        logoSubtext: 'Empowering Academic Excellence & Safe Campus Identity',
        schoolType: 'Co-Educational Senior Secondary',
        board: 'CBSE',
        boardsList: ['CBSE', 'ICSE', 'STATE', 'IGCSE', 'IB'],
        standardsList: ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'],
        academicYear: '2026-2027',
        face_auth_enabled: true,
        location_auth_enabled: true,
        timings: { start: '08:30', end: '16:00', gracePeriod: 30 },
        hours_per_subject: 1,
        period_duration_mins: 45,
        game_period_mins: 45,
        lunch_break_mins: 45,
        lunch_break_start: '12:00',
        small_break_mins: 15,
        small_break_start: '10:30',
        hours_per_day: 8,
        hours_per_week: 40,
        hours_per_month: 160,
        hours_per_year: 1920,
        weekly_off: 'Sunday'
      }
    });
    console.log('✅ Master School Settings configured.');

    // 3. ENTERPRISE ROLES
    console.log('🛡️ 3. Seeding Institutional Roles...');
    await prisma.role.createMany({
      data: [
        { name: 'School Principal', rolename: 'School Principal', roleCode: 'PRIN', grantAdminPrivilege: true, status: 'Active', isEnabled: true, permissions: ['all', 'settings', 'admin', 'reports', 'approvals'] },
        { name: 'Department Head', rolename: 'Department Head', roleCode: 'HOD', grantAdminPrivilege: true, status: 'Active', isEnabled: true, permissions: ['class', 'attendance', 'reports', 'subjects', 'timetables'] },
        { name: 'Senior Educator', rolename: 'Senior Educator', roleCode: 'SRED', grantAdminPrivilege: false, status: 'Active', isEnabled: true, permissions: ['class', 'attendance', 'timetables', 'materials', 'marks'] },
        { name: 'Assistant Teacher', rolename: 'Assistant Teacher', roleCode: 'ASTT', grantAdminPrivilege: false, status: 'Active', isEnabled: true, permissions: ['attendance', 'class'] },
        { name: 'Lab Coordinator', rolename: 'Lab Coordinator', roleCode: 'LBCO', grantAdminPrivilege: false, status: 'Active', isEnabled: true, permissions: ['inventory', 'classes', 'materials'] },
        { name: 'Transport & Safety Incharge', rolename: 'Transport & Safety Incharge', roleCode: 'TSAF', grantAdminPrivilege: false, status: 'Active', isEnabled: true, permissions: ['pickup', 'attendance'] },
        { name: 'Examination Controller', rolename: 'Examination Controller', roleCode: 'EXAM', grantAdminPrivilege: true, status: 'Active', isEnabled: true, permissions: ['papers', 'reports', 'classes', 'marks'] }
      ]
    });

    // 4. USERS & PASSWORDS
    console.log('👤 4. Seeding Principal, Teachers, Students & Parents Accounts...');
    const defaultPasswordHash = await bcrypt.hash('Welcome@123', 12);

    // Admin
    const adminUser = await prisma.user.create({
      data: {
        name: 'Super Administrator',
        email: 'admin@qelvora.in',
        password_hash: defaultPasswordHash,
        role: 'admin',
        skip_face: true,
        skip_location: true
      }
    });

    // Principal
    const principalUser = await prisma.user.create({
      data: {
        name: 'Dr. Rajesh Sharma',
        email: 'rajesh.sharma@qelvora.in',
        password_hash: defaultPasswordHash,
        role: 'School Principal',
        skip_face: true,
        skip_location: true
      }
    });

    // Teachers Faculty Data (14 teachers covering all classes)
    const teacherConfigs = [
      { empId: 'EMP001', name: 'Dr. Rajesh Sharma', email: 'rajesh.sharma@qelvora.in', dept: 'Mathematics', role: 'School Principal', qual: 'Ph.D. in Pure Mathematics', desig: 'Principal & Senior Head', std: '10th', sec: 'A', uId: principalUser.id },
      { empId: 'EMP002', name: 'Priya Patel', email: 'priya.patel@qelvora.in', dept: 'Physics', role: 'Teacher', qual: 'M.Sc. Physics (Gold Medalist)', desig: 'Teacher', std: '10th', sec: 'A' },
      { empId: 'EMP003', name: 'Ananya Sen', email: 'ananya.sen@qelvora.in', dept: 'Chemistry', role: 'Senior Educator', qual: 'M.Sc. Organic Chemistry', desig: 'Senior Chemistry Educator', std: '9th', sec: 'A' },
      { empId: 'EMP004', name: 'Vikram Singh', email: 'vikram.singh@qelvora.in', dept: 'Biology', role: 'Senior Educator', qual: 'M.Sc. Zoology & Genetics', desig: 'Senior Biology Educator', std: '8th', sec: 'A' },
      { empId: 'EMP005', name: 'Sneha Reddy', email: 'sneha.reddy@qelvora.in', dept: 'English Literature', role: 'Senior Educator', qual: 'M.A., M.Phil. English', desig: 'Senior Humanities Educator', std: '7th', sec: 'A' },
      { empId: 'EMP006', name: 'Arjun Nair', email: 'arjun.nair@qelvora.in', dept: 'Computer Science & AI', role: 'Lab Coordinator', qual: 'M.Tech Computer Science', desig: 'Lead AI & CS Coordinator', std: '6th', sec: 'A' },
      { empId: 'EMP007', name: 'Meenakshi Sundaram', email: 'meenakshi.s@qelvora.in', dept: 'Hindi & Sanskrit', role: 'Senior Educator', qual: 'M.A. Hindi Literature, B.Ed.', desig: 'Language Department Head', std: '5th', sec: 'A' },
      { empId: 'EMP008', name: 'Rakesh Verma', email: 'rakesh.v@qelvora.in', dept: 'Social Science', role: 'Senior Educator', qual: 'M.A. History & Civics', desig: 'Social Studies Lead', std: '4th', sec: 'A' },
      { empId: 'EMP009', name: 'Sunita Deshmukh', email: 'sunita.d@qelvora.in', dept: 'Primary Mathematics', role: 'Assistant Teacher', qual: 'B.Sc. Mathematics, B.Ed.', desig: 'Primary School Teacher', std: '3rd', sec: 'A' },
      { empId: 'EMP010', name: 'Pooja Sharma', email: 'pooja.s@qelvora.in', dept: 'Primary English', role: 'Assistant Teacher', qual: 'B.A. English, Montessori Dip.', desig: 'Primary Educator', std: '2nd', sec: 'A' },
      { empId: 'EMP011', name: 'Anjali Saxena', email: 'anjali.s@qelvora.in', dept: 'Foundational Learning', role: 'Assistant Teacher', qual: 'B.Ed. Elementary Education', desig: 'Foundational Educator', std: '1st', sec: 'A' },
      { empId: 'EMP012', name: 'Rashmi Varma', email: 'rashmi.v@qelvora.in', dept: 'Early Childhood Education', role: 'Assistant Teacher', qual: 'Diploma in Early Child Care (ECCEd)', desig: 'Kindergarten Educator', std: 'UKG', sec: 'A' },
      { empId: 'EMP013', name: 'Geeta Menon', email: 'geeta.m@qelvora.in', dept: 'Pre-Primary Education', role: 'Assistant Teacher', qual: 'Montessori Certified Instructor', desig: 'Pre-Primary Educator', std: 'LKG', sec: 'A' },
      { empId: 'EMP014', name: 'Kavita Pillai', email: 'kavita.p@qelvora.in', dept: 'Playgroup & Toddler Care', role: 'Assistant Teacher', qual: 'Child Psychology Specialist', desig: 'Nursery Lead Educator', std: 'Nursery', sec: 'A' },
      { empId: 'EMP015', name: 'Manoj Tiwari', email: 'manoj.t@qelvora.in', dept: 'Physical Education & Sports', role: 'Senior Educator', qual: 'M.P.Ed. Sports Sciences', desig: 'Athletic Director', std: '10th', sec: 'B' }
    ];

    const teacherMap = {};
    for (const t of teacherConfigs) {
      let userId = t.uId;
      if (!userId) {
        const u = await prisma.user.create({
          data: {
            name: t.name,
            email: t.email,
            password_hash: defaultPasswordHash,
            role: t.role,
            skip_face: true,
            skip_location: true
          }
        });
        userId = u.id;
      }

      const teacherRecord = await prisma.teacher.create({
        data: {
          employeeId: t.empId,
          name: t.name,
          email: t.email,
          phone: `+91 98765 1${t.empId.replace('EMP', '')}`,
          department: t.dept,
          qualification: t.qual,
          designation: t.desig,
          assignedClass: t.std,
          assignedSection: t.sec,
          userId: userId
        }
      });
      teacherMap[t.name] = teacherRecord;
    }

    // Student & Parent User Accounts
    const studentUser = await prisma.user.create({
      data: { name: 'Rahul Student', email: 'student@example.com', password_hash: defaultPasswordHash, role: 'student', skip_face: true, skip_location: true }
    });
    const aaravUser = await prisma.user.create({
      data: { name: 'Aarav Sharma', email: 'aarav.sharma@qelvora.in', password_hash: defaultPasswordHash, role: 'student', skip_face: true, skip_location: true }
    });
    const parentUser = await prisma.user.create({
      data: { name: 'Mr. & Mrs. Sharma', email: 'parent@example.com', password_hash: defaultPasswordHash, role: 'parent', skip_face: true, skip_location: true }
    });

    // 5. INSTITUTIONAL CLASSES (13 standards from Nursery to 10th)
    console.log('🏫 5. Seeding Institutional Classes (Nursery to 10th)...');
    const classStandards = [
      { std: '10th', sec: 'A', room: 'Room 301' },
      { std: '10th', sec: 'B', room: 'Room 302' },
      { std: '9th', sec: 'A', room: 'Room 201' },
      { std: '9th', sec: 'B', room: 'Room 202' },
      { std: '8th', sec: 'A', room: 'Room 101' },
      { std: '7th', sec: 'A', room: 'Room 102' },
      { std: '6th', sec: 'A', room: 'Room 103' },
      { std: '5th', sec: 'A', room: 'Room 104' },
      { std: '4th', sec: 'A', room: 'Room 105' },
      { std: '3rd', sec: 'A', room: 'Room 106' },
      { std: '2nd', sec: 'A', room: 'Room 002' },
      { std: '1st', sec: 'A', room: 'Room 001' },
      { std: 'UKG', sec: 'A', room: 'Kindergarten 2' },
      { std: 'LKG', sec: 'A', room: 'Kindergarten 1' },
      { std: 'Nursery', sec: 'A', room: 'Playgroup Activity Hall' }
    ];

    const createdClasses = {};
    for (const c of classStandards) {
      const cls = await prisma.class.create({
        data: { standard: c.std, section: c.sec, roomNumber: c.room }
      });
      createdClasses[`${c.std}-${c.sec}`] = cls;
    }

    // 6. SUBJECTS & STUDY MATERIALS
    console.log('📚 6. Seeding Comprehensive Subjects & Curricula...');
    const subjectList = [
      { name: 'Mathematics', code: 'MATH101', standard: 'All' },
      { name: 'Physics', code: 'PHYS101', standard: 'Senior' },
      { name: 'Chemistry', code: 'CHEM101', standard: 'Senior' },
      { name: 'Biology', code: 'BIO101', standard: 'Senior' },
      { name: 'English Literature', code: 'ENG101', standard: 'All' },
      { name: 'Computer Science & AI', code: 'CS101', standard: 'All' },
      { name: 'Social Studies & Civics', code: 'SST101', standard: 'Middle' },
      { name: 'Hindi & Sanskrit', code: 'LANG101', standard: 'All' },
      { name: 'Environmental Science', code: 'EVS101', standard: 'Primary' },
      { name: 'Foundational Numeracy & Phonics', code: 'FND101', standard: 'Pre-Primary' },
      { name: 'Physical Education & Sports', code: 'PET101', standard: 'All' }
    ];

    const createdSubjects = {};
    for (const sub of subjectList) {
      const s = await prisma.subject.create({ data: sub });
      createdSubjects[sub.name] = s;

      await prisma.material.create({
        data: {
          subjectId: s.id,
          title: `${sub.name} - Complete Term 1 Curriculum Dossier & Worksheets`,
          fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          fileType: 'pdf',
          uploadedBy: 'Dr. Rajesh Sharma'
        }
      });
    }

    // 7. TEACHER-CLASS-SUBJECT MAPPINGS
    console.log('🔗 7. Seeding Teacher Class Mappings...');
    const teacherMappings = [
      { teacherName: 'Dr. Rajesh Sharma', standard: '10th', section: 'A', subject: 'Mathematics' },
      { teacherName: 'Dr. Rajesh Sharma', standard: '9th', section: 'A', subject: 'Mathematics' },
      { teacherName: 'Priya Patel', standard: '10th', section: 'A', subject: 'Physics' },
      { teacherName: 'Priya Patel', standard: '9th', section: 'A', subject: 'Physics' },
      { teacherName: 'Ananya Sen', standard: '10th', section: 'A', subject: 'Chemistry' },
      { teacherName: 'Ananya Sen', standard: '9th', section: 'A', subject: 'Chemistry' },
      { teacherName: 'Vikram Singh', standard: '8th', section: 'A', subject: 'Biology' },
      { teacherName: 'Vikram Singh', standard: '7th', section: 'A', subject: 'Environmental Science' },
      { teacherName: 'Sneha Reddy', standard: '7th', section: 'A', subject: 'English Literature' },
      { teacherName: 'Sneha Reddy', standard: '6th', section: 'A', subject: 'English Literature' },
      { teacherName: 'Arjun Nair', standard: '6th', section: 'A', subject: 'Computer Science & AI' },
      { teacherName: 'Arjun Nair', standard: '5th', section: 'A', subject: 'Computer Science & AI' },
      { teacherName: 'Meenakshi Sundaram', standard: '5th', section: 'A', subject: 'Hindi & Sanskrit' },
      { teacherName: 'Meenakshi Sundaram', standard: '4th', section: 'A', subject: 'Hindi & Sanskrit' },
      { teacherName: 'Rakesh Verma', standard: '4th', section: 'A', subject: 'Social Studies & Civics' },
      { teacherName: 'Rakesh Verma', standard: '3rd', section: 'A', subject: 'Social Studies & Civics' },
      { teacherName: 'Sunita Deshmukh', standard: '3rd', section: 'A', subject: 'Mathematics' },
      { teacherName: 'Pooja Sharma', standard: '2nd', section: 'A', subject: 'English Literature' },
      { teacherName: 'Anjali Saxena', standard: '1st', section: 'A', subject: 'Foundational Numeracy & Phonics' },
      { teacherName: 'Rashmi Varma', standard: 'UKG', section: 'A', subject: 'Foundational Numeracy & Phonics' },
      { teacherName: 'Geeta Menon', standard: 'LKG', section: 'A', subject: 'Foundational Numeracy & Phonics' },
      { teacherName: 'Kavita Pillai', standard: 'Nursery', section: 'A', subject: 'Foundational Numeracy & Phonics' },
      { teacherName: 'Manoj Tiwari', standard: '10th', section: 'A', subject: 'Physical Education & Sports' }
    ];

    for (const m of teacherMappings) {
      await prisma.teacherClassSubjectMapping.create({ data: m });
    }

    // 8. TIMETABLE ACROSS WEEKDAYS
    console.log('📅 8. Seeding Master Class Timetables...');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const standardPeriods = [
      { p: 1, start: '08:30', end: '09:15', sub: 'Mathematics', teacher: 'Dr. Rajesh Sharma', room: 'Room 301' },
      { p: 2, start: '09:15', end: '10:00', sub: 'Physics', teacher: 'Priya Patel', room: 'Physics Lab' },
      { p: 3, start: '10:00', end: '10:45', sub: 'Chemistry', teacher: 'Ananya Sen', room: 'Chemistry Lab' },
      { p: 4, start: '11:00', end: '11:45', sub: 'English Literature', teacher: 'Sneha Reddy', room: 'Room 301' },
      { p: 5, start: '12:45', end: '01:30', sub: 'Computer Science & AI', teacher: 'Arjun Nair', room: 'AI Lab' },
      { p: 6, start: '01:30', end: '02:15', sub: 'Physical Education & Sports', teacher: 'Manoj Tiwari', room: 'Sports Complex' }
    ];

    for (const d of days) {
      for (const item of standardPeriods) {
        await prisma.timetable.create({
          data: {
            standard: '10th',
            section: 'A',
            day: d,
            period: item.p,
            subject: item.sub,
            teacher: item.teacher,
            room: item.room,
            startTime: item.start,
            endTime: item.end
          }
        });
      }
    }

    // 9. SEED STUDENTS (5 to 10 students per class for all 13 classes)
    console.log('🎓 9. Seeding 5 to 7 Students for EVERY Class (Nursery to 10th)...');
    const firstNames = ['Aarav', 'Rahul', 'Ananya', 'Vihaan', 'Rohan', 'Kyra', 'Kabir', 'Ishita', 'Arnav', 'Saanvi', 'Aditya', 'Tanvi', 'Reyansh', 'Meera', 'Dhruv', 'Diya', 'Aryan', 'Kavya'];
    const lastNames = ['Sharma', 'Verma', 'Patel', 'Iyer', 'Sen', 'Reddy', 'Mehta', 'Nair', 'Gupta', 'Singh', 'Deshmukh', 'Saxena', 'Chopra', 'Malhotra', 'Bose'];

    const allStandards = ['10th', '9th', '8th', '7th', '6th', '5th', '4th', '3rd', '2nd', '1st', 'UKG', 'LKG', 'Nursery'];
    const allCreatedStudents = [];

    for (const std of allStandards) {
      const studentCountForClass = std === '10th' ? 7 : 6; // 6 to 7 students per class
      for (let sIdx = 0; sIdx < studentCountForClass; sIdx++) {
        let name, email, uid, roll;
        roll = String(sIdx + 1).padStart(2, '0');

        if (std === '10th' && sIdx === 0) {
          name = 'Aarav Sharma';
          email = 'aarav.sharma@qelvora.in';
          uid = aaravUser.id;
        } else if (std === '10th' && sIdx === 1) {
          name = 'Rahul Student';
          email = 'student@example.com';
          uid = studentUser.id;
        } else {
          const fn = firstNames[(allStandards.indexOf(std) * 2 + sIdx) % firstNames.length];
          const ln = lastNames[(allStandards.indexOf(std) * 3 + sIdx) % lastNames.length];
          name = `${fn} ${ln}`;
          email = `${fn.toLowerCase()}.${ln.toLowerCase()}.${std.toLowerCase()}@qelvora.in`;
          uid = null;
        }

        const parentFn = firstNames[(sIdx + 3) % firstNames.length];
        const parentLn = lastNames[(sIdx + 2) % lastNames.length];
        const parentName = `Mr. & Mrs. ${parentLn}`;
        const parentPhone = `+91 98765 ${String(10000 + (allStandards.indexOf(std) * 10) + sIdx).padStart(5, '0')}`;

        const stu = await prisma.student.create({
          data: {
            userId: uid,
            studentId: `STU-${std.replace(/\s+/g, '')}-A-${roll}`,
            name,
            email,
            standard: std,
            section: 'A',
            rollNumber: roll,
            parentName,
            parentPhone
          }
        });
        allCreatedStudents.push(stu);

        // 7 days attendance for each student
        const targetClass = createdClasses[`${std}-A`] || Object.values(createdClasses)[0];
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const dateStr = getDateDaysAgo(dayOffset);
          // Aarav Sharma is 100% present, others have realistic ~90% attendance
          const isAbsent = (std === '10th' && sIdx === 0) ? false : (sIdx + dayOffset) % 6 === 0;
          await prisma.studentAttendance.create({
            data: {
              date: dateStr,
              class: { connect: { id: targetClass.id } },
              studentName: name,
              rollNumber: roll,
              status: isAbsent ? 'Absent' : 'Present',
              markedTime: isAbsent ? '—' : '08:22 AM'
            }
          });
        }
      }
    }
    console.log(`✅ Seeded ${allCreatedStudents.length} students across all 13 institutional classes.`);

    // 10. TEACHER ATTENDANCE (Past 7 days + Today with Late & Leave)
    console.log('📋 10. Seeding Faculty Attendance Records (including Late and Leaves)...');
    const teacherRecords = Object.values(teacherMap);
    for (let i = 0; i < teacherRecords.length; i++) {
      const t = teacherRecords[i];
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dateStr = getDateDaysAgo(dayOffset);
        let status = 'Present';
        let markedTime = '08:20 AM';

        if (dayOffset === 0) {
          // Today's attendance
          if (t.name === 'Rakesh Verma' || t.name === 'Sneha Reddy') {
            status = 'Leave';
            markedTime = '—';
          } else if (t.name === 'Vikram Singh') {
            status = 'Present';
            markedTime = '08:52 AM'; // Late arrival!
          } else if (t.name === 'Sunita Deshmukh') {
            status = 'Present';
            markedTime = '08:48 AM'; // Late arrival!
          }
        }

        await prisma.teacherAttendance.create({
          data: {
            date: dateStr,
            teacherName: t.name,
            status,
            markedTime
          }
        });
      }
    }

    // 11. LIVE CLASS SESSIONS (Green, Gold, In-Progress, Late)
    console.log('🎥 11. Seeding Live Class Session Logs...');
    await prisma.classSession.createMany({
      data: [
        { standard: '10th', section: 'A', subject: 'Mathematics', teacher: 'Dr. Rajesh Sharma', status: 'completed', startTime: new Date(Date.now() - 4 * 3600000), endTime: new Date(Date.now() - 3 * 3600000) },
        { standard: '10th', section: 'A', subject: 'Physics', teacher: 'Priya Patel', status: 'completed', startTime: new Date(Date.now() - 3 * 3600000), endTime: new Date(Date.now() - 2 * 3600000) },
        { standard: '10th', section: 'A', subject: 'Computer Science & AI', teacher: 'Arjun Nair', status: 'in-progress', startTime: new Date(Date.now() - 25 * 60000), endTime: null },
        { standard: '9th', section: 'A', subject: 'Chemistry', teacher: 'Ananya Sen', status: 'in-progress', startTime: new Date(Date.now() - 15 * 60000), endTime: null },
        { standard: '8th', section: 'A', subject: 'Biology', teacher: 'Vikram Singh', status: 'completed', startTime: new Date(Date.now() - 2 * 3600000), endTime: new Date(Date.now() - 1 * 3600000) },
        { standard: '7th', section: 'A', subject: 'English Literature', teacher: 'Sneha Reddy', status: 'delayed', startTime: new Date(Date.now() - 50 * 60000), endTime: null }
      ]
    });

    // 12. LEAVE REQUESTS & SUBSTITUTES (Pending & Approved)
    console.log('📝 12. Seeding Faculty Leave Requests & Substitute Assignments...');
    await prisma.leaveRequest.createMany({
      data: [
        {
          applicantName: 'Rakesh Verma',
          applicantRole: 'Senior Educator',
          reason: 'Family urgent medical emergency in hometown. Requesting casual leave for 2 days.',
          startDate: getDateDaysAgo(0),
          endDate: getDateDaysAgo(-1),
          status: 'Pending'
        },
        {
          applicantName: 'Sneha Reddy',
          applicantRole: 'Senior Educator',
          reason: 'Participating in CBSE National Pedagogy and Language Assessment Conclave.',
          startDate: getDateDaysAgo(0),
          endDate: getDateDaysAgo(-2),
          status: 'Pending'
        },
        {
          applicantName: 'Ananya Sen',
          applicantRole: 'Senior Educator',
          reason: 'Attending Advanced Chemistry Laboratory Calibration Workshop.',
          startDate: getDateDaysAgo(2),
          endDate: getDateDaysAgo(1),
          status: 'Approved'
        },
        {
          applicantName: 'Manoj Tiwari',
          applicantRole: 'Senior Educator',
          reason: 'Inter-School District Athletic Meet coordination duty.',
          startDate: getDateDaysAgo(1),
          endDate: getDateDaysAgo(0),
          status: 'Approved'
        }
      ]
    });

    await prisma.substituteAssignment.createMany({
      data: [
        {
          date: getDateDaysAgo(0),
          period: 2,
          standard: '4th',
          section: 'A',
          absentTeacher: 'Rakesh Verma',
          substituteTeacher: 'Sunita Deshmukh',
          status: 'Assigned'
        },
        {
          date: getDateDaysAgo(0),
          period: 4,
          standard: '7th',
          section: 'A',
          absentTeacher: 'Sneha Reddy',
          substituteTeacher: 'Vikram Singh',
          status: 'Assigned'
        }
      ]
    });

    // 13. SAFE PICKUP AUTHORIZATIONS
    console.log('🛡️ 13. Seeding Safe Pickup Authorizations for Students...');
    const aaravStu = allCreatedStudents.find(s => s.name === 'Aarav Sharma');
    const rahulStu = allCreatedStudents.find(s => s.name === 'Rahul Student');

    if (aaravStu) {
      await prisma.pickupAuthorization.createMany({
        data: [
          {
            studentId: aaravStu.id,
            authorizedPersonName: 'Smt. Sharda Sharma (Grandmother)',
            authorizedPersonPhone: '+91 98765 99001',
            otpCode: '849201',
            status: 'Active',
            expiresAt: new Date(Date.now() + 48 * 3600000)
          },
          {
            studentId: aaravStu.id,
            authorizedPersonName: 'Mr. Alok Sharma (Father)',
            authorizedPersonPhone: '+91 98765 99002',
            otpCode: '517390',
            status: 'Active',
            expiresAt: new Date(Date.now() + 72 * 3600000)
          }
        ]
      });
    }

    if (rahulStu) {
      await prisma.pickupAuthorization.create({
        data: {
          studentId: rahulStu.id,
          authorizedPersonName: 'Mr. Vikram Sharma (Uncle)',
          authorizedPersonPhone: '+91 98765 99005',
          otpCode: '392814',
          status: 'Active',
          expiresAt: new Date(Date.now() + 24 * 3600000)
        }
      });
    }

    // 14. EXAMINATION SYSTEM: GRADE SCALES, EXAM TYPES, EXAMS, MARKS & RANKS
    console.log('📝 14. Seeding Examination Master System (FA1, FA2, Grade Scales, Marks & Ranks)...');
    const defaultGrades = [
      { grade: 'A+', minPercent: 90, maxPercent: 100, gradePoint: 10, remark: 'Outstanding', sequence: 1 },
      { grade: 'A',  minPercent: 80, maxPercent: 89.99, gradePoint: 9,  remark: 'Excellent', sequence: 2 },
      { grade: 'B+', minPercent: 70, maxPercent: 79.99, gradePoint: 8,  remark: 'Very Good', sequence: 3 },
      { grade: 'B',  minPercent: 60, maxPercent: 69.99, gradePoint: 7,  remark: 'Good', sequence: 4 },
      { grade: 'C',  minPercent: 50, maxPercent: 59.99, gradePoint: 6,  remark: 'Above Average', sequence: 5 },
      { grade: 'D',  minPercent: 35, maxPercent: 49.99, gradePoint: 5,  remark: 'Pass', sequence: 6 },
      { grade: 'F',  minPercent: 0,  maxPercent: 34.99, gradePoint: 0,  remark: 'Needs Improvement / Fail', sequence: 7 },
    ];

    for (const g of defaultGrades) {
      await prisma.gradeScale.create({ data: g });
    }

    // Exam Types: FA1, FA2, Mid Term, FA3, FA4, Final
    const examTypesData = [
      { name: 'FA1', fullMarks: 25, minPassMarks: 9, type: 'CCE', weightage: 10, sequence: 1, academicYear: '2026-2027' },
      { name: 'FA2', fullMarks: 25, minPassMarks: 9, type: 'CCE', weightage: 10, sequence: 2, academicYear: '2026-2027' },
      { name: 'Mid Term', fullMarks: 100, minPassMarks: 35, type: 'Term/Semester', weightage: 30, sequence: 3, academicYear: '2026-2027' },
      { name: 'FA3', fullMarks: 25, minPassMarks: 9, type: 'CCE', weightage: 10, sequence: 4, academicYear: '2026-2027' },
      { name: 'FA4', fullMarks: 25, minPassMarks: 9, type: 'CCE', weightage: 10, sequence: 5, academicYear: '2026-2027' },
      { name: 'Final', fullMarks: 100, minPassMarks: 35, type: 'Term/Semester', weightage: 30, sequence: 6, academicYear: '2026-2027' },
    ];

    const createdExamTypes = {};
    for (const et of examTypesData) {
      const record = await prisma.examType.create({ data: et });
      createdExamTypes[et.name] = record;
    }

    // Exam Names (Instances)
    const examNamesData = [
      { examTypeId: createdExamTypes['FA1'].id, name: 'Formative Assessment 1 (FA1) 2026-27', description: 'Formative Unit Evaluation 1', academicYear: '2026-2027', startDate: '2026-07-10', endDate: '2026-07-15', isPublished: true, isLocked: true },
      { examTypeId: createdExamTypes['FA2'].id, name: 'Formative Assessment 2 (FA2) 2026-27', description: 'Formative Unit Evaluation 2', academicYear: '2026-2027', startDate: '2026-08-20', endDate: '2026-08-25', isPublished: true, isLocked: true },
      { examTypeId: createdExamTypes['Mid Term'].id, name: 'Mid Term Examination 2026-27', description: 'Comprehensive Mid-Term Summative Assessment', academicYear: '2026-2027', startDate: '2026-09-15', endDate: '2026-09-25', isPublished: true, isLocked: false },
      { examTypeId: createdExamTypes['Final'].id, name: 'Annual Final Examination 2026-27', description: 'Final Comprehensive Year-End Board Simulation', academicYear: '2026-2027', startDate: '2027-02-15', endDate: '2027-02-28', isPublished: false, isLocked: false },
    ];

    const createdExamNames = {};
    for (const en of examNamesData) {
      const record = await prisma.examName.create({ data: en });
      createdExamNames[en.name] = record;
    }

    // CCE Skills
    const defaultSkills = [
      { skillName: 'Communication & Expression', category: 'Life Skills', description: 'Clarity, speech articulation, and active listening', sequence: 1 },
      { skillName: 'Creativity & Critical Thinking', category: 'Life Skills', description: 'Original problem solving and innovation', sequence: 2 },
      { skillName: 'Discipline & Punctuality', category: 'Attitudes & Values', description: 'Adherence to campus code and consistency', sequence: 3 },
      { skillName: 'Teamwork & Collaboration', category: 'Attitudes & Values', description: 'Empathy, peer cooperation, and group activities', sequence: 4 },
      { skillName: 'Visual & Performing Arts', category: 'Co-Scholastic', description: 'Participation in sketching, music, and dramatics', sequence: 5 },
      { skillName: 'Physical Education & Sports', category: 'Health & Fitness', description: 'Athletic stamina, motor coordination, and sportsmanship', sequence: 6 },
    ];

    for (const s of defaultSkills) {
      await prisma.cCESkill.create({ data: s });
    }

    // CCE Test Types
    const defaultTestTypes = [
      { testTypeName: 'Written Class Test', description: 'Pen-and-paper structured test paper', sequence: 1 },
      { testTypeName: 'Oral / Viva Voce', description: 'Verbal recitation and interview questions', sequence: 2 },
      { testTypeName: 'Laboratory Practical', description: 'Hands-on scientific experiment verification', sequence: 3 },
      { testTypeName: 'Project / Exhibition', description: 'Research dossier, model, or group chart', sequence: 4 },
      { testTypeName: 'Classroom Assignment', description: 'Daily homework workbook evaluation', sequence: 5 },
    ];

    for (const tt of defaultTestTypes) {
      await prisma.cCETestType.create({ data: tt });
    }

    // Exam Weightages
    for (const et of examTypesData) {
      await prisma.examWeightage.create({
        data: {
          academicYear: et.academicYear,
          examTypeName: et.name,
          weightPercent: et.weightage
        }
      });
    }

    // Allocations and Marks for FA1 and FA2 (across all classes and subjects)
    console.log('📊 Seeding Allocations & Marks for FA1 and FA2 (with Distinct Class Rankings)...');
    const examInstancesToSeed = [
      { name: 'Formative Assessment 1 (FA1) 2026-27', type: 'FA1', maxMarks: 25, minMarks: 9 },
      { name: 'Formative Assessment 2 (FA2) 2026-27', type: 'FA2', maxMarks: 25, minMarks: 9 }
    ];

    const standardSubjectsMap = {
      '10th': ['Mathematics', 'Physics', 'Chemistry', 'English Literature', 'Computer Science & AI'],
      '9th': ['Mathematics', 'Physics', 'Chemistry', 'English Literature', 'Biology'],
      '8th': ['Mathematics', 'Biology', 'English Literature', 'Social Studies & Civics', 'Hindi & Sanskrit'],
      '7th': ['Mathematics', 'Environmental Science', 'English Literature', 'Social Studies & Civics', 'Hindi & Sanskrit'],
      '6th': ['Mathematics', 'Computer Science & AI', 'English Literature', 'Social Studies & Civics', 'Hindi & Sanskrit'],
      '5th': ['Mathematics', 'Computer Science & AI', 'English Literature', 'Hindi & Sanskrit', 'Environmental Science'],
      '4th': ['Mathematics', 'Social Studies & Civics', 'English Literature', 'Hindi & Sanskrit', 'Environmental Science'],
      '3rd': ['Mathematics', 'Social Studies & Civics', 'English Literature', 'Hindi & Sanskrit', 'Environmental Science'],
      '2nd': ['Mathematics', 'English Literature', 'Hindi & Sanskrit', 'Foundational Numeracy & Phonics'],
      '1st': ['Mathematics', 'English Literature', 'Foundational Numeracy & Phonics'],
      'UKG': ['Foundational Numeracy & Phonics', 'English Literature'],
      'LKG': ['Foundational Numeracy & Phonics', 'English Literature'],
      'Nursery': ['Foundational Numeracy & Phonics']
    };

    // Rank Score Profiles (out of 25 for FA1/FA2):
    // Rank 1: ~24 (96%)
    // Rank 2: ~22 (88%)
    // Rank 3: ~20 (80%)
    // Rank 4: ~18 (72%)
    // Rank 5: ~15 (60%)
    // Rank 6: ~13 (52%)
    // Rank 7: ~7 (28% - Fail in 1 subject for promotion review)
    const rankScoreBases = [24, 22, 20, 18, 15, 13, 7];

    for (const examItem of examInstancesToSeed) {
      const examNameRecord = createdExamNames[examItem.name];
      if (!examNameRecord) continue;

      for (const std of allStandards) {
        const subjectsForStd = standardSubjectsMap[std] || ['Mathematics', 'English Literature'];
        const studentsInClass = allCreatedStudents.filter(s => s.standard === std && s.section === 'A');

        // Create Allocations
        for (let subIdx = 0; subIdx < subjectsForStd.length; subIdx++) {
          const subName = subjectsForStd[subIdx];
          await prisma.examAllocation.create({
            data: {
              examNameId: examNameRecord.id,
              standard: std,
              section: 'A',
              subjectName: subName,
              teacherName: 'Dr. Rajesh Sharma',
              employeeId: 'EMP001',
              sequence: subIdx + 1
            }
          });
        }

        // Enter Marks for Each Student
        for (let sIdx = 0; sIdx < studentsInClass.length; sIdx++) {
          const stu = studentsInClass[sIdx];
          const baseScore = rankScoreBases[sIdx] || 15;

          for (let subIdx = 0; subIdx < subjectsForStd.length; subIdx++) {
            const subName = subjectsForStd[subIdx];
            // Slight jitter per subject so scores look natural
            let obtained = baseScore + (subIdx % 2 === 0 ? 0 : 1);
            if (sIdx === 0) obtained = Math.min(25, 24 + (subIdx % 2)); // Rank 1 gets 24 or 25
            if (sIdx === 6 && subIdx === 0) obtained = 6; // Fail mark in one subject for remediation
            obtained = Math.max(0, Math.min(examItem.maxMarks, obtained));

            const isPass = obtained >= examItem.minMarks;
            const pct = (obtained / examItem.maxMarks) * 100;
            const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 35 ? 'D' : 'F';
            const gradePoint = pct >= 90 ? 10 : pct >= 80 ? 9 : pct >= 70 ? 8 : pct >= 60 ? 7 : pct >= 50 ? 6 : pct >= 35 ? 5 : 0;

            const remarks = sIdx === 0 ? 'Outstanding mastery & 1st Rank performance' :
                            sIdx === 1 ? 'Excellent analytical understanding & 2nd Rank' :
                            sIdx === 2 ? 'Commendable effort, strong conceptual grasp' :
                            sIdx === 6 ? 'Needs remedial guidance in fundamentals' : 'Consistent performance';

            await prisma.examMarks.create({
              data: {
                examNameId: examNameRecord.id,
                examTypeId: examNameRecord.examTypeId,
                studentId: stu.id,
                rollNumber: stu.rollNumber,
                studentName: stu.name,
                standard: stu.standard,
                section: stu.section,
                subjectName: subName,
                maxMarks: examItem.maxMarks,
                minMarks: examItem.minMarks,
                marksObtained: obtained,
                isAbsent: false,
                isPassed: isPass,
                grade,
                gradePoint,
                remarks,
                enteredBy: 'Faculty Examination Board'
              }
            });
          }

          // Also seed CCE Grades for this student (once in Term 1)
          if (examItem.type === 'FA1') {
            for (const skill of defaultSkills) {
              await prisma.studentCCEGrade.create({
                data: {
                  studentId: stu.id,
                  studentName: stu.name,
                  standard: stu.standard,
                  section: stu.section,
                  academicYear: '2026-2027',
                  term: 'Term 1',
                  skillId: skill.skillName,
                  skillName: skill.skillName,
                  grade: sIdx === 0 ? 'A+' : sIdx === 1 ? 'A' : 'B+',
                  remarks: sIdx === 0 ? 'Exemplary conduct and enthusiastic participation' : 'Positive attitude and peer cooperation',
                  assessedBy: 'Dr. Rajesh Sharma'
                }
              });
            }
          }
        }
      }
    }
    console.log('✅ Exam Allocations, FA1 & FA2 Marks, and Rankings seeded across all classes.');

    // 15. FEES MANAGEMENT INITIALIZATION & REALISTIC DATA
    console.log('💳 15. Synchronizing Fees Management Data (feesData.json)...');
    let feesData = {
      settings: {
        activeAcademicYear: '2026-2027',
        academicYears: ['2026-2027', '2025-2026', '2024-2025'],
        receiptPrefix: 'FEE/2026-27/',
        nextReceiptNumber: 1100,
        lateFineRule: {
          enabled: true,
          type: 'per_day',
          amount: 25,
          gracePeriodDays: 5,
          maxFineCap: 1500
        },
        schoolDetails: {
          institutionName: 'Qelvora School CRM',
          affiliationNo: 'CBSE/AFF/2026/98210',
          schoolCode: 'INK-KA-56001',
          address: 'Knowledge Park, Outer Ring Road, Bengaluru, Karnataka - 560103',
          phone: '+91 80 2345 6789',
          email: 'accounts@qelvora.in',
          receiptTerms: '1. Fees once paid are non-refundable unless specified under Security Deposit.\n2. Retain receipt for CBSE verification and tax claims.\n3. Defaulter notices are issued 15 days post due-date.'
        },
        paymentModes: [
          { id: 'cash', name: 'Cash', enabled: true },
          { id: 'upi', name: 'UPI / QR Code', enabled: true },
          { id: 'card', name: 'Debit / Credit Card', enabled: true },
          { id: 'cheque', name: 'Cheque / DD', enabled: true },
          { id: 'bank_transfer', name: 'Net Banking / NEFT', enabled: true }
        ]
      },
      heads: [
        { id: 'fh-tuition', name: 'Tuition Fee', shortCode: 'TUIT', frequency: 'Monthly', mandatory: true, appliesTo: 'All', reissuable: false, refundable: false, status: 'Active' },
        { id: 'fh-annual', name: 'Annual Development Fee', shortCode: 'ADF', frequency: 'One-time', mandatory: true, appliesTo: 'All', reissuable: false, refundable: false, status: 'Active' },
        { id: 'fh-lab', name: 'Computer & AI Lab Fee', shortCode: 'LAB', frequency: 'Term-wise', mandatory: true, appliesTo: 'All', reissuable: false, refundable: false, status: 'Active' },
        { id: 'fh-exam', name: 'Examination & Assessment Fee', shortCode: 'EXAM', frequency: 'Term-wise', mandatory: true, appliesTo: 'All', reissuable: false, refundable: false, status: 'Active' },
        { id: 'fh-sports', name: 'Sports & Co-curricular Fee', shortCode: 'SPRT', frequency: 'One-time', mandatory: true, appliesTo: 'All', reissuable: false, refundable: false, status: 'Active' }
      ],
      quotas: [
        { id: 'q-general', name: 'General', description: 'Standard quota for general admissions without concession', concessionType: 'none', concessionValue: 0, status: 'Active' },
        { id: 'q-rte', name: 'RTE (Right to Education)', description: 'Government subsidized RTE quota with 100% tuition waiver', concessionType: 'percentage', concessionValue: 100, status: 'Active' },
        { id: 'q-staff', name: 'Staff Ward', description: 'Children of teaching and non-teaching academy staff (50% concession)', concessionType: 'percentage', concessionValue: 50, status: 'Active' },
        { id: 'q-sibling', name: 'Sibling Concession', description: 'Applicable when 2 or more siblings are concurrently enrolled (15% concession)', concessionType: 'percentage', concessionValue: 15, status: 'Active' },
        { id: 'q-merit', name: 'Merit Scholarship', description: 'Merit scholars scoring 90%+ in academic evaluation (25% concession)', concessionType: 'percentage', concessionValue: 25, status: 'Active' }
      ],
      structures: {},
      studentQuotas: {},
      studentAdjustments: {},
      receipts: []
    };

    // Build default fee structures for all 13 standards
    const year = '2026-2027';
    for (const std of allStandards) {
      const isSenior = ['9th', '10th'].includes(std);
      const isMiddle = ['6th', '7th', '8th'].includes(std);
      const baseTuition = isSenior ? 4800 : isMiddle ? 3800 : 2800;
      const baseAnnual = isSenior ? 14000 : isMiddle ? 11000 : 8500;
      const baseLab = isSenior ? 3200 : isMiddle ? 2200 : 1500;
      const baseExam = isSenior ? 2400 : 1800;
      const baseSports = 2500;

      for (const q of feesData.quotas) {
        const key = `${year}_${std}_${q.id}`;
        let tuitAmt = baseTuition;
        if (q.concessionType === 'percentage') {
          tuitAmt = Math.round(baseTuition * (1 - q.concessionValue / 100));
        }

        feesData.structures[key] = {
          academicYear: year,
          standard: std,
          quotaId: q.id,
          quotaName: q.name,
          updatedAt: new Date().toISOString(),
          updatedBy: 'System Administrator',
          installmentsEnabled: true,
          installments: [
            { name: 'Term 1 (April)', dueDate: '2026-04-15', percentage: 40 },
            { name: 'Term 2 (August)', dueDate: '2026-08-15', percentage: 35 },
            { name: 'Term 3 (December)', dueDate: '2026-12-15', percentage: 25 }
          ],
          items: [
            { headId: 'fh-tuition', headName: 'Tuition Fee', frequency: 'Monthly', amount: tuitAmt, billedMonths: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'], dueDate: '2026-04-10', enabled: true },
            { headId: 'fh-annual', headName: 'Annual Development Fee', frequency: 'One-time', amount: baseAnnual, dueDate: '2026-05-15', enabled: true },
            { headId: 'fh-lab', headName: 'Computer & AI Lab Fee', frequency: 'Term-wise', amount: baseLab, dueDate: '2026-06-15', enabled: true },
            { headId: 'fh-exam', headName: 'Examination & Assessment Fee', frequency: 'Term-wise', amount: baseExam, dueDate: '2026-09-15', enabled: true },
            { headId: 'fh-sports', headName: 'Sports & Co-curricular Fee', frequency: 'One-time', amount: baseSports, dueDate: '2026-07-15', enabled: true }
          ]
        };
      }
    }

    // Assign quotas, adjustments, and receipts across students
    let receiptCounter = 1001;
    for (const stu of allCreatedStudents) {
      // Determine Quota
      let assignedQuotaId = 'q-general';
      if (stu.name === 'Aarav Sharma') {
        assignedQuotaId = 'q-merit'; // 25% Merit Scholarship
      } else if (stu.name === 'Rahul Student') {
        assignedQuotaId = 'q-staff'; // 50% Staff Ward
      } else if (stu.rollNumber === '01') {
        assignedQuotaId = 'q-merit'; // Top ranker gets merit scholarship
      } else if (stu.rollNumber === '04') {
        assignedQuotaId = 'q-sibling';
      }

      feesData.studentQuotas[stu.id] = {
        quotaId: assignedQuotaId,
        assignedAt: '2026-04-01T09:00:00.000Z',
        assignedBy: 'System Academic Registrar'
      };

      // Calculate annual payable for this student
      const structKey = `${year}_${stu.standard}_${assignedQuotaId}`;
      const structure = feesData.structures[structKey] || feesData.structures[`${year}_${stu.standard}_q-general`];
      let annualPayable = 0;
      structure.items.forEach(it => {
        if (!it.enabled) return;
        if (it.frequency === 'Monthly') annualPayable += (it.amount * 12);
        else if (it.frequency === 'Term-wise') annualPayable += (it.amount * 3);
        else annualPayable += it.amount;
      });

      // Previous Year Balance for a few students
      if (stu.rollNumber === '06') {
        feesData.studentAdjustments[`${stu.id}_${year}`] = [
          {
            id: 'adj-prev-1',
            type: 'previous_balance',
            headName: 'Previous Year Balance (2025-2026)',
            value: 4500,
            reason: 'Outstanding uncollected fee from Term 3 of Grade 9',
            createdAt: '2026-04-01T00:00:00.000Z'
          }
        ];
      }

      // Generate Receipts
      // Roll 01 (Rank 1 / Aarav) & Roll 02 (Rahul): FULL PAYMENT or partial payment
      if (stu.name === 'Aarav Sharma' || stu.rollNumber === '01') {
        // Paid Term 1 and Term 2
        const p1 = Math.round(annualPayable * 0.5);
        const p2 = Math.round(annualPayable * 0.5);
        feesData.receipts.push({
          id: `REC-${receiptCounter}`,
          receiptNumber: `FEE/2026-27/${String(receiptCounter).padStart(5, '0')}`,
          academicYear: year,
          studentId: stu.id,
          studentIdCode: stu.studentId,
          studentName: stu.name,
          standard: stu.standard,
          section: stu.section,
          rollNumber: stu.rollNumber,
          quotaId: assignedQuotaId,
          paymentDate: '2026-04-12',
          paidAmount: p1,
          paymentMode: 'Net Banking / NEFT',
          transactionRef: `NEFT-HDFC-${receiptCounter}981`,
          status: 'Active',
          collectedBy: 'Manoj Verma (Accounts Officer)',
          remarks: 'Term 1 advance clearance'
        });
        receiptCounter++;

        feesData.receipts.push({
          id: `REC-${receiptCounter}`,
          receiptNumber: `FEE/2026-27/${String(receiptCounter).padStart(5, '0')}`,
          academicYear: year,
          studentId: stu.id,
          studentIdCode: stu.studentId,
          studentName: stu.name,
          standard: stu.standard,
          section: stu.section,
          rollNumber: stu.rollNumber,
          quotaId: assignedQuotaId,
          paymentDate: '2026-08-14',
          paidAmount: p2,
          paymentMode: 'UPI / QR Code',
          transactionRef: `UPI-OKAXIS-${receiptCounter}412`,
          status: 'Active',
          collectedBy: 'Manoj Verma (Accounts Officer)',
          remarks: 'Term 2 balance clearance'
        });
        receiptCounter++;
      } else if (stu.rollNumber === '02' || stu.rollNumber === '03') {
        // Partial Payment (Term 1 only)
        const p1 = Math.round(annualPayable * 0.4);
        feesData.receipts.push({
          id: `REC-${receiptCounter}`,
          receiptNumber: `FEE/2026-27/${String(receiptCounter).padStart(5, '0')}`,
          academicYear: year,
          studentId: stu.id,
          studentIdCode: stu.studentId,
          studentName: stu.name,
          standard: stu.standard,
          section: stu.section,
          rollNumber: stu.rollNumber,
          quotaId: assignedQuotaId,
          paymentDate: '2026-04-18',
          paidAmount: p1,
          paymentMode: 'Debit / Credit Card',
          transactionRef: `CARD-POS-${receiptCounter}198`,
          status: 'Active',
          collectedBy: 'Manoj Verma (Accounts Officer)',
          remarks: 'Term 1 installment payment'
        });
        receiptCounter++;
      }
      // Roll 04, 05, 06, 07: Left as Defaulters / Overdue with Dues!
    }

    feesData.settings.nextReceiptNumber = receiptCounter + 1;
    fs.writeFileSync(FEES_DATA_PATH, JSON.stringify(feesData, null, 2), 'utf-8');
    console.log(`✅ Fees Store updated: ${feesData.receipts.length} receipts issued, quotas assigned, and dues set.`);

    console.log('\n🎉 ========================================================');
    console.log('🌟 COMPREHENSIVE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('   - 13 Institutional Classes (Nursery to 10th)');
    console.log(`   - ${teacherConfigs.length} Faculty Members & Dedicated Class Teachers`);
    console.log(`   - ${allCreatedStudents.length} Students (5-7 per class)`);
    console.log('   - FA1 & FA2 Marks with Distinct 1st, 2nd, 3rd Class Rankings');
    console.log('   - Pending & Approved Faculty Leaves with Substitutes');
    console.log('   - Fees Structures, Receipts, Quotas & Outstanding Defaulters');
    console.log('========================================================\n');

  } catch (err) {
    console.error('❌ Comprehensive Seeding failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && process.argv[1].includes('seedMasterComprehensiveData.js')) {
  seedCompletePlatform()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal execution error:', err);
      process.exit(1);
    });
}
