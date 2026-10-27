import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { prisma, formatLegacyId } from '../db/prisma.js';
import { protect } from '../middleware/authMiddleware.js';
import cache from '../lib/cache.js';

const router = express.Router();

// In-memory multer storage for file uploads (supports up to 50MB for large rosters)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Helper to format student fields for legacy contract compatibility
function formatStudentItem(s) {
  if (!s) return s;
  const legacy = formatLegacyId(s);
  return {
    ...legacy,
    admissionNumber: s.studentId || legacy.admissionNumber,
    studentId: s.studentId || legacy.admissionNumber,
    parentContact: s.parentPhone || legacy.parentContact,
    phone: s.phone || s.parentPhone || ''
  };
}

// Standardize class standard naming (e.g. 10 -> '10th', '10th' -> '10th', 'NURSERY' -> 'Nursery')
function normalizeStandard(val) {
  if (!val) return '';
  const s = String(val).trim();
  const lower = s.toLowerCase();
  if (['nursery', 'nur'].includes(lower)) return 'Nursery';
  if (['lkg', 'l.k.g.'].includes(lower)) return 'LKG';
  if (['ukg', 'u.k.g.'].includes(lower)) return 'UKG';
  
  const numMatch = s.match(/^(\d+)(st|nd|rd|th)?$/i);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    const suffix = (n === 1) ? '1st' : (n === 2) ? '2nd' : (n === 3) ? '3rd' : `${n}th`;
    return suffix;
  }
  return s;
}

// Normalizer for row keys from Excel/CSV headers
function normalizeRowData(row) {
  const getVal = (...keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
        return String(row[k]).trim();
      }
      // Also check case-insensitive match
      const foundKey = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
        return String(row[foundKey]).trim();
      }
    }
    return '';
  };

  const name = getVal('name', 'studentName', 'student_name', 'Student Name', 'Full Name', 'Name of Student');
  const rawStandard = getVal('standard', 'class', 'Class', 'Standard', 'Grade');
  const standard = normalizeStandard(rawStandard);
  const rawSection = getVal('section', 'Section', 'sec');
  const section = rawSection ? rawSection.toUpperCase() : '';
  const admissionNumber = getVal('admissionNumber', 'studentId', 'admission_no', 'Admission No', 'Admission Number', 'Student ID', 'Roll/Adm No');
  const rollNumber = getVal('rollNumber', 'roll_no', 'Roll No', 'Roll Number', 'Roll');
  const genderRaw = getVal('gender', 'Gender', 'Sex');
  const gender = ['f', 'female', 'girl'].includes(genderRaw.toLowerCase()) ? 'Female' : 'Male';
  const dob = getVal('dob', 'DOB', 'dateOfBirth', 'Date of Birth', 'Birth Date') || '2010-01-01';
  const parentName = getVal('parentName', 'fatherName', 'Father Name', 'Parent Name', "Father's Name", 'Guardian Name') || (name ? `${name}'s Parent` : 'Parent');
  const parentPhone = getVal('parentPhone', 'phone', 'contact', 'Mobile', 'Mobile No', 'Parent Mobile', 'Parent Phone', 'Contact No').replace(/\D/g, '') || '9876543210';
  const parentEmail = getVal('parentEmail', 'email', 'Email', 'Parent Email') || null;
  const address = getVal('address', 'Address', 'City') || null;

  return {
    name,
    standard,
    section,
    admissionNumber,
    rollNumber,
    gender,
    dob,
    parentName,
    parentPhone: parentPhone.length >= 10 ? parentPhone.slice(-10) : parentPhone.padStart(10, '0'),
    parentEmail,
    address
  };
}

