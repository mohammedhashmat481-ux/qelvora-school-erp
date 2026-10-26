import Teacher from '../models/Teacher.js';
import NonTeachingStaff from '../models/NonTeachingStaff.js';
import User from '../models/User.js';
import SchoolSettings from '../models/SchoolSettings.js';
import TeacherClassSubjectMapping from '../models/TeacherClassSubjectMapping.js';
import Class from '../models/Class.js';
import fs from 'fs';
import path from 'path';
import { escapeRegex, safeError, auditLog } from '../utils/security.js';

/**
 * Get all teaching and non-teaching faculty
 */
export const getFaculty = async (req, res) => {
  try {
    // Auto-fix Shrujay's employeeId in database to 3 digits (TCH007)
    await Teacher.updateOne(
      { $or: [{ name: /shrujay/i }, { employeeId: 'TCH-918827' }] },
      { $set: { employeeId: 'TCH007' } }
    ).catch(() => {});

    const teachers = await Teacher.find().populate('user', 'email role isActive skip_face skip_location');
    const nonTeaching = await NonTeachingStaff.find().populate('user', 'email role isActive skip_face skip_location');
    
    return res.status(200).json({
      status: true,
      data: {
        teachers,
        nonTeaching
      }
    });
  } catch (error) {
    return safeError(res, error, 'GetFaculty');
  }
};

/**
 * Add a new Teacher profile (and User login if requested)
 */
export const addTeacher = async (req, res) => {
  const { employeeId, name, email, phone, qualification, experience, status, createLogin, password, role, primary_subject, secondary_subject } = req.body;
  try {
    let finalEmployeeId = employeeId;
    if (!finalEmployeeId || finalEmployeeId.trim() === '') {
      const count = await Teacher.countDocuments();
      finalEmployeeId = 'TCH' + String(count + 1).padStart(3, '0');
    }

    // Check duplicate employeeId
    const exists = await Teacher.findOne({ employeeId: finalEmployeeId });
    if (exists) {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      finalEmployeeId = `TCH${randomSuffix}`;
    }

    let userId = null;
    if (createLogin !== false) {
      // Check User duplication
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ status: false, message: `Login user with email ${email} already exists` });
      }

      const schoolSettings = await SchoolSettings.findOne();
      const defaultSkipFace = schoolSettings ? !!schoolSettings.face_auth_enabled : false;
      const defaultSkipLocation = schoolSettings ? !!schoolSettings.location_auth_enabled : false;

      const user = await User.create({
        name,
        email,
        phone: phone && phone.trim() !== '' ? phone.trim() : undefined,
        password_hash: password || 'Welcome@123',
        role: role || 'teacher',
        face_embeddings: [],
        skip_face: defaultSkipFace,
        skip_location: defaultSkipLocation
      });
      userId = user._id;
    }

    const teacher = await Teacher.create({
      user: userId,
      employeeId: finalEmployeeId,
      name,
      email,
      phone: phone && phone.trim() !== '' ? phone.trim() : undefined,
      qualification: qualification || 'N/A',
      experience: experience || 0,
      status: status || 'Active',
      primary_subject: primary_subject || '',
      secondary_subject: secondary_subject || ''
    });

    return res.status(201).json({ status: true, message: 'Teacher added successfully', data: teacher });
  } catch (error) {
    return safeError(res, error, 'AddTeacher');
  }
};

/**
 * Add a new Non-Teaching Staff profile (and User login if requested)
 */
export const addNonTeachingStaff = async (req, res) => {
  const { employeeId, name, email, phone, staffRole, status, createLogin, password } = req.body;
  try {
    let finalEmployeeId = employeeId;
    if (!finalEmployeeId || finalEmployeeId.trim() === '') {
      const count = await NonTeachingStaff.countDocuments();
      finalEmployeeId = 'STF' + String(count + 1).padStart(3, '0');
    }

    const exists = await NonTeachingStaff.findOne({ employeeId: finalEmployeeId });
    if (exists) {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      finalEmployeeId = `STF${randomSuffix}`;
    }

    let userId = null;
    if (createLogin !== false) {
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ status: false, message: `Login user with email ${email} already exists` });
      }

      const schoolSettings = await SchoolSettings.findOne();
      const defaultSkipFace = schoolSettings ? !!schoolSettings.face_auth_enabled : false;
      const defaultSkipLocation = schoolSettings ? !!schoolSettings.location_auth_enabled : false;

      const user = await User.create({
        name,
        email,
        phone: phone && phone.trim() !== '' ? phone.trim() : undefined,
        password_hash: password || 'Welcome@123',
        role: staffRole || 'staff',
        face_embeddings: [],
        skip_face: defaultSkipFace,
        skip_location: defaultSkipLocation
      });
      userId = user._id;
    }

    const staff = await NonTeachingStaff.create({
      user: userId,
      employeeId: finalEmployeeId,
      name,
      email,
      phone: phone && phone.trim() !== '' ? phone.trim() : undefined,
      staffRole,
      status: status || 'Active'
    });

    return res.status(201).json({ status: true, message: 'Staff member added successfully', data: staff });
  } catch (error) {
    return safeError(res, error, 'AddNonTeachingStaff');
  }
};

/**
 * Update Teacher or Staff settings
 */
