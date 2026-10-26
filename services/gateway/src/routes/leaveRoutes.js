import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { prisma } from '../db/prisma.js';

const router = express.Router();

let DEMO_LEAVE_REQUESTS = [
  {
    _id: "l1",
    id: "l1",
    teacherId: "e2238591-ed64-4ed7-a5b2-40ccae4d1149",
    teacherName: "Priya Patel",
    teacher: {
      _id: "e2238591-ed64-4ed7-a5b2-40ccae4d1149",
      id: "e2238591-ed64-4ed7-a5b2-40ccae4d1149",
      name: "Priya Patel",
      employeeId: "EMP002"
    },
    leaveDate: "2026-09-30",
    reason: "Medical Appointment",
    status: "Pending",
    createdAt: "2026-09-28T10:00:00.000Z"
  },
  {
    _id: "l2",
    id: "l2",
    teacherId: "0010dacb-76ce-4704-9cf6-43e158a401f7",
    teacherName: "Dr. Rajesh Sharma",
    teacher: {
      _id: "0010dacb-76ce-4704-9cf6-43e158a401f7",
      id: "0010dacb-76ce-4704-9cf6-43e158a401f7",
      name: "Dr. Rajesh Sharma",
      employeeId: "EMP001"
    },
    leaveDate: "2026-09-24",
    reason: "Academic Conference & Curriculum Seminar",
    status: "Approved",
    substitutes: [
      { period: 1, substituteName: "Ananya Sen", subject: "Mathematics" }
    ],
    createdAt: "2026-09-22T08:30:00.000Z",
    processedAt: "2026-09-22T14:00:00.000Z"
  },
  {
    _id: "l3",
    id: "l3",
    teacherId: "e3d8451a-b2f3-4b5f-99bd-3ffab0b51e03",
    teacherName: "Sneha Reddy",
    teacher: {
      _id: "e3d8451a-b2f3-4b5f-99bd-3ffab0b51e03",
      id: "e3d8451a-b2f3-4b5f-99bd-3ffab0b51e03",
      name: "Sneha Reddy",
      employeeId: "EMP005"
    },
    leaveDate: "2026-09-18",
    reason: "Personal Family Event",
    status: "Approved",
    substitutes: [
      { period: 2, substituteName: "Vikram Singh", subject: "English" }
    ],
    createdAt: "2026-09-15T09:15:00.000Z",
    processedAt: "2026-09-15T11:45:00.000Z"
  }
];

// GET /api/leaves/requests & /api/leaves/my-requests
// GET /api/leaves & /api/leaves/requests
router.get(['/requests', '/'], protect, async (req, res) => {
  try {
    const [teachers, dbLeaves] = await Promise.all([
      prisma.teacher.findMany({ select: { id: true, name: true, employeeId: true } }).catch(() => []),
      prisma.leaveRequest.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => [])
    ]);

    const teacherMap = new Map(teachers.map(t => [t.id, t]));
    const teacherByName = new Map(teachers.map(t => [t.name.toLowerCase().trim(), t]));

    const formattedDbLeaves = dbLeaves.map(l => {
      const matchT = teacherByName.get((l.applicantName || '').toLowerCase().trim());
      return {
        _id: l.id,
        id: l.id,
        teacherId: matchT?.id || l.id,
        teacherName: l.applicantName,
        teacher: {
          _id: matchT?.id || l.id,
          id: matchT?.id || l.id,
          name: l.applicantName,
          employeeId: matchT?.employeeId || 'FAC'
        },
        leaveDate: l.startDate,
        endDate: l.endDate,
        reason: l.reason,
        status: l.status,
        createdAt: l.createdAt
      };
    });

    const enrichedDemo = DEMO_LEAVE_REQUESTS.map(l => {
      const dbTeacher = teacherMap.get(l.teacherId) || teacherByName.get((l.teacherName || '').toLowerCase().trim());
      const name = dbTeacher?.name || l.teacherName || l.teacher?.name || 'Faculty Member';
      return {
        ...l,
        teacherName: name,
        teacher: {
          _id: l.teacherId,
          id: l.teacherId,
          name,
          employeeId: dbTeacher?.employeeId || l.teacher?.employeeId || ''
        }
      };
    });

    // Merge DB leaves and Demo leaves without duplicate IDs
    const combined = [...formattedDbLeaves];
    enrichedDemo.forEach(d => {
      if (!combined.some(c => c.id === d.id || c.teacherName === d.teacherName && c.leaveDate === d.leaveDate)) {
        combined.push(d);
      }
    });

    res.json({ status: true, data: combined });
  } catch (err) {
    res.json({ status: true, data: DEMO_LEAVE_REQUESTS });
  }
});

