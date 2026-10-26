import Timetable from '../models/Timetable.js';
import Teacher from '../models/Teacher.js';
import TeacherAttendance from '../models/TeacherAttendance.js';
import SubstituteAssignment from '../models/SubstituteAssignment.js';
import Notification from '../models/Notification.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import ClassSession from '../models/ClassSession.js';
import { escapeRegex, safeError, auditLog } from '../utils/security.js';

const getISTTime = () => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 5.5));
};

const getLocalDateString = () => {
  const ist = getISTTime();
  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, '0');
  const dd = String(ist.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getDayFromDate = (dateStr) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const d = new Date(dateStr);
  return days[d.getDay()];
};

/**
 * Helper to parse timeSlot (e.g. "09:00-09:45") and check if it's completed, active, or upcoming
 */
const getPeriodStatus = (timeSlot) => {
  try {
    const [startStr, endStr] = timeSlot.split('-');
    const now = getISTTime();
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    const startTime = getISTTime();
    startTime.setHours(startH, startM, 0, 0);

    const endTime = getISTTime();
    endTime.setHours(endH, endM, 0, 0);

    if (now > endTime) return 'completed';
    if (now >= startTime && now <= endTime) return 'active';
    return 'upcoming';
  } catch {
    return 'upcoming';
  }
};

const getClassDuration = (timeSlot) => {
  try {
    const [startStr, endStr] = timeSlot.split('-');
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    const diffMins = (endH * 60 + endM) - (startH * 60 + startM);
    return diffMins > 0 ? diffMins : 45;
  } catch {
    return 45;
  }
};

const isPeriodLateBy10Mins = (timeSlot) => {
  try {
    const [startStr, endStr] = timeSlot.split('-');
    const now = getISTTime();
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    const startTime = getISTTime();
    startTime.setHours(startH, startM, 0, 0);

    const endTime = getISTTime();
    endTime.setHours(endH, endM, 0, 0);

    if (now > endTime) return false;

    const tenMinsLater = new Date(startTime.getTime() + 10 * 60 * 1000);
    return now >= tenMinsLater;
  } catch {
    return false;
  }
};

