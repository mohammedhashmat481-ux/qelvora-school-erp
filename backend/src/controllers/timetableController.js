import Timetable from '../models/Timetable.js';
import Class from '../models/Class.js';
import Teacher from '../models/Teacher.js';
import Subject from '../models/Subject.js';
import TeacherClassSubjectMapping from '../models/TeacherClassSubjectMapping.js';
import { getIO } from '../config/socket.js';
import { escapeRegex, safeError, auditLog } from '../utils/security.js';

/**
 * Get weekly timetables. Optional query param classId to filter.
 */
export const getTimetables = async (req, res) => {
  const { classId, teacherId, date } = req.query;
  try {
    const filter = {};
    if (classId) {
      filter.class = classId;
    }
    if (teacherId) {
      filter.teacher = teacherId;
    }

    if (date) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const d = new Date(date);
      const day = days[d.getDay()];

      const classes = classId ? [await Class.findById(classId)] : await Class.find();
      const allEntries = [];

      for (const cls of classes) {
        if (!cls) continue;
        const overrides = await Timetable.find({ class: cls._id, date })
          .populate('class', 'standard section board strength')
          .populate('teacher', 'name employeeId')
          .populate('subject', 'name')
          .lean();
        
        const defaults = await Timetable.find({ class: cls._id, day, $or: [{ date: null }, { date: { $exists: false } }] })
          .populate('class', 'standard section board strength')
          .populate('teacher', 'name employeeId')
          .populate('subject', 'name')
          .lean();

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

      let filtered = allEntries;
      if (teacherId) {
        filtered = allEntries.filter(e => e.teacher && (e.teacher._id || e.teacher).toString() === teacherId.toString());
      }

      return res.status(200).json({ status: true, data: filtered });
    }

    const entries = await Timetable.find(filter)
      .populate('class', 'standard section board strength')
      .populate('teacher', 'name employeeId')
      .populate('subject', 'name')
      .sort({ day: 1, period: 1 });

    return res.status(200).json({ status: true, data: entries });
  } catch (error) {
    return safeError(res, error, 'GetTimetables');
  }
};

/**
 * Create or update weekly timetable entries
 */
export const createTimetableEntry = async (req, res) => {
  const { classId, day, period, timeSlot, teacherId, subjectId } = req.body;
  try {
    // Validate references
    const cls = await Class.findById(classId);
    if (!cls) return res.status(404).json({ status: false, message: 'Class not found' });

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ status: false, message: 'Teacher not found' });

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ status: false, message: 'Subject not found' });

    // Upsert the entry (so if there's already an entry for this class/day/period, it gets overwritten)
    const entry = await Timetable.findOneAndUpdate(
      { class: classId, day, period },
      { timeSlot, teacher: teacherId, subject: subjectId },
      { new: true, upsert: true, runValidators: true }
    );

    const populated = await entry.populate([
      { path: 'class', select: 'standard section' },
      { path: 'teacher', select: 'name employeeId' },
      { path: 'subject', select: 'name' }
    ]);

    return res.status(200).json({
      status: true,
      message: 'Timetable entry created/updated successfully',
      data: populated
    });
  } catch (error) {
    return safeError(res, error, 'CreateTimetableEntry');
  }
};

/**
 * Delete a timetable entry
 */
export const deleteTimetableEntry = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Timetable.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ status: false, message: 'Entry not found' });
    }
    return res.status(200).json({ status: true, message: 'Timetable entry deleted successfully' });
  } catch (error) {
    return safeError(res, error, 'DeleteTimetableEntry');
  }
};

/**
 * Create a timetable entry by a teacher directly
 */
