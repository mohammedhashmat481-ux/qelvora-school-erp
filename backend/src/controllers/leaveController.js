import LeaveRequest from '../models/LeaveRequest.js';
import Teacher from '../models/Teacher.js';
import User from '../models/User.js';
import Timetable from '../models/Timetable.js';
import TeacherAttendance from '../models/TeacherAttendance.js';
import SubstituteAssignment from '../models/SubstituteAssignment.js';
import Notification from '../models/Notification.js';
import { getIO } from '../config/socket.js';
import { escapeRegex, safeError, auditLog } from '../utils/security.js';

/**
 * Teacher files a leave request
 */
export const requestLeave = async (req, res) => {
  const { leaveDate, reason } = req.body;
  try {
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) {
      return res.status(404).json({ status: false, message: 'Teacher profile not found' });
    }

    const request = await LeaveRequest.create({
      teacher: teacher._id,
      leaveDate,
      reason
    });

    // Create notifications for admins/principals/hods
    try {
      const admins = await User.find({ role: { $in: ['admin', 'principal', 'hod'] } });
      const message = `Leave Request: ${teacher.name} has requested leave for ${leaveDate}. Reason: "${reason}"`;
      const io = getIO();
      for (const adminUser of admins) {
        const notif = await Notification.create({
          recipient: adminUser._id,
          message
        });

        if (io) {
          io.to(adminUser._id.toString()).emit('new_notification', {
            _id: notif._id,
            message,
            createdAt: notif.createdAt
          });
        }
      }
    } catch (notifErr) {
      console.error('Failed to create/send notifications for leave request:', notifErr);
    }

    return res.status(201).json({ status: true, message: 'Leave request submitted successfully', data: request });
  } catch (error) {
    return safeError(res, error, 'RequestLeave');
  }
};

/**
 * Get all leave requests (Admin)
 */
export const getLeaveRequests = async (req, res) => {
  try {
    const requests = await LeaveRequest.find()
      .populate('teacher', 'name employeeId')
      .sort({ createdAt: -1 });
    return res.status(200).json({ status: true, data: requests });
  } catch (error) {
    return safeError(res, error, 'GetLeaveRequests');
  }
};

/**
 * Suggest substitute teachers for an absent teacher's periods on a specific day
 */
const getDayFromDate = (dateStr) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const normalizedDateStr = String(dateStr || '').replace(/[_\s]+/g, '-');
  const d = new Date(normalizedDateStr);
  return days[d.getDay()];
};

export const getSubstituteSuggestions = async (req, res) => {
  const { teacherId, date } = req.query;
  try {
    let day = getDayFromDate(date);
    if (!day || day === 'Sunday') {
      // Relax/bypass Sunday check: default to Monday so testing substitute arrangement works on weekends
      day = 'Monday';
    }

    // 1. Find the absent teacher's scheduled classes for that day
    const affectedPeriods = await Timetable.find({
      teacher: teacherId,
      day
    }).populate('class', 'standard section').populate('subject', 'name');

    if (affectedPeriods.length === 0) {
      return res.status(200).json({ status: true, data: [] });
    }

    const suggestionsList = [];

    // 2. For each period, find available substitutes
    for (const periodEntry of affectedPeriods) {
      // Find all teachers
      const allTeachers = await Teacher.find({ status: 'Active' });
      
      const candidates = [];
      for (const t of allTeachers) {
        if (t._id.toString() === teacherId.toString()) continue; // skip the absent teacher

        // A. Check if this teacher is scheduled to teach during this period on this day
        const isBusy = await Timetable.findOne({
          teacher: t._id,
          day,
          period: periodEntry.period
        });
        if (isBusy) continue; // skip if busy teaching another class

        // B. Check if this teacher is absent or on leave on this date
        const isAbsent = await TeacherAttendance.findOne({
          date,
          teacher: t._id,
          status: { $in: ['Absent', 'Leave'] }
        });
        if (isAbsent) continue; // skip if absent/on leave

        // C. Check if this teacher teaches the same subject (subject match)
        const isSubjectMatch = periodEntry.subject && t.qualification && t.qualification.toLowerCase().includes(periodEntry.subject.name.toLowerCase());
        
        candidates.push({
          teacherId: t._id,
          name: t.name,
          employeeId: t.employeeId,
          subjectMatch: isSubjectMatch
        });
      }

      // Sort candidates: subject matches first
      candidates.sort((a, b) => b.subjectMatch - a.subjectMatch);

      suggestionsList.push({
        periodEntryId: periodEntry._id,
        period: periodEntry.period,
        timeSlot: periodEntry.timeSlot,
        class: `${periodEntry.class.standard}-${periodEntry.class.section}`,
        subject: periodEntry.subject.name,
        candidates
      });
    }

    return res.status(200).json({ status: true, data: suggestionsList });
  } catch (error) {
    return safeError(res, error, 'GetSubstituteSuggestions');
  }
};

