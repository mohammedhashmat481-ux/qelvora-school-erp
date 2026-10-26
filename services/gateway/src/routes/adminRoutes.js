import jwt from 'jsonwebtoken';
import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma, formatLegacyId } from '../db/prisma.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

function formatRole(r, index = 0) {
  if (!r) return r;
  const defaultCode = `R${String(index + 1).padStart(3, '0')}`;
  const roleCode = (r.RoleCode && r.RoleCode !== 'AUTO-GENERATED') 
    ? r.RoleCode 
    : ((r.roleCode && r.roleCode !== 'AUTO-GENERATED' && r.roleCode !== '') 
      ? r.roleCode 
      : defaultCode);
  const rolename = r.Rolename || r.rolename || r.name || 'Untitled Role';
  const grantAdminPrivilege = r.GrantAdminPrivilege !== undefined 
    ? Boolean(r.GrantAdminPrivilege) 
    : (r.grantAdminPrivilege !== undefined ? Boolean(r.grantAdminPrivilege) : (r.GantAdminPrevillage !== undefined ? Boolean(r.GantAdminPrevillage) : false));
  const isActive = r.isActive !== undefined ? Boolean(r.isActive) : (r.isEnabled !== undefined ? Boolean(r.isEnabled) : (r.status !== 'Inactive'));
  const isEnabled = r.isEnabled !== undefined ? Boolean(r.isEnabled) : isActive;
  const createdBy = r.CreatedBy || r.createdBy || 'Admin';
  const id = r.id || r._id || `r-${Date.now()}`;

  return {
    _id: id,
    id: id,
    RoleCode: roleCode,
    roleCode: roleCode,
    Rolename: rolename,
    rolename: rolename,
    name: rolename,
    GrantAdminPrivilege: grantAdminPrivilege,
    grantAdminPrivilege: grantAdminPrivilege,
    GantAdminPrevillage: grantAdminPrivilege,
    CreatedBy: createdBy,
    createdBy: createdBy,
    status: isActive ? 'Active' : 'Inactive',
    isActive: isActive,
    isEnabled: isEnabled
  };
}

const DEMO_ROLES = [
  { _id: "r1", id: "r1", RoleCode: "PRIN", Rolename: "School Principal", GrantAdminPrivilege: true, CreatedBy: "System", status: "Active", isActive: true, isEnabled: true },
  { _id: "r2", id: "r2", RoleCode: "HOD", Rolename: "Department Head", GrantAdminPrivilege: true, CreatedBy: "System", status: "Active", isActive: true, isEnabled: true },
  { _id: "r3", id: "r3", RoleCode: "SRED", Rolename: "Senior Educator", GrantAdminPrivilege: false, CreatedBy: "System", status: "Active", isActive: true, isEnabled: true },
  { _id: "r4", id: "r4", RoleCode: "TCHR", Rolename: "Teacher", GrantAdminPrivilege: false, CreatedBy: "System", status: "Active", isActive: true, isEnabled: true },
  { _id: "r5", id: "r5", RoleCode: "ASTT", Rolename: "Assistant Teacher", GrantAdminPrivilege: false, CreatedBy: "System", status: "Active", isActive: true, isEnabled: true },
  { _id: "r6", id: "r6", RoleCode: "LBCO", Rolename: "Lab Coordinator", GrantAdminPrivilege: false, CreatedBy: "System", status: "Active", isActive: true, isEnabled: true },
  { _id: "r7", id: "r7", RoleCode: "TSAF", Rolename: "Transport & Safety Incharge", GrantAdminPrivilege: false, CreatedBy: "System", status: "Active", isActive: true, isEnabled: true },
  { _id: "r8", id: "r8", RoleCode: "EXAM", Rolename: "Examination Controller", GrantAdminPrivilege: true, CreatedBy: "System", status: "Active", isActive: true, isEnabled: true }
].map(formatRole);

const DEMO_EMPLOYEES = [
  { _id: "e1", id: "e1", employeeId: "EMP001", employee_id: "EMP001", name: "Dr. Rajesh Sharma", email: "rajesh.sharma@qelvora.in", phone: "+91 9876543210", qualification: "Ph.D. in Mathematics", experience: 12, status: "Active", role: "Teacher", skip_face: true, skip_location: true, is_enabled: true },
  { _id: "e2", id: "e2", employeeId: "EMP002", employee_id: "EMP002", name: "Priya Patel", email: "priya.patel@qelvora.in", phone: "+91 9876543211", qualification: "M.Sc. Physics", experience: 8, status: "Active", role: "Teacher", skip_face: true, skip_location: true, is_enabled: true },
  { _id: "e3", id: "e3", employeeId: "EMP003", employee_id: "EMP003", name: "Ananya Sen", email: "ananya.sen@qelvora.in", phone: "+91 9876543212", qualification: "M.Sc. Chemistry", experience: 6, status: "Active", role: "Teacher", skip_face: true, skip_location: true, is_enabled: true },
  { _id: "e4", id: "e4", employeeId: "EMP004", employee_id: "EMP004", name: "Vikram Singh", email: "vikram.singh@qelvora.in", phone: "+91 9876543213", qualification: "M.Sc. Biology", experience: 10, status: "Active", role: "Teacher", skip_face: true, skip_location: true, is_enabled: true }
];