export const getSchoolPeriods = async () => {
  try {
    const SchoolSettings = (await import('../models/SchoolSettings.js')).default;
    const settings = await SchoolSettings.findOne();
    if (!settings) return { periods: [], settings: null };

    if (settings.schoolName && settings.schoolName.toLowerCase().includes('chaitanya')) {
      const chaitanyaPeriods = [
        { period: 1, start: '08:20', end: '09:00', timeSlot: '08:20-09:00' },
        { period: 2, start: '09:00', end: '09:40', timeSlot: '09:00-09:40' },
        { period: 3, start: '09:50', end: '10:30', timeSlot: '09:50-10:30' },
        { period: 4, start: '10:30', end: '11:10', timeSlot: '10:30-11:10' },
        { period: 5, start: '11:10', end: '11:50', timeSlot: '11:10-11:50' },
        { period: 6, start: '11:50', end: '12:30', timeSlot: '11:50-12:30' },
        { period: 7, start: '13:00', end: '13:40', timeSlot: '13:00-13:40' },
        { period: 8, start: '13:40', end: '14:20', timeSlot: '13:40-14:20' },
        { period: 9, start: '14:20', end: '15:00', timeSlot: '14:20-15:00' },
        { period: 10, start: '15:10', end: '15:40', timeSlot: '15:10-15:40' },
        { period: 11, start: '15:40', end: '16:10', timeSlot: '15:40-16:10' }
      ];
      return { periods: chaitanyaPeriods, settings };
    }
    
    const startStr = settings.timings?.start || '09:00';
    const endStr = settings.timings?.end || '16:00';
    const periodMins = settings.period_duration_mins || 45;
    
    const smallBreakStart = settings.small_break_start || '10:30';
    const smallBreakMins = settings.small_break_mins || 15;
    
    const lunchBreakStart = settings.lunch_break_start || '12:00';
    const lunchBreakMins = settings.lunch_break_mins || 45;

    const timeToMins = (str) => {
      const [h, m] = str.split(':').map(Number);
      return h * 60 + m;
    };

    const minsToTime = (m) => {
      const h = Math.floor(m / 60) % 24;
      const mins = m % 60;
      return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const startMins = timeToMins(startStr);
    const endMins = timeToMins(endStr);
    const smallStartMins = timeToMins(smallBreakStart);
    const smallEndMins = smallStartMins + smallBreakMins;
    const lunchStartMins = timeToMins(lunchBreakStart);
    const lunchEndMins = lunchStartMins + lunchBreakMins;

    const periods = [];
    let currentMins = startMins;
    let periodIndex = 1;

    while (currentMins + periodMins <= endMins) {
      if (currentMins >= smallStartMins && currentMins < smallEndMins) {
        currentMins = smallEndMins;
        continue;
      }
      if (currentMins < smallStartMins && currentMins + periodMins > smallStartMins) {
        currentMins = smallEndMins;
        continue;
      }

      if (currentMins >= lunchStartMins && currentMins < lunchEndMins) {
        currentMins = lunchEndMins;
        continue;
      }
      if (currentMins < lunchStartMins && currentMins + periodMins > lunchStartMins) {
        currentMins = lunchEndMins;
        continue;
      }

      const slotStart = currentMins;
      const slotEnd = currentMins + periodMins;
      
      periods.push({
        period: periodIndex,
        start: minsToTime(slotStart),
        end: minsToTime(slotEnd),
        timeSlot: `${minsToTime(slotStart)}-${minsToTime(slotEnd)}`
      });

      periodIndex++;
      currentMins = slotEnd;
    }

    return { periods, settings };
  } catch (err) {
    console.error('getSchoolPeriods error:', err);
    return { periods: [], settings: null };
  }
};

const getAllTimetableForDate = async (dateStr, day) => {
  const classes = await Class.find().lean();
  const allEntries = [];
  const { periods } = await getSchoolPeriods();

  const classIds = classes.map(c => c._id);
  const [allOverrides, allDefaults] = await Promise.all([
    Timetable.find({ class: { $in: classIds }, date: dateStr })
      .populate('class', 'standard section board strength')
      .populate('teacher', 'name employeeId')
      .populate('subject', 'name')
      .lean(),
    Timetable.find({ class: { $in: classIds }, day, $or: [{ date: null }, { date: { $exists: false } }] })
      .populate('class', 'standard section board strength')
      .populate('teacher', 'name employeeId')
      .populate('subject', 'name')
      .lean()
  ]);

  const overridesByClass = {};
  const defaultsByClass = {};

  for (const entry of allOverrides) {
    const cId = (entry.class?._id || entry.class).toString();
    if (!overridesByClass[cId]) overridesByClass[cId] = [];
    overridesByClass[cId].push(entry);
  }

  for (const entry of allDefaults) {
    const cId = (entry.class?._id || entry.class).toString();
    if (!defaultsByClass[cId]) defaultsByClass[cId] = [];
    defaultsByClass[cId].push(entry);
  }

  for (const cls of classes) {
    const cId = cls._id.toString();
    const overrides = overridesByClass[cId] || [];
    const defaults = defaultsByClass[cId] || [];

    const merged = [];
    const periodsCovered = new Set();
    for (const ov of overrides) {
      merged.push(ov);
      periodsCovered.add(ov.period);
    }
    for (const df of defaults) {
      if (!periodsCovered.has(df.period)) {
        merged.push(df);
      }
    }
    allEntries.push(...merged);
  }

  // Dynamic override of timeSlot strings based on recalculated settings
  for (const entry of allEntries) {
    const calcSlot = periods.find(p => p.period === entry.period);
    if (calcSlot) {
      entry.timeSlot = calcSlot.timeSlot;
    }
  }

  return allEntries;
};

/**
 * Teacher Dashboard Data
 */
export const calculatePeriodStatuses = (timetable, todayStr, attendances, substitutes, sessions) => {
  const allTodayPeriods = [];
  let greenClasses = 0;
  let redClasses = 0;
  let goldClasses = 0;

  // 1. Process scheduled timetable entries
  for (const p of timetable) {
    if (!p.class) continue;

    // Check if original teacher is present in school today
    const attendance = (p.teacher && p.teacher._id && attendances)
      ? attendances.find(att => att.teacher && att.teacher.toString() === p.teacher._id.toString())
      : null;
    const isPresentInSchool = attendance && attendance.status === 'Present';
    const isAbsent = p.teacher ? (attendance ? ['Absent', 'Leave'].includes(attendance.status) : true) : false;

    // Check if substitute is assigned
    const sub = substitutes.find(s => {
      const sClassId = (s.class?._id || s.class || '').toString();
      const pClassId = (p.class?._id || p.class || '').toString();
      return sClassId === pClassId && s.period === p.period;
    });

    // Fetch ClassSession
    const session = sessions.find(s => {
      const sClassId = (s.class?._id || s.class || '').toString();
      const pClassId = (p.class?._id || p.class || '').toString();
      return sClassId === pClassId && s.period === p.period;
    });

    const hasClassLog = session ? true : false;
    const classCompleted = session && session.status === 'completed';

    // Determine color
    let color = 'neutral';
    let statusText = 'Upcoming';
    let isLateAlert = false;

    if (session) {
      const isLive = session.status === 'active';
      color = isLive ? 'green' : 'neutral';
      const teacherName = session.teacher?.name || 'Unknown Teacher';
      if (sub) {
        statusText = `Arranged: ${teacherName} (${isLive ? 'Logged In' : 'Logged Out'})`;
      } else {
        statusText = isLive ? 'Logged In' : 'Logged Out';
      }
      if (isLive) {
        greenClasses++;
      }
    } else if (sub) {
      color = 'gold';
      statusText = `Arranged: ${sub.substituteTeacher?.name || 'Unknown'} (Pending)`;
      goldClasses++;
    } else {
      const pStatus = getPeriodStatus(p.timeSlot);
      const isLate = isPeriodLateBy10Mins(p.timeSlot);

      if (!p.teacher) {
        color = 'neutral';
        statusText = 'No Teacher Assigned';
      } else if (isAbsent) {
        color = 'red';
        statusText = 'Teacher Absent';
        redClasses++;
      } else if (pStatus === 'completed') {
        color = 'red';
        statusText = 'Missed Class';
        redClasses++;
      } else if (pStatus === 'active') {
        if (isLate) {
          if (isPresentInSchool) {
            color = 'red';
            statusText = 'Not Logged In (10 Min Alert)';
            isLateAlert = true;
            redClasses++;
          } else {
            color = 'red';
            statusText = 'Teacher Absent';
            redClasses++;
          }
        } else {
          color = 'neutral';
          statusText = 'Class Started (Grace Period)';
        }
      } else {
        color = 'neutral';
        statusText = 'Upcoming';
      }
    }

    allTodayPeriods.push({
      _id: p._id,
      period: p.period,
      timeSlot: p.timeSlot,
      class: `${p.class.standard}-${p.class.section} (${p.class.board})`,
      classId: p.class._id,
      standard: p.class.standard,
      section: p.class.section,
      board: p.class.board,
      classStrength: p.class.strength || 0,
      teacher: session
        ? (session.teacher?.name || 'Unknown Teacher')
        : (sub ? (sub.substituteTeacher?.name || 'Unknown Substitute') : (p.teacher?.name || 'No Teacher Assigned')),
      teacherId: session
        ? (session.teacher?._id || session.teacher)
        : (sub ? (sub.substituteTeacher?._id || sub.substituteTeacher) : (p.teacher?._id || null)),
      subject: session
        ? (session.subject?.name || 'Unknown Subject')
        : (sub && sub.subject ? (sub.subject.name || p.subject?.name || 'Unknown Subject') : (p.subject?.name || 'No Subject Assigned')),
      subjectId: session
        ? (session.subject?._id || session.subject)
        : (sub && sub.subject ? (sub.subject._id || sub.subject) : (p.subject?._id || null)),
      isPresentInSchool,
      isAbsent: !isPresentInSchool && !session,
      color,
      statusText,
      isLateAlert,
      session: session ? { loginTime: session.loginTime, logoutTime: session.logoutTime, status: session.status } : null,
      substitute: (sub && sub.substituteTeacher) ? { substituteTeacherName: sub.substituteTeacher.name || 'Unknown', substituteTeacherId: sub.substituteTeacher._id || null, status: sub.status } : null
    });
  }

  // 1.5 Process non-timetable substitute assignments today
  for (const sub of substitutes) {
    const classIdStr = (sub.class?._id || sub.class || '').toString();
    if (!classIdStr) continue;
    const period = Number(sub.period);

    const exists = allTodayPeriods.some(e => e.classId.toString() === classIdStr && Number(e.period) === period);
    if (!exists) {
      // Find ClassSession if exists
      const session = sessions.find(s => s.class && (s.class._id || s.class).toString() === classIdStr && Number(s.period) === period);
      const isSubActive = session && (session.teacher?._id || session.teacher || '').toString() === sub.substituteTeacher?._id?.toString() && session.status === 'active';
      const isSubCompleted = session && (session.teacher?._id || session.teacher || '').toString() === sub.substituteTeacher?._id?.toString() && session.status === 'completed';

      let color = 'gold';
      let statusText = `Arranged: ${sub.substituteTeacher?.name || 'Substitute'} (Pending)`;
      if (isSubActive) {
        color = 'green';
        statusText = `Arranged: ${sub.substituteTeacher?.name || 'Substitute'} (Logged In)`;
        greenClasses++;
      } else if (isSubCompleted) {
        color = 'neutral';
        statusText = `Arranged: ${sub.substituteTeacher?.name || 'Substitute'} (Logged Out)`;
      } else {
        goldClasses++;
      }

      // Populate Class and Subject details if they exist on sub
      const cls = sub.class;
      const subject = sub.subject;

      allTodayPeriods.push({
        _id: sub._id,
        period: period,
        timeSlot: `${String(9 + period - 1).padStart(2, '0')}:00-${String(9 + period - 1).padStart(2, '0')}:45`,
        class: cls ? `${cls.standard}-${cls.section} (${cls.board || 'CBSE'})` : 'Unknown Class',
        classId: classIdStr,
        standard: cls?.standard || 'Unknown',
        section: cls?.section || '',
        board: cls?.board || 'CBSE',
        classStrength: cls?.strength || 0,
        teacher: session ? (session.teacher?.name || 'Unknown Teacher') : (sub.substituteTeacher?.name || 'Unknown Substitute'),
        teacherId: session ? (session.teacher?._id || session.teacher) : sub.substituteTeacher?._id,
        subject: session ? (session.subject?.name || 'Unknown Subject') : (subject?.name || 'Unknown Subject'),
        subjectId: session ? (session.subject?._id || session.subject) : (subject?._id || sub.subject),
        isPresentInSchool: true,
        isAbsent: false,
        color,
        statusText,
        isLateAlert: false,
        session: session ? { loginTime: session.loginTime, logoutTime: session.logoutTime, status: session.status } : null,
        substitute: { substituteTeacherName: sub.substituteTeacher?.name || 'Unknown Substitute', substituteTeacherId: sub.substituteTeacher?._id, status: sub.status }
      });
    }
  }

  // 2. Process non-timetable active/completed sessions (force logged-in classes)
  for (const session of sessions) {
    if (!session.class) continue;
    const classIdStr = (session.class._id || session.class).toString();
    const period = Number(session.period);

    const exists = allTodayPeriods.some(e => e.classId.toString() === classIdStr && Number(e.period) === period);
    if (!exists) {
      const cls = session.class;
      const teacher = session.teacher;
      const subject = session.subject;

      const isLive = session.status === 'active';
      const color = isLive ? 'green' : 'red';
      const statusText = isLive ? 'Logged In' : 'Logged Out';

      if (isLive) greenClasses++;
      else redClasses++;

      allTodayPeriods.push({
        _id: session._id,
        period: period,
        timeSlot: `${String(9 + period - 1).padStart(2, '0')}:00-${String(9 + period - 1).padStart(2, '0')}:45`,
        class: cls ? `${cls.standard}-${cls.section} (${cls.board || 'CBSE'})` : 'Unknown Class',
        classId: cls?._id || session.class,
        standard: cls?.standard || 'Unknown',
        section: cls?.section || '',
        board: cls?.board || 'CBSE',
        classStrength: cls?.strength || 0,
        teacher: teacher?.name || 'Unknown Teacher',
        teacherId: teacher?._id || session.teacher,
        subject: subject?.name || 'Unknown Subject',
        subjectId: subject?._id || session.subject,
        isPresentInSchool: true,
        isAbsent: false,
        color,
        statusText,
        isLateAlert: false,
        session: { loginTime: session.loginTime, logoutTime: session.logoutTime, status: session.status },
        substitute: null
      });
    }
  }

  return { allTodayPeriods, greenClasses, redClasses, goldClasses };
};

/**
 * Teacher Dashboard Data
 */
export const getTeacherDashboard = async (req, res) => {
  try {
    let teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) {
      const roleLower = (req.user.role || '').toLowerCase();
      if (['teacher', 'principal', 'admin', 'hod'].includes(roleLower)) {
        const employeeId = 'TCH-' + Math.floor(100000 + Math.random() * 900000);
        teacher = await Teacher.create({
          user: req.user._id,
          employeeId,
          name: req.user.name,
          email: req.user.email,
          qualification: 'Not Configured Yet',
          experience: 0,
          status: 'Active'
        });
        console.log(`[DASHBOARD] Created missing teacher profile on-the-fly for ${req.user.email}`);
      } else {
        return res.status(404).json({ status: false, message: 'Teacher profile not found' });
      }
    }

    const todayStr = getLocalDateString();
    const day = getDayFromDate(todayStr);



    // 1. Fetch all timetable entries for today (overrides or default templates)
    const allTodayEntries = await getAllTimetableForDate(todayStr, day);

    // 2. Fetch today's records (with populate)
    const sessions = await ClassSession.find({ date: todayStr })
      .populate('class', 'standard section board strength')
      .populate('teacher', 'name employeeId')
      .populate('subject', 'name')
      .lean();
    const substitutes = await SubstituteAssignment.find({ date: todayStr }).populate('substituteTeacher', 'name').populate('subject', 'name').populate('class').lean();
    const attendances = await TeacherAttendance.find({ date: todayStr }).lean();

    // 3. Calculate period statuses using helper so teacher gets all colors
    const { allTodayPeriods } = calculatePeriodStatuses(
      allTodayEntries,
      todayStr,
      attendances,
      substitutes,
      sessions
    );

    // Filter to normal periods for this teacher
    const normalPeriods = allTodayEntries.filter(
      p => p.teacher && p.teacher._id.toString() === teacher._id.toString()
    );

    // Fetch substitute classes assigned to this teacher today
    const substituteAssignments = await SubstituteAssignment.find({
      date: todayStr,
      substituteTeacher: teacher._id
    })
      .populate('class', 'standard section board')
      .populate('subject', 'name')
      .lean();

    // Fetch leaves to see if this teacher is absent today
    const isAbsentToday = await TeacherAttendance.findOne({
      date: todayStr,
teacher: teacher._id,
      status: { $in: ['Absent', 'Leave'] }
    });

    const schedule = [];
 
    // Map normal periods
    for (const p of normalPeriods) {
      if (!p.class || !p.subject) continue;
      const hasSub = substitutes.find(sub => 
        (sub.class?._id || sub.class || '').toString() === p.class._id.toString() &&
        sub.period === p.period
      );
 
      if (hasSub) {
        const session = sessions.find(s => 
          (s.class?._id || s.class || '').toString() === p.class._id.toString() &&
          s.period === p.period
        );
 
        const duration = getClassDuration(p.timeSlot);
        const periodStatus = getPeriodStatus(p.timeSlot);
 
        let classStatusText = periodStatus;
        if (session && session.status === 'completed') {
          classStatusText = 'completed';
        }
 
        let classMarkColor = 'red';
        if (periodStatus === 'active' || (session && session.status === 'active')) {
          classMarkColor = 'green';
        } else if (periodStatus === 'completed' || (session && session.status === 'completed')) {
          classMarkColor = 'red';
        }
 
        let teacherMarkColor = 'red';
        if (session) {
          teacherMarkColor = 'green';
        }
 
        let regColor = 'gold';
        if (session) {
          regColor = session.status === 'active' ? 'green' : 'neutral';
        }
 
        schedule.push({
          type: 'regular',
          period: p.period,
          timeSlot: p.timeSlot,
          duration,
          standard: p.class.standard,
          section: p.class.section,
          board: p.class.board,
          classId: p.class._id,
          subject: p.subject.name,
          subjectId: p.subject._id,
          status: classStatusText,
          classSession: session ? { loginTime: session.loginTime, logoutTime: session.logoutTime, status: session.status } : null,
          classMarkColor,
          teacherMarkColor,
          arrangedMarkColor: 'orange',
          teacherId: teacher._id,
          color: regColor,
          substitute: {
            substituteTeacherName: hasSub.substituteTeacher?.name || 'Unknown Substitute',
            substituteTeacherId: hasSub.substituteTeacher?._id || hasSub.substituteTeacher,
            status: hasSub.status
          }
        });
      } else {
        const session = sessions.find(s => 
          (s.class?._id || s.class || '').toString() === p.class._id.toString() &&
          s.period === p.period
        );
 
        const duration = getClassDuration(p.timeSlot);
        const periodStatus = getPeriodStatus(p.timeSlot);
 
        let classStatusText = periodStatus;
        if (session && session.status === 'completed') {
          classStatusText = 'completed';
        }
 
        let classMarkColor = 'red';
        if (periodStatus === 'active' || (session && session.status === 'active')) {
          classMarkColor = 'green';
        } else if (periodStatus === 'completed' || (session && session.status === 'completed')) {
          classMarkColor = 'red';
        }
 
        let teacherMarkColor = 'red';
        if (session) {
          teacherMarkColor = 'green';
        }
 
        let regColor = 'neutral';
        if (session) {
          regColor = session.status === 'active' ? 'green' : 'neutral';
        } else {
          if (periodStatus === 'completed') {
            regColor = 'red';
          } else if (periodStatus === 'active') {
            regColor = isPeriodLateBy10Mins(p.timeSlot) ? 'red' : 'neutral';
          }
        }
 
        schedule.push({
          type: 'regular',
          period: p.period,
          timeSlot: p.timeSlot,
          duration,
          standard: p.class.standard,
          section: p.class.section,
          board: p.class.board,
          classId: p.class._id,
          subject: p.subject.name,
          subjectId: p.subject._id,
          status: classStatusText,
          classSession: session ? { loginTime: session.loginTime, logoutTime: session.logoutTime, status: session.status } : null,
          classMarkColor,
          teacherMarkColor,
          arrangedMarkColor: null,
          teacherId: teacher._id,
          color: regColor
        });
      }
    }

    // Map substitute periods
    for (const sub of substituteAssignments) {
      if (!sub.class || !sub.class._id || !sub.subject) continue;
      const tSlot = allTodayEntries.find(entry => entry.class && entry.class._id.toString() === sub.class._id.toString() && entry.period === sub.period);
      const timeSlotStr = tSlot ? tSlot.timeSlot : '09:00-09:45';
      const duration = getClassDuration(timeSlotStr);
      const periodStatus = getPeriodStatus(timeSlotStr);

      const session = sessions.find(s => 
        (s.class?._id || s.class || '').toString() === sub.class._id.toString() &&
        s.period === sub.period
      );

      let classStatusText = periodStatus;
      if (session && session.status === 'completed') {
        classStatusText = 'completed';
      }

      let classMarkColor = 'red';
      if (periodStatus === 'active' || (session && session.status === 'active')) {
        classMarkColor = 'green';
      } else if (periodStatus === 'completed' || (session && session.status === 'completed')) {
        classMarkColor = 'red';
      }

      let teacherMarkColor = 'red';
      if (session) {
        teacherMarkColor = 'green';
      }

      let subColor = 'gold';
      if (session) {
        subColor = session.status === 'active' ? 'green' : 'neutral';
      }

      schedule.push({
        type: 'substitute',
        period: sub.period,
        timeSlot: timeSlotStr,
        duration,
        standard: sub.class.standard,
        section: sub.class.section,
        board: sub.class.board,
        classId: sub.class._id,
        subject: sub.subject.name,
        subjectId: sub.subject._id,
        status: classStatusText,
        classSession: session ? { loginTime: session.loginTime, logoutTime: session.logoutTime, status: session.status } : null,
        classMarkColor,
        teacherMarkColor,
        arrangedMarkColor: 'orange',
        teacherId: teacher._id,
        color: subColor
      });
    }

    schedule.sort((a, b) => a.period - b.period);

    const total = schedule.length;
    const completed = schedule.filter(s => s.status === 'completed').length;
    const upcoming = schedule.filter(s => s.status === 'upcoming').length;
    const substitute = schedule.filter(s => s.type === 'substitute').length;

    const notifications = await Notification.find({ recipient: req.user._id, isRead: false })
      .sort({ createdAt: -1 })
      .limit(10);

    const allClasses = await Class.find().populate('classTeacher', 'name employeeId').lean();
    const TeacherClassSubjectMapping = (await import('../models/TeacherClassSubjectMapping.js')).default;
    const allMappings = await TeacherClassSubjectMapping.find()
      .populate('teacher', 'name employeeId')
      .populate('class', 'standard section')
      .populate('subject', 'name')
      .lean();

    const { periods } = await getSchoolPeriods();
    let currentPeriod = null;
    if (periods && periods.length > 0) {
      const sortedPeriods = [...periods].sort((a, b) => Number(a.period) - Number(b.period));
      const now = getISTTime();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      for (const p of sortedPeriods) {
        if (!p.timeSlot) continue;
        const [, endStr] = p.timeSlot.split('-');
        const [endH, endM] = endStr.split(':').map(Number);
        const endMinutes = endH * 60 + endM;
        
        if (currentMinutes < endMinutes) {
          currentPeriod = p;
          break;
        }
      }
      
      // No fallback to last period if school hours are over
    }

    return res.status(200).json({
      status: true,
      data: {
        schedule,
        cards: { total, completed, upcoming, substitute },
        notifications,
        allTodayPeriods,
        allClasses,
        allMappings,
        currentPeriod,
        teacherId: teacher._id
      }
    });
  } catch (error) {
    return safeError(res, error, 'Dashboard');
  }
};

