import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/ui/Sidebar';
import {
  GraduationCap,
  School,
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Mail,
  User,
  Users,
  Calendar,
  MapPin,
  HeartPulse,
  Bus,
  RefreshCw,
  Copy,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowRight,
  Sparkles,
  FileText,
  AlertTriangle,
  Building,
  ShieldAlert,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  MessageCircle
} from 'lucide-react';
import {
  getStudentsList,
  getSingleStudent,
  addStudent,
  updateStudent,
  deleteStudent,
  getNextAdmissionNumber,
  getClassesList,
  previewBulkUpload,
  commitBulkUpload,
  downloadBulkTemplate
} from '../services/studentService';

const formatToDDMMYYYY = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const STANDARDS_LIST = [
  'Nursery',
  'LKG',
  'UKG',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th'
];

const SECTIONS_LIST = ['A', 'B', 'C', 'D', 'E'];
const BLOOD_GROUPS = ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'];
const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS'];
const ACADEMIC_YEARS = ['2026-2027', '2025-2026', '2027-2028'];

export default function AcademicManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Main State ──
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);

  const dynamicStandardsList = useMemo(() => {
    const fromClasses = (classes || []).map(c => c.standard).filter(Boolean);
    return Array.from(new Set([...STANDARDS_LIST, ...fromClasses]));
  }, [classes]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2026-2027');

  // ── Filters & Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStandard, setSelectedStandard] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [selectedGender, setSelectedGender] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // ── Modals State ──
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState('add'); // 'add' | 'edit'
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [activeProfileTab, setActiveProfileTab] = useState('personal'); // 'personal'|'guardian'|'address'|'medical'|'services'

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkUploadScope, setBulkUploadScope] = useState('auto'); // 'auto' | 'specific'
  const [bulkTargetStandard, setBulkTargetStandard] = useState('1st');
  const [bulkTargetSection, setBulkTargetSection] = useState('A');
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkPreviewData, setBulkPreviewData] = useState(null);
  const [bulkFilePreview, setBulkFilePreview] = useState([]);
  const [bulkClassBreakdown, setBulkClassBreakdown] = useState({});
  const [bulkValidating, setBulkValidating] = useState(false);
  const [bulkCommitting, setBulkCommitting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [bulkSuccessResult, setBulkSuccessResult] = useState(null);
  const fileInputRef = useRef(null);

  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState(null);
  const [quickViewStudent, setQuickViewStudent] = useState(null);

  // ── Form State ──
  const defaultFormData = {
    name: '',
    admissionNumber: '',
    satsNumber: '',
    dob: '',
    gender: 'Male',
    standard: '1st',
    section: 'A',
    rollNumber: '',
    admissionDate: new Date().toISOString().split('T')[0],
    academicYear: '2026-2027',
    studentStatus: 'Active',
    bloodGroup: '',
    category: 'General',
    religion: '',
    motherTongue: '',
    nationality: 'Indian',
    parentName: '',
    fatherName: '',
    fatherOccupation: '',
    motherName: '',
    motherOccupation: '',
    guardianName: '',
    guardianRelation: '',
    parentPhone: '',
    parentWhatsapp: '',
    parentEmail: '',
    emergencyContact: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    previousSchool: '',
    previousClass: '',
    medicalNotes: '',
    allergies: '',
    transportRequired: false,
    transportRoute: '',
    hostelRequired: false,
    photoUrl: ''
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [formErrors, setFormErrors] = useState({});
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);

  // ── Fetch Initial Data ──
  const fetchData = async () => {
    setLoading(true);
    try {
      const [stdRes, clsRes] = await Promise.all([
        getStudentsList({ limit: 5000 }).catch(() => ({ data: [] })),
        getClassesList().catch(() => ({ data: [] }))
      ]);

      const rawList = Array.isArray(stdRes?.data) ? stdRes.data : Array.isArray(stdRes) ? stdRes : [];
      setStudents(rawList);

      const rawClasses = Array.isArray(clsRes?.data) ? clsRes.data : Array.isArray(clsRes) ? clsRes : [];
      setClasses(rawClasses);
    } catch (err) {
      toast.error('Failed to load students data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('bulk') === 'true') {
      handleOpenBulkModal();
    }
  }, [location.search]);

  // ── Sync auto-generated admission number on open 'add' modal ──
  const handleOpenAddModal = async () => {
    setProfileModalMode('add');
    setEditingStudentId(null);
    setActiveProfileTab('personal');
    setFormErrors({});
    setSameAsPhone(false);

    try {
      const res = await getNextAdmissionNumber();
      const nextAdm = res?.admissionNumber || `ADM-${new Date().getFullYear()}-00001`;
      setFormData({
        ...defaultFormData,
        admissionNumber: nextAdm,
        academicYear
      });
    } catch {
      setFormData({
        ...defaultFormData,
        admissionNumber: `ADM-${new Date().getFullYear()}-${String(students.length + 1).padStart(5, '0')}`,
        academicYear
      });
    }
    setProfileModalOpen(true);
  };

  // ── Open Edit Modal with full profile prefill ──
  const handleOpenEditModal = (student) => {
    setProfileModalMode('edit');
    setEditingStudentId(student.id || student._id || student.studentId);
    setActiveProfileTab('personal');
    setFormErrors({});
    setSameAsPhone(student.parentWhatsapp === student.parentPhone || student.parentWhatsapp === student.phone);

    setFormData({
      name: student.name || '',
      admissionNumber: student.studentId || student.admissionNumber || '',
      satsNumber: student.satsNumber || '',
      dob: student.dob || '',
      gender: student.gender || 'Male',
      standard: student.standard || '1st',
      section: (student.section || 'A').toUpperCase(),
      rollNumber: student.rollNumber || '',
      admissionDate: student.admissionDate || '',
      academicYear: student.academicYear || academicYear,
      studentStatus: student.studentStatus || (student.leftSchoolStatus ? 'Transferred' : 'Active'),
      bloodGroup: student.bloodGroup || '',
      category: student.category || 'General',
      religion: student.religion || '',
      motherTongue: student.motherTongue || '',
      nationality: student.nationality || 'Indian',
      parentName: student.parentName || '',
      fatherName: student.fatherName || '',
      fatherOccupation: student.fatherOccupation || '',
      motherName: student.motherName || '',
      motherOccupation: student.motherOccupation || '',
      guardianName: student.guardianName || '',
      guardianRelation: student.guardianRelation || '',
      parentPhone: student.parentPhone || student.phone || '',
      parentWhatsapp: student.parentWhatsapp || '',
      parentEmail: student.parentEmail || '',
      emergencyContact: student.emergencyContact || '',
      address: student.address || '',
      city: student.city || '',
      state: student.state || '',
      pincode: student.pincode || '',
      previousSchool: student.previousSchool || '',
      previousClass: student.previousClass || '',
      medicalNotes: student.medicalNotes || '',
      allergies: student.allergies || '',
      transportRequired: Boolean(student.transportRequired),
      transportRoute: student.transportRoute || '',
      hostelRequired: Boolean(student.hostelRequired),
      photoUrl: student.photoUrl || ''
    });

    setProfileModalOpen(true);
  };

  // ── Form Change Handler ──
  const handleFormChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'parentPhone' && sameAsPhone) {
        next.parentWhatsapp = value;
      }
      return next;
    });
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // ── Validation ──
  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Student Full Name is required';
    if (!formData.admissionNumber.trim()) errs.admissionNumber = 'Admission Number is required';
    if (!formData.dob) errs.dob = 'Date of Birth is required';
    if (!formData.standard) errs.standard = 'Class / Standard is required';
    if (!formData.section) errs.section = 'Section is required';
    
    // Guardian / Parent
    const hasParent = formData.parentName.trim() || formData.fatherName.trim() || formData.motherName.trim() || formData.guardianName.trim();
    if (!hasParent) errs.parentName = "At least one Parent or Guardian Name is required";

    // Phone validation (10 digits)
    const phoneClean = (formData.parentPhone || '').replace(/\D/g, '');
    if (!phoneClean) {
      errs.parentPhone = 'Parent Contact Number is required';
    } else if (phoneClean.length !== 10) {
      errs.parentPhone = 'Parent Phone must be exactly 10 digits';
    }

    if (formData.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) {
      errs.parentEmail = 'Invalid email address format';
    }

    if (formData.pincode && !/^\d{6}$/.test(formData.pincode.replace(/\D/g, ''))) {
      errs.pincode = 'Pin code must be 6 digits';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit Profile Save / Edit ──
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please resolve the highlighted errors');
      return;
    }

    setSavingStudent(true);
    try {
      const payload = {
        ...formData,
        parentPhone: formData.parentPhone.replace(/\D/g, '').slice(-10),
        parentWhatsapp: formData.parentWhatsapp ? formData.parentWhatsapp.replace(/\D/g, '').slice(-10) : '',
        pincode: formData.pincode ? formData.pincode.replace(/\D/g, '').slice(0, 6) : ''
      };

      if (profileModalMode === 'add') {
        const res = await addStudent(payload);
        toast.success(res?.message || 'Student admitted successfully');
      } else {
        const res = await updateStudent(editingStudentId, payload);
        toast.success(res?.message || 'Student profile updated successfully');
      }

      setProfileModalOpen(false);
      await fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Operation failed';
      toast.error(msg);
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      }
    } finally {
      setSavingStudent(false);
    }
  };

  // ── Delete Student ──
  const handleDeleteStudent = async () => {
    if (!deleteConfirmStudent) return;
    try {
      const targetId = deleteConfirmStudent.id || deleteConfirmStudent._id || deleteConfirmStudent.studentId;
      await deleteStudent(targetId);
      toast.success(`Student ${deleteConfirmStudent.name} deleted successfully`);
      setDeleteConfirmStudent(null);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove student record');
    }
  };

  // ── Bulk Upload Management (Multi-Class & Specific Class Modes) ──
  const handleOpenBulkModal = (prefillStandard = '', prefillSection = '') => {
    setBulkFile(null);
    setBulkPreviewData(null);
    setBulkFilePreview([]);
    setBulkClassBreakdown({});
    // Multi-Class Mode is the safe, default mode so file standard is preserved
    setBulkUploadScope('auto');
    const std = prefillStandard && prefillStandard !== 'ALL'
      ? prefillStandard
      : (selectedStandard && selectedStandard !== 'ALL' ? selectedStandard : (dynamicStandardsList[0] || '1st'));
    const sec = prefillSection && prefillSection !== 'ALL'
      ? prefillSection
      : (selectedSection && selectedSection !== 'ALL' ? selectedSection : 'A');

    setBulkTargetStandard(std);
    setBulkTargetSection(sec || 'A');
    setBulkModalOpen(true);
  };

  const handleDownloadTemplateFile = async (format = 'xlsx') => {
    setIsDownloadingTemplate(true);
    try {
      await downloadBulkTemplate(format);
      toast.success(`Sample template (${format.toUpperCase()}) downloaded!`);
    } catch (err) {
      toast.error('Failed to download template: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleBulkFileSelection = async (file) => {
    if (!file) return;
    setBulkFile(file);
    setBulkPreviewData(null);
    setBulkFilePreview([]);
    setBulkClassBreakdown({});

    // Robust field normalizer for client-side preview
    const cleanKey = (str) => String(str || '').toLowerCase().replace(/[\*\(\)\:\_\-\s\/\\\[\]]/g, '');
    const getVal = (rowObj, ...keys) => {
      const map = new Map();
      for (const [k, v] of Object.entries(rowObj || {})) {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          map.set(cleanKey(k), String(v).trim());
        }
      }
      for (const k of keys) {
        const ck = cleanKey(k);
        if (map.has(ck)) return map.get(ck);
      }
      for (const k of keys) {
        const ck = cleanKey(k);
        for (const [ek, ev] of map.entries()) {
          if (ek.includes(ck) || (ck.length > 3 && ck.includes(ek))) return ev;
        }
      }
      return '';
    };

    // 1. Immediate in-browser local preview using FileReader & XLSX
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target.result;
          const wb = XLSX.read(buffer, { type: 'array', dense: true });
          let targetSheetName = wb.SheetNames.find(s => ['student import', 'students_roster', 'students', 'student'].includes(s.trim().toLowerCase()));
          if (!targetSheetName) {
            targetSheetName = wb.SheetNames.find(s => !s.toLowerCase().includes('instruction')) || wb.SheetNames[0];
          }
          if (targetSheetName && wb.Sheets[targetSheetName]) {
            const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[targetSheetName], { defval: '' });
            
            const previewRows = rawRows.slice(0, 5).map(row => ({
              name: getVal(row, 'studentName', 'name', 'student_name', 'Student Name', 'Full Name') || '—',
              standard: getVal(row, 'classStandard', 'standard', 'class', 'Class Standard', 'Grade') || '—',
              section: (getVal(row, 'section', 'Section', 'sec') || 'A').toUpperCase(),
              rollNumber: getVal(row, 'rollNumber', 'roll_no', 'Roll No', 'Roll Number') || '—',
              parentPhone: getVal(row, 'parentPhone', 'phone', 'contact', 'Mobile', 'Parent Mobile') || '—'
            }));
            setBulkFilePreview(previewRows);

            const breakdown = {};
            rawRows.forEach(row => {
              const rawStd = getVal(row, 'classStandard', 'standard', 'class', 'Class Standard', 'Grade') || 'Unspecified';
              const rawSec = (getVal(row, 'section', 'Section', 'sec') || 'A').toUpperCase();
              const key = `${rawStd} - ${rawSec}`;
              breakdown[key] = (breakdown[key] || 0) + 1;
            });
            setBulkClassBreakdown(breakdown);
          }
        } catch (parseErr) {
          console.warn('Local preview parse error:', parseErr);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (_) {}

    // 2. Server validation
    setBulkValidating(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('scope', bulkUploadScope);
      if (bulkUploadScope === 'specific') {
        formData.append('standard', bulkTargetStandard);
        formData.append('section', bulkTargetSection);
      }
      const res = await previewBulkUpload(formData);
      if (res?.summary) {
        setBulkPreviewData(res.summary);
      }
    } catch (err) {
      console.warn('Server validation error:', err);
    } finally {
      setBulkValidating(false);
    }
  };

  const handleCommitBulkUpload = async () => {
    if (!bulkFile) {
      toast.error('Please select an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }
    setBulkCommitting(true);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      formData.append('scope', bulkUploadScope);
      if (bulkUploadScope === 'specific') {
        formData.append('standard', bulkTargetStandard);
        formData.append('section', bulkTargetSection);
      }
      const res = await commitBulkUpload(formData);
      if (res && (res.status || res.success)) {
        // Detailed Success Confirmation Modal
        setBulkSuccessResult({
          message: res.message || 'Bulk upload completed successfully!',
          totalProcessed: res.summary?.totalProcessed ?? (Number(res.summary?.created || 0) + Number(res.summary?.updated || 0)),
          created: res.summary?.created ?? 0,
          updated: res.summary?.updated ?? 0,
          failed: res.summary?.failed ?? 0,
          classesAffected: res.summary?.classesAffected || [],
          fileName: bulkFile.name
        });
        setBulkModalOpen(false);
        setBulkFile(null);
        setBulkPreviewData(null);
        setBulkFilePreview([]);
        setBulkClassBreakdown({});
        await fetchData();
      } else {
        toast.error(res?.message || 'Failed to ingest students');
      }
    } catch (err) {
      console.error('Commit bulk upload error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to ingest students');
    } finally {
      setBulkCommitting(false);
    }
  };

  // ── Export Filtered Roster to Excel ──
  const handleExportRoster = () => {
    if (filteredStudents.length === 0) {
      toast.error('No students matching current filter to export');
      return;
    }

    const exportRows = filteredStudents.map((s, idx) => ({
      'SL No': idx + 1,
      'Student Name': s.name,
      'Admission No': s.studentId || s.admissionNumber,
      'SATS Number': s.satsNumber || '',
      'Class': s.standard,
      'Section': s.section,
      'Roll No': s.rollNumber || '',
      'Gender': s.gender || '',
      'Date of Birth': s.dob || '',
      'Blood Group': s.bloodGroup || '',
      'Category': s.category || 'General',
      "Father's Name": s.fatherName || s.parentName || '',
      "Father's Occupation": s.fatherOccupation || '',
      "Mother's Name": s.motherName || '',
      'Parent Mobile': s.parentPhone || s.phone || '',
      'Parent WhatsApp': s.parentWhatsapp || '',
      'Parent Email': s.parentEmail || '',
      'Address': s.address || '',
      'City': s.city || '',
      'Pincode': s.pincode || '',
      'Status': s.studentStatus || (s.leftSchoolStatus ? 'Transferred' : 'Active'),
      'Transport': s.transportRequired ? 'Yes' : 'No',
      'Hostel': s.hostelRequired ? 'Yes' : 'No'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Roster');
    XLSX.writeFile(wb, `Student_Roster_${selectedStandard}_${selectedSection}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Roster exported successfully');
  };

  // ── Copy to Clipboard Helper ──
  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  // ── Filtered & Searched Students ──
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter(s => {
      // Academic year filter if present on record
      if (s.academicYear && academicYear && s.academicYear !== academicYear) {
        // optional soft filter
      }

      // Class / Standard filter
      if (selectedStandard !== 'ALL') {
        const normStd = String(s.standard || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetStd = selectedStandard.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normStd !== targetStd) return false;
      }

      // Section filter
      if (selectedSection !== 'ALL') {
        if ((s.section || '').toUpperCase() !== selectedSection.toUpperCase()) return false;
      }

      // Gender filter
      if (selectedGender !== 'ALL') {
        if ((s.gender || 'male').toLowerCase() !== selectedGender.toLowerCase()) return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL') {
        if ((s.category || 'general').toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        const isTransferred = s.studentStatus === 'Transferred' || Boolean(s.leftSchoolStatus);
        if (selectedStatus === 'Active' && isTransferred) return false;
        if (selectedStatus === 'Transferred' && !isTransferred) return false;
      }

      // Search query (Name, Roll, SATS, Admission No, Phone)
      if (q) {
        const nameMatch = (s.name || '').toLowerCase().includes(q);
        const admMatch = (s.studentId || s.admissionNumber || '').toLowerCase().includes(q);
        const satsMatch = (s.satsNumber || '').toLowerCase().includes(q);
        const rollMatch = (s.rollNumber || '').toLowerCase().includes(q);
        const phoneMatch = (s.parentPhone || s.phone || '').includes(q);
        const parentMatch = (s.parentName || s.fatherName || s.motherName || '').toLowerCase().includes(q);

        if (!nameMatch && !admMatch && !satsMatch && !rollMatch && !phoneMatch && !parentMatch) {
          return false;
        }
      }

      return true;
    });
  }, [students, searchQuery, selectedStandard, selectedSection, selectedGender, selectedCategory, selectedStatus, academicYear]);

  // ── Dynamic Class Stats ──
  const classBreakdownMap = useMemo(() => {
    const map = new Map();
    students.forEach(s => {
      const std = s.standard || 'Unknown';
      map.set(std, (map.get(std) || 0) + 1);
    });
    return map;
  }, [students]);

  const satsRegisteredCount = useMemo(() => {
    return students.filter(s => s.satsNumber && String(s.satsNumber).trim().length > 0).length;
  }, [students]);

  const boysCount = useMemo(() => {
    return students.filter(s => (s.gender || 'male').toLowerCase().startsWith('m')).length;
  }, [students]);

  const girlsCount = useMemo(() => {
    return students.filter(s => (s.gender || '').toLowerCase().startsWith('f')).length;
  }, [students]);

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[#F5F8FC] font-sans text-[#253858] antialiased">
      {/* ── Platform Sidebar ── */}
      <Sidebar />

      {/* ── Main Content Container (Independently Scrollable) ── */}
      <div className="flex-1 h-screen overflow-y-auto overflow-x-hidden flex flex-col min-w-0 pb-28 md:pb-16">
        
        {/* ── Header Bar ── */}
        <header className="bg-[#203B61] text-white px-4 sm:px-6 py-4 sm:py-5 border-b border-[#2D4D77] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#2D4D77] text-white flex items-center justify-center shadow-xs shrink-0 border border-[#3A5F8F]">
              <School className="w-6 h-6 text-[#93C5FD]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Academic Management & Student Records
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#DCEBFA] text-[#244B78] border border-[#BBD7F5]">
                  CBSE / SATS Integrated
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100/90 font-normal mt-0.5">
                Class & section rosters, real-time profile editing, SATS search, and bulk template ingestion.
              </p>
            </div>
          </div>

          {/* Academic Session Selector & Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* Session Selector */}
            <div className="flex items-center gap-1.5 bg-[#2D4D77] px-3 py-2 rounded-xl border border-[#3A5F8F] text-xs font-semibold text-white shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-blue-200" />
              <span className="text-[11px] text-blue-100 font-medium uppercase tracking-wider">Session:</span>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1"
                title="Select Academic Session"
              >
                {ACADEMIC_YEARS.map(yr => (
                  <option key={yr} value={yr} className="text-slate-900 bg-white font-medium">{yr}</option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchData()}
              disabled={loading}
              title="Refresh Roster Data"
              className="p-2.5 rounded-xl bg-[#2D4D77] hover:bg-[#385B8A] active:scale-95 text-blue-100 hover:text-white border border-[#3A5F8F] transition-all cursor-pointer shadow-2xs"
              aria-label="Refresh Roster"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Download Template */}
            <button
              onClick={() => downloadBulkTemplate('xlsx')}
              title="Download Excel Ingestion Template"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2D4D77] hover:bg-[#385B8A] active:scale-95 text-blue-100 hover:text-white border border-[#3A5F8F] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-blue-200" />
              <span>Template</span>
            </button>

            {/* Bulk Upload Button */}
            <button
              onClick={() => handleOpenBulkModal()}
              title="Bulk Ingest Student Admissions via Excel"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#20A779] hover:bg-[#1A8E67] active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Upload</span>
            </button>

            {/* New Admission Button */}
            <button
              onClick={handleOpenAddModal}
              title="Register a New Student"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3978D5] hover:bg-[#2D64B5] active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Admission</span>
            </button>
          </div>
        </header>

        {/* ── Main Content Body ── */}
        <div className="p-4 sm:p-6 space-y-5">
          
          {/* ── KPI Summary Cards (4 Cards) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
            
            {/* 1. Total Enrolled */}
            <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-[#E6ECF3] shadow-[0_2px_8px_rgba(32,59,97,0.04)] flex items-center justify-between transition-all hover:border-[#DCEBFA]">
              <div>
                <p className="text-[11px] font-bold text-[#718096] uppercase tracking-wider">Total Enrolled</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#253858] tracking-tight mt-0.5">{students.length}</h3>
                <p className="text-[11px] text-[#20A779] font-bold mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#20A779]"></span>
                  <span>Active Academic Roster</span>
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-[#DCEBFA] text-[#244B78] flex items-center justify-center shrink-0 shadow-2xs">
                <GraduationCap className="w-6 h-6" />
              </div>
            </div>

            {/* 2. Gender Ratio */}
            <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-[#E6ECF3] shadow-[0_2px_8px_rgba(32,59,97,0.04)] flex items-center justify-between transition-all hover:border-[#DCEBFA]">
              <div>
                <p className="text-[11px] font-bold text-[#718096] uppercase tracking-wider">Gender Ratio</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#3978D5]">{boysCount} <span className="text-xs font-semibold text-[#718096]">Boys</span></span>
                  <span className="text-[#CBD5E1]">/</span>
                  <span className="text-xl sm:text-2xl font-extrabold text-pink-600">{girlsCount} <span className="text-xs font-semibold text-[#718096]">Girls</span></span>
                </div>
                <p className="text-[11px] text-[#718096] font-medium mt-0.5">Balanced Cohort</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* 3. SATS Tracking */}
            <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-[#E6ECF3] shadow-[0_2px_8px_rgba(32,59,97,0.04)] flex items-center justify-between transition-all hover:border-[#DCEBFA]">
              <div>
                <p className="text-[11px] font-bold text-[#718096] uppercase tracking-wider">SATS Tracking</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-purple-700 tracking-tight mt-0.5">{satsRegisteredCount}</h3>
                <p className="text-[11px] text-purple-600 font-bold mt-0.5">
                  {students.length > 0 ? `${Math.round((satsRegisteredCount / students.length) * 100)}% Registered` : '0%'}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Building className="w-6 h-6" />
              </div>
            </div>

            {/* 4. Classes & Sections */}
            <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-[#E6ECF3] shadow-[0_2px_8px_rgba(32,59,97,0.04)] flex items-center justify-between transition-all hover:border-[#DCEBFA]">
              <div>
                <p className="text-[11px] font-bold text-[#718096] uppercase tracking-wider">Classes & Sections</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-indigo-700 tracking-tight mt-0.5">
                  {classes.length > 0 ? classes.length : classBreakdownMap.size}
                </h3>
                <p className="text-[11px] text-indigo-600 font-bold mt-0.5">Active Classrooms</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Layers className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* ── Class & Section Selector Bar ── */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E6ECF3] shadow-[0_2px_8px_rgba(32,59,97,0.04)] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-[#253858] uppercase tracking-wider flex items-center gap-2">
                <School className="w-4 h-4 text-[#3978D5]" />
                <span>Select Class Standard:</span>
              </span>
              <span className="text-xs font-semibold text-[#718096]">
                Showing <strong className="text-[#253858] font-bold">{filteredStudents.length}</strong> of {students.length} students
              </span>
            </div>

            {/* Standard Pills (Smooth Horizontal Touch Scroll) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin touch-pan-x">
              <button
                type="button"
                onClick={() => { setSelectedStandard('ALL'); setSelectedSection('ALL'); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                  selectedStandard === 'ALL'
                    ? 'bg-[#203B61] text-white border-[#203B61] shadow-xs'
                    : 'bg-white text-[#253858] border-[#E6ECF3] hover:bg-[#F5F8FC] hover:border-[#DCEBFA]'
                }`}
              >
                All Classes ({students.length})
              </button>

              {dynamicStandardsList.map(std => {
                const count = classBreakdownMap.get(std) || 0;
                const isSelected = selectedStandard === std;
                return (
                  <button
                    key={std}
                    type="button"
                    onClick={() => {
                      setSelectedStandard(std);
                      setSelectedSection('ALL');
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-[#203B61] text-white border-[#203B61] shadow-xs'
                        : 'bg-white text-[#253858] border-[#E6ECF3] hover:bg-[#F5F8FC] hover:border-[#DCEBFA]'
                    }`}
                  >
                    <span>{std}</span>
                    {count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-[#2D4D77] text-white' : 'bg-[#F5F8FC] text-[#718096] border border-[#E6ECF3]'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Section Pills (Visible when a specific class is selected) */}
            {selectedStandard !== 'ALL' && (
              <div className="pt-3 border-t border-[#E6ECF3] flex items-center gap-2 overflow-x-auto touch-pan-x">
                <span className="text-[11px] font-bold text-[#718096] uppercase tracking-wider shrink-0">
                  Section:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSection('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    selectedSection === 'ALL'
                      ? 'bg-[#3978D5] text-white border-[#3978D5] shadow-2xs'
                      : 'bg-white text-[#253858] border-[#E6ECF3] hover:bg-[#F5F8FC]'
                  }`}
                >
                  All Sections
                </button>
                {SECTIONS_LIST.map(sec => {
                  const secCount = students.filter(s => {
                    const stdMatch = (s.standard || '').toLowerCase().replace(/[^a-z0-9]/g, '') === selectedStandard.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return stdMatch && (s.section || '').toUpperCase() === sec;
                  }).length;
                  const isSelected = selectedSection === sec;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setSelectedSection(sec)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-[#3978D5] text-white border-[#3978D5] shadow-2xs'
                          : 'bg-white text-[#253858] border-[#E6ECF3] hover:bg-[#F5F8FC]'
                      }`}
                    >
                      <span>Section {sec}</span>
                      {secCount > 0 && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? 'bg-[#2D64B5] text-white' : 'bg-[#F5F8FC] text-[#718096] border border-[#E6ECF3]'
                        }`}>
                          {secCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Search & Filter Controls ── */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E6ECF3] shadow-[0_2px_8px_rgba(32,59,97,0.04)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#718096] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student name, roll number, SATS ID, admission no, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-[#F5F8FC] border border-[#E6ECF3] rounded-xl text-xs font-medium text-[#253858] placeholder:text-[#718096] focus:outline-none focus:bg-white focus:border-[#3978D5] focus:ring-2 focus:ring-[#DCEBFA] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  title="Clear Search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#253858] p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns and Actions */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2">
              {/* Gender */}
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="px-3 py-2 bg-[#F5F8FC] border border-[#E6ECF3] rounded-xl text-xs font-semibold text-[#253858] focus:outline-none focus:bg-white focus:border-[#3978D5] cursor-pointer"
                title="Filter by Gender"
              >
                <option value="ALL">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>

              {/* Category */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-[#F5F8FC] border border-[#E6ECF3] rounded-xl text-xs font-semibold text-[#253858] focus:outline-none focus:bg-white focus:border-[#3978D5] cursor-pointer"
                title="Filter by Category"
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Status */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-[#F5F8FC] border border-[#E6ECF3] rounded-xl text-xs font-semibold text-[#253858] focus:outline-none focus:bg-white focus:border-[#3978D5] cursor-pointer"
                title="Filter by Enrollment Status"
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active</option>
                <option value="Transferred">Transferred</option>
              </select>

              {/* Export XLSX Button */}
              <button
                type="button"
                onClick={handleExportRoster}
                title="Export Filtered Roster to Excel"
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F5F8FC] text-[#253858] border border-[#E6ECF3] rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#20A779]" />
                <span>Export</span>
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-[#F5F8FC] p-1 rounded-xl border border-[#E6ECF3]">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Table View (Desktop/Tablet)"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white shadow-2xs text-[#3978D5] font-bold' : 'text-[#718096] hover:text-[#253858]'}`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Card Grid View"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow-2xs text-[#3978D5] font-bold' : 'text-[#718096] hover:text-[#253858]'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

          </div>

          {/* ── Student Roster Content ── */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-[#E6ECF3] p-12 text-center flex flex-col items-center justify-center gap-3 shadow-2xs">
              <div className="w-9 h-9 border-3 border-[#3978D5] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-[#718096]">Loading student rosters...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E6ECF3] p-12 sm:p-14 text-center flex flex-col items-center justify-center gap-3.5 shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-[#DCEBFA] text-[#244B78] flex items-center justify-center shadow-xs">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#253858]">No student records found</h3>
              <p className="text-xs text-[#718096] max-w-sm">
                No students match your current search query or class filters. Try resetting filters or register a new student.
              </p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-2 px-4 py-2.5 bg-[#3978D5] hover:bg-[#2D64B5] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                + New Student Admission
              </button>
            </div>
          ) : viewMode === 'table' ? (
            <>
              {/* ── Desktop & Tablet Table View (hidden on mobile < md) ── */}
              <div className="hidden md:block bg-white rounded-2xl border border-[#E6ECF3] shadow-[0_2px_8px_rgba(32,59,97,0.04)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F5F8FC] border-b border-[#E6ECF3] text-[#718096] uppercase text-[10px] font-bold tracking-wider">
                        <th className="py-3.5 px-4">Student</th>
                        <th className="py-3.5 px-3">Admission No</th>
                        <th className="py-3.5 px-3">SATS Number</th>
                        <th className="py-3.5 px-3">Class & Sec</th>
                        <th className="py-3.5 px-3">Roll No</th>
                        <th className="py-3.5 px-3">Parent / Guardian</th>
                        <th className="py-3.5 px-3">Contact</th>
                        <th className="py-3.5 px-3">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6ECF3]/70">
                      {filteredStudents.map((student) => {
                        const isTransferred = student.studentStatus === 'Transferred' || Boolean(student.leftSchoolStatus);
                        return (
                          <tr
                            key={student.id || student._id || student.studentId}
                            className="hover:bg-[#F5F8FC]/80 transition-colors group"
                          >
                            {/* Student Name & Avatar */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#203B61] to-[#3978D5] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                  {student.photoUrl ? (
                                    <img src={student.photoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                                  ) : (
                                    student.name?.charAt(0).toUpperCase() || 'S'
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-[#253858] group-hover:text-[#3978D5] transition-colors flex items-center gap-1.5">
                                    <span className="truncate">{student.name}</span>
                                    {student.bloodGroup && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-50 text-[#E35D6A] font-bold border border-rose-200">
                                        {student.bloodGroup}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-[#718096] flex items-center gap-1 mt-0.5">
                                    <span>{student.gender || 'Male'}</span>
                                    <span>•</span>
                                    <span>{student.category || 'General'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Admission No */}
                            <td className="py-3 px-3">
                              <span className="font-mono text-xs font-semibold text-[#253858]">
                                {student.studentId || student.admissionNumber || '—'}
                              </span>
                            </td>

                            {/* SATS Number */}
                            <td className="py-3 px-3">
                              {student.satsNumber ? (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-mono text-[11px] font-bold border border-purple-100">
                                  <span>{student.satsNumber}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(student.satsNumber, 'SATS Number')}
                                    title="Copy SATS ID to Clipboard"
                                    className="text-purple-400 hover:text-purple-700 cursor-pointer"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[#718096] italic text-[11px]">Not assigned</span>
                              )}
                            </td>

                            {/* Class & Section */}
                            <td className="py-3 px-3">
                              <span className="px-2.5 py-1 rounded-lg bg-[#DCEBFA] text-[#244B78] font-bold text-xs border border-[#BBD7F5]">
                                {student.standard} - {student.section}
                              </span>
                            </td>

                            {/* Roll No */}
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded bg-[#F5F8FC] font-mono text-xs font-semibold text-[#253858] border border-[#E6ECF3]">
                                {student.rollNumber ? `#${student.rollNumber}` : '—'}
                              </span>
                            </td>

                            {/* Parent */}
                            <td className="py-3 px-3">
                              <div className="text-[#253858] font-semibold truncate max-w-[150px]">
                                {student.fatherName || student.parentName || student.motherName || '—'}
                              </div>
                              {student.fatherOccupation && (
                                <div className="text-[10px] text-[#718096] truncate max-w-[150px]">
                                  {student.fatherOccupation}
                                </div>
                              )}
                            </td>

                            {/* Contact & WhatsApp */}
                            <td className="py-3 px-3">
                              {student.parentPhone || student.phone ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-semibold text-[#253858]">
                                    {student.parentPhone || student.phone}
                                  </span>
                                  <a
                                    href={`https://wa.me/91${(student.parentWhatsapp || student.parentPhone || student.phone).replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Chat with Parent on WhatsApp"
                                    className="text-[#20A779] hover:text-emerald-700 cursor-pointer"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-[#718096]">—</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1.5 ${
                                isTransferred
                                  ? 'bg-amber-50 text-[#E9A23B] border border-amber-200'
                                  : 'bg-emerald-50 text-[#20A779] border border-emerald-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isTransferred ? 'bg-[#E9A23B]' : 'bg-[#20A779]'}`}></span>
                                <span>{isTransferred ? 'Transferred' : 'Active'}</span>
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setQuickViewStudent(student)}
                                  title="Quick View Student Profile"
                                  className="p-1.5 rounded-lg text-[#718096] hover:text-[#244B78] hover:bg-[#DCEBFA] transition-all cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(student)}
                                  title="Edit Full Profile"
                                  className="p-1.5 rounded-lg text-[#718096] hover:text-[#3978D5] hover:bg-blue-50 transition-all cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmStudent(student)}
                                  title="Remove Student Record"
                                  className="p-1.5 rounded-lg text-[#718096] hover:text-[#E35D6A] hover:bg-rose-50 transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Mobile Responsive Cards (< md) ── */}
              <div className="block md:hidden space-y-3">
                {filteredStudents.map((student) => {
                  const isTransferred = student.studentStatus === 'Transferred' || Boolean(student.leftSchoolStatus);
                  return (
                    <div
                      key={student.id || student._id || student.studentId}
                      className="bg-white rounded-2xl border border-[#E6ECF3] p-4 shadow-[0_2px_8px_rgba(32,59,97,0.04)] space-y-3"
                    >
                      {/* Top Header Row */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#203B61] to-[#3978D5] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              student.name?.charAt(0).toUpperCase() || 'S'
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-[#253858] text-sm truncate">{student.name}</h4>
                            <p className="text-[11px] font-mono text-[#718096] font-semibold">
                              {student.studentId || student.admissionNumber}
                            </p>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 inline-flex items-center gap-1 ${
                          isTransferred ? 'bg-amber-50 text-[#E9A23B] border border-amber-200' : 'bg-emerald-50 text-[#20A779] border border-emerald-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isTransferred ? 'bg-[#E9A23B]' : 'bg-[#20A779]'}`}></span>
                          <span>{isTransferred ? 'Transferred' : 'Active'}</span>
                        </span>
                      </div>

                      {/* Detail Pill Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-[#F5F8FC] p-3 rounded-xl border border-[#E6ECF3]">
                        <div>
                          <span className="text-[10px] text-[#718096] font-bold uppercase block">Class & Sec</span>
                          <span className="font-bold text-[#244B78]">Class {student.standard} - {student.section}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#718096] font-bold uppercase block">Roll Number</span>
                          <span className="font-mono font-bold text-[#253858]">{student.rollNumber ? `#${student.rollNumber}` : '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#718096] font-bold uppercase block">SATS ID</span>
                          <span className="font-mono font-bold text-purple-700">{student.satsNumber || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#718096] font-bold uppercase block">Parent Phone</span>
                          <span className="font-mono font-semibold text-[#253858] flex items-center gap-1">
                            <span>{student.parentPhone || student.phone || '—'}</span>
                            {(student.parentWhatsapp || student.parentPhone || student.phone) && (
                              <a
                                href={`https://wa.me/91${(student.parentWhatsapp || student.parentPhone || student.phone).replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Chat on WhatsApp"
                                className="text-[#20A779]"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </a>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-[#E6ECF3] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setQuickViewStudent(student)}
                          className="px-3 py-1.5 bg-[#F5F8FC] hover:bg-[#E6ECF3] text-[#253858] text-xs font-semibold rounded-lg border border-[#E6ECF3] transition-all cursor-pointer"
                        >
                          Quick View
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(student)}
                            className="px-3 py-1.5 bg-[#DCEBFA] hover:bg-[#C9E0F7] text-[#244B78] text-xs font-bold rounded-lg border border-[#BBD7F5] flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmStudent(student)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-[#E35D6A] rounded-lg border border-rose-200 transition-all cursor-pointer"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* ── Card Grid View (Custom Toggle) ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredStudents.map((student) => {
                const isTransferred = student.studentStatus === 'Transferred' || Boolean(student.leftSchoolStatus);
                return (
                  <div
                    key={student.id || student._id || student.studentId}
                    className="bg-white rounded-2xl border border-[#E6ECF3] p-4.5 shadow-[0_2px_8px_rgba(32,59,97,0.04)] hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Class & Status */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#DCEBFA] text-[#244B78] font-bold text-xs border border-[#BBD7F5]">
                          {student.standard} - {student.section}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                          isTransferred ? 'bg-amber-50 text-[#E9A23B] border border-amber-200' : 'bg-emerald-50 text-[#20A779] border border-emerald-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isTransferred ? 'bg-[#E9A23B]' : 'bg-[#20A779]'}`}></span>
                          <span>{isTransferred ? 'Transferred' : 'Active'}</span>
                        </span>
                      </div>

                      {/* Student Info */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#203B61] to-[#3978D5] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                          {student.photoUrl ? (
                            <img src={student.photoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            student.name?.charAt(0).toUpperCase() || 'S'
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-[#253858] text-sm truncate">{student.name}</h4>
                          <p className="text-[11px] font-mono text-[#718096] font-semibold">
                            {student.studentId || student.admissionNumber}
                          </p>
                        </div>
                      </div>

                      {/* SATS & Roll Details */}
                      <div className="mt-3.5 space-y-1.5 text-xs bg-[#F5F8FC] p-2.5 rounded-xl border border-[#E6ECF3]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#718096] font-bold uppercase">SATS ID:</span>
                          <span className="font-mono font-bold text-purple-700 text-[11px]">
                            {student.satsNumber || '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#718096] font-bold uppercase">Roll No:</span>
                          <span className="font-mono font-bold text-[#253858]">
                            {student.rollNumber ? `#${student.rollNumber}` : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#718096] font-bold uppercase">Parent:</span>
                          <span className="font-semibold text-[#253858] truncate max-w-[130px]">
                            {student.fatherName || student.parentName || '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#718096] font-bold uppercase">Phone:</span>
                          <span className="font-mono font-bold text-[#253858]">
                            {student.parentPhone || student.phone || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-[#E6ECF3] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setQuickViewStudent(student)}
                        className="text-xs font-semibold text-[#718096] hover:text-[#253858] cursor-pointer"
                      >
                        Quick View
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(student)}
                          className="px-2.5 py-1 bg-[#DCEBFA] text-[#244B78] hover:bg-[#C9E0F7] rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-[#BBD7F5]"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmStudent(student)}
                          className="p-1 text-[#718096] hover:text-[#E35D6A] transition-all cursor-pointer"
                          title="Delete Student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── COMPREHENSIVE STUDENT PROFILE MODAL (ADD & EDIT) ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#203B61] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center">
                  {profileModalMode === 'add' ? <Plus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <span>{profileModalMode === 'add' ? 'Student Admission Form' : 'Edit Student Profile'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-200 border border-blue-400/30">
                      {formData.standard} - {formData.section}
                    </span>
                  </h3>
                  <p className="text-xs text-blue-200/80">
                    {profileModalMode === 'add' ? 'Register a new student into the school master roster' : `Editing profile for ${formData.name || 'student'}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 bg-slate-50 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setActiveProfileTab('personal')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeProfileTab === 'personal'
                    ? 'border-blue-600 text-blue-600 font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>1. Personal & Academic</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveProfileTab('guardian')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeProfileTab === 'guardian'
                    ? 'border-blue-600 text-blue-600 font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>2. Family & Guardian</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveProfileTab('address')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeProfileTab === 'address'
                    ? 'border-blue-600 text-blue-600 font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>3. Address</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveProfileTab('medical')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeProfileTab === 'medical'
                    ? 'border-blue-600 text-blue-600 font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>4. Medical & History</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveProfileTab('services')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeProfileTab === 'services'
                    ? 'border-blue-600 text-blue-600 font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Bus className="w-3.5 h-3.5" />
                <span>5. Transport & Facilities</span>
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* ── TAB 1: PERSONAL & ACADEMIC ── */}
              {activeProfileTab === 'personal' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Full Name */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Full Name of Student <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Aarav Sharma"
                        value={formData.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
                          formErrors.name ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 focus:border-blue-500'
                        }`}
                      />
                      {formErrors.name && <p className="text-[10px] text-rose-500 font-bold mt-1">{formErrors.name}</p>}
                    </div>

                    {/* Admission Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Admission Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="ADM-2026-00001"
                        value={formData.admissionNumber}
                        onChange={(e) => handleFormChange('admissionNumber', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border font-mono text-xs font-bold focus:outline-none ${
                          formErrors.admissionNumber ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 focus:border-blue-500'
                        }`}
                      />
                      {formErrors.admissionNumber && <p className="text-[10px] text-rose-500 font-bold mt-1">{formErrors.admissionNumber}</p>}
                    </div>

                    {/* SATS Number */}
                    <div>
                      <label className="block text-xs font-bold text-purple-900 mb-1 flex items-center justify-between">
                        <span>SATS Number</span>
                        <span className="text-[10px] font-normal text-purple-600">Karnataka SATS / Govt ID</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 109827364"
                        value={formData.satsNumber}
                        onChange={(e) => handleFormChange('satsNumber', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-purple-50/40 text-purple-900 font-mono text-xs font-bold focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* Class Standard */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Class Standard <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.standard}
                        onChange={(e) => handleFormChange('standard', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {dynamicStandardsList.map(std => (
                          <option key={std} value={std}>{std}</option>
                        ))}
                      </select>
                    </div>

                    {/* Section */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Section <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.section}
                        onChange={(e) => handleFormChange('section', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {SECTIONS_LIST.map(sec => (
                          <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Roll Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Roll Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 15"
                        value={formData.rollNumber}
                        onChange={(e) => handleFormChange('rollNumber', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs font-bold focus:outline-none focus:border-blue-500"
                      />
                      {formErrors.rollNumber && <p className="text-[10px] text-rose-500 font-bold mt-1">{formErrors.rollNumber}</p>}
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Date of Birth <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dob}
                        onChange={(e) => handleFormChange('dob', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
                          formErrors.dob ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 focus:border-blue-500'
                        }`}
                      />
                      {formErrors.dob && <p className="text-[10px] text-rose-500 font-bold mt-1">{formErrors.dob}</p>}
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Gender
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => handleFormChange('gender', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Blood Group */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Blood Group
                      </label>
                      <select
                        value={formData.bloodGroup}
                        onChange={(e) => handleFormChange('bloodGroup', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="">Select Blood Group</option>
                        {BLOOD_GROUPS.map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Category / Quota
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleFormChange('category', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Academic Session */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Academic Session
                      </label>
                      <select
                        value={formData.academicYear}
                        onChange={(e) => handleFormChange('academicYear', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {ACADEMIC_YEARS.map(yr => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>

                    {/* Student Status */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Enrollment Status
                      </label>
                      <select
                        value={formData.studentStatus}
                        onChange={(e) => handleFormChange('studentStatus', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="Active">Active</option>
                        <option value="Transferred">Transferred / Inactive</option>
                        <option value="Alumni">Alumni</option>
                      </select>
                    </div>

                    {/* Admission Date */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Admission Date
                      </label>
                      <input
                        type="date"
                        value={formData.admissionDate}
                        onChange={(e) => handleFormChange('admissionDate', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Religion */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Religion
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Hindu, Muslim, Christian, Sikh"
                        value={formData.religion}
                        onChange={(e) => handleFormChange('religion', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Mother Tongue */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mother Tongue
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Kannada, Hindi, English, Urdu"
                        value={formData.motherTongue}
                        onChange={(e) => handleFormChange('motherTongue', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                  </div>
                </div>
              )}

              {/* ── TAB 2: FAMILY & GUARDIAN ── */}
              {activeProfileTab === 'guardian' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Father's Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Father's Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rajesh Sharma"
                        value={formData.fatherName}
                        onChange={(e) => handleFormChange('fatherName', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Father's Occupation */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Father's Occupation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Software Engineer, Business"
                        value={formData.fatherOccupation}
                        onChange={(e) => handleFormChange('fatherOccupation', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Mother's Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mother's Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sunita Sharma"
                        value={formData.motherName}
                        onChange={(e) => handleFormChange('motherName', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Mother's Occupation */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mother's Occupation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Teacher, Homemaker"
                        value={formData.motherOccupation}
                        onChange={(e) => handleFormChange('motherOccupation', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Primary Parent Contact No */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Primary Parent Contact No <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">+91</span>
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="9876543210"
                          value={formData.parentPhone}
                          onChange={(e) => handleFormChange('parentPhone', e.target.value.replace(/\D/g, ''))}
                          className={`w-full pl-11 pr-3 py-2 rounded-xl border font-mono text-xs font-bold focus:outline-none ${
                            formErrors.parentPhone ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 focus:border-blue-500'
                          }`}
                        />
                      </div>
                      {formErrors.parentPhone && <p className="text-[10px] text-rose-500 font-bold mt-1">{formErrors.parentPhone}</p>}
                    </div>

                    {/* Parent WhatsApp No */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Parent WhatsApp Number
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sameAsPhone}
                            onChange={(e) => {
                              setSameAsPhone(e.target.checked);
                              if (e.target.checked) {
                                handleFormChange('parentWhatsapp', formData.parentPhone);
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-0"
                          />
                          <span>Same as Contact</span>
                        </label>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 font-mono">+91</span>
                        <input
                          type="text"
                          maxLength={10}
                          disabled={sameAsPhone}
                          placeholder="9876543210"
                          value={formData.parentWhatsapp}
                          onChange={(e) => handleFormChange('parentWhatsapp', e.target.value.replace(/\D/g, ''))}
                          className="w-full pl-11 pr-3 py-2 rounded-xl border border-slate-200 font-mono text-xs font-bold focus:outline-none focus:border-emerald-500 disabled:bg-slate-100"
                        />
                      </div>
                    </div>

                    {/* Parent Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Parent Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="parent@example.com"
                        value={formData.parentEmail}
                        onChange={(e) => handleFormChange('parentEmail', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
                          formErrors.parentEmail ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 focus:border-blue-500'
                        }`}
                      />
                      {formErrors.parentEmail && <p className="text-[10px] text-rose-500 font-bold mt-1">{formErrors.parentEmail}</p>}
                    </div>

                    {/* Emergency Contact */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Emergency Contact Number
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        placeholder="Alternate phone number"
                        value={formData.emergencyContact}
                        onChange={(e) => handleFormChange('emergencyContact', e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs font-bold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Guardian Name & Relation */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Primary Guardian (if not parents)
                      </label>
                      <input
                        type="text"
                        placeholder="Guardian full name"
                        value={formData.guardianName}
                        onChange={(e) => handleFormChange('guardianName', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Guardian Relationship
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Uncle, Grandfather, Foster"
                        value={formData.guardianRelation}
                        onChange={(e) => handleFormChange('guardianRelation', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                  </div>
                </div>
              )}

              {/* ── TAB 3: ADDRESS ── */}
              {activeProfileTab === 'address' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Residential Street Address
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Door No, Building Name, Street / Layout, Area..."
                      value={formData.address}
                      onChange={(e) => handleFormChange('address', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">City / Town</label>
                      <input
                        type="text"
                        placeholder="e.g. Bengaluru"
                        value={formData.city}
                        onChange={(e) => handleFormChange('city', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        placeholder="e.g. Karnataka"
                        value={formData.state}
                        onChange={(e) => handleFormChange('state', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Pin Code (6 digits)</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="560001"
                        value={formData.pincode}
                        onChange={(e) => handleFormChange('pincode', e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs font-bold focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 4: MEDICAL & HISTORY ── */}
              {activeProfileTab === 'medical' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Previous School Attended</label>
                      <input
                        type="text"
                        placeholder="e.g. Greenfield Public School"
                        value={formData.previousSchool}
                        onChange={(e) => handleFormChange('previousSchool', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Previous Grade / Class</label>
                      <input
                        type="text"
                        placeholder="e.g. Class 9th"
                        value={formData.previousClass}
                        onChange={(e) => handleFormChange('previousClass', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Known Allergies</label>
                    <input
                      type="text"
                      placeholder="e.g. Peanuts, Dust, Penicillin"
                      value={formData.allergies}
                      onChange={(e) => handleFormChange('allergies', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Medical Conditions / Doctor Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Any chronic illness, asthma, prescription glasses, physical disability instructions..."
                      value={formData.medicalNotes}
                      onChange={(e) => handleFormChange('medicalNotes', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ── TAB 5: SERVICES ── */}
              {activeProfileTab === 'services' && (
                <div className="space-y-4">
                  {/* Transport */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Bus className="w-5 h-5 text-amber-600" />
                        <div>
                          <h4 className="text-xs font-black text-slate-800">School Bus & Transport Service</h4>
                          <p className="text-[11px] text-slate-400">Enable daily pickup and drop transportation</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.transportRequired}
                        onChange={(e) => handleFormChange('transportRequired', e.target.checked)}
                        className="w-5 h-5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    {formData.transportRequired && (
                      <div className="pt-2 border-t border-slate-200 animate-fadeIn">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Bus Route / Stop Location</label>
                        <input
                          type="text"
                          placeholder="e.g. Route 4B — Silk Board Junction Stop"
                          value={formData.transportRoute}
                          onChange={(e) => handleFormChange('transportRoute', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Hostel */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Building className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h4 className="text-xs font-black text-slate-800">Hostel / Residential Facility</h4>
                        <p className="text-[11px] text-slate-400">Boarding and campus hostel accommodation</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.hostelRequired}
                      onChange={(e) => handleFormChange('hostelRequired', e.target.checked)}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Form Navigation & Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div>
                  {activeProfileTab !== 'personal' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ['personal', 'guardian', 'address', 'medical', 'services'];
                        const prevIdx = tabs.indexOf(activeProfileTab) - 1;
                        if (prevIdx >= 0) setActiveProfileTab(tabs[prevIdx]);
                      }}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      ← Previous
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activeProfileTab !== 'services' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ['personal', 'guardian', 'address', 'medical', 'services'];
                        const nextIdx = tabs.indexOf(activeProfileTab) + 1;
                        if (nextIdx < tabs.length) setActiveProfileTab(tabs[nextIdx]);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Next Section →
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={savingStudent}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-md shadow-blue-900/30 transition-all cursor-pointer flex items-center gap-2"
                    >
                      {savingStudent && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>{profileModalMode === 'add' ? 'Confirm Admission' : 'Save Changes'}</span>
                    </button>
                  )}
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── BULK UPLOAD STUDENTS MODAL (MULTI-CLASS & SPECIFIC CLASS WISE) ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl relative overflow-y-auto max-h-[90vh] text-slate-900">
            <button
              type="button"
              onClick={() => {
                if (!bulkCommitting) {
                  setBulkModalOpen(false);
                  setBulkFile(null);
                  setBulkPreviewData(null);
                  setBulkFilePreview([]);
                  setBulkClassBreakdown({});
                }
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full p-1.5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#244B78]">
                <Upload className="w-5 h-5 text-[#244B78]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Bulk Upload Students (Class & Section Wise)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upload complete school student rosters at once using Excel (.xlsx, .xls) or CSV (.csv).
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Step 1: Download Sample Formatted Template */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Download Pre-formatted Sample Template</span>
                  </div>
                  <p className="text-[11px] text-blue-800/80 leading-relaxed">
                    Includes columns for Admission No, SATS No, Name, Standard, Section, Roll No, Gender, DOB, Parent Contact, and Address.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isDownloadingTemplate}
                    onClick={() => handleDownloadTemplateFile('xlsx')}
                    className="px-3 py-1.5 bg-[#2D4D77] hover:bg-[#203B61] text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDownloadingTemplate}
                    onClick={() => handleDownloadTemplateFile('csv')}
                    className="px-3 py-1.5 bg-white hover:bg-blue-100 text-[#244B78] font-semibold text-xs rounded-xl border border-blue-300 shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV (.csv)</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Upload Target Mode */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Upload Scope & Assignment
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setBulkUploadScope('auto')}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      bulkUploadScope === 'auto'
                        ? 'bg-blue-50/70 border-[#2D4D77] text-[#244B78] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="uploadScope"
                      checked={bulkUploadScope === 'auto'}
                      onChange={() => setBulkUploadScope('auto')}
                      className="mt-0.5 text-[#244B78] focus:ring-[#93C5FD]"
                    />
                    <div>
                      <div className="font-bold text-xs">Multi-Class Mode (From File)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Reads Class and Section directly from each row in the uploaded sheet. Missing classes will be created automatically.
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setBulkUploadScope('specific')}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      bulkUploadScope === 'specific'
                        ? 'bg-blue-50/70 border-[#2D4D77] text-[#244B78] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="uploadScope"
                      checked={bulkUploadScope === 'specific'}
                      onChange={() => setBulkUploadScope('specific')}
                      className="mt-0.5 text-[#244B78] focus:ring-[#93C5FD]"
                    />
                    <div>
                      <div className="font-bold text-xs">Assign Specific Class & Section</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Assign all rows in this file to a single selected Class and Section.
                      </div>
                    </div>
                  </label>
                </div>

                {bulkUploadScope === 'specific' && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-3 animate-fadeIn">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Target Standard *
                      </label>
                      <select
                        value={bulkTargetStandard}
                        onChange={(e) => setBulkTargetStandard(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#2D4D77] outline-none cursor-pointer"
                      >
                        {dynamicStandardsList.map(std => (
                          <option key={std} value={std}>{std}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Target Section *
                      </label>
                      <input
                        type="text"
                        maxLength="3"
                        value={bulkTargetSection}
                        onChange={(e) => setBulkTargetSection(e.target.value.toUpperCase())}
                        placeholder="e.g. A"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#2D4D77] outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Drag & Drop File Upload Zone */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Spreadsheet File (.xlsx, .xls, .csv)
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleBulkFileSelection(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                    bulkFile 
                      ? 'border-emerald-400 bg-emerald-50/40' 
                      : 'border-slate-300 hover:border-[#2D4D77] bg-slate-50/60 hover:bg-blue-50/20 cursor-pointer'
                  }`}
                  onClick={() => {
                    document.getElementById('academic-bulk-file-input')?.click();
                  }}
                >
                  <input
                    id="academic-bulk-file-input"
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleBulkFileSelection(e.target.files[0]);
                      }
                    }}
                  />
                  
                  {bulkFile ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-sm text-slate-900">{bulkFile.name}</div>
                      <div className="text-xs text-slate-500 font-medium">
                        {(bulkFile.size / 1024).toFixed(1)} KB — Ready to process
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBulkFile(null);
                          setBulkPreviewData(null);
                          setBulkFilePreview([]);
                          setBulkClassBreakdown({});
                        }}
                        className="mt-1 text-xs text-rose-600 hover:text-rose-800 font-semibold underline cursor-pointer"
                      >
                        Remove and choose another file
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#244B78] flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-slate-800">
                        Click to browse or drag & drop student roster here
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv) up to 10MB
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Validation Spinner */}
              {bulkValidating && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center flex items-center justify-center gap-2 text-xs font-semibold text-slate-600">
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  <span>Analyzing roster template and checking database conflicts...</span>
                </div>
              )}

              {/* Validation Summary Cards if available */}
              {bulkPreviewData && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Total Rows</p>
                      <h4 className="text-lg font-black text-slate-800">{bulkPreviewData.totalRows}</h4>
                    </div>

                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                      <p className="text-[10px] text-emerald-700 font-bold uppercase">Valid Ready</p>
                      <h4 className="text-lg font-black text-emerald-700">{bulkPreviewData.validCount}</h4>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                      <p className="text-[10px] text-blue-700 font-bold uppercase">New / Updates</p>
                      <h4 className="text-lg font-black text-blue-800">
                        {bulkPreviewData.toCreateCount} / {bulkPreviewData.toUpdateCount}
                      </h4>
                    </div>

                    <div className={`p-3 rounded-xl border ${bulkPreviewData.invalidCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                      <p className="text-[10px] font-bold uppercase">Errors Found</p>
                      <h4 className="text-lg font-black">{bulkPreviewData.invalidCount}</h4>
                    </div>
                  </div>

                  {/* Errors Table if any */}
                  {bulkPreviewData.errors && bulkPreviewData.errors.length > 0 && (
                    <div className="border border-rose-200 rounded-xl bg-rose-50/50 p-3 max-h-36 overflow-y-auto">
                      <p className="text-xs font-black text-rose-700 flex items-center gap-1.5 mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Errors Requiring Attention ({bulkPreviewData.errors.length}):</span>
                      </p>
                      <ul className="text-[11px] text-rose-600 space-y-1 font-semibold">
                        {bulkPreviewData.errors.map((err, i) => (
                          <li key={i}>
                            Row {err.row}: {err.error} {err.name ? `(${err.name})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Class Breakdown Badge Summary */}
              {Object.keys(bulkClassBreakdown).length > 0 && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-[#244B78]" />
                      <span>Class Strength Distribution in File:</span>
                    </span>
                    <span className="text-emerald-700 font-mono">
                      {Object.values(bulkClassBreakdown).reduce((a, b) => a + b, 0)} Total Students
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                    {Object.entries(bulkClassBreakdown).map(([clsKey, count]) => (
                      <span
                        key={clsKey}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs"
                      >
                        <span className="text-[#244B78] font-bold">Class {clsKey}:</span>
                        <strong className="text-emerald-600 font-mono">+{count} students</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Preview Table */}
              {bulkFilePreview.length > 0 && (
                <div className="space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Preview of First {bulkFilePreview.length} Student Rows:</span>
                    <span className="text-slate-400 text-[10px] font-normal">All columns will be imported</span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-48 text-[11px]">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Class</th>
                          <th className="px-3 py-2 text-left">Section</th>
                          <th className="px-3 py-2 text-left">Roll No</th>
                          <th className="px-3 py-2 text-left">Parent Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {bulkFilePreview.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 font-mono text-slate-400">{idx + 1}</td>
                            <td className="px-3 py-1.5 font-bold text-slate-900">
                              {row.name}
                            </td>
                            <td className="px-3 py-1.5 text-slate-700 font-semibold">
                              {bulkUploadScope === 'specific' ? bulkTargetStandard : row.standard}
                            </td>
                            <td className="px-3 py-1.5 text-slate-700 font-bold">
                              {bulkUploadScope === 'specific' ? bulkTargetSection : row.section}
                            </td>
                            <td className="px-3 py-1.5 font-mono text-slate-600">
                              {row.rollNumber}
                            </td>
                            <td className="px-3 py-1.5 font-mono text-slate-600">
                              {row.parentPhone}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  disabled={bulkCommitting}
                  onClick={() => {
                    setBulkModalOpen(false);
                    setBulkFile(null);
                    setBulkPreviewData(null);
                    setBulkFilePreview([]);
                    setBulkClassBreakdown({});
                  }}
                  className="w-full sm:w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!bulkFile || bulkCommitting}
                  onClick={handleCommitBulkUpload}
                  className="w-full sm:w-2/3 py-2.5 bg-[#2D4D77] hover:bg-[#203B61] text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {bulkCommitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Uploading & Ingesting {Object.values(bulkClassBreakdown).reduce((a, b) => a + b, 0) || (bulkPreviewData?.validCount ? bulkPreviewData.validCount : '')} Students...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Confirm & Upload Student Roster</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── BULK UPLOAD SUCCESS CONFIRMATION MODAL ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {bulkSuccessResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 w-full max-w-lg relative text-slate-900 animate-scaleIn">
            
            {/* Header Icon & Message */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Bulk Upload Completed!
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {bulkSuccessResult.message || 'Student roster was successfully processed and saved to the database.'}
                </p>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-2.5 my-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Processed</span>
                <span className="text-lg font-black text-slate-800 font-mono">
                  {bulkSuccessResult.totalProcessed}
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">New Added</span>
                <span className="text-lg font-black text-emerald-700 font-mono">
                  +{bulkSuccessResult.created}
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Updated</span>
                <span className="text-lg font-black text-blue-700 font-mono">
                  {bulkSuccessResult.updated}
                </span>
              </div>
            </div>

            {/* Classes Affected Live Strength List */}
            {bulkSuccessResult.classesAffected && bulkSuccessResult.classesAffected.length > 0 && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl mb-6 space-y-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-[#244B78]" />
                  <span>Classes Updated & Live Strengths:</span>
                </span>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {bulkSuccessResult.classesAffected.map((cls, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs"
                    >
                      <span className="text-[#244B78] font-bold">Class {cls.standard} - {cls.section}:</span>
                      <strong className="text-emerald-600 font-mono font-bold">{cls.enrolledCount} Students Enrolled</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              {bulkSuccessResult.classesAffected && bulkSuccessResult.classesAffected[0]?.standard && (
                <button
                  type="button"
                  onClick={() => {
                    const firstClass = bulkSuccessResult.classesAffected[0].standard;
                    setSelectedStandard(firstClass);
                    setSelectedSection('ALL');
                    setBulkSuccessResult(null);
                  }}
                  className="w-full sm:flex-1 py-3 bg-[#2D4D77] hover:bg-[#203B61] text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Class {bulkSuccessResult.classesAffected[0].standard} Roster</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setBulkSuccessResult(null)}
                className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

            {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── QUICK VIEW MODAL ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {quickViewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 bg-[#203B61] text-white flex items-center justify-between">
              <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                <span>Student Quick Profile</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-200">
                  {quickViewStudent.standard} - {quickViewStudent.section}
                </span>
              </h3>
              <button
                onClick={() => setQuickViewStudent(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
                  {quickViewStudent.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">{quickViewStudent.name}</h4>
                  <p className="text-xs font-mono text-slate-500 font-bold">
                    Adm: {quickViewStudent.studentId || quickViewStudent.admissionNumber}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100 font-medium">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">SATS Number</span>
                  <span className="font-mono font-bold text-purple-700 text-xs">
                    {quickViewStudent.satsNumber || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Roll Number</span>
                  <span className="font-mono font-bold text-slate-800">
                    {quickViewStudent.rollNumber ? `#${quickViewStudent.rollNumber}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Date of Birth</span>
                  <span className="font-semibold text-slate-700">{quickViewStudent.dob || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Admission Date</span>
                  <span className="font-semibold text-slate-700">{formatToDDMMYYYY(quickViewStudent.admissionDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Blood Group</span>
                  <span className="font-bold text-rose-600">{quickViewStudent.bloodGroup || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Father's Name</span>
                  <span className="font-semibold text-slate-700">{quickViewStudent.fatherName || quickViewStudent.parentName || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Parent Contact</span>
                  <span className="font-mono font-bold text-slate-800">{quickViewStudent.parentPhone || quickViewStudent.phone || '—'}</span>
                </div>
              </div>

              {quickViewStudent.address && (
                <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Address</span>
                  <p className="text-slate-700 font-semibold">{quickViewStudent.address}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  const s = quickViewStudent;
                  setQuickViewStudent(null);
                  handleOpenEditModal(s);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Full Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── DELETE CONFIRMATION MODAL ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {deleteConfirmStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">Remove Student Record?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong className="text-slate-800">{deleteConfirmStudent.name}</strong> ({deleteConfirmStudent.studentId || deleteConfirmStudent.admissionNumber})? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmStudent(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStudent}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
