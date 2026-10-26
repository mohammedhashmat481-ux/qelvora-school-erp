import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import SchoolSettings from '../models/SchoolSettings.js';
import Role from '../models/Role.js';
import Teacher from '../models/Teacher.js';
import NonTeachingStaff from '../models/NonTeachingStaff.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import Timetable from '../models/Timetable.js';
import TeacherAttendance from '../models/TeacherAttendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import SubstituteAssignment from '../models/SubstituteAssignment.js';
import Student from '../models/Student.js';
import StudentAttendance from '../models/StudentAttendance.js';
import TeacherClassSubjectMapping from '../models/TeacherClassSubjectMapping.js';
import User from '../models/User.js';
import ClassroomVideo from '../models/ClassroomVideo.js';
import TeacherFeedback from '../models/TeacherFeedback.js';
import Paper from '../models/Paper.js';

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/qelvora_school_crm_db';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'qelvora_school_crm_db';

const getTodayDateStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getDayName = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};

const ALL_STANDARDS = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Vihaan', 'Diya', 'Sai', 'Meera', 'Rohan', 'Ishaan', 'Kavya', 'Aditya',
  'Priya', 'Kabir', 'Zara', 'Arjun', 'Sneha', 'Vivaan', 'Kyra', 'Reyansh', 'Avani', 'Dhruv',
  'Myra', 'Ayaan', 'Saanvi', 'Atharv', 'Ira', 'Yash', 'Riya', 'Tanvi', 'Karan', 'Dev'
];

const LAST_NAMES = [
  'Sharma', 'Iyer', 'Patel', 'Sen', 'Krishna', 'Nair', 'Das', 'Roy', 'Reddy', 'Joshi',
  'Verma', 'Malhotra', 'Khan', 'Mehta', 'Patil', 'Gupta', 'Kapoor', 'Bose', 'Deshmukh', 'Saxena'
];

