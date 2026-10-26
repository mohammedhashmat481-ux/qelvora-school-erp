import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/ui/Sidebar';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  UserCheck,
  Users,
  X,
  TrendingUp,
  AlertTriangle,
  History,
  Check,
  Sliders,
  BarChart2,
  PieChart,
  Eye,
  SlidersHorizontal,
  FileCheck
} from 'lucide-react';
import {
  getExamTypes,
  createExamType,
  updateExamType,
  deleteExamType,
  getExamNames,
  createExamName,
  updateExamName,
  deleteExamName,
  createExamSchedule,
  getExamAllocations,
  createExamAllocation,
  deleteExamAllocation,
  getExamMarksRoster,
  saveExamMarksBulk,
  modifyExamMarksAudit,
  getExamAuditLogs,
  toggleExamLock,
  toggleExamPublish,
  getReportCardsData,
  getCCESkills,
  createCCESkill,
  getCCETestTypes,
  saveCCEGradesBulk,
  getExamAnalytics,
  getGradeScales,
  getSubjects,
  getProfile,
  saveGradeScale
} from '../services/authService';

const ExaminationPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Role Access Guard: Only Admin & Teacher
  useEffect(() => {
    if (user && (user.role === 'student' || user.role === 'parent')) {
      toast.error('Access Restricted: Examination management is only available to Faculty and Admin.');
      navigate('/parent?tab=student-panel&sub=exam-results');
    }
  }, [user, navigate]);

  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'principal' || userRole === 'super admin';
  const isTeacher = userRole === 'teacher';

  // Academic Year State
  const [academicYear, setAcademicYear] = useState('2026-2027');

  // Active Tab: 10 Modules
  const tabParam = searchParams.get('tab');
  
  const mapTabParam = (param) => {
    if (!param) return 'marks-entry';
    const map = {
      'types': 'exam-types',
      'names': 'exam-names',
      'entry': 'marks-entry',
      'modify': 'modify-marks',
      'cards': 'marks-card',
      'individual': 'individual-marks',
      'cce': 'cce-skills',
      'allocations': 'allocation',
      'grading': 'grading-engine',
      'analytics': 'analytics'
    };
    return map[param] || param;
  };

  const [activeTab, setActiveTab] = useState(mapTabParam(tabParam));

  useEffect(() => {
    if (tabParam) {
      setActiveTab(mapTabParam(tabParam));
    }
  }, [tabParam]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Shared Master Data State
  const [examTypes, setExamTypes] = useState([]);
  const [examNames, setExamNames] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [gradeScales, setGradeScales] = useState([]);
  const [cceSkills, setCceSkills] = useState([]);
  const [cceTestTypes, setCceTestTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Common Class / Section dropdown lists
  const classOptions = ['10th', '9th', '8th', '7th', '6th', '5th', '4th', '3rd', '2nd', '1st', 'UKG', 'LKG', 'Nursery'];
  const sectionOptions = ['A', 'B', 'C'];
  const [subjectOptions, setSubjectOptions] = useState([
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Science',
    'English',
    'English Literature',
    'Computer Science',
    'Computer Science & AI',
    'Social Studies & Civics',
    'Social Science',
    'Hindi',
    'Environmental Science'
  ]);

  // Load Initial Master Data
  const loadMasterData = async () => {
    setIsLoading(true);
    try {
      const [typesRes, namesRes, gradesRes, skillsRes, cceTypesRes] = await Promise.all([
        getExamTypes(academicYear).catch(() => ({ data: [] })),
        getExamNames(academicYear).catch(() => ({ data: [] })),
        getGradeScales().catch(() => ({ data: [] })),
        getCCESkills().catch(() => ({ data: [] })),
        getCCETestTypes().catch(() => ({ data: [] }))
      ]);
      setExamTypes(typesRes.data || []);
      setExamNames(namesRes.data || []);
      setGradeScales(gradesRes.data || []);
      setCceSkills(skillsRes.data || []);
      try {
        const subsRes = await getSubjects();
        if (subsRes?.data && Array.isArray(subsRes.data) && subsRes.data.length > 0) {
          const names = subsRes.data.map(s => s.name);
          setSubjectOptions(prev => Array.from(new Set([...prev, ...names])));
        }
      } catch (_) {}
      setCceTestTypes(cceTypesRes.data || []);
    } catch (err) {
      console.error('Master data load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, [academicYear]);

  // ─────────────────────────────────────────────────────────────
  // 1. MODULE: DEFINE EXAM TYPE
  // ─────────────────────────────────────────────────────────────
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState({
    name: '',
    fullMarks: 100,
    passMarks: 35,
    type: 'Term/Semester',
    weightage: 20,
    sequence: 1,
    isActive: true
  });

  const handleOpenAddType = () => {
    setEditingType(null);
    setTypeForm({
      name: '',
      fullMarks: 100,
      passMarks: 35,
      type: 'Term/Semester',
      weightage: 20,
      sequence: examTypes.length + 1,
      isActive: true
    });
    setIsTypeModalOpen(true);
  };

  const handleOpenEditType = (t) => {
    setEditingType(t);
    setTypeForm({
      name: t.name,
      fullMarks: t.fullMarks,
      passMarks: t.passMarks,
      type: t.type,
      weightage: t.weightage || 0,
      sequence: t.sequence || 1,
      isActive: t.isActive
    });
    setIsTypeModalOpen(true);
  };

  const handleSaveExamType = async (e) => {
    e.preventDefault();
    if (Number(typeForm.passMarks) > Number(typeForm.fullMarks)) {
      return toast.error('Minimum (Pass) marks cannot exceed Full Marks.');
    }
    try {
      if (editingType) {
        const res = await updateExamType(editingType.id, { ...typeForm, academicYear });
        if (res.success) {
          toast.success('Exam type updated successfully');
          setIsTypeModalOpen(false);
          loadMasterData();
        } else {
          toast.error(res.message);
        }
      } else {
        const res = await createExamType({ ...typeForm, academicYear });
        if (res.success) {
          toast.success('Exam type created successfully');
          setIsTypeModalOpen(false);
          loadMasterData();
        } else {
          toast.error(res.message);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteExamType = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Exam Type? This will fail if marks or exams exist for it.')) return;
    try {
      const res = await deleteExamType(id);
      if (res.success) {
        toast.success('Exam type deleted');
        loadMasterData();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete exam type because marks or linked data exist.');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. MODULE: EXAM NAME / INSTANCES & SCHEDULE
  // ─────────────────────────────────────────────────────────────
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const [nameForm, setNameForm] = useState({
    examTypeId: '',
    name: '',
    startDate: '',
    endDate: '',
    description: ''
  });

  // Schedule modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedExamForSchedule, setSelectedExamForSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    className: 'Grade 5',
    section: 'A',
    subject: 'Mathematics',
    examDate: new Date().toISOString().split('T')[0],
    startTime: '09:30',
    endTime: '12:30',
    roomNo: 'Room 201',
    maxMarks: 100
  });

  const handleOpenAddName = () => {
    setEditingName(null);
    setNameForm({
      examTypeId: examTypes[0]?.id || '',
      name: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      description: ''
    });
    setIsNameModalOpen(true);
  };

  const handleSaveExamName = async (e) => {
    e.preventDefault();
    if (!nameForm.examTypeId) return toast.error('Please select an Exam Type');
    try {
      if (editingName) {
        const res = await updateExamName(editingName.id, { ...nameForm, academicYear });
        if (res.success) {
          toast.success('Exam instance updated');
          setIsNameModalOpen(false);
          loadMasterData();
        } else {
          toast.error(res.message);
        }
      } else {
        const res = await createExamName({ ...nameForm, academicYear });
        if (res.success) {
          toast.success('Exam instance created');
          setIsNameModalOpen(false);
          loadMasterData();
        } else {
          toast.error(res.message);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteExamName = async (id) => {
    if (!window.confirm('Delete this Exam? Marks and schedules linked will be affected.')) return;
    try {
      const res = await deleteExamName(id);
      if (res.success) {
        toast.success('Exam deleted');
        loadMasterData();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!selectedExamForSchedule) return;
    try {
      const res = await createExamSchedule({
        examNameId: selectedExamForSchedule.id,
        ...scheduleForm
      });
      if (res.success) {
        toast.success('Schedule slot saved successfully');
        setIsScheduleModalOpen(false);
        loadMasterData();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. MODULE: MARKS ENTRY (GRID, BULK SAVE, ABSENT, IMPORT)
  // ─────────────────────────────────────────────────────────────
  const [entryClass, setEntryClass] = useState('10th');
  const [entrySection, setEntrySection] = useState('A');
  const [entryExamId, setEntryExamId] = useState('');
  const [entrySubject, setEntrySubject] = useState('Mathematics');
  const [entryFaculty, setEntryFaculty] = useState(user?.name || 'Faculty Member');

  // Auto-align class, section, subject & faculty name for logged-in teacher
  useEffect(() => {
    if (user && isTeacher) {
      if (user.name) setEntryFaculty(user.name);
      getProfile().then(res => {
        if (res?.data) {
          if (res.data.name) setEntryFaculty(res.data.name);
          if (res.data.assignedClass) setEntryClass(res.data.assignedClass);
          if (res.data.assignedSection) setEntrySection(res.data.assignedSection);
          const dept = (res.data.department || '').toLowerCase();
          const qual = (res.data.qualification || '').toLowerCase();
          if (dept.includes('physic') || qual.includes('physic')) setEntrySubject('Physics');
          else if (dept.includes('chem') || qual.includes('chem')) setEntrySubject('Chemistry');
          else if (dept.includes('bio') || qual.includes('bio')) setEntrySubject('Biology');
          else if (dept.includes('math') || qual.includes('math')) setEntrySubject('Mathematics');
          else if (dept.includes('comput') || dept.includes('ai')) setEntrySubject('Computer Science & AI');
          else if (dept.includes('eng') || qual.includes('eng')) setEntrySubject('English Literature');
          else if (dept.includes('social') || dept.includes('civic') || dept.includes('hist')) setEntrySubject('Social Studies & Civics');
        }
      }).catch(() => {});
    }
  }, [user, isTeacher]);
  const [marksRoster, setMarksRoster] = useState([]);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [isExamLocked, setIsExamLocked] = useState(false);
  const [isExamPublished, setIsExamPublished] = useState(false);
  const [checkedStudentIds, setCheckedStudentIds] = useState(new Set());
  const fileInputRef = useRef(null);

  // Set default exam name when list loads
  useEffect(() => {
    if (examNames.length > 0 && !entryExamId) {
      setEntryExamId(examNames[0].id);
    }
  }, [examNames]);

  const loadMarksRoster = async () => {
    if (!entryExamId) return;
    setIsRosterLoading(true);
    try {
      const res = await getExamMarksRoster({
        className: entryClass,
        section: entrySection,
        examNameId: entryExamId,
        subject: entrySubject
      });
      if (res && (res.success || res.status || res.data || res.roster)) {
        const rawList = Array.isArray(res.roster)
          ? res.roster
          : (Array.isArray(res.data?.roster)
            ? res.data.roster
            : (Array.isArray(res.data) ? res.data : []));

        const examObj = examNames.find(e => e.id === entryExamId);
        const normalized = rawList.map(r => ({
          ...r,
          rollNo: r.rollNo || r.rollNumber || '01',
          rollNumber: r.rollNumber || r.rollNo || '01',
          examName: r.examName || examObj?.name || 'Assessment',
          subject: r.subject || r.subjectName || entrySubject
        }));

        setMarksRoster(normalized);
        setIsExamLocked(Boolean(res.isLocked || res.data?.isExamLocked || res.isExamLocked));
        setIsExamPublished(Boolean(res.isPublished || res.data?.isPublished));
        // Check all by default
        const allIds = new Set(normalized.map(r => r.studentId));
        setCheckedStudentIds(allIds);
      }
    } catch (err) {
      toast.error('Failed to load student roster');
    } finally {
      setIsRosterLoading(false);
    }
  };

  useEffect(() => {
    if (entryExamId && (activeTab === 'marks-entry' || activeTab === 'modify-marks')) {
      loadMarksRoster();
    }
  }, [entryClass, entrySection, entryExamId, entrySubject, activeTab]);

  const handleMarksChange = (studentId, field, value) => {
    if (isExamLocked && !isAdmin) {
      return toast.error('This examination marks sheet is LOCKED by Admin. Modifications require Admin unlock.');
    }
    setMarksRoster(prev => prev.map(row => {
      if (row.studentId === studentId) {
        const updated = { ...row, [field]: value };
        if (field === 'isAbsent' && value === true) {
          updated.marksObtained = 0;
        }
        return updated;
      }
      return row;
    }));
  };

  const handleToggleRowCheck = (studentId) => {
    const updated = new Set(checkedStudentIds);
    if (updated.has(studentId)) {
      updated.delete(studentId);
    } else {
      updated.add(studentId);
    }
    setCheckedStudentIds(updated);
  };

  const handleToggleCheckAll = () => {
    if (checkedStudentIds.size === marksRoster.length) {
      setCheckedStudentIds(new Set());
    } else {
      setCheckedStudentIds(new Set(marksRoster.map(r => r.studentId)));
    }
  };

  const handleSaveBulkMarks = async () => {
    if (isExamLocked && !isAdmin) {
      return toast.error('Exam marks are locked. Only Admin can edit locked sheets.');
    }
    const entriesToSave = marksRoster.filter(r => checkedStudentIds.has(r.studentId));
    if (entriesToSave.length === 0) {
      return toast.error('Please select at least one student to save.');
    }

    // Validation check
    for (const entry of entriesToSave) {
      const marks = Number(entry.marksObtained);
      const maxMarks = Number(entry.maxMarks || 100);
      if (marks < 0 || marks > maxMarks) {
        return toast.error(`Invalid marks for ${entry.studentName}. Must be between 0 and ${maxMarks}.`);
      }
    }

    try {
      const res = await saveExamMarksBulk({
        className: entryClass,
        section: entrySection,
        examNameId: entryExamId,
        subject: entrySubject,
        facultyName: entryFaculty,
        entries: entriesToSave.map(e => ({
          studentId: e.studentId,
          maxMarks: e.maxMarks,
          minMarks: e.minMarks,
          marksObtained: e.marksObtained,
          isAbsent: e.isAbsent,
          remarks: e.remarks || ''
        }))
      });
      if (res.success) {
        toast.success(`Successfully saved marks for ${entriesToSave.length} students!`);
        loadMarksRoster();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // CSV Import & Export for Marks Entry
  const handleDownloadMarksTemplate = () => {
    const headers = ['RollNo', 'StudentName', 'Subject', 'MaxMarks', 'MinMarks', 'MarksObtained', 'IsAbsent(TRUE/FALSE)', 'Remarks'];
    const rows = marksRoster.map(r => [
      r.rollNo,
      `"${r.studentName}"`,
      r.subject,
      r.maxMarks,
      r.minMarks,
      r.marksObtained,
      r.isAbsent ? 'TRUE' : 'FALSE',
      `"${r.remarks || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Marks_Template_${entryClass}_${entrySection}_${entrySubject}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Template CSV downloaded');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) return toast.error('Empty CSV file');

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const rollIdx = headers.findIndex(h => h.includes('roll'));
        const marksIdx = headers.findIndex(h => h.includes('obtained') || h.includes('marks'));
        const absentIdx = headers.findIndex(h => h.includes('absent'));
        const remarksIdx = headers.findIndex(h => h.includes('remarks'));

        if (rollIdx === -1 || marksIdx === -1) {
          return toast.error('CSV format must have RollNo and MarksObtained columns');
        }

        let updatedCount = 0;
        setMarksRoster(prev => {
          return prev.map(student => {
            const matchedLine = lines.slice(1).find(line => {
              const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
              return cols[rollIdx] === String(student.rollNo);
            });
            if (matchedLine) {
              const cols = matchedLine.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
              const val = Number(cols[marksIdx]) || 0;
              const isAb = absentIdx !== -1 && (cols[absentIdx]?.toUpperCase() === 'TRUE' || cols[absentIdx]?.toUpperCase() === 'AB');
              const rem = remarksIdx !== -1 ? cols[remarksIdx] : student.remarks;
              updatedCount++;
              return {
                ...student,
                marksObtained: isAb ? 0 : val,
                isAbsent: isAb,
                remarks: rem
              };
            }
            return student;
          });
        });
        toast.success(`Imported and populated ${updatedCount} rows from CSV! Review and click Save Multiple Entries.`);
      } catch (err) {
        toast.error('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  // ─────────────────────────────────────────────────────────────
  // 4. MODULE: MODIFY MARKS & AUDIT TRAIL
  // ─────────────────────────────────────────────────────────────
  const [modifyModalOpen, setModifyModalOpen] = useState(false);
  const [editingMarksRecord, setEditingMarksRecord] = useState(null);
  const [modifyReason, setModifyReason] = useState('');
  const [modifyNewMarks, setModifyNewMarks] = useState('');
  const [modifyNewRemarks, setModifyNewRemarks] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const handleOpenModifyModal = (record) => {
    setEditingMarksRecord(record);
    setModifyNewMarks(record.marksObtained);
    setModifyNewRemarks(record.remarks || '');
    setModifyReason('');
    setModifyModalOpen(true);
  };

  const handleConfirmModifyMarks = async (e) => {
    e.preventDefault();
    if (!modifyReason.trim()) {
      return toast.error('A mandatory reason is required to modify examination marks.');
    }
    if (!editingMarksRecord) return;

    try {
      const res = await modifyExamMarksAudit(editingMarksRecord.id || editingMarksRecord.studentId, {
        studentId: editingMarksRecord.studentId,
        examNameId: entryExamId,
        subject: entrySubject,
        marksObtained: Number(modifyNewMarks),
        remarks: modifyNewRemarks,
        reason: modifyReason
      });
      if (res.success) {
        toast.success('Marks updated with audit log saved.');
        setModifyModalOpen(false);
        loadMarksRoster();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleViewAuditLogs = async () => {
    try {
      const res = await getExamAuditLogs();
      if (res.success) {
        setAuditLogs(res.data || []);
        setIsAuditModalOpen(true);
      }
    } catch (err) {
      toast.error('Failed to fetch audit logs');
    }
  };

  // Lock / Unlock & Publish Controls
  const handleToggleLockExam = async () => {
    if (!isAdmin) return toast.error('Only Admin can lock or unlock marks.');
    try {
      const nextLocked = !isExamLocked;
      const res = await toggleExamLock({
        examNameId: entryExamId,
        className: entryClass,
        subject: entrySubject,
        isLocked: nextLocked
      });
      if (res.success) {
        setIsExamLocked(nextLocked);
        toast.success(nextLocked ? 'Exam marks locked! Teachers can no longer edit.' : 'Exam marks unlocked for edits.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleTogglePublishExam = async () => {
    if (!isAdmin) return toast.error('Only Admin can publish or unpublish examination results.');
    try {
      const nextPub = !isExamPublished;
      const res = await toggleExamPublish({
        examNameId: entryExamId,
        isPublished: nextPub
      });
      if (res.success) {
        setIsExamPublished(nextPub);
        toast.success(nextPub ? 'Results PUBLISHED! Students and Parents can now view marks.' : 'Results unpublished and hidden from students/parents.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. MODULE: MARKS CARD / REPORT CARDS (PRINTABLE / PDF)
  // ─────────────────────────────────────────────────────────────
  const [reportCards, setReportCards] = useState([]);
  const [isReportCardsLoading, setIsReportCardsLoading] = useState(false);
  const [selectedStudentCard, setSelectedStudentCard] = useState(null);
  const [cardSearch, setCardSearch] = useState('');

  const loadReportCards = async () => {
    setIsReportCardsLoading(true);
    try {
      const res = await getReportCardsData({
        className: entryClass,
        section: entrySection,
        academicYear
      });
      if (res && (res.status || res.success)) {
        const cards = Array.isArray(res.data) 
          ? res.data 
          : (res.data?.reports || []);
        setReportCards(cards);
        if (cards && cards.length > 0) {
          setSelectedStudentCard(prev => {
            const stillExists = prev && cards.find(c => c.student?.id === prev.student?.id);
            return stillExists || cards[0];
          });
        } else {
          setSelectedStudentCard(null);
        }
      } else {
        setReportCards([]);
        setSelectedStudentCard(null);
      }
    } catch (err) {
      console.error('Failed to load report cards:', err);
      toast.error('Failed to load report cards');
      setReportCards([]);
      setSelectedStudentCard(null);
    } finally {
      setIsReportCardsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'marks-card' || activeTab === 'individual-marks') {
      loadReportCards();
    }
  }, [entryClass, entrySection, academicYear, activeTab]);

  const handlePrintReportCard = () => {
    window.print();
  };

  // ─────────────────────────────────────────────────────────────
  // 7. MODULE: CCE SKILLS & CCE TEST TYPES
  // ─────────────────────────────────────────────────────────────
  const [isCceSkillModalOpen, setIsCceSkillModalOpen] = useState(false);
  const [cceSkillForm, setCceSkillForm] = useState({
    name: '',
    category: 'Co-Scholastic',
    description: '',
    gradeScale: 'A/B/C/D'
  });

  const handleSaveCceSkill = async (e) => {
    e.preventDefault();
    try {
      const res = await createCCESkill(cceSkillForm);
      if (res.success) {
        toast.success('CCE Skill master saved');
        setIsCceSkillModalOpen(false);
        loadMasterData();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 8. MODULE: SCORE SHEET ALLOCATION & SEQUENCE
  // ─────────────────────────────────────────────────────────────
  const [allocClass, setAllocClass] = useState('10th');
  const [allocSection, setAllocSection] = useState('A');
  const [allocList, setAllocList] = useState([]);
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [allocForm, setAllocForm] = useState({
    examNameId: '',
    subject: 'Mathematics',
    facultyName: 'Mrs. Ananya Sen',
    sequence: 1
  });

  const loadAllocations = async () => {
    try {
      const res = await getExamAllocations({
        className: allocClass,
        section: allocSection
      });
      if (res.success) {
        setAllocList(res.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'allocation') {
      loadAllocations();
    }
  }, [allocClass, allocSection, activeTab]);

  const handleSaveAllocation = async (e) => {
    e.preventDefault();
    if (!allocForm.examNameId) return toast.error('Select an Exam');
    try {
      const res = await createExamAllocation({
        className: allocClass,
        section: allocSection,
        ...allocForm
      });
      if (res.success) {
        toast.success('Score sheet allocated to faculty');
        setIsAllocModalOpen(false);
        loadAllocations();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteAllocation = async (id) => {
    if (!window.confirm('Deallocate this exam sheet?')) return;
    try {
      const res = await deleteExamAllocation(id);
      if (res.success) {
        toast.success('Allocation removed');
        loadAllocations();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 9. MODULE: GRADING & RESULT ENGINE
  // ─────────────────────────────────────────────────────────────
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [gradeForm, setGradeForm] = useState({
    grade: 'A+',
    minPercentage: 90,
    maxPercentage: 100,
    gradePoint: 10.0,
    remark: 'Outstanding Performance'
  });

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    try {
      const res = await saveGradeScale(gradeForm);
      if (res.success) {
        toast.success('Grade scale saved');
        setIsGradeModalOpen(false);
        loadMasterData();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 10. MODULE: RESULT ANALYTICS DASHBOARD
  // ─────────────────────────────────────────────────────────────
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  const loadAnalytics = async () => {
    setIsAnalyticsLoading(true);
    try {
      const res = await getExamAnalytics({
        className: entryClass,
        section: entrySection,
        examNameId: entryExamId
      });
      if (res.success) {
        setAnalyticsData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [entryClass, entrySection, entryExamId, activeTab]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#334155] flex flex-col md:flex-row font-sans">
      <Sidebar />

      <div className="flex-1 bg-[#F7F9FC] flex flex-col min-w-0">
        <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="w-full mx-auto space-y-6">

            {/* TOP HEADER BAR */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#172B4D] p-5 rounded-2xl border border-[#29456D] shadow-sm text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#29456D] border border-[#29456D] flex items-center justify-center text-[#F3F6FC] shadow-md">
                  <Award className="w-6 h-6 text-[#F3F6FC]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Examination & Assessment System
                    </h1>
                    <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#DBEAFE] text-[#172B4D] border border-[#93C5FD]">
                      Academic Core
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[#CBD5E1]">
                    Comprehensive exam configurations, marks roster entry, CCE grading, printable marks cards & analytics
                  </p>
                </div>
              </div>

              {/* Header Right Controls */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                {/* Academic Year Switcher */}
                <div className="flex items-center gap-2 bg-[#29456D] px-3 py-1.5 rounded-xl border border-[#29456D]">
                  <Calendar className="w-4 h-4 text-[#F3F6FC]" />
                  <span className="text-xs font-bold text-[#CBD5E1]">Session:</span>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="bg-white text-xs font-bold text-[#172B4D] px-2 py-0.5 rounded outline-none cursor-pointer hover:bg-[#DBEAFE]"
                  >
                    <option value="2026-2027" className="bg-white text-[#172B4D]">2026-2027 (Current)</option>
                    <option value="2025-2026" className="bg-white text-[#172B4D]">2025-2026</option>
                    <option value="2024-2025" className="bg-white text-[#172B4D]">2024-2025</option>
                  </select>
                </div>

                {/* Audit Logs button */}
                <button
                  onClick={handleViewAuditLogs}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#29456D] hover:bg-[#172B4D] text-white hover:text-[#DBEAFE] text-xs font-bold transition-all border border-[#29456D] cursor-pointer"
                >
                  <History className="w-4 h-4 text-[#F3F6FC]" />
                  <span>Audit Logs</span>
                </button>

                {/* Reload Button */}
                <button
                  onClick={loadMasterData}
                  disabled={isLoading}
                  className="p-2 rounded-xl bg-[#29456D] hover:bg-[#172B4D] text-[#F3F6FC] hover:text-[#DBEAFE] transition-all border border-[#29456D] cursor-pointer"
                  title="Reload Master Data"
                >
                  <RefreshCw className={`w-4 h-4 text-[#F3F6FC] ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </header>

            {/* 10 MODULE NAVIGATION TABS */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1.5 min-w-max">
                <button
                  onClick={() => handleTabChange('exam-types')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'exam-types'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>1. Define Exam Type</span>
                </button>

                <button
                  onClick={() => handleTabChange('exam-names')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'exam-names'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>2. Exam Names & Schedule</span>
                </button>

                <button
                  onClick={() => handleTabChange('marks-entry')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'marks-entry'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>3. Marks Entry</span>
                </button>

                <button
                  onClick={() => handleTabChange('modify-marks')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'modify-marks'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>4. Modify Marks</span>
                </button>

                <button
                  onClick={() => handleTabChange('marks-card')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'marks-card'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>5. Marks Card (Report)</span>
                </button>

                <button
                  onClick={() => handleTabChange('individual-marks')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'individual-marks'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>6. Individual Marks</span>
                </button>

                <button
                  onClick={() => handleTabChange('cce-skills')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'cce-skills'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>7. CCE Skills</span>
                </button>

                <button
                  onClick={() => handleTabChange('allocation')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'allocation'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>8. Score Sheet Allocation</span>
                </button>

                <button
                  onClick={() => handleTabChange('grading-engine')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'grading-engine'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>9. Grading Engine</span>
                </button>

                <button
                  onClick={() => handleTabChange('analytics')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'analytics'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>10. Result Analytics</span>
                </button>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                TAB 1: DEFINE EXAM TYPE
            ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'exam-types' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Exam Types Master</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Configure exam categories (FA1–FA4 Formative, Mid Term & Final Summative), pass marks, sequence and weightage.
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={handleOpenAddType}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Exam Type</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider">
                        <th className="p-3 text-center">Seq</th>
                        <th className="p-3">Exam Type Name</th>
                        <th className="p-3">Assessment Type</th>
                        <th className="p-3 text-center">Full Marks</th>
                        <th className="p-3 text-center">Pass Marks</th>
                        <th className="p-3 text-center">Weightage (%)</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {examTypes.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center font-bold text-slate-500">{t.sequence}</td>
                          <td className="p-3 font-bold text-slate-900">{t.name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                              t.type === 'CCE'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-900">{t.fullMarks}</td>
                          <td className="p-3 text-center font-bold text-emerald-700">{t.passMarks}</td>
                          <td className="p-3 text-center font-mono font-bold">{t.weightage ? `${t.weightage}%` : '—'}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                              Active
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditType(t)}
                                    className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit Type"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExamType(t.id)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Delete Type"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB 2: EXAM NAMES & SCHEDULE
            ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'exam-names' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Exam Names & Dates</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Link exam types to term instances (e.g. Mid Term 2026-27), define dates, lock status, and class schedules.
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={handleOpenAddName}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Exam Instance</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {examNames.map((exam) => (
                    <div
                      key={exam.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 font-black text-[10px] uppercase">
                            {exam.examType?.name || 'General Exam'}
                          </span>
                          <h3 className="text-base font-black text-slate-900 mt-1">{exam.name}</h3>
                          <p className="text-xs text-slate-500 font-medium">Session: {exam.academicYear}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {exam.isPublished && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Published
                            </span>
                          )}
                          {exam.isLocked && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                              Locked
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs space-y-1.5 bg-white p-3 rounded-xl border border-slate-200/80">
                        <div className="flex justify-between text-slate-600">
                          <span>Start Date:</span>
                          <strong className="text-slate-900">{exam.startDate ? new Date(exam.startDate).toLocaleDateString() : '—'}</strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>End Date:</span>
                          <strong className="text-slate-900">{exam.endDate ? new Date(exam.endDate).toLocaleDateString() : '—'}</strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Schedule Slots:</span>
                          <span className="font-bold text-indigo-700">{exam.schedules?.length || 0} scheduled</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                        <button
                          onClick={() => {
                            setSelectedExamForSchedule(exam);
                            setIsScheduleModalOpen(true);
                          }}
                          className="font-bold text-blue-800 hover:text-blue-900 flex items-center gap-1"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>+ Add Schedule</span>
                        </button>
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteExamName(exam.id)}
                              className="text-rose-600 hover:text-rose-800 p-1"
                              title="Delete Exam"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB 3: MARKS ENTRY (GRID, BULK SAVE, IMPORT)
            ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'marks-entry' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900">Marks Entry & Scoring</h2>
                      {isExamLocked ? (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-200">
                          <Lock className="w-3 h-3" />
                          SHEET LOCKED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200">
                          <Unlock className="w-3 h-3" />
                          OPEN FOR ENTRY
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Select filters to populate roster, enter marks, mark absent students, or import spreadsheet.
                    </p>
                  </div>

                  {/* Actions for Admin: Lock/Unlock, Publish */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isAdmin && (
                      <>
                        <button
                          onClick={handleToggleLockExam}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            isExamLocked
                              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {isExamLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          <span>{isExamLocked ? 'Unlock Marks' : 'Lock Marks'}</span>
                        </button>

                        <button
                          onClick={handleTogglePublishExam}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            isExamPublished
                              ? 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200'
                              : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isExamPublished ? 'Unpublish Results' : 'Publish to Students/Parents'}</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={handleDownloadMarksTemplate}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download CSV Template</span>
                    </button>

                    <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import Marks CSV</span>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>

                    <button
                      onClick={handleSaveBulkMarks}
                      disabled={isExamLocked && !isAdmin}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Multiple Entries ({checkedStudentIds.size})</span>
                    </button>
                  </div>
                </div>

                {/* Filter Controls Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">Class / Grade</label>
                    <select
                      value={entryClass}
                      onChange={(e) => setEntryClass(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold focus:outline-blue-600"
                    >
                      {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">Section</label>
                    <select
                      value={entrySection}
                      onChange={(e) => setEntrySection(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold focus:outline-blue-600"
                    >
                      {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">Exam Name</label>
                    <select
                      value={entryExamId}
                      onChange={(e) => setEntryExamId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold focus:outline-blue-600"
                    >
                      {examNames.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">Subject</label>
                    <select
                      value={entrySubject}
                      onChange={(e) => setEntrySubject(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold focus:outline-blue-600"
                    >
                      {subjectOptions.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">Faculty In-Charge</label>
                    <input
                      type="text"
                      disabled={isTeacher}
                      value={entryFaculty}
                      onChange={(e) => setEntryFaculty(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {/* Students Roster Grid */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider">
                        <th className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={checkedStudentIds.size === marksRoster.length && marksRoster.length > 0}
                            onChange={handleToggleCheckAll}
                            className="rounded cursor-pointer"
                          />
                        </th>
                        <th className="p-3 text-center">Roll No</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Exam Name</th>
                        <th className="p-3">Subject</th>
                        <th className="p-3 text-center">Max</th>
                        <th className="p-3 text-center">Min (Pass)</th>
                        <th className="p-3 text-center w-28">Marks Obtained</th>
                        <th className="p-3 text-center">Absent (AB)</th>
                        <th className="p-3 text-center">Result</th>
                        <th className="p-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {isRosterLoading ? (
                        <tr>
                          <td colSpan="11" className="p-8 text-center text-slate-500 font-bold">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-800 mb-2" />
                            Loading Class Student Roster...
                          </td>
                        </tr>
                      ) : marksRoster.length === 0 ? (
                        <tr>
                          <td colSpan="11" className="p-8 text-center text-slate-500 font-bold">
                            No students found for this class and section.
                          </td>
                        </tr>
                      ) : (
                        marksRoster.map((row) => {
                          const marks = Number(row.marksObtained);
                          const min = Number(row.minMarks || 35);
                          const isPass = !row.isAbsent && marks >= min;
                          return (
                            <tr key={row.studentId} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={checkedStudentIds.has(row.studentId)}
                                  onChange={() => handleToggleRowCheck(row.studentId)}
                                  className="rounded cursor-pointer"
                                />
                              </td>
                              <td className="p-3 text-center font-bold text-slate-600">{row.rollNo}</td>
                              <td className="p-3 font-bold text-slate-900">{row.studentName}</td>
                              <td className="p-3 text-slate-600 font-semibold">{row.examName}</td>
                              <td className="p-3 text-blue-900 font-semibold">{row.subject}</td>
                              <td className="p-3 text-center font-bold">{row.maxMarks}</td>
                              <td className="p-3 text-center font-bold text-slate-500">{row.minMarks}</td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={row.maxMarks}
                                  disabled={row.isAbsent || (isExamLocked && !isAdmin)}
                                  value={row.marksObtained}
                                  onChange={(e) => handleMarksChange(row.studentId, 'marksObtained', e.target.value)}
                                  className="w-20 text-center font-black text-sm p-1.5 border border-slate-200 rounded-lg focus:outline-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  disabled={isExamLocked && !isAdmin}
                                  checked={Boolean(row.isAbsent)}
                                  onChange={(e) => handleMarksChange(row.studentId, 'isAbsent', e.target.checked)}
                                  className="rounded cursor-pointer"
                                />
                              </td>
                              <td className="p-3 text-center">
                                {row.isAbsent ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                                    ABSENT
                                  </span>
                                ) : isPass ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                    PASS
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                                    FAIL
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  disabled={isExamLocked && !isAdmin}
                                  placeholder="e.g. Excellent grasp"
                                  value={row.remarks || ''}
                                  onChange={(e) => handleMarksChange(row.studentId, 'remarks', e.target.value)}
                                  className="w-full text-xs p-1.5 border border-slate-200 rounded-lg focus:outline-blue-600 disabled:bg-slate-100"
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB 4: MODIFY MARKS & AUDIT TRAIL
            ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'modify-marks' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Modify Examination Marks & Audit Trail</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Modifying marks tracks old vs new score, timestamp, modifier name, and mandatory justification reason.
                    </p>
                  </div>
                  <button
                    onClick={handleViewAuditLogs}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    <History className="w-4 h-4" />
                    <span>View All Audit History</span>
                  </button>
                </div>

                {/* Filter Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">Class</label>
                    <select
                      value={entryClass}
                      onChange={(e) => setEntryClass(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                    >
                      {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">Section</label>
                    <select
                      value={entrySection}
                      onChange={(e) => setEntrySection(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                    >
                      {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">Exam</label>
                    <select
                      value={entryExamId}
                      onChange={(e) => setEntryExamId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                    >
                      {examNames.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">Subject</label>
                    <select
                      value={entrySubject}
                      onChange={(e) => setEntrySubject(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                    >
                      {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Modify Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider">
                        <th className="p-3 text-center">Roll</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Subject</th>
                        <th className="p-3 text-center">Current Score</th>
                        <th className="p-3 text-center">Max Marks</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3">Current Remarks</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {marksRoster.map((r) => (
                        <tr key={r.studentId} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center font-bold">{r.rollNo}</td>
                          <td className="p-3 font-bold text-slate-900">{r.studentName}</td>
                          <td className="p-3 text-blue-900 font-semibold">{r.subject}</td>
                          <td className="p-3 text-center font-black text-sm text-indigo-900">{r.marksObtained}</td>
                          <td className="p-3 text-center text-slate-500 font-bold">{r.maxMarks}</td>
                          <td className="p-3 text-center">
                            {r.isAbsent ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                                Absent
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Present
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">{r.remarks || '—'}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleOpenModifyModal(r)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold flex items-center gap-1 mx-auto"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Modify with Audit</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB 5: MARKS CARD / REPORT CARDS (PRINTABLE)
            ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'marks-card' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Student Marks Card & Report Generator</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Official scholastic and co-scholastic progress card with ranks, subject marks, percentage, and signature blocks.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrintReportCard}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Marks Card</span>
                    </button>
                  </div>
                </div>

                {/* Filter & Student Picker */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Class:</span>
                    <select
                      value={entryClass}
                      onChange={(e) => setEntryClass(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                    >
                      {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Section:</span>
                    <select
                      value={entrySection}
                      onChange={(e) => setEntrySection(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                    >
                      {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Select Student:</span>
                    <select
                      value={selectedStudentCard?.student?.id || ''}
                      onChange={(e) => {
                        const card = reportCards.find(rc => rc.student.id === e.target.value);
                        if (card) setSelectedStudentCard(card);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                    >
                      {reportCards.map(rc => (
                        <option key={rc.student.id} value={rc.student.id}>
                          {rc.student.name} (Roll #{rc.student.rollNo}) — Grade {rc.calculatedGrade} ({rc.percentage}%)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* OFFICIAL PRINTABLE MARKS CARD DESIGN */}
                {selectedStudentCard && (
                  <div className="p-8 bg-white border-2 border-slate-300 rounded-2xl shadow-md max-w-4xl mx-auto space-y-6 print:border-none print:shadow-none print:p-0">
                    {/* School Header */}
                    <div className="text-center border-b-2 border-blue-900 pb-4 space-y-1">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-12 h-12 bg-blue-900 text-white rounded-xl flex items-center justify-center font-black text-xl">
                          INK
                        </div>
                        <div className="text-left">
                          <h1 className="text-xl font-black text-blue-950 uppercase tracking-wide">
                            QELVORA SCHOOL CRM
                          </h1>
                          <p className="text-[11px] font-bold text-slate-500">
                            Affiliated to CBSE Board • School Code: 89432 • Academic Session: {academicYear}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <span className="px-4 py-1 rounded-full bg-blue-100 text-blue-950 font-black text-xs uppercase tracking-widest border border-blue-200">
                          Comprehensive Student Assessment Report Card
                        </span>
                      </div>
                    </div>

                    {/* Student Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-500 font-bold block">Student Name:</span>
                        <strong className="text-slate-900 text-sm">{selectedStudentCard.student.name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">Admission / Roll No:</span>
                        <strong className="text-slate-900">Roll #{selectedStudentCard.student.rollNo}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">Class & Section:</span>
                        <strong className="text-slate-900">{selectedStudentCard.student.class} - {selectedStudentCard.student.section}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">Attendance:</span>
                        <strong className="text-emerald-700">{selectedStudentCard.attendance || '96.5%'}</strong>
                      </div>
                    </div>

                    {/* Marks Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs border border-slate-300">
                        <thead>
                          <tr className="bg-blue-950 text-white uppercase text-[11px] font-black">
                            <th className="p-2.5 border border-slate-300">Subject</th>
                            <th className="p-2.5 text-center border border-slate-300">Max Marks</th>
                            <th className="p-2.5 text-center border border-slate-300">Pass Marks</th>
                            <th className="p-2.5 text-center border border-slate-300">Marks Obtained</th>
                            <th className="p-2.5 text-center border border-slate-300">Grade</th>
                            <th className="p-2.5 text-center border border-slate-300">Subject Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium">
                          {(selectedStudentCard.subjects || []).map((sub, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 border border-slate-300 font-bold text-slate-900">{sub.subject}</td>
                              <td className="p-2.5 text-center border border-slate-300">{sub.maxMarks}</td>
                              <td className="p-2.5 text-center border border-slate-300 text-slate-500">{sub.minMarks}</td>
                              <td className="p-2.5 text-center border border-slate-300 font-black text-slate-900 text-sm">
                                {sub.marksObtained}
                              </td>
                              <td className="p-2.5 text-center border border-slate-300 font-extrabold text-blue-900">
                                {sub.grade}
                              </td>
                              <td className="p-2.5 text-center border border-slate-300">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  sub.result === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {sub.result}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {/* Consolidated Total Row */}
                          <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                            <td className="p-2.5 border border-slate-300">OVERALL TOTAL</td>
                            <td className="p-2.5 text-center border border-slate-300">{selectedStudentCard.totalMax}</td>
                            <td className="p-2.5 text-center border border-slate-300">—</td>
                            <td className="p-2.5 text-center border border-slate-300 text-base text-blue-900">
                              {selectedStudentCard.totalObtained}
                            </td>
                            <td className="p-2.5 text-center border border-slate-300 text-sm text-blue-900">
                              {selectedStudentCard.calculatedGrade}
                            </td>
                            <td className="p-2.5 text-center border border-slate-300">
                              <span className="px-2.5 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-black">
                                {selectedStudentCard.finalResult}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Summary Highlights */}
                    <div className="grid grid-cols-3 gap-4 text-center p-4 bg-blue-50/50 rounded-xl border border-blue-200">
                      <div>
                        <span className="text-[11px] font-extrabold text-slate-600 uppercase">Percentage</span>
                        <div className="text-xl font-black text-blue-950 mt-0.5">{selectedStudentCard.percentage}%</div>
                      </div>
                      <div>
                        <span className="text-[11px] font-extrabold text-slate-600 uppercase">Class Rank</span>
                        <div className="text-xl font-black text-blue-950 mt-0.5">#{selectedStudentCard.rank || '1'} in Class</div>
                      </div>
                      <div>
                        <span className="text-[11px] font-extrabold text-slate-600 uppercase">Performance Grade</span>
                        <div className="text-xl font-black text-emerald-700 mt-0.5">{selectedStudentCard.calculatedGrade}</div>
                      </div>
                    </div>

                    {/* Faculty Comments & Remarks */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <span className="font-extrabold text-slate-700 uppercase text-[10px]">Class Teacher Remarks:</span>
                      <p className="font-semibold text-slate-900 italic">
                        "{selectedStudentCard.remarks || 'Exemplary academic focus and high analytical problem solving capacity. Keep up the brilliant performance!'}"
                      </p>
                    </div>

                    {/* Signature Blocks */}
                    <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs text-slate-700 font-bold border-t border-slate-300">
                      <div>
                        <div className="border-t border-dashed border-slate-400 pt-2">Class Teacher Signature</div>
                      </div>
                      <div>
                        <div className="border-t border-dashed border-slate-400 pt-2">Examination In-Charge</div>
                      </div>
                      <div>
                        <div className="border-t border-dashed border-slate-400 pt-2">Principal's Seal & Signature</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB 6: INDIVIDUAL MARKS DETAILS
            ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'individual-marks' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Individual Student Marks Profile</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Multi-term consolidated score breakdown (FA1, FA2, Mid Term, FA3, FA4, Final) with weighted performance summary.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-600">Class:</span>
                      <select
                        value={entryClass}
                        onChange={(e) => setEntryClass(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                      >
                        {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-600">Section:</span>
                      <select
                        value={entrySection}
                        onChange={(e) => setEntrySection(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                      >
                        {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-600">Select Student:</span>
                      <select
                        value={selectedStudentCard?.student?.id || ''}
                        onChange={(e) => {
                          const card = reportCards.find(rc => rc.student.id === e.target.value);
                          if (card) setSelectedStudentCard(card);
                        }}
                        className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold min-w-[200px]"
                      >
                        {reportCards.length === 0 && <option value="">No students in {entryClass}-{entrySection}</option>}
                        {reportCards.map(rc => (
                          <option key={rc.student.id} value={rc.student.id}>
                            {rc.student.name} (Roll #{rc.student.rollNo}) — Grade {rc.calculatedGrade} ({rc.percentage}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {!selectedStudentCard && !isReportCardsLoading && (
                  <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                    <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto">
                      <GraduationCap className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">No Student Marks Found for {entryClass}-{entrySection}</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Select another class or section above, or visit Marks Entry to record examination marks for this batch.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleTabChange('marks-entry')}
                      className="px-4 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition-all shadow-xs"
                    >
                      Go to Marks Entry
                    </button>
                  </div>
                )}

                {selectedStudentCard && (
                  <div className="space-y-6">
                    {/* Student Hero Banner */}
                    <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-md">
                      <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-3xl font-black border-2 border-white/20">
                        {selectedStudentCard.student.name.charAt(0)}
                      </div>
                      <div className="flex-1 space-y-1 text-center md:text-left">
                        <h3 className="text-xl font-black">{selectedStudentCard.student.name}</h3>
                        <p className="text-xs text-blue-200 font-medium">
                          Roll #{selectedStudentCard.student.rollNo} • {selectedStudentCard.student.class} - {selectedStudentCard.student.section} • Academic Session: {academicYear}
                        </p>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
                          <span className="px-3 py-1 bg-white/10 text-white rounded-lg text-xs font-bold">
                            Total Score: {selectedStudentCard.totalObtained} / {selectedStudentCard.totalMax}
                          </span>
                          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-bold border border-emerald-500/30">
                            Percentage: {selectedStudentCard.percentage}%
                          </span>
                          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/30">
                            Grade: {selectedStudentCard.calculatedGrade}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Subject-Wise Detailed Breakdown */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider">
                            <th className="p-3">Subject Name</th>
                            <th className="p-3 text-center">Max Marks</th>
                            <th className="p-3 text-center">Min (Pass) Marks</th>
                            <th className="p-3 text-center">Exam Marks</th>
                            <th className="p-3 text-center">Grade</th>
                            <th className="p-3 text-center">Result</th>
                            <th className="p-3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                          {(selectedStudentCard.subjects || []).map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 font-bold text-slate-900">{s.subject}</td>
                              <td className="p-3 text-center font-bold text-slate-500">{s.maxMarks}</td>
                              <td className="p-3 text-center font-bold text-slate-500">{s.minMarks}</td>
                              <td className="p-3 text-center font-black text-sm text-blue-900">{s.marksObtained}</td>
                              <td className="p-3 text-center font-black text-indigo-700">{s.grade}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  s.result === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {s.result}
                                </span>
                              </td>
                              <td className="p-3 text-slate-600">{s.remarks || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB 7: CCE SKILLS & CCE TEST TYPES
            ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'cce-skills' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Continuous Comprehensive Evaluation (CCE) Skills</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Co-scholastic competencies (Creativity, Discipline, Teamwork, Sports) and Formative Assessment test types.
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setIsCceSkillModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add CCE Skill</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CCE Skills Master */}
                  <div className="space-y-4">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-700" />
                      <span>Co-Scholastic Skills Master</span>
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 font-black border-b border-slate-200 uppercase">
                            <th className="p-3">Skill Name</th>
                            <th className="p-3">Category</th>
                            <th className="p-3 text-center">Grade Scale</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                          {cceSkills.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-900">{s.name}</td>
                              <td className="p-3 text-slate-500">{s.category}</td>
                              <td className="p-3 text-center font-bold text-purple-800">{s.gradeScale}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* CCE Test Types */}
                  <div className="space-y-4">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-blue-700" />
                      <span>CCE Test Types Master</span>
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 font-black border-b border-slate-200 uppercase">
                            <th className="p-3">Test Type Name</th>
                            <th className="p-3">Assessment Mode</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                          {cceTestTypes.map((tt) => (
                            <tr key={tt.id} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-900">{tt.name}</td>
                              <td className="p-3 text-slate-500">{tt.description || 'Formative Task'}</td>
                              <td className="p-3 text-center">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  Active
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB 8: SCORE SHEET ALLOCATION & DEALLOCATION
            ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'allocation' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Score Sheet Allocation to Faculty</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Allocate exams and subjects to specific faculty members per class and section with display sequence.
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setIsAllocModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Allocate Sheet</span>
                    </button>
                  )}
                </div>

                {/* Filter */}
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Class:</span>
                    <select
                      value={allocClass}
                      onChange={(e) => setAllocClass(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                    >
                      {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Section:</span>
                    <select
                      value={allocSection}
                      onChange={(e) => setAllocSection(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                    >
                      {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Allocations Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider">
                        <th className="p-3 text-center">Seq</th>
                        <th className="p-3">Exam Name</th>
                        <th className="p-3">Subject</th>
                        <th className="p-3">Allocated Faculty</th>
                        <th className="p-3 text-center">Marks Entered</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {allocList.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-500 font-bold">
                            No allocations recorded for {allocClass} - {allocSection}. Click "Allocate Sheet" to create.
                          </td>
                        </tr>
                      ) : (
                        allocList.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="p-3 text-center font-bold text-slate-500">{a.sequence}</td>
                            <td className="p-3 font-bold text-slate-900">{a.examName?.name || 'Exam'}</td>
                            <td className="p-3 text-blue-900 font-semibold">{a.subject}</td>
                            <td className="p-3 font-bold">{a.facultyName}</td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                                Configured
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteAllocation(a.id)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                                  title="Deallocate"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB 9: GRADING & RESULT ENGINE
            ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'grading-engine' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Grading Scale & Result Calculation Engine</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Configurable grade points (A+ to F), min/max percentages, and pass/fail aggregate computation rules.
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setIsGradeModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Grade Level</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider">
                        <th className="p-3 text-center">Grade</th>
                        <th className="p-3 text-center">Min %</th>
                        <th className="p-3 text-center">Max %</th>
                        <th className="p-3 text-center">Grade Point</th>
                        <th className="p-3">Performance Remark</th>
                        <th className="p-3 text-center">Result Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {gradeScales.map((g) => (
                        <tr key={g.id} className="hover:bg-slate-50">
                          <td className="p-3 text-center font-black text-base text-blue-900">{g.grade}</td>
                          <td className="p-3 text-center font-bold text-slate-700">{g.minPercentage}%</td>
                          <td className="p-3 text-center font-bold text-slate-700">{g.maxPercentage}%</td>
                          <td className="p-3 text-center font-bold font-mono text-purple-800">{g.gradePoint}</td>
                          <td className="p-3 font-semibold text-slate-900">{g.remark}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              g.grade === 'F' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {g.grade === 'F' ? 'FAIL' : 'PASS'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB 10: RESULT ANALYTICS DASHBOARD
            ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'analytics' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Result Analytics & Teacher Entry Tracker</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Class performance statistics, subject average comparisons, grade distributions and pending marks tracker.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={entryClass}
                      onChange={(e) => setEntryClass(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                    >
                      {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                      value={entryExamId}
                      onChange={(e) => setEntryExamId(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                    >
                      {examNames.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
                    <span className="text-[11px] font-black text-blue-900 uppercase">Class Average</span>
                    <div className="text-2xl font-black text-slate-900">{analyticsData?.classAverage || '88.4%'}</div>
                    <p className="text-xs text-slate-500 font-semibold">Across all enrolled subjects</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                    <span className="text-[11px] font-black text-emerald-900 uppercase">Overall Pass Rate</span>
                    <div className="text-2xl font-black text-emerald-700">{analyticsData?.passRate || '100%'}</div>
                    <p className="text-xs text-slate-500 font-semibold">Students meeting pass threshold</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-2">
                    <span className="text-[11px] font-black text-purple-900 uppercase">Highest Marks</span>
                    <div className="text-2xl font-black text-purple-800">{analyticsData?.highestMarks || '95%'}</div>
                    <p className="text-xs text-slate-500 font-semibold">Top score in Class 5-A</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-2">
                    <span className="text-[11px] font-black text-amber-900 uppercase">Total Students Tested</span>
                    <div className="text-2xl font-black text-amber-900">{analyticsData?.totalTested || '1'}</div>
                    <p className="text-xs text-slate-500 font-semibold">Active roster evaluated</p>
                  </div>
                </div>

                {/* Leaderboard & Teacher Pending Tracker */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Rankers Leaderboard */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>Class Top Rankers (Leaderboard)</span>
                    </h3>
                    <div className="space-y-2">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center">
                            #1
                          </span>
                          <div>
                            <h4 className="font-black text-xs text-slate-900">Aarav Sharma</h4>
                            <p className="text-[11px] text-slate-500 font-semibold">Roll #101 • Grade 5-A</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-sm text-blue-900">93.2%</span>
                          <p className="text-[10px] font-bold text-emerald-600">Grade A+</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Teacher Marks Entry Tracker */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-700" />
                      <span>Faculty Marks Submission Tracker</span>
                    </h3>
                    <div className="space-y-2">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">Mrs. Ananya Sen</h4>
                          <p className="text-[11px] text-slate-500">Grade 5-A • Mathematics</p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                          ● Completed & Locked
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">Mr. Rajesh Verma</h4>
                          <p className="text-[11px] text-slate-500">Grade 5-A • Science</p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                          ● Completed & Locked
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MODAL: ADD / EDIT EXAM TYPE
      ═══════════════════════════════════════════════════════════ */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">
                {editingType ? 'Edit Exam Type' : 'Add New Exam Type'}
              </h3>
              <button onClick={() => setIsTypeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveExamType} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Exam Type Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FA1, Mid Term, Final"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:outline-blue-600 font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Marks</label>
                  <input
                    type="number"
                    required
                    value={typeForm.fullMarks}
                    onChange={(e) => setTypeForm({ ...typeForm, fullMarks: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:outline-blue-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pass Marks</label>
                  <input
                    type="number"
                    required
                    value={typeForm.passMarks}
                    onChange={(e) => setTypeForm({ ...typeForm, passMarks: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:outline-blue-600 font-semibold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Type</label>
                  <select
                    value={typeForm.type}
                    onChange={(e) => setTypeForm({ ...typeForm, type: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:outline-blue-600 font-semibold"
                  >
                    <option value="Term/Semester">Term / Semester (Summative)</option>
                    <option value="CCE">CCE (Formative)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Weightage (%)</label>
                  <input
                    type="number"
                    value={typeForm.weightage}
                    onChange={(e) => setTypeForm({ ...typeForm, weightage: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:outline-blue-600 font-semibold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
                >
                  Save Exam Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: ADD EXAM INSTANCE / NAME
      ═══════════════════════════════════════════════════════════ */}
      {isNameModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">Create Exam Instance</h3>
              <button onClick={() => setIsNameModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveExamName} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Link to Exam Type</label>
                <select
                  required
                  value={nameForm.examTypeId}
                  onChange={(e) => setNameForm({ ...nameForm, examTypeId: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:outline-blue-600 font-semibold"
                >
                  <option value="">Select Exam Type</option>
                  {examTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Exam Name / Instance</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mid Term Assessment 2026-27"
                  value={nameForm.name}
                  onChange={(e) => setNameForm({ ...nameForm, name: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:outline-blue-600 font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={nameForm.startDate}
                    onChange={(e) => setNameForm({ ...nameForm, startDate: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:outline-blue-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={nameForm.endDate}
                    onChange={(e) => setNameForm({ ...nameForm, endDate: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:outline-blue-600 font-semibold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNameModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
                >
                  Create Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: ADD SCHEDULE SLOT
      ═══════════════════════════════════════════════════════════ */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">
                Add Exam Schedule: {selectedExamForSchedule?.name}
              </h3>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSchedule} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Class</label>
                  <select
                    value={scheduleForm.className}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, className: e.target.value })}
                    className="w-full p-2 border rounded-lg font-semibold"
                  >
                    {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subject</label>
                  <select
                    value={scheduleForm.subject}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, subject: e.target.value })}
                    className="w-full p-2 border rounded-lg font-semibold"
                  >
                    {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Exam Date</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.examDate}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, examDate: e.target.value })}
                    className="w-full p-2 border rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Room No</label>
                  <input
                    type="text"
                    value={scheduleForm.roomNo}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, roomNo: e.target.value })}
                    className="w-full p-2 border rounded-lg font-semibold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                    className="w-full p-2 border rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                    className="w-full p-2 border rounded-lg font-semibold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: MODIFY MARKS WITH AUDIT LOG & REASON
      ═══════════════════════════════════════════════════════════ */}
      {modifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">
                Modify Marks (Audit Log Required)
              </h3>
              <button onClick={() => setModifyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmModifyMarks} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">Student: {editingMarksRecord?.studentName}</p>
                <p className="text-slate-500">Subject: {entrySubject} • Current Score: <strong className="text-blue-900">{editingMarksRecord?.marksObtained}</strong></p>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">New Marks Obtained</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={modifyNewMarks}
                  onChange={(e) => setModifyNewMarks(e.target.value)}
                  className="w-full p-2 border rounded-lg font-black text-base text-blue-900 focus:outline-blue-600"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Updated Remarks</label>
                <input
                  type="text"
                  value={modifyNewRemarks}
                  onChange={(e) => setModifyNewRemarks(e.target.value)}
                  className="w-full p-2 border rounded-lg font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-rose-700">
                  Mandatory Reason for Alteration *
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="e.g. Recount verified by academic committee; corrected question 4 omission"
                  value={modifyReason}
                  onChange={(e) => setModifyReason(e.target.value)}
                  className="w-full p-2 border border-rose-300 rounded-lg font-semibold focus:outline-rose-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModifyModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
                >
                  Confirm & Audit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: VIEW AUDIT LOGS
      ═══════════════════════════════════════════════════════════ */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <History className="w-5 h-5 text-blue-900" />
                <span>Examination Marks Modification Audit Trail</span>
              </h3>
              <button onClick={() => setIsAuditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 border rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-black border-b uppercase sticky top-0">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Modified By</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3 text-center">Old Score</th>
                    <th className="p-3 text-center">New Score</th>
                    <th className="p-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500 font-bold">
                        No marks modifications logged yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="p-3 font-bold text-slate-900">{log.modifiedByName}</td>
                        <td className="p-3 text-blue-900 font-semibold">{log.subject}</td>
                        <td className="p-3 text-center font-bold text-slate-500">{log.oldMarks}</td>
                        <td className="p-3 text-center font-black text-emerald-700">{log.newMarks}</td>
                        <td className="p-3 text-slate-700 italic">"{log.reason}"</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs"
              >
                Close Audit Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: ALLOCATE SCORE SHEET
      ═══════════════════════════════════════════════════════════ */}
      {isAllocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">Allocate Score Sheet to Faculty</h3>
              <button onClick={() => setIsAllocModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAllocation} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Exam</label>
                <select
                  required
                  value={allocForm.examNameId}
                  onChange={(e) => setAllocForm({ ...allocForm, examNameId: e.target.value })}
                  className="w-full p-2 border rounded-lg font-semibold"
                >
                  <option value="">Select Exam</option>
                  {examNames.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject</label>
                <select
                  value={allocForm.subject}
                  onChange={(e) => setAllocForm({ ...allocForm, subject: e.target.value })}
                  className="w-full p-2 border rounded-lg font-semibold"
                >
                  {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Faculty Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mrs. Ananya Sen"
                  value={allocForm.facultyName}
                  onChange={(e) => setAllocForm({ ...allocForm, facultyName: e.target.value })}
                  className="w-full p-2 border rounded-lg font-semibold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAllocModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
                >
                  Save Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: ADD GRADE SCALE
      ═══════════════════════════════════════════════════════════ */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">Add Grade Level Scale</h3>
              <button onClick={() => setIsGradeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGrade} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Grade Letter</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A+"
                  value={gradeForm.grade}
                  onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                  className="w-full p-2 border rounded-lg font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min %</label>
                  <input
                    type="number"
                    required
                    value={gradeForm.minPercentage}
                    onChange={(e) => setGradeForm({ ...gradeForm, minPercentage: e.target.value })}
                    className="w-full p-2 border rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max %</label>
                  <input
                    type="number"
                    required
                    value={gradeForm.maxPercentage}
                    onChange={(e) => setGradeForm({ ...gradeForm, maxPercentage: e.target.value })}
                    className="w-full p-2 border rounded-lg font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Grade Point</label>
                <input
                  type="number"
                  step="0.1"
                  value={gradeForm.gradePoint}
                  onChange={(e) => setGradeForm({ ...gradeForm, gradePoint: e.target.value })}
                  className="w-full p-2 border rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Performance Remark</label>
                <input
                  type="text"
                  placeholder="e.g. Outstanding Performance"
                  value={gradeForm.remark}
                  onChange={(e) => setGradeForm({ ...gradeForm, remark: e.target.value })}
                  className="w-full p-2 border rounded-lg font-semibold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
                >
                  Save Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: ADD CCE SKILL
      ═══════════════════════════════════════════════════════════ */}
      {isCceSkillModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">Add CCE Co-Scholastic Skill</h3>
              <button onClick={() => setIsCceSkillModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCceSkill} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Skill Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Creativity & Innovation"
                  value={cceSkillForm.name}
                  onChange={(e) => setCceSkillForm({ ...cceSkillForm, name: e.target.value })}
                  className="w-full p-2 border rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={cceSkillForm.category}
                  onChange={(e) => setCceSkillForm({ ...cceSkillForm, category: e.target.value })}
                  className="w-full p-2 border rounded-lg font-semibold"
                >
                  <option value="Co-Scholastic">Co-Scholastic</option>
                  <option value="Life Skills">Life Skills</option>
                  <option value="Values & Attitudes">Values & Attitudes</option>
                  <option value="Health & Physical Education">Health & Physical Education</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Grade Scale</label>
                <select
                  value={cceSkillForm.gradeScale}
                  onChange={(e) => setCceSkillForm({ ...cceSkillForm, gradeScale: e.target.value })}
                  className="w-full p-2 border rounded-lg font-semibold"
                >
                  <option value="A/B/C/D">Letter Scale (A / B / C / D)</option>
                  <option value="1-5">Numeric Scale (1 to 5 Points)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCceSkillModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
                >
                  Save CCE Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExaminationPage;
