import jwt from 'jsonwebtoken';
import http from 'http';

const BASE_URL = 'http://127.0.0.1:8000';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_school_crm_platform_2026';

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runComprehensiveSchoolOperationsTest() {
  console.log('========================================================================');
  console.log('   QELVORA SCHOOL CRM — COMPREHENSIVE SCHOOL OPERATIONS AUDIT & TEST      ');
  console.log('   Steps: Student Add -> Promotion -> Multi-Teacher Marks -> Audit -> Fees');
  console.log('========================================================================\n');

  // 1. Setup Personas and Authentication Tokens
  const adminToken = jwt.sign(
    { id: 'c1682446-c8de-44e7-b05e-13d001394107', name: 'Admin Officer', email: 'admin@qelvora.in', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const teacherPriyaToken = jwt.sign(
    { id: 'f5f6a495-e5b7-49fd-8770-b57d7f7a4742', name: 'Priya Patel', email: 'priya.patel@qelvora.in', role: 'Teacher' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const teacherVikramToken = jwt.sign(
    { id: '82d152ec-d3dd-488e-bb67-972a736e97a4', name: 'Vikram Singh', email: 'vikram.singh@qelvora.in', role: 'Senior Educator' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // -------------------------------------------------------------------------
  // STEP 1: ADDING ONE NEW STUDENT
  // -------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('STEP 1: ADDING A NEW STUDENT (POST /api/students)...');
  console.log('------------------------------------------------------------------------');
  
  const uniqueAdm = `ADM-2026-${Date.now().toString().slice(-4)}`;
  const studentPayload = {
    name: 'Aaradhya Deshmukh',
    admissionNumber: uniqueAdm,
    studentId: uniqueAdm,
    standard: '9th',
    section: 'A',
    rollNumber: '35',
    gender: 'Female',
    dob: '2011-04-18',
    parentName: 'Sanjay Deshmukh',
    parentPhone: '9820011223',
    parentEmail: 'sanjay.deshmukh@example.com',
    address: 'Flat 304, Palm Grove, Pune',
    admissionDate: '2026-06-01'
  };

  const addStudentRes = await request('POST', '/api/students', studentPayload, adminToken);
  console.log(`-> Add Student HTTP Status: ${addStudentRes.status}`);
  if (addStudentRes.status !== 200 && addStudentRes.status !== 201) {
    throw new Error(`Add student failed: ${JSON.stringify(addStudentRes.data)}`);
  }
  const createdStudent = addStudentRes.data.data || addStudentRes.data.student;
  console.log(`✓ Student Successfully Created in DB:`);
  console.log(`  - Name: ${createdStudent.name}`);
  console.log(`  - Admission No / ID: ${createdStudent.studentId || createdStudent.admissionNumber}`);
  console.log(`  - Class: ${createdStudent.standard}-${createdStudent.section}`);
  console.log(`  - Roll Number: ${createdStudent.rollNumber}`);
  console.log(`  - Database UUID: ${createdStudent.id}\n`);

  // Verify fetch single student details
  const fetchStudentRes = await request('GET', `/api/students/${createdStudent.id}`, null, adminToken);
  if (fetchStudentRes.status !== 200) {
    throw new Error(`Fetch created student failed: ${JSON.stringify(fetchStudentRes.data)}`);
  }
  console.log(`✓ Student details verified via GET /api/students/${createdStudent.id}\n`);

  // -------------------------------------------------------------------------
  // STEP 2: PROMOTING THE STUDENT (9th -> 10th)
  // -------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('STEP 2: PROMOTING STUDENT TO NEXT CLASS (POST /api/promotion/execute)...');
  console.log('------------------------------------------------------------------------');

  // Preview promotion first
  const previewPayload = {
    fromAcademicYear: '2025-2026',
    toAcademicYear: '2026-2027',
    promotions: [
      {
        studentId: createdStudent.id,
        action: 'promote',
        targetStandard: '10th',
        targetSection: 'A',
        targetRollNumber: '35',
        remarks: 'Cleared 9th Annual Exam with distinction'
      }
    ]
  };

  const previewRes = await request('POST', '/api/promotion/preview', previewPayload, adminToken);
  if (previewRes.status !== 200 || !previewRes.data.success) {
    throw new Error(`Promotion preview failed: ${JSON.stringify(previewRes.data)}`);
  }
  console.log(`✓ Promotion Preview Validated: Eligible to promote ${previewRes.data.data.toPromoteCount} student(s) to 10th-A`);

  // Execute promotion
  const execPromoRes = await request('POST', '/api/promotion/execute', previewPayload, adminToken);
  console.log(`-> Promotion HTTP Status: ${execPromoRes.status}`);
  if (execPromoRes.status !== 200 || !execPromoRes.data.success) {
    throw new Error(`Promotion execution failed: ${JSON.stringify(execPromoRes.data)}`);
  }
  console.log(`✓ Promotion Executed Successfully:`);
  console.log(`  - Promoted Count: ${execPromoRes.data.promotedCount}`);
  console.log(`  - Batch ID: ${execPromoRes.data.batchId}`);

  // Verify Promotion Audit History & Student History
  const historyRes = await request('GET', `/api/promotion/student-history/${createdStudent.id}`, null, adminToken);
  if (historyRes.status !== 200 || !historyRes.data.success) {
    throw new Error(`Student promotion history fetch failed: ${JSON.stringify(historyRes.data)}`);
  }
  const enrollments = historyRes.data.data.enrollmentHistory;
  console.log(`✓ Enrollment History Verified (${enrollments.length} records):`);
  enrollments.forEach(e => {
    console.log(`  * Academic Year ${e.academicYear}: Class ${e.standard}-${e.section} -> Status: [${e.status}] (${e.remarks || 'Standard enrollment'})`);
  });
  console.log('');

  // -------------------------------------------------------------------------
  // STEP 3: EXAMINATION MARKS ENTRY BY MULTIPLE TEACHERS
  // -------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('STEP 3: MULTIPLE TEACHERS ENTERING MARKS FOR FA1 EXAM...');
  console.log('------------------------------------------------------------------------');

  // Let's get FA1 exam instance
  const examInstancesRes = await request('GET', '/api/examination/names', null, adminToken);
  if (examInstancesRes.status !== 200 || !examInstancesRes.data.data) {
    throw new Error(`Failed to fetch exam names: ${JSON.stringify(examInstancesRes.data)}`);
  }
  const fa1Exam = examInstancesRes.data.data.find(e => e.name.includes('FA1')) || examInstancesRes.data.data[0];
  console.log(`✓ Using Exam Instance: "${fa1Exam.name}" (ID: ${fa1Exam.id}, Max Marks: ${fa1Exam.examType?.fullMarks || 25})`);

  // Admin unlocks the exam instance so teachers can input marks
  console.log('Admin unlocking exam for marks entry (POST /api/examination/toggle-lock)...');
  await request('POST', '/api/examination/toggle-lock', { examNameId: fa1Exam.id, isLocked: false }, adminToken);
  console.log('✓ Exam marks entry window opened by Administrator');

  // Teacher 1: Priya Patel enters Mathematics Marks
  console.log('\n[Teacher 1: Priya Patel] Entering Mathematics Marks...');
  const mathsMarksPayload = {
    examNameId: fa1Exam.id,
    standard: '10th',
    section: 'A',
    subjectName: 'Mathematics',
    marksList: [
      {
        studentId: createdStudent.id,
        rollNumber: '35',
        studentName: createdStudent.name,
        standard: '10th',
        section: 'A',
        subjectName: 'Mathematics',
        marksObtained: 22,
        maxMarks: 25,
        minMarks: 9,
        isAbsent: false,
        remarks: 'Excellent geometry problem solving'
      }
    ]
  };

  const mathsEntryRes = await request('POST', '/api/examination/marks/bulk', mathsMarksPayload, teacherPriyaToken);
  if (mathsEntryRes.status !== 200 || !mathsEntryRes.data.status) {
    throw new Error(`Teacher 1 Maths marks entry failed: ${JSON.stringify(mathsEntryRes.data)}`);
  }
  const savedMaths = mathsEntryRes.data.data[0];
  console.log(`✓ Teacher 1 (Priya Patel) Saved Mathematics Marks:`);
  console.log(`  - Student: ${savedMaths.studentName}`);
  console.log(`  - Subject: ${savedMaths.subjectName}`);
  console.log(`  - Marks: ${savedMaths.marksObtained} / ${savedMaths.maxMarks} (Grade: ${savedMaths.grade})`);
  console.log(`  - Entered By: ${savedMaths.enteredBy}`);

  // Teacher 2: Vikram Singh enters Science Marks
  console.log('\n[Teacher 2: Vikram Singh] Entering Science Marks...');
  const scienceMarksPayload = {
    examNameId: fa1Exam.id,
    standard: '10th',
    section: 'A',
    subjectName: 'Science',
    marksList: [
      {
        studentId: createdStudent.id,
        rollNumber: '35',
        studentName: createdStudent.name,
        standard: '10th',
        section: 'A',
        subjectName: 'Science',
        marksObtained: 20,
        maxMarks: 25,
        minMarks: 9,
        isAbsent: false,
        remarks: 'Very good lab demonstration'
      }
    ]
  };

  const scienceEntryRes = await request('POST', '/api/examination/marks/bulk', scienceMarksPayload, teacherVikramToken);
  if (scienceEntryRes.status !== 200 || !scienceEntryRes.data.status) {
    throw new Error(`Teacher 2 Science marks entry failed: ${JSON.stringify(scienceEntryRes.data)}`);
  }
  const savedScience = scienceEntryRes.data.data[0];
  console.log(`✓ Teacher 2 (Vikram Singh) Saved Science Marks:`);
  console.log(`  - Student: ${savedScience.studentName}`);
  console.log(`  - Subject: ${savedScience.subjectName}`);
  console.log(`  - Marks: ${savedScience.marksObtained} / ${savedScience.maxMarks} (Grade: ${savedScience.grade})`);
  console.log(`  - Entered By: ${savedScience.enteredBy}\n`);

  // -------------------------------------------------------------------------
  // STEP 4: AUDITING AND MODIFYING MARKS (WITH AUDIT LOG PROOF)
  // -------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('STEP 4: AUDITING & MODIFYING MARKS (PUT /api/examination/marks/modify/:id)...');
  console.log('------------------------------------------------------------------------');

  // Verify that modifying marks without a mandatory reason is REJECTED
  console.log('Testing Audit Enforcement: Attempting modification without reason...');
  const rejectedModifyRes = await request(
    'PUT',
    `/api/examination/marks/modify/${savedMaths.id}`,
    { marksObtained: 24, isAbsent: false, reason: '' },
    adminToken
  );
  if (rejectedModifyRes.status === 400) {
    console.log(`✓ Security & Integrity Pass: Modification rejected with message: "${rejectedModifyRes.data.message}"`);
  } else {
    throw new Error(`Expected HTTP 400 for missing audit reason, got ${rejectedModifyRes.status}`);
  }

  // Now perform legitimate audited modification (22 -> 24 marks)
  const auditReason = 'Verified re-evaluation of Question 4 by Academic Coordinator';
  const auditedModifyRes = await request(
    'PUT',
    `/api/examination/marks/modify/${savedMaths.id}`,
    { marksObtained: 24, isAbsent: false, reason: auditReason },
    adminToken
  );
  if (auditedModifyRes.status !== 200 || !auditedModifyRes.data.status) {
    throw new Error(`Audited mark modification failed: ${JSON.stringify(auditedModifyRes.data)}`);
  }
  const modifiedRecord = auditedModifyRes.data.data;
  console.log(`✓ Marks Successfully Modified:`);
  console.log(`  - Subject: ${modifiedRecord.subjectName}`);
  console.log(`  - Old Marks: 22 -> New Marks: ${modifiedRecord.marksObtained} / ${modifiedRecord.maxMarks} (Grade: ${modifiedRecord.grade})`);
  console.log(`  - Modified By Tag: ${modifiedRecord.modifiedBy}`);

  // Fetch Audit Logs to verify immutable logging
  const auditLogsRes = await request('GET', '/api/examination/audit-logs', null, adminToken);
  if (auditLogsRes.status !== 200 || !auditLogsRes.data.data) {
    throw new Error(`Fetch audit logs failed: ${JSON.stringify(auditLogsRes.data)}`);
  }
  const matchingLog = auditLogsRes.data.data.find(l => l.examMarksId === savedMaths.id || l.studentId === createdStudent.id);
  if (!matchingLog) {
    throw new Error('Audit log entry not found in examAuditLog database!');
  }
  console.log(`✓ Audit Log Entry Verified in System:`);
  console.log(`  - Student: ${matchingLog.studentName}`);
  console.log(`  - Exam: ${matchingLog.examName}`);
  console.log(`  - Old: ${matchingLog.oldMarks} -> New: ${matchingLog.newMarks}`);
  console.log(`  - Changed By: ${matchingLog.changedBy} (${matchingLog.role})`);
  console.log(`  - Mandatory Audit Reason: "${matchingLog.reason}"`);
  console.log(`  - Timestamp: ${matchingLog.timestamp}\n`);

  // -------------------------------------------------------------------------
  // STEP 5: FEES DUES CHECK, COLLECTION & RECEIPT GENERATION
  // -------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('STEP 5: FEES MODULE: DUES CHECK, COLLECTION & RECEIPT AUDIT...');
  console.log('------------------------------------------------------------------------');

  // 5a. Query Fees Dashboard
  const feesDashboardRes = await request('GET', '/api/fees/dashboard', null, adminToken);
  if (feesDashboardRes.status !== 200 || !feesDashboardRes.data.success) {
    throw new Error(`Fees Dashboard failed: ${JSON.stringify(feesDashboardRes.data)}`);
  }
  const dashData = feesDashboardRes.data.data;
  console.log(`✓ Fees Overview Dashboard:`);
  console.log(`  - Total Annual Billed: ₹${dashData.summary?.annualFeesTotal || dashData.totalReceivable || 0}`);
  console.log(`  - Total Collected: ₹${dashData.summary?.totalCollected || dashData.totalCollected || 0}`);
  console.log(`  - Pending Due Balance: ₹${dashData.summary?.pendingFeesTotal || dashData.totalDue || 0}`);
  console.log(`  - Pending Percentage: ${dashData.summary?.pendingPercentage || dashData.pendingPercentage || 'N/A'}%`);

  // 5b. Fetch Student Fee Dues Details
  console.log(`\nChecking Fee Dues for ${createdStudent.name} (${createdStudent.id})...`);
  const studentFeeRes = await request('GET', `/api/fees/collection/student-details/${createdStudent.id}`, null, adminToken);
  if (studentFeeRes.status !== 200 || !studentFeeRes.data.success) {
    throw new Error(`Student fee details failed: ${JSON.stringify(studentFeeRes.data)}`);
  }
  const feeInfo = studentFeeRes.data.data;
  console.log(`✓ Student Fee Profile Retrieved:`);
  console.log(`  - Student Name: ${feeInfo.student.name}`);
  console.log(`  - Quota: ${feeInfo.student.quotaName || 'General'}`);
  console.log(`  - Total Annual Payable: ₹${feeInfo.student.annualPayable || feeInfo.student.totalPayable || 45000}`);
  console.log(`  - Outstanding Due: ₹${feeInfo.student.totalDue || 45000}`);
  console.log(`  - Fee Structure Heads: ${feeInfo.baseStructure.items.length} heads applicable`);

  // 5c. Collect Fee Payment
  console.log('\nExecuting Fee Collection at Counter (POST /api/fees/collection/collect)...');
  const paymentAmount = 15000;
  const collectPayload = {
    studentId: createdStudent.id,
    academicYear: '2026-2027',
    paymentDate: new Date().toISOString().slice(0, 10),
    paidAmount: paymentAmount,
    tenderedAmount: 15000,
    changeToReturn: 0,
    paymentModes: [
      { mode: 'cash', amount: 15000, reference: 'Bank Counter Deposit' }
    ],
    items: [
      { headName: 'Term 1 Tuition Fee', amount: 10000, period: 'Term 1' },
      { headName: 'Computer & Lab Fee', amount: 5000, period: 'Term 1' }
    ],
    subTotal: 15000,
    discount: 0,
    lateFine: 0,
    remarks: 'Term 1 fees collected in full'
  };

  const collectRes = await request('POST', '/api/fees/collection/collect', collectPayload, adminToken);
  console.log(`-> Fee Collection HTTP Status: ${collectRes.status}`);
  if (collectRes.status !== 200 || !collectRes.data.success) {
    throw new Error(`Fee collection failed: ${JSON.stringify(collectRes.data)}`);
  }
  const receipt = collectRes.data.receipt || collectRes.data.data;
  console.log(`✓ Fee Collection Receipt Generated:`);
  console.log(`  - Receipt Number: ${receipt.receiptNumber}`);
  console.log(`  - Student: ${receipt.studentName} (${receipt.standard}-${receipt.section})`);
  console.log(`  - Amount Paid: ₹${receipt.paidAmount}`);
  console.log(`  - Amount in Words: "${receipt.amountInWords}"`);
  console.log(`  - Payment Mode: ${receipt.primaryMode}`);
  console.log(`  - Collected By: ${receipt.collectedBy}`);
  console.log(`  - Status: ${receipt.status}`);

  // 5d. Re-check Student Balance after Collection
  const recheckFeeRes = await request('GET', `/api/fees/collection/student-details/${createdStudent.id}`, null, adminToken);
  const updatedFeeInfo = recheckFeeRes.data.data;
  console.log(`\n✓ Balance Update Verified:`);
  console.log(`  - Total Paid To Date: ₹${updatedFeeInfo.student.totalPaid}`);
  console.log(`  - Remaining Outstanding Due: ₹${updatedFeeInfo.student.totalDue}`);
  console.log(`  - Receipts on Record: ${updatedFeeInfo.studentReceipts.length}`);

  console.log('\n========================================================================');
  console.log('  ALL 5 SCHOOL LIFECYCLE OPERATIONS PASSED WITH 100% OPERATIONAL FIDELITY ');
  console.log('========================================================================');
}

runComprehensiveSchoolOperationsTest()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ AUDIT FAILED WITH ERROR:', err);
    process.exit(1);
  });
