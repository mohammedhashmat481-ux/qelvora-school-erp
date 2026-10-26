import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

export async function seedExaminationDefaults() {
  console.log('📝 Seeding Examination Defaults (Exam Types, Grade Scale, CCE Masters, Weightages)...');

  // 1. Grade Scale
  const defaultGrades = [
    { grade: 'A+', minPercent: 90, maxPercent: 100, gradePoint: 10, remark: 'Outstanding', sequence: 1 },
    { grade: 'A',  minPercent: 80, maxPercent: 89.99, gradePoint: 9,  remark: 'Excellent', sequence: 2 },
    { grade: 'B+', minPercent: 70, maxPercent: 79.99, gradePoint: 8,  remark: 'Very Good', sequence: 3 },
    { grade: 'B',  minPercent: 60, maxPercent: 69.99, gradePoint: 7,  remark: 'Good', sequence: 4 },
    { grade: 'C',  minPercent: 50, maxPercent: 59.99, gradePoint: 6,  remark: 'Above Average', sequence: 5 },
    { grade: 'D',  minPercent: 35, maxPercent: 49.99, gradePoint: 5,  remark: 'Pass', sequence: 6 },
    { grade: 'F',  minPercent: 0,  maxPercent: 34.99, gradePoint: 0,  remark: 'Needs Improvement / Fail', sequence: 7 },
  ];

  for (const g of defaultGrades) {
    await prisma.gradeScale.upsert({
      where: { grade: g.grade },
      update: g,
      create: g,
    });
  }
  console.log('✅ Grade Scales seeded.');

  // 2. Default Exam Types: FA1, FA2, Mid Term, FA3, FA4, Final
  const defaultExamTypes = [
    { name: 'FA1', fullMarks: 25, minPassMarks: 9, type: 'CCE', weightage: 10, sequence: 1, academicYear: '2026-2027' },
    { name: 'FA2', fullMarks: 25, minPassMarks: 9, type: 'CCE', weightage: 10, sequence: 2, academicYear: '2026-2027' },
    { name: 'Mid Term', fullMarks: 100, minPassMarks: 35, type: 'Term/Semester', weightage: 30, sequence: 3, academicYear: '2026-2027' },
    { name: 'FA3', fullMarks: 25, minPassMarks: 9, type: 'CCE', weightage: 10, sequence: 4, academicYear: '2026-2027' },
    { name: 'FA4', fullMarks: 25, minPassMarks: 9, type: 'CCE', weightage: 10, sequence: 5, academicYear: '2026-2027' },
    { name: 'Final', fullMarks: 100, minPassMarks: 35, type: 'Term/Semester', weightage: 30, sequence: 6, academicYear: '2026-2027' },
  ];

  const createdExamTypes = {};
  for (const et of defaultExamTypes) {
    const record = await prisma.examType.upsert({
      where: { name_academicYear: { name: et.name, academicYear: et.academicYear } },
      update: et,
      create: et,
    });
    createdExamTypes[et.name] = record;
  }
  console.log('✅ Exam Types (FA1 to Final) seeded.');

  // 3. Exam Names (Instances)
  const defaultExamNames = [
    { examTypeId: createdExamTypes['Mid Term'].id, name: 'Mid Term Examination 2026-27', description: 'Comprehensive Mid-Term Summative Assessment', academicYear: '2026-2027', startDate: '2026-09-15', endDate: '2026-09-25', isPublished: true, isLocked: false },
    { examTypeId: createdExamTypes['FA1'].id, name: 'Formative Assessment 1 (FA1) 2026-27', description: 'Formative Unit Evaluation 1', academicYear: '2026-2027', startDate: '2026-07-10', endDate: '2026-07-15', isPublished: true, isLocked: true },
    { examTypeId: createdExamTypes['FA2'].id, name: 'Formative Assessment 2 (FA2) 2026-27', description: 'Formative Unit Evaluation 2', academicYear: '2026-2027', startDate: '2026-08-20', endDate: '2026-08-25', isPublished: true, isLocked: true },
    { examTypeId: createdExamTypes['Final'].id, name: 'Annual Final Examination 2026-27', description: 'Final Comprehensive Year-End Board Simulation', academicYear: '2026-2027', startDate: '2027-02-15', endDate: '2027-02-28', isPublished: false, isLocked: false },
  ];

  const createdExamNames = {};
  for (const en of defaultExamNames) {
    const record = await prisma.examName.upsert({
      where: { name_academicYear: { name: en.name, academicYear: en.academicYear } },
      update: en,
      create: en,
    });
    createdExamNames[en.name] = record;
  }
  console.log('✅ Exam Names seeded.');

  // 4. CCE Skills Master
  const defaultSkills = [
    { skillName: 'Communication & Expression', category: 'Life Skills', description: 'Clarity, speech articulation, and active listening', sequence: 1 },
    { skillName: 'Creativity & Critical Thinking', category: 'Life Skills', description: 'Original problem solving and innovation', sequence: 2 },
    { skillName: 'Discipline & Punctuality', category: 'Attitudes & Values', description: 'Adherence to campus code and consistency', sequence: 3 },
    { skillName: 'Teamwork & Collaboration', category: 'Attitudes & Values', description: 'Empathy, peer cooperation, and group activities', sequence: 4 },
    { skillName: 'Visual & Performing Arts', category: 'Co-Scholastic', description: 'Participation in sketching, music, and dramatics', sequence: 5 },
    { skillName: 'Physical Education & Sports', category: 'Health & Fitness', description: 'Athletic stamina, motor coordination, and sportsmanship', sequence: 6 },
  ];

  for (const s of defaultSkills) {
    await prisma.cCESkill.upsert({
      where: { skillName: s.skillName },
      update: s,
      create: s,
    });
  }
  console.log('✅ CCE Skills seeded.');

  // 5. CCE Test Types Master
  const defaultTestTypes = [
    { testTypeName: 'Written Class Test', description: 'Pen-and-paper structured test paper', sequence: 1 },
    { testTypeName: 'Oral / Viva Voce', description: 'Verbal recitation and interview questions', sequence: 2 },
    { testTypeName: 'Laboratory Practical', description: 'Hands-on scientific experiment verification', sequence: 3 },
    { testTypeName: 'Project / Exhibition', description: 'Research dossier, model, or group chart', sequence: 4 },
    { testTypeName: 'Classroom Assignment', description: 'Daily homework workbook evaluation', sequence: 5 },
  ];

  for (const tt of defaultTestTypes) {
    await prisma.cCETestType.upsert({
      where: { testTypeName: tt.testTypeName },
      update: tt,
      create: tt,
    });
  }
  console.log('✅ CCE Test Types seeded.');

  // 6. Weightages
  const defaultWeightages = [
    { academicYear: '2026-2027', examTypeName: 'FA1', weightPercent: 10 },
    { academicYear: '2026-2027', examTypeName: 'FA2', weightPercent: 10 },
    { academicYear: '2026-2027', examTypeName: 'Mid Term', weightPercent: 30 },
    { academicYear: '2026-2027', examTypeName: 'FA3', weightPercent: 10 },
    { academicYear: '2026-2027', examTypeName: 'FA4', weightPercent: 10 },
    { academicYear: '2026-2027', examTypeName: 'Final', weightPercent: 30 },
  ];

  for (const w of defaultWeightages) {
    await prisma.examWeightage.upsert({
      where: { academicYear_examTypeName: { academicYear: w.academicYear, examTypeName: w.examTypeName } },
      update: w,
      create: w,
    });
  }
  console.log('✅ Exam Weightages seeded.');

  // 7. Seed sample allocations & sample marks for students (including Aarav Sharma)
  const students = await prisma.student.findMany({ take: 15 });
  const midTermExam = createdExamNames['Mid Term Examination 2026-27'];
  const fa1Exam = createdExamNames['Formative Assessment 1 (FA1) 2026-27'];
  const subjects = ['Mathematics', 'Science', 'English', 'Social Science', 'Hindi'];

  if (midTermExam && students.length > 0) {
    for (const sub of subjects) {
      await prisma.examAllocation.upsert({
        where: {
          examNameId_standard_section_subjectName: {
            examNameId: midTermExam.id,
            standard: 'Grade 5',
            section: 'A',
            subjectName: sub,
          }
        },
        update: {},
        create: {
          examNameId: midTermExam.id,
          standard: 'Grade 5',
          section: 'A',
          subjectName: sub,
          teacherName: 'Dr. Rajesh Sharma',
          employeeId: 'EMP001',
          sequence: subjects.indexOf(sub) + 1,
        }
      });
    }

    // Seed marks for students in Grade 5-A / 10th-A
    for (const stu of students) {
      for (const sub of subjects) {
        const isAarav = (stu.name || '').includes('Aarav');
        const score = isAarav 
          ? (sub === 'Mathematics' ? 98 : sub === 'Science' ? 95 : sub === 'English' ? 92 : 90)
          : Math.floor(65 + Math.random() * 30);
        
        await prisma.examMarks.upsert({
          where: {
            studentId_examNameId_subjectName: {
              studentId: stu.id,
              examNameId: midTermExam.id,
              subjectName: sub,
            }
          },
          update: {
            marksObtained: score,
            isPassed: score >= 35,
            grade: score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : 'C',
          },
          create: {
            examNameId: midTermExam.id,
            examTypeId: midTermExam.examTypeId,
            studentId: stu.id,
            rollNumber: stu.rollNumber || '01',
            studentName: stu.name,
            standard: stu.standard,
            section: stu.section,
            subjectName: sub,
            maxMarks: 100,
            minMarks: 35,
            marksObtained: score,
            isAbsent: false,
            isPassed: score >= 35,
            grade: score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : 'C',
            gradePoint: score >= 90 ? 10 : score >= 80 ? 9 : score >= 70 ? 8 : 7,
            remarks: isAarav ? 'Excellent conceptual mastery' : 'Good performance',
            enteredBy: 'Dr. Rajesh Sharma (Faculty)',
          }
        });
      }

      // Seed CCE Grades for this student
      for (const skill of defaultSkills) {
        await prisma.studentCCEGrade.upsert({
          where: {
            studentId_academicYear_term_skillName: {
              studentId: stu.id,
              academicYear: '2026-2027',
              term: 'Term 1',
              skillName: skill.skillName,
            }
          },
          update: {},
          create: {
            studentId: stu.id,
            studentName: stu.name,
            standard: stu.standard,
            section: stu.section,
            academicYear: '2026-2027',
            term: 'Term 1',
            skillId: skill.skillName,
            skillName: skill.skillName,
            grade: 'A+',
            remarks: 'Actively participates and demonstrates initiative',
            assessedBy: 'Dr. Rajesh Sharma',
          }
        });
      }
    }
    console.log('✅ Sample Exam Allocations, Student Marks, and CCE Grades seeded.');
  }

  console.log('🎉 Examination Module seeding finished successfully!');
}

if (process.argv[1] && process.argv[1].includes('seedExamination.js')) {
  seedExaminationDefaults()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error seeding examination:', err);
      process.exit(1);
    });
}
