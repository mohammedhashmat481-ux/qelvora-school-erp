import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();
const FEES_DATA_PATH = path.resolve(__dirname, '../src/db/feesData.json');

async function auditEntities() {
  console.log('====================================================');
  console.log('🔍 INDEPENDENT AUDIT 1: CORE DATABASE ENTITIES');
  console.log('====================================================\n');

  try {
    const classes = await prisma.class.findMany({ orderBy: [{ standard: 'asc' }, { section: 'asc' }] });
    const teachers = await prisma.teacher.findMany();
    const students = await prisma.student.findMany();
    const subjects = await prisma.subject.findMany();
    const mappings = await prisma.teacherClassSubjectMapping.findMany();

    console.log('--- Entity Totals ---');
    console.log(`Classes: ${classes.length}`);
    console.log(`Teachers: ${teachers.length}`);
    console.log(`Students: ${students.length}`);
    console.log(`Subjects: ${subjects.length}`);
    console.log(`TeacherClassSubjectMapping: ${mappings.length}`);

    // Check Classes & Class Teachers
    console.log('\n--- Classes & Class Teachers Check ---');
    const classKeys = new Set();
    const duplicateClasses = [];
    const missingClassTeachers = [];
    const teacherIdNotFound = [];
    const teacherNameMismatch = [];

    classes.forEach(c => {
      const key = `${c.standard}-${c.section}`;
      if (classKeys.has(key)) duplicateClasses.push(key);
      classKeys.add(key);

      if (!c.classTeacherId || !c.classTeacherName) {
        missingClassTeachers.push(key);
      } else {
        const t = teachers.find(tch => tch.id === c.classTeacherId);
        if (!t) {
          teacherIdNotFound.push({ class: key, classTeacherId: c.classTeacherId });
        } else if (t.name !== c.classTeacherName) {
          teacherNameMismatch.push({ class: key, classTeacherName: c.classTeacherName, teacherNameInTable: t.name });
        }
      }
    });

    console.log(`Duplicate Classes: ${duplicateClasses.length === 0 ? 'None (PASS)' : JSON.stringify(duplicateClasses)}`);
    console.log(`Classes Missing Class Teacher: ${missingClassTeachers.length === 0 ? 'None (PASS)' : JSON.stringify(missingClassTeachers)}`);
    console.log(`Class Teacher ID Not Found: ${teacherIdNotFound.length === 0 ? 'None (PASS)' : JSON.stringify(teacherIdNotFound)}`);
    console.log(`Class Teacher Name Mismatches: ${teacherNameMismatch.length === 0 ? 'None (PASS)' : JSON.stringify(teacherNameMismatch)}`);

    // Check Teacher Reverse Mapping (assignedClass & assignedSection)
    console.log('\n--- Teacher Profile Assignment Check ---');
    const teacherAssignments = teachers.map(t => ({
      name: t.name,
      empId: t.employeeId,
      assignedClass: t.assignedClass,
      assignedSection: t.assignedSection
    }));
    console.log(`Total Teachers: ${teacherAssignments.length}`);
    const unassignedTeachers = teacherAssignments.filter(t => !t.assignedClass);
    console.log(`Teachers without assigned class: ${unassignedTeachers.length}`);

    // Check Students Distribution
    console.log('\n--- Students per Class Distribution ---');
    const studentDistribution = {};
    students.forEach(s => {
      const key = `${s.standard}-${s.section}`;
      studentDistribution[key] = (studentDistribution[key] || 0) + 1;
    });

    let outsideRange = 0;
    classes.forEach(c => {
      const k = `${c.standard}-${c.section}`;
      const count = studentDistribution[k] || 0;
      const inRange = count >= 10 && count <= 20;
      if (!inRange) outsideRange++;
      console.log(`  ${k.padEnd(10)}: ${count} students | CT: ${c.classTeacherName} | Status: ${inRange ? 'OK' : 'OUT_OF_RANGE'}`);
    });
    console.log(`Classes outside 10-20 students: ${outsideRange}`);

    // Check orphaned students & missing parent info
    const orphanedStudents = students.filter(s => !classKeys.has(`${s.standard}-${s.section}`));
    console.log(`Orphaned Students (not in any registered class): ${orphanedStudents.length}`);
    const missingParents = students.filter(s => !s.parentName || !s.parentPhone || !s.parentEmail);
    console.log(`Students missing Parent info: ${missingParents.length}`);

    // Check Subjects & Subject Codes
    console.log('\n--- Subject Codes Uniqueness & Class Mapping Check ---');
    const codeMap = new Map();
    const duplicateCodes = [];
    subjects.forEach(s => {
      if (!s.code) return;
      if (codeMap.has(s.code)) {
        duplicateCodes.push({ code: s.code, first: codeMap.get(s.code), duplicate: { id: s.id, name: s.name, standard: s.standard, section: s.section } });
      } else {
        codeMap.set(s.code, { id: s.id, name: s.name, standard: s.standard, section: s.section });
      }
    });
    console.log(`Total Unique Subject Codes: ${codeMap.size}`);
    console.log(`Duplicate Subject Codes: ${duplicateCodes.length === 0 ? 'None (PASS)' : JSON.stringify(duplicateCodes, null, 2)}`);

    // Verify TeacherClassSubjectMapping
    console.log('\n--- TeacherClassSubjectMapping Integrity Check ---');
    const mappingsMissingTeacher = mappings.filter(m => !m.teacherId || !m.teacherName);
    console.log(`Mappings missing Teacher: ${mappingsMissingTeacher.length}`);
    const mappingsMissingSubject = mappings.filter(m => !m.subjectId || !m.subject || !m.subjectCode);
    console.log(`Mappings missing Subject details: ${mappingsMissingSubject.length}`);
    const mappingsMissingClass = mappings.filter(m => !classKeys.has(`${m.standard}-${m.section}`));
    console.log(`Mappings with invalid/orphaned Class: ${mappingsMissingClass.length}`);

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

auditEntities();