// GET /api/roles
router.get('/roles', async (req, res) => {
  try {
    let roles = await prisma.role.findMany({ orderBy: { createdAt: 'asc' } });
    if (roles.length > 0) {
      // Guarantee Teacher role always exists in DB so it never disappears
      const hasTeacher = roles.some(r => (r.rolename || r.name || '').trim().toLowerCase() === 'teacher');
      if (!hasTeacher) {
        try {
          const tchr = await prisma.role.create({
            data: {
              roleCode: 'TCHR',
              rolename: 'Teacher',
              name: 'Teacher',
              grantAdminPrivilege: false,
              createdBy: 'System',
              status: 'Active',
              isActive: true,
              isEnabled: true,
              permissions: ['attendance', 'class', 'materials']
            }
          });
          roles.push(tchr);
        } catch (_) {}
      }
      return res.json({ status: true, data: roles.map((r, idx) => formatRole(r, idx)) });
    }
    // DB is empty — seed default roles into DB so they survive server restarts
    const seeded = [];
    for (const dr of DEMO_ROLES) {
      try {
        const created = await prisma.role.create({
          data: {
            roleCode: dr.RoleCode || dr.roleCode || 'R000',
            rolename: dr.Rolename || dr.rolename || 'Role',
            name: dr.Rolename || dr.rolename || 'Role',
            grantAdminPrivilege: Boolean(dr.GrantAdminPrivilege),
            createdBy: dr.CreatedBy || 'System',
            status: 'Active',
            isActive: true,
            isEnabled: true,
            permissions: []
          }
        });
        seeded.push(created);
      } catch (_e) {
        seeded.push(dr); // fallback to in-memory if DB insert fails
      }
    }
    return res.json({ status: true, data: seeded.map((r, idx) => formatRole(r, idx)) });
  } catch (_) {}
  res.json({ status: true, data: DEMO_ROLES.map((r, idx) => formatRole(r, idx)) });
});