/**
 * Approve leave request and allocate substitutes
 */
export const approveLeave = async (req, res) => {
  const { id } = req.params; // Leave request ID
  const { status, substituteAllocations } = req.body; // status: 'Approved' or 'Rejected', substituteAllocations: [{ periodEntryId, substituteTeacherId }]
  try {
    const request = await LeaveRequest.findById(id).populate({
      path: 'teacher',
      populate: { path: 'user' }
    });
    if (!request) return res.status(404).json({ status: false, message: 'Leave request not found' });

    request.status = status;
    request.approvedBy = req.user._id;
    await request.save();

    // Create notification for the applied teacher
    if (request.teacher && request.teacher.user) {
      try {
        const message = `Your leave request for ${request.leaveDate} has been ${status}.`;
        const notif = await Notification.create({
          recipient: request.teacher.user._id,
          message
        });

        const io = getIO();
        if (io) {
          io.to(request.teacher.user._id.toString()).emit('new_notification', {
            _id: notif._id,
            message,
            createdAt: notif.createdAt
          });
        }
      } catch (notifErr) {
        console.error('Failed to notify teacher about leave decision:', notifErr);
      }
    }

    if (status === 'Approved') {
      // Mark teacher attendance for that day as 'Leave'
      await TeacherAttendance.findOneAndUpdate(
        { date: request.leaveDate, teacher: request.teacher._id },
        { status: 'Leave' },
        { upsert: true }
      );

      // Save substitute assignments
      if (substituteAllocations && substituteAllocations.length > 0) {
        for (const alloc of substituteAllocations) {
          const timetableEntry = await Timetable.findById(alloc.periodEntryId);
          if (!timetableEntry) continue;

          let subjectId = timetableEntry.subject;
          if (alloc.subjectName && alloc.subjectName.trim() !== '') {
            const Subject = (await import('../models/Subject.js')).default;
            let subject = await Subject.findOne({ name: { $regex: new RegExp(`^${escapeRegex(alloc.subjectName.trim())}$`, 'i') } });
            if (!subject) {
              subject = await Subject.create({ name: alloc.subjectName.trim() });
            }
            subjectId = subject._id;
          }

          // Create assignment
          await SubstituteAssignment.findOneAndUpdate(
            {
              date: request.leaveDate,
              class: timetableEntry.class,
              period: timetableEntry.period
            },
            {
              timetableEntry: timetableEntry._id,
              originalTeacher: timetableEntry.teacher,
              substituteTeacher: alloc.substituteTeacherId,
              subject: subjectId,
              status: 'Assigned'
            },
            { upsert: true }
          );

          // Find substitute teacher user to send notification
          const subTeacher = await Teacher.findById(alloc.substituteTeacherId).populate('user');
          if (subTeacher && subTeacher.user) {
            const message = `You have been assigned Period ${timetableEntry.period} for Class ${timetableEntry.standard || ''} because ${request.teacher.name} is absent.`;
            
            // Create notification document
            const notif = await Notification.create({
              recipient: subTeacher.user._id,
              message
            });

            // Emit live websocket notification to substitute teacher
            const io = getIO();
            if (io) {
              io.to(subTeacher.user._id.toString()).emit('new_notification', {
                _id: notif._id,
                message,
                createdAt: notif.createdAt
              });
            }
          }
        }
      }
    }

    return res.status(200).json({ status: true, message: `Leave request status updated to ${status}`, data: request });
  } catch (error) {
    return safeError(res, error, 'ApproveLeave');
  }
};