/**
 * Admin/Principal Dashboard Classroom Live Status
 */
export const getAdminDashboard = async (req, res) => {
  try {
    const todayStr = getLocalDateString();
    const day = getDayFromDate(todayStr);



    // 1. Get all scheduled periods in school for today (using overrides or defaults)
    const timetable = await getAllTimetableForDate(todayStr, day);

    // 2. Fetch all ClassSessions, SubstituteAssignments, and TeacherAttendances for today (with populate)
    const sessions = await ClassSession.find({ date: todayStr })
      .populate('class', 'standard section board strength')
      .populate('teacher', 'name employeeId')
      .populate('subject', 'name')
      .lean();
    const substitutes = await SubstituteAssignment.find({ date: todayStr }).populate('substituteTeacher', 'name').populate('subject', 'name').populate('class').lean();
    const attendances = await TeacherAttendance.find({ date: todayStr }).lean();

    // 3. Fetch all active teachers to calculate total teacher counts
    const allTeachers = await Teacher.find({ status: 'Active' }).lean();

    // 4. Calculate period statuses using helper
    const { allTodayPeriods, greenClasses, redClasses, goldClasses } = calculatePeriodStatuses(
      timetable,
      todayStr,
      attendances,
      substitutes,
      sessions
    );

    const activeClasses = [];
    const classesWithoutTeacher = [];
    const substitutePending = [];

    for (const p of timetable) {
      if (!p.class) continue;
      const pStatus = getPeriodStatus(p.timeSlot); // 'upcoming', 'active', 'completed'

      // Check if original teacher is present in school today
      const attendance = (p.teacher && p.teacher._id && attendances)
        ? attendances.find(att => att.teacher && att.teacher.toString() === p.teacher._id.toString())
        : null;
      const isPresentInSchool = attendance && attendance.status === 'Present';
      const isAbsent = p.teacher ? (attendance ? ['Absent', 'Leave'].includes(attendance.status) : true) : false;

      // Check if substitute is assigned
      const sub = substitutes.find(s => {
        const sClassId = (s.class?._id || s.class || '').toString();
        const pClassId = (p.class?._id || p.class || '').toString();
        return sClassId === pClassId && s.period === p.period;
      });

      // Fetch ClassSession: first look for any active session in this class, otherwise match period
      let session = sessions.find(s => {
        const sClassId = (s.class?._id || s.class || '').toString();
        const pClassId = (p.class?._id || p.class || '').toString();
        return sClassId === pClassId && s.status === 'active';
      });
      if (!session) {
        session = sessions.find(s => {
          const sClassId = (s.class?._id || s.class || '').toString();
          const pClassId = (p.class?._id || p.class || '').toString();
          return sClassId === pClassId && s.period === p.period;
        });
      }

      const hasClassLog = session ? true : false;
      const classCompleted = session && session.status === 'completed';
      const classLive = session && session.status === 'active';

      let teacherPresentMark = hasClassLog ? 'green' : 'red';

      // Traditional active/warnings feeds (only when period is active)
      if (pStatus === 'active') {
        if (classLive) {
          // If there is a live session running right now in this class, show it as active!
          activeClasses.push({
            class: `${p.class.standard}-${p.class.section} (${p.class.board})`,
            teacher: session.teacher?.name || 'Unknown Teacher',
            subject: session.subject?.name || 'Unknown Subject',
            duration: getClassDuration(p.timeSlot),
            classStatus: 'going',
            classMarkColor: 'green',
            teacherMarkColor: 'green',
            arrangedMarkColor: (sub || (session.teacher?._id || session.teacher || '').toString() !== (p.teacher?._id || '').toString()) ? 'orange' : null
          });
        } else if (p.teacher && !isAbsent) {
          activeClasses.push({
            class: `${p.class.standard}-${p.class.section} (${p.class.board})`,
            teacher: session ? (session.teacher?.name || 'Unknown Teacher') : (p.teacher?.name || 'Unknown Teacher'),
            subject: session ? (session.subject?.name || 'Unknown Subject') : (p.subject?.name || 'Unknown Subject'),
            duration: getClassDuration(p.timeSlot),
            classStatus: classCompleted ? 'ended' : 'going',
            classMarkColor: classCompleted ? 'red' : 'green',
            teacherMarkColor: teacherPresentMark,
            arrangedMarkColor: null
          });
        } else {
          if (sub && sub.status === 'Assigned') {
            activeClasses.push({
              class: `${p.class.standard}-${p.class.section} (${p.class.board})`,
              teacher: session ? (session.teacher?.name || 'Unknown Teacher') : `${sub.substituteTeacher?.name || 'Unknown Substitute'} (Substitute)`,
              subject: session ? (session.subject?.name || 'Unknown Subject') : (p.subject?.name || 'Unknown Subject'),
              duration: getClassDuration(p.timeSlot),
              classStatus: classCompleted ? 'ended' : 'going',
              classMarkColor: classCompleted ? 'red' : 'green',
              teacherMarkColor: teacherPresentMark,
              arrangedMarkColor: 'orange'
            });
          } else {
            classesWithoutTeacher.push({
              class: `${p.class.standard}-${p.class.section} (${p.class.board})`,
              subject: p.subject?.name || 'No Subject Assigned',
              absentTeacher: p.teacher?.name || 'No Teacher Assigned',
              duration: getClassDuration(p.timeSlot),
              classStatus: 'going',
              classMarkColor: 'red',
              teacherMarkColor: 'red',
              arrangedMarkColor: null
            });

            if (p.teacher) {
              substitutePending.push({
                class: `${p.class.standard}-${p.class.section} (${p.class.board})`,
                subject: p.subject?.name || 'No Subject Assigned',
                periodEntryId: p._id,
                teacherId: p.teacher._id,
                date: todayStr
              });
            }
          }
        }
      }
    }

    // Calculate teacher presence counts
    const presentTeachers = attendances.filter(att => att.status === 'Present').length;
    const absentTeachers = attendances.filter(att => ['Absent', 'Leave'].includes(att.status)).length;

    const stats = {
      totalTeachers: allTeachers.length,
      presentTeachers,
      absentTeachers,
      greenClasses,
      redClasses,
      goldClasses
    };

    const allClasses = await Class.find().populate('classTeacher', 'name employeeId').lean();
    const todaySessions = await ClassSession.find({ date: todayStr }).lean();
    const TeacherClassSubjectMapping = (await import('../models/TeacherClassSubjectMapping.js')).default;
    const allMappings = await TeacherClassSubjectMapping.find()
      .populate('teacher', 'name employeeId')
      .populate('class', 'standard section')
      .populate('subject', 'name')
      .lean();

    const { periods } = await getSchoolPeriods();
    let currentPeriod = null;
    if (periods && periods.length > 0) {
      const sortedPeriods = [...periods].sort((a, b) => Number(a.period) - Number(b.period));
      const now = getISTTime();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      for (const p of sortedPeriods) {
        if (!p.timeSlot) continue;
        const [, endStr] = p.timeSlot.split('-');
        const [endH, endM] = endStr.split(':').map(Number);
        const endMinutes = endH * 60 + endM;
        
        if (currentMinutes < endMinutes) {
          currentPeriod = p;
          break;
        }
      }
      
      // No fallback to last period if school hours are over
    }

    // ─── Additional data for admin dashboard sections ───

    // Weekly recurring timetable entries (Mon-Sat templates)
    const weeklyTimetable = await Timetable.find({
      $or: [{ date: null }, { date: { $exists: false } }]
    })
      .populate('class', 'standard section board strength')
      .populate('teacher', 'name employeeId')
      .populate('subject', 'name')
      .lean();

    // Override timeSlots with dynamically calculated period values
    for (const entry of weeklyTimetable) {
      const calcSlot = periods.find(p => p.period === entry.period);
      if (calcSlot) {
        entry.timeSlot = calcSlot.timeSlot;
      }
    }

    // Populated attendance records for activity logs
    const populatedAttendances = await TeacherAttendance.find({ date: todayStr })
      .populate('teacher', 'name employeeId')
      .lean();

    const allSubjects = await Subject.find().lean();

    return res.status(200).json({
      status: true,
      data: {
        activeClasses,
        classesWithoutTeacher,
        substitutePending,
        allTodayPeriods,
        stats,
        allClasses,
        todaySessions,
        allMappings,
        periods,
        currentPeriod,
        weeklyTimetable,
        todayAttendances: populatedAttendances,
        allTeachers,
        allSubjects,
        populatedSessions: sessions
      }
    });
  } catch (error) {
    return safeError(res, error, 'Dashboard');
  }
};

