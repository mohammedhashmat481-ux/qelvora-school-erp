import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

const getDateDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

async function seedFullPlatform() {
  try {
    console.log('🚀 Starting Comprehensive Full Platform Demo Data Seeding...');

    // 1. Clear existing database tables in proper foreign key order
    console.log('🧹 Clearing legacy records...');
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
    await prisma.schoolSettings.deleteMany();
    await prisma.user.deleteMany();

    // 2. School Settings
    console.log('⚙️ 1. Seeding Master School Configuration...');
    await prisma.schoolSettings.create({
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

    // 3. Roles
    console.log('🛡️ 2. Seeding Enterprise Administrative Roles...');
    await prisma.role.createMany({
      data: [
        { name: 'School Principal', rolename: 'School Principal', roleCode: 'PRIN', grantAdminPrivilege: true, status: 'Active', isEnabled: true, permissions: ['all', 'settings', 'admin', 'reports', 'approvals'] },
        { name: 'Department Head', rolename: 'Department Head', roleCode: 'HOD', grantAdminPrivilege: true, status: 'Active', isEnabled: true, permissions: ['class', 'attendance', 'reports', 'subjects', 'timetables'] },
        { name: 'Senior Educator', rolename: 'Senior Educator', roleCode: 'SRED', grantAdminPrivilege: false, status: 'Active', isEnabled: true, permissions: ['class', 'attendance', 'timetables', 'materials'] },
        { name: 'Teacher', rolename: 'Teacher', roleCode: 'TCHR', grantAdminPrivilege: false, status: 'Active', isEnabled: true, permissions: ['attendance', 'class', 'materials'] },
        { name: 'Assistant Teacher', rolename: 'Assistant Teacher', roleCode: 'ASTT', grantAdminPrivilege: false, status: 'Active', isEnabled: true, permissions: ['attendance', 'class'] },
        { name: 'Lab Coordinator', rolename: 'Lab Coordinator', roleCode: 'LBCO', grantAdminPrivilege: false, status: 'Active', isEnabled: true, permissions: ['inventory', 'classes', 'materials'] },
        { name: 'Transport & Safety Incharge', rolename: 'Transport & Safety Incharge', roleCode: 'TSAF', grantAdminPrivilege: false, status: 'Active', isEnabled: true, permissions: ['pickup', 'attendance'] },
        { name: 'Examination Controller', rolename: 'Examination Controller', roleCode: 'EXAM', grantAdminPrivilege: true, status: 'Active', isEnabled: true, permissions: ['papers', 'reports', 'classes'] }
      ]
    });

    // 4. Default Passwords & Master Users
    console.log('👤 3. Seeding Core Accounts & Faculty...');
    const defaultPasswordHash = await bcrypt.hash('Welcome@123', 12);

    // Admin
    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin User',
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

    // Teachers
    const priyaUser = await prisma.user.create({
      data: { name: 'Priya Patel', email: 'priya.patel@qelvora.in', password_hash: defaultPasswordHash, role: 'Teacher', skip_face: true, skip_location: true }
    });
    const ananyaUser = await prisma.user.create({
      data: { name: 'Ananya Sen', email: 'ananya.sen@qelvora.in', password_hash: defaultPasswordHash, role: 'Senior Educator', skip_face: true, skip_location: true }
    });
    const vikramUser = await prisma.user.create({
      data: { name: 'Vikram Singh', email: 'vikram.singh@qelvora.in', password_hash: defaultPasswordHash, role: 'Senior Educator', skip_face: true, skip_location: true }
    });
    const snehaUser = await prisma.user.create({
      data: { name: 'Sneha Reddy', email: 'sneha.reddy@qelvora.in', password_hash: defaultPasswordHash, role: 'Assistant Teacher', skip_face: true, skip_location: true }
    });
    const arjunUser = await prisma.user.create({
      data: { name: 'Arjun Nair', email: 'arjun.nair@qelvora.in', password_hash: defaultPasswordHash, role: 'Lab Coordinator', skip_face: true, skip_location: true }
    });

    // Student & Parent
    const studentUser = await prisma.user.create({
      data: { name: 'Rahul Student', email: 'student@example.com', password_hash: defaultPasswordHash, role: 'student', skip_face: true, skip_location: true }
    });
    const parentUser = await prisma.user.create({
      data: { name: 'Mr. & Mrs. Sharma', email: 'parent@example.com', password_hash: defaultPasswordHash, role: 'parent', skip_face: true, skip_location: true }
    });

    // Teacher Faculty records
    const teachersList = [
      { employeeId: 'EMP001', name: 'Dr. Rajesh Sharma', email: 'rajesh.sharma@qelvora.in', phone: '+91 98765 11001', department: 'Mathematics', qualification: 'Ph.D. in Pure Mathematics', designation: 'Principal & Senior Head', assignedClass: '10th', assignedSection: 'A', userId: principalUser.id },
      { employeeId: 'EMP002', name: 'Priya Patel', email: 'priya.patel@qelvora.in', phone: '+91 98765 11002', department: 'Physics & Applied Sciences', qualification: 'M.Sc. Physics (Gold Medalist)', designation: 'Teacher', assignedClass: '10th', assignedSection: 'A', userId: priyaUser.id },
      { employeeId: 'EMP003', name: 'Ananya Sen', email: 'ananya.sen@qelvora.in', phone: '+91 98765 11003', department: 'Chemistry', qualification: 'M.Sc. Organic Chemistry', designation: 'Senior Chemistry Educator', assignedClass: '10th', assignedSection: 'B', userId: ananyaUser.id },
      { employeeId: 'EMP004', name: 'Vikram Singh', email: 'vikram.singh@qelvora.in', phone: '+91 98765 11004', department: 'Life Sciences & Biology', qualification: 'M.Sc. Zoology & Genetics', designation: 'Senior Biology Educator', assignedClass: '9th', assignedSection: 'A', userId: vikramUser.id },
      { employeeId: 'EMP005', name: 'Sneha Reddy', email: 'sneha.reddy@qelvora.in', phone: '+91 98765 11005', department: 'English & Literature', qualification: 'M.A., M.Phil. English', designation: 'Senior Humanities Educator', assignedClass: '9th', assignedSection: 'B', userId: snehaUser.id },
      { employeeId: 'EMP006', name: 'Arjun Nair', email: 'arjun.nair@qelvora.in', phone: '+91 98765 11006', department: 'Computer Science & AI', qualification: 'M.Tech Computer Science', designation: 'Lead AI Lab Coordinator', assignedClass: '10th', assignedSection: 'A', userId: arjunUser.id }
    ];

    for (const t of teachersList) {
      await prisma.teacher.create({ data: t });
    }

    // Non-Teaching Staff
    console.log('🏢 4. Seeding Non-Teaching Staff...');
    await prisma.nonTeachingStaff.createMany({
      data: [
        { employeeId: 'NT001', name: 'Ramesh Kumar', role: 'Chief Transport Incharge & Bus Driver', phone: '+91 98765 43201', email: 'driver@example.com' },
        { employeeId: 'NT002', name: 'Sunita Joshi', role: 'Head Librarian & Resource Curator', phone: '+91 98765 43202', email: 'librarian@qelvora.in' },
        { employeeId: 'NT003', name: 'Manoj Verma', role: 'Senior Accounts & Finance Officer', phone: '+91 98765 43203', email: 'accounts@qelvora.in' },
        { employeeId: 'NT004', name: 'Kavita Pillai', role: 'Campus Safety & Health Supervisor', phone: '+91 98765 43204', email: 'safety@qelvora.in' }
      ]
    });

    // 5. Classes across standards
    console.log('🏫 5. Seeding Institutional Classes...');
    const classStandards = [
      { std: '10th', sec: 'A', room: 'Room 301' },
      { std: '10th', sec: 'B', room: 'Room 302' },
      { std: '9th', sec: 'A', room: 'Room 201' },
      { std: '9th', sec: 'B', room: 'Room 202' },
      { std: '8th', sec: 'A', room: 'Room 101' },
      { std: '8th', sec: 'B', room: 'Room 102' },
      { std: '7th', sec: 'A', room: 'Room 103' },
      { std: '6th', sec: 'A', room: 'Room 104' },
      { std: '5th', sec: 'A', room: 'Room 105' },
      { std: '1st', sec: 'A', room: 'Room 001' },
      { std: 'UKG', sec: 'A', room: 'Kindergarten 1' },
      { std: 'LKG', sec: 'A', room: 'Kindergarten 2' },
      { std: 'Nursery', sec: 'A', room: 'Playgroup Hall' }
    ];

    const createdClasses = {};
    for (const c of classStandards) {
      const created = await prisma.class.create({
        data: { standard: c.std, section: c.sec, roomNumber: c.room }
      });
      createdClasses[`${c.std}-${c.sec}`] = created;
    }

    // 6. Subjects & Materials
    console.log('📚 6. Seeding Subjects & Study Materials...');
    const subjectDefs = [
      { name: 'Mathematics', code: 'MATH101', standard: '10th' },
      { name: 'Physics', code: 'PHYS101', standard: '10th' },
      { name: 'Chemistry', code: 'CHEM101', standard: '10th' },
      { name: 'Biology', code: 'BIO101', standard: '9th' },
      { name: 'English Literature', code: 'ENG101', standard: '10th' },
      { name: 'Computer Science & AI', code: 'CS101', standard: '10th' },
      { name: 'Social Studies & Civics', code: 'SST101', standard: '8th' },
      { name: 'Environmental Science', code: 'EVS101', standard: 'All' }
    ];

    const createdSubjects = {};
    for (const s of subjectDefs) {
      const created = await prisma.subject.create({ data: s });
      createdSubjects[s.name] = created;

      // Seed a material for each subject
      await prisma.material.create({
        data: {
          subjectId: created.id,
          title: `${s.name} Complete Curriculum Guide (Unit 1 to 5)`,
          fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          fileType: 'pdf',
          uploadedBy: 'Dr. Rajesh Sharma'
        }
      });
    }

    // 7. Teacher-Class-Subject Mappings
    console.log('🔗 7. Seeding Teacher Class Mappings...');
    await prisma.teacherClassSubjectMapping.createMany({
      data: [
        { teacherName: 'Dr. Rajesh Sharma', standard: '10th', section: 'A', subject: 'Mathematics' },
        { teacherName: 'Dr. Rajesh Sharma', standard: '9th', section: 'A', subject: 'Mathematics' },
        { teacherName: 'Priya Patel', standard: '10th', section: 'A', subject: 'Physics' },
        { teacherName: 'Priya Patel', standard: '9th', section: 'A', subject: 'Physics' },
        { teacherName: 'Ananya Sen', standard: '10th', section: 'B', subject: 'Chemistry' },
        { teacherName: 'Vikram Singh', standard: '9th', section: 'A', subject: 'Biology' },
        { teacherName: 'Sneha Reddy', standard: '10th', section: 'A', subject: 'English Literature' },
        { teacherName: 'Arjun Nair', standard: '10th', section: 'A', subject: 'Computer Science & AI' }
      ]
    });

    // 8. Timetable
    console.log('📅 8. Seeding Master Class Timetables...');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [
      { p: 1, start: '08:30', end: '09:15', sub: 'Mathematics', teacher: 'Dr. Rajesh Sharma', room: 'Room 301' },
      { p: 2, start: '09:15', end: '10:00', sub: 'Physics', teacher: 'Priya Patel', room: 'Science Lab 1' },
      { p: 3, start: '10:00', end: '10:45', sub: 'Chemistry', teacher: 'Ananya Sen', room: 'Chemistry Lab' },
      { p: 4, start: '11:00', end: '11:45', sub: 'English Literature', teacher: 'Sneha Reddy', room: 'Room 301' },
      { p: 5, start: '12:45', end: '01:30', sub: 'Computer Science & AI', teacher: 'Arjun Nair', room: 'AI Lab 2' },
      { p: 6, start: '01:30', end: '02:15', sub: 'Biology', teacher: 'Vikram Singh', room: 'Biology Lab' }
    ];

    for (const d of days) {
      for (const item of periods) {
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

    // 9. Students across classes
    console.log('🎓 9. Seeding Students & Attendance Records...');
    const studentProfiles = [
      { name: 'Rahul Student', email: 'student@example.com', std: '10th', sec: 'A', roll: '101', parent: 'Mr. & Mrs. Sharma', phone: '+91 98765 43210', uid: studentUser.id },
      { name: 'Aarav Sharma', email: 'aarav.sharma@qelvora.in', std: '10th', sec: 'A', roll: '102', parent: 'Mr. Alok Sharma', phone: '+91 98765 43211', uid: studentUser.id },
      { name: 'Ananya Roy', email: 'ananya.roy@qelvora.in', std: '10th', sec: 'A', roll: '103', parent: 'Dr. B. Roy', phone: '+91 98765 43212', uid: studentUser.id },
      { name: 'Vihaan Patel', email: 'vihaan.patel@qelvora.in', std: '10th', sec: 'A', roll: '104', parent: 'Mr. Kirit Patel', phone: '+91 98765 43213', uid: studentUser.id },
      { name: 'Diya Iyer', email: 'diya.iyer@qelvora.in', std: '9th', sec: 'A', roll: '201', parent: 'Mrs. Radhika Iyer', phone: '+91 98765 43214', uid: studentUser.id },
      { name: 'Rohan Das', email: 'rohan.das@qelvora.in', std: '9th', sec: 'A', roll: '202', parent: 'Mr. S. Das', phone: '+91 98765 43215', uid: studentUser.id },
      { name: 'Kyra Joshi', email: 'kyra.joshi@qelvora.in', std: '8th', sec: 'A', roll: '301', parent: 'Mr. Hemant Joshi', phone: '+91 98765 43216', uid: studentUser.id },
      { name: 'Aditya Sen', email: 'aditya.sen@qelvora.in', std: '7th', sec: 'A', roll: '401', parent: 'Mrs. Sen', phone: '+91 98765 43217', uid: studentUser.id }
    ];

    const seededStudents = [];
    for (let idx = 0; idx < studentProfiles.length; idx++) {
      const sp = studentProfiles[idx];
      const st = await prisma.student.create({
        data: {
          userId: sp.uid,
          studentId: `STU-${sp.std}-${sp.sec}-${sp.roll}`,
          name: sp.name,
          email: sp.email,
          standard: sp.std,
          section: sp.sec,
          rollNumber: sp.roll,
          parentName: sp.parent,
          parentPhone: sp.phone
        }
      });
      seededStudents.push(st);

      // Seed 7 days of attendance records for each student
      const targetClass = createdClasses[`${sp.std}-${sp.sec}`] || Object.values(createdClasses)[0];
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dateStr = getDateDaysAgo(dayOffset);
        await prisma.studentAttendance.create({
          data: {
            date: dateStr,
            classId: targetClass.id,
            studentName: sp.name,
            rollNumber: sp.roll,
            status: (idx + dayOffset) % 7 === 0 ? 'Absent' : 'Present',
            markedTime: '08:24 AM'
          }
        });
      }
    }

    // 10. Teacher Attendance records (past 7 days)
    console.log('📋 10. Seeding Faculty Attendance Records...');
    for (const t of teachersList) {
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dateStr = getDateDaysAgo(dayOffset);
        await prisma.teacherAttendance.create({
          data: {
            date: dateStr,
            teacherName: t.name,
            status: dayOffset === 2 && t.employeeId === 'EMP003' ? 'Leave' : 'Present',
            markedTime: `08:2${dayOffset} AM`
          }
        });
      }
    }

    // 11. Class Sessions Logs
    console.log('🎥 11. Seeding Live Class Session Logs...');
    await prisma.classSession.createMany({
      data: [
        { standard: '10th', section: 'A', subject: 'Mathematics', teacher: 'Dr. Rajesh Sharma', status: 'completed', startTime: new Date(Date.now() - 4 * 3600000), endTime: new Date(Date.now() - 3 * 3600000) },
        { standard: '10th', section: 'A', subject: 'Physics', teacher: 'Priya Patel', status: 'completed', startTime: new Date(Date.now() - 3 * 3600000), endTime: new Date(Date.now() - 2 * 3600000) },
        { standard: '10th', section: 'A', subject: 'Computer Science & AI', teacher: 'Arjun Nair', status: 'in-progress', startTime: new Date(Date.now() - 30 * 60000), endTime: null },
        { standard: '9th', section: 'A', subject: 'Biology', teacher: 'Vikram Singh', status: 'completed', startTime: new Date(Date.now() - 2 * 3600000), endTime: new Date(Date.now() - 1 * 3600000) },
        { standard: '9th', section: 'A', subject: 'English Literature', teacher: 'Sneha Reddy', status: 'completed', startTime: new Date(Date.now() - 1 * 3600000), endTime: new Date() }
      ]
    });

    // 12. Classroom Recorded Videos
    console.log('📹 12. Seeding Video Lectures...');
    await prisma.classroomVideo.createMany({
      data: [
        {
          title: 'Quadratic Equations & Roots Derivation',
          url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          standard: '10th',
          subject: 'Mathematics',
          description: 'Comprehensive derivation of the quadratic formula with real-world parabolic trajectory examples.'
        },
        {
          title: "Newton's Laws of Motion & Momentum Conservation",
          url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          standard: '10th',
          subject: 'Physics',
          description: 'Interactive demonstration of action-reaction force pairs and inelastic collision calculations.'
        },
        {
          title: 'Chemical Reactions, Balancing & Stoichiometry',
          url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          standard: '10th',
          subject: 'Chemistry',
          description: 'Step-by-step techniques to balance complex redox reactions and compute molar yields.'
        },
        {
          title: 'Cell Division: Mitosis & Meiosis Visualized',
          url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          standard: '9th',
          subject: 'Biology',
          description: 'Microscopic video captures of chromosome pairing and genetic recombination.'
        }
      ]
    });

    // 13. Teacher Feedbacks & Ratings
    console.log('⭐ 13. Seeding Parent & Student Feedback...');
    await prisma.teacherFeedback.createMany({
      data: [
        { teacherName: 'Dr. Rajesh Sharma', feedback: 'Dr. Sharma makes complex calculus and coordinate geometry extremely intuitive. My son scored 96% in his term exam!', rating: 5 },
        { teacherName: 'Priya Patel', feedback: 'Outstanding practical lab sessions! The interactive physics demonstrations keep students highly engaged.', rating: 5 },
        { teacherName: 'Ananya Sen', feedback: 'Very methodical and approachable. Regularly clarifies doubts and provides detailed feedback on homework.', rating: 5 },
        { teacherName: 'Arjun Nair', feedback: 'The AI and Python coding assignments are inspiring and well aligned with contemporary tech standards.', rating: 5 },
        { teacherName: 'Vikram Singh', feedback: 'Great diagrams and explanations on human anatomy. Highly recommended teacher.', rating: 4 }
      ]
    });

    // 14. Safe Pickup Authorizations
    console.log('🛡️ 14. Seeding Safe Pickup Authorizations...');
    const rahul = seededStudents[0];
    if (rahul) {
      await prisma.pickupAuthorization.createMany({
        data: [
          {
            studentId: rahul.id,
            authorizedPersonName: 'Smt. Sharda Sharma (Grandmother)',
            authorizedPersonPhone: '+91 98765 99001',
            otpCode: '849201',
            status: 'Active',
            expiresAt: new Date(Date.now() + 24 * 3600000)
          },
          {
            studentId: rahul.id,
            authorizedPersonName: 'Mr. Vikram Sharma (Uncle)',
            authorizedPersonPhone: '+91 98765 99002',
            otpCode: '517390',
            status: 'Active',
            expiresAt: new Date(Date.now() + 48 * 3600000)
          }
        ]
      });
    }

    // 15. Leave Requests
    console.log('📝 15. Seeding Faculty Leave Requests...');
    await prisma.leaveRequest.createMany({
      data: [
        { applicantName: 'Ananya Sen', applicantRole: 'Senior Educator', reason: 'Attending National Chemistry Teachers Conference in New Delhi', startDate: getDateDaysAgo(2), endDate: getDateDaysAgo(1), status: 'Approved' },
        { applicantName: 'Arjun Nair', applicantRole: 'Lab Coordinator', reason: 'Annual lab hardware procurement and system calibration seminar', startDate: getDateDaysAgo(-3), endDate: getDateDaysAgo(-4), status: 'Pending' }
      ]
    });

    // 16. Assessment Question Papers (Qelvora AI)
    console.log('📄 16. Seeding Assessment Question Papers...');
    await prisma.paper.createMany({
      data: [
        {
          id: 'QP-MATH-10A-2026',
          title: 'Grade 10 Mathematics Term-1 Diagnostic Assessment',
          paper: 'SECTION A: Multiple Choice (10 Marks)\n1. If one root of 2x^2 + kx - 6 = 0 is 2, find the value of k.\n2. State the Fundamental Theorem of Arithmetic.\n\nSECTION B: Analytical Problems (15 Marks)\n3. Solve for x and y using elimination: 3x + 4y = 10, 2x - 2y = 2.',
          answerKey: '1. k = -1\n2. Every composite number can be expressed uniquely as a product of primes.\n3. x = 2, y = 1',
          request: { standard: '10th', subject: 'Mathematics', totalMarks: 25, duration: '60 mins' }
        },
        {
          id: 'QP-PHYS-10A-2026',
          title: 'Grade 10 Physics Optics & Electricity Evaluation Paper',
          paper: 'SECTION A: Optics (15 Marks)\n1. Define refractive index in terms of speed of light.\n2. An object is placed 15 cm in front of a concave mirror of focal length 10 cm. Find position of image.',
          answerKey: '1. n = c / v\n2. Image distance v = -30 cm (Real and inverted, magnified 2x).',
          request: { standard: '10th', subject: 'Physics', totalMarks: 25, duration: '60 mins' }
        }
      ]
    });

    // 17. Security Audit Logs
    console.log('🔒 17. Seeding Security Audit Logs...');
    await prisma.securityAuditLog.createMany({
      data: [
        { userOrRole: 'admin@qelvora.in', action: 'SYSTEM_SETTINGS_UPDATE', details: 'Updated school operating hours and biometrics policies.', ipAddress: '127.0.0.1' },
        { userOrRole: 'rajesh.sharma@qelvora.in', action: 'DIRECT_LOGIN_ACCESS', details: 'Direct admin impersonation session initiated.', ipAddress: '127.0.0.1' },
        { userOrRole: 'system', action: 'DATABASE_INITIALIZATION', details: 'Full platform demo dataset synchronized into PostgreSQL.', ipAddress: '127.0.0.1' }
      ]
    });

    console.log('\n🎉 ====================================================');
    console.log('✅ ALL DEMO DATA SUCCESSFULLY POPULATED IN DATABASE!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedFullPlatform();
