import express from 'express';
import { prisma, formatLegacyId } from '../db/prisma.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET all subjects (optionally filtered by classId, standard, or search)
router.get('/', async (req, res) => {
  try {
    const { classId, standard, search } = req.query;
    const where = {};
    if (classId && classId !== 'all') {
      where.classId = classId;
    }
    if (standard && standard !== 'all') {
      where.standard = standard;
    }
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { code: { contains: search.trim(), mode: 'insensitive' } },
        { standard: { contains: search.trim(), mode: 'insensitive' } },
        { className: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const subjects = await prisma.subject.findMany({
      where,
      include: { materials: true },
      orderBy: [{ standard: 'asc' }, { name: 'asc' }]
    });

    res.json({ status: true, data: formatLegacyId(subjects) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST create a new subject linked to a class
router.post('/', async (req, res) => {
  try {
    const { name, code, standard, section, board, classId, className, type, weeklyHours } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: false, message: 'Subject name is required' });
    }

    let resolvedStandard = standard || '';
    let resolvedSection = section || '';
    let resolvedBoard = board || 'CBSE';
    let resolvedClassName = className || '';

    // If classId is provided, resolve class details directly from Class database
    if (classId && classId !== 'all' && classId !== 'none') {
      const cls = await prisma.class.findUnique({ where: { id: classId } });
      if (cls) {
        resolvedStandard = cls.standard;
        resolvedSection = cls.section;
        resolvedBoard = cls.board || 'CBSE';
        resolvedClassName = `${cls.standard} - ${cls.section} (${resolvedBoard})`;
      }
    } else if (resolvedStandard) {
      resolvedClassName = resolvedSection
        ? `${resolvedStandard} - ${resolvedSection} (${resolvedBoard})`
        : `${resolvedStandard} (${resolvedBoard})`;
    }

    // Auto-generate code if none provided
    const resolvedCode = code?.trim() || `${name.trim().substring(0, 4).toUpperCase()}${resolvedStandard ? '-' + resolvedStandard : ''}${resolvedSection ? resolvedSection : ''}`;

    const subject = await prisma.subject.create({
      data: {
        name: name.trim(),
        code: resolvedCode,
        standard: resolvedStandard || null,
        section: resolvedSection || null,
        board: resolvedBoard || 'CBSE',
        classId: (classId && classId !== 'all' && classId !== 'none') ? classId : null,
        className: resolvedClassName || null,
        type: type || 'Core',
        weeklyHours: parseInt(weeklyHours, 10) || 4
      }
    });

    return res.status(201).json({
      status: true,
      message: `Subject "${subject.name}" created successfully`,
      data: formatLegacyId(subject)
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// PUT update an existing subject
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, standard, section, board, classId, className, type, weeklyHours } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: false, message: 'Subject name is required' });
    }

    let resolvedStandard = standard;
    let resolvedSection = section;
    let resolvedBoard = board || 'CBSE';
    let resolvedClassName = className;

    if (classId && classId !== 'all' && classId !== 'none') {
      const cls = await prisma.class.findUnique({ where: { id: classId } });
      if (cls) {
        resolvedStandard = cls.standard;
        resolvedSection = cls.section;
        resolvedBoard = cls.board || 'CBSE';
        resolvedClassName = `${cls.standard} - ${cls.section} (${resolvedBoard})`;
      }
    } else if (resolvedStandard) {
      resolvedClassName = resolvedSection
        ? `${resolvedStandard} - ${resolvedSection} (${resolvedBoard})`
        : `${resolvedStandard} (${resolvedBoard})`;
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        name: name.trim(),
        ...(code !== undefined && { code: code ? code.trim() : null }),
        ...(resolvedStandard !== undefined && { standard: resolvedStandard || null }),
        ...(resolvedSection !== undefined && { section: resolvedSection || null }),
        ...(resolvedBoard !== undefined && { board: resolvedBoard || 'CBSE' }),
        ...(classId !== undefined && { classId: (classId && classId !== 'all' && classId !== 'none') ? classId : null }),
        ...(resolvedClassName !== undefined && { className: resolvedClassName || null }),
        ...(type !== undefined && { type }),
        ...(weeklyHours !== undefined && { weeklyHours: parseInt(weeklyHours, 10) || 4 })
      }
    });

    return res.json({
      status: true,
      message: `Subject "${updated.name}" updated successfully`,
      data: formatLegacyId(updated)
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// DELETE a subject
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Subject not found' });
    }

    await prisma.subject.delete({
      where: { id }
    });

    return res.json({
      status: true,
      message: `Subject "${existing.name}" deleted successfully`
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// GET mappings
router.get('/mappings', async (req, res) => {
  try {
    const { teacherId, classId, standard, search } = req.query;
    const where = {};
    if (teacherId && teacherId !== 'All') where.teacherId = teacherId;
    if (classId && classId !== 'All') where.classId = classId;
    if (standard && standard !== 'All') where.standard = standard;
    if (search && search.trim()) {
      where.OR = [
        { teacherName: { contains: search.trim(), mode: 'insensitive' } },
        { subject: { contains: search.trim(), mode: 'insensitive' } },
        { standard: { contains: search.trim(), mode: 'insensitive' } },
        { section: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const list = await prisma.teacherClassSubjectMapping.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const formatted = list.map(m => ({
      _id: m.id,
      id: m.id,
      teacherId: m.teacherId,
      teacherName: m.teacherName,
      employeeId: m.employeeId || 'FAC',
      teacher: {
        id: m.teacherId,
        _id: m.teacherId,
        name: m.teacherName,
        employeeId: m.employeeId || 'FAC'
      },
      classId: m.classId,
      standard: m.standard,
      section: m.section,
      board: m.board || 'CBSE',
      class: {
        id: m.classId,
        _id: m.classId,
        standard: m.standard,
        section: m.section,
        board: m.board || 'CBSE',
        roomNumber: m.roomNumber
      },
      subjectId: m.subjectId,
      subjectName: m.subject,
      subjectCode: m.subjectCode,
      subject: {
        id: m.subjectId,
        _id: m.subjectId,
        name: m.subject,
        code: m.subjectCode
      },
      roomNumber: m.roomNumber,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt
    }));

    res.json({ status: true, data: formatted });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST create mapping
router.post('/mappings', async (req, res) => {
  try {
    const { teacherId, classId, subjectId, teacherName, employeeId, standard, section, board, subject, subjectCode, roomNumber } = req.body;
    let tName = teacherName;
    let empId = employeeId;
    let std = standard;
    let sec = section;
    let brd = board || 'CBSE';
    let sub = subject;
    let subCode = subjectCode;
    let rm = roomNumber;

    if (teacherId) {
      const t = await prisma.teacher.findFirst({
        where: { OR: [{ id: teacherId }, { employeeId: teacherId }] }
      });
      if (t) {
        tName = t.name;
        empId = t.employeeId || 'FAC';
      }
    }
    if (classId) {
      const c = await prisma.class.findUnique({ where: { id: classId } });
      if (c) {
        std = c.standard;
        sec = c.section;
        brd = c.board || 'CBSE';
        rm = c.roomNumber || rm;
      }
    }
    if (subjectId) {
      const s = await prisma.subject.findUnique({ where: { id: subjectId } });
      if (s) {
        sub = s.name;
        subCode = s.code || subCode;
      }
    }

    if (!tName || !std || !sub) {
      return res.status(400).json({ status: false, message: 'Teacher, Class, and Subject are all required' });
    }

    const created = await prisma.teacherClassSubjectMapping.create({
      data: {
        teacherId: teacherId || null,
        teacherName: tName,
        employeeId: empId || 'FAC',
        classId: classId || null,
        standard: std,
        section: sec || 'A',
        board: brd,
        subjectId: subjectId || null,
        subject: sub,
        subjectCode: subCode || null,
        roomNumber: rm || null
      }
    });

    const formatted = {
      _id: created.id,
      id: created.id,
      teacherId: created.teacherId,
      teacherName: created.teacherName,
      employeeId: created.employeeId,
      teacher: { id: created.teacherId, _id: created.teacherId, name: created.teacherName, employeeId: created.employeeId },
      classId: created.classId,
      standard: created.standard,
      section: created.section,
      board: created.board,
      class: { id: created.classId, _id: created.classId, standard: created.standard, section: created.section, board: created.board, roomNumber: created.roomNumber },
      subjectId: created.subjectId,
      subjectName: created.subject,
      subjectCode: created.subjectCode,
      subject: { id: created.subjectId, _id: created.subjectId, name: created.subject, code: created.subjectCode },
      roomNumber: created.roomNumber,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    };

    res.status(201).json({ status: true, message: 'Assignment created successfully', data: formatted });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// PUT update mapping
router.put('/mappings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, classId, subjectId, teacherName, employeeId, standard, section, board, subject, subjectCode, roomNumber } = req.body;

    const existing = await prisma.teacherClassSubjectMapping.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Assignment not found' });
    }

    let tName = teacherName || existing.teacherName;
    let empId = employeeId || existing.employeeId;
    let std = standard || existing.standard;
    let sec = section || existing.section;
    let brd = board || existing.board || 'CBSE';
    let sub = subject || existing.subject;
    let subCode = subjectCode || existing.subjectCode;
    let rm = roomNumber || existing.roomNumber;

    if (teacherId) {
      const t = await prisma.teacher.findFirst({
        where: { OR: [{ id: teacherId }, { employeeId: teacherId }] }
      });
      if (t) {
        tName = t.name;
        empId = t.employeeId || 'FAC';
      }
    }
    if (classId) {
      const c = await prisma.class.findUnique({ where: { id: classId } });
      if (c) {
        std = c.standard;
        sec = c.section;
        brd = c.board || 'CBSE';
        rm = c.roomNumber || rm;
      }
    }
    if (subjectId) {
      const s = await prisma.subject.findUnique({ where: { id: subjectId } });
      if (s) {
        sub = s.name;
        subCode = s.code || subCode;
      }
    }

    const updated = await prisma.teacherClassSubjectMapping.update({
      where: { id },
      data: {
        teacherId: teacherId || existing.teacherId,
        teacherName: tName,
        employeeId: empId,
        classId: classId || existing.classId,
        standard: std,
        section: sec,
        board: brd,
        subjectId: subjectId || existing.subjectId,
        subject: sub,
        subjectCode: subCode,
        roomNumber: rm
      }
    });

    const formatted = {
      _id: updated.id,
      id: updated.id,
      teacherId: updated.teacherId,
      teacherName: updated.teacherName,
      employeeId: updated.employeeId,
      teacher: { id: updated.teacherId, _id: updated.teacherId, name: updated.teacherName, employeeId: updated.employeeId },
      classId: updated.classId,
      standard: updated.standard,
      section: updated.section,
      board: updated.board,
      class: { id: updated.classId, _id: updated.classId, standard: updated.standard, section: updated.section, board: updated.board, roomNumber: updated.roomNumber },
      subjectId: updated.subjectId,
      subjectName: updated.subject,
      subjectCode: updated.subjectCode,
      subject: { id: updated.subjectId, _id: updated.subjectId, name: updated.subject, code: updated.subjectCode },
      roomNumber: updated.roomNumber,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    };

    res.json({ status: true, message: 'Assignment updated successfully', data: formatted });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// DELETE mapping
router.delete('/mappings/:id', async (req, res) => {
  try {
    const existing = await prisma.teacherClassSubjectMapping.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Assignment not found' });
    }

    await prisma.teacherClassSubjectMapping.delete({
      where: { id: req.params.id }
    });
    res.json({ status: true, message: 'Assignment removed successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

export default router;