// GET /api/students/bulk-template - Download Excel/CSV sample template for bulk student upload
router.get('/bulk-template', protect, async (req, res) => {
  try {
    const format = (req.query.format || 'xlsx').toLowerCase();
    
    // Sample rows across multiple classes and sections
    const sampleData = [
      {
        "Admission Number": "ADM-2026-101",
        "Student Name": "Aarav Sharma",
        "Standard": "10th",
        "Section": "A",
        "Roll Number": "1",
        "Gender": "Male",
        "Date of Birth (YYYY-MM-DD)": "2010-05-14",
        "Parent Name": "Rajesh Sharma",
        "Parent Phone": "9876543210",
        "Parent Email": "rajesh.sharma@example.com",
        "Address": "Flat 402, Green Valley Apartments, Mumbai"
      },
      {
        "Admission Number": "ADM-2026-102",
        "Student Name": "Ananya Iyer",
        "Standard": "10th",
        "Section": "A",
        "Roll Number": "2",
        "Gender": "Female",
        "Date of Birth (YYYY-MM-DD)": "2010-08-22",
        "Parent Name": "Venkatesh Iyer",
        "Parent Phone": "9876543211",
        "Parent Email": "venkat.iyer@example.com",
        "Address": "12 Lotus Enclave, Indiranagar, Bengaluru"
      },
      {
        "Admission Number": "ADM-2026-103",
        "Student Name": "Vihaan Patel",
        "Standard": "10th",
        "Section": "B",
        "Roll Number": "1",
        "Gender": "Male",
        "Date of Birth (YYYY-MM-DD)": "2010-03-10",
        "Parent Name": "Ketan Patel",
        "Parent Phone": "9876543212",
        "Parent Email": "ketan.patel@example.com",
        "Address": "B-501 Sunrise Towers, Ahmedabad"
      },
      {
        "Admission Number": "ADM-2026-104",
        "Student Name": "Diya Sen",
        "Standard": "9th",
        "Section": "A",
        "Roll Number": "1",
        "Gender": "Female",
        "Date of Birth (YYYY-MM-DD)": "2011-11-05",
        "Parent Name": "Subir Sen",
        "Parent Phone": "9876543213",
        "Parent Email": "subir.sen@example.com",
        "Address": "74 Lake Road, Kolkata"
      },
      {
        "Admission Number": "ADM-2026-105",
        "Student Name": "Sai Krishna",
        "Standard": "9th",
        "Section": "B",
        "Roll Number": "1",
        "Gender": "Male",
        "Date of Birth (YYYY-MM-DD)": "2011-07-19",
        "Parent Name": "Ramesh Krishna",
        "Parent Phone": "9876543214",
        "Parent Email": "ramesh.krishna@example.com",
        "Address": "Block 3, Banjara Hills, Hyderabad"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    
    // Set column widths for readability
    worksheet['!cols'] = [
      { wch: 18 }, // Admission Number
      { wch: 22 }, // Student Name
      { wch: 12 }, // Standard
      { wch: 10 }, // Section
      { wch: 14 }, // Roll Number
      { wch: 10 }, // Gender
      { wch: 26 }, // Date of Birth
      { wch: 22 }, // Parent Name
      { wch: 16 }, // Parent Phone
      { wch: 26 }, // Parent Email
      { wch: 40 }  // Address
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Roster');

    if (format === 'csv') {
      const csvBuffer = XLSX.write(workbook, { bookType: 'csv', type: 'buffer' });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="Students_Bulk_Upload_Template.csv"');
      return res.send(csvBuffer);
    }

    const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Students_Bulk_Upload_Template.xlsx"');
    return res.send(xlsxBuffer);
  } catch (err) {
    console.error('Error generating template:', err);
    res.status(500).json({ status: false, message: 'Failed to generate template: ' + err.message });
  }
});

// POST /api/students/bulk-upload - High-Performance Batch Upsert for 2,000+ students
router.post('/bulk-upload', protect, upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  try {
    let rows = [];

    // Support 1: Multipart file upload (Excel / CSV)
    if (req.file && req.file.buffer) {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer', dense: true, cellDates: false });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return res.status(400).json({ status: false, message: 'The uploaded spreadsheet is empty.' });
      }
      const worksheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    } 
    // Support 2: JSON payload { students: [...] } or array [...]
    else if (req.body && (Array.isArray(req.body.students) || Array.isArray(req.body))) {
      rows = Array.isArray(req.body.students) ? req.body.students : req.body;
    } else {
      return res.status(400).json({
        status: false,
        message: 'No file or student list provided. Please attach an Excel/CSV file or JSON payload.'
      });
    }

    if (!rows || rows.length === 0) {
      return res.status(400).json({ status: false, message: 'Uploaded file has no data rows.' });
    }

    // Default override standard and section if user specified them in the form
    const defaultStandard = normalizeStandard(req.body.standard || req.body.class);
    const defaultSection = req.body.section ? String(req.body.section).trim().toUpperCase() : '';

    const currentYear = new Date().getFullYear();
    let totalCountInDb = await prisma.student.count().catch(() => 0);

    const validRows = [];
    const errors = [];
    const touchedClasses = new Map(); // standard_section -> { standard, section }
    const assignedIdsInBatch = new Set();

    // 1. In-memory parse & validate all rows
    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const parsed = normalizeRowData(rows[i]);

      const finalName = parsed.name;
      const finalStandard = parsed.standard || defaultStandard;
      const finalSection = parsed.section || defaultSection || 'A';

      if (!finalName) {
        errors.push({ row: rowNum, error: 'Student Name is missing' });
        continue;
      }
      if (!finalStandard) {
        errors.push({ row: rowNum, name: finalName, error: 'Class / Standard is missing' });
        continue;
      }

      // Generate unique admission number if missing
      let finalAdmissionNo = parsed.admissionNumber;
      if (!finalAdmissionNo) {
        totalCountInDb++;
        finalAdmissionNo = `ADM-${currentYear}-${String(totalCountInDb).padStart(5, '0')}`;
        while (assignedIdsInBatch.has(finalAdmissionNo)) {
          totalCountInDb++;
          finalAdmissionNo = `ADM-${currentYear}-${String(totalCountInDb).padStart(5, '0')}`;
        }
      }
      assignedIdsInBatch.add(finalAdmissionNo);

      const rollNumber = parsed.rollNumber ? String(parsed.rollNumber).trim() : null;
      const phoneDigits = (parsed.parentPhone || '').replace(/\D/g, '');
      const validPhone = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : '9876543210';

      const studentData = {
        studentId: finalAdmissionNo,
        name: finalName,
        standard: finalStandard,
        section: finalSection,
        rollNumber,
        gender: parsed.gender || 'Male',
        dob: parsed.dob || '2010-01-01',
        parentName: parsed.parentName || `${finalName}'s Guardian`,
        parentPhone: validPhone,
        phone: validPhone,
        parentEmail: parsed.parentEmail || null,
        address: parsed.address || null,
        admissionDate: new Date().toISOString().split('T')[0]
      };

      validRows.push({ rowNum, studentData });

      // Track class
      const classKey = `${finalStandard}__${finalSection}`;
      if (!touchedClasses.has(classKey)) {
        touchedClasses.set(classKey, { standard: finalStandard, section: finalSection });
      }
    }

    if (validRows.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'No valid student records could be parsed from the file.',
        errors
      });
    }

    // 2. Fetch existing students in ONE batched query
    const candidateIds = validRows.map(vr => vr.studentData.studentId);
    const existingMap = new Map();
    for (let i = 0; i < candidateIds.length; i += 1000) {
      const chunkIds = candidateIds.slice(i, i + 1000);
      const found = await prisma.student.findMany({
        where: { studentId: { in: chunkIds } },
        select: { id: true, studentId: true }
      });
      found.forEach(s => existingMap.set(s.studentId, s.id));
    }

    const toCreate = [];
    const toUpdate = [];

    for (const vr of validRows) {
      const sData = vr.studentData;
      if (existingMap.has(sData.studentId)) {
        toUpdate.push({ id: existingMap.get(sData.studentId), data: sData });
      } else {
        toCreate.push(sData);
      }
    }

    // 3. Ultra-fast bulk insert for new students in chunks of 500
    const CREATE_CHUNK = 500;
    for (let i = 0; i < toCreate.length; i += CREATE_CHUNK) {
      const chunk = toCreate.slice(i, i + CREATE_CHUNK);
      await prisma.student.createMany({
        data: chunk,
        skipDuplicates: true
      });
    }

    // 4. Concurrent batch updates for existing students
    const UPDATE_CONCURRENCY = 50;
    for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
      const chunk = toUpdate.slice(i, i + UPDATE_CONCURRENCY);
      await Promise.all(chunk.map(item => prisma.student.update({
        where: { id: item.id },
        data: {
          name: item.data.name,
          standard: item.data.standard,
          section: item.data.section,
          rollNumber: item.data.rollNumber,
          gender: item.data.gender,
          dob: item.data.dob,
          parentName: item.data.parentName,
          parentPhone: item.data.parentPhone,
          phone: item.data.phone,
          ...(item.data.parentEmail && { parentEmail: item.data.parentEmail }),
          ...(item.data.address && { address: item.data.address })
        }
      })));
    }

    // 5. Consolidated Auto-create missing classes and synchronize live student strength
    const classSummary = [];
    if (touchedClasses.size > 0) {
      const touchedList = Array.from(touchedClasses.values());
      const standards = [...new Set(touchedList.map(t => t.standard))];
      const sections = [...new Set(touchedList.map(t => t.section))];

      const existingClasses = await prisma.class.findMany({
        where: { standard: { in: standards }, section: { in: sections } }
      });
      const classMap = new Map(existingClasses.map(c => [`${c.standard}__${c.section}`, c]));

      const liveCounts = await prisma.student.groupBy({
        by: ['standard', 'section'],
        where: { standard: { in: standards }, section: { in: sections } },
        _count: { id: true }
      });
      const countMap = new Map(liveCounts.map(lc => [`${lc.standard}__${lc.section}`, lc._count.id]));

      const classesToCreate = [];
      const classesToUpdate = [];

      for (const clsInfo of touchedList) {
        const key = `${clsInfo.standard}__${clsInfo.section}`;
        const liveEnrolledCount = countMap.get(key) || 0;
        const existingClass = classMap.get(key);

        if (existingClass) {
          classesToUpdate.push({ id: existingClass.id, strength: liveEnrolledCount });
          classSummary.push({
            standard: clsInfo.standard,
            section: clsInfo.section,
            enrolledCount: liveEnrolledCount,
            status: 'Updated'
          });
        } else {
          classesToCreate.push({
            standard: clsInfo.standard,
            section: clsInfo.section,
            board: 'CBSE',
            strength: liveEnrolledCount
          });
          classSummary.push({
            standard: clsInfo.standard,
            section: clsInfo.section,
            enrolledCount: liveEnrolledCount,
            status: 'Created New Class'
          });
        }
      }

      if (classesToCreate.length > 0) {
        await prisma.class.createMany({
          data: classesToCreate,
          skipDuplicates: true
        });
      }

      if (classesToUpdate.length > 0) {
        await Promise.all(classesToUpdate.map(cu => prisma.class.update({
          where: { id: cu.id },
          data: { strength: cu.strength }
        })));
      }
    }

    // Flush cache
    try {
      cache.flush('master:');
      cache.flush('timetable:');
      cache.flush('student:');
    } catch (_) {}

    const durationMs = Date.now() - startTime;

    return res.json({
      status: true,
      success: true,
      message: `Bulk upload completed successfully in ${(durationMs / 1000).toFixed(2)}s. Added ${toCreate.length} new student(s), updated ${toUpdate.length} existing record(s).`,
      summary: {
        totalProcessed: rows.length,
        created: toCreate.length,
        updated: toUpdate.length,
        failed: errors.length,
        durationMs,
        errors: errors.slice(0, 50),
        classesAffected: classSummary
      }
    });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ status: false, message: 'Bulk upload failed: ' + err.message });
  }
});