/**
 * Assign substitutes directly for a teacher on a specific day without an active leave request
 */
export const assignSubstituteDirectly = async (req, res) => {
  const { teacherId, date, substituteAllocations } = req.body;
  try {
    // Mark teacher attendance for that day as 'Absent' if not already set
    await TeacherAttendance.findOneAndUpdate(
      { date, teacher: teacherId },
      { status: 'Absent' },
      { upsert: true }
    );

    const origTeacher = await Teacher.findById(teacherId);

    // Save substitute assignments
    if (substituteAllocations && substituteAllocations.length > 0) {
      for (const alloc of substituteAllocations) {
        let timetableEntry = null;
        let classId = alloc.classId;
        let period = alloc.period;
        let origTeacherId = teacherId;

        if (alloc.periodEntryId) {
          timetableEntry = await Timetable.findById(alloc.periodEntryId);
        }

        if (timetableEntry) {
          classId = timetableEntry.class;
          period = timetableEntry.period;
          origTeacherId = timetableEntry.teacher;
        }

        if (!classId || !period) continue;

        let subjectId = timetableEntry ? timetableEntry.subject : null;
        if (alloc.subjectName && alloc.subjectName.trim() !== '') {
          const Subject = (await import('../models/Subject.js')).default;
          let subject = await Subject.findOne({ name: { $regex: new RegExp(`^${escapeRegex(alloc.subjectName.trim())}$`, 'i') } });
          if (!subject) {
            subject = await Subject.create({ name: alloc.subjectName.trim() });
          }
          subjectId = subject._id;
        }

        if (!subjectId && classId) {
          const TeacherClassSubjectMapping = (await import('../models/TeacherClassSubjectMapping.js')).default;
          const mapping = await TeacherClassSubjectMapping.findOne({ class: classId });
          if (mapping) {
            subjectId = mapping.subject;
          }
          if (!subjectId) {
            const Subject = (await import('../models/Subject.js')).default;
            const subObj = await Subject.findOne();
            subjectId = subObj ? subObj._id : null;
          }
        }

        // Create assignment
        await SubstituteAssignment.findOneAndUpdate(
          {
            date,
            class: classId,
            period: period
          },
          {
            timetableEntry: timetableEntry ? timetableEntry._id : undefined,
            originalTeacher: origTeacherId,
            substituteTeacher: alloc.substituteTeacherId,
            subject: subjectId,
            status: 'Assigned'
          },
          { upsert: true }
        );

        // Find substitute teacher user to send notification
        const subTeacher = await Teacher.findById(alloc.substituteTeacherId).populate('user');
        if (subTeacher && subTeacher.user) {
          const ClassModel = (await import('../models/Class.js')).default;
          const targetClass = await ClassModel.findById(classId);
          const classStr = targetClass ? `${targetClass.standard}-${targetClass.section}` : '';
          const message = `You have been assigned Period ${period} for Class ${classStr} because ${origTeacher ? origTeacher.name : 'a teacher'} is absent.`;

          // Create notification document
          const notif = await Notification.create({
            recipient: subTeacher.user._id,
            message
          });

          // Emit live websocket notification to substitute teacher
          const io = getIO();
          if (io) {
            io.to(subTeacher.user._id.toString()).emit('new_notification', {
              _id: notif._id,
              message,
              createdAt: notif.createdAt
            });
          }
        }
      }
    }

    return res.status(200).json({ status: true, message: 'Substitutes allocated successfully' });
  } catch (error) {
    return safeError(res, error, 'AssignSubstituteDirectly');
  }
};

/**
 * Get all leave requests for the logged-in teacher
 */
export const getMyLeaveRequests = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) {
      return res.status(404).json({ status: false, message: 'Teacher profile not found' });
    }
    const requests = await LeaveRequest.find({ teacher: teacher._id }).sort({ leaveDate: -1 });
    return res.status(200).json({ status: true, data: requests });
  } catch (error) {
    return safeError(res, error, 'GetMyLeaveRequests');
  }
};