export const updateFacultySettings = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, qualification, experience, status, staffRole, isActive, role, skip_face, skip_location, primary_subject, secondary_subject } = req.body;
  try {
    let faculty = await Teacher.findById(id);
    let type = 'teacher';
    
    if (!faculty) {
      faculty = await NonTeachingStaff.findById(id);
      type = 'staff';
    }

    if (!faculty) {
      return res.status(404).json({ status: false, message: 'Faculty member not found' });
    }

    // Update attributes
    if (name) faculty.name = name;
    if (email) faculty.email = email;
    if (phone !== undefined) {
      faculty.phone = phone.trim() === '' ? undefined : phone.trim();
    }
    if (qualification && type === 'teacher') faculty.qualification = qualification;
    if (experience !== undefined && type === 'teacher') faculty.experience = experience;
    if (status) faculty.status = status;
    if (primary_subject !== undefined && type === 'teacher') faculty.primary_subject = primary_subject;
    if (secondary_subject !== undefined && type === 'teacher') faculty.secondary_subject = secondary_subject;

    const targetRole = role || staffRole;
    if (targetRole && type === 'staff') {
      faculty.staffRole = targetRole;
    }

    if (req.body.employeeId || req.body.employee_id) {
      faculty.employeeId = req.body.employeeId || req.body.employee_id;
    } else if (targetRole) {
      const roleKey = targetRole.toLowerCase();
      let prefix = 'EMP';
      if (roleKey === 'teacher') prefix = 'TCH';
      else if (roleKey === 'admin' || roleKey === 'super_admin' || roleKey === 'principal') prefix = 'ADM';
      else if (roleKey === 'staff') prefix = 'STF';

      if (faculty.employeeId && !faculty.employeeId.startsWith(prefix)) {
        const numPart = faculty.employeeId.replace(/^[A-Z]+-?/, '');
        faculty.employeeId = `${prefix}${numPart.padStart(3, '0')}`;
      }
    }

    await faculty.save();

    // Update linked User if present
    if (faculty.user) {
      const userUpdate = {};
      if (isActive !== undefined) userUpdate.isActive = isActive;
      if (skip_face !== undefined) userUpdate.skip_face = skip_face;
      if (skip_location !== undefined) userUpdate.skip_location = skip_location;
      if (targetRole) userUpdate.role = targetRole.toLowerCase();
      if (name) userUpdate.name = name;
      if (email) userUpdate.email = email;
      if (phone !== undefined) {
        userUpdate.phone = phone.trim() === '' ? undefined : phone.trim();
      }
      
      if (Object.keys(userUpdate).length > 0) {
        await User.findByIdAndUpdate(faculty.user, userUpdate);
      }
    }

    return res.status(200).json({ status: true, message: 'Faculty updated successfully', data: faculty });
  } catch (error) {
    return safeError(res, error, 'UpdateFacultySettings');
  }
};

/**
 * Reset password of linked user
 */
export const resetFacultyPassword = async (req, res) => {
  const { id } = req.params; // Faculty ID (Teacher or Staff)
  const { new_password } = req.body;
  try {
    let faculty = await Teacher.findById(id);
    if (!faculty) {
      faculty = await NonTeachingStaff.findById(id);
    }

    if (!faculty || !faculty.user) {
      return res.status(404).json({ status: false, message: 'Faculty has no linked login account' });
    }

    const user = await User.findById(faculty.user);
    if (!user) {
      return res.status(404).json({ status: false, message: 'Linked login account not found' });
    }

    user.password_hash = new_password; // password hook will hash it on save
    await user.save();

    auditLog('PASSWORD_RESET', { facultyId: id, resetBy: req.user?._id });

    return res.status(200).json({ status: true, message: 'Password reset successful' });
  } catch (error) {
    return safeError(res, error, 'ResetFacultyPassword');
  }
};

/**
 * Delete Faculty member
 */
export const deleteFaculty = async (req, res) => {
  const { id } = req.params;
  try {
    let faculty = await Teacher.findByIdAndDelete(id);
    if (faculty) {
      if (faculty.user) {
        await User.findByIdAndDelete(faculty.user);
      }
      // Also delete any mappings associated with this teacher
      await TeacherClassSubjectMapping.deleteMany({ teacher: id });
      // Set classTeacher to null for any classes where this teacher was class teacher
      await Class.updateMany({ classTeacher: id }, { classTeacher: null });
    }

    if (!faculty) {
      faculty = await NonTeachingStaff.findByIdAndDelete(id);
      if (faculty && faculty.user) {
        await User.findByIdAndDelete(faculty.user);
      }
    }

    if (!faculty) {
      return res.status(404).json({ status: false, message: 'Faculty member not found' });
    }

    auditLog('FACULTY_DELETED', { facultyId: id, deletedBy: req.user?._id });

    return res.status(200).json({ status: true, message: 'Faculty deleted successfully' });
  } catch (error) {
    return safeError(res, error, 'DeleteFaculty');
  }
};

/**
 * File upload document mock/simple controller
 */
export const uploadDocument = async (req, res) => {
  // Multer handles file parsing
  if (!req.file) {
    return res.status(400).json({ status: false, message: 'No file uploaded' });
  }

  // Validate file type
  const allowedExtensions = /\.(pdf|doc|docx|jpg|jpeg|png|gif|txt|csv|xls|xlsx)$/i;
  if (!allowedExtensions.test(req.file.originalname)) {
    // Delete the uploaded file
    try { fs.unlinkSync(req.file.path); } catch(e) {}
    return res.status(400).json({ status: false, message: 'Invalid file type. Allowed: pdf, doc, docx, jpg, jpeg, png, gif, txt, csv, xls, xlsx' });
  }

  return res.status(200).json({
    status: true,
    message: 'Document uploaded successfully',
    filename: req.file.filename
  });
};

/**
 * File download document mock/simple controller
 */
export const downloadDocument = async (req, res) => {
  const { filename } = req.params;
  const uploadsDir = path.resolve('uploads');
  const safeName = path.basename(filename);
  const filePath = path.join(uploadsDir, safeName);
  if (!filePath.startsWith(uploadsDir)) {
    return res.status(403).json({ status: false, message: 'Access denied' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ status: false, message: 'Document not found' });
  }

  return res.download(filePath);
};