/**
 * Consolidated attendance stats for the admin dashboard
 */
export const getConsolidatedStats = async (req, res) => {
  try {
    const todayStr = getLocalDateString();

    // Fetch active teachers and staff
    const teachers = await Teacher.find({ status: 'Active' }).populate('user', 'role name').lean();
    const staff = await NonTeachingStaff.find({ status: 'Active' }).populate('user', 'role name').lean();

    const allEmployees = [
      ...teachers.map(t => ({ _id: t._id.toString(), name: t.name, employeeId: t.employeeId, role: t.user?.role || 'Teacher', type: 'teacher' })),
      ...staff.map(s => ({ _id: s._id.toString(), name: s.name, employeeId: s.employeeId, role: s.staffRole || s.user?.role || 'Staff', type: 'staff' }))
    ];

    const todayRecords = await TeacherAttendance.find({ date: todayStr }).lean();

    // Map records to employee
    const recordsWithEmployee = todayRecords.map(rec => {
      const emp = allEmployees.find(e => e._id === rec.teacher.toString());
      return { ...rec, employee: emp };
    });

    const presentCount = recordsWithEmployee.filter(r => r.status === 'Present' && r.employee).length;
    const totalCount = allEmployees.length;
    const absentCount = totalCount - presentCount;

    // Late arrivals count: punchIn after grace period
    let graceHour = 9;
    let graceMin = 30;
    try {
      const SchoolSettings = (await import('../models/SchoolSettings.js')).default;
      const settings = await SchoolSettings.findOne();
      if (settings && settings.office_start_time) {
        const [h, m] = settings.office_start_time.split(':').map(Number);
        const grace = settings.grace_period_mins || 0;
        const totalMins = h * 60 + m + grace;
        graceHour = Math.floor(totalMins / 60);
        graceMin = totalMins % 60;
      }
    } catch (err) {}

    const lateCount = recordsWithEmployee.filter(r => {
      if (r.status !== 'Present' || !r.punchIn || !r.employee) return false;
      const pi = new Date(r.punchIn);
      return pi.getHours() > graceHour || (pi.getHours() === graceHour && pi.getMinutes() > graceMin);
    }).length;

    // Leave requests
    let leaveCount = 0;
    try {
      const LeaveRequest = (await import('../models/LeaveRequest.js')).default;
      leaveCount = await LeaveRequest.countDocuments({ leaveDate: todayStr, status: 'Pending' });
    } catch (err) {}

    // Dynamic Role-wise breakdown
    const roleWise = {};
    // Initialize standard roles from DB
    try {
      const Role = (await import('../models/Role.js')).default;
      const dbRoles = await Role.find().lean();
      for (const r of dbRoles) {
        roleWise[r.roleName] = { present: 0, absent: 0, late: 0, total: 0 };
      }
    } catch (err) {}

    // fallback initialize for any roles in allEmployees
    for (const emp of allEmployees) {
      if (!roleWise[emp.role]) {
        roleWise[emp.role] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      roleWise[emp.role].total++;
    }

    for (const rec of recordsWithEmployee) {
      if (!rec.employee) continue;
      const roleName = rec.employee.role;
      if (rec.status === 'Present') {
        roleWise[roleName].present++;
        // check late
        if (rec.punchIn) {
          const pi = new Date(rec.punchIn);
          if (pi.getHours() > graceHour || (pi.getHours() === graceHour && pi.getMinutes() > graceMin)) {
            roleWise[roleName].late++;
          }
        }
      }
    }

    // calculate absent for each role
    for (const roleName of Object.keys(roleWise)) {
      roleWise[roleName].absent = roleWise[roleName].total - roleWise[roleName].present;
    }

    // Recent check-ins
    const recentCheckIns = recordsWithEmployee
      .filter(r => r.status === 'Present' && r.punchIn && r.employee)
      .sort((a, b) => new Date(b.punchIn) - new Date(a.punchIn))
      .slice(0, 10)
      .map(r => ({
        name: r.employee.name,
        employeeId: r.employee.employeeId,
        punchIn: r.punchIn,
        status: r.status,
        role: r.employee.role
      }));

    // 10-day historical trend
    const trend = [];
    const totalEmpCount = allEmployees.length || 1;
    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayPresent = await TeacherAttendance.countDocuments({ date: dateStr, status: 'Present' });
      trend.push({
        date: dateStr,
        percentage: Math.round((dayPresent / totalEmpCount) * 100)
      });
    }

    return res.status(200).json({
      status: true,
      data: {
        totalTeachers: totalCount,
        presentToday: presentCount,
        absentToday: absentCount,
        lateArrivals: lateCount,
        leaveRequests: leaveCount,
        roleWise,
        recentCheckIns,
        trend
      }
    });
  } catch (error) {
    return safeError(res, error, 'Dashboard');
  }
};

