import express from 'express';
import { prisma, formatLegacyId } from '../db/prisma.js';
import { protect } from '../middleware/authMiddleware.js';
import cache from '../lib/cache.js';

const router = express.Router();

// GET all timetables with optional filters and rich relation objects
router.get('/', async (req, res) => {
  try {
    const { classId, teacherId, standard, section, day, teacher } = req.query;
    const where = {};

    if (standard && standard !== 'All') where.standard = String(standard);
    if (section && section !== 'All') where.section = String(section);
    if (day && day !== 'All') where.day = String(day);
    if (classId && classId !== 'All') where.classId = String(classId);
    if (teacher && teacher !== 'All') where.teacher = String(teacher);

    if (teacherId && teacherId !== 'All') {
      try {
        let lookupId = String(teacherId).trim();

        const [matchedTeacherObj, matchedUserObj] = await Promise.all([
          prisma.teacher.findFirst({
            where: {
              OR: [
                { id: lookupId },
                { userId: lookupId },
                { employeeId: lookupId },
                { name: lookupId }
              ]
            }
          }).catch(() => null),
          prisma.user.findFirst({
            where: {
              OR: [
                { id: lookupId },
                { employeeId: lookupId },
                { name: lookupId }
              ]
            }
          }).catch(() => null)
        ]);

        const possibleIds = new Set([lookupId]);
        const possibleNames = new Set();
        const possibleEmpIds = new Set();

        if (matchedTeacherObj) {
          if (matchedTeacherObj.id) possibleIds.add(matchedTeacherObj.id);
          if (matchedTeacherObj.userId) possibleIds.add(matchedTeacherObj.userId);
          if (matchedTeacherObj.name) possibleNames.add(matchedTeacherObj.name.trim());
          if (matchedTeacherObj.employeeId) possibleEmpIds.add(matchedTeacherObj.employeeId.trim());
        }

        if (matchedUserObj) {
          if (matchedUserObj.id) possibleIds.add(matchedUserObj.id);
          if (matchedUserObj.name) possibleNames.add(matchedUserObj.name.trim());
          if (matchedUserObj.employeeId) possibleEmpIds.add(matchedUserObj.employeeId.trim());
        }

        const orConditions = [
          { teacherId: { in: Array.from(possibleIds) } }
        ];

        possibleNames.forEach(n => {
          orConditions.push({ teacher: { equals: n, mode: 'insensitive' } });
          orConditions.push({ teacher: { contains: n, mode: 'insensitive' } });
        });

        possibleEmpIds.forEach(emp => {
          orConditions.push({ employeeId: { equals: emp, mode: 'insensitive' } });
        });

        where.OR = orConditions;
      } catch (_) {
        where.teacherId = String(teacherId);
      }
    }

    const [timetables, classes, subjects, teachers] = await Promise.all([
      prisma.timetable.findMany({
        where,
        orderBy: [{ day: 'asc' }, { period: 'asc' }]
      }),
      prisma.class.findMany(),
      prisma.subject.findMany(),
      prisma.teacher.findMany()
    ]);

    // Create lookup maps for fast resolution
    const classById = new Map();
    const classByStdSec = new Map();
    classes.forEach(c => {
      classById.set(c.id, c);
      classByStdSec.set(`${c.standard}-${c.section}`, c);
    });

    const subjectById = new Map();
    const subjectByName = new Map();
    subjects.forEach(s => {
      subjectById.set(s.id, s);
      subjectByName.set(s.name, s);
    });

    const teacherById = new Map();
    const teacherByName = new Map();
    teachers.forEach(t => {
      teacherById.set(t.id, t);
      teacherById.set(t.employeeId, t);
      teacherByName.set(t.name, t);
    });

    const formatted = timetables.map(entry => {
      const matchedClass = (entry.classId && classById.get(entry.classId)) || classByStdSec.get(`${entry.standard}-${entry.section}`);
      const matchedSubject = (entry.subjectId && subjectById.get(entry.subjectId)) || subjectByName.get(entry.subject);
      const matchedTeacher = (entry.teacherId && teacherById.get(entry.teacherId)) || teacherByName.get(entry.teacher);

      const resolvedClassId = matchedClass?.id || entry.classId || null;
      const resolvedTeacherId = matchedTeacher?.id || entry.teacherId || null;
      const resolvedSubjectId = matchedSubject?.id || entry.subjectId || null;

      const slotTime = entry.timeSlot || (entry.startTime && entry.endTime ? `${entry.startTime}-${entry.endTime}` : null);

      return {
        _id: entry.id,
        id: entry.id,
        classId: resolvedClassId,
        standard: entry.standard,
        section: entry.section,
        board: entry.board || matchedClass?.board || 'CBSE',
        class: {
          _id: resolvedClassId,
          id: resolvedClassId,
          standard: entry.standard,
          section: entry.section,
          board: entry.board || matchedClass?.board || 'CBSE',
          roomNumber: entry.room || matchedClass?.roomNumber || null
        },
        day: entry.day,
        period: entry.period,
        subjectId: resolvedSubjectId,
        subject: entry.subject,
        subjectName: entry.subject,
        subjectCode: entry.subjectCode || matchedSubject?.code || null,
        subjectObj: {
          _id: resolvedSubjectId,
          id: resolvedSubjectId,
          name: entry.subject,
          code: entry.subjectCode || matchedSubject?.code || null
        },
        teacherId: resolvedTeacherId,
        teacher: entry.teacher,
        teacherName: entry.teacher,
        employeeId: entry.employeeId || matchedTeacher?.employeeId || 'FAC',
        teacherObj: {
          _id: resolvedTeacherId,
          id: resolvedTeacherId,
          name: entry.teacher,
          employeeId: entry.employeeId || matchedTeacher?.employeeId || 'FAC'
        },
        room: entry.room || matchedClass?.roomNumber || null,
        startTime: entry.startTime || null,
        endTime: entry.endTime || null,
        timeSlot: slotTime,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt
      };
    });

    res.json({ status: true, data: formatted });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Helper to resolve entity IDs into strings and vice versa
async function resolveTimetablePayload(body) {
  let {
    classId,
    teacherId,
    subjectId,
    standard,
    section,
    board,
    day,
    period,
    subject,
    subjectCode,
    teacher,
    employeeId,
    room,
    startTime,
    endTime,
    timeSlot
  } = body;

  // 1. Resolve Class
  if (classId) {
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (cls) {
      standard = cls.standard;
      section = cls.section;
      board = cls.board || board || 'CBSE';
      room = room || cls.roomNumber;
    }
  } else if (standard && section) {
    const cls = await prisma.class.findFirst({ where: { standard, section } });
    if (cls) {
      classId = cls.id;
      board = cls.board || board || 'CBSE';
      room = room || cls.roomNumber;
    }
  }

  // 2. Resolve Teacher (Always link exact Teacher.id and employeeId)
  let resolvedTeacher = null;
  if (teacherId) {
    resolvedTeacher = await prisma.teacher.findFirst({
      where: { OR: [{ id: teacherId }, { employeeId: teacherId }, { userId: teacherId }] }
    }).catch(() => null);
    if (!resolvedTeacher) {
      const u = await prisma.user.findFirst({ where: { id: teacherId } }).catch(() => null);
      if (u) {
        resolvedTeacher = await prisma.teacher.findFirst({ where: { OR: [{ userId: u.id }, { email: u.email }] } }).catch(() => null);
        if (!resolvedTeacher) {
          teacher = u.name;
          employeeId = u.employeeId || employeeId || 'FAC';
        }
      }
    }
  }

  if (!resolvedTeacher && teacher) {
    resolvedTeacher = await prisma.teacher.findFirst({
      where: { name: { equals: teacher.trim(), mode: 'insensitive' } }
    }).catch(() => null);
  }

  if (resolvedTeacher) {
    teacherId = resolvedTeacher.id;
    teacher = resolvedTeacher.name;
    employeeId = resolvedTeacher.employeeId || employeeId || 'FAC';
  }

  // 3. Resolve Subject
  if (subjectId) {
    const s = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (s) {
      subject = s.name;
      subjectCode = s.code || subjectCode;
    }
  } else if (subject) {
    const s = await prisma.subject.findFirst({ where: { name: { equals: subject.trim(), mode: 'insensitive' } } });
    if (s) {
      subjectId = s.id;
      subjectCode = s.code || subjectCode;
    }
  }

  if (timeSlot && (!startTime || !endTime)) {
    const parts = timeSlot.split(/[-–—]/).map(s => s.trim());
    if (parts.length >= 2) {
      startTime = parts[0];
      endTime = parts[1];
    }
  }

  return {
    classId: classId || null,
    standard: standard || '10th',
    section: section || 'A',
    board: board || 'CBSE',
    day: day || 'Monday',
    period: Number(period) || 1,
    subjectId: subjectId || null,
    subject: subject || 'General',
    subjectCode: subjectCode || null,
    teacherId: teacherId || null,
    teacher: teacher || 'Faculty',
    employeeId: employeeId || 'FAC',
    room: room || null,
    startTime: startTime || null,
    endTime: endTime || null,
    timeSlot: timeSlot || (startTime && endTime ? `${startTime}-${endTime}` : null)
  };
}

// POST create or upsert timetable slot
router.post('/', async (req, res) => {
  try {
    const resolved = await resolveTimetablePayload(req.body);

    // Conflict Check: Ensure this faculty is not already booked in another class at this day and period
    if (resolved.teacherId || resolved.teacher) {
      const teacherConflict = await prisma.timetable.findFirst({
        where: {
          day: resolved.day,
          period: resolved.period,
          OR: [
            ...(resolved.teacherId ? [{ teacherId: resolved.teacherId }] : []),
            ...(resolved.teacher ? [{ teacher: { equals: resolved.teacher, mode: 'insensitive' } }] : [])
          ],
          NOT: {
            AND: [
              { standard: resolved.standard },
              { section: resolved.section }
            ]
          }
        }
      });

      if (teacherConflict) {
        return res.status(409).json({
          status: false,
          conflict: true,
          message: `Schedule Conflict: Faculty "${resolved.teacher}" is already scheduled for Class ${teacherConflict.standard}-${teacherConflict.section} during Period ${resolved.period} on ${resolved.day}!`
        });
      }
    }

    // Check if slot already exists for this class/day/period
    const existing = await prisma.timetable.findFirst({
      where: {
        standard: resolved.standard,
        section: resolved.section,
        day: resolved.day,
        period: resolved.period
      }
    });

    let entry;
    if (existing) {
      entry = await prisma.timetable.update({
        where: { id: existing.id },
        data: resolved
      });
    } else {
      entry = await prisma.timetable.create({
        data: resolved
      });
    }

    cache.flush('timetable');
    cache.flush('master:');

    res.status(201).json({
      status: true,
      message: 'Timetable slot saved successfully',
      data: formatLegacyId(entry)
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// PUT update timetable entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.timetable.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Timetable slot not found' });
    }

    const resolved = await resolveTimetablePayload({ ...existing, ...req.body });

    // Conflict Check excluding current slot
    if (resolved.teacherId || resolved.teacher) {
      const teacherConflict = await prisma.timetable.findFirst({
        where: {
          id: { not: id },
          day: resolved.day,
          period: resolved.period,
          OR: [
            ...(resolved.teacherId ? [{ teacherId: resolved.teacherId }] : []),
            ...(resolved.teacher ? [{ teacher: { equals: resolved.teacher, mode: 'insensitive' } }] : [])
          ],
          NOT: {
            AND: [
              { standard: resolved.standard },
              { section: resolved.section }
            ]
          }
        }
      });

      if (teacherConflict) {
        return res.status(409).json({
          status: false,
          conflict: true,
          message: `Schedule Conflict: Faculty "${resolved.teacher}" is already scheduled for Class ${teacherConflict.standard}-${teacherConflict.section} during Period ${resolved.period} on ${resolved.day}!`
        });
      }
    }

    const updated = await prisma.timetable.update({
      where: { id },
      data: resolved
    });

    cache.flush('timetable');
    cache.flush('master:');

    res.json({
      status: true,
      message: 'Timetable slot updated successfully',
      data: formatLegacyId(updated)
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST bulk timetable update
router.post('/bulk', async (req, res) => {
  try {
    const { teacherId, slots = [] } = req.body;
    let savedCount = 0;

    for (const slot of slots) {
      const resolved = await resolveTimetablePayload({
        teacherId: teacherId || slot.teacherId,
        ...slot
      });

      const existing = await prisma.timetable.findFirst({
        where: {
          standard: resolved.standard,
          section: resolved.section,
          day: resolved.day,
          period: resolved.period
        }
      });

      if (existing) {
        await prisma.timetable.update({
          where: { id: existing.id },
          data: resolved
        });
      } else {
        await prisma.timetable.create({
          data: resolved
        });
      }
      savedCount++;
    }

    cache.flush('timetable');
    cache.flush('master:');

    res.json({
      status: true,
      message: `Successfully updated ${savedCount} timetable slot(s)`
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// DELETE timetable entry
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.timetable.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Timetable entry not found' });
    }

    await prisma.timetable.delete({
      where: { id: req.params.id }
    });

    cache.flush('timetable');
    cache.flush('master:');

    res.json({ status: true, message: 'Timetable entry deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

export default router;
