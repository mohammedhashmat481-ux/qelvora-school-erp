import express from 'express';
import { prisma, formatLegacyId } from '../db/prisma.js';
import { protect, allowTeacherAndAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Helper to resolve Teacher record from req.user
 */
async function resolveTeacher(user) {
  if (!user) return null;
  const userEmpId = (user.employeeId || user.employee_id || '').trim();
  const userEmail = (user.email || '').trim().toLowerCase();
  const userName = (user.name || '').trim();
  const userId = user.id;

  try {
    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          ...(userId ? [{ userId: userId }, { id: userId }] : []),
          ...(userEmpId ? [{ employeeId: userEmpId }] : []),
          ...(userEmail ? [{ email: userEmail }] : []),
          ...(userName ? [{ name: userName }] : [])
        ]
      }
    });
    if (teacher) return teacher;
  } catch (err) {
    console.error('Error resolving teacher:', err.message);
  }

  // Graceful fallback to user info
  return {
    id: userId || 'teacher-uuid',
    userId: userId,
    name: userName || 'Teacher',
    employeeId: userEmpId || 'EMP001',
    email: userEmail,
    assignedClass: '',
    assignedSection: '',
    primary_subject: ''
  };
}

/**
 * Helper to check if user has admin/principal privileges
 */
function isUserAdmin(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return (
    role.includes('admin') ||
    role === 'principal' ||
    role === 'superadmin' ||
    Boolean(user.isAdmin) ||
    Boolean(user.grantAdminPrivilege)
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. GET /api/teacher-work/meta
 * Fetch dropdown metadata for Teacher form: classes, sections, subjects, assigned slots
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/meta', protect, async (req, res) => {
  try {
    const teacher = await resolveTeacher(req.user);
    const isAdmin = isUserAdmin(req.user);

    // Fetch classes and subjects
    const [allClasses, allSubjects, timetables] = await Promise.all([
      prisma.class.findMany({
        orderBy: [{ standard: 'asc' }, { section: 'asc' }]
      }).catch(() => []),
      prisma.subject.findMany({
        orderBy: { name: 'asc' }
      }).catch(() => []),
      teacher?.name
        ? prisma.timetable.findMany({
            where: {
              OR: [
                { teacher: teacher.name },
                ...(teacher.id ? [{ teacherId: teacher.id }] : []),
                ...(teacher.employeeId ? [{ employeeId: teacher.employeeId }] : [])
              ]
            }
          }).catch(() => [])
        : []
    ]);

    // Unique standards
    const standardList = Array.from(new Set(allClasses.map(c => c.standard))).filter(Boolean);
    
    // Class to section map
    const classSectionsMap = {};
    allClasses.forEach(c => {
      if (!classSectionsMap[c.standard]) {
        classSectionsMap[c.standard] = [];
      }
      if (c.section && !classSectionsMap[c.standard].includes(c.section)) {
        classSectionsMap[c.standard].push(c.section);
      }
    });

    // Assigned subjects from teacher profile & timetables
    const assignedSubjectsSet = new Set();
    if (teacher?.primary_subject) assignedSubjectsSet.add(teacher.primary_subject);
    if (teacher?.secondary_subject) assignedSubjectsSet.add(teacher.secondary_subject);
    timetables.forEach(t => {
      if (t.subject) assignedSubjectsSet.add(t.subject);
    });

    // Assigned classes/sections
    const assignedClasses = [];
    if (teacher?.assignedClass) {
      assignedClasses.push({
        standard: teacher.assignedClass,
        section: teacher.assignedSection || 'A'
      });
    }
    timetables.forEach(t => {
      if (t.standard && !assignedClasses.some(a => a.standard === t.standard && a.section === t.section)) {
        assignedClasses.push({ standard: t.standard, section: t.section || 'A' });
      }
    });

    return res.json({
      status: true,
      teacher: {
        id: teacher?.id || req.user.id,
        name: teacher?.name || req.user.name,
        employeeId: teacher?.employeeId || req.user.employeeId || 'EMP001',
        email: teacher?.email || req.user.email
      },
      standards: standardList,
      classSectionsMap,
      allClasses: allClasses.map(formatLegacyId),
      allSubjects: allSubjects.map(formatLegacyId),
      assignedSubjects: Array.from(assignedSubjectsSet),
      assignedClasses,
      timetables: timetables.map(formatLegacyId)
    });
  } catch (err) {
    console.error('Error fetching teacher-work meta:', err);
    return res.status(500).json({ status: false, message: 'Failed to load form metadata' });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. POST /api/teacher-work
 * Create one or multiple daily work entries for the authenticated teacher
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.post('/', protect, async (req, res) => {
  try {
    const teacher = await resolveTeacher(req.user);
    const teacherName = teacher?.name || req.user.name || 'Faculty Member';
    const employeeId = teacher?.employeeId || req.user.employeeId || 'EMP001';
    const teacherId = teacher?.id || req.user.id;
    const schoolId = req.user.schoolId || '';

    // Handle single entry or batch entries
    const rawEntries = Array.isArray(req.body.entries) 
      ? req.body.entries 
      : [req.body];

    if (!rawEntries.length) {
      return res.status(400).json({ status: false, message: 'No work entries provided' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const currentTimeStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const createdRecords = [];
    const errors = [];

    for (let i = 0; i < rawEntries.length; i++) {
      const entry = rawEntries[i];
      const date = (entry.date || req.body.date || todayStr).trim();
      const standard = (entry.standard || '').trim();
      const section = (entry.section || '').trim();
      const subject = (entry.subject || '').trim();
      const topicTaught = (entry.topicTaught || '').trim();
      const workCompleted = (entry.workCompleted || '').trim();
      const homeworkAssigned = (entry.homeworkAssigned || '').trim();
      const remarks = (entry.remarks || '').trim();
      const period = entry.period ? parseInt(entry.period, 10) : 1;
      const timeSlot = (entry.timeSlot || '').trim();
      const status = entry.status === 'Draft' ? 'Draft' : 'Submitted';

      if (!standard || !section || !subject || !topicTaught || !workCompleted) {
        errors.push(`Entry #${i + 1} is missing required fields (Class, Section, Subject, Topic, or Work Completed)`);
        continue;
      }

      // Check for accidental duplicate submission on the same day, class, section, subject, and period
      const existing = await prisma.teacherDailyWork.findFirst({
        where: {
          teacherName,
          date,
          standard,
          section,
          subject,
          period
        }
      });

      if (existing) {
        // Update the existing entry rather than duplicating
        const updated = await prisma.teacherDailyWork.update({
          where: { id: existing.id },
          data: {
            topicTaught,
            workCompleted,
            homeworkAssigned,
            remarks,
            timeSlot: timeSlot || existing.timeSlot,
            status,
            submissionTime: currentTimeStr
          }
        });
        createdRecords.push(formatLegacyId(updated));
      } else {
        // Create new entry
        const created = await prisma.teacherDailyWork.create({
          data: {
            schoolId,
            teacherId,
            teacherName,
            employeeId,
            date,
            standard,
            section,
            classId: entry.classId || '',
            subject,
            subjectId: entry.subjectId || '',
            period: isNaN(period) ? 1 : period,
            timeSlot,
            topicTaught,
            workCompleted,
            homeworkAssigned,
            remarks,
            status,
            academicYear: entry.academicYear || '2026-2027',
            submissionTime: currentTimeStr
          }
        });
        createdRecords.push(formatLegacyId(created));
      }
    }

    if (!createdRecords.length && errors.length) {
      return res.status(400).json({ status: false, message: errors.join('; ') });
    }

    return res.status(201).json({
      status: true,
      message: `Successfully saved ${createdRecords.length} daily work report${createdRecords.length > 1 ? 's' : ''}`,
      count: createdRecords.length,
      data: createdRecords,
      warnings: errors.length ? errors : undefined
    });
  } catch (err) {
    console.error('Error submitting daily work:', err);
    return res.status(500).json({ status: false, message: 'Server error saving daily work report: ' + err.message });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. GET /api/teacher-work/my-history
 * Fetch the authenticated teacher's submitted daily work reports
 * Teachers can only view their own reports!
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/my-history', protect, async (req, res) => {
  try {
    const teacher = await resolveTeacher(req.user);
    const teacherName = teacher?.name || req.user.name;
    const employeeId = teacher?.employeeId || req.user.employeeId;
    const teacherId = teacher?.id || req.user.id;

    const {
      date,
      startDate,
      endDate,
      standard,
      section,
      subject,
      search,
      page = 1,
      limit = 25
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(5, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    // Strict teacher filter
    const teacherFilter = {
      OR: [
        ...(teacherId ? [{ teacherId: teacherId }] : []),
        ...(employeeId ? [{ employeeId: employeeId }] : []),
        ...(teacherName ? [{ teacherName: teacherName }] : [])
      ]
    };

    const where = {
      AND: [
        teacherFilter,
        ...(date && date !== 'All' ? [{ date: String(date) }] : []),
        ...(startDate && endDate ? [{ date: { gte: String(startDate), lte: String(endDate) } }] : []),
        ...(standard && standard !== 'All' ? [{ standard: String(standard) }] : []),
        ...(section && section !== 'All' ? [{ section: String(section) }] : []),
        ...(subject && subject !== 'All' ? [{ subject: String(subject) }] : []),
        ...(search && search.trim() ? [{
          OR: [
            { topicTaught: { contains: search.trim(), mode: 'insensitive' } },
            { workCompleted: { contains: search.trim(), mode: 'insensitive' } },
            { homeworkAssigned: { contains: search.trim(), mode: 'insensitive' } },
            { subject: { contains: search.trim(), mode: 'insensitive' } }
          ]
        }] : [])
      ]
    };

    const [total, reports] = await Promise.all([
      prisma.teacherDailyWork.count({ where }),
      prisma.teacherDailyWork.findMany({
        where,
        orderBy: [
          { date: 'desc' },
          { period: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limitNum
      })
    ]);

    return res.json({
      status: true,
      data: reports.map(formatLegacyId),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    console.error('Error fetching my-history:', err);
    return res.status(500).json({ status: false, message: 'Failed to fetch work history' });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. PUT /api/teacher-work/:id
 * Edit an existing daily work report (teachers can only edit their own reports)
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await resolveTeacher(req.user);
    const isAdmin = isUserAdmin(req.user);

    const existing = await prisma.teacherDailyWork.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ status: false, message: 'Work report not found' });
    }

    // Permission check: owner or admin
    const isOwner =
      existing.teacherId === req.user.id ||
      existing.teacherId === teacher?.id ||
      existing.employeeId === teacher?.employeeId ||
      existing.teacherName?.toLowerCase() === req.user.name?.toLowerCase();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ status: false, message: 'You are not authorized to edit this report' });
    }

    const {
      standard,
      section,
      subject,
      period,
      timeSlot,
      topicTaught,
      workCompleted,
      homeworkAssigned,
      remarks,
      date,
      status
    } = req.body;

    const updated = await prisma.teacherDailyWork.update({
      where: { id },
      data: {
        ...(standard ? { standard: standard.trim() } : {}),
        ...(section ? { section: section.trim() } : {}),
        ...(subject ? { subject: subject.trim() } : {}),
        ...(period !== undefined ? { period: parseInt(period, 10) } : {}),
        ...(timeSlot !== undefined ? { timeSlot: timeSlot.trim() } : {}),
        ...(topicTaught !== undefined ? { topicTaught: topicTaught.trim() } : {}),
        ...(workCompleted !== undefined ? { workCompleted: workCompleted.trim() } : {}),
        ...(homeworkAssigned !== undefined ? { homeworkAssigned: homeworkAssigned.trim() } : {}),
        ...(remarks !== undefined ? { remarks: remarks.trim() } : {}),
        ...(date ? { date: date.trim() } : {}),
        ...(status ? { status } : {})
      }
    });

    return res.json({
      status: true,
      message: 'Work report updated successfully',
      data: formatLegacyId(updated)
    });
  } catch (err) {
    console.error('Error updating work report:', err);
    return res.status(500).json({ status: false, message: 'Failed to update work report' });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 5. DELETE /api/teacher-work/:id
 * Delete a daily work report (only owner or admin)
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await resolveTeacher(req.user);
    const isAdmin = isUserAdmin(req.user);

    const existing = await prisma.teacherDailyWork.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ status: false, message: 'Work report not found' });
    }

    const isOwner =
      existing.teacherId === req.user.id ||
      existing.teacherId === teacher?.id ||
      existing.employeeId === teacher?.employeeId ||
      existing.teacherName?.toLowerCase() === req.user.name?.toLowerCase();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ status: false, message: 'You are not authorized to delete this report' });
    }

    await prisma.teacherDailyWork.delete({ where: { id } });

    return res.json({
      status: true,
      message: 'Work report deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting work report:', err);
    return res.status(500).json({ status: false, message: 'Failed to delete work report' });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 6. GET /api/teacher-work/admin/overview
 * Dashboard summary cards & submission tracking list for Admin
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/admin/overview', protect, async (req, res) => {
  try {
    const isAdmin = isUserAdmin(req.user);
    if (!isAdmin) {
      return res.status(403).json({ status: false, message: 'Admin access required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const selectedDate = (req.query.date || todayStr).trim();

    // Check if selectedDate is Sunday
    const parts = selectedDate.split('-');
    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const isSunday = dateObj.getDay() === 0;

    // Parallel fetch: all active teachers, daily work submissions for date, approved leaves
    const [allTeachers, submissionsToday, approvedLeaves] = await Promise.all([
      prisma.teacher.findMany({
        orderBy: { name: 'asc' }
      }),
      prisma.teacherDailyWork.findMany({
        where: { date: selectedDate }
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: 'Approved',
          startDate: { lte: selectedDate },
          endDate: { gte: selectedDate }
        }
      }).catch(() => [])
    ]);

    const totalTeachers = allTeachers.length;

    // Distinct teachers who submitted today
    const submittedTeacherNames = new Set();
    const submittedTeacherEmpIds = new Set();
    const submittedTeacherIds = new Set();

    submissionsToday.forEach(sub => {
      if (sub.teacherName) submittedTeacherNames.add(sub.teacherName.toLowerCase());
      if (sub.employeeId) submittedTeacherEmpIds.add(sub.employeeId.toUpperCase());
      if (sub.teacherId) submittedTeacherIds.add(sub.teacherId);
    });

    const submittedTeachersCount = allTeachers.filter(t => {
      const matchName = t.name && submittedTeacherNames.has(t.name.toLowerCase());
      const matchEmp = t.employeeId && submittedTeacherEmpIds.has(t.employeeId.toUpperCase());
      const matchId = t.id && submittedTeacherIds.has(t.id);
      return matchName || matchEmp || matchId;
    }).length;

    const yetToSubmitCount = Math.max(0, totalTeachers - submittedTeachersCount);
    const totalEntriesToday = submissionsToday.length;

    // Classes covered today (e.g. "10th - A", "9th - B")
    const classesCoveredSet = new Set();
    submissionsToday.forEach(s => {
      if (s.standard) {
        classesCoveredSet.add(`${s.standard} ${s.section || ''}`.trim());
      }
    });
    const totalClassesCovered = classesCoveredSet.size;

    // Approved leave teacher names
    const onLeaveTeacherNames = new Set(
      approvedLeaves.map(l => (l.applicantName || '').toLowerCase())
    );

    // Build teacher submission tracking roster
    const trackingList = allTeachers.map(teacher => {
      const teacherSubmissions = submissionsToday.filter(s => {
        const matchName = s.teacherName && teacher.name && s.teacherName.toLowerCase() === teacher.name.toLowerCase();
        const matchEmp = s.employeeId && teacher.employeeId && s.employeeId.toUpperCase() === teacher.employeeId.toUpperCase();
        const matchId = s.teacherId && teacher.id && s.teacherId === teacher.id;
        return matchName || matchEmp || matchId;
      });

      const hasSubmitted = teacherSubmissions.length > 0;
      const onLeave = onLeaveTeacherNames.has((teacher.name || '').toLowerCase());

      let submissionStatus = 'Not Submitted';
      let statusColor = 'rose';

      if (hasSubmitted) {
        submissionStatus = 'Submitted';
        statusColor = 'emerald';
      } else if (isSunday) {
        submissionStatus = 'Sunday / Off';
        statusColor = 'gray';
      } else if (onLeave) {
        submissionStatus = 'On Approved Leave';
        statusColor = 'amber';
      }

      const latestSub = teacherSubmissions.length
        ? teacherSubmissions[teacherSubmissions.length - 1]
        : null;

      return {
        id: teacher.id,
        name: teacher.name,
        employeeId: teacher.employeeId,
        department: teacher.department || 'Academic',
        assignedClass: teacher.assignedClass || '',
        assignedSection: teacher.assignedSection || '',
        primarySubject: teacher.primary_subject || '',
        submissionStatus,
        statusColor,
        entriesCount: teacherSubmissions.length,
        lastSubmissionTime: latestSub?.submissionTime || '',
        topicsTaught: teacherSubmissions.map(s => s.topicTaught).filter(Boolean),
        submissions: teacherSubmissions.map(formatLegacyId)
      };
    });

    return res.json({
      status: true,
      date: selectedDate,
      isSunday,
      summary: {
        totalTeachers,
        submittedToday: submittedTeachersCount,
        yetToSubmit: isSunday ? 0 : yetToSubmitCount,
        totalEntriesToday,
        totalClassesCovered
      },
      trackingList
    });
  } catch (err) {
    console.error('Error fetching admin overview:', err);
    return res.status(500).json({ status: false, message: 'Failed to load admin overview' });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 7. GET /api/teacher-work/admin/reports
 * Complete filterable, searchable list of all teachers' work submissions
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/admin/reports', protect, async (req, res) => {
  try {
    const isAdmin = isUserAdmin(req.user);
    if (!isAdmin) {
      return res.status(403).json({ status: false, message: 'Admin access required' });
    }

    const {
      date,
      startDate,
      endDate,
      teacherId,
      teacherName,
      employeeId,
      standard,
      section,
      subject,
      search,
      page = 1,
      limit = 25
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(5, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const whereConditions = [];

    if (date && date !== 'All') {
      whereConditions.push({ date: String(date) });
    }

    if (startDate && endDate) {
      whereConditions.push({
        date: { gte: String(startDate), lte: String(endDate) }
      });
    }

    if (teacherId && teacherId !== 'All') {
      whereConditions.push({
        OR: [
          { teacherId: String(teacherId) },
          { teacherName: String(teacherId) },
          { employeeId: String(teacherId) }
        ]
      });
    }

    if (teacherName && teacherName !== 'All') {
      whereConditions.push({
        teacherName: { contains: String(teacherName), mode: 'insensitive' }
      });
    }

    if (employeeId && employeeId !== 'All') {
      whereConditions.push({ employeeId: String(employeeId) });
    }

    if (standard && standard !== 'All') {
      whereConditions.push({ standard: String(standard) });
    }

    if (section && section !== 'All') {
      whereConditions.push({ section: String(section) });
    }

    if (subject && subject !== 'All') {
      whereConditions.push({ subject: String(subject) });
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereConditions.push({
        OR: [
          { teacherName: { contains: q, mode: 'insensitive' } },
          { employeeId: { contains: q, mode: 'insensitive' } },
          { topicTaught: { contains: q, mode: 'insensitive' } },
          { workCompleted: { contains: q, mode: 'insensitive' } },
          { homeworkAssigned: { contains: q, mode: 'insensitive' } },
          { subject: { contains: q, mode: 'insensitive' } }
        ]
      });
    }

    const where = whereConditions.length ? { AND: whereConditions } : {};

    const [total, reports] = await Promise.all([
      prisma.teacherDailyWork.count({ where }),
      prisma.teacherDailyWork.findMany({
        where,
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' },
          { period: 'asc' }
        ],
        skip,
        take: limitNum
      })
    ]);

    return res.json({
      status: true,
      data: reports.map(formatLegacyId),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    console.error('Error fetching admin reports:', err);
    return res.status(500).json({ status: false, message: 'Failed to load teacher work reports' });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 8. GET /api/teacher-work/admin/teacher/:teacherId
 * Historical curriculum progression and reports for a specific teacher
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/admin/teacher/:teacherId', protect, async (req, res) => {
  try {
    const isAdmin = isUserAdmin(req.user);
    if (!isAdmin) {
      return res.status(403).json({ status: false, message: 'Admin access required' });
    }

    const { teacherId } = req.params;
    const { startDate, endDate } = req.query;

    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { id: teacherId },
          { employeeId: teacherId },
          { name: teacherId }
        ]
      }
    });

    const where = {
      OR: [
        { teacherId: teacherId },
        ...(teacher ? [{ teacherName: teacher.name }, { employeeId: teacher.employeeId }] : [{ teacherName: teacherId }])
      ],
      ...(startDate && endDate ? { date: { gte: String(startDate), lte: String(endDate) } } : {})
    };

    const reports = await prisma.teacherDailyWork.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { period: 'asc' }
      ]
    });

    // Compute curriculum progression by subject and class
    const progressionMap = {};
    reports.forEach(r => {
      const key = `${r.standard}-${r.section || ''}-${r.subject}`;
      if (!progressionMap[key]) {
        progressionMap[key] = {
          standard: r.standard,
          section: r.section,
          subject: r.subject,
          topicsCount: 0,
          entries: []
        };
      }
      progressionMap[key].topicsCount++;
      progressionMap[key].entries.push(formatLegacyId(r));
    });

    return res.json({
      status: true,
      teacher: teacher ? formatLegacyId(teacher) : { name: teacherId },
      totalSubmissions: reports.length,
      progression: Object.values(progressionMap),
      reports: reports.map(formatLegacyId)
    });
  } catch (err) {
    console.error('Error fetching teacher history:', err);
    return res.status(500).json({ status: false, message: 'Failed to load teacher history' });
  }
});

export default router;