async function seedMaster() {
  try {
    console.log('Connecting to Local MongoDB database...');
    await mongoose.connect(MONGODB_URL, { dbName: MONGODB_DB_NAME });
    console.log('✅ Connected successfully!');

    const todayDate = getTodayDateStr();
    const todayDay = getDayName() === 'Sunday' ? 'Monday' : getDayName();

    console.log(`🚀 Seeding Complete Master Demo Data across ALL standards for Date: ${todayDate}...`);

    // 1. School Settings
    await SchoolSettings.deleteMany({});
    await SchoolSettings.create({
      schoolName: 'Qelvora School CRM',
      academicYear: '2026-2027',
      timings: { start: '08:00', end: '18:00' },
      period_duration_mins: 45,
      small_break_start: '10:30',
      small_break_mins: 15,
      lunch_break_start: '13:00',
      lunch_break_mins: 45
    });
    console.log('✅ 1. School Settings created.');

    // 2. Roles
    await Role.deleteMany({});
    await Role.insertMany([
      { RoleCode: 'R001', Rolename: 'School Principal', GantAdminPrevillage: true, CreatedBy: 'System' },
      { RoleCode: 'R002', Rolename: 'Department Head', GantAdminPrevillage: true, CreatedBy: 'System' },
      { RoleCode: 'R003', Rolename: 'Senior Educator', GantAdminPrevillage: false, CreatedBy: 'System' },
      { RoleCode: 'R004', Rolename: 'Assistant Teacher', GantAdminPrevillage: false, CreatedBy: 'System' },
      { RoleCode: 'R005', Rolename: 'Lab Coordinator', GantAdminPrevillage: false, CreatedBy: 'System' }
    ]);
    console.log('✅ 2. System Roles created.');

    // 3. Teachers
    await Teacher.deleteMany({});
    const teachersData = [
      { employeeId: 'EMP001', name: 'Dr. Rajesh Sharma', email: 'rajesh.sharma@qelvora.in', phone: '+91 9876543210', qualification: 'Ph.D. in Mathematics', experience: 12, status: 'Active' },
      { employeeId: 'EMP002', name: 'Priya Patel', email: 'priya.patel@qelvora.in', phone: '+91 9876543211', qualification: 'M.Sc. Physics', experience: 8, status: 'Active' },
      { employeeId: 'EMP003', name: 'Ananya Sen', email: 'ananya.sen@qelvora.in', phone: '+91 9876543212', qualification: 'M.Sc. Chemistry', experience: 6, status: 'Active' },
      { employeeId: 'EMP004', name: 'Vikram Singh', email: 'vikram.singh@qelvora.in', phone: '+91 9876543213', qualification: 'M.Sc. Biology', experience: 10, status: 'Active' },
      { employeeId: 'EMP005', name: 'Suresh Kumar', email: 'suresh.kumar@qelvora.in', phone: '+91 9876543214', qualification: 'M.Tech Computer Science', experience: 5, status: 'Active' },
      { employeeId: 'EMP006', name: 'Meera Nair', email: 'meera.nair@qelvora.in', phone: '+91 9876543215', qualification: 'M.A. English Literature', experience: 9, status: 'On Leave' },
      { employeeId: 'EMP007', name: 'Amitav Das', email: 'amitav.das@qelvora.in', phone: '+91 9876543216', qualification: 'M.A. History & Civics', experience: 7, status: 'Inactive' },
      { employeeId: 'EMP008', name: 'Neha Verma', email: 'neha.verma@qelvora.in', phone: '+91 9876543217', qualification: 'M.A. Foreign Languages', experience: 4, status: 'Active' }
    ];
    const teachers = await Teacher.insertMany(teachersData);
    console.log(`✅ 3. ${teachers.length} Teachers created.`);

    // 4. Non-Teaching Staff
    await NonTeachingStaff.deleteMany({});
    await NonTeachingStaff.insertMany([
      { employeeId: 'NTS001', name: 'Ramesh Sundaram', email: 'ramesh.admin@qelvora.in', phone: '+91 9876590001', staffRole: 'Administrative Officer', status: 'Active' },
      { employeeId: 'NTS002', name: 'Sunita Reddy', email: 'sunita.lib@qelvora.in', phone: '+91 9876590002', staffRole: 'Head Librarian', status: 'Active' },
      { employeeId: 'NTS003', name: 'Gopalan K', email: 'gopalan.lab@qelvora.in', phone: '+91 9876590003', staffRole: 'Senior Lab Assistant', status: 'Active' }
    ]);
    console.log('✅ 4. Non-Teaching Staff created.');

    // 5. Classes across ALL standards (Nursery to 12th)
    await Class.deleteMany({});
    const classesData = [];
    let tIdx = 0;

    for (const std of ALL_STANDARDS) {
      // Create Section A and Section B for each standard
      classesData.push({
        standard: std,
        section: 'A',
        board: 'CBSE',
        classTeacher: teachers[tIdx % teachers.length]._id,
        strength: 35
      });
      tIdx++;
      classesData.push({
        standard: std,
        section: 'B',
        board: 'CBSE',
        classTeacher: teachers[tIdx % teachers.length]._id,
        strength: 34
      });
      tIdx++;

      // Also create 'Grade X' variant so searches for 'Grade 9' or '9th' or '9' work everywhere
      if (!['Nursery', 'LKG', 'UKG'].includes(std)) {
        const numOnly = std.replace(/\D/g, '');
        if (numOnly) {
          classesData.push({
            standard: `Grade ${numOnly}`,
            section: 'A',
            board: 'CBSE',
            classTeacher: teachers[tIdx % teachers.length]._id,
            strength: 40
          });
          tIdx++;
        }
      }
    }
    const classes = await Class.insertMany(classesData);
    console.log(`✅ 5. ${classes.length} Classes created across ALL standards (Nursery - 12th).`);

    // 6. Subjects
    await Subject.deleteMany({});
    const subjectsData = [
      { code: 'MATH101', name: 'Mathematics', department: 'Mathematics' },
      { code: 'PHYS101', name: 'Physics', department: 'Science' },
      { code: 'CHEM101', name: 'Chemistry', department: 'Science' },
      { code: 'BIOL101', name: 'Biology', department: 'Science' },
      { code: 'CS101', name: 'Computer Science', department: 'Technology' },
      { code: 'ENG101', name: 'English Literature', department: 'Languages' },
      { code: 'HIST101', name: 'Social Studies & History', department: 'Humanities' }
    ];
    const subjects = await Subject.insertMany(subjectsData);
    console.log(`✅ 6. ${subjects.length} Subjects created.`);

    // 7. Mappings
    await TeacherClassSubjectMapping.deleteMany({});
    const mappings = [];
    for (let i = 0; i < classes.length; i++) {
      mappings.push({
        teacher: teachers[i % teachers.length]._id,
        class: classes[i]._id,
        subject: subjects[i % subjects.length]._id,
        academicYear: '2026-2027'
      });
    }
    await TeacherClassSubjectMapping.insertMany(mappings);
    console.log('✅ 7. Teacher-Class-Subject Mappings created.');

    // 8. Timetable
    await Timetable.deleteMany({});
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlots = [
      '08:00-08:45', '08:45-09:30', '09:30-10:15', '10:45-11:30',
      '11:30-12:15', '12:15-13:00', '13:45-14:30', '14:30-15:15'
    ];

    const timetables = [];
    for (const dayName of days) {
      for (let cIdx = 0; cIdx < classes.length; cIdx++) {
        for (let p = 1; p <= 8; p++) {
          const teacherIdx = (cIdx + p) % teachers.length;
          const subIdx = (cIdx + p) % subjects.length;
          timetables.push({
            class: classes[cIdx]._id,
            day: dayName,
            period: p,
            timeSlot: timeSlots[p - 1] || '09:00-09:45',
            teacher: teachers[teacherIdx]._id,
            subject: subjects[subIdx]._id
          });
        }
      }
    }
    const createdTimetables = await Timetable.insertMany(timetables);
    console.log(`✅ 8. ${createdTimetables.length} Timetable entries created across 6 days.`);

    // 9. Teacher Attendance
    await TeacherAttendance.deleteMany({});
    const now = new Date();
    const attendanceRecords = [
      { date: todayDate, teacher: teachers[0]._id, status: 'Present', punchIn: new Date(now.setHours(8, 5, 0, 0)), address: 'Main Gate Kiosk (Geofence Verified)' },
      { date: todayDate, teacher: teachers[1]._id, status: 'Present', punchIn: new Date(now.setHours(8, 12, 0, 0)), address: 'Faculty Lounge Kiosk' },
      { date: todayDate, teacher: teachers[2]._id, status: 'Present', punchIn: new Date(now.setHours(8, 15, 0, 0)), address: 'Main Gate Kiosk' },
      { date: todayDate, teacher: teachers[3]._id, status: 'Present', punchIn: new Date(now.setHours(8, 20, 0, 0)), address: 'Science Lab Kiosk' },
      { date: todayDate, teacher: teachers[4]._id, status: 'Present', punchIn: new Date(now.setHours(8, 25, 0, 0)), address: 'CS Lab Kiosk' },
      { date: todayDate, teacher: teachers[5]._id, status: 'Leave', address: 'Home (Approved Medical Leave)' },
      { date: todayDate, teacher: teachers[6]._id, status: 'Absent', address: 'Unexcused Absence' },
      { date: todayDate, teacher: teachers[7]._id, status: 'Present', punchIn: new Date(now.setHours(8, 30, 0, 0)), address: 'Main Gate Kiosk' }
    ];
    await TeacherAttendance.insertMany(attendanceRecords);
    console.log('✅ 9. Teacher Attendance logs created.');

    // 10. Leave Requests
    await LeaveRequest.deleteMany({});
    await LeaveRequest.insertMany([
      { teacher: teachers[5]._id, leaveDate: todayDate, reason: 'Medical Leave - High Fever & Doctor Visit', status: 'Approved' },
      { teacher: teachers[6]._id, leaveDate: '2026-08-05', reason: 'Personal Leave - Family Event', status: 'Pending' },
      { teacher: teachers[7]._id, leaveDate: '2026-08-06', reason: 'Official Duty - CBSE Teacher Workshop', status: 'Pending' },
      { teacher: teachers[1]._id, leaveDate: '2026-07-28', reason: 'Casual Leave', status: 'Approved' }
    ]);
    console.log('✅ 10. Leave Requests created.');

    // 11. Substitute Assignment
    await SubstituteAssignment.deleteMany({});
    const sampleTt = createdTimetables[0];
    await SubstituteAssignment.create({
      date: todayDate,
      timetableEntry: sampleTt._id,
      period: sampleTt.period,
      class: sampleTt.class,
      originalTeacher: teachers[5]._id,
      substituteTeacher: teachers[0]._id,
      subject: sampleTt.subject,
      status: 'Assigned'
    });
    console.log('✅ 11. Substitute Assignment created.');

    // 12. Students across EVERY SINGLE standard & section
    await Student.deleteMany({});
    let studentUser = await User.findOne({ role: 'student' });
    if (!studentUser) {
      studentUser = await User.create({
        name: 'Rahul Student',
        email: 'student@example.com',
        password_hash: 'Welcome@123',
        role: 'student',
        skip_face: true
      });
    }

    const studentsData = [];
    let studentCounter = 1;

    for (const std of ALL_STANDARDS) {
      for (const sec of ['A', 'B']) {
        for (let i = 0; i < 4; i++) {
          const fn = FIRST_NAMES[(studentCounter + i) % FIRST_NAMES.length];
          const ln = LAST_NAMES[(studentCounter * 3 + i) % LAST_NAMES.length];
          const fullName = `${fn} ${ln}`;
          const stdNum = std.replace(/\D/g, '') || '0';
          const rollNo = `${stdNum}${sec === 'A' ? '0' : '1'}${i + 1}`;
          const stId = `STU-${std.toUpperCase()}-${sec}-${String(i + 1).padStart(2, '0')}`;

          studentsData.push({
            user: studentUser._id,
            studentId: stId,
            name: fullName,
            email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${std.toLowerCase()}${sec.toLowerCase()}@qelvora.in`,
            standard: std,
            section: sec,
            rollNumber: rollNo,
            parentName: `Mr. & Mrs. ${ln}`,
            parentPhone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`
          });

          // Also add 'Grade X' variant student so searches for 'Grade 9' find students too
          if (!['Nursery', 'LKG', 'UKG'].includes(std) && stdNum && sec === 'A' && i === 0) {
            studentsData.push({
              user: studentUser._id,
              studentId: `STU-GRD${stdNum}-A-01`,
              name: `${fn} ${ln}`,
              email: `${fn.toLowerCase()}.${ln.toLowerCase()}.grd${stdNum}@qelvora.in`,
              standard: `Grade ${stdNum}`,
              section: sec,
              rollNumber: `${stdNum}01`,
              parentName: `Mr. & Mrs. ${ln}`,
              parentPhone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`
            });
          }
        }
        studentCounter += 4;
      }
    }

    await Student.insertMany(studentsData);
    console.log(`✅ 12. ${studentsData.length} Students created across ALL standards (Nursery - 12th).`);

    // 13. Student Attendance Grid Records for ALL classes
    try {
      await StudentAttendance.collection.dropIndexes();
    } catch (_) {}
    await StudentAttendance.deleteMany({});

    const studentAttData = [];
    const statuses = ['Present', 'Present', 'Present', 'Absent', 'Late'];
    let attTimeMinutes = 8 * 60 + 30; // 08:30 AM

    for (const clsItem of classes) {
      // Find students belonging to this class standard
      const matchingStudents = studentsData.filter(s => s.standard === clsItem.standard && s.section === clsItem.section);
      const listToSeed = matchingStudents.length > 0 ? matchingStudents : [
        { name: 'Aarav Sharma', rollNumber: '101' },
        { name: 'Ananya Iyer', rollNumber: '102' },
        { name: 'Vihaan Patel', rollNumber: '103' }
      ];

      for (let idx = 0; idx < listToSeed.length; idx++) {
        const stu = listToSeed[idx];
        const sName = stu.name || stu.studentName;
        const sRoll = stu.rollNumber || String(idx + 1).padStart(2, '0');
        const st = statuses[(idx + Math.floor(Math.random() * 3)) % statuses.length];
        
        const hrs = String(Math.floor(attTimeMinutes / 60)).padStart(2, '0');
        const mins = String(attTimeMinutes % 60).padStart(2, '0');
        const timeStr = `${hrs}:${mins} AM`;
        attTimeMinutes = (attTimeMinutes + 1) % (12 * 60);

        studentAttData.push({
          date: todayDate,
          class: clsItem._id,
          studentName: sName,
          rollNumber: sRoll,
          status: st,
          markedTime: timeStr
        });
      }
    }

    await StudentAttendance.insertMany(studentAttData);
    console.log(`✅ 13. ${studentAttData.length} Student Attendance Grid records created across ALL classes.`);

    // 14. Classroom Videos / Session Recordings
    await ClassroomVideo.deleteMany({});
    const sampleVideos = [
      {
        title: 'Nursery Phonics & Alphabet Rhymes Session',
        subject: 'English Literature',
        teacher: teachers[0]._id,
        teacherName: teachers[0].name,
        teacherId: teachers[0].employeeId,
        standard: 'Nursery',
        section: 'A',
        description: 'Interactive phonics sounds, nursery rhymes, and colorful letter recognition exercises.',
        duration: '25:00',
        videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
        status: 'Approved'
      },
      {
        title: 'Quadratic Equations & Complex Roots Masterclass',
        subject: 'Mathematics',
        teacher: teachers[0]._id,
        teacherName: teachers[0].name,
        teacherId: teachers[0].employeeId,
        standard: 'Grade 9',
        section: 'A',
        description: 'Comprehensive derivation of the quadratic formula, discriminant properties, and graph parabola vertex analysis.',
        duration: '42:15',
        videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
        status: 'Approved'
      },
      {
        title: 'Newton Laws of Motion & Friction Mechanics',
        subject: 'Physics',
        teacher: teachers[1]._id,
        teacherName: teachers[1].name,
        teacherId: teachers[1].employeeId,
        standard: 'Grade 9',
        section: 'A',
        description: 'Free body diagrams, static and kinetic friction coefficient calculations with real laboratory demonstrations.',
        duration: '45:00',
        videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
        status: 'Approved'
      },
      {
        title: 'Chemical Bonding & Molecular Orbital Theory',
        subject: 'Chemistry',
        teacher: teachers[2]._id,
        teacherName: teachers[2].name,
        teacherId: teachers[2].employeeId,
        standard: 'Grade 10',
        section: 'A',
        description: 'Ionic, covalent, and metallic bonding mechanisms explained with 3D structural representations.',
        duration: '38:30',
        videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
        status: 'Approved'
      }
    ];
    const createdVideos = await ClassroomVideo.insertMany(sampleVideos);
    console.log(`✅ 14. ${createdVideos.length} Classroom Videos created.`);

    // 15. Teacher Feedbacks & Parent Reviews
    await TeacherFeedback.deleteMany({});
    await TeacherFeedback.insertMany([
      {
        student: studentUser._id,
        studentName: 'Aarav Sharma (Parent)',
        teacherId: teachers[0].employeeId,
        teacherName: teachers[0].name,
        videoId: createdVideos[0]._id,
        rating: 5,
        suggestion: 'Wonderful Nursery phonics class! My child loves the interactive alphabet rhymes.',
        submittedBy: 'parent'
      },
      {
        student: studentUser._id,
        studentName: 'Ananya Iyer (Student)',
        teacherId: teachers[1].employeeId,
        teacherName: teachers[1].name,
        videoId: createdVideos[1]._id,
        rating: 5,
        suggestion: 'Great physics experiments! Free body diagrams were crystal clear.',
        submittedBy: 'student'
      }
    ]);
    console.log('✅ 15. Teacher Feedback & Parent Reviews created.');

    // 16. Question Papers
    await Paper.deleteMany({});
    await Paper.insertMany([
      {
        id: 'QP-NUR-01A-2026',
        title: 'Nursery English & Color Recognition Activity Sheet',
        paper: `SECTION A (Matching)
1. Match letter A to Apple image.
2. Circle all red circles on the page.`,
        answer_key: '1. A -> Apple\n2. 3 red circles on left margin',
        request: { standard: 'Nursery', subject: 'English Literature', totalMarks: 10 }
      },
      {
        id: 'QP-MATH-09A-2026',
        title: 'Grade 9 Mathematics Mid-Term Assessment Paper',
        paper: `SECTION A (10 Marks)
1. Solve for x: 2x^2 + 5x - 12 = 0.
2. Find the discriminant of 3x^2 - 4x + 2 = 0.`,
        answer_key: '1. x = 1.5 or x = -4\n2. D = -8 (No real roots)',
        request: { standard: 'Grade 9', subject: 'Mathematics', totalMarks: 25 }
      }
    ]);
    console.log('✅ 16. Sample Question Papers created.');

    console.log('\n🎉 ALL MASTER DEMO DATA SUCCESSFULLY SEEDED ACROSS EVERY SINGLE CLASS (NURSERY TO 12TH)!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Master Seeding failed:', err);
    process.exit(1);
  }
}

seedMaster();
