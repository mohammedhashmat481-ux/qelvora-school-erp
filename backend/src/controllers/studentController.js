import Student from '../models/Student.js';
import User from '../models/User.js';
import SchoolSettings from '../models/SchoolSettings.js';
import { safeError, auditLog } from '../utils/security.js';

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Add a new Student profile and create their User login credentials
 * Admin only endpoint
 */
export const addStudent = async (req, res) => {
  const { studentId, name, email, phone, standard, section, rollNumber, parentName, parentPhone, password } = req.body;
  try {
    const finalStudentId = studentId || 'STU-' + Math.floor(100000 + Math.random() * 900000);

    // Check duplicate studentId
    const studentExists = await Student.findOne({ studentId: finalStudentId });
    if (studentExists) {
      return res.status(400).json({ status: false, message: `Student ID ${finalStudentId} already exists` });
    }

    // Check duplicate User email
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ status: false, message: `User login with email ${email} already exists` });
    }

    // Check duplicate User phone
    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(400).json({ status: false, message: `Phone number ${phone} is already registered` });
      }
    }

    // Create User login (role: 'student')
    const user = await User.create({
      name,
      email,
      phone: phone || undefined,
      password_hash: password || 'Welcome@123',
      role: 'student',
      face_embeddings: [],
      skip_face: true,       // Default students to skip biometric/face verification for simple OTT profile selection
      skip_location: true    // Default students to skip geo-fencing location checks
    });

    // Create Student record
    const student = await Student.create({
      user: user._id,
      studentId: finalStudentId,
      name,
      email,
      phone,
      standard,
      section,
      rollNumber,
      parentName,
      parentPhone
    });

    auditLog('STUDENT_CREATED', { studentId: finalStudentId, createdBy: req.user?._id });

    return res.status(201).json({
      status: true,
      message: 'Student created successfully',
      data: student
    });
  } catch (error) {
    return safeError(res, error, 'AddStudent');
  }
};

/**
 * Get current logged in student's profile details
 */
export const getStudentMe = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return res.status(404).json({ status: false, message: 'Student profile not found for this user account' });
    }

    return res.status(200).json({
      status: true,
      data: student
    });
  } catch (error) {
    return safeError(res, error, 'GetStudentMe');
  }
};

/**
 * Get all students list for admin panel with optional standard and section filtering
 */
export const getStudents = async (req, res) => {
  const { standard, section } = req.query;
  try {
    const query = {};
    if (standard && standard !== 'All') {
      const normStd = standard.replace(/grade\s*/i, '').replace(/th|st|nd|rd/i, '').trim();
      query.standard = { $regex: new RegExp(escapeRegex(normStd), 'i') };
    }
    if (section && section !== 'All' && section.trim() !== '') {
      query.section = { $regex: new RegExp(`^${escapeRegex(section.trim())}$`, 'i') };
    }

    const studentsList = await Student.find(query).sort({ name: 1 });
    return res.status(200).json({
      status: true,
      data: studentsList
    });
  } catch (error) {
    return safeError(res, error, 'GetStudents');
  }
};