/**
 * Individual teacher stats - classes assigned vs taken per day for the last 7 days
 */
export const getIndividualStats = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId).populate('user', 'name email role');
    if (!teacher) {
      return res.status(404).json({ status: false, message: 'Teacher not found' });
    }

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = getDayFromDate(dateStr);

      if (dayName === 'Sunday') {
        days.push({ date: dateStr, day: dayName, assigned: 0, taken: 0 });
        continue;
      }

      // Assigned classes from timetable
      const allEntries = await getAllTimetableForDate(dateStr, dayName);
      const assigned = allEntries.filter(
        e => e.teacher && e.teacher._id.toString() === teacherId
      ).length;

      // Taken classes from ClassSession
      const taken = await ClassSession.countDocuments({
        teacher: teacherId,
        date: dateStr,
        status: 'completed'
      });

      days.push({ date: dateStr, day: dayName, assigned, taken });
    }

    // Attendance records for the last 7 days
    const attendanceLogs = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const record = await TeacherAttendance.findOne({ date: dateStr, teacher: teacherId });
      attendanceLogs.push({
        date: dateStr,
        status: record?.status || 'Absent',
        punchIn: record?.punchIn || null,
        punchOut: record?.punchOut || null
      });
    }

    return res.status(200).json({
      status: true,
      data: {
        teacher: {
          _id: teacher._id,
          name: teacher.name,
          employeeId: teacher.employeeId,
          role: teacher.user?.role || 'teacher'
        },
        classEfficiency: days,
        attendanceLogs
      }
    });
  } catch (error) {
    return safeError(res, error, 'Dashboard');
  }
};