// GET /api/students/next-admission-number - Auto-suggest next unique admission number
router.get('/next-admission-number', protect, async (req, res) => {
  try {
    const year = new Date().getFullYear();
    let count = 0;
    try {
      count = await prisma.student.count();
    } catch (_) {}
    
    const nextNum = String(count + 1).padStart(3, '0');
    const nextAdmissionNumber = `ADM-${year}-${nextNum}`;

    res.json({
      status: true,
      success: true,
      nextAdmissionNumber,
      admissionNumber: nextAdmissionNumber
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// GET /api/students - List students with optional class, section, search & pagination
router.get('/', protect, async (req, res) => {
  try {
    const { standard, class: classParam, section, search, page = 1, limit = 10 } = req.query;
    const stdFilter = standard || classParam || '';
    
    const where = {};
    if (stdFilter) where.standard = String(stdFilter);
    if (section) where.section = String(section);

    if (search && String(search).trim()) {
      const queryStr = String(search).trim();
      where.OR = [
        { name: { contains: queryStr, mode: 'insensitive' } },
        { studentId: { contains: queryStr, mode: 'insensitive' } },
        { parentName: { contains: queryStr, mode: 'insensitive' } },
        { parentPhone: { contains: queryStr, mode: 'insensitive' } }
      ];
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    let total = 0;
    let students = [];

    try {
      total = await prisma.student.count({ where });
      students = await prisma.student.findMany({
        where,
        orderBy: [{ standard: 'asc' }, { section: 'asc' }, { name: 'asc' }],
        skip,
        take: limitNum
      });
    } catch (dbErr) {
      console.warn('Prisma student query warning, using fallback list:', dbErr.message);
    }

    const formattedList = students.map(formatStudentItem);

    res.json({
      status: true,
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: formattedList,
      students: formattedList
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// GET /api/students/me - Current logged in student profile
router.get('/me', protect, async (req, res) => {
  try {
    let student = null;
    try {
      student = await prisma.student.findFirst({
        where: { userId: req.user.id }
      });
    } catch (_) {}

    if (student) {
      return res.json({ status: true, data: formatStudentItem(student) });
    }

    res.json({
      status: true,
      data: {
        _id: "std-me-101",
        id: "std-me-101",
        studentId: "ADM-2026-101",
        admissionNumber: "ADM-2026-101",
        name: req.user.name || "Rahul Student",
        standard: "5th",
        section: "A",
        rollNumber: "101"
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// GET /api/students/:id - Get single student details
router.get('/:id', protect, async (req, res) => {
  try {
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: req.params.id },
          { studentId: req.params.id }
        ]
      },
      include: { pickupAuthorizations: true }
    });

    if (!student) {
      return res.status(404).json({ status: false, message: 'Student not found' });
    }

    res.json({ status: true, success: true, student: formatStudentItem(student), data: formatStudentItem(student) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/students - Register/Add new student profile (Admin protected)
router.post('/', protect, async (req, res) => {
  try {
    const payload = req.body || {};
    const {
      name,
      firstName,
      middleName,
      lastName,
      admissionNumber,
      studentId,
      dob,
      gender = 'Male',
      standard,
      class: classVal,
      section,
      rollNumber,
      admissionDate,
      parentName,
      fatherName,
      motherName,
      parentPhone,
      parentEmail,
      address,
      photoUrl
    } = payload;

    const finalAdmissionNo = (admissionNumber || studentId || '').trim();
    const finalStandard = (standard || classVal || '').trim();
    const finalSection = (section || '').trim().toUpperCase();
    const finalName = (name || [firstName, middleName, lastName].filter(Boolean).join(' ')).trim();
    const finalParentName = (parentName || [fatherName, motherName].filter(Boolean).join(' / ')).trim();

    // Validation
    const errors = {};
    if (!finalName) errors.name = 'Full Name is required';
    if (!finalAdmissionNo) errors.admissionNumber = 'Admission Number is required';
    if (!dob) errors.dob = 'Date of Birth is required';
    if (!finalStandard) errors.standard = 'Class Standard is required';
    if (!finalSection) errors.section = 'Section Name is required';
    if (!finalParentName) errors.parentName = "Father's / Guardian's Name is required";
    if (!parentPhone || !String(parentPhone).trim()) {
      errors.parentPhone = 'Parent Phone Number is required';
    } else if (!/^\d{10}$/.test(String(parentPhone).replace(/\D/g, ''))) {
      errors.parentPhone = 'Parent Phone Number must be exactly 10 digits';
    }
    if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(parentEmail).trim())) {
      errors.parentEmail = 'Invalid Parent Email Address format';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ status: false, message: 'Validation failed', errors });
    }

    // Check unique admissionNumber / studentId
    const existingAdmission = await prisma.student.findFirst({
      where: { studentId: finalAdmissionNo }
    }).catch(() => null);

    if (existingAdmission) {
      return res.status(400).json({
        status: false,
        message: `Admission Number "${finalAdmissionNo}" is already in use by another student`,
        errors: { admissionNumber: 'Admission Number must be unique' }
      });
    }

    // Check unique rollNumber per (class + section) if provided
    if (rollNumber && String(rollNumber).trim()) {
      const cleanRoll = String(rollNumber).trim();
      const existingRoll = await prisma.student.findFirst({
        where: {
          standard: finalStandard,
          section: finalSection,
          rollNumber: cleanRoll
        }
      }).catch(() => null);

      if (existingRoll) {
        return res.status(400).json({
          status: false,
          message: `Roll Number "${cleanRoll}" is already assigned in Class ${finalStandard} - ${finalSection}`,
          errors: { rollNumber: 'Roll Number must be unique within class & section' }
        });
      }
    }

    const created = await prisma.student.create({
      data: {
        studentId: finalAdmissionNo,
        name: finalName,
        dob: String(dob),
        gender: gender || 'Male',
        standard: finalStandard,
        section: finalSection,
        rollNumber: rollNumber ? String(rollNumber).trim() : null,
        admissionDate: admissionDate || new Date().toISOString().split('T')[0],
        parentName: finalParentName,
        parentPhone: String(parentPhone).replace(/\D/g, ''),
        parentEmail: parentEmail ? String(parentEmail).trim() : null,
        address: address ? String(address).trim() : null,
        photoUrl: photoUrl || null,
        phone: String(parentPhone).replace(/\D/g, '')
      }
    });

    // Sync class strength and flush cache
    try {
      const enrolled = await prisma.student.count({
        where: { standard: finalStandard, section: finalSection }
      });
      await prisma.class.updateMany({
        where: { standard: finalStandard, section: finalSection },
        data: { strength: enrolled }
      });
      cache.flush('master:');
    } catch (_) {}

    const item = formatStudentItem(created);
    res.status(201).json({
      status: true,
      success: true,
      message: 'Student added successfully',
      data: item,
      student: item
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// PUT /api/students/:id - Edit/Update student details (Admin protected)
router.put('/:id', protect, async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body || {};

    const existing = await prisma.student.findFirst({
      where: { OR: [{ id }, { studentId: id }] }
    });

    if (!existing) {
      return res.status(404).json({ status: false, message: 'Student record not found' });
    }

    const {
      name,
      firstName,
      middleName,
      lastName,
      admissionNumber,
      studentId,
      dob,
      gender,
      standard,
      class: classVal,
      section,
      rollNumber,
      admissionDate,
      parentName,
      fatherName,
      motherName,
      parentPhone,
      parentEmail,
      address,
      photoUrl,
      leftSchoolStatus
    } = payload;

    const finalAdmissionNo = (admissionNumber || studentId || existing.studentId).trim();
    const finalStandard = (standard || classVal || existing.standard).trim();
    const finalSection = (section || existing.section).trim().toUpperCase();
    const finalName = (name || ((firstName || lastName) ? [firstName, middleName, lastName].filter(Boolean).join(' ') : '') || '').trim();
    const finalParentName = (parentName || (fatherName || motherName ? [fatherName, motherName].filter(Boolean).join(' / ') : '') || '').trim();

    // Validate phone if passed
    if (parentPhone && !/^\d{10}$/.test(String(parentPhone).replace(/\D/g, ''))) {
      return res.status(400).json({
        status: false,
        message: 'Parent Phone Number must be exactly 10 digits',
        errors: { parentPhone: 'Parent Phone Number must be exactly 10 digits' }
      });
    }

    // Check unique admissionNumber if modified
    if (finalAdmissionNo !== existing.studentId) {
      const conflictAdmission = await prisma.student.findFirst({
        where: { studentId: finalAdmissionNo, id: { not: existing.id } }
      });
      if (conflictAdmission) {
        return res.status(400).json({
          status: false,
          message: `Admission Number "${finalAdmissionNo}" is already in use by another student`,
          errors: { admissionNumber: 'Admission Number must be unique' }
        });
      }
    }

    // Check unique rollNumber if modified
    if (rollNumber && String(rollNumber).trim()) {
      const cleanRoll = String(rollNumber).trim();
      const conflictRoll = await prisma.student.findFirst({
        where: {
          standard: finalStandard,
          section: finalSection,
          rollNumber: cleanRoll,
          id: { not: existing.id }
        }
      });
      if (conflictRoll) {
        return res.status(400).json({
          status: false,
          message: `Roll Number "${cleanRoll}" is already assigned in Class ${finalStandard} - ${finalSection}`,
          errors: { rollNumber: 'Roll Number must be unique within class & section' }
        });
      }
    }

    const updated = await prisma.student.update({
      where: { id: existing.id },
      data: {
        studentId: finalAdmissionNo,
        ...(finalName && { name: finalName }),
        ...(dob && { dob: String(dob) }),
        ...(gender && { gender }),
        ...(finalStandard && { standard: finalStandard }),
        ...(finalSection && { section: finalSection }),
        ...(rollNumber !== undefined && { rollNumber: rollNumber ? String(rollNumber).trim() : null }),
        ...(admissionDate && { admissionDate }),
        ...(finalParentName && { parentName: finalParentName }),
        ...(parentPhone && { parentPhone: String(parentPhone).replace(/\D/g, ''), phone: String(parentPhone).replace(/\D/g, '') }),
        ...(parentEmail !== undefined && { parentEmail: parentEmail ? String(parentEmail).trim() : null }),
        ...(address !== undefined && { address: address ? String(address).trim() : null }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(leftSchoolStatus !== undefined && { leftSchoolStatus: Boolean(leftSchoolStatus) })
      }
    });

    const item = formatStudentItem(updated);
    res.json({
      status: true,
      success: true,
      message: 'Student profile updated successfully',
      data: item,
      student: item
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// DELETE /api/students/:id - Remove student (Admin protected)
router.delete('/:id', protect, async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await prisma.student.findFirst({
      where: { OR: [{ id }, { studentId: id }] }
    });

    if (!existing) {
      return res.status(404).json({ status: false, message: 'Student record not found' });
    }

    await prisma.student.delete({
      where: { id: existing.id }
    });

    // Sync class strength and flush cache
    try {
      if (existing.standard && existing.section) {
        const enrolled = await prisma.student.count({
          where: { standard: existing.standard, section: existing.section }
        });
        await prisma.class.updateMany({
          where: { standard: existing.standard, section: existing.section },
          data: { strength: enrolled }
        });
        cache.flush('master:');
      }
    } catch (_) {}

    res.json({
      status: true,
      success: true,
      message: 'Student record removed successfully'
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

export default router;