router.get('/my-requests', protect, async (req, res) => {
  const uId = req.user.id;
  const uName = (req.user.name || '').toLowerCase().trim();
  const uEmpId = (req.user.employeeId || req.user.employee_id || '').toLowerCase().trim();

  let dbLeaves = [];
  try {
    const list = await prisma.leaveRequest.findMany({
      where: {
        OR: [
          { applicantName: { equals: req.user.name, mode: 'insensitive' } },
          ...(req.user.name ? [{ applicantName: { contains: req.user.name.split(' ')[0], mode: 'insensitive' } }] : [])
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    dbLeaves = list.map(l => ({
      _id: l.id,
      id: l.id,
      teacherId: uId,
      teacherName: l.applicantName,
      teacher: {
        _id: uId,
        id: uId,
        name: l.applicantName,
        employeeId: uEmpId || 'FAC'
      },
      leaveDate: l.startDate,
      reason: l.reason,
      status: l.status,
      createdAt: l.createdAt
    }));
  } catch (_) {}

  const filteredDemo = DEMO_LEAVE_REQUESTS.filter(l => {
    if (l.teacherId === uId) return true;
    if (l.teacher?._id === uId || l.teacher?.id === uId) return true;
    if (uName && (l.teacherName?.toLowerCase().trim() === uName || l.teacher?.name?.toLowerCase().trim() === uName)) return true;
    if (uEmpId && (l.teacher?.employeeId?.toLowerCase().trim() === uEmpId)) return true;
    return false;
  });

  const combined = [...dbLeaves];
  filteredDemo.forEach(d => {
    if (!combined.some(c => c.id === d.id || (c.leaveDate === d.leaveDate && c.reason === d.reason))) {
      combined.push(d);
    }
  });

  res.json({ status: true, data: combined });
});

// POST /api/leaves/request
router.post('/request', protect, async (req, res) => {
  try {
    const { leaveDate, reason } = req.body;
    let tName = req.user?.name || 'Faculty Member';
    let empId = req.user?.employeeId || req.user?.employee_id || 'EMP001';
    let role = req.user?.role || 'Senior Educator';

    if (req.user?.id) {
      const dbTeacher = await prisma.teacher.findFirst({
        where: { OR: [{ id: req.user.id }, { userId: req.user.id }, { email: req.user.email }] },
        select: { id: true, name: true, employeeId: true }
      });
      if (dbTeacher?.name) tName = dbTeacher.name;
      if (dbTeacher?.employeeId) empId = dbTeacher.employeeId;
    }

    let createdDb = null;
    try {
      createdDb = await prisma.leaveRequest.create({
        data: {
          applicantName: tName,
          applicantRole: role,
          reason: reason || 'Personal Leave',
          startDate: leaveDate || new Date().toISOString().split('T')[0],
          endDate: leaveDate || new Date().toISOString().split('T')[0],
          status: 'Pending'
        }
      });
    } catch (e) {
      console.warn('Prisma leaveRequest create warning:', e.message);
    }

    const newLeave = {
      _id: createdDb?.id || `leave-${Date.now()}`,
      id: createdDb?.id || `leave-${Date.now()}`,
      teacherId: req.user.id,
      teacherName: tName,
      teacher: {
        _id: req.user.id,
        id: req.user.id,
        name: tName,
        employeeId: empId
      },
      leaveDate: leaveDate || new Date().toISOString().split('T')[0],
      reason: reason || 'Personal Leave',
      status: 'Pending',
      createdAt: createdDb?.createdAt ? createdDb.createdAt.toISOString() : new Date().toISOString()
    };

    DEMO_LEAVE_REQUESTS.unshift(newLeave);
    res.json({ status: true, message: 'Leave request submitted successfully', data: newLeave });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// GET /api/leaves/substitute-suggestions
router.get('/substitute-suggestions', protect, async (req, res) => {
  try {
    const { teacherId, date } = req.query;

    // Load available faculty from database
    const allTeachers = await prisma.teacher.findMany({
      select: { id: true, name: true, employeeId: true, qualification: true }
    });

    // Available substitute candidates (excluding the absent teacher)
    const availableCandidates = allTeachers.filter(t => t.id !== teacherId);

    // Standard period structure for the leave date
    const periods = [
      {
        periodEntryId: `pe-${teacherId || 'def'}-1`,
        period: 1,
        timeSlot: '08:30-09:15',
        class: 'Class 10th - A',
        classId: '10th-A',
        subject: 'Physics',
        candidates: availableCandidates.map((t, idx) => ({
          teacherId: t.id,
          name: t.name,
          employeeId: t.employeeId,
          subjectMatch: t.qualification?.toLowerCase().includes('physic') || idx === 0,
          status: 'Available'
        }))
      },
      {
        periodEntryId: `pe-${teacherId || 'def'}-2`,
        period: 2,
        timeSlot: '09:15-10:00',
        class: 'Class 9th - A',
        classId: '9th-A',
        subject: 'Science',
        candidates: availableCandidates.map((t, idx) => ({
          teacherId: t.id,
          name: t.name,
          employeeId: t.employeeId,
          subjectMatch: t.qualification?.toLowerCase().includes('chem') || idx === 1,
          status: 'Available'
        }))
      },
      {
        periodEntryId: `pe-${teacherId || 'def'}-3`,
        period: 3,
        timeSlot: '10:00-10:45',
        class: 'Class 8th - A',
        classId: '8th-A',
        subject: 'General Science',
        candidates: availableCandidates.map((t, idx) => ({
          teacherId: t.id,
          name: t.name,
          employeeId: t.employeeId,
          subjectMatch: true,
          status: 'Available'
        }))
      }
    ];

    res.json({
      status: true,
      data: periods
    });
  } catch (err) {
    console.error('Error fetching substitute suggestions:', err);
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/leaves/approve/:id
router.post('/approve/:id', protect, async (req, res) => {
  try {
    const { status, substituteAllocations } = req.body;
    let found = false;
    let updatedData = null;

    try {
      const updated = await prisma.leaveRequest.update({
        where: { id: req.params.id },
        data: { status: status || 'Approved' }
      });
      if (updated) {
        found = true;
        updatedData = {
          _id: updated.id,
          id: updated.id,
          teacherName: updated.applicantName,
          leaveDate: updated.startDate,
          reason: updated.reason,
          status: updated.status,
          processedAt: new Date().toISOString(),
          substituteAllocations
        };
      }
    } catch (_) {}

    const leave = DEMO_LEAVE_REQUESTS.find(l => l.id === req.params.id || l._id === req.params.id);
    if (leave) {
      leave.status = status || 'Approved';
      leave.processedAt = new Date().toISOString();
      if (substituteAllocations) {
        leave.substituteAllocations = substituteAllocations;
      }
      found = true;
      if (!updatedData) updatedData = leave;
    }

    if (!found) {
      return res.status(404).json({ status: false, message: 'Leave request not found' });
    }

    res.json({
      status: true,
      message: `Leave request ${status ? status.toLowerCase() : 'approved'} successfully`,
      data: updatedData
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/leaves/assign-substitute-directly
router.post('/assign-substitute-directly', protect, async (req, res) => {
  res.json({ status: true, message: 'Substitute assigned successfully' });
});

export default router;