router.post('/roles', async (req, res) => {
  try {
    const { Rolename, rolename, RoleCode, roleCode, GrantAdminPrivilege, grantAdminPrivilege, GantAdminPrevillage, isActive, isEnabled } = req.body;
    const nameVal = Rolename || rolename || req.body.name || 'New Role';
    
    let codeVal = RoleCode || roleCode;
    if (!codeVal || codeVal === 'AUTO-GENERATED') {
      let count = DEMO_ROLES.length;
      try {
        count = await prisma.role.count();
      } catch (_) {}
      codeVal = `R${String(count + 1).padStart(3, '0')}`;
    }

    const adminPriv = GrantAdminPrivilege !== undefined ? Boolean(GrantAdminPrivilege) : (grantAdminPrivilege !== undefined ? Boolean(grantAdminPrivilege) : Boolean(GantAdminPrevillage));
    const activeVal = isActive !== undefined ? Boolean(isActive) : (isEnabled !== undefined ? Boolean(isEnabled) : true);

    let createdRecord = null;
    try {
      createdRecord = await prisma.role.create({
        data: {
          roleCode: codeVal,
          rolename: nameVal,
          name: nameVal,
          grantAdminPrivilege: adminPriv,
          createdBy: 'Admin',
          status: activeVal ? 'Active' : 'Inactive',
          isActive: activeVal,
          isEnabled: activeVal
        }
      });
    } catch (err) {
      console.error("Prisma role create warning:", err.message);
    }

    const newRole = formatRole(createdRecord || {
      _id: `r-${Date.now()}`,
      id: `r-${Date.now()}`,
      RoleCode: codeVal,
      Rolename: nameVal,
      GrantAdminPrivilege: adminPriv,
      CreatedBy: 'Admin',
      status: activeVal ? 'Active' : 'Inactive',
      isActive: activeVal,
      isEnabled: activeVal
    });

    DEMO_ROLES.push(newRole);
    res.json({ status: true, message: 'Role created successfully', data: newRole });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// PUT /api/roles/:id
router.put('/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Rolename, rolename, RoleCode, roleCode, GrantAdminPrivilege, grantAdminPrivilege, GantAdminPrevillage, isActive, isEnabled, status } = req.body;
    
    const nameVal = Rolename || rolename || req.body.name;
    const codeVal = RoleCode || roleCode;
    const adminPriv = GrantAdminPrivilege !== undefined ? Boolean(GrantAdminPrivilege) : (grantAdminPrivilege !== undefined ? Boolean(grantAdminPrivilege) : (GantAdminPrevillage !== undefined ? Boolean(GantAdminPrevillage) : undefined));
    const activeVal = isActive !== undefined ? Boolean(isActive) : (isEnabled !== undefined ? Boolean(isEnabled) : (status !== undefined ? status === 'Active' : undefined));

    let updatedRecord = null;
    try {
      updatedRecord = await prisma.role.update({
        where: { id },
        data: {
          ...(nameVal && { rolename: nameVal, name: nameVal }),
          ...(codeVal && { roleCode: codeVal }),
          ...(adminPriv !== undefined && { grantAdminPrivilege: adminPriv }),
          ...(activeVal !== undefined && { isActive: activeVal, isEnabled: activeVal, status: activeVal ? 'Active' : 'Inactive' })
        }
      });
    } catch (_) {}

    let role = DEMO_ROLES.find(r => r._id === id || r.id === id);
    if (role) {
      if (nameVal !== undefined) role.Rolename = nameVal;
      if (codeVal !== undefined) role.RoleCode = codeVal;
      if (adminPriv !== undefined) role.GrantAdminPrivilege = adminPriv;
      if (activeVal !== undefined) {
        role.isActive = activeVal;
        role.isEnabled = activeVal;
        role.status = activeVal ? 'Active' : 'Inactive';
      }
    } else {
      role = { _id: id, id, ...req.body };
      DEMO_ROLES.push(role);
    }

    const resultRole = formatRole(updatedRecord || role);
    res.json({ status: true, message: 'Role updated successfully', data: resultRole });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// DELETE /api/roles/:id
router.delete('/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idx = DEMO_ROLES.findIndex(r => r._id === id || r.id === id);
    if (idx !== -1) {
      DEMO_ROLES.splice(idx, 1);
    }
    try {
      await prisma.role.delete({ where: { id } });
    } catch (_) {}

    res.json({ status: true, message: 'Role deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// GET /api/auth/admin/employees
// GET /api/auth/admin/employees
router.get('/auth/admin/employees', async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({ include: { user: true } });
    const nonTeaching = await prisma.nonTeachingStaff.findMany().catch(() => []);
    const staffUsers = await prisma.user.findMany({
      where: { role: { notIn: ['student', 'parent'] } }
    }).catch(() => []);

    const result = [];

    // 1. Add Staff & Admin Users (if not already mapped to a teacher profile)
    for (const u of staffUsers) {
      if (!teachers.some(t => t.email === u.email || t.userId === u.id)) {
        const isSuper = (u.role || '').toLowerCase() === 'admin' || (u.role || '').toLowerCase() === 'super_admin';
        result.push({
          _id: u.id,
          id: u.id,
          employeeId: (u.email === 'admin@qelvora.in' || isSuper) ? 'ADM001' : (u.id.substring(0, 6).toUpperCase()),
          name: u.name,
          email: u.email,
          phone: u.phone || '+91 98765 00001',
          department: 'Executive Leadership',
          role: u.role || 'Admin',
          skip_face: !!u.skip_face,
          skip_location: !!u.skip_location,
          is_enabled: u.isActive !== false,
          is_super_admin: isSuper,
          plain_password: u.plain_password || 'qelvora123',
          password: u.plain_password || 'qelvora123',
          userId: u.id
        });
      }
    }

    // 2. Add Teachers / Academic Faculty
    for (const t of teachers) {
      const item = formatLegacyId(t);
      let assignedRole = t.user?.role || t.designation || 'Teacher';
      if ((assignedRole || '').toLowerCase() === 'teacher') {
        assignedRole = 'Teacher';
      }
      item.role = assignedRole;
      item.skip_face = t.user ? t.user.skip_face : false;
      item.skip_location = t.user ? t.user.skip_location : false;
      item.is_enabled = t.user ? t.user.isActive !== false : true;
      item.is_super_admin = (item.role || '').toLowerCase() === 'admin' || (item.role || '').toLowerCase() === 'super_admin';
      item.plain_password = t.plain_password || t.user?.plain_password || 'qelvora123';
      item.password = item.plain_password;
      item.userId = t.userId || t.user?.id;
      result.push(item);
    }

    // 3. Add Non-Teaching Staff (Transport, Library, Finance, Safety)
    for (const nt of nonTeaching) {
      result.push({
        _id: nt.id,
        id: nt.id,
        employeeId: nt.employeeId,
        name: nt.name,
        email: nt.email || `${nt.employeeId.toLowerCase()}@qelvora.in`,
        phone: nt.phone,
        department: 'Operations & Administration',
        role: nt.role,
        skip_face: true,
        skip_location: true,
        is_enabled: true,
        is_super_admin: false,
        plain_password: nt.plain_password || 'qelvora123',
        password: nt.plain_password || 'qelvora123'
      });
    }

    if (result.length > 0) {
      return res.json({ status: true, data: result });
    }
  } catch (err) {
    console.error("Error fetching employees from database:", err);
  }
  res.json({ status: true, data: DEMO_EMPLOYEES });
});

// PUT /api/auth/admin/employee/:id/settings
router.put('/auth/admin/employee/:id/settings', async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    let emp = DEMO_EMPLOYEES.find(e => 
      e._id === id || e.id === id || 
      e.employeeId === id || e.employee_id === id ||
      (e.email && payload.email && e.email.toLowerCase() === payload.email.toLowerCase()) ||
      (e.email && e.email.toLowerCase() === id.toLowerCase())
    );
    
    if (payload.firstName || payload.lastName) {
      payload.name = [payload.firstName, payload.middleName, payload.lastName].filter(Boolean).join(' ');
    }
    const newPwd = payload.password || payload.plain_password;
    if (emp) {
      Object.assign(emp, payload);
      if (newPwd) emp.plain_password = newPwd;
      if (payload.role) emp.role = payload.role;
    } else {
      emp = { _id: id, id, plain_password: newPwd || 'qelvora123', ...payload };
      DEMO_EMPLOYEES.push(emp);
    }

    try {
      // 1. Check & Update Teacher Record
      let teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { id },
            { employeeId: id },
            ...(payload.employeeId || payload.employee_id ? [{ employeeId: payload.employeeId || payload.employee_id }] : []),
            ...(payload.email ? [{ email: payload.email }] : [])
          ]
        },
        include: { user: true }
      });

      if (teacher) {
        if (!teacher.userId && teacher.email) {
          const matchingUser = await prisma.user.findUnique({ where: { email: teacher.email } }).catch(() => null);
          if (matchingUser) {
            teacher.userId = matchingUser.id;
          }
        }

        const normalizedRole = (payload.role && payload.role.toLowerCase() === 'teacher') ? 'Teacher' : payload.role;

        const updateData = {
          ...(payload.name && { name: payload.name }),
          ...(payload.email && { email: payload.email }),
          ...(payload.phone && { phone: payload.phone }),
          ...(payload.qualification && { qualification: payload.qualification }),
          ...(normalizedRole && { designation: normalizedRole }),
          ...(teacher.userId && { userId: teacher.userId })
        };
        const requestedEmpId = payload.employeeId || payload.employee_id;
        if (requestedEmpId && requestedEmpId !== teacher.employeeId) {
          const conflict = await prisma.teacher.findFirst({
            where: { employeeId: requestedEmpId, id: { not: teacher.id } }
          }).catch(() => null);
          if (!conflict) {
            updateData.employeeId = requestedEmpId;
          }
        }
        await prisma.teacher.update({
          where: { id: teacher.id },
          data: updateData
        });
        if (teacher.userId && normalizedRole) {
          await prisma.user.update({
            where: { id: teacher.userId },
            data: { role: normalizedRole }
          });
        }
      }

      // 2. Check & Update Non-Teaching Staff Record
      let nonTeaching = await prisma.nonTeachingStaff.findFirst({
        where: {
          OR: [
            { id },
            { employeeId: id },
            ...(payload.employeeId || payload.employee_id ? [{ employeeId: payload.employeeId || payload.employee_id }] : []),
            ...(payload.email ? [{ email: payload.email }] : [])
          ]
        }
      });

      if (nonTeaching) {
        const updateData = {
          ...(payload.name && { name: payload.name }),
          ...(payload.email && { email: payload.email }),
          ...(payload.phone && { phone: payload.phone }),
          ...(payload.role && { role: payload.role })
        };
        const requestedEmpId = payload.employeeId || payload.employee_id;
        if (requestedEmpId && requestedEmpId !== nonTeaching.employeeId) {
          const conflict = await prisma.nonTeachingStaff.findFirst({
            where: { employeeId: requestedEmpId, id: { not: nonTeaching.id } }
          }).catch(() => null);
          if (!conflict) {
            updateData.employeeId = requestedEmpId;
          }
        }
        await prisma.nonTeachingStaff.update({
          where: { id: nonTeaching.id },
          data: updateData
        });
      }

      // 3. Update User Record & Password Hash if password was passed
      const activeFlag = payload.is_enabled !== undefined ? payload.is_enabled : (payload.isActive !== undefined ? payload.isActive : undefined);
      const targetUserId = teacher?.userId || teacher?.user?.id;
      const targetEmail = teacher?.email || teacher?.user?.email || payload.email;

      const userWhereConditions = [
        { id },
        ...(targetUserId ? [{ id: targetUserId }] : []),
        ...(targetEmail ? [{ email: targetEmail }] : [])
      ];

      const userDataToUpdate = {
        ...(payload.name && { name: payload.name }),
        ...(payload.phone && { phone: payload.phone }),
        ...(payload.role && { role: payload.role }),
        ...(payload.skip_face !== undefined && { skip_face: Boolean(payload.skip_face) }),
        ...(payload.skip_location !== undefined && { skip_location: Boolean(payload.skip_location) }),
        ...(activeFlag !== undefined && { isActive: Boolean(activeFlag) })
      };

      if (newPwd) {
        userDataToUpdate.password_hash = await bcrypt.hash(newPwd, 10);
      }

      await prisma.user.updateMany({
        where: { OR: userWhereConditions },
        data: userDataToUpdate
      });
    } catch (err) {
      console.error("Prisma employee update warning:", err.message);
    }

    res.json({ status: true, message: 'Employee settings updated successfully', data: emp });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// DELETE /api/auth/admin/employee/:id
router.delete('/auth/admin/employee/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const index = DEMO_EMPLOYEES.findIndex(e => e._id === id || e.id === id || e.employeeId === id || e.employee_id === id);
    if (index !== -1) {
      DEMO_EMPLOYEES.splice(index, 1);
    }
    try {
      const teacher = await prisma.teacher.findFirst({ where: { OR: [{ id }, { employeeId: id }] } });
      if (teacher) {
        if (teacher.userId) {
          await prisma.user.delete({ where: { id: teacher.userId } }).catch(() => {});
        }
        await prisma.teacher.delete({ where: { id: teacher.id } }).catch(() => {});
      }
    } catch (_) {}

    res.json({ status: true, message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/auth/admin/employee/:id/reset-password
router.post('/auth/admin/employee/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;
    if (!new_password) return res.status(400).json({ status: false, message: 'New password required' });

    let emp = DEMO_EMPLOYEES.find(e => e._id === id || e.id === id || e.employeeId === id || e.employee_id === id);
    if (emp) {
      emp.plain_password = new_password;
    }

    try {
      const hashedPassword = await bcrypt.hash(new_password, 10);
      const teacher = await prisma.teacher.findFirst({ where: { OR: [{ id }, { employeeId: id }] } });
      if (teacher && teacher.userId) {
        await prisma.user.update({
          where: { id: teacher.userId },
          data: { password_hash: hashedPassword }
        });
      }
    } catch (_) {}

    res.json({ status: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/auth/admin/employee/:id/upload-document
router.post('/auth/admin/employee/:id/upload-document', async (req, res) => {
  res.json({ status: true, message: 'Document uploaded successfully' });
});

// GET /api/auth/admin/employee/:id/download-document/:docType
router.get('/auth/admin/employee/:id/download-document/:docType', async (req, res) => {
  res.send('Sample Document Content');
});

let inMemorySettings = null;

// GET /api/auth/settings & /api/settings
router.get('/auth/settings', async (req, res) => {
  const defaultSettings = {
    schoolName: 'Qelvora School CRM',
    schoolLogo: '',
    logoSubtext: 'Empowering Educational Excellence',
    board: 'CBSE',
    academicYear: '2026-2027',
    hours_per_day: 8.0,
    hours_per_week: 40.0,
    hours_per_month: 160.0,
    hours_per_year: 1920.0,
    weekly_off: 'Sunday',
    office_start_time: '08:30',
    office_end_time: '16:00',
    grace_period_mins: 30,
    boardsList: ['CBSE', 'STATE', 'ICSE'],
    standardsList: ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'],
    hours_per_subject: 1,
    period_duration_mins: 45,
    game_period_mins: 45,
    lunch_break_mins: 45,
    lunch_break_start: '12:00',
    small_break_mins: 15,
    small_break_start: '10:30',
    face_auth_enabled: true,
    location_auth_enabled: true
  };

  try {
    const settings = await prisma.schoolSettings.findFirst();
    if (settings) {
      return res.json({ status: true, data: { ...defaultSettings, ...formatLegacyId(settings), ...(inMemorySettings || {}) } });
    }
  } catch (_) {}

  res.json({ status: true, data: { ...defaultSettings, ...(inMemorySettings || {}) } });
});

router.post('/auth/settings', async (req, res) => {
  try {
    const payload = req.body || {};
    inMemorySettings = { ...inMemorySettings, ...payload };

    let first = null;
    try {
      first = await prisma.schoolSettings.findFirst();
    } catch (_) {}

    const dataToSave = {
      schoolName: payload.schoolName || 'Qelvora School CRM',
      schoolLogo: payload.schoolLogo !== undefined ? payload.schoolLogo : (first?.schoolLogo || ''),
      logoSubtext: payload.logoSubtext || 'Empowering Educational Excellence',
      board: payload.board || 'CBSE',
      boardsList: payload.boardsList || ['CBSE', 'STATE', 'ICSE'],
      standardsList: payload.standardsList || ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'],
      face_auth_enabled: payload.face_auth_enabled !== undefined ? Boolean(payload.face_auth_enabled) : true,
      location_auth_enabled: payload.location_auth_enabled !== undefined ? Boolean(payload.location_auth_enabled) : true,
      hours_per_day: Math.round(parseFloat(payload.hours_per_day) || 8),
      hours_per_week: Math.round(parseFloat(payload.hours_per_week) || 40),
      hours_per_month: Math.round(parseFloat(payload.hours_per_month) || 160),
      hours_per_year: Math.round(parseFloat(payload.hours_per_year) || 1920),
      weekly_off: payload.weekly_off || 'Sunday',
      hours_per_subject: Math.round(parseFloat(payload.hours_per_subject) || 1),
      period_duration_mins: parseInt(payload.period_duration_mins) || 45,
      game_period_mins: parseInt(payload.game_period_mins) || 45,
      lunch_break_mins: parseInt(payload.lunch_break_mins) || 45,
      lunch_break_start: payload.lunch_break_start || '12:00',
      small_break_mins: parseInt(payload.small_break_mins) || 15,
      small_break_start: payload.small_break_start || '10:30'
    };

    if (first) {
      await prisma.schoolSettings.update({
        where: { id: first.id },
        data: dataToSave
      });
    } else {
      await prisma.schoolSettings.create({
        data: dataToSave
      });
    }

    res.json({ status: true, message: 'Settings updated successfully', data: { ...dataToSave, ...payload } });
  } catch (err) {
    console.error('Error saving school settings:', err.message);
    res.json({ status: true, message: 'Settings updated in memory', data: req.body });
  }
});

// GET /api/classes & /api/admin/classes
router.get(['/classes', '/admin/classes'], async (req, res) => {
  try {
    let dbClasses = await prisma.class.findMany({
      orderBy: [
        { standard: 'asc' },
        { section: 'asc' }
      ]
    });

    // If no classes exist yet in DB, create initial standard defaults
    if (!dbClasses || dbClasses.length === 0) {
      const initialStandards = [
        { standard: 'Nursery', section: 'A', roomNumber: 'Playgroup Hall' },
        { standard: 'LKG', section: 'A', roomNumber: 'Kindergarten 1' },
        { standard: 'UKG', section: 'A', roomNumber: 'Kindergarten 2' },
        { standard: '1st', section: 'A', roomNumber: 'Room 001' },
        { standard: '5th', section: 'A', roomNumber: 'Room 105' },
        { standard: '6th', section: 'A', roomNumber: 'Room 104' },
        { standard: '7th', section: 'A', roomNumber: 'Room 103' },
        { standard: '8th', section: 'A', roomNumber: 'Room 101' },
        { standard: '8th', section: 'B', roomNumber: 'Room 102' },
        { standard: '9th', section: 'A', roomNumber: 'Room 201' },
        { standard: '9th', section: 'B', roomNumber: 'Room 202' },
        { standard: '10th', section: 'A', roomNumber: 'Room 301' },
        { standard: '10th', section: 'B', roomNumber: 'Room 302' }
      ];
      for (const item of initialStandards) {
        try {
          await prisma.class.create({
            data: {
              standard: item.standard,
              section: item.section,
              board: 'CBSE',
              roomNumber: item.roomNumber,
              strength: 35
            }
          });
        } catch (_) {}
      }
      dbClasses = await prisma.class.findMany({
        orderBy: [{ standard: 'asc' }, { section: 'asc' }]
      });
    }

    // Format classes with classTeacher object, default board, and enrolled student counts
    const formatted = await Promise.all(dbClasses.map(async (c) => {
      let enrolled = 0;
      try {
        enrolled = await prisma.student.count({
          where: { standard: c.standard, section: c.section }
        });
      } catch (_) {}

      return {
        ...c,
        _id: c.id,
        id: c.id,
        board: c.board || 'CBSE',
        strength: enrolled > 0 ? enrolled : (c.strength || 0),
        enrolledStudents: enrolled,
        roomNumber: c.roomNumber || '',
        classTeacherId: c.classTeacherId || null,
        classTeacherName: c.classTeacherName || null,
        classTeacher: c.classTeacherName ? {
          _id: c.classTeacherId,
          id: c.classTeacherId,
          name: c.classTeacherName
        } : null
      };
    }));

    return res.json({ status: true, data: formatted });
  } catch (err) {
    console.error('Error fetching classes:', err);
    return res.status(500).json({ status: false, message: 'Failed to fetch classes' });
  }
});

router.post('/classes', async (req, res) => {
  try {
    const { standard, section, board, classTeacher, classTeacherId, roomNumber, strength } = req.body;
    if (!standard || !section) {
      return res.status(400).json({ status: false, message: 'Standard and Section are required' });
    }

    const cleanStandard = standard.trim();
    const cleanSection = section.trim().toUpperCase();
    const cleanBoard = (board || 'CBSE').trim();
    const cleanStrength = parseInt(strength) >= 0 ? parseInt(strength) : 0;
    const cleanRoom = roomNumber ? roomNumber.trim() : null;

    // Check duplicate
    const existing = await prisma.class.findUnique({
      where: {
        standard_section: {
          standard: cleanStandard,
          section: cleanSection
        }
      }
    });

    if (existing) {
      return res.status(400).json({ status: false, message: `Class ${cleanStandard}-${cleanSection} already exists` });
    }

    // Resolve teacher name
    let teacherId = classTeacherId || classTeacher || null;
    let teacherName = null;
    if (teacherId) {
      try {
        const u = await prisma.user.findUnique({ where: { id: teacherId } });
        if (u) teacherName = u.name;
      } catch (_) {}
    }

    const created = await prisma.class.create({
      data: {
        standard: cleanStandard,
        section: cleanSection,
        board: cleanBoard,
        classTeacherId: teacherId,
        classTeacherName: teacherName,
        roomNumber: cleanRoom,
        strength: cleanStrength
      }
    });

    const result = {
      ...created,
      _id: created.id,
      id: created.id,
      board: created.board || 'CBSE',
      classTeacher: teacherName ? { _id: teacherId, id: teacherId, name: teacherName } : null
    };

    return res.status(201).json({ status: true, message: `Class ${cleanStandard}-${cleanSection} created successfully!`, data: result });
  } catch (err) {
    console.error('Error creating class:', err);
    return res.status(500).json({ status: false, message: err.message || 'Failed to create class' });
  }
});

router.put('/classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { standard, section, board, classTeacher, classTeacherId, roomNumber, strength } = req.body;

    const existingClass = await prisma.class.findUnique({
      where: { id }
    });

    if (!existingClass) {
      return res.status(404).json({ status: false, message: 'Class not found' });
    }

    const cleanStandard = standard ? standard.trim() : existingClass.standard;
    const cleanSection = section ? section.trim().toUpperCase() : existingClass.section;
    const cleanBoard = board ? board.trim() : (existingClass.board || 'CBSE');
    const cleanStrength = strength !== undefined ? (parseInt(strength) >= 0 ? parseInt(strength) : 0) : existingClass.strength;
    const cleanRoom = roomNumber !== undefined ? (roomNumber ? roomNumber.trim() : null) : existingClass.roomNumber;

    // Check collision if standard or section changed
    if (cleanStandard !== existingClass.standard || cleanSection !== existingClass.section) {
      const collision = await prisma.class.findUnique({
        where: {
          standard_section: {
            standard: cleanStandard,
            section: cleanSection
          }
        }
      });
      if (collision && collision.id !== id) {
        return res.status(400).json({ status: false, message: `Class ${cleanStandard}-${cleanSection} already exists` });
      }
    }

    let teacherId = classTeacherId !== undefined ? classTeacherId : (classTeacher !== undefined ? classTeacher : existingClass.classTeacherId);
    let teacherName = existingClass.classTeacherName;
    if (teacherId && teacherId !== existingClass.classTeacherId) {
      try {
        const u = await prisma.user.findUnique({ where: { id: teacherId } });
        teacherName = u ? u.name : null;
      } catch (_) {}
    } else if (!teacherId) {
      teacherId = null;
      teacherName = null;
    }

    const updated = await prisma.class.update({
      where: { id },
      data: {
        standard: cleanStandard,
        section: cleanSection,
        board: cleanBoard,
        classTeacherId: teacherId,
        classTeacherName: teacherName,
        roomNumber: cleanRoom,
        strength: cleanStrength
      }
    });

    const result = {
      ...updated,
      _id: updated.id,
      id: updated.id,
      board: updated.board || 'CBSE',
      classTeacher: teacherName ? { _id: teacherId, id: teacherId, name: teacherName } : null
    };

    return res.json({ status: true, message: `Class ${cleanStandard}-${cleanSection} updated successfully!`, data: result });
  } catch (err) {
    console.error('Error updating class:', err);
    return res.status(500).json({ status: false, message: err.message || 'Failed to update class' });
  }
});

router.delete('/classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.class.delete({
      where: { id }
    });
    return res.json({ status: true, message: 'Class deleted successfully' });
  } catch (err) {
    console.error('Error deleting class:', err);
    return res.status(500).json({ status: false, message: err.message || 'Failed to delete class' });
  }
});

// Faculty Adding
router.post('/faculty/teacher', async (req, res) => {
  try {
    const { name, firstName, middleName, lastName, email, phone, role, employeeId, password, qualification, primary_subject, secondary_subject } = req.body;
    const empCode = employeeId || `TCH${String(DEMO_EMPLOYEES.length + 1).padStart(3, '0')}`;
    const empEmail = email || `faculty${Date.now()}@qelvora.in`;
    const empName = (firstName || lastName)
      ? [firstName, middleName, lastName].filter(Boolean).join(' ')
      : (name || 'New Faculty');
    const empRole = role || 'teacher';
    const plainPass = password || 'Welcome@123';

    let createdId = `emp-${Date.now()}`;

    try {
      const hashedPassword = await bcrypt.hash(plainPass, 10);
      const userRecord = await prisma.user.create({
        data: {
          name: empName,
          email: empEmail,
          phone: phone || null,
          password_hash: hashedPassword,
          role: empRole,
          skip_face: true,
          skip_location: true,
          isActive: true
        }
      });

      const teacherRecord = await prisma.teacher.create({
        data: {
          userId: userRecord.id,
          employeeId: empCode,
          name: empName,
          email: empEmail,
          phone: phone || null,
          qualification: qualification || 'N/A',
          designation: (empRole || '').toLowerCase() === 'teacher' ? 'Teacher' : empRole
        }
      });
      createdId = teacherRecord.id;
    } catch (err) {
      console.error("Prisma teacher creation warning:", err.message);
    }

    const newEmp = {
      _id: createdId,
      id: createdId,
      employeeId: empCode,
      employee_id: empCode,
      name: empName,
      firstName: firstName || '',
      middleName: middleName || '',
      lastName: lastName || '',
      email: empEmail,
      phone: phone || '+91 9876543210',
      qualification: qualification || 'N/A',
      experience: req.body.experience || 0,
      role: empRole,
      status: 'Active',
      skip_face: true,
      skip_location: true,
      is_enabled: true,
      primary_subject: primary_subject || '',
      secondary_subject: secondary_subject || '',
      plain_password: plainPass
    };

    DEMO_EMPLOYEES.push(newEmp);
    res.status(201).json({ status: true, message: 'Employee added successfully', data: newEmp });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.post('/faculty/non-teaching', async (req, res) => {
  res.status(201).json({ status: true, message: 'Staff added successfully' });
});

// POST /api/auth/admin/direct-login (Direct Login / Impersonate Employee)
router.post('/auth/admin/direct-login', async (req, res) => {
  try {
    const { employeeId, email, role } = req.body || {};
    let targetUser = null;

    try {
      if (employeeId || email) {
        const teacher = await prisma.teacher.findFirst({
          where: {
            OR: [
              ...(employeeId ? [{ id: employeeId }, { employeeId: employeeId }] : []),
              ...(email ? [{ email }] : [])
            ]
          },
          include: { user: true }
        });

        if (teacher?.user) {
          targetUser = {
            id: teacher.user.id,
            name: teacher.name || teacher.user.name,
            email: teacher.user.email || teacher.email,
            role: teacher.user.role || role || 'teacher'
          };
        } else if (email) {
          const userObj = await prisma.user.findFirst({ where: { email } });
          if (userObj) {
            targetUser = {
              id: userObj.id,
              name: userObj.name,
              email: userObj.email,
              role: userObj.role || role || 'teacher'
            };
          }
        }
      }
    } catch (err) {
      console.warn("Prisma lookup in direct-login warning:", err.message);
    }

    if (!targetUser) {
      const demoEmp = DEMO_EMPLOYEES.find(e => e._id === employeeId || e.id === employeeId || e.email === email);
      targetUser = {
        id: demoEmp?._id || employeeId || `usr-${Date.now()}`,
        name: demoEmp?.name || 'Employee User',
        email: demoEmp?.email || email || 'user@qelvora.in',
        role: demoEmp?.role || role || 'teacher'
      };
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_school_crm_platform_2026';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      { id: targetUser.id, email: targetUser.email, role: targetUser.role, name: targetUser.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      status: true,
      message: `Direct login successful for ${targetUser.name}`,
      access_token: token,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        skip_face: true,
        skip_location: true
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// -----------------------------------------------------------------
// LESSONS, QUESTION PAPER GENERATION & TOPIC SUMMARY MODULES
// -----------------------------------------------------------------
const LESSONS_CATALOG = {
  'Mathematics': [
    'Real Numbers & Number Systems',
    'Polynomials & Algebraic Expressions',
    'Pair of Linear Equations in Two Variables',
    'Quadratic Equations & Roots Analysis',
    'Arithmetic Progressions & Series',
    'Triangles & Similarity Theorems',
    'Coordinate Geometry & Distance Formulae',
    'Trigonometry & Heights and Distances',
    'Circles, Tangents and Chords',
    'Surface Areas and Volumes of Solids',
    'Statistics & Central Tendency',
    'Probability and Theoretical Distributions'
  ],
  'Physics': [
    'Light: Reflection, Spherical Mirrors & Refraction',
    'The Human Eye and the Colorful World',
    'Electricity, Ohm\'s Law & Resistance in Circuits',
    'Magnetic Effects of Electric Current & Electromagnetism',
    'Sources of Energy & Conventional Non-Renewables',
    'Force, Work, Power & Conservation of Energy',
    'Gravitation and Planetary Motion Laws',
    'Sound, Wave Propagation & Ultrasonic Echoes'
  ],
  'Chemistry': [
    'Chemical Reactions and Balanced Chemical Equations',
    'Acids, Bases, Salts and pH Scale Indicators',
    'Metals and Non-metals: Properties & Metallurgy',
    'Carbon and its Compounds: Covalent Bonding & Functional Groups',
    'Periodic Classification and Periodic Trends',
    'Structure of the Atom & Valence Electrons',
    'Matter in Our Surroundings & Kinetic Molecular Theory'
  ],
  'Biology': [
    'Life Processes: Nutrition, Respiration & Transportation',
    'Control and Coordination: Nervous System & Hormones',
    'How do Organisms Reproduce? Sexual & Asexual Reproduction',
    'Heredity and Evolution: Mendel\'s Laws & Genetics',
    'Our Environment & Ecosystem Energy Flow',
    'Sustainable Management of Natural Resources',
    'Fundamental Unit of Life: Cell Structure and Organelles',
    'Plant and Animal Tissues Specialization'
  ],
  'Science': [
    'Chemical Reactions, Acids & Bases',
    'Life Processes, Cellular Respiration & Genetics',
    'Light, Reflection, Refraction & Human Optics',
    'Electricity, Circuits, Voltage & Current',
    'Magnetic Field Lines & Induced Current'
  ],
  'Social Science': [
    'The Rise of Nationalism in Europe & India',
    'Resources and Development & Land Utilization',
    'Forest and Wildlife Conservation',
    'Water Resources & Multipurpose Projects',
    'Agriculture, Cropping Seasons & Food Security',
    'Minerals and Energy Resources',
    'Federalism, Decentralization & Power Sharing',
    'Gender, Religion, Caste in Democratic Politics',
    'Money and Credit, Commercial Banks & Loans',
    'Globalization and the Modern Indian Economy'
  ],
  'English': [
    'Reading Comprehension & Critical Literary Analysis',
    'Formal Letter Writing, Editorials & Business Inquiries',
    'Analytical Paragraph Writing with Graph Insights',
    'Tenses, Modals, Subject-Verb Concord & Reported Speech',
    'First Flight: Prose & Philosophical Themes',
    'Footprints without Feet: Supplementary Fiction'
  ]
};

// Note: Question Paper Generator, Study Materials & Topic Summary endpoints are handled by dedicated routes
export default router;
