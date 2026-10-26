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
  console.log('   CLASSES: LKG & UKG to 12th STANDARD (12-14 STUDENTS EACH)');
  console.log('   UNIQUE SUBJECT CODES PER CLASS, CLASS TEACHERS & QUOTAS');
  console.log('🚀 ========================================================\n');

  try {
    // 1. CLEAR EXISTING DATA SAFELY IN REVERSE FK ORDER
    console.log('🧹 1. Clearing existing records from database...');
    await prisma.studentCCEGrade.deleteMany();
    await prisma.examMarks.deleteMany();
    await prisma.examAllocation.deleteMany();
    await prisma.examWeightage.deleteMany();
    await prisma.examName.deleteMany();
    await prisma.examType.deleteMany();
    await prisma.gradeScale.deleteMany();
    await prisma.cCETestType.deleteMany();
    await prisma.cCESkill.deleteMany();

    await prisma.attendanceNotificationLog.deleteMany();
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
    console.log('✅ Existing records cleared.');

    // 2. MASTER SCHOOL SETTINGS
    console.log('⚙️ 2. Seeding Master School Configuration...');
    const allStandardsList = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
    await prisma.schoolSettings.create({
      data: {
        schoolName: 'Qelvora School CRM',
        logoSubtext: 'Empowering Academic Excellence & Safe Campus Identity',
        schoolType: 'Co-Educational Senior Secondary',
        board: 'CBSE',
        boardsList: ['CBSE', 'ICSE', 'STATE', 'IGCSE', 'IB'],
        standardsList: allStandardsList,
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

    // 18 Teachers covering all classes from Nursery to 12th
    const teacherConfigs = [
      { empId: 'EMP001', name: 'Dr. Rajesh Sharma', email: 'rajesh.sharma@qelvora.in', dept: 'Mathematics', role: 'School Principal', qual: 'Ph.D. in Pure Mathematics', desig: 'Principal & Senior Head', std: '10th', sec: 'A', uId: principalUser.id },
      { empId: 'EMP002', name: 'Priya Patel', email: 'priya.patel@qelvora.in', dept: 'Physics', role: 'Teacher', qual: 'M.Sc. Physics (Gold Medalist)', desig: 'Senior Physics Faculty', std: '12th', sec: 'A' },
      { empId: 'EMP003', name: 'Ananya Sen', email: 'ananya.sen@qelvora.in', dept: 'Chemistry', role: 'Senior Educator', qual: 'M.Sc. Organic Chemistry', desig: 'Senior Chemistry Educator', std: '12th', sec: 'B' },
      { empId: 'EMP004', name: 'Vikram Singh', email: 'vikram.singh@qelvora.in', dept: 'Biology', role: 'Senior Educator', qual: 'M.Sc. Zoology & Genetics', desig: 'Senior Biology Educator', std: '11th', sec: 'A' },
      { empId: 'EMP005', name: 'Sneha Reddy', email: 'sneha.reddy@qelvora.in', dept: 'English Literature', role: 'Senior Educator', qual: 'M.A., M.Phil. English', desig: 'Senior Humanities Educator', std: '11th', sec: 'B' },
      { empId: 'EMP006', name: 'Arjun Nair', email: 'arjun.nair@qelvora.in', dept: 'Computer Science & AI', role: 'Lab Coordinator', qual: 'M.Tech Computer Science', desig: 'Lead AI & CS Coordinator', std: '9th', sec: 'A' },
      { empId: 'EMP007', name: 'Meenakshi Sundaram', email: 'meenakshi.s@qelvora.in', dept: 'Hindi & Sanskrit', role: 'Senior Educator', qual: 'M.A. Hindi Literature, B.Ed.', desig: 'Language Department Head', std: '8th', sec: 'A' },
      { empId: 'EMP008', name: 'Rakesh Verma', email: 'rakesh.v@qelvora.in', dept: 'Social Science', role: 'Senior Educator', qual: 'M.A. History & Civics', desig: 'Social Studies Lead', std: '7th', sec: 'A' },
      { empId: 'EMP009', name: 'Sunita Deshmukh', email: 'sunita.d@qelvora.in', dept: 'Primary Mathematics', role: 'Assistant Teacher', qual: 'B.Sc. Mathematics, B.Ed.', desig: 'Primary School Teacher', std: '6th', sec: 'A' },
      { empId: 'EMP010', name: 'Pooja Sharma', email: 'pooja.s@qelvora.in', dept: 'General Science', role: 'Assistant Teacher', qual: 'B.Sc. Chemistry, B.Ed.', desig: 'Primary Science Lead', std: '5th', sec: 'A' },
      { empId: 'EMP011', name: 'Anjali Saxena', email: 'anjali.s@qelvora.in', dept: 'English Language', role: 'Assistant Teacher', qual: 'B.Ed. Elementary Education', desig: 'Primary English Educator', std: '4th', sec: 'A' },
      { empId: 'EMP012', name: 'Kavita Pillai', email: 'kavita.p@qelvora.in', dept: 'Mathematics', role: 'Assistant Teacher', qual: 'B.Sc. Mathematics, Montessori Dip.', desig: 'Primary Math Educator', std: '3rd', sec: 'A' },
      { empId: 'EMP013', name: 'Rashmi Varma', email: 'rashmi.v@qelvora.in', dept: 'Foundational Learning', role: 'Assistant Teacher', qual: 'B.A. English, ECCEd', desig: 'Foundational Educator', std: '2nd', sec: 'A' },
      { empId: 'EMP014', name: 'Geeta Menon', email: 'geeta.m@qelvora.in', dept: 'Foundational Numeracy', role: 'Assistant Teacher', qual: 'B.Sc. Home Science, B.Ed.', desig: 'Foundational Numeracy Lead', std: '1st', sec: 'A' },
      { empId: 'EMP015', name: 'Deepika Joshi', email: 'deepika.j@qelvora.in', dept: 'Kindergarten Education', role: 'Assistant Teacher', qual: 'Diploma in Early Child Care (ECCEd)', desig: 'UKG Class Teacher', std: 'UKG', sec: 'A' },
      { empId: 'EMP016', name: 'Shalini Nair', email: 'shalini.n@qelvora.in', dept: 'Early Childhood Education', role: 'Assistant Teacher', qual: 'Montessori Certified Instructor', desig: 'LKG Class Teacher', std: 'LKG', sec: 'A' },
      { empId: 'EMP017', name: 'Swati Kulkarni', email: 'swati.k@qelvora.in', dept: 'Pre-Primary Playgroup', role: 'Assistant Teacher', qual: 'Child Psychology Specialist', desig: 'Nursery Lead Educator', std: 'Nursery', sec: 'A' },
      { empId: 'EMP018', name: 'Manoj Tiwari', email: 'manoj.t@qelvora.in', dept: 'Physical Education & Sports', role: 'Senior Educator', qual: 'M.P.Ed. Sports Sciences', desig: 'Athletic Director', std: '10th', sec: 'B' }
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
    console.log(`✅ Seeded ${teacherConfigs.length} faculty members with user accounts.`);

    // Sample Student / Parent Accounts
    const studentUser = await prisma.user.create({
      data: { name: 'Rahul Student', email: 'student@example.com', password_hash: defaultPasswordHash, role: 'student', skip_face: true, skip_location: true }
    });
    const aaravUser = await prisma.user.create({
      data: { name: 'Aarav Sharma', email: 'aarav.sharma@qelvora.in', password_hash: defaultPasswordHash, role: 'student', skip_face: true, skip_location: true }
    });
    const parentUser = await prisma.user.create({
      data: { name: 'Mr. & Mrs. Sharma', email: 'parent@example.com', password_hash: defaultPasswordHash, role: 'parent', skip_face: true, skip_location: true }
    });

    // 5. INSTITUTIONAL CLASSES (LKG, UKG, 1st to 12th + Nursery)
    console.log('🏫 5. Seeding Institutional Classes (LKG, UKG, 1st-12th & Nursery) with Class Teachers...');
    const classStandards = [
      { std: '12th', sec: 'A', room: 'Senior Wing Room 401', teacher: 'Priya Patel' },
      { std: '12th', sec: 'B', room: 'Senior Wing Room 402', teacher: 'Ananya Sen' },
      { std: '11th', sec: 'A', room: 'Senior Wing Room 303', teacher: 'Vikram Singh' },
      { std: '11th', sec: 'B', room: 'Senior Wing Room 304', teacher: 'Sneha Reddy' },
      { std: '10th', sec: 'A', room: 'Room 301', teacher: 'Dr. Rajesh Sharma' },
      { std: '10th', sec: 'B', room: 'Room 302', teacher: 'Manoj Tiwari' },
      { std: '9th', sec: 'A', room: 'Room 201', teacher: 'Arjun Nair' },
      { std: '8th', sec: 'A', room: 'Room 101', teacher: 'Meenakshi Sundaram' },
      { std: '7th', sec: 'A', room: 'Room 102', teacher: 'Rakesh Verma' },
      { std: '6th', sec: 'A', room: 'Room 103', teacher: 'Sunita Deshmukh' },
      { std: '5th', sec: 'A', room: 'Room 104', teacher: 'Pooja Sharma' },
      { std: '4th', sec: 'A', room: 'Room 105', teacher: 'Anjali Saxena' },
      { std: '3rd', sec: 'A', room: 'Room 106', teacher: 'Kavita Pillai' },
      { std: '2nd', sec: 'A', room: 'Room 002', teacher: 'Rashmi Varma' },
      { std: '1st', sec: 'A', room: 'Room 001', teacher: 'Geeta Menon' },
      { std: 'UKG', sec: 'A', room: 'Kindergarten Hall 2', teacher: 'Deepika Joshi' },
      { std: 'LKG', sec: 'A', room: 'Kindergarten Hall 1', teacher: 'Shalini Nair' },
      { std: 'Nursery', sec: 'A', room: 'Playgroup Activity Hall', teacher: 'Swati Kulkarni' }
    ];

    const createdClasses = {};
    for (const c of classStandards) {
      const ctTeacher = teacherMap[c.teacher];
      const cls = await prisma.class.create({
        data: {
          standard: c.std,
          section: c.sec,
          board: 'CBSE',
          roomNumber: c.room,
          classTeacherId: ctTeacher ? ctTeacher.id : null,
          classTeacherName: ctTeacher ? ctTeacher.name : c.teacher,
          strength: 13
        }
      });
      createdClasses[`${c.std}-${c.sec}`] = cls;
    }
    console.log(`✅ Seeded ${classStandards.length} institutional classes with designated class teachers.`);

    // 6. SUBJECTS WITH DISTINCT CLASS CODES & TEACHER MAPPINGS
    console.log('📚 6. Seeding Subjects with Standard-Specific Codes & Faculty Mappings...');
    const classSubjectsConfig = {
      '12th-A': [
        { name: 'English Core', code: 'ENG-12S', type: 'Core', weeklyHours: 5, teacher: 'Sneha Reddy' },
        { name: 'Physics', code: 'PHY-12', type: 'Core', weeklyHours: 6, teacher: 'Priya Patel' },
        { name: 'Chemistry', code: 'CHE-12', type: 'Core', weeklyHours: 6, teacher: 'Ananya Sen' },
        { name: 'Mathematics', code: 'MTH-12', type: 'Core', weeklyHours: 6, teacher: 'Dr. Rajesh Sharma' },
        { name: 'Biology', code: 'BIO-12', type: 'Elective', weeklyHours: 5, teacher: 'Vikram Singh' },
        { name: 'Computer Science', code: 'CSC-12', type: 'Elective', weeklyHours: 5, teacher: 'Arjun Nair' }
      ],
      '12th-B': [
        { name: 'English Core', code: 'ENG-12C', type: 'Core', weeklyHours: 5, teacher: 'Sneha Reddy' },
        { name: 'Accountancy', code: 'ACC-12', type: 'Core', weeklyHours: 6, teacher: 'Sneha Reddy' },
        { name: 'Business Studies', code: 'BST-12', type: 'Core', weeklyHours: 6, teacher: 'Ananya Sen' },
        { name: 'Economics', code: 'ECO-12', type: 'Core', weeklyHours: 6, teacher: 'Ananya Sen' },
        { name: 'Applied Mathematics', code: 'MTH-12C', type: 'Elective', weeklyHours: 5, teacher: 'Dr. Rajesh Sharma' }
      ],
      '11th-A': [
        { name: 'English Core', code: 'ENG-11S', type: 'Core', weeklyHours: 5, teacher: 'Sneha Reddy' },
        { name: 'Physics', code: 'PHY-11', type: 'Core', weeklyHours: 6, teacher: 'Priya Patel' },
        { name: 'Chemistry', code: 'CHE-11', type: 'Core', weeklyHours: 6, teacher: 'Ananya Sen' },
        { name: 'Mathematics', code: 'MTH-11', type: 'Core', weeklyHours: 6, teacher: 'Dr. Rajesh Sharma' },
        { name: 'Biology', code: 'BIO-11', type: 'Elective', weeklyHours: 5, teacher: 'Vikram Singh' },
        { name: 'Computer Science', code: 'CSC-11', type: 'Elective', weeklyHours: 5, teacher: 'Arjun Nair' }
      ],
      '11th-B': [
        { name: 'English Core', code: 'ENG-11C', type: 'Core', weeklyHours: 5, teacher: 'Sneha Reddy' },
        { name: 'Accountancy', code: 'ACC-11', type: 'Core', weeklyHours: 6, teacher: 'Sneha Reddy' },
        { name: 'Business Studies', code: 'BST-11', type: 'Core', weeklyHours: 6, teacher: 'Ananya Sen' },
        { name: 'Economics', code: 'ECO-11', type: 'Core', weeklyHours: 6, teacher: 'Ananya Sen' },
        { name: 'Applied Mathematics', code: 'MTH-11C', type: 'Elective', weeklyHours: 5, teacher: 'Dr. Rajesh Sharma' }
      ],
      '10th-A': [
        { name: 'English Language & Lit', code: 'ENG-10', type: 'Core', weeklyHours: 5, teacher: 'Sneha Reddy' },
        { name: 'Mathematics', code: 'MTH-10', type: 'Core', weeklyHours: 6, teacher: 'Dr. Rajesh Sharma' },
        { name: 'Science', code: 'SCI-10', type: 'Core', weeklyHours: 6, teacher: 'Priya Patel' },
        { name: 'Social Science', code: 'SST-10', type: 'Core', weeklyHours: 5, teacher: 'Rakesh Verma' },
        { name: 'Hindi Course A', code: 'HND-10', type: 'Core', weeklyHours: 4, teacher: 'Meenakshi Sundaram' },
        { name: 'Information Technology', code: 'IT-10', type: 'Skill', weeklyHours: 3, teacher: 'Arjun Nair' }
      ],
      '10th-B': [
        { name: 'English Language & Lit', code: 'ENG-10B', type: 'Core', weeklyHours: 5, teacher: 'Sneha Reddy' },
        { name: 'Mathematics', code: 'MTH-10B', type: 'Core', weeklyHours: 6, teacher: 'Dr. Rajesh Sharma' },
        { name: 'Science', code: 'SCI-10B', type: 'Core', weeklyHours: 6, teacher: 'Priya Patel' },
        { name: 'Social Science', code: 'SST-10B', type: 'Core', weeklyHours: 5, teacher: 'Rakesh Verma' },
        { name: 'Physical Education', code: 'PET-10B', type: 'Activity', weeklyHours: 3, teacher: 'Manoj Tiwari' }
      ],
      '9th-A': [
        { name: 'English Language & Lit', code: 'ENG-09', type: 'Core', weeklyHours: 5, teacher: 'Sneha Reddy' },
        { name: 'Mathematics', code: 'MTH-09', type: 'Core', weeklyHours: 6, teacher: 'Dr. Rajesh Sharma' },
        { name: 'Science', code: 'SCI-09', type: 'Core', weeklyHours: 6, teacher: 'Priya Patel' },
        { name: 'Social Science', code: 'SST-09', type: 'Core', weeklyHours: 5, teacher: 'Rakesh Verma' },
        { name: 'Hindi Course A', code: 'HND-09', type: 'Core', weeklyHours: 4, teacher: 'Meenakshi Sundaram' },
        { name: 'Computer Basics', code: 'CSC-09', type: 'Skill', weeklyHours: 3, teacher: 'Arjun Nair' }
      ],
      '8th-A': [
        { name: 'English Literature', code: 'ENG-08', type: 'Core', weeklyHours: 5, teacher: 'Sneha Reddy' },
        { name: 'Mathematics', code: 'MTH-08', type: 'Core', weeklyHours: 6, teacher: 'Sunita Deshmukh' },
        { name: 'General Science', code: 'SCI-08', type: 'Core', weeklyHours: 5, teacher: 'Vikram Singh' },
        { name: 'Social Science', code: 'SST-08', type: 'Core', weeklyHours: 5, teacher: 'Rakesh Verma' },
        { name: 'Hindi & Sanskrit', code: 'HND-08', type: 'Language', weeklyHours: 4, teacher: 'Meenakshi Sundaram' },
        { name: 'Computer Science', code: 'CSC-08', type: 'Skill', weeklyHours: 3, teacher: 'Arjun Nair' }
      ],
      '7th-A': [
        { name: 'English Literature', code: 'ENG-07', type: 'Core', weeklyHours: 5, teacher: 'Sneha Reddy' },
        { name: 'Mathematics', code: 'MTH-07', type: 'Core', weeklyHours: 6, teacher: 'Sunita Deshmukh' },
        { name: 'General Science', code: 'SCI-07', type: 'Core', weeklyHours: 5, teacher: 'Vikram Singh' },
        { name: 'Social Science', code: 'SST-07', type: 'Core', weeklyHours: 5, teacher: 'Rakesh Verma' },
        { name: 'Hindi & Sanskrit', code: 'HND-07', type: 'Language', weeklyHours: 4, teacher: 'Meenakshi Sundaram' },
        { name: 'Computer Science', code: 'CSC-07', type: 'Skill', weeklyHours: 3, teacher: 'Arjun Nair' }
      ],
      '6th-A': [
        { name: 'English Literature', code: 'ENG-06', type: 'Core', weeklyHours: 5, teacher: 'Sneha Reddy' },
        { name: 'Mathematics', code: 'MTH-06', type: 'Core', weeklyHours: 6, teacher: 'Sunita Deshmukh' },
        { name: 'General Science', code: 'SCI-06', type: 'Core', weeklyHours: 5, teacher: 'Vikram Singh' },
        { name: 'Social Science', code: 'SST-06', type: 'Core', weeklyHours: 5, teacher: 'Rakesh Verma' },
        { name: 'Hindi & Sanskrit', code: 'HND-06', type: 'Language', weeklyHours: 4, teacher: 'Meenakshi Sundaram' },
        { name: 'Computer Science', code: 'CSC-06', type: 'Skill', weeklyHours: 3, teacher: 'Arjun Nair' }
      ],
      '5th-A': [
        { name: 'English Language', code: 'ENG-05', type: 'Core', weeklyHours: 5, teacher: 'Anjali Saxena' },
        { name: 'Mathematics', code: 'MTH-05', type: 'Core', weeklyHours: 6, teacher: 'Sunita Deshmukh' },
        { name: 'General Science', code: 'SCI-05', type: 'Core', weeklyHours: 5, teacher: 'Pooja Sharma' },
        { name: 'Social Studies', code: 'SST-05', type: 'Core', weeklyHours: 4, teacher: 'Rakesh Verma' },
        { name: 'Hindi Language', code: 'HND-05', type: 'Language', weeklyHours: 4, teacher: 'Meenakshi Sundaram' },
        { name: 'Computer Basics', code: 'CSC-05', type: 'Skill', weeklyHours: 3, teacher: 'Arjun Nair' }
      ],
      '4th-A': [
        { name: 'English Language', code: 'ENG-04', type: 'Core', weeklyHours: 5, teacher: 'Anjali Saxena' },
        { name: 'Mathematics', code: 'MTH-04', type: 'Core', weeklyHours: 6, teacher: 'Kavita Pillai' },
        { name: 'Environmental Science', code: 'EVS-04', type: 'Core', weeklyHours: 5, teacher: 'Pooja Sharma' },
        { name: 'Social Studies', code: 'SST-04', type: 'Core', weeklyHours: 4, teacher: 'Rakesh Verma' },
        { name: 'Hindi Language', code: 'HND-04', type: 'Language', weeklyHours: 4, teacher: 'Meenakshi Sundaram' },
        { name: 'Creative Arts', code: 'ART-04', type: 'Activity', weeklyHours: 2, teacher: 'Rashmi Varma' }
      ],
      '3rd-A': [
        { name: 'English Language', code: 'ENG-03', type: 'Core', weeklyHours: 5, teacher: 'Anjali Saxena' },
        { name: 'Mathematics', code: 'MTH-03', type: 'Core', weeklyHours: 6, teacher: 'Kavita Pillai' },
        { name: 'Environmental Science', code: 'EVS-03', type: 'Core', weeklyHours: 5, teacher: 'Pooja Sharma' },
        { name: 'Hindi Language', code: 'HND-03', type: 'Language', weeklyHours: 4, teacher: 'Meenakshi Sundaram' },
        { name: 'Creative Arts', code: 'ART-03', type: 'Activity', weeklyHours: 2, teacher: 'Rashmi Varma' }
      ],
      '2nd-A': [
        { name: 'Primary English', code: 'ENG-02', type: 'Core', weeklyHours: 6, teacher: 'Rashmi Varma' },
        { name: 'Primary Mathematics', code: 'MTH-02', type: 'Core', weeklyHours: 6, teacher: 'Geeta Menon' },
        { name: 'Environmental Studies', code: 'EVS-02', type: 'Core', weeklyHours: 5, teacher: 'Pooja Sharma' },
        { name: 'Hindi Reading', code: 'HND-02', type: 'Language', weeklyHours: 4, teacher: 'Meenakshi Sundaram' },
        { name: 'Drawing & Craft', code: 'ART-02', type: 'Activity', weeklyHours: 3, teacher: 'Rashmi Varma' }
      ],
      '1st-A': [
        { name: 'Primary English', code: 'ENG-01', type: 'Core', weeklyHours: 6, teacher: 'Rashmi Varma' },
        { name: 'Primary Mathematics', code: 'MTH-01', type: 'Core', weeklyHours: 6, teacher: 'Geeta Menon' },
        { name: 'Environmental Studies', code: 'EVS-01', type: 'Core', weeklyHours: 5, teacher: 'Geeta Menon' },
        { name: 'Hindi Phonics', code: 'HND-01', type: 'Language', weeklyHours: 4, teacher: 'Meenakshi Sundaram' },
        { name: 'Art & Expression', code: 'ART-01', type: 'Activity', weeklyHours: 3, teacher: 'Rashmi Varma' }
      ],
      'UKG-A': [
        { name: 'Phonics & Reading', code: 'PHN-UKG', type: 'Foundational', weeklyHours: 6, teacher: 'Deepika Joshi' },
        { name: 'Kindergarten Numeracy', code: 'NUM-UKG', type: 'Foundational', weeklyHours: 6, teacher: 'Deepika Joshi' },
        { name: 'General Awareness', code: 'GA-UKG', type: 'Foundational', weeklyHours: 5, teacher: 'Deepika Joshi' },
        { name: 'Rhymes & Storytelling', code: 'RHM-UKG', type: 'Activity', weeklyHours: 4, teacher: 'Shalini Nair' },
        { name: 'Creative Play & Art', code: 'ART-UKG', type: 'Activity', weeklyHours: 3, teacher: 'Swati Kulkarni' }
      ],
      'LKG-A': [
        { name: 'Phonics & Speech', code: 'PHN-LKG', type: 'Foundational', weeklyHours: 6, teacher: 'Shalini Nair' },
        { name: 'Early Numeracy', code: 'NUM-LKG', type: 'Foundational', weeklyHours: 6, teacher: 'Shalini Nair' },
        { name: 'Environmental Habits', code: 'GA-LKG', type: 'Foundational', weeklyHours: 5, teacher: 'Shalini Nair' },
        { name: 'Rhymes & Music', code: 'RHM-LKG', type: 'Activity', weeklyHours: 4, teacher: 'Swati Kulkarni' },
        { name: 'Coloring & Motor Skills', code: 'ART-LKG', type: 'Activity', weeklyHours: 3, teacher: 'Swati Kulkarni' }
      ],
      'Nursery-A': [
        { name: 'Toddler Phonics', code: 'PHN-NUR', type: 'Pre-Primary', weeklyHours: 6, teacher: 'Swati Kulkarni' },
        { name: 'Sensory Numeracy', code: 'NUM-NUR', type: 'Pre-Primary', weeklyHours: 6, teacher: 'Swati Kulkarni' },
        { name: 'Rhymes & Movement', code: 'RHM-NUR', type: 'Activity', weeklyHours: 5, teacher: 'Swati Kulkarni' },
        { name: 'Art & Play Activities', code: 'ART-NUR', type: 'Activity', weeklyHours: 4, teacher: 'Shalini Nair' }
      ]
    };

    let totalSubjectsCreated = 0;
    const createdSubjectObjects = {};

    for (const [classKey, subjects] of Object.entries(classSubjectsConfig)) {
      const [std, sec] = classKey.split('-');
      const cls = createdClasses[classKey];

      for (const sub of subjects) {
        const s = await prisma.subject.create({
          data: {
            name: sub.name,
            code: sub.code,
            standard: std,
            section: sec,
            board: 'CBSE',
            classId: cls ? cls.id : null,
            className: `Class ${std}-${sec}`,
            type: sub.type,
            weeklyHours: sub.weeklyHours
          }
        });
        createdSubjectObjects[sub.code] = s;
        totalSubjectsCreated++;

        // Teacher Class Subject Mapping
        const tObj = teacherMap[sub.teacher];
        await prisma.teacherClassSubjectMapping.create({
          data: {
            teacherId: tObj ? tObj.id : null,
            teacherName: sub.teacher,
            employeeId: tObj ? tObj.employeeId : 'EMP000',
            classId: cls ? cls.id : null,
            standard: std,
            section: sec,
            board: 'CBSE',
            subjectId: s.id,
            subject: sub.name,
            subjectCode: sub.code,
            roomNumber: cls ? cls.roomNumber : 'Main Hall'
          }
        });

        // Seed Coursework Material for this subject
        await prisma.material.create({
          data: {
            subjectId: s.id,
            title: `${sub.name} (${sub.code}) - Term 1 Curriculum Dossier & Worksheets`,
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileType: 'pdf',
            uploadedBy: sub.teacher
          }
        });
      }
    }
    console.log(`✅ Seeded ${totalSubjectsCreated} subjects with distinct subject codes and teacher mappings.`);

    // 7. TIMETABLES ACROSS WEEKDAYS
    console.log('📅 7. Seeding Weekly Timetable for all classes...');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    for (const [classKey, subjects] of Object.entries(classSubjectsConfig)) {
      const [std, sec] = classKey.split('-');
      const cls = createdClasses[classKey];
      const room = cls ? cls.roomNumber : 'Room 101';

      for (const d of days) {
        for (let pIdx = 0; pIdx < Math.min(6, subjects.length); pIdx++) {
          const sub = subjects[pIdx];
          const tObj = teacherMap[sub.teacher];
          const periodStartTimes = ['08:30', '09:15', '10:00', '11:00', '12:45', '01:30'];
          const periodEndTimes = ['09:15', '10:00', '10:45', '11:45', '01:30', '02:15'];

          await prisma.timetable.create({
            data: {
              classId: cls ? cls.id : null,
              standard: std,
              section: sec,
              board: 'CBSE',
              day: d,
              period: pIdx + 1,
              subject: sub.name,
              subjectCode: sub.code,
              teacherId: tObj ? tObj.id : null,
              teacher: sub.teacher,
              employeeId: tObj ? tObj.employeeId : 'EMP000',
              room: room,
              startTime: periodStartTimes[pIdx] || '08:30',
              endTime: periodEndTimes[pIdx] || '09:15',
              timeSlot: `${periodStartTimes[pIdx] || '08:30'} - ${periodEndTimes[pIdx] || '09:15'}`
            }
          });
        }
      }
    }
    console.log('✅ Master timetables seeded across all classes and weekdays.');

    // 8. SEED STUDENTS (12 to 14 students for EVERY class)
    console.log('🎓 8. Seeding 12 to 14 Students per Class with RTE, General & Concessions...');
    const firstNamesPool = [
      'Aarav', 'Rahul', 'Ananya', 'Vihaan', 'Rohan', 'Kyra', 'Kabir', 'Ishita',
      'Arnav', 'Saanvi', 'Aditya', 'Tanvi', 'Reyansh', 'Meera', 'Dhruv', 'Diya',
      'Aryan', 'Kavya', 'Samarth', 'Anika', 'Varun', 'Nisha', 'Kunal', 'Pooja',
      'Harsh', 'Isha', 'Dev', 'Tara', 'Rishi', 'Prisha'
    ];
    const lastNamesPool = [
      'Sharma', 'Verma', 'Patel', 'Iyer', 'Sen', 'Reddy', 'Mehta', 'Nair',
      'Gupta', 'Singh', 'Deshmukh', 'Saxena', 'Chopra', 'Malhotra', 'Bose',
      'Kulkarni', 'Bhattacharya', 'Menon', 'Pillai', 'Rao'
    ];

    const allCreatedStudents = [];
    const studentQuotaMap = {}; // stu.id -> quotaId

    for (let cIdx = 0; cIdx < classStandards.length; cIdx++) {
      const c = classStandards[cIdx];
      const std = c.std;
      const sec = c.sec;
      const targetClass = createdClasses[`${std}-${sec}`];
      const studentsInThisClass = 13; // 13 students per class (10 to 20 range)

      for (let sIdx = 0; sIdx < studentsInThisClass; sIdx++) {
        const roll = String(sIdx + 1).padStart(2, '0');
        let name, email, uid;

        if (std === '10th' && sec === 'A' && sIdx === 0) {
          name = 'Aarav Sharma';
          email = 'aarav.sharma@qelvora.in';
          uid = aaravUser.id;
        } else if (std === '10th' && sec === 'A' && sIdx === 1) {
          name = 'Rahul Student';
          email = 'student@example.com';
          uid = studentUser.id;
        } else {
          const fn = firstNamesPool[(cIdx * 5 + sIdx) % firstNamesPool.length];
          const ln = lastNamesPool[(cIdx * 3 + sIdx) % lastNamesPool.length];
          name = `${fn} ${ln}`;
          email = `${fn.toLowerCase()}.${ln.toLowerCase()}.${std.toLowerCase()}${sec.toLowerCase()}@qelvora.in`;
          uid = null;
        }

        const parentLn = lastNamesPool[(cIdx * 3 + sIdx) % lastNamesPool.length];
        const parentName = `Mr. & Mrs. ${parentLn}`;
        const parentPhone = `+91 98765 ${String(10000 + (cIdx * 100) + sIdx).padStart(5, '0')}`;
        const parentEmail = `parent.${name.toLowerCase().replace(/\s+/g, '.')}@qelvora.in`;

        // Quotas:
        // Roll 01: Merit (25%)
        // Roll 02: Staff Ward (50%)
        // Roll 04, 08, 12: RTE (Right to Education - 100% waiver)
        // Roll 06: Sibling Concession (15%)
        // Others: General
        let assignedQuotaId = 'q-general';
        if (sIdx === 0) assignedQuotaId = 'q-merit';
        else if (sIdx === 1) assignedQuotaId = 'q-staff';
        else if (sIdx === 3 || sIdx === 7 || sIdx === 11) assignedQuotaId = 'q-rte';
        else if (sIdx === 5) assignedQuotaId = 'q-sibling';

        const stu = await prisma.student.create({
          data: {
            userId: uid,
            studentId: `STU-${std.replace(/\s+/g, '')}-${sec}-${roll}`,
            name,
            email,
            standard: std,
            section: sec,
            rollNumber: roll,
            parentName,
            parentPhone,
            parentEmail,
            gender: sIdx % 2 === 0 ? 'Male' : 'Female',
            dob: '2012-05-15',
            address: 'Bengaluru, Karnataka - 560103',
            admissionDate: '2026-04-01'
          }
        });
        allCreatedStudents.push(stu);
        studentQuotaMap[stu.id] = assignedQuotaId;

        // 7 days of attendance for each student
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const dateStr = getDateDaysAgo(dayOffset);
          // Aarav Sharma is 100% present, others have realistic ~88% attendance
          const isAbsent = (std === '10th' && sec === 'A' && sIdx === 0) ? false : (sIdx + dayOffset) % 7 === 0;
          const status = isAbsent ? 'Absent' : 'Present';
          const markedTime = isAbsent ? '—' : '08:22 AM';

          const attRecord = await prisma.studentAttendance.create({
            data: {
              date: dateStr,
              class: { connect: { id: targetClass.id } },
              studentId: stu.id,
              studentName: name,
              rollNumber: roll,
              status,
              markedTime,
              academicYear: '2026-2027',
              session: 'FULL_DAY',
              notificationStatus: isAbsent ? 'DELIVERED' : 'NONE'
            }
          });

          // If absent, seed parent notification log!
          if (isAbsent && dayOffset <= 2) {
            await prisma.attendanceNotificationLog.create({
              data: {
                attendanceId: attRecord.id,
                studentId: stu.id,
                studentName: name,
                parentPhone: parentPhone,
                parentEmail: parentEmail,
                channel: 'EMAIL',
                triggerStatus: 'Absent',
                message: `Dear Parent, your child ${name} (Roll: ${roll}) of Class ${std}-${sec} was marked Absent on ${dateStr} at 08:30 AM. - Qelvora School CRM`,
                status: 'DELIVERED',
                sentAt: new Date(Date.now() - dayOffset * 86400000)
              }
            });
          }
        }
      }
    }
    console.log(`✅ Seeded ${allCreatedStudents.length} students across all ${classStandards.length} classes (~13 per class).`);

    // 9. TEACHER ATTENDANCE (School Entry Daily Punch-in)
    console.log('📋 9. Seeding Faculty Daily Campus Attendance (On-Time, Late & Leave)...');
    const teacherRecords = Object.values(teacherMap);
    for (let i = 0; i < teacherRecords.length; i++) {
      const t = teacherRecords[i];
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dateStr = getDateDaysAgo(dayOffset);
        let status = 'Present';
        let markedTime = '08:20 AM';

        if (dayOffset === 0) {
          if (t.name === 'Rakesh Verma' || t.name === 'Sneha Reddy') {
            status = 'Leave';
            markedTime = '—';
          } else if (t.name === 'Vikram Singh') {
            status = 'Present';
            markedTime = '08:52 AM'; // Late arrival
          } else if (t.name === 'Sunita Deshmukh') {
            status = 'Present';
            markedTime = '08:48 AM'; // Late arrival
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

    // 10. CLASSROOM CHECK-IN SESSIONS (Tier-2 Check-in for Principal Monitoring)
    console.log('🎥 10. Seeding Live Classroom Check-In Sessions...');
    await prisma.classSession.createMany({
      data: [
        { standard: '10th', section: 'A', subject: 'Mathematics', teacher: 'Dr. Rajesh Sharma', status: 'completed', startTime: new Date(Date.now() - 4 * 3600000), endTime: new Date(Date.now() - 3 * 3600000) },
        { standard: '12th', section: 'A', subject: 'Physics', teacher: 'Priya Patel', status: 'completed', startTime: new Date(Date.now() - 3 * 3600000), endTime: new Date(Date.now() - 2 * 3600000) },
        { standard: '11th', section: 'A', subject: 'Biology', teacher: 'Vikram Singh', status: 'completed', startTime: new Date(Date.now() - 2 * 3600000), endTime: new Date(Date.now() - 1 * 3600000) },
        { standard: '9th', section: 'A', subject: 'Computer Basics', teacher: 'Arjun Nair', status: 'in-progress', startTime: new Date(Date.now() - 25 * 60000), endTime: null },
        { standard: '12th', section: 'B', subject: 'Business Studies', teacher: 'Ananya Sen', status: 'in-progress', startTime: new Date(Date.now() - 15 * 60000), endTime: null },
        { standard: '7th', section: 'A', subject: 'Social Science', teacher: 'Rakesh Verma', status: 'delayed', startTime: new Date(Date.now() - 50 * 60000), endTime: null }
      ]
    });

    // 11. LEAVE REQUESTS & SUBSTITUTES
    console.log('📝 11. Seeding Faculty Leaves & Substitutes...');
    await prisma.leaveRequest.createMany({
      data: [
        { applicantName: 'Rakesh Verma', applicantRole: 'Senior Educator', reason: 'Family medical emergency in hometown. Casual leave requested.', startDate: getDateDaysAgo(0), endDate: getDateDaysAgo(-1), status: 'Pending' },
        { applicantName: 'Sneha Reddy', applicantRole: 'Senior Educator', reason: 'CBSE National Pedagogy & English Conclave.', startDate: getDateDaysAgo(0), endDate: getDateDaysAgo(-2), status: 'Pending' },
        { applicantName: 'Ananya Sen', applicantRole: 'Senior Educator', reason: 'Attending Advanced Chemistry Laboratory Calibration Workshop.', startDate: getDateDaysAgo(2), endDate: getDateDaysAgo(1), status: 'Approved' }
      ]
    });

    await prisma.substituteAssignment.createMany({
      data: [
        { date: getDateDaysAgo(0), period: 2, standard: '7th', section: 'A', absentTeacher: 'Rakesh Verma', substituteTeacher: 'Sunita Deshmukh', status: 'Assigned' },
        { date: getDateDaysAgo(0), period: 4, standard: '11th', section: 'B', absentTeacher: 'Sneha Reddy', substituteTeacher: 'Vikram Singh', status: 'Assigned' }
      ]
    });

    // 12. SAFE PICKUP AUTHORIZATIONS
    console.log('🛡️ 12. Seeding Student Safe Pickup Authorizations...');
    const aaravStu = allCreatedStudents.find(s => s.name === 'Aarav Sharma');
    if (aaravStu) {
      await prisma.pickupAuthorization.createMany({
        data: [
          { studentId: aaravStu.id, authorizedPersonName: 'Smt. Sharda Sharma (Grandmother)', authorizedPersonPhone: '+91 98765 99001', otpCode: '849201', status: 'Active', expiresAt: new Date(Date.now() + 48 * 3600000) },
          { studentId: aaravStu.id, authorizedPersonName: 'Mr. Alok Sharma (Father)', authorizedPersonPhone: '+91 98765 99002', otpCode: '517390', status: 'Active', expiresAt: new Date(Date.now() + 72 * 3600000) }
        ]
      });
    }

    // 13. EXAMINATION SYSTEM: GRADE SCALES, EXAMS, ALLOCATIONS & MARKS
    console.log('📝 13. Seeding Examination Master System (FA1 Completed, FA2 Scheduled)...');
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

    // FA1 is finished, locked and results published!
    // FA2 is the next upcoming examination scheduled!
    const examNamesData = [
      { examTypeId: createdExamTypes['FA1'].id, name: 'Formative Assessment 1 (FA1) 2026-27', description: 'Formative Unit Evaluation 1 - COMPLETED', academicYear: '2026-2027', startDate: '2026-07-10', endDate: '2026-07-15', isPublished: true, isLocked: true },
      { examTypeId: createdExamTypes['FA2'].id, name: 'Formative Assessment 2 (FA2) 2026-27', description: 'Formative Unit Evaluation 2 - UPCOMING NEXT', academicYear: '2026-2027', startDate: '2026-08-20', endDate: '2026-08-25', isPublished: false, isLocked: false },
      { examTypeId: createdExamTypes['Mid Term'].id, name: 'Mid Term Examination 2026-27', description: 'Comprehensive Mid-Term Summative Assessment', academicYear: '2026-2027', startDate: '2026-09-15', endDate: '2026-09-25', isPublished: false, isLocked: false }
    ];

    const createdExamNames = {};
    for (const en of examNamesData) {
      const record = await prisma.examName.create({ data: en });
      createdExamNames[en.name] = record;
    }

    // Weightages
    for (const et of examTypesData) {
      await prisma.examWeightage.create({
        data: {
          academicYear: et.academicYear,
          examTypeName: et.name,
          weightPercent: et.weightage
        }
      });
    }

    // Seed Allocations and Marks for FA1 (Finished) and Allocations for FA2 (Upcoming)
    console.log('📊 Seeding Allocations for FA1 & FA2, and Complete Marks for FA1...');
    const fa1Exam = createdExamNames['Formative Assessment 1 (FA1) 2026-27'];
    const fa2Exam = createdExamNames['Formative Assessment 2 (FA2) 2026-27'];

    // Graduated score profiles out of 25 for ranking:
    // Rank 1: 24 (96%), Rank 2: 22 (88%), Rank 3: 20 (80%), ...
    const rankScoreBases = [24, 22, 21, 19, 18, 17, 16, 15, 14, 13, 12, 11, 7];

    for (const [classKey, subjects] of Object.entries(classSubjectsConfig)) {
      const [std, sec] = classKey.split('-');
      const studentsInClass = allCreatedStudents.filter(s => s.standard === std && s.section === sec);

      // Allocations for FA1 and FA2
      for (let subIdx = 0; subIdx < subjects.length; subIdx++) {
        const sub = subjects[subIdx];
        const tObj = teacherMap[sub.teacher];

        // FA1 allocation
        await prisma.examAllocation.create({
          data: {
            examNameId: fa1Exam.id,
            standard: std,
            section: sec,
            subjectName: sub.name,
            teacherName: sub.teacher,
            employeeId: tObj ? tObj.employeeId : 'EMP001',
            sequence: subIdx + 1
          }
        });

        // FA2 allocation (so teacher can enter marks for their assigned classes & subjects!)
        await prisma.examAllocation.create({
          data: {
            examNameId: fa2Exam.id,
            standard: std,
            section: sec,
            subjectName: sub.name,
            teacherName: sub.teacher,
            employeeId: tObj ? tObj.employeeId : 'EMP001',
            sequence: subIdx + 1
          }
        });
      }

      // Enter completed FA1 marks for every student in this class
      for (let sIdx = 0; sIdx < studentsInClass.length; sIdx++) {
        const stu = studentsInClass[sIdx];
        const baseScore = rankScoreBases[sIdx] || 15;

        for (let subIdx = 0; subIdx < subjects.length; subIdx++) {
          const sub = subjects[subIdx];
          let obtained = baseScore + (subIdx % 2 === 0 ? 0 : 1);
          if (sIdx === 0) obtained = Math.min(25, 24 + (subIdx % 2));
          if (sIdx === studentsInClass.length - 1 && subIdx === 0) obtained = 6; // Fail mark in one subject for remediation
          obtained = Math.max(0, Math.min(25, obtained));

          const pct = (obtained / 25) * 100;
          const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 35 ? 'D' : 'F';
          const gradePoint = pct >= 90 ? 10 : pct >= 80 ? 9 : pct >= 70 ? 8 : pct >= 60 ? 7 : pct >= 50 ? 6 : pct >= 35 ? 5 : 0;
          const remarks = sIdx === 0 ? 'Outstanding mastery & 1st Rank performance' :
                          sIdx === 1 ? 'Excellent analytical understanding & 2nd Rank' :
                          sIdx === 2 ? 'Commendable effort, strong conceptual grasp' :
                          sIdx === studentsInClass.length - 1 ? 'Needs remedial guidance in fundamentals' : 'Consistent performance';

          await prisma.examMarks.create({
            data: {
              examNameId: fa1Exam.id,
              examTypeId: fa1Exam.examTypeId,
              studentId: stu.id,
              rollNumber: stu.rollNumber,
              studentName: stu.name,
              standard: stu.standard,
              section: stu.section,
              subjectName: sub.name,
              maxMarks: 25,
              minMarks: 9,
              marksObtained: obtained,
              isAbsent: false,
              isPassed: obtained >= 9,
              grade,
              gradePoint,
              remarks,
              enteredBy: sub.teacher
            }
          });
        }
      }
    }
    console.log('✅ Exam allocations and FA1 marks seeded with distinct grade/rank evaluations.');

    // 14. FEES MANAGEMENT DATA (feesData.json)
    console.log('💳 14. Synchronizing Fees Management Data (feesData.json) for LKG to 12th...');
    let feesData = {
      settings: {
        activeAcademicYear: '2026-2027',
        academicYears: ['2026-2027', '2025-2026', '2024-2025'],
        receiptPrefix: 'FEE/2026-27/',
        nextReceiptNumber: 2001,
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
          schoolCode: 'QEL-KA-56001',
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

    // Fee structures for all standards from Nursery to 12th
    const year = '2026-2027';
    for (const std of allStandardsList) {
      const isSeniorSec = ['11th', '12th'].includes(std);
      const isSenior = ['9th', '10th'].includes(std);
      const isMiddle = ['6th', '7th', '8th'].includes(std);
      const baseTuition = isSeniorSec ? 5800 : isSenior ? 4800 : isMiddle ? 3800 : 2800;
      const baseAnnual = isSeniorSec ? 16000 : isSenior ? 14000 : isMiddle ? 11000 : 8500;
      const baseLab = isSeniorSec ? 4500 : isSenior ? 3200 : isMiddle ? 2200 : 1500;
      const baseExam = isSeniorSec ? 3000 : isSenior ? 2400 : 1800;
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

    // Assign Quotas, Adjustments and Seed Receipts across students
    let receiptCounter = 2001;
    for (const stu of allCreatedStudents) {
      const assignedQuotaId = studentQuotaMap[stu.id] || 'q-general';

      feesData.studentQuotas[stu.id] = {
        quotaId: assignedQuotaId,
        assignedAt: '2026-04-01T09:00:00.000Z',
        assignedBy: 'System Academic Registrar'
      };

      // Calculate annual payable
      const structKey = `${year}_${stu.standard}_${assignedQuotaId}`;
      const structure = feesData.structures[structKey] || feesData.structures[`${year}_${stu.standard}_q-general`];
      let annualPayable = 0;
      structure.items.forEach(it => {
        if (!it.enabled) return;
        if (it.frequency === 'Monthly') annualPayable += (it.amount * 12);
        else if (it.frequency === 'Term-wise') annualPayable += (it.amount * 3);
        else annualPayable += it.amount;
      });

      // Special Adjustments:
      // RTE students get 100% tuition waiver adjustment note
      if (assignedQuotaId === 'q-rte') {
        feesData.studentAdjustments[`${stu.id}_${year}`] = [
          {
            id: `adj-rte-${stu.id}`,
            type: 'concession',
            headName: 'Government RTE 100% Tuition Waiver',
            value: 0,
            reason: 'Right to Education Act Clause 12(1)(c) full tuition waiver',
            createdAt: '2026-04-01T00:00:00.000Z'
          }
        ];
      } else if (stu.rollNumber === '06') {
        // Sibling concession + past balance
        feesData.studentAdjustments[`${stu.id}_${year}`] = [
          {
            id: `adj-prev-${stu.id}`,
            type: 'previous_balance',
            headName: 'Previous Year Arrears (2025-2026)',
            value: 3500,
            reason: 'Carry-forward balance from previous academic session',
            createdAt: '2026-04-01T00:00:00.000Z'
          }
        ];
      }

      // Generate Receipts:
      // Roll 01 (Merit) & Roll 02 (Staff Ward): FULL PAYMENT (Term 1 & Term 2)
      if (stu.name === 'Aarav Sharma' || stu.rollNumber === '01') {
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
      } else if (stu.rollNumber === '04') {
        // RTE Student paying small one-time lab/sports fee
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
          paymentDate: '2026-04-20',
          paidAmount: 2500,
          paymentMode: 'Cash',
          transactionRef: `CASH-REC-${receiptCounter}`,
          status: 'Active',
          collectedBy: 'Manoj Verma (Accounts Officer)',
          remarks: 'RTE non-tuition co-curricular token fee'
        });
        receiptCounter++;
      }
      // Other rolls (05, 06, 07, etc.) have pending / outstanding balances
    }

    feesData.settings.nextReceiptNumber = receiptCounter + 1;
    fs.writeFileSync(FEES_DATA_PATH, JSON.stringify(feesData, null, 2), 'utf-8');
    console.log(`✅ Fees Store updated: ${feesData.receipts.length} collection receipts issued across LKG-12th.`);

    // 15. PARENT FEEDBACK & CONCERNS
    console.log('💬 15. Seeding Parent Feedback & Educational Concerns...');
    await prisma.teacherFeedback.createMany({
      data: [
        {
          teacherName: 'Dr. Rajesh Sharma',
          feedback: '[Parent | Mr. & Mrs. Sharma | Child: Aarav Sharma | 10th-A | Mathematics] Dr. Sharma makes complex calculus and coordinate geometry extremely intuitive. My son scored 96% in his term exam!',
          rating: 5
        },
        {
          teacherName: 'Priya Patel',
          feedback: '[Parent | Mr. & Mrs. Verma | Child: Rohan Verma | 12th-A | Physics] Exceptional mechanics demonstrations and physics laboratory training. Prepares students thoroughly for CBSE board exams.',
          rating: 5
        },
        {
          teacherName: 'Ananya Sen',
          feedback: '[Parent | Mr. & Mrs. Iyer | Child: Ananya Iyer | 12th-B | Chemistry] Very patient with organic chemistry reactions and provides prompt feedback on homework assignments.',
          rating: 5
        },
        {
          teacherName: 'Deepika Joshi',
          feedback: '[Parent | Mr. & Mrs. Kulkarni | Child: Kabir Kulkarni | UKG-A | Phonics & Reading] Our child has developed immense confidence in English vocabulary and basic phonics recitation. Highly appreciative!',
          rating: 5
        },
        {
          teacherName: 'Rakesh Verma',
          feedback: '[Parent | Mr. & Mrs. Reddy | Child: Saanvi Reddy | 7th-A | Social Science] Requesting additional map-pointing practice sessions before the upcoming FA2 unit evaluation.',
          rating: 4
        }
      ]
    });
    console.log('✅ Parent feedback & concerns seeded.');

    console.log('\n🎉 ========================================================');
    console.log('🌟 COMPREHENSIVE SEEDING COMPLETED SUCCESSFULLY!');
    console.log(`   - ${classStandards.length} Institutional Classes (LKG, UKG, 1st to 12th)`);
    console.log(`   - ${allCreatedStudents.length} Students (~13 students per class)`);
    console.log(`   - ${totalSubjectsCreated} Subjects with Distinct Class-Specific Codes`);
    console.log(`   - ${teacherConfigs.length} Faculty Members & Assigned Class Teachers`);
    console.log('   - FA1 Completed with Full Marks & FA2 Scheduled Next');
    console.log('   - Grade-Based Evaluation (<= Class 5) & Ranking (Class 6-12)');
    console.log('   - Dual-Tier Attendance (School Entry + Classroom Check-in)');
    console.log('   - Fees Structures, Quotas (RTE / General) & Receipts');
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
