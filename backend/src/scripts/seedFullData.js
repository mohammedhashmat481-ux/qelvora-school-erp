import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import SchoolSettings from '../models/SchoolSettings.js';
import Teacher from '../models/Teacher.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import Timetable from '../models/Timetable.js';
import TeacherAttendance from '../models/TeacherAttendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import SubstituteAssignment from '../models/SubstituteAssignment.js';
import Student from '../models/Student.js';
import TeacherClassSubjectMapping from '../models/TeacherClassSubjectMapping.js';
import User from '../models/User.js';

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb+srv://rakesh_rk:Rakesh2005@faceauth.jvni6bv.mongodb.net/?appName=faceauth';
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

async function seed() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URL, { dbName: MONGODB_DB_NAME });
    console.log('✅ Connected successfully!');

    const todayDate = getTodayDateStr();
    const todayDay = getDayName() === 'Sunday' ? 'Monday' : getDayName();

    console.log(`Seeding data for Date: ${todayDate}, Day: ${todayDay}...`);

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
    console.log('✅ School Settings created.');

    // 2. Teachers
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
    console.log(`✅ ${teachers.length} Teachers created.`);

    // 3. Classes
    await Class.deleteMany({});
    const classesData = [
      { standard: 'Grade 9', section: 'A', board: 'CBSE', classTeacher: teachers[0]._id, strength: 42 },
      { standard: 'Grade 9', section: 'B', board: 'CBSE', classTeacher: teachers[1]._id, strength: 40 },
      { standard: 'Grade 10', section: 'A', board: 'CBSE', classTeacher: teachers[2]._id, strength: 45 },
      { standard: 'Grade 10', section: 'B', board: 'CBSE', classTeacher: teachers[3]._id, strength: 44 },
      { standard: 'Grade 11', section: 'Sci', board: 'CBSE', classTeacher: teachers[4]._id, strength: 38 },
      { standard: 'Grade 12', section: 'Sci', board: 'CBSE', classTeacher: teachers[5]._id, strength: 36 }
    ];
    const classes = await Class.insertMany(classesData);
    console.log(`✅ ${classes.length} Classes created.`);

    // 4. Subjects
    await Subject.deleteMany({});
    const subjectsData = [
      { code: 'MATH101', name: 'Mathematics', department: 'Mathematics' },
      { code: 'PHYS101', name: 'Physics', department: 'Science' },
      { code: 'CHEM101', name: 'Chemistry', department: 'Science' },
      { code: 'BIOL101', name: 'Biology', department: 'Science' },
      { code: 'CS101', name: 'Computer Science', department: 'Technology' },
      { code: 'ENG101', name: 'English Literature', department: 'Languages' }
    ];
    const subjects = await Subject.insertMany(subjectsData);
    console.log(`✅ ${subjects.length} Subjects created.`);

    // 5. Mappings
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
    console.log('✅ Teacher-Class-Subject Mappings created.');

    // 6. Timetable
    await Timetable.deleteMany({});
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlots = [
      '08:00-08:45',
      '08:45-09:30',
      '09:30-10:15',
      '10:45-11:30',
      '11:30-12:15',
      '12:15-13:00',
      '13:45-14:30',
      '14:30-15:15',
      '15:15-16:00',
      '16:00-16:45',
      '16:45-17:30'
    ];

    const timetables = [];
    for (const dayName of days) {
      for (let cIdx = 0; cIdx < classes.length; cIdx++) {
        for (let p = 1; p <= 11; p++) {
          const tIdx = (cIdx + p) % teachers.length;
          const sIdx = (cIdx + p) % subjects.length;
          timetables.push({
            class: classes[cIdx]._id,
            day: dayName,
            period: p,
            timeSlot: timeSlots[p - 1] || '09:00-09:45',
            teacher: teachers[tIdx]._id,
            subject: subjects[sIdx]._id
          });
        }
      }
    }
    const createdTimetables = await Timetable.insertMany(timetables);
    console.log(`✅ ${createdTimetables.length} Timetable entries created across 6 days.`);

    // 7. Teacher Attendance (Today)
    await TeacherAttendance.deleteMany({});
    const now = new Date();
    const attendanceRecords = [
      { date: todayDate, teacher: teachers[0]._id, status: 'Present', punchIn: new Date(now.setHours(8, 5, 0, 0)), address: 'Main Gate Kiosk' },
      { date: todayDate, teacher: teachers[1]._id, status: 'Present', punchIn: new Date(now.setHours(8, 12, 0, 0)), address: 'Faculty Lounge Kiosk' },
      { date: todayDate, teacher: teachers[2]._id, status: 'Present', punchIn: new Date(now.setHours(8, 15, 0, 0)), address: 'Main Gate Kiosk' },
      { date: todayDate, teacher: teachers[3]._id, status: 'Present', punchIn: new Date(now.setHours(8, 20, 0, 0)), address: 'Science Lab Kiosk' },
      { date: todayDate, teacher: teachers[4]._id, status: 'Present', punchIn: new Date(now.setHours(8, 25, 0, 0)), address: 'CS Lab Kiosk' },
      { date: todayDate, teacher: teachers[5]._id, status: 'Leave', address: 'Home (Approved Leave)' },
      { date: todayDate, teacher: teachers[6]._id, status: 'Absent', address: 'Unexcused Absence' },
      { date: todayDate, teacher: teachers[7]._id, status: 'Present', punchIn: new Date(now.setHours(8, 30, 0, 0)), address: 'Main Gate Kiosk' }
    ];
    await TeacherAttendance.insertMany(attendanceRecords);
    console.log('✅ Teacher Attendance logs created for today.');

    // 8. Leave Requests & Historic Leaves
    await LeaveRequest.deleteMany({});
    const leaveRequests = [
      { teacher: teachers[5]._id, leaveDate: todayDate, reason: 'Medical Leave - High Fever & Doctor Visit', status: 'Approved' },
      { teacher: teachers[6]._id, leaveDate: '2026-08-05', reason: 'Personal Leave - Family Event', status: 'Pending' },
      { teacher: teachers[7]._id, leaveDate: '2026-08-06', reason: 'Official Duty - CBSE Teacher Workshop', status: 'Pending' },
      { teacher: teachers[1]._id, leaveDate: '2026-07-28', reason: 'Sick Leave', status: 'Approved' },
      { teacher: teachers[2]._id, leaveDate: '2026-07-20', reason: 'Casual Leave', status: 'Approved' }
    ];
    await LeaveRequest.insertMany(leaveRequests);
    console.log('✅ Pending & Historic Leave Requests created.');

    // 9. Substitute Assignments
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
    console.log('✅ Substitute Assignment created.');

    // 10. Students & Student User accounts
    await Student.deleteMany({});
    const studentUser = await User.findOne({ role: 'student' }) || await User.findOne({});
    if (studentUser) {
      const studentsData = [
        { user: studentUser._id, studentId: 'STU001', name: 'Rahul Sharma', email: 'rahul.sharma@qelvora.in', standard: '5th', section: 'A', rollNumber: '501', parentName: 'Mr. & Mrs. Sharma', parentPhone: '+91 9876500001' },
        { user: studentUser._id, studentId: 'STU002', name: 'Ananya Iyer', email: 'ananya.iyer@qelvora.in', standard: '5th', section: 'A', rollNumber: '502', parentName: 'Mr. Iyer', parentPhone: '+91 9876500002' },
        { user: studentUser._id, studentId: 'STU003', name: 'Vardhan SK', email: 'vardhan.sk@qelvora.in', standard: '5th', section: 'A', rollNumber: '503', parentName: 'Mr. SK', parentPhone: '+91 9876500003' },
        { user: studentUser._id, studentId: 'STU004', name: 'Vihaan Patel', email: 'vihaan.patel@qelvora.in', standard: '5th', section: 'B', rollNumber: '504', parentName: 'Mr. Patel', parentPhone: '+91 9876500004' },
        { user: studentUser._id, studentId: 'STU005', name: 'Aarav Sharma', email: 'aarav.sharma@qelvora.in', standard: '9th', section: 'A', rollNumber: '901', parentName: 'Mr. Sharma', parentPhone: '+91 9876500005' },
        { user: studentUser._id, studentId: 'STU006', name: 'Riya Gupta', email: 'riya.gupta@qelvora.in', standard: '9th', section: 'A', rollNumber: '902', parentName: 'Mr. Gupta', parentPhone: '+91 9876500006' },
        { user: studentUser._id, studentId: 'STU007', name: 'Karan Patel', email: 'karan.patel@qelvora.in', standard: '9th', section: 'B', rollNumber: '903', parentName: 'Mr. Patel', parentPhone: '+91 9876500007' },
        { user: studentUser._id, studentId: 'STU008', name: 'Sneha Reddy', email: 'sneha.reddy@qelvora.in', standard: '10th', section: 'A', rollNumber: '1001', parentName: 'Mr. Reddy', parentPhone: '+91 9876500008' },
        { user: studentUser._id, studentId: 'STU009', name: 'Ishaan Roy', email: 'ishaan.roy@qelvora.in', standard: '11th', section: 'A', rollNumber: '1101', parentName: 'Mr. Roy', parentPhone: '+91 9876500009' },
        { user: studentUser._id, studentId: 'STU010', name: 'Zara Khan', email: 'zara.khan@qelvora.in', standard: '12th', section: 'A', rollNumber: '1201', parentName: 'Mr. Khan', parentPhone: '+91 9876500010' }
      ];
      await Student.insertMany(studentsData);
      console.log('✅ Students created across 5th, 9th, 10th, 11th, and 12th standards.');
    }

    console.log('\n🎉 ALL DUMMY DATA SUCCESSFULLY SEEDED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