export const createTeacherSchedule = async (req, res) => {
  const { standard, section, board, subjectName, day, date, period, timeSlot, teacherId } = req.body;
  try {
    let teacherIdToUse;
    if (['admin', 'principal', 'hod'].includes(req.user.role?.toLowerCase()) || req.user.isAdmin) {
      if (!teacherId) {
        return res.status(400).json({ status: false, message: 'teacherId is required when scheduled by admin' });
      }
      teacherIdToUse = teacherId;
    } else {
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (!teacher) {
        return res.status(404).json({ status: false, message: 'Teacher profile not found' });
      }
      teacherIdToUse = teacher._id;
    }

    if (!standard || !section || !board || !subjectName || !period || !timeSlot) {
      return res.status(400).json({ status: false, message: 'Missing required fields: standard, section, board, subjectName, period, timeSlot' });
    }

    // 1. Find or create Class
    let cls = await Class.findOne({ standard, section, board });
    if (!cls) {
      cls = await Class.create({
        standard,
        section,
        board,
        strength: 40
      });
    }

    // 2. Find or create Subject
    let subject = await Subject.findOne({ name: { $regex: new RegExp(`^${escapeRegex(subjectName.trim())}$`, 'i') } });
    if (!subject) {
      subject = await Subject.create({ name: subjectName.trim() });
    }

    // 3. Create mapping if not exists
    let mapping = await TeacherClassSubjectMapping.findOne({
      teacher: teacherIdToUse,
      class: cls._id,
      subject: subject._id
    });
    if (!mapping) {
      await TeacherClassSubjectMapping.create({
        teacher: teacherIdToUse,
        class: cls._id,
        subject: subject._id
      });
    }

    // 4. Resolve Day
    let entryDay = day;
    if (date && !entryDay) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const d = new Date(date);
      entryDay = days[d.getDay()];
    }
    if (!entryDay) {
      return res.status(400).json({ status: false, message: 'Day of week is required if date is not provided' });
    }

    // 5. Create or update Timetable slot
    const findQuery = {
      class: cls._id,
      day: entryDay,
      period
    };
    if (date) {
      findQuery.date = date;
    } else {
      findQuery.$or = [{ date: null }, { date: { $exists: false } }];
    }

    const updatePayload = {
      timeSlot,
      teacher: teacherIdToUse,
      subject: subject._id
    };
    if (date) {
      updatePayload.date = date;
    }

    const entry = await Timetable.findOneAndUpdate(
      findQuery,
      updatePayload,
      { new: true, upsert: true, runValidators: true }
    );

    const populated = await entry.populate([
      { path: 'class', select: 'standard section board' },
      { path: 'teacher', select: 'name employeeId' },
      { path: 'subject', select: 'name' }
    ]);

    return res.status(200).json({
      status: true,
      message: 'Schedule entry created/updated successfully',
      data: populated
    });
  } catch (error) {
    return safeError(res, error, 'CreateTeacherSchedule');
  }
};

export const saveTeacherTimetableBulk = async (req, res) => {
  const { teacherId, slots, date } = req.body;
  try {
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ status: false, message: 'Teacher profile not found' });

    if (date) {
      // 1. Delete all existing override entries for this teacher and date
      await Timetable.deleteMany({
        teacher: teacherId,
        date: date
      });

      // 2. Insert new entries
      const newEntries = [];
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const d = new Date(date);
      const dayOfWeek = days[d.getDay()];

      for (const slot of slots) {
        if (!slot.classId || !slot.subjectId) continue;

        // Delete any duplicate override slot for the same class, date, and period to avoid collisions
        await Timetable.deleteMany({
          class: slot.classId,
          date: date,
          period: slot.period
        });

        newEntries.push({
          class: slot.classId,
          day: dayOfWeek,
          period: slot.period,
          timeSlot: slot.timeSlot,
          teacher: teacherId,
          subject: slot.subjectId,
          date: date
        });
      }

      if (newEntries.length > 0) {
        await Timetable.insertMany(newEntries);
      }
    } else {
      // Weekly timetable logic
      // 1. Delete all existing weekly timetable entries for this teacher
      await Timetable.deleteMany({
        teacher: teacherId,
        $or: [{ date: null }, { date: { $exists: false } }]
      });

      // 2. Insert new entries
      const newEntries = [];
      for (const slot of slots) {
        if (!slot.classId || !slot.subjectId) continue;

        // Delete any duplicate slot for the same class, day, and period to avoid collisions
        await Timetable.deleteMany({
          class: slot.classId,
          day: slot.day,
          period: slot.period,
          $or: [{ date: null }, { date: { $exists: false } }]
        });

        newEntries.push({
          class: slot.classId,
          day: slot.day,
          period: slot.period,
          timeSlot: slot.timeSlot,
          teacher: teacherId,
          subject: slot.subjectId
        });
      }

      if (newEntries.length > 0) {
        await Timetable.insertMany(newEntries);
      }
    }

    // Emit socket update so teacher dashboard updates in real time
    try {
      const io = getIO();
      if (io) {
        io.emit('timetable_update', { teacherId });
      }
    } catch (ioErr) {
      console.error('Socket emission error in saveTeacherTimetableBulk:', ioErr);
    }

    return res.status(200).json({
      status: true,
      message: date ? 'Daily timetable override updated successfully' : 'Weekly timetable updated successfully'
    });
  } catch (error) {
    console.error('Error in saveTeacherTimetableBulk:', error);
    return safeError(res, error, 'SaveTeacherTimetableBulk');
  }
};
