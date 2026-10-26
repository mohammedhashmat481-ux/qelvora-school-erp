import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { directLoginAsUser, loginWithPassword, getProfile, getCompanySettings, updateCompanySettings, getConsolidatedReport, getDetailsReport, updateAttendanceStatus, getAdminEmployees, updateEmployeeSettings, deleteEmployee, exportAttendanceExcel, resetEmployeePassword, getDailyStatus, uploadEmployeeDocument, downloadEmployeeDocument, getRoles, createRole, updateRole, deleteRole, getClasses, createClass, updateClass, deleteClass, getSubjects, createSubject, updateSubject, deleteSubject, getMappings, createMapping, updateMapping, deleteMapping, addTeacher, saveTeacherTimetableBulk, getTimetables, createTimetableEntry, deleteTimetableEntry, uploadVideo, deleteVideo, getAdminFeedbackAll, submitFeedback, deleteFeedback, getVideos, getStudentsList, addStudent, updateStudent, deleteStudent, getNextAdmissionNumber, getClassSessions, createClassSession, concludeClassSession, sendLateNotice, bulkUploadStudents, downloadStudentTemplate } from '../services/authService';
import { useTranslation } from 'react-i18next';
import Spinner from '../components/ui/Spinner';
import useGeolocation from '../hooks/useGeolocation';
import Sidebar from '../components/ui/Sidebar';
import { 
  Settings as SettingsIcon, 
  ShieldCheck, 
  UsersRound, 
  BarChart2, 
  FileText, 
  Calendar, 
  User, 
  Edit3, 
  Clock, 
  LogIn as LogInIcon, 
  LogOut as LogOutIcon, 
  X as XIcon, 
  Save as SaveIcon,
  Search,
  Plus,
  Trash2,
  Key,
  RefreshCw,
  GraduationCap,
  BookOpen,
  Link2,
  CalendarDays,
  CheckCircle2,
  MessageSquare,
  Eye,
  EyeOff,
  Check,
  Lock,
  ChevronLeft,
  ChevronRight,
  School,
  History,
  Download,
  Upload,
  Sparkles,
  AlertCircle,
  Info,
  Layers,
  Star,
  Filter,
  Quote,
  ThumbsUp,
  LayoutGrid,
  List,
  StopCircle,
  Play,
  AlertTriangle,
  AlertOctagon,
  Send,
  Mail
} from 'lucide-react';

const MONTH_NAMES = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

const AdminPage = () => {
  const { t } = useTranslation();
  const { user, loading, loginSuccess, faceVerified, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Failed to log out');
    }
  };
  const { position: geoPosition, error: geoError, permissionDenied: geoDenied, refresh: geoRefresh } = useGeolocation({ watch: true });

  const [settings, setSettings] = useState({ 
    hours_per_day: 8.0, 
    hours_per_week: 40.0,
    hours_per_month: 160.0,
    hours_per_year: 1920.0,
    weekly_off: 'Sunday',
    office_start_time: '09:00',
    grace_period_mins: 30,
    boardsList: ['CBSE', 'STATE', 'ICSE'],
    standardsList: ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'],
    period_duration_mins: 45,
    lunch_break_start: '12:00',
    small_break_start: '10:30'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const activeTab = params.get('tab') || 'settings';
  // Reports
  const [consolidated, setConsolidated] = useState(null);
  const [details, setDetails] = useState(null);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [deptFilter, setDeptFilter] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  // Employee Management
  const [employees, setEmployees] = useState([]);
  const [originalEmployees, setOriginalEmployees] = useState([]);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [empLoading, setEmpLoading] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [savingEmpId, setSavingEmpId] = useState(null);
  const [exportingType, setExportingType] = useState(null);
  const [selectedUserDashboard, setSelectedUserDashboard] = useState(null);

  // Add/Edit Faculty Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddingFaculty, setIsAddingFaculty] = useState(false);
  const [addForm, setAddForm] = useState({
    employeeId: '',
    firstName: '',
    middleName: '',
    lastName: '',
    name: '',
    email: '',
    phone: '',
    qualification: '',
    experience: 0,
    status: 'Active',
    createLogin: true,
    password: '',
    role: 'teacher',
    primary_subject: '',
    secondary_subject: ''
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingFaculty, setIsSavingFaculty] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    name: '',
    email: '',
    phone: '',
    qualification: '',
    experience: 0,
    status: 'Active',
    role: 'teacher',
    skip_face: false,
    skip_location: false,
    isActive: true,
    primary_subject: '',
    secondary_subject: ''
  });

  // Class Management States
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [isSavingClass, setIsSavingClass] = useState(false);
  const [classStandard, setClassStandard] = useState('1st');
  const [classSection, setClassSection] = useState('A');
  const [classBoard, setClassBoard] = useState('CBSE');
  const [classTeacherId, setClassTeacherId] = useState('');
  const [classRoomNumber, setClassRoomNumber] = useState('');
  const [classStrength, setClassStrength] = useState(35);
  const [editingClass, setEditingClass] = useState(null);
  const [classSearch, setClassSearch] = useState('');
  const [classBoardFilter, setClassBoardFilter] = useState('All');
  const [deletingClass, setDeletingClass] = useState(null);
  const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  // Subject Management States
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [isSavingSubject, setIsSavingSubject] = useState(false);

  // Synced Lists Aliases for Feedbacks & Forms
  const teachersList = useMemo(() => employees || [], [employees]);
  const classesList = useMemo(() => classes || [], [classes]);
  const subjectsList = useMemo(() => subjects || [], [subjects]);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    classId: '',
    standard: '',
    section: '',
    board: 'CBSE',
    type: 'Core',
    weeklyHours: 4
  });
  const [editingSubject, setEditingSubject] = useState(null);
  const [deletingSubject, setDeletingSubject] = useState(null);
  const [isDeleteSubjectModalOpen, setIsDeleteSubjectModalOpen] = useState(false);
  const [isDeletingSubject, setIsDeletingSubject] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectClassFilter, setSubjectClassFilter] = useState('All');
  const [subjectTypeFilter, setSubjectTypeFilter] = useState('All');

  // Mapping Management States
  const [mappings, setMappings] = useState([]);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [isSavingMapping, setIsSavingMapping] = useState(false);
  const [mappingForm, setMappingForm] = useState({
    teacherId: '',
    classId: '',
    subjectId: ''
  });
  const [editingMapping, setEditingMapping] = useState(null);
  const [deletingMapping, setDeletingMapping] = useState(null);
  const [isDeleteMappingModalOpen, setIsDeleteMappingModalOpen] = useState(false);
  const [isDeletingMapping, setIsDeletingMapping] = useState(false);
  const [mappingSearch, setMappingSearch] = useState('');
  const [mappingTeacherFilter, setMappingTeacherFilter] = useState('All');
  const [mappingClassFilter, setMappingClassFilter] = useState('All');
  const [mappingSubjectFilter, setMappingSubjectFilter] = useState('All');

  // Video & Feedback Management States
  const [adminVideos, setAdminVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState([]);
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [loadingAdminFeedback, setLoadingAdminFeedback] = useState(false);
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState('All');
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState('All');
  const [feedbackTeacherFilter, setFeedbackTeacherFilter] = useState('All');
  const [feedbackClassFilter, setFeedbackClassFilter] = useState('All');
  const [feedbackSortBy, setFeedbackSortBy] = useState('newest');
  const [feedbackViewMode, setFeedbackViewMode] = useState('card');
  const [showAddFeedbackModal, setShowAddFeedbackModal] = useState(false);
  const [addFeedbackForm, setAddFeedbackForm] = useState({
    teacherName: '',
    evaluatorType: 'Student',
    studentName: '',
    parentName: '',
    rollNumber: '',
    standard: '10th',
    section: 'A',
    subject: '',
    rating: 5,
    feedback: ''
  });
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', subject: '', standard: '1st', section: 'A', teacherId: '', description: '', duration: '45:00' });
  const [videoFile, setVideoFile] = useState(null);

  // Student Management States
  const [studentsList, setStudentsList] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [filterStd, setFilterStd] = useState('5th');
  const [filterSec, setFilterSec] = useState('A');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [studentTotalPages, setStudentTotalPages] = useState(1);
  const [studentTotalCount, setStudentTotalCount] = useState(0);

  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [isViewStudentModalOpen, setIsViewStudentModalOpen] = useState(false);
  const [isDeleteStudentModalOpen, setIsDeleteStudentModalOpen] = useState(false);

  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);

  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  const [photoPreview, setPhotoPreview] = useState(null);
  const [studentFormErrors, setStudentFormErrors] = useState({});

  // Bulk Upload Students State
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkFilePreview, setBulkFilePreview] = useState([]);
  const [bulkClassBreakdown, setBulkClassBreakdown] = useState({});
  const [bulkUploadScope, setBulkUploadScope] = useState('auto'); // 'auto' | 'specific'
  const [bulkTargetStandard, setBulkTargetStandard] = useState('10th');
  const [bulkTargetSection, setBulkTargetSection] = useState('A');
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const initialStudentForm = {
    firstName: '',
    middleName: '',
    lastName: '',
    name: '',
    admissionNumber: '',
    dob: '',
    gender: 'Male',
    standard: '5th',
    section: 'A',
    rollNumber: '',
    admissionDate: new Date().toISOString().split('T')[0],
    fatherName: '',
    motherName: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    address: '',
    photoUrl: ''
  };

  const [studentForm, setStudentForm] = useState(initialStudentForm);

  // Map of standard -> Array of unique sections from configured classes
  const classStandardSectionsMap = useMemo(() => {
    const map = {};
    (classes || []).forEach(cls => {
      const std = (cls.standard || '').trim();
      const sec = (cls.section || 'A').toUpperCase().trim();
      if (!std) return;
      if (!map[std]) map[std] = new Set();
      map[std].add(sec);
    });
    const result = {};
    Object.keys(map).forEach(std => {
      result[std] = Array.from(map[std]).sort();
    });
    return result;
  }, [classes]);

  // Complete dynamic list of available standards/classes from Class Management, settings, and defaults
  const availableStandards = useMemo(() => {
    const list = [];
    const seen = new Set();
    // 1. Classes configured in Class Management (e.g. BPT 1st YEAR, etc.)
    (classes || []).forEach(cls => {
      const std = (cls.standard || '').trim();
      if (std && !seen.has(std)) {
        seen.add(std);
        list.push(std);
      }
    });
    // 2. Standards configured in School Settings
    (settings?.standardsList || []).forEach(s => {
      const std = (s || '').trim();
      if (std && !seen.has(std)) {
        seen.add(std);
        list.push(std);
      }
    });
    // 3. Fallback standard grades
    ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'].forEach(s => {
      if (!seen.has(s)) {
        seen.add(s);
        list.push(s);
      }
    });
    return list;
  }, [classes, settings?.standardsList]);

  // Unique distinct classes for class-wise Subject Management (no duplicate sections)
  const uniqueClassStandards = useMemo(() => {
    const list = [];
    const seen = new Set();
    (classes || []).forEach(cls => {
      const std = (cls.standard || '').trim();
      if (std && !seen.has(std)) {
        seen.add(std);
        list.push({
          standard: std,
          board: cls.board || 'CBSE',
          label: `Class ${std}`
        });
      }
    });
    (settings?.standardsList || []).forEach(s => {
      const std = (s || '').trim();
      if (std && !seen.has(std)) {
        seen.add(std);
        list.push({
          standard: std,
          board: settings?.board || 'CBSE',
          label: `Class ${std}`
        });
      }
    });
    if (list.length === 0) {
      ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'].forEach(s => {
        list.push({ standard: s, board: 'CBSE', label: `Class ${s}` });
      });
    }
    return list;
  }, [classes, settings?.standardsList, settings?.board]);

  const availableSectionsForSelectedStandard = useMemo(() => {
    const std = studentForm.standard;
    if (std && classStandardSectionsMap[std] && classStandardSectionsMap[std].length > 0) {
      return classStandardSectionsMap[std];
    }
    return ['A', 'B', 'C', 'D'];
  }, [classStandardSectionsMap, studentForm.standard]);

  // Roles Management
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [rolesSearch, setRolesSearch] = useState('');
  const [roleForm, setRoleForm] = useState({
    RoleCode: 'AUTO-GENERATED',
    Rolename: '',
    GantAdminPrevillage: false
  });

  // Timetable Tab States
  const [weeklyTimetable, setWeeklyTimetable] = useState([]);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [selectedViewType, setSelectedViewType] = useState('class');
  const [selectedClassForGrid, setSelectedClassForGrid] = useState('');
  const [selectedTeacherForGrid, setSelectedTeacherForGrid] = useState('');

  // Single Cell Editor
  const [showEditCellModal, setShowEditCellModal] = useState(false);
  const [editCellDay, setEditCellDay] = useState('');
  const [editCellPeriod, setEditCellPeriod] = useState(1);
  const [editCellClassId, setEditCellClassId] = useState('');
  const [editCellSubjectId, setEditCellSubjectId] = useState('');
  const [editCellTeacherId, setEditCellTeacherId] = useState('');
  const [editCellEntryId, setEditCellEntryId] = useState('');
  const [isSavingCell, setIsSavingCell] = useState(false);

  // Bulk Timetable Builder States
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [bulkSelectedTeacherId, setBulkSelectedTeacherId] = useState('');
  const [bulkGridState, setBulkGridState] = useState({});
  const [isSavingBulkTimetable, setIsSavingBulkTimetable] = useState(false);

  // Modal Insurance States
  const [modalInsuranceId, setModalInsuranceId] = useState('');
  const [modalInsuranceProvider, setModalInsuranceProvider] = useState('');
  const [modalSaving, setModalSaving] = useState(false);

  // Class Sessions States
  const [classSessions, setClassSessions] = useState([]);
  const [loadingClassSessions, setLoadingClassSessions] = useState(false);
  const [classSessionsSearch, setClassSessionsSearch] = useState('');
  const [classSessionsStatusFilter, setClassSessionsStatusFilter] = useState('All');
  const [classSessionsTeacherFilter, setClassSessionsTeacherFilter] = useState('All');
  const [classSessionsStandardFilter, setClassSessionsStandardFilter] = useState('All');
  const [classSessionsSectionFilter, setClassSessionsSectionFilter] = useState('All');
  const [classSessionsPunctualityFilter, setClassSessionsPunctualityFilter] = useState('All'); // 'All' | 'on-time' | 'yellow' | 'orange' | 'red'
  const [showLogSessionModal, setShowLogSessionModal] = useState(false);
  const [showLateNoticeModal, setShowLateNoticeModal] = useState(false);
  const [selectedLateSession, setSelectedLateSession] = useState(null);
  const [lateNoticeSubject, setLateNoticeSubject] = useState('');
  const [lateNoticeMessage, setLateNoticeMessage] = useState('');
  const [isSendingLateNotice, setIsSendingLateNotice] = useState(false);
  const [logSessionForm, setLogSessionForm] = useState({
    teacher: '',
    standard: '10th',
    section: 'A',
    subject: 'Mathematics',
    period: 1
  });
  const [isLoggingSession, setIsLoggingSession] = useState(false);

  // Daily Status Filter State
  const [dailyStatusFilter, setDailyStatusFilter] = useState('ALL');
  const [selectedEmpIdForDetails, setSelectedEmpIdForDetails] = useState('');

  // Edit Attendance Status Modal
  const [showEditAttModal, setShowEditAttModal] = useState(false);
  const [editAttEmployee, setEditAttEmployee] = useState(null);
  const [editAttDayData, setEditAttDayData] = useState(null);
  const [editAttStatus, setEditAttStatus] = useState('Present');
  const [editAttReason, setEditAttReason] = useState('');
  const [editAttPunchIn, setEditAttPunchIn] = useState('08:30');
  const [editAttPunchOut, setEditAttPunchOut] = useState('16:00');
  const [isSavingAttStatus, setIsSavingAttStatus] = useState(false);
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
  const [showRoleSaveModal, setShowRoleSaveModal] = useState(false);
  const [savedRoleInfo, setSavedRoleInfo] = useState(null);
  const [showAddBoardModal, setShowAddBoardModal] = useState(false);
  const [newBoardInput, setNewBoardInput] = useState('');
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordEmp, setResetPasswordEmp] = useState(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const handleOpenEditAttModal = (emp, dayData) => {
    setEditAttEmployee(emp);
    setEditAttDayData(dayData);
    setEditAttStatus(dayData.status || 'Present');
    setEditAttReason(dayData.reason || '');
    setEditAttPunchIn(dayData.raw_punch_in || dayData.punch_in || '08:30');
    setEditAttPunchOut(dayData.raw_punch_out || dayData.punch_out || '16:00');
    setShowEditAttModal(true);
  };

  const handleSaveAttendanceStatus = async () => {
    if (!editAttEmployee || !editAttDayData) return;
    const targetEmpId = editAttEmployee.employee_id || editAttEmployee.employeeId || '';
    const targetDate = editAttDayData.date;
    const newStatus = editAttStatus;
    
    setIsSavingAttStatus(true);
    try {
      const res = await updateAttendanceStatus({
        employeeId: targetEmpId,
        date: targetDate,
        status: newStatus,
        reason: editAttReason,
        punch_in: editAttPunchIn,
        punch_out: editAttPunchOut
      });
      if (res?.status) {
        toast.success(`Attendance updated for ${editAttEmployee.name} (${targetDate}) -> ${newStatus}`);
        setShowEditAttModal(false);

        // Optimistically update details state in React immediately
        setDetails(prevDetails => {
          if (!prevDetails || !prevDetails.employees) return prevDetails;
          const updatedEmps = prevDetails.employees.map(emp => {
            const empIdMatches = (emp.employee_id && targetEmpId && emp.employee_id.toLowerCase() === targetEmpId.toLowerCase()) || 
                                 (emp.name && editAttEmployee.name && emp.name.toLowerCase() === editAttEmployee.name.toLowerCase());
            if (empIdMatches) {
              const updatedDaily = (emp.daily || []).map(day => {
                if (day.date === targetDate) {
                  return {
                    ...day,
                    status: newStatus,
                    punch_in: editAttPunchIn || day.punch_in,
                    punch_out: editAttPunchOut || day.punch_out,
                    reason: editAttReason
                  };
                }
                return day;
              });
              return { ...emp, daily: updatedDaily };
            }
            return emp;
          });
          return { ...prevDetails, employees: updatedEmps };
        });

        // Optimistically update consolidated state in React immediately
        setConsolidated(prev => {
          if (!prev || !prev.employees) return prev;
          const updatedEmps = prev.employees.map(emp => {
            const empIdMatches = (emp.employee_id && targetEmpId && emp.employee_id.toLowerCase() === targetEmpId.toLowerCase()) || 
                                 (emp.name && editAttEmployee.name && emp.name.toLowerCase() === editAttEmployee.name.toLowerCase());
            if (empIdMatches) {
              const isNowPresent = newStatus === 'Present' || newStatus === 'Half Day';
              const wasPresent = editAttDayData.status === 'Present' || editAttDayData.status === 'Half Day';
              let presDelta = 0;
              let absDelta = 0;
              if (isNowPresent && !wasPresent) { presDelta = 1; absDelta = -1; }
              else if (!isNowPresent && wasPresent) { presDelta = -1; absDelta = 1; }
              return {
                ...emp,
                days_present: Math.max(0, (emp.days_present || 0) + presDelta),
                days_absent: Math.max(0, (emp.days_absent || 0) + absDelta)
              };
            }
            return emp;
          });
          return { ...prev, employees: updatedEmps };
        });

        fetchDetails();
        fetchConsolidated();
      } else {
        toast.error(res?.message || 'Failed to update attendance status');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error updating attendance status');
    } finally {
      setIsSavingAttStatus(false);
    }
  };

  useEffect(() => {
    if (selectedUserDashboard) {
      setModalInsuranceId(selectedUserDashboard.insurance_id || '');
      setModalInsuranceProvider(selectedUserDashboard.insurance_provider || '');
    } else {
      setModalInsuranceId('');
      setModalInsuranceProvider('');
    }
  }, [selectedUserDashboard]);

  const handleSaveModalInsurance = async () => {
    if (!selectedUserDashboard) return;
    setModalSaving(true);
    try {
      await updateEmployeeSettings(selectedUserDashboard._id, {
        skip_face: selectedUserDashboard.skip_face,
        skip_location: selectedUserDashboard.skip_location,
        is_enabled: selectedUserDashboard.is_enabled,
        role: selectedUserDashboard.role,
        insurance_id: modalInsuranceId.trim(),
        insurance_provider: modalInsuranceProvider.trim(),
      });
      
      // Update local list state so it syncs immediately without reload
      setEmployees(prev => prev.map(e => e._id === selectedUserDashboard._id ? {
        ...e,
        insurance_id: modalInsuranceId.trim(),
        insurance_provider: modalInsuranceProvider.trim()
      } : e));
      
      // Update selectedUserDashboard state as well
      setSelectedUserDashboard(prev => prev ? {
        ...prev,
        insurance_id: modalInsuranceId.trim(),
        insurance_provider: modalInsuranceProvider.trim()
      } : null);

      toast.success("Insurance details saved successfully!");
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save insurance details');
    } finally {
      setModalSaving(false);
    }
  };

  // Timetable editor logic
  const calculateTimeSlots = (settings) => {
    const startStr = settings?.office_start_time || '09:00';
    const endStr = settings?.office_end_time || '16:00';
    const periodMins = settings?.period_duration_mins || 45;
    
    const smallBreakStart = settings?.small_break_start || '10:30';
    const smallBreakMins = settings?.small_break_mins || 15;
    
    const lunchBreakStart = settings?.lunch_break_start || '12:00';
    const lunchBreakMins = settings?.lunch_break_mins || 45;

    const parseTime = (str) => {
      const [h, m] = str.split(':').map(Number);
      return h * 60 + m;
    };

    const formatTime = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const start = parseTime(startStr);
    const end = parseTime(endStr);
    const sBreak = parseTime(smallBreakStart);
    const lBreak = parseTime(lunchBreakStart);

    let current = start;
    const list = [];
    let periodIndex = 1;

    while (current + periodMins <= end) {
      if (current >= sBreak && current < sBreak + smallBreakMins) {
        current = sBreak + smallBreakMins;
        continue;
      }
      if (current >= lBreak && current < lBreak + lunchBreakMins) {
        current = lBreak + lunchBreakMins;
        continue;
      }

      const pStart = current;
      const pEnd = current + periodMins;
      
      list.push({
        period: periodIndex++,
        timeSlot: `${formatTime(pStart)}-${formatTime(pEnd)}`
      });

      current = pEnd;
    }

    return list;
  };

  const calculatedPeriods = useMemo(() => calculateTimeSlots(settings), [settings]);

  const fetchTimetable = useCallback(async () => {
    setTimetableLoading(true);
    try {
      const res = await getTimetables();
      if (res?.status && Array.isArray(res.data)) {
        setWeeklyTimetable(res.data);
      }
    } catch (err) {
      toast.error('Failed to load timetables');
    } finally {
      setTimetableLoading(false);
    }
  }, []);

  const handleOpenBulkCreateModal = (teacherId = '') => {
    setBulkSelectedTeacherId(teacherId);
    setBulkGridState({});
    if (teacherId) {
      handleBulkTeacherChange(teacherId);
    }
    setShowBulkCreateModal(true);
  };

  const handleBulkTeacherChange = (teacherId) => {
    setBulkSelectedTeacherId(teacherId);
    if (!teacherId) {
      setBulkGridState({});
      return;
    }

    // Load existing slots for this teacher from weeklyTimetable
    const teacherSlots = weeklyTimetable.filter(e => {
      const tid = e.teacher?._id || e.teacher;
      return tid?.toString() === teacherId.toString();
    });

    const newGridState = {};
    teacherSlots.forEach(slot => {
      const cellKey = `${slot.day}-${slot.period}`;
      newGridState[cellKey] = {
        classId: slot.class?._id || slot.class || '',
        subjectId: slot.subject?._id || slot.subject || ''
      };
    });
    setBulkGridState(newGridState);
  };

  const handleBulkCellChange = (day, period, field, value) => {
    const cellKey = `${day}-${period}`;
    setBulkGridState(prev => ({
      ...prev,
      [cellKey]: {
        ...(prev[cellKey] || { classId: '', subjectId: '' }),
        [field]: value
      }
    }));
  };

  const handleSaveBulkTimetable = async () => {
    if (!bulkSelectedTeacherId) {
      toast.error('Please select a teacher first');
      return;
    }

    setIsSavingBulkTimetable(true);
    try {
      // Build slots array of { day, period, classId, subjectId }
      const slots = [];
      Object.entries(bulkGridState).forEach(([key, val]) => {
        const [day, period] = key.split('-');
        if (val.classId && val.subjectId) {
          slots.push({
            day,
            period: Number(period),
            classId: val.classId,
            subjectId: val.subjectId
          });
        }
      });

      const res = await saveTeacherTimetableBulk(bulkSelectedTeacherId, slots, null);
      if (res?.status) {
        toast.success(res.message || 'Timetable saved successfully');
        setShowBulkCreateModal(false);
        fetchTimetable();
      } else {
        toast.error(res?.message || 'Failed to save timetable');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving timetable');
    } finally {
      setIsSavingBulkTimetable(false);
    }
  };

  const handleExportExcel = () => {
    if (selectedViewType === 'class' && !selectedClassForGrid) {
      toast.error("Please select a class to export");
      return;
    }
    if (selectedViewType === 'teacher' && !selectedTeacherForGrid) {
      toast.error("Please select a teacher to export");
      return;
    }

    const activeViewName = selectedViewType === 'class'
      ? classes.find(c => c._id === selectedClassForGrid)
        ? `Class_${classes.find(c => c._id === selectedClassForGrid).standard}_${classes.find(c => c._id === selectedClassForGrid).section}`
        : "Class_Timetable"
      : employees.find(t => t._id === selectedTeacherForGrid)
        ? `Teacher_${employees.find(t => t._id === selectedTeacherForGrid).name.replace(/\s+/g, '_')}`
        : "Teacher_Timetable";

    // Build CSV content
    const headers = ['Period/Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const rows = [headers];

    calculatedPeriods.forEach(p => {
      const row = [`Period ${p.period} (${p.timeSlot})`];
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].forEach(day => {
        const slot = weeklyTimetable.find(e => {
          if (selectedViewType === 'class') {
            const cid = e.class?._id || e.class;
            return cid?.toString() === selectedClassForGrid?.toString() && e.day === day && Number(e.period) === Number(p.period);
          } else {
            const tid = e.teacher?._id || e.teacher;
            return tid?.toString() === selectedTeacherForGrid?.toString() && e.day === day && Number(e.period) === Number(p.period);
          }
        });
        if (slot) {
          const subName = slot.subject?.name || slot.subject || 'N/A';
          const detail = selectedViewType === 'class'
            ? (slot.teacher?.name || slot.teacher || 'N/A')
            : (slot.class ? `${slot.class.standard}-${slot.class.section}` : 'N/A');
          row.push(`${subName} (${detail})`);
        } else {
          row.push('—');
        }
      });
      rows.push(row);
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeViewName}_Timetable.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel/CSV export completed!");
  };

  const handleClassGridSelect = (cid) => {
    setSelectedClassForGrid(cid);
    setSelectedTeacherForGrid('');
    setSelectedViewType('class');
  };

  const handleTeacherGridSelect = (tid) => {
    setSelectedTeacherForGrid(tid);
    setSelectedClassForGrid('');
    setSelectedViewType('teacher');
  };

  const handleOpenEditCellModal = (day, period, entry = null) => {
    setEditCellDay(day);
    setEditCellPeriod(period);
    if (selectedViewType === 'class') {
      setEditCellClassId(selectedClassForGrid);
      if (entry) {
        setEditCellEntryId(entry._id || entry.id);
        setEditCellSubjectId(entry.subjectId || entry.subject?._id || entry.subject?.id || '');
        setEditCellTeacherId(entry.teacherId || entry.teacher?._id || entry.teacher?.id || '');
      } else {
        setEditCellEntryId('');
        // Check if there is only 1 mapping for this class or suggest first
        const selClass = classes.find(c => (c._id && c._id.toString() === selectedClassForGrid.toString()) || (c.id && c.id.toString() === selectedClassForGrid.toString()));
        const classMappings = mappings.filter(m => {
          const cid = m.class?._id || m.class?.id || m.classId || m.class;
          return (cid && cid.toString() === selectedClassForGrid.toString()) ||
            (selClass && m.standard && m.section &&
             m.standard.toString().toLowerCase().trim() === selClass.standard.toString().toLowerCase().trim() &&
             m.section.toString().toLowerCase().trim() === selClass.section.toString().toLowerCase().trim());
        });

        if (classMappings.length > 0) {
          const firstMap = classMappings[0];
          const candSub = subjects.find(s => (s._id && s._id.toString() === (firstMap.subjectId || firstMap.subject?._id || '').toString()) || (firstMap.subjectName && s.name.toLowerCase().trim() === firstMap.subjectName.toLowerCase().trim()));
          const candTeacher = employees.find(t => (t._id && t._id.toString() === (firstMap.teacherId || firstMap.teacher?._id || '').toString()) || (firstMap.teacherName && t.name.toLowerCase().trim() === firstMap.teacherName.toLowerCase().trim()));
          setEditCellSubjectId(candSub?._id || candSub?.id || firstMap.subjectId || '');
          setEditCellTeacherId(candTeacher?._id || candTeacher?.id || firstMap.teacherId || '');
        } else {
          setEditCellSubjectId('');
          setEditCellTeacherId('');
        }
      }
    } else {
      setEditCellTeacherId(selectedTeacherForGrid);
      if (entry) {
        setEditCellEntryId(entry._id || entry.id);
        setEditCellClassId(entry.classId || entry.class?._id || entry.class?.id || '');
        setEditCellSubjectId(entry.subjectId || entry.subject?._id || entry.subject?.id || '');
      } else {
        setEditCellEntryId('');
        const selTeacher = employees.find(t => (t._id && t._id.toString() === selectedTeacherForGrid.toString()) || (t.id && t.id.toString() === selectedTeacherForGrid.toString()));
        const teacherMappings = mappings.filter(m => {
          const tid = m.teacher?._id || m.teacher?.id || m.teacherId || m.teacher;
          return (tid && tid.toString() === selectedTeacherForGrid.toString()) ||
            (selTeacher && (m.teacherName?.toLowerCase().trim() === selTeacher.name?.toLowerCase().trim() || m.teacher?.name?.toLowerCase().trim() === selTeacher.name?.toLowerCase().trim()));
        });

        if (teacherMappings.length > 0) {
          const firstMap = teacherMappings[0];
          const candCls = classes.find(c => (c._id && c._id.toString() === (firstMap.classId || firstMap.class?._id || '').toString()) || (firstMap.standard && firstMap.section && c.standard.toLowerCase().trim() === firstMap.standard.toLowerCase().trim() && c.section.toLowerCase().trim() === firstMap.section.toLowerCase().trim()));
          const candSub = subjects.find(s => (s._id && s._id.toString() === (firstMap.subjectId || firstMap.subject?._id || '').toString()) || (firstMap.subjectName && s.name.toLowerCase().trim() === firstMap.subjectName.toLowerCase().trim()));
          setEditCellClassId(candCls?._id || candCls?.id || firstMap.classId || '');
          setEditCellSubjectId(candSub?._id || candSub?.id || firstMap.subjectId || '');
        } else {
          setEditCellClassId('');
          setEditCellSubjectId('');
        }
      }
    }
    setShowEditCellModal(true);
  };

  const handleEditCellSubjectChange = (subjectId) => {
    setEditCellSubjectId(subjectId);
    if (selectedViewType === 'class' && editCellClassId) {
      const selClass = classes.find(c => (c._id && c._id.toString() === editCellClassId.toString()) || (c.id && c.id.toString() === editCellClassId.toString()));
      const selSub = subjects.find(s => (s._id && s._id.toString() === subjectId.toString()) || (s.id && s.id.toString() === subjectId.toString()));
      
      const matchedMapping = mappings.find(m => {
        const cid = m.class?._id || m.class?.id || m.classId || m.class;
        const classMatches = (cid && cid.toString() === editCellClassId.toString()) ||
          (selClass && m.standard && m.section &&
           m.standard.toString().toLowerCase().trim() === selClass.standard.toString().toLowerCase().trim() &&
           m.section.toString().toLowerCase().trim() === selClass.section.toString().toLowerCase().trim());
        const sid = m.subject?._id || m.subject?.id || m.subjectId || m.subject;
        const subMatches = (sid && sid.toString() === subjectId.toString()) ||
          (selSub && (
            (m.subjectName && m.subjectName.toString().toLowerCase().trim() === selSub.name.toString().toLowerCase().trim()) ||
            (m.subject?.name && m.subject.name.toString().toLowerCase().trim() === selSub.name.toString().toLowerCase().trim())
          ));
        return classMatches && subMatches;
      });

      if (matchedMapping) {
        const candTeacher = employees.find(t => 
          (matchedMapping.teacherId && (t._id?.toString() === matchedMapping.teacherId.toString() || t.id?.toString() === matchedMapping.teacherId.toString())) ||
          (matchedMapping.teacherName && t.name?.toLowerCase().trim() === matchedMapping.teacherName.toLowerCase().trim()) ||
          (matchedMapping.teacher?.name && t.name?.toLowerCase().trim() === matchedMapping.teacher.name.toLowerCase().trim())
        );
        if (candTeacher) {
          setEditCellTeacherId(candTeacher._id || candTeacher.id);
          toast.success(`Assigned educator: ${candTeacher.name}`, { id: 'auto-mapped-teacher' });
        }
      }
    }
  };

  const handleEditCellClassChange = (classId) => {
    setEditCellClassId(classId);
    if (selectedViewType === 'teacher' && editCellTeacherId) {
      const selClass = classes.find(c => (c._id && c._id.toString() === classId.toString()) || (c.id && c.id.toString() === classId.toString()));
      const selTeacher = employees.find(t => (t._id && t._id.toString() === editCellTeacherId.toString()) || (t.id && t.id.toString() === editCellTeacherId.toString()));
      
      const matchedMapping = mappings.find(m => {
        const tid = m.teacher?._id || m.teacher?.id || m.teacherId || m.teacher;
        const teacherMatches = (tid && tid.toString() === editCellTeacherId.toString()) ||
          (selTeacher && (
            (m.teacherName && m.teacherName.toString().toLowerCase().trim() === selTeacher.name.toString().toLowerCase().trim()) ||
            (m.teacher?.name && m.teacher.name.toString().toLowerCase().trim() === selTeacher.name.toString().toLowerCase().trim())
          ));
        const cid = m.class?._id || m.class?.id || m.classId || m.class;
        const classMatches = (cid && cid.toString() === classId.toString()) ||
          (selClass && m.standard && m.section &&
           m.standard.toString().toLowerCase().trim() === selClass.standard.toString().toLowerCase().trim() &&
           m.section.toString().toLowerCase().trim() === selClass.section.toString().toLowerCase().trim());
        return teacherMatches && classMatches;
      });

      if (matchedMapping) {
        const candSub = subjects.find(s =>
          (matchedMapping.subjectId && (s._id?.toString() === matchedMapping.subjectId.toString() || s.id?.toString() === matchedMapping.subjectId.toString())) ||
          (matchedMapping.subjectName && s.name?.toLowerCase().trim() === matchedMapping.subjectName.toLowerCase().trim()) ||
          (matchedMapping.subject?.name && s.name?.toLowerCase().trim() === matchedMapping.subject.name.toLowerCase().trim())
        );
        if (candSub) {
          setEditCellSubjectId(candSub._id || candSub.id);
          toast.success(`Assigned subject: ${candSub.name}`, { id: 'auto-mapped-sub' });
        }
      }
    }
  };

  const handleSaveCell = async () => {
    if (!editCellClassId) {
      toast.error('Please select a class');
      return;
    }
    if (!editCellSubjectId) {
      toast.error('Please select a subject');
      return;
    }
    if (!editCellTeacherId) {
      toast.error('Please select a teacher');
      return;
    }

    // Teacher Conflict Validation
    const teacherConflict = weeklyTimetable.find(e => {
      if (editCellEntryId && (e._id?.toString() === editCellEntryId.toString() || e.id?.toString() === editCellEntryId.toString())) return false;
      const tid = e.teacherId || e.teacher?._id || e.teacher?.id || e.teacher;
      const selTeacher = employees.find(t => (t._id && t._id.toString() === editCellTeacherId.toString()) || (t.id && t.id.toString() === editCellTeacherId.toString()));
      const tidMatches = (tid && tid.toString() === editCellTeacherId.toString()) ||
        (selTeacher && (
          (e.teacherName && e.teacherName.toLowerCase().trim() === selTeacher.name.toLowerCase().trim()) ||
          (typeof e.teacher === 'string' && e.teacher.toLowerCase().trim() === selTeacher.name.toLowerCase().trim()) ||
          (e.teacher?.name && e.teacher.name.toLowerCase().trim() === selTeacher.name.toLowerCase().trim())
        ));
      return tidMatches && e.day === editCellDay && Number(e.period) === Number(editCellPeriod);
    });

    if (teacherConflict) {
      const conflictClass = teacherConflict.class ? `Class ${teacherConflict.class.standard}-${teacherConflict.class.section}` : `${teacherConflict.standard}-${teacherConflict.section}`;
      const proceed = window.confirm(
        `Schedule Notice:\nThis educator is currently scheduled in ${conflictClass} on ${editCellDay} Period ${editCellPeriod}.\n\nAs Principal/Admin, do you want to proceed and save this slot anyway?`
      );
      if (!proceed) {
        return;
      }
    }

    setIsSavingCell(true);
    try {
      const pInfo = calculatedPeriods.find(p => Number(p.period) === Number(editCellPeriod)) || { timeSlot: '09:00-09:45' };
      const payload = {
        id: editCellEntryId || undefined,
        classId: editCellClassId,
        day: editCellDay,
        period: Number(editCellPeriod),
        timeSlot: pInfo.timeSlot,
        teacherId: editCellTeacherId,
        subjectId: editCellSubjectId
      };

      const res = await createTimetableEntry(payload);
      if (res?.status) {
        toast.success(editCellEntryId ? 'Timetable slot updated successfully!' : 'Timetable slot saved successfully!');
        setShowEditCellModal(false);
        fetchTimetable();
      } else {
        toast.error(res?.message || 'Failed to save timetable slot');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error saving timetable slot');
      console.error(err);
    } finally {
      setIsSavingCell(false);
    }
  };

  const handleDeleteCell = async (id) => {
    if (!window.confirm('Are you sure you want to delete this timetable slot?')) return;
    try {
      const res = await deleteTimetableEntry(id);
      if (res?.status) {
        toast.success('Slot deleted successfully');
        fetchTimetable();
      } else {
        toast.error('Failed to delete slot');
      }
    } catch (err) {
      toast.error('Error deleting slot');
      console.error(err);
    }
  };

  const handleAutoGenerateTimetable = async () => {
    let activeMappings = [];
    if (selectedViewType === 'class') {
      if (!selectedClassForGrid) return toast.error("Please select a class first");
      const selClass = classes.find(c => (c._id && c._id.toString() === selectedClassForGrid.toString()) || (c.id && c.id.toString() === selectedClassForGrid.toString()));
      activeMappings = mappings.filter(m => {
        const cid = m.class?._id || m.class?.id || m.classId || m.class;
        const matchId = (cid && cid.toString() === selectedClassForGrid.toString());
        const matchStdSec = Boolean(
          selClass && m.standard && m.section &&
          m.standard.toString().toLowerCase().trim() === selClass.standard.toString().toLowerCase().trim() &&
          m.section.toString().toLowerCase().trim() === selClass.section.toString().toLowerCase().trim()
        );
        return matchId || matchStdSec;
      });
    } else {
      if (!selectedTeacherForGrid) return toast.error("Please select a teacher first");
      const selTeacher = employees.find(t => (t._id && t._id.toString() === selectedTeacherForGrid.toString()) || (t.id && t.id.toString() === selectedTeacherForGrid.toString()));
      activeMappings = mappings.filter(m => {
        const tid = m.teacher?._id || m.teacher?.id || m.teacherId || m.teacher;
        const matchId = (tid && tid.toString() === selectedTeacherForGrid.toString());
        const matchName = Boolean(
          selTeacher && (
            (m.teacherName && m.teacherName.toString().toLowerCase().trim() === selTeacher.name.toString().toLowerCase().trim()) ||
            (m.teacher?.name && m.teacher.name.toString().toLowerCase().trim() === selTeacher.name.toString().toLowerCase().trim())
          )
        );
        return matchId || matchName;
      });
    }

    if (activeMappings.length === 0) {
      return toast.error("No mappings found for this selection. Please map subjects & educators in 'Mappings' first.");
    }

    if (!window.confirm("Auto-generate a conflict-free weekly timetable from active mappings? This will fill empty slots.")) return;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let mappingIndex = 0;
    let createdCount = 0;

    for (const d of days) {
      for (const p of calculatedPeriods) {
        if (p.isBreak) continue;

        let isExisting = false;
        if (selectedViewType === 'class') {
          const selClass = classes.find(c => (c._id && c._id.toString() === selectedClassForGrid.toString()) || (c.id && c.id.toString() === selectedClassForGrid.toString()));
          isExisting = weeklyTimetable.some(e => {
            const cid = e.class?._id || e.class?.id || e.classId || e.class;
            const matchId = (cid && cid.toString() === selectedClassForGrid.toString());
            const matchStdSec = Boolean(
              selClass && e.standard && e.section &&
              e.standard.toString().toLowerCase().trim() === selClass.standard.toString().toLowerCase().trim() &&
              e.section.toString().toLowerCase().trim() === selClass.section.toString().toLowerCase().trim()
            );
            return (matchId || matchStdSec) && e.day === d && Number(e.period) === Number(p.period);
          });
        } else {
          const selTeacher = employees.find(t => (t._id && t._id.toString() === selectedTeacherForGrid.toString()) || (t.id && t.id.toString() === selectedTeacherForGrid.toString()));
          isExisting = weeklyTimetable.some(e => {
            const tid = e.teacher?._id || e.teacher?.id || e.teacherId || e.teacher;
            const matchId = (tid && tid.toString() === selectedTeacherForGrid.toString());
            const matchName = Boolean(
              selTeacher && (
                (e.teacherName && e.teacherName.toString().toLowerCase().trim() === selTeacher.name.toString().toLowerCase().trim()) ||
                (typeof e.teacher === 'string' && e.teacher.toString().toLowerCase().trim() === selTeacher.name.toString().toLowerCase().trim()) ||
                (e.teacher?.name && e.teacher.name.toString().toLowerCase().trim() === selTeacher.name.toString().toLowerCase().trim())
              )
            );
            return (matchId || matchName) && e.day === d && Number(e.period) === Number(p.period);
          });
        }

        if (isExisting) continue;

        let tries = 0;
        let foundMapping = null;

        while (tries < activeMappings.length) {
          const candidate = activeMappings[(mappingIndex + tries) % activeMappings.length];
          
          // Resolve candidate teacher
          const candTeacher = employees.find(t => 
            (candidate.teacherId && (t._id?.toString() === candidate.teacherId.toString() || t.id?.toString() === candidate.teacherId.toString())) ||
            (candidate.teacherName && t.name?.toLowerCase().trim() === candidate.teacherName.toLowerCase().trim()) ||
            (candidate.teacher?.name && t.name?.toLowerCase().trim() === candidate.teacher.name.toLowerCase().trim())
          );
          const candTeacherId = candTeacher?._id || candTeacher?.id || candidate.teacherId || candidate.teacher?._id;

          // Resolve candidate class
          const candCls = classes.find(c => 
            (candidate.classId && (c._id?.toString() === candidate.classId.toString() || c.id?.toString() === candidate.classId.toString())) ||
            (candidate.standard && candidate.section &&
             c.standard?.toLowerCase().trim() === candidate.standard.toLowerCase().trim() &&
             c.section?.toLowerCase().trim() === candidate.section.toLowerCase().trim())
          );
          const candClassId = candCls?._id || candCls?.id || candidate.classId || candidate.class?._id;

          // Resolve candidate subject
          const candSub = subjects.find(s => 
            (candidate.subjectId && (s._id?.toString() === candidate.subjectId.toString() || s.id?.toString() === candidate.subjectId.toString())) ||
            (candidate.subjectName && s.name?.toLowerCase().trim() === candidate.subjectName.toLowerCase().trim()) ||
            (candidate.subject?.name && s.name?.toLowerCase().trim() === candidate.subject.name.toLowerCase().trim())
          );
          const candSubjectId = candSub?._id || candSub?.id || candidate.subjectId || candidate.subject?._id;

          if (candTeacherId && candClassId && candSubjectId) {
            // Check teacher conflict at this day & period
            const hasTeacherConflict = weeklyTimetable.some(e => {
              const tid = e.teacherId || e.teacher?._id || e.teacher?.id || e.teacher;
              const tidMatch = (tid && tid.toString() === candTeacherId.toString()) ||
                (candTeacher && (
                  (e.teacherName && e.teacherName.toLowerCase().trim() === candTeacher.name.toLowerCase().trim()) ||
                  (typeof e.teacher === 'string' && e.teacher.toLowerCase().trim() === candTeacher.name.toLowerCase().trim())
                ));
              return tidMatch && e.day === d && Number(e.period) === Number(p.period);
            });

            // Check class conflict at this day & period
            const hasClassConflict = weeklyTimetable.some(e => {
              const cid = e.classId || e.class?._id || e.class?.id || e.class;
              const cidMatch = (cid && cid.toString() === candClassId.toString()) ||
                (candCls && e.standard && e.section &&
                 e.standard.toLowerCase().trim() === candCls.standard.toLowerCase().trim() &&
                 e.section.toLowerCase().trim() === candCls.section.toLowerCase().trim());
              return cidMatch && e.day === d && Number(e.period) === Number(p.period);
            });

            if (!hasTeacherConflict && !hasClassConflict) {
              foundMapping = {
                teacherId: candTeacherId,
                classId: candClassId,
                subjectId: candSubjectId
              };
              mappingIndex = (mappingIndex + tries + 1) % activeMappings.length;
              break;
            }
          }

          tries++;
        }

        if (foundMapping) {
          try {
            await createTimetableEntry({
              classId: foundMapping.classId,
              day: d,
              period: Number(p.period),
              timeSlot: p.timeSlot,
              teacherId: foundMapping.teacherId,
              subjectId: foundMapping.subjectId
            });
            createdCount++;
          } catch (err) {
            console.error("Failed to auto-create timetable entry:", err);
          }
        }
      }
    }

    if (createdCount > 0) {
      toast.success(`Successfully auto-generated ${createdCount} conflict-free timetable slots!`);
      fetchTimetable();
    } else {
      toast.info("No new slots created. (All periods already filled or no conflict-free slots available).");
    }
  };

  const [govtUploading, setGovtUploading] = useState(false);
  const [insUploading, setInsUploading] = useState(false);

  const handleDocumentUpload = async (e, docType) => {
    if (!selectedUserDashboard) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (docType === 'govt_id') {
      setGovtUploading(true);
    } else {
      setInsUploading(true);
    }

    try {
      const res = await uploadEmployeeDocument(selectedUserDashboard._id, docType, file);
      if (res.status) {
        toast.success(`${docType === 'govt_id' ? 'Government ID' : 'Insurance document'} uploaded successfully!`);
        
        const updatedFilename = file.name;
        
        // Update local list state so it syncs immediately without reload
        setEmployees(prev => prev.map(emp => emp._id === selectedUserDashboard._id ? {
          ...emp,
          [`${docType}_filename`]: updatedFilename
        } : emp));
        
        // Update selectedUserDashboard state as well
        setSelectedUserDashboard(prev => prev ? {
          ...prev,
          [`${docType}_filename`]: updatedFilename
        } : null);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to upload document');
    } finally {
      if (docType === 'govt_id') {
        setGovtUploading(false);
      } else {
        setInsUploading(false);
      }
    }
  };

  const handleDocumentDownload = async (docType, filename) => {
    if (!selectedUserDashboard) return;
    try {
      await downloadEmployeeDocument(selectedUserDashboard._id, docType, filename);
      toast.success("Document download started!");
    } catch (err) {
      toast.error("Failed to download document");
    }
  };

  // Daily Status Monitor States
  const [dailyStatusDate, setDailyStatusDate] = useState(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD
  const [dailyStatusData, setDailyStatusData] = useState([]);
  const [dailyStatusLoading, setDailyStatusLoading] = useState(false);
  const [dailySearchQuery, setDailySearchQuery] = useState('');

  const fetchDailyStatus = useCallback(async (dateStr) => {
    try {
      setDailyStatusLoading(true);
      const res = await getDailyStatus(dateStr);
      if (res?.status && Array.isArray(res.data)) {
        setDailyStatusData(res.data);
      } else {
        setDailyStatusData([]);
      }
    } catch (err) {
      toast.error('Failed to load daily status');
      setDailyStatusData([]);
    } finally {
      setDailyStatusLoading(false);
    }
  }, []);

  const processEmployeeData = useCallback((data) => {
    if (!data) return [];
    let rawList = [];
    if (Array.isArray(data)) {
      rawList = data;
    } else if (data.teachers && Array.isArray(data.teachers)) {
      rawList = data.teachers;
    } else if (data.employees && Array.isArray(data.employees)) {
      rawList = data.employees;
    }
    const roleCounters = { teacher: 0, staff: 0, admin: 0, user: 0 };
    return rawList.map(t => {
      const role = t.role || (t.user?.role || 'teacher');
      let roleKey = role.toLowerCase();
      if (roleCounters[roleKey] === undefined) roleCounters[roleKey] = 0;
      roleCounters[roleKey] += 1;
      const countNum = roleCounters[roleKey];

      let rawId = t.employeeId || t.employee_id || '';
      let formattedId = rawId;

      if (rawId.includes('918827') || /shrujay/i.test(t.name || '')) {
        formattedId = 'TCH-007';
      } else if (t.email?.toLowerCase() === 'admin@qelvora.in') {
        formattedId = 'ADM001';
      } else if (!rawId || (rawId.startsWith('EMP') && roleKey !== 'user')) {
        let prefix = 'EMP';
        if (roleKey === 'teacher') prefix = 'TCH';
        else if (roleKey === 'admin' || roleKey === 'super_admin' || roleKey === 'principal') prefix = 'ADM';
        else if (roleKey === 'staff' || roleKey === 'non-teaching') prefix = 'STF';
        
        formattedId = `${prefix}${String(countNum).padStart(3, '0')}`;
      } else if (/([A-Za-z]+[-_]?)(\d{4,})/.test(rawId)) {
        formattedId = rawId.replace(/([A-Za-z]+[-_]?)(\d+)/, (match, prefix, num) => {
          return `${prefix}${num.slice(-3).padStart(3, '0')}`;
        });
      }

      const isSuper = roleKey === 'admin' || roleKey === 'super_admin' || t.user?.role === 'super_admin' || t.user?.role === 'admin (permanent)' || t.email?.toLowerCase() === 'rajabhaxa@gmail.com';

      return {
        _id: t._id,
        employeeId: formattedId,
        employee_id: formattedId,
        name: t.name || '',
        email: t.email || '',
        phone: t.phone || '',
        qualification: t.qualification || 'N/A',
        experience: t.experience || 0,
        status: t.status || 'Active',
        primary_subject: t.primary_subject || '',
        secondary_subject: t.secondary_subject || '',
        skip_face: t.skip_face !== undefined ? t.skip_face : (t.user?.skip_face || false),
        skip_location: t.skip_location !== undefined ? t.skip_location : (t.user?.skip_location || false),
        is_enabled: t.is_enabled !== undefined ? t.is_enabled : (t.user?.isActive !== false),
        role: role,
        is_super_admin: isSuper,
        user: t.user
      };
    });
  }, []);

  const handleUserClick = async (db_id) => {
    let empList = employees;
    if (!empList || empList.length === 0) {
      try {
        const res = await getAdminEmployees();
        empList = processEmployeeData(res?.data);
        setEmployees(empList);
        setOriginalEmployees(JSON.parse(JSON.stringify(empList)));
      } catch (err) {
        toast.error('Failed to load user details');
        return;
      }
    }
    const fullEmp = empList.find(e => e._id === db_id || e.employeeId === db_id || e.employee_id === db_id || e.name === db_id);
    if (fullEmp) {
      setSelectedUserDashboard(fullEmp);
    } else {
      toast.error('User details not found');
    }
  };

  const fetchEmployees = useCallback(async () => {
    try {
      setEmpLoading(true);
      const res = await getAdminEmployees();
      if (res?.data) {
        const processed = processEmployeeData(res.data);
        setEmployees(processed);
        setOriginalEmployees(JSON.parse(JSON.stringify(processed)));
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load employees');
    } finally {
      setEmpLoading(false);
    }
  }, [processEmployeeData]);

  const fetchRoles = useCallback(async () => {
    try {
      setRolesLoading(true);
      const res = await getRoles();
      if (res?.data) {
        setRoles(res.data);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load roles');
    } finally {
      setRolesLoading(false);
    }
  }, []);

  // Helper to dynamically get roles fetched EXCLUSIVELY from the Role Section
  const getMergedRoleOptions = useCallback((rolesList, currentAssignedRole = '') => {
    const activeRolesFromSection = [];
    const roleNamesSeen = new Set();

    if (Array.isArray(rolesList) && rolesList.length > 0) {
      rolesList.forEach(r => {
        // Exclude inactive roles UNLESS it is currently assigned to the user being edited
        const activeFlag = r.isActive !== undefined ? r.isActive : (r.isEnabled !== undefined ? r.isEnabled : true);
        const val = r.Rolename || r.roleName || r.name;
        
        if (!val) return;

        const isCurrentlyAssigned = currentAssignedRole && currentAssignedRole.toLowerCase() === val.toLowerCase();
        
        if (activeFlag !== false || isCurrentlyAssigned) {
          if (!roleNamesSeen.has(val.toLowerCase())) {
            roleNamesSeen.add(val.toLowerCase());
            activeRolesFromSection.push({ 
              code: val, 
              name: activeFlag === false ? `${val} (Inactive)` : val 
            });
          }
        }
      });
    }
    
    // Always guarantee Teacher is available in the options
    if (!roleNamesSeen.has('teacher')) {
      roleNamesSeen.add('teacher');
      activeRolesFromSection.push({ code: 'Teacher', name: 'Teacher' });
    }

    // If active roles exist in Role Section, return roles from the Role Section plus Admin
    if (activeRolesFromSection.length > 0) {
      // If the employee's current role is not in the active roles list, include it so selection isn't lost
      if (currentAssignedRole && !roleNamesSeen.has(currentAssignedRole.toLowerCase())) {
        const formattedAssigned = currentAssignedRole.charAt(0).toUpperCase() + currentAssignedRole.slice(1);
        activeRolesFromSection.unshift({
          code: currentAssignedRole,
          name: formattedAssigned
        });
      }
      if (!roleNamesSeen.has('admin') && (currentAssignedRole || '').toLowerCase() !== 'admin') {
        activeRolesFromSection.push({
          code: 'Admin',
          name: 'Admin'
        });
      }
      return activeRolesFromSection;
    }

    // Fallback only if no roles exist in Role Section yet
    return [
      { code: 'Teacher', name: 'Teacher' },
      { code: 'Admin', name: 'Admin' },
      { code: 'Employee', name: 'Employee' }
    ];
  }, []);

  const fetchConsolidated = async () => {
    try { setReportLoading(true); const res = await getConsolidatedReport(reportMonth, reportYear, deptFilter);
      if (res?.data) setConsolidated(res.data);
    } catch (err) { toast.error(err?.response?.data?.detail || 'Failed'); } finally { setReportLoading(false); }
  };

  const fetchDetails = async () => {
    try { setReportLoading(true); const res = await getDetailsReport(reportMonth, reportYear, '', deptFilter);
      if (res?.data) setDetails(res.data);
    } catch (err) { toast.error(err?.response?.data?.detail || 'Failed'); } finally { setReportLoading(false); }
  };

  const fetchConsolidatedSilent = async () => {
    try { const res = await getConsolidatedReport(reportMonth, reportYear, deptFilter); if (res?.data) setConsolidated(res.data); } catch (err) {}
  };

  const fetchDetailsSilent = async () => {
    try { const res = await getDetailsReport(reportMonth, reportYear, '', deptFilter); if (res?.data) setDetails(res.data); } catch (err) {}
  };

  // School Entities Loaders
  const fetchClasses = useCallback(async () => {
    try {
      setClassesLoading(true);
      const res = await getClasses();
      if (res?.status && res?.data) {
        setClasses(res.data);
      } else if (Array.isArray(res)) {
        setClasses(res);
      } else if (res?.data && Array.isArray(res.data)) {
        setClasses(res.data);
      }
    } catch (err) {
      toast.error('Failed to load classes');
    } finally {
      setClassesLoading(false);
    }
  }, []);

  const handleStartEditClass = (cls) => {
    setEditingClass(cls);
    setClassStandard(cls.standard);
    setClassSection(cls.section);
    setClassBoard(cls.board || 'CBSE');
    setClassTeacherId(cls.classTeacher?._id || cls.classTeacherId || '');
    setClassRoomNumber(cls.roomNumber || '');
    setClassStrength(cls.strength || 35);
    window.scrollTo({ top: 300, behavior: 'smooth' });
    toast.success(`Editing Class ${cls.standard}-${cls.section}`);
  };

  const handleCancelEditClass = () => {
    setEditingClass(null);
    setClassStandard('1st');
    setClassSection('A');
    setClassBoard(settings.board || 'CBSE');
    setClassTeacherId('');
    setClassRoomNumber('');
    setClassStrength(35);
  };

  const handleSaveClassSubmit = async (e) => {
    e.preventDefault();
    if (!classSection.trim()) return toast.error("Section name is required");
    setIsSavingClass(true);
    try {
      const payload = {
        standard: classStandard,
        section: classSection.trim().toUpperCase(),
        board: classBoard || settings.board || 'CBSE',
        classTeacherId: classTeacherId || undefined,
        classTeacher: classTeacherId || undefined,
        roomNumber: classRoomNumber.trim() || undefined,
        strength: parseInt(classStrength) >= 0 ? parseInt(classStrength) : 35
      };

      if (editingClass) {
        const classId = editingClass.id || editingClass._id;
        await updateClass(classId, payload);
        toast.success(`Class ${payload.standard}-${payload.section} updated successfully!`);
        handleCancelEditClass();
      } else {
        await createClass(payload);
        toast.success(`Class ${payload.standard}-${payload.section} created successfully!`);
        setClassSection('A');
        setClassTeacherId('');
        setClassRoomNumber('');
        setClassStrength(35);
      }
      fetchClasses();
    } catch (err) {
      console.error('Save class error:', err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to save class");
    } finally {
      setIsSavingClass(false);
    }
  };

  const handleConfirmDeleteClass = async () => {
    if (!deletingClass) return;
    setIsDeletingClass(true);
    try {
      const classId = deletingClass.id || deletingClass._id;
      await deleteClass(classId);
      toast.success(`Class ${deletingClass.standard}-${deletingClass.section} deleted successfully!`);
      setIsDeleteClassModalOpen(false);
      setDeletingClass(null);
      if (editingClass && (editingClass.id === classId || editingClass._id === classId)) {
        handleCancelEditClass();
      }
      fetchClasses();
    } catch (err) {
      console.error('Delete class error:', err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete class");
    } finally {
      setIsDeletingClass(false);
    }
  };

  const fetchSubjects = useCallback(async () => {
    try {
      setSubjectsLoading(true);
      const res = await getSubjects();
      if (res?.status && res?.data) {
        setSubjects(res.data);
      } else if (Array.isArray(res)) {
        setSubjects(res);
      } else if (res?.data && Array.isArray(res.data)) {
        setSubjects(res.data);
      }
    } catch (err) {
      toast.error('Failed to load subjects');
    } finally {
      setSubjectsLoading(false);
    }
  }, []);

  const handleSelectClassForSubject = (stdOrClassId) => {
    if (!stdOrClassId || stdOrClassId === 'all' || stdOrClassId === 'All' || stdOrClassId === 'none') {
      setSubjectForm(prev => ({
        ...prev,
        classId: '',
        standard: (stdOrClassId === 'all' || stdOrClassId === 'All') ? 'All' : '',
        section: '',
        board: settings?.board || 'CBSE'
      }));
      return;
    }
    const matchedStd = uniqueClassStandards.find(u => u.standard === stdOrClassId);
    if (matchedStd) {
      setSubjectForm(prev => {
        const prefix = prev.name ? prev.name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() : 'SUB';
        const generatedCode = `${prefix}-${matchedStd.standard}`;
        return {
          ...prev,
          classId: '',
          standard: matchedStd.standard,
          section: '',
          board: matchedStd.board || settings?.board || 'CBSE',
          code: prev.code ? prev.code : generatedCode
        };
      });
      return;
    }
    const cls = classes.find(c => (c.id === stdOrClassId || c._id === stdOrClassId));
    if (cls) {
      setSubjectForm(prev => {
        const prefix = prev.name ? prev.name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() : 'SUB';
        const generatedCode = `${prefix}-${cls.standard}`;
        return {
          ...prev,
          classId: cls.id || cls._id,
          standard: cls.standard,
          section: '',
          board: cls.board || settings?.board || 'CBSE',
          code: prev.code ? prev.code : generatedCode
        };
      });
    }
  };

  const handleStartEditSubject = (sub) => {
    setEditingSubject(sub);
    let matchedClassId = sub.classId || '';
    if (!matchedClassId && sub.standard) {
      const match = classes.find(c => c.standard === sub.standard && (!sub.section || c.section === sub.section));
      if (match) matchedClassId = match.id || match._id;
    }
    setSubjectForm({
      name: sub.name || '',
      code: sub.code || '',
      classId: matchedClassId,
      standard: sub.standard || '',
      section: sub.section || '',
      board: sub.board || 'CBSE',
      type: sub.type || 'Core',
      weeklyHours: sub.weeklyHours || 4
    });
    toast.success(`Editing subject "${sub.name}"`);
  };

  const handleCancelEditSubject = () => {
    setEditingSubject(null);
    setSubjectForm({
      name: '',
      code: '',
      classId: '',
      standard: '',
      section: '',
      board: 'CBSE',
      type: 'Core',
      weeklyHours: 4
    });
  };

  const handleSaveSubjectSubmit = async (e) => {
    e.preventDefault();
    if (!subjectForm.name.trim()) return toast.error("Subject name is required");
    setIsSavingSubject(true);
    try {
      const payload = {
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim() || undefined,
        classId: subjectForm.classId || undefined,
        standard: subjectForm.standard || undefined,
        section: subjectForm.section || undefined,
        board: subjectForm.board || 'CBSE',
        type: subjectForm.type || 'Core',
        weeklyHours: parseInt(subjectForm.weeklyHours, 10) || 4
      };

      if (editingSubject) {
        const subId = editingSubject.id || editingSubject._id;
        await updateSubject(subId, payload);
        toast.success(`Subject "${payload.name}" updated successfully!`);
        handleCancelEditSubject();
      } else {
        await createSubject(payload);
        toast.success(`Subject "${payload.name}" created successfully!`);
        setSubjectForm(prev => ({
          ...prev,
          name: '',
          code: ''
        }));
      }
      fetchSubjects();
    } catch (err) {
      console.error('Save subject error:', err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to save subject");
    } finally {
      setIsSavingSubject(false);
    }
  };

  const handleConfirmDeleteSubject = async () => {
    if (!deletingSubject) return;
    setIsDeletingSubject(true);
    try {
      const subId = deletingSubject.id || deletingSubject._id;
      await deleteSubject(subId);
      toast.success(`Subject "${deletingSubject.name}" deleted successfully!`);
      setIsDeleteSubjectModalOpen(false);
      setDeletingSubject(null);
      if (editingSubject && (editingSubject.id === subId || editingSubject._id === subId)) {
        handleCancelEditSubject();
      }
      fetchSubjects();
    } catch (err) {
      console.error('Delete subject error:', err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete subject");
    } finally {
      setIsDeletingSubject(false);
    }
  };

  const fetchMappings = useCallback(async () => {
    try {
      setMappingsLoading(true);
      const res = await getMappings();
      if (res?.status && res?.data) {
        setMappings(res.data);
      } else if (Array.isArray(res)) {
        setMappings(res);
      } else if (res?.data && Array.isArray(res.data)) {
        setMappings(res.data);
      }
    } catch (err) {
      toast.error('Failed to load mappings');
    } finally {
      setMappingsLoading(false);
    }
  }, []);

  const handleStartEditMapping = (map) => {
    setEditingMapping(map);
    let matchedTeacherId = map.teacherId || '';
    if (!matchedTeacherId && map.teacher?.name) {
      const match = (Array.isArray(employees) ? employees : []).find(e => e.name === map.teacher?.name);
      if (match) matchedTeacherId = match._id || match.id;
    }
    let matchedClassId = map.classId || '';
    if (!matchedClassId && map.class?.standard) {
      const match = classes.find(c => c.standard === map.class.standard && (!map.class.section || c.section === map.class.section));
      if (match) matchedClassId = match.id || match._id;
    }
    let matchedSubjectId = map.subjectId || '';
    if (!matchedSubjectId && (map.subject?.name || map.subject)) {
      const subName = map.subject?.name || map.subject;
      const match = subjects.find(s => s.name === subName);
      if (match) matchedSubjectId = match.id || match._id;
    }

    setMappingForm({
      teacherId: matchedTeacherId,
      classId: matchedClassId,
      subjectId: matchedSubjectId
    });
    toast.success(`Editing assignment for ${map.teacher?.name || 'teacher'}`);
  };

  const handleCancelEditMapping = () => {
    setEditingMapping(null);
    setMappingForm({
      teacherId: '',
      classId: '',
      subjectId: ''
    });
  };

  const handleSaveMappingSubmit = async (e) => {
    e.preventDefault();
    if (!mappingForm.teacherId || !mappingForm.classId || !mappingForm.subjectId) {
      return toast.error("Teacher, Class, and Subject are all required");
    }
    setIsSavingMapping(true);
    try {
      const payload = {
        teacherId: mappingForm.teacherId,
        classId: mappingForm.classId,
        subjectId: mappingForm.subjectId
      };

      if (editingMapping) {
        const mapId = editingMapping.id || editingMapping._id;
        await updateMapping(mapId, payload);
        toast.success("Assignment updated successfully!");
        handleCancelEditMapping();
      } else {
        await createMapping(payload);
        toast.success("Assignment created successfully!");
        setMappingForm({
          teacherId: '',
          classId: '',
          subjectId: ''
        });
      }
      fetchMappings();
    } catch (err) {
      console.error('Save mapping error:', err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to save assignment");
    } finally {
      setIsSavingMapping(false);
    }
  };

  const handleConfirmDeleteMapping = async () => {
    if (!deletingMapping) return;
    setIsDeletingMapping(true);
    try {
      const mapId = deletingMapping.id || deletingMapping._id;
      await deleteMapping(mapId);
      toast.success("Assignment removed successfully!");
      setIsDeleteMappingModalOpen(false);
      setDeletingMapping(null);
      if (editingMapping && (editingMapping.id === mapId || editingMapping._id === mapId)) {
        handleCancelEditMapping();
      }
      fetchMappings();
    } catch (err) {
      console.error('Delete mapping error:', err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to remove assignment");
    } finally {
      setIsDeletingMapping(false);
    }
  };

  useEffect(() => {
    if (classes.length > 0 && !selectedClassForGrid) {
      setSelectedClassForGrid(classes[0]._id);
    }
  }, [classes, selectedClassForGrid]);

  useEffect(() => {
    if (employees.length > 0 && !selectedTeacherForGrid) {
      const firstTeacher = employees.find(e => e.role === 'teacher' || e.role === 'user');
      if (firstTeacher) {
        setSelectedTeacherForGrid(firstTeacher._id);
      } else {
        setSelectedTeacherForGrid(employees[0]._id);
      }
    }
  }, [employees, selectedTeacherForGrid]);

  useEffect(() => { 
    if (activeTab === 'settings') fetchEmployees();
    if (activeTab === 'consolidated') fetchConsolidated(); 
    if (activeTab === 'details' || activeTab === 'individual_details') fetchDetails(); 
    if (activeTab === 'employees') {
      fetchEmployees();
      fetchRoles();
    }
    if (activeTab === 'roles') fetchRoles(); 
    if (activeTab === 'daily_status') fetchDailyStatus(dailyStatusDate);
    if (activeTab === 'classes') {
      fetchClasses();
      fetchEmployees();
    }
    if (activeTab === 'subjects') {
      fetchSubjects();
      fetchClasses();
    }
    if (activeTab === 'mappings') {
      fetchMappings();
      fetchClasses();
      fetchSubjects();
      fetchEmployees();
    }
    if (activeTab === 'timetable') {
      fetchTimetable();
      fetchMappings();
      fetchClasses();
      fetchSubjects();
      fetchEmployees();
    }
  }, [activeTab, reportMonth, reportYear, deptFilter, dailyStatusDate, fetchDailyStatus, fetchRoles, fetchEmployees, fetchClasses, fetchSubjects, fetchMappings, fetchTimetable]);

  // Real-time polling every 15 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (activeTab === 'consolidated') fetchConsolidatedSilent();
      else if (activeTab === 'details' || activeTab === 'individual_details') fetchDetailsSilent();
      else if (activeTab === 'employees') {
        getAdminEmployees().then(res => { if (res?.data) setEmployees(processEmployeeData(res.data)); }).catch(() => {});
      } else if (activeTab === 'daily_status') {
        getDailyStatus(dailyStatusDate).then(res => { if (res?.status && Array.isArray(res.data)) setDailyStatusData(res.data); }).catch(() => {});
      }
    }, 15000);
    return () => clearInterval(pollInterval);
  }, [activeTab, reportMonth, reportYear, deptFilter, dailyStatusDate, processEmployeeData]);

  const fetchAdminVideos = useCallback(async () => {
    try {
      setLoadingVideos(true);
      const res = await getVideos();
      if (res?.status && Array.isArray(res.data)) {
        setAdminVideos(res.data);
      }
    } catch (err) {
      console.error('Failed to load videos:', err);
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  const fetchAdminFeedbackList = useCallback(async (searchVal = '') => {
    try {
      setLoadingAdminFeedback(true);
      const res = await getAdminFeedbackAll({ search: searchVal });
      if (res?.status) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.feedback || []);
        setAdminFeedback(list);
        if (res.data?.summary) {
          setFeedbackSummary(res.data.summary);
        } else {
          const total = list.length;
          const sum = list.reduce((a, b) => a + (Number(b.rating) || 5), 0);
          const avg = total > 0 ? parseFloat((sum / total).toFixed(1)) : 5.0;
          const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          let sCount = 0, pCount = 0, sSum = 0, pSum = 0, pos = 0;
          list.forEach(f => {
            const r = Math.max(1, Math.min(5, Math.round(f.rating || 5)));
            counts[r] = (counts[r] || 0) + 1;
            if (f.rating >= 4) pos++;
            if ((f.evaluatorType || '').toLowerCase() === 'parent') {
              pCount++; pSum += (Number(f.rating) || 5);
            } else {
              sCount++; sSum += (Number(f.rating) || 5);
            }
          });
          setFeedbackSummary({
            averageRating: avg,
            totalReviews: total,
            starCounts: counts,
            starPercentages: {
              5: total > 0 ? Math.round((counts[5] / total) * 100) : 0,
              4: total > 0 ? Math.round((counts[4] / total) * 100) : 0,
              3: total > 0 ? Math.round((counts[3] / total) * 100) : 0,
              2: total > 0 ? Math.round((counts[2] / total) * 100) : 0,
              1: total > 0 ? Math.round((counts[1] / total) * 100) : 0,
            },
            studentReviewsCount: sCount,
            parentReviewsCount: pCount,
            avgStudentRating: sCount > 0 ? parseFloat((sSum / sCount).toFixed(1)) : 5.0,
            avgParentRating: pCount > 0 ? parseFloat((pSum / pCount).toFixed(1)) : 5.0,
            positivePercentage: total > 0 ? Math.round((pos / total) * 100) : 100
          });
        }
      }
    } catch (err) {
      console.error('Failed to load feedback:', err);
    } finally {
      setLoadingAdminFeedback(false);
    }
  }, []);

  const handleDeleteFeedback = async (id) => {
    if (!window.confirm('Are you sure you want to delete this evaluation record?')) return;
    try {
      const res = await deleteFeedback(id, 'admin');
      if (res?.status) {
        toast.success('Evaluation deleted successfully');
        fetchAdminFeedbackList(feedbackSearch);
      } else {
        toast.error(res?.message || 'Failed to delete evaluation');
      }
    } catch (err) {
      toast.error(err.message || 'Error deleting evaluation');
    }
  };

  const handleOpenAddFeedbackModal = () => {
    setAddFeedbackForm({
      teacherName: teachersList[0]?.name || 'Dr. Rajesh Sharma',
      evaluatorType: 'Student',
      studentName: '',
      parentName: '',
      rollNumber: '',
      standard: classesList[0]?.standard || '10th',
      section: classesList[0]?.section || 'A',
      subject: subjectsList[0]?.name || 'Mathematics',
      rating: 5,
      feedback: ''
    });
    setShowAddFeedbackModal(true);
  };

  const handleSubmitEvaluationModal = async (e) => {
    e.preventDefault();
    if (!addFeedbackForm.feedback.trim()) {
      toast.error('Please enter evaluation comments or suggestions.');
      return;
    }
    try {
      setIsSubmittingFeedback(true);
      const res = await submitFeedback(addFeedbackForm, 'admin');
      if (res?.status) {
        toast.success('Evaluation submitted successfully!');
        setShowAddFeedbackModal(false);
        fetchAdminFeedbackList(feedbackSearch);
      } else {
        toast.error(res?.message || 'Failed to submit evaluation');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit evaluation');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const fetchClassSessionsList = useCallback(async () => {
    try {
      setLoadingClassSessions(true);
      const res = await getClassSessions();
      if (res?.status && Array.isArray(res.data)) {
        setClassSessions(res.data);
      }
    } catch (err) {
      console.error('Failed to load class sessions:', err);
    } finally {
      setLoadingClassSessions(false);
    }
  }, []);

  const handleConcludeSession = async (sessionId) => {
    if (!sessionId) return;
    try {
      const res = await concludeClassSession(sessionId);
      if (res?.status) {
        toast.success(res.message || 'Class session marked as concluded.');
        fetchClassSessionsList();
      } else {
        toast.error(res?.message || 'Failed to conclude session.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to conclude session.');
    }
  };

  const handleStartNewSession = async (e) => {
    if (e) e.preventDefault();
    if (!logSessionForm.teacher) {
      toast.error('Please select or enter a teacher name.');
      return;
    }
    if (!logSessionForm.standard || !logSessionForm.section) {
      toast.error('Please select class standard and section.');
      return;
    }
    if (!logSessionForm.subject) {
      toast.error('Please select or enter a subject.');
      return;
    }

    setIsLoggingSession(true);
    try {
      const res = await createClassSession({
        teacher: logSessionForm.teacher,
        standard: logSessionForm.standard,
        section: logSessionForm.section,
        subject: logSessionForm.subject,
        period: Number(logSessionForm.period) || 1
      });
      if (res?.status) {
        toast.success(res.message || 'Class session check-in started successfully!');
        setShowLogSessionModal(false);
        setLogSessionForm({
          teacher: '',
          standard: '10th',
          section: 'A',
          subject: 'Mathematics',
          period: 1
        });
        fetchClassSessionsList();
      } else {
        toast.error(res?.message || 'Failed to start session.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to start session.');
    } finally {
      setIsLoggingSession(false);
    }
  };

  const handleOpenLateNoticeModal = (session) => {
    setSelectedLateSession(session);
    const teacherName = session.teacher?.name || session.teacherName || (typeof session.teacher === 'string' ? session.teacher : 'Faculty Member');
    const stdSec = `${session.standard || session.class?.standard || '10th'}-${session.section || session.class?.section || 'A'}`;
    const periodNum = session.period || 1;
    const subName = session.subject?.name || session.subjectName || (typeof session.subject === 'string' ? session.subject : 'Class');
    const lateMins = session.lateMinutes || 0;
    const schedTime = session.scheduledStartTime || '09:00 AM';
    const checkInTime = session.loginTime || '—';

    setLateNoticeSubject(`Official Explanation Notice: ${lateMins}m Late Check-In (Class ${stdSec}, Period P${periodNum})`);
    setLateNoticeMessage(
`Dear ${teacherName},

Our automated classroom check-in system recorded your check-in as ${lateMins} minutes late for Class ${stdSec} (Subject: ${subName}, Period: P${periodNum}) on ${session.date || 'today'}.
- Scheduled Start: ${schedTime}
- Recorded Check-In: ${checkInTime}
- Delay Duration: ${lateMins} minutes

Punctuality is crucial to maintain academic excellence and discipline. As per the Principal's instructions, please provide a formal written explanation detailing the cause of this delay within 24 hours.

Office of the Principal / Academic Administration`
    );
    setShowLateNoticeModal(true);
  };

  const handleSendLateNoticeSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedLateSession) return;
    if (!lateNoticeMessage.trim()) {
      toast.error('Notice message cannot be empty');
      return;
    }

    setIsSendingLateNotice(true);
    try {
      const res = await sendLateNotice({
        sessionId: selectedLateSession.id || selectedLateSession._id,
        teacherName: selectedLateSession.teacher?.name || selectedLateSession.teacherName || selectedLateSession.teacher,
        employeeId: selectedLateSession.teacher?.employeeId || selectedLateSession.employeeId,
        standard: selectedLateSession.standard || selectedLateSession.class?.standard,
        section: selectedLateSession.section || selectedLateSession.class?.section,
        subject: selectedLateSession.subject?.name || selectedLateSession.subjectName || selectedLateSession.subject,
        period: selectedLateSession.period,
        lateMinutes: selectedLateSession.lateMinutes,
        lateSeverity: selectedLateSession.lateSeverity,
        title: lateNoticeSubject,
        message: lateNoticeMessage
      });

      if (res?.status) {
        toast.success(res.message || `Notice successfully sent to ${selectedLateSession.teacherName || 'teacher'}!`);
        setShowLateNoticeModal(false);
        setClassSessions(prev => prev.map(s => {
          if ((s.id && s.id === selectedLateSession.id) || (s._id && s._id === selectedLateSession._id)) {
            return { ...s, noticeSent: true };
          }
          return s;
        }));
      } else {
        toast.error(res?.message || 'Failed to send notice');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send notice');
    } finally {
      setIsSendingLateNotice(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchClassSessionsList();
      if (!classes || classes.length === 0) fetchClasses();
      if (!subjects || subjects.length === 0) fetchSubjects();
      if (!employees || employees.length === 0) fetchEmployees();
    }
  }, [activeTab, fetchClassSessionsList, fetchClasses, fetchSubjects, fetchEmployees, classes, subjects, employees]);

  useEffect(() => {
    if (activeTab === 'recordings' || activeTab === 'feedbacks' || activeTab === 'feedback') {
      fetchAdminVideos();
      fetchAdminFeedbackList(feedbackSearch);
      if (!classes || classes.length === 0) fetchClasses();
      if (!subjects || subjects.length === 0) fetchSubjects();
      if (!employees || employees.length === 0) fetchEmployees();
    }
  }, [activeTab, feedbackSearch, fetchAdminVideos, fetchAdminFeedbackList, fetchClasses, fetchSubjects, fetchEmployees, classes, subjects, employees]);

  const handleVideoUploadSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile) {
      toast.error('Please select a video file to upload.');
      return;
    }
    if (!uploadForm.teacherId) {
      toast.error('Please assign a teacher to this video.');
      return;
    }

    setIsUploadingVideo(true);
    const fd = new FormData();
    fd.append('title', uploadForm.title);
    fd.append('subject', uploadForm.subject);
    fd.append('standard', uploadForm.standard);
    fd.append('section', uploadForm.section);
    fd.append('teacherId', uploadForm.teacherId);
    fd.append('description', uploadForm.description);
    fd.append('duration', uploadForm.duration);
    fd.append('file', videoFile);

    try {
      const res = await uploadVideo(fd);
      if (res.status) {
        toast.success('Lecture recording uploaded successfully!');
        setUploadForm({ title: '', subject: '', standard: '1st', section: 'A', teacherId: '', description: '', duration: '45:00' });
        setVideoFile(null);
        e.target.reset();
        fetchAdminVideos();
      } else {
        toast.error(res.message || 'Upload failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error uploading video file.');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleDeleteVideo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recording permanently?')) return;
    try {
      const res = await deleteVideo(id);
      if (res.status) {
        toast.success('Recording deleted successfully!');
        fetchAdminVideos();
      } else {
        toast.error(res.message || 'Deletion failed.');
      }
    } catch (err) {
      toast.error('Error deleting video.');
    }
  };

  const handleExportCsv = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${API_URL}/feedback/admin/all?exportCsv=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to export feedback');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'parent_teacher_feedback_export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Feedback exported to CSV successfully!');
    } catch (err) {
      toast.error('Failed to export CSV: ' + err.message);
    }
  };



  const isAdminUser = useMemo(() => {
    if (!user) return false;
    const r = (user.role || '').toLowerCase();
    return r === 'admin' || r === 'super_admin' || r === 'principal' || r.includes('admin');
  }, [user]);

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    const finalForm = { ...roleForm };
    if (!editingRole) {
      finalForm.RoleCode = 'AUTO-GENERATED';
    }
    if (!finalForm.Rolename || !finalForm.Rolename.trim()) {
      toast.error("Please enter a role name");
      return;
    }
    if (!isAdminUser) {
      toast.error("Only administrative users can create or edit roles");
      return;
    }
    try {
      if (editingRole) {
        const res = await updateRole(editingRole._id, finalForm);
        if (res?.status) {
          const updatedData = res.data || { ...finalForm, _id: editingRole._id };
          setSavedRoleInfo({
            type: 'edit',
            code: updatedData.RoleCode || updatedData.roleCode || finalForm.RoleCode,
            name: updatedData.Rolename || updatedData.rolename || finalForm.Rolename,
            adminPriv: updatedData.GantAdminPrevillage ?? updatedData.GrantAdminPrivilege ?? finalForm.GantAdminPrevillage,
            status: updatedData.isActive !== false ? 'Active' : 'Inactive'
          });
          setIsRoleModalOpen(false);
          setShowRoleSaveModal(true);
          fetchRoles();
        } else {
          toast.error(res?.message || "Failed to update role");
        }
      } else {
        const res = await createRole(finalForm);
        if (res?.status) {
          const createdData = res.data || finalForm;
          setSavedRoleInfo({
            type: 'create',
            code: createdData.RoleCode || createdData.roleCode || 'R001',
            name: createdData.Rolename || createdData.rolename || finalForm.Rolename,
            adminPriv: createdData.GantAdminPrevillage ?? createdData.GrantAdminPrivilege ?? finalForm.GantAdminPrevillage,
            status: createdData.isActive !== false ? 'Active' : 'Inactive'
          });
          setIsRoleModalOpen(false);
          setShowRoleSaveModal(true);
          fetchRoles();
        } else {
          toast.error(res?.message || "Failed to create role");
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to save role');
    }
  };

  const handleToggleRoleStatus = async (roleObj) => {
    if (!isAdminUser) {
      toast.error("Only administrative users can enable or disable roles");
      return;
    }
    const currentStatus = roleObj.isActive !== false;
    const newStatus = !currentStatus;

    // Optimistically update local state immediately so button toggles instantly
    setRoles(prevRoles => (Array.isArray(prevRoles) ? prevRoles : []).map(r => 
      r._id === roleObj._id ? { ...r, isActive: newStatus, isEnabled: newStatus } : r
    ));

    try {
      const res = await updateRole(roleObj._id, {
        RoleCode: roleObj.RoleCode,
        Rolename: roleObj.Rolename,
        GantAdminPrevillage: !!roleObj.GantAdminPrevillage,
        isActive: newStatus,
        isEnabled: newStatus
      });
      if (res?.status) {
        toast.success(`Role "${roleObj.Rolename}" ${newStatus ? 'enabled' : 'disabled'} successfully`);
        fetchRoles();
      } else {
        // Revert local state on failure
        setRoles(prevRoles => (Array.isArray(prevRoles) ? prevRoles : []).map(r => 
          r._id === roleObj._id ? { ...r, isActive: currentStatus, isEnabled: currentStatus } : r
        ));
        toast.error(res?.message || "Failed to update role status");
      }
    } catch (err) {
      // Revert local state on error
      setRoles(prevRoles => (Array.isArray(prevRoles) ? prevRoles : []).map(r => 
        r._id === roleObj._id ? { ...r, isActive: currentStatus, isEnabled: currentStatus } : r
      ));
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || 'Error updating role status');
    }
  };

  const handleRoleDelete = async (id) => {
    if (!isAdminUser) {
      toast.error("Only administrative users can delete roles");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this role?")) return;
    try {
      const res = await deleteRole(id);
      if (res?.status) {
        toast.success("Role deleted successfully");
        fetchRoles();
      } else {
        toast.error(res?.message || "Failed to delete role");
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete role');
    }
  };

  
  const handleDirectLogin = async (emp) => {
    try {
      toast.loading(`Logging in as ${emp.name}...`, { id: 'direct-login' });
      const res = await directLoginAsUser({ employeeId: emp._id, email: emp.email, role: emp.role });
      
      if (res?.status && res?.access_token) {
        const token = res.access_token;
        const userData = res.user || {
          id: emp._id,
          name: emp.name,
          email: emp.email,
          role: emp.role || 'teacher'
        };

        localStorage.setItem('access_token', token);
        localStorage.setItem('user_id', userData.id || emp._id);
        localStorage.setItem('user_role', userData.role || emp.role || 'teacher');
        localStorage.setItem('face_verified', 'true');

        if (loginSuccess) loginSuccess({ access_token: token, user_id: userData.id || emp._id, user: userData });
        if (faceVerified) faceVerified(userData);

        toast.success(`Logged in directly as ${emp.name} (${userData.role || emp.role})!`, { id: 'direct-login' });

        setTimeout(() => {
          const r = (userData.role || emp.role || '').toLowerCase();
          if (r === 'teacher' || r.includes('teacher')) {
            window.location.href = '/teacher';
          } else if (r === 'student' || r.includes('student')) {
            window.location.href = '/student';
          } else if (r === 'parent' || r.includes('parent')) {
            window.location.href = '/parent';
          } else {
            window.location.href = '/dashboard';
          }
        }, 600);
      } else {
        toast.error(res?.message || 'Direct login failed', { id: 'direct-login' });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || 'Direct login failed', { id: 'direct-login' });
    }
  };

  const handleEmpToggle = async (idx, field) => {
    let updatedEmp = null;
    setEmployees(prev => prev.map((e, i) => {
      if (i === idx) {
        updatedEmp = { ...e, [field]: !e[field] };
        return updatedEmp;
      }
      return e;
    }));

    if (updatedEmp) {
      try {
        await updateEmployeeSettings(updatedEmp._id, {
          skip_face: updatedEmp.skip_face,
          skip_location: updatedEmp.skip_location,
          is_enabled: updatedEmp.is_enabled,
          role: updatedEmp.role
        });
        toast.success(`Updated ${field.replace('_', ' ')} for ${updatedEmp.name}`);
      } catch (err) {
        toast.error(`Failed to update ${updatedEmp.name}`);
      }
    }
  };

  const handleEmpRole = async (idx, newRole) => {
    let updatedEmp = null;
    const roleKey = (newRole || '').toLowerCase();
    const isSuper = roleKey === 'admin' || roleKey === 'super_admin';

    setEmployees(prev => {
      const copy = [...prev];
      const emp = { ...copy[idx] };
      emp.role = newRole;
      emp.is_super_admin = isSuper;
      copy[idx] = emp;
      updatedEmp = emp;
      return copy;
    });

    if (updatedEmp) {
      try {
        await updateEmployeeSettings(updatedEmp._id, {
          name: updatedEmp.name,
          email: updatedEmp.email,
          skip_face: updatedEmp.skip_face,
          skip_location: updatedEmp.skip_location,
          is_enabled: updatedEmp.is_enabled,
          role: newRole,
          employeeId: updatedEmp.employeeId || updatedEmp.employee_id,
          employee_id: updatedEmp.employeeId || updatedEmp.employee_id
        });
        toast.success(`Role for ${updatedEmp.name} set to "${newRole}"`);
        await fetchEmployees();
      } catch (err) {
        toast.error(`Failed to update role for ${updatedEmp.name}`);
      }
    }
  };

  const handleEmpTextChange = (idx, field, val) => {
    setEmployees(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));
  };

  const handleSaveEmployee = async (emp) => {
    setSavingEmpId(emp._id);
    try {
      await updateEmployeeSettings(emp._id, {
        name: emp.name,
        email: emp.email,
        skip_face: emp.skip_face,
        skip_location: emp.skip_location,
        is_enabled: emp.is_enabled,
        role: emp.role,
        employeeId: emp.employeeId,
        employee_id: emp.employeeId,
        insurance_id: emp.insurance_id || '',
        insurance_provider: emp.insurance_provider || '',
      });
      toast.success(`${emp.name} settings saved!`);
      await fetchEmployees();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save');
    } finally {
      setSavingEmpId(null);
    }
  };

  const handleOpenResetPasswordModal = (empId, name) => {
    setResetPasswordEmp({ id: empId, name });
    setResetPasswordInput('');
    setShowResetPasswordModal(true);
  };

  const handleConfirmResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!resetPasswordEmp) return;
    if (!resetPasswordInput) {
      toast.error("Please enter a new password");
      return;
    }
    if (resetPasswordInput.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsResettingPassword(true);
    setSavingEmpId(resetPasswordEmp.id);
    try {
      const res = await resetEmployeePassword(resetPasswordEmp.id, resetPasswordInput);
      if (res?.status) {
        toast.success(`Password for ${resetPasswordEmp.name} reset successfully!`);
        setEmployees(prev => prev.map(e => e._id === resetPasswordEmp.id ? { ...e, plain_password: resetPasswordInput } : e));
        setSelectedUserDashboard(prev => prev && prev._id === resetPasswordEmp.id ? { ...prev, plain_password: resetPasswordInput } : prev);
        setShowResetPasswordModal(false);
        setResetPasswordEmp(null);
        setResetPasswordInput('');
      } else {
        toast.error(res?.message || "Failed to reset password");
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Password reset failed");
    } finally {
      setIsResettingPassword(false);
      setSavingEmpId(null);
    }
  };

  const handleDeleteEmployee = async (empId, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${name}? This will permanently remove their profile and all attendance records. This cannot be undone.`)) return;
    
    setSavingEmpId(empId);
    try {
      const res = await deleteEmployee(empId);
      if (res.status) {
        toast.success(`Employee ${name} deleted permanently.`);
        fetchEmployees();
      } else {
        toast.error(res.message || 'Failed to delete');
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Delete failed');
    } finally {
      setSavingEmpId(null);
    }
  };

  const handleExport = async (type, employeeId = '') => {
    setExportingType(type);
    try {
      await exportAttendanceExcel(type, reportMonth, reportYear, deptFilter, employeeId);
      toast.success('Excel file downloaded!');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExportingType(null);
    }
  };

  const handleAddClick = () => {
    const teacherCount = (employees || []).filter(e => e.role === 'teacher').length;
    const autoId = `TCH${String(teacherCount + 1).padStart(3, '0')}`;
    setAddForm({
      employeeId: autoId,
      firstName: '',
      middleName: '',
      lastName: '',
      name: '',
      email: '',
      phone: '',
      qualification: '',
      experience: 0,
      status: 'Active',
      createLogin: true,
      password: '',
      role: 'teacher',
      primary_subject: '',
      secondary_subject: ''
    });
    setIsAddModalOpen(true);
  };

  const handleEditClick = (emp) => {
    setEditingFaculty(emp);
    setShowEditPassword(false);
    const nameParts = (emp.name || '').trim().split(/\s+/);
    let fName = emp.firstName || '';
    let mName = emp.middleName || '';
    let lName = emp.lastName || '';
    if (!fName && nameParts.length > 0 && emp.name) {
      if (nameParts.length === 1) {
        fName = nameParts[0];
      } else if (nameParts.length === 2) {
        fName = nameParts[0];
        lName = nameParts[1];
      } else {
        fName = nameParts[0];
        mName = nameParts.slice(1, -1).join(' ');
        lName = nameParts[nameParts.length - 1];
      }
    }
    setEditForm({
      firstName: fName,
      middleName: mName,
      lastName: lName,
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      qualification: emp.qualification || '',
      experience: emp.experience || 0,
      status: emp.status || 'Active',
      role: emp.role || 'teacher',
      skip_face: !!emp.skip_face,
      skip_location: !!emp.skip_location,
      isActive: emp.is_enabled !== false,
      primary_subject: emp.primary_subject || '',
      secondary_subject: emp.secondary_subject || '',
      password: emp.plain_password || emp.password || 'qelvora123'
    });
    setIsEditModalOpen(true);
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    const computedName = (addForm.firstName || addForm.lastName)
      ? [addForm.firstName, addForm.middleName, addForm.lastName].filter(Boolean).join(' ')
      : addForm.name;
    if (!computedName.trim() || !addForm.email) {
      return toast.error("First name, last name, and email are required");
    }
    setIsAddingFaculty(true);
    try {
      const payload = {
        ...addForm,
        name: computedName.trim()
      };
      const res = await addTeacher(payload);
      if (res?.status) {
        toast.success("Teacher added successfully!");
        setIsAddModalOpen(false);
        fetchEmployees();
      } else {
        toast.error(res?.message || "Failed to add teacher");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to add teacher");
    } finally {
      setIsAddingFaculty(false);
    }
  };

  const handleEditTeacher = async (e) => {
    e.preventDefault();
    if (!editingFaculty) return;
    setIsSavingFaculty(true);
    try {
      const computedName = (editForm.firstName || editForm.lastName)
        ? [editForm.firstName, editForm.middleName, editForm.lastName].filter(Boolean).join(' ')
        : (editForm.name || editingFaculty.name || 'Faculty Member');

      const roleKey = (editForm.role || '').toLowerCase();
      let prefix = 'EMP';
      if (roleKey === 'teacher') prefix = 'TCH';
      else if (roleKey === 'admin' || roleKey === 'super_admin' || roleKey === 'principal') prefix = 'ADM';
      else if (roleKey === 'staff') prefix = 'STF';

      let newId = editingFaculty.employeeId || editingFaculty.employee_id || '';
      if (editForm.email?.toLowerCase() === 'admin@qelvora.in') {
        newId = 'ADM001';
      } else if (!newId) {
        newId = `${prefix}001`;
      }

      const targetId = editingFaculty._id || editingFaculty.id || editingFaculty.employeeId || editingFaculty.email;
      const res = await updateEmployeeSettings(targetId, {
        firstName: editForm.firstName,
        middleName: editForm.middleName,
        lastName: editForm.lastName,
        name: computedName.trim(),
        email: editForm.email,
        phone: editForm.phone,
        qualification: editForm.qualification,
        experience: editForm.experience,
        status: editForm.status,
        role: editForm.role,
        employeeId: newId,
        employee_id: newId,
        skip_face: editForm.skip_face,
        skip_location: editForm.skip_location,
        isActive: editForm.isActive,
        primary_subject: editForm.primary_subject,
        secondary_subject: editForm.secondary_subject,
        password: editForm.password,
        plain_password: editForm.password
      });
      if (res?.status) {
        toast.success("Profile updated successfully!");

        const isSuper = roleKey === 'admin' || roleKey === 'super_admin' || editForm.email?.toLowerCase() === 'rajabhaxa@gmail.com';

        const updatedObj = {
          name: computedName.trim(),
          firstName: editForm.firstName,
          middleName: editForm.middleName,
          lastName: editForm.lastName,
          email: editForm.email,
          phone: editForm.phone,
          qualification: editForm.qualification,
          experience: editForm.experience,
          status: editForm.status,
          role: editForm.role,
          employeeId: newId,
          employee_id: newId,
          skip_face: editForm.skip_face,
          skip_location: editForm.skip_location,
          is_enabled: editForm.isActive,
          is_super_admin: isSuper,
          primary_subject: editForm.primary_subject,
          secondary_subject: editForm.secondary_subject,
          plain_password: editForm.password,
          password: editForm.password
        };

        setEmployees(prev => (Array.isArray(prev) ? prev : []).map(emp => (emp._id === editingFaculty._id || emp.id === editingFaculty._id || emp.email === editingFaculty.email) ? { ...emp, ...updatedObj } : emp));
        setOriginalEmployees(prev => (Array.isArray(prev) ? prev : []).map(emp => (emp._id === editingFaculty._id || emp.id === editingFaculty._id || emp.email === editingFaculty.email) ? { ...emp, ...updatedObj } : emp));

        setIsEditModalOpen(false);
        setEditingFaculty(null);
        await fetchEmployees();
      } else {
        toast.error(res?.message || "Failed to update teacher");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to update teacher");
    } finally {
      setIsSavingFaculty(false);
    }
  };

  const handleSaveAllChanges = async () => {
    setIsSavingBulk(true);
    const changedEmps = (Array.isArray(employees) ? employees : []).filter((emp, idx) => {
      const orig = originalEmployees[idx];
      if (!orig) return false;
      return orig.skip_face !== emp.skip_face ||
             orig.skip_location !== emp.skip_location ||
             orig.is_enabled !== emp.is_enabled ||
             orig.role !== emp.role;
    });
    let successCount = 0;
    for (const emp of changedEmps) {
      try {
        await updateEmployeeSettings(emp._id, {
          name: emp.name,
          email: emp.email,
          skip_face: emp.skip_face,
          skip_location: emp.skip_location,
          is_enabled: emp.is_enabled,
          role: emp.role,
          employeeId: emp.employeeId,
          employee_id: emp.employeeId
        });
        successCount++;
      } catch (err) {
        toast.error(`Failed to save ${emp.name}`);
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount} employee(s) updated successfully!`);
      fetchEmployees();
    }
    setIsSavingBulk(false);
  };

  const hasChanges = (Array.isArray(employees) ? employees : []).some((emp, idx) => {
    const orig = originalEmployees[idx];
    if (!orig) return false;
    return orig.skip_face !== emp.skip_face ||
           orig.skip_location !== emp.skip_location ||
           orig.is_enabled !== emp.is_enabled ||
           orig.role !== emp.role;
  });

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await getCompanySettings();
        if (res?.data) {
          setSettings(prev => ({
            ...prev,
            ...res.data,
            schoolName: res.data.schoolName || prev.schoolName || 'Qelvora School CRM',
            schoolLogo: res.data.schoolLogo !== undefined ? res.data.schoolLogo : (prev.schoolLogo || ''),
            logoSubtext: res.data.logoSubtext || 'Empowering Educational Excellence',
            board: res.data.board || 'CBSE',
            boardsList: res.data.boardsList || ['CBSE', 'STATE', 'ICSE'],
            standardsList: res.data.standardsList || ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'],
            face_auth_enabled: res.data.face_auth_enabled !== undefined ? res.data.face_auth_enabled : true,
            location_auth_enabled: res.data.location_auth_enabled !== undefined ? res.data.location_auth_enabled : true,
            hours_per_day: res.data.hours_per_day || 8.0,
            hours_per_week: res.data.hours_per_week || 40.0,
            hours_per_month: res.data.hours_per_month || 160.0,
            hours_per_year: res.data.hours_per_year || 1920.0,
            weekly_off: res.data.weekly_off || 'Sunday',
            office_start_time: res.data.office_start_time || '08:30',
            office_end_time: res.data.office_end_time || '16:00',
            grace_period_mins: res.data.grace_period_mins || 15,
            hours_per_subject: res.data.hours_per_subject !== undefined ? res.data.hours_per_subject : 1.0,
            game_period_mins: res.data.game_period_mins !== undefined ? res.data.game_period_mins : 45,
            lunch_break_mins: res.data.lunch_break_mins !== undefined ? res.data.lunch_break_mins : 45,
            small_break_mins: res.data.small_break_mins !== undefined ? res.data.small_break_mins : 15,
            period_duration_mins: res.data.period_duration_mins !== undefined ? res.data.period_duration_mins : 45,
            lunch_break_start: res.data.lunch_break_start || '12:00',
            small_break_start: res.data.small_break_start || '10:30'
          }));
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [user]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Email and password required");

    // ── MANDATORY GPS CHECK ──
    if (!geoPosition || !geoPosition.latitude || !geoPosition.longitude) {
      if (geoDenied) {
        toast.error('Location permission denied. Please enable GPS in your browser settings and refresh.');
      } else if (geoError) {
        toast.error(`Location error: ${geoError}. Please ensure location services are enabled.`);
      } else {
        toast.error('Acquiring GPS location... Please allow location access and retry.');
      }
      return;
    }
    
    setIsLoggingIn(true);
    try {
      const locationData = geoPosition ? { latitude: geoPosition.latitude, longitude: geoPosition.longitude } : null;
      const res = await loginWithPassword(email, password, locationData);

      const userData = res.user || res.data?.user;
      if (userData) {
        if (userData.role !== 'admin' && userData.role !== 'super_admin' && userData.role !== 'principal' && userData.role !== 'Admin') {
          toast.error("Access denied. Admin rights required.");
          return;
        }

        loginSuccess(res.data || res);
        toast.success(`Welcome, ${userData.name}! Admin session authenticated.`);
      } else {
        toast.error(res.message || "Invalid admin credentials");
      }
    } catch (err) {
      console.error("Admin login error:", err);
      toast.error(err.response?.data?.detail || err.response?.data?.message || "Authentication failed. Check your email & password.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleToggleSetting = async (field, value) => {
    const updatedSettings = { ...settings, [field]: value };
    setSettings(updatedSettings);
    
    // Optimistically update the UI list for immediate feedback
    const employeeField = field === 'face_auth_enabled' ? 'skip_face' : 'skip_location';
    setEmployees(prev => (Array.isArray(prev) ? prev : []).map(emp => ({ ...emp, [employeeField]: value })));
    
    try {
      const settingsPayload = {
        schoolName: updatedSettings.schoolName || 'Golden Valley Academy',
        schoolLogo: updatedSettings.schoolLogo || '',
        logoSubtext: updatedSettings.logoSubtext || 'Empowering Educational Excellence',
        board: updatedSettings.board || 'CBSE',
        boardsList: updatedSettings.boardsList || ['CBSE', 'STATE', 'ICSE'],
        standardsList: updatedSettings.standardsList || ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'],
        face_auth_enabled: !!updatedSettings.face_auth_enabled,
        location_auth_enabled: !!updatedSettings.location_auth_enabled,
        hours_per_day: parseFloat(updatedSettings.hours_per_day) || 8.0,
        hours_per_week: parseFloat(updatedSettings.hours_per_week) || 40.0,
        hours_per_month: parseFloat(updatedSettings.hours_per_month) || 160.0,
        hours_per_year: parseFloat(updatedSettings.hours_per_year) || 1920.0,
        weekly_off: (updatedSettings.weekly_off || 'Sunday').trim(),
        office_start_time: updatedSettings.office_start_time || '08:30',
        office_end_time: updatedSettings.office_end_time || '16:00',
        grace_period_mins: parseInt(updatedSettings.grace_period_mins) || 15,
        hours_per_subject: parseFloat(updatedSettings.hours_per_subject) || 1.0,
        game_period_mins: parseInt(updatedSettings.game_period_mins) || 45,
        lunch_break_mins: parseInt(updatedSettings.lunch_break_mins) || 45,
        small_break_mins: parseInt(updatedSettings.small_break_mins) || 15,
        period_duration_mins: parseInt(updatedSettings.period_duration_mins) || 45,
        lunch_break_start: updatedSettings.lunch_break_start || '12:00',
        small_break_start: updatedSettings.small_break_start || '10:30'
      };
      
      await updateCompanySettings(settingsPayload);
      
      // Reload from backend to make sure everything is completely in sync and update originalEmployees
      const empRes = await getAdminEmployees();
      if (empRes?.data) {
        const processed = processEmployeeData(empRes.data);
        setEmployees(processed);
        setOriginalEmployees(JSON.parse(JSON.stringify(processed)));
      }
      toast.success(`${field === 'face_auth_enabled' ? 'Face' : 'Location'} authentication setting updated globally!`);
    } catch (err) {
      toast.error("Failed to update setting");
      // Revert states on error
      setSettings(settings);
      fetchEmployees();
    }
  };

  const handleSave = async () => {
    const hrsD = parseFloat(settings.hours_per_day) || 8.0;
    const hrsW = parseFloat(settings.hours_per_week) || 40.0;
    const hrsM = parseFloat(settings.hours_per_month) || 160.0;
    const hrsY = parseFloat(settings.hours_per_year) || (hrsM ? hrsM * 12 : 1920.0);
    
    if (isNaN(hrsD) || hrsD <= 0 || hrsD > 24) return toast.error("Daily hours must be 1-24");
    if (!settings.weekly_off || !settings.weekly_off.trim()) {
      return toast.error("Weekly off is required");
    }

    const grace = parseInt(settings.grace_period_mins);
    if (isNaN(grace) || grace < 0) return toast.error("Grace period must be >= 0");

    const periodMins = parseInt(settings.period_duration_mins);
    if (isNaN(periodMins) || periodMins <= 0) return toast.error("Period duration must be > 0 minutes");
    if (!settings.lunch_break_start || !settings.lunch_break_start.trim()) return toast.error("Lunch break start time is required");
    if (!settings.small_break_start || !settings.small_break_start.trim()) return toast.error("Small break start time is required");

    setIsSaving(true);
    try {
      const settingsPayload = {
        schoolName: settings.schoolName || 'Golden Valley Academy',
        schoolLogo: settings.schoolLogo || '',
        logoSubtext: settings.logoSubtext || 'Empowering Educational Excellence',
        board: settings.board || 'CBSE',
        boardsList: settings.boardsList || ['CBSE', 'STATE', 'ICSE'],
        standardsList: settings.standardsList || ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'],
        face_auth_enabled: !!settings.face_auth_enabled,
        location_auth_enabled: !!settings.location_auth_enabled,
        hours_per_day: hrsD,
        hours_per_week: hrsW,
        hours_per_month: hrsM,
        hours_per_year: hrsY,
        weekly_off: settings.weekly_off.trim(),
        office_start_time: settings.office_start_time || '08:30',
        office_end_time: settings.office_end_time || '16:00',
        grace_period_mins: grace,
        hours_per_subject: parseFloat(settings.hours_per_subject) || 1.0,
        game_period_mins: parseInt(settings.game_period_mins) || 45,
        lunch_break_mins: parseInt(settings.lunch_break_mins) || 45,
        small_break_mins: parseInt(settings.small_break_mins) || 15,
        period_duration_mins: periodMins,
        lunch_break_start: settings.lunch_break_start || '12:00',
        small_break_start: settings.small_break_start || '10:30'
      };
      
      const saveRes = await updateCompanySettings(settingsPayload);
      if (saveRes?.data) {
        setSettings(prev => ({ ...prev, ...saveRes.data }));
      } else {
        setSettings(prev => ({ ...prev, ...settingsPayload }));
      }
      window.dispatchEvent(new Event('schoolSettingsUpdated'));
      toast.success("School configuration & branding saved successfully!");
      setShowSaveSuccessModal(true);
      
      // Also automatically save any teacher skip settings that were updated in bulk
      const changedEmps = (Array.isArray(employees) ? employees : []).filter((emp, idx) => {
        const orig = originalEmployees[idx];
        if (!orig) return false;
        return orig.skip_face !== emp.skip_face ||
               orig.skip_location !== emp.skip_location ||
               orig.is_enabled !== emp.is_enabled ||
               orig.role !== emp.role;
      });
      if (changedEmps.length > 0) {
        let successCount = 0;
        for (const emp of changedEmps) {
          try {
            await updateEmployeeSettings(emp._id, {
              skip_face: emp.skip_face,
              skip_location: emp.skip_location,
              is_enabled: emp.is_enabled,
              role: emp.role
            });
            successCount++;
          } catch (err) {
            console.error(`Failed to auto-save settings for ${emp.name}`, err);
          }
        }
        if (successCount > 0) {
          setOriginalEmployees(JSON.parse(JSON.stringify(employees)));
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Student Management Functions
  const fetchStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const res = await getStudentsList({
        class: filterStd === 'All' ? '' : filterStd,
        section: filterSec,
        search: studentSearch,
        page: studentPage,
        limit: 10
      });
      if (res && res.data) {
        setStudentsList(res.data || []);
        if (res.pagination) {
          setStudentTotalPages(res.pagination.totalPages || 1);
          setStudentTotalCount(res.pagination.total || res.data.length);
        } else {
          setStudentTotalPages(1);
          setStudentTotalCount(res.data.length);
        }
      } else {
        setStudentsList([]);
        setStudentTotalPages(1);
        setStudentTotalCount(0);
      }
    } catch (err) {
      console.error('Fetch students error:', err);
      toast.error('Failed to load students');
      setStudentsList([]);
    } finally {
      setStudentsLoading(false);
    }
  }, [filterStd, filterSec, studentSearch, studentPage]);

  useEffect(() => {
    if (activeTab === 'students_mgt' || activeTab === 'students') {
      fetchStudents();
    }
  }, [activeTab, fetchStudents]);

  const handleOpenAddStudentModal = async () => {
    if (!classes || classes.length === 0) {
      fetchClasses();
    }
    let nextAdm = '';
    try {
      const res = await getNextAdmissionNumber();
      if (res?.data?.nextAdmissionNumber) {
        nextAdm = res.data.nextAdmissionNumber;
      }
    } catch (e) {
      console.warn('Could not fetch next admission number:', e);
    }

    if (!classes || classes.length === 0) {
      fetchClasses();
    }

    setStudentForm({
      ...initialStudentForm,
      firstName: '',
      middleName: '',
      lastName: '',
      name: '',
      fatherName: '',
      motherName: '',
      parentName: '',
      standard: filterStd === 'All' ? '5th' : filterStd,
      section: filterSec || 'A',
      admissionNumber: nextAdm || `ADM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`
    });
    setPhotoPreview(null);
    setStudentFormErrors({});
    setEditingStudent(null);
    setIsAddStudentModalOpen(true);
  };

  const handleOpenBulkUploadModal = (prefillStandard = '', prefillSection = '') => {
    if (!classes || classes.length === 0) {
      fetchClasses();
    }
    setBulkFile(null);
    setBulkFilePreview([]);
    setBulkClassBreakdown({});
    if (prefillStandard) {
      setBulkUploadScope('specific');
      setBulkTargetStandard(prefillStandard);
      setBulkTargetSection(prefillSection || 'A');
    } else {
      setBulkUploadScope('auto');
    }
    setIsBulkUploadModalOpen(true);
  };

  const handleDownloadTemplateFile = async (format = 'xlsx') => {
    setIsDownloadingTemplate(true);
    try {
      await downloadStudentTemplate(format);
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

    // Parse preview in browser using FileReader and XLSX if available, or basic CSV parser
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target.result;
          // Dynamically import xlsx on client side or inspect buffer
          const XLSX = await import('xlsx');
          const wb = XLSX.read(buffer, { type: 'binary' });
          const firstSheet = wb.SheetNames[0];
          const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: '' });
          
          setBulkFilePreview(rawRows.slice(0, 5));
          
          // Build class breakdown summary
          const breakdown = {};
          rawRows.forEach(row => {
            const rawStd = row['Standard'] || row['standard'] || row['Class'] || row['class'] || 'Unspecified';
            const rawSec = (row['Section'] || row['section'] || row['Sec'] || 'A').toUpperCase();
            const key = `${rawStd} - ${rawSec}`;
            breakdown[key] = (breakdown[key] || 0) + 1;
          });
          setBulkClassBreakdown(breakdown);
        } catch (parseErr) {
          console.warn('Could not preview file locally:', parseErr);
        }
      };
      reader.readAsBinaryString(file);
    } catch (_) {}
  };

  const handleExecuteBulkUpload = async () => {
    if (!bulkFile) {
      toast.error('Please select an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    setIsUploadingBulk(true);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      if (bulkUploadScope === 'specific') {
        formData.append('standard', bulkTargetStandard);
        formData.append('section', bulkTargetSection);
      }

      const res = await bulkUploadStudents(formData);
      if (res && (res.status || res.success)) {
        toast.success(res.message || 'Students uploaded successfully!');
        setIsBulkUploadModalOpen(false);
        setBulkFile(null);
        setBulkFilePreview([]);
        setBulkClassBreakdown({});
        
        // Refresh both students list and classes table to reflect live strengths immediately
        fetchStudents();
        fetchClasses();
      } else {
        toast.error(res?.message || 'Failed to upload students.');
      }
    } catch (err) {
      console.error('Bulk upload error:', err);
      toast.error(err.response?.data?.message || err.message || 'Error executing bulk upload.');
    } finally {
      setIsUploadingBulk(false);
    }
  };

  const handleOpenEditStudentModal = (student) => {
    if (!classes || classes.length === 0) {
      fetchClasses();
    }
    setEditingStudent(student);

    // Parse First, Middle, and Last Name
    const nameParts = (student.name || '').trim().split(/\s+/);
    let firstName = student.firstName || '';
    let middleName = student.middleName || '';
    let lastName = student.lastName || '';
    if (!firstName && nameParts.length > 0) {
      if (nameParts.length === 1) {
        firstName = nameParts[0];
      } else if (nameParts.length === 2) {
        firstName = nameParts[0];
        lastName = nameParts[1];
      } else {
        firstName = nameParts[0];
        middleName = nameParts.slice(1, -1).join(' ');
        lastName = nameParts[nameParts.length - 1];
      }
    }

    // Parse DOB to DD/MM/YYYY
    let dobFormatted = '';
    if (student.dob) {
      if (/^\d{4}-\d{2}-\d{2}/.test(student.dob)) {
        const [y, m, d] = student.dob.split('T')[0].split('-');
        dobFormatted = `${d}/${m}/${y}`;
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(student.dob)) {
        dobFormatted = student.dob;
      } else {
        try {
          const dt = new Date(student.dob);
          if (!isNaN(dt.getTime())) {
            const dd = String(dt.getDate()).padStart(2, '0');
            const mm = String(dt.getMonth() + 1).padStart(2, '0');
            const yyyy = dt.getFullYear();
            dobFormatted = `${dd}/${mm}/${yyyy}`;
          }
        } catch {
          dobFormatted = '';
        }
      }
    }

    // Parse Father and Mother Name
    let fatherName = student.fatherName || '';
    let motherName = student.motherName || '';
    if (!fatherName && !motherName && student.parentName) {
      if (student.parentName.includes(' / ')) {
        const [f, m] = student.parentName.split(' / ');
        fatherName = f?.trim() || '';
        motherName = m?.trim() || '';
      } else {
        fatherName = student.parentName.trim();
      }
    }

    setStudentForm({
      firstName,
      middleName,
      lastName,
      name: student.name || [firstName, middleName, lastName].filter(Boolean).join(' '),
      admissionNumber: student.admissionNumber || student.studentId || '',
      dob: dobFormatted,
      gender: student.gender || 'Male',
      standard: student.standard || filterStd || '5th',
      section: student.section || filterSec || 'A',
      rollNumber: student.rollNumber || '',
      admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      fatherName,
      motherName,
      parentName: student.parentName || [fatherName, motherName].filter(Boolean).join(' / '),
      parentPhone: student.parentPhone || student.phone || student.parentContact || '',
      parentEmail: student.parentEmail || student.email || '',
      address: student.address || '',
      photoUrl: student.photoUrl || ''
    });
    setPhotoPreview(student.photoUrl || null);
    setStudentFormErrors({});
    setIsEditStudentModalOpen(true);
  };

  const handleOpenViewStudentModal = (student) => {
    setViewingStudent(student);
    setIsViewStudentModalOpen(true);
  };

  const handleOpenDeleteStudentModal = (student) => {
    setDeletingStudent(student);
    setIsDeleteStudentModalOpen(true);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be under 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        setStudentForm(prev => ({ ...prev, photoUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStudentSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!studentForm.firstName?.trim()) errors.firstName = 'First name is required';
    if (!studentForm.lastName?.trim()) errors.lastName = 'Last name is required';
    if (!studentForm.admissionNumber?.trim()) errors.admissionNumber = 'Admission number is required';

    // DOB validation: DD/MM/YYYY
    if (!studentForm.dob?.trim()) {
      errors.dob = 'Date of birth is required';
    } else {
      const parts = studentForm.dob.trim().split('/');
      if (parts.length !== 3) {
        errors.dob = 'Format must be DD/MM/YYYY (e.g. 15/08/2012)';
      } else {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        const currentYear = new Date().getFullYear();
        if (isNaN(day) || isNaN(month) || isNaN(year) || month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > currentYear) {
          errors.dob = 'Please enter a valid date of birth (DD/MM/YYYY)';
        } else {
          const daysInMonth = new Date(year, month, 0).getDate();
          if (day > daysInMonth) {
            errors.dob = `Invalid day for month ${month} (max ${daysInMonth} days)`;
          }
        }
      }
    }

    if (!studentForm.standard?.trim()) errors.standard = 'Class standard is required';
    if (!studentForm.section?.trim()) errors.section = 'Section is required';
    if (!studentForm.fatherName?.trim()) errors.fatherName = "Father's name is required";
    if (!studentForm.motherName?.trim()) errors.motherName = "Mother's name is required";
    if (!studentForm.parentPhone?.trim() || studentForm.parentPhone.replace(/\D/g, '').length !== 10) {
      errors.parentPhone = 'Valid 10-digit phone number is required';
    }
    if (studentForm.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentForm.parentEmail)) {
      errors.parentEmail = 'Please enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setStudentFormErrors(errors);
      toast.error('Please fix the form errors');
      return;
    }

    setIsSavingStudent(true);
    try {
      // Convert DD/MM/YYYY to ISO YYYY-MM-DD
      let isoDob = studentForm.dob;
      const dobMatch = String(studentForm.dob).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (dobMatch) {
        isoDob = `${dobMatch[3]}-${dobMatch[2]}-${dobMatch[1]}`;
      }

      const fullName = [studentForm.firstName.trim(), (studentForm.middleName || '').trim(), studentForm.lastName.trim()].filter(Boolean).join(' ');
      const parentCombined = [studentForm.fatherName.trim(), studentForm.motherName.trim()].filter(Boolean).join(' / ');

      const submitData = {
        ...studentForm,
        name: fullName,
        firstName: studentForm.firstName.trim(),
        middleName: (studentForm.middleName || '').trim(),
        lastName: studentForm.lastName.trim(),
        dob: isoDob,
        fatherName: studentForm.fatherName.trim(),
        motherName: studentForm.motherName.trim(),
        parentName: parentCombined
      };

      if (editingStudent) {
        const studentId = editingStudent.id || editingStudent._id;
        await updateStudent(studentId, submitData);
        toast.success('Student updated successfully');
        setIsEditStudentModalOpen(false);
        setEditingStudent(null);
      } else {
        await addStudent(submitData);
        toast.success('Student added successfully');
        setIsAddStudentModalOpen(false);
      }
      fetchStudents();
    } catch (err) {
      console.error('Save student error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save student';
      toast.error(msg);
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleConfirmDeleteStudent = async () => {
    if (!deletingStudent) return;
    setIsDeletingStudent(true);
    try {
      const studentId = deletingStudent.id || deletingStudent._id;
      await deleteStudent(studentId);
      toast.success('Student removed successfully');
      setIsDeleteStudentModalOpen(false);
      setDeletingStudent(null);
      fetchStudents();
    } catch (err) {
      console.error('Delete student error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete student';
      toast.error(msg);
    } finally {
      setIsDeletingStudent(false);
    }
  };

  const filteredClasses = useMemo(() => {
    return (Array.isArray(classes) ? classes : []).filter(cls => {
      const std = (cls.standard || '').toLowerCase();
      const sec = (cls.section || '').toLowerCase();
      const tch = (cls.classTeacher?.name || cls.classTeacherName || '').toLowerCase();
      const room = (cls.roomNumber || '').toLowerCase();
      const q = classSearch.toLowerCase().trim();
      const matchesSearch = !q || std.includes(q) || sec.includes(q) || `${std}-${sec}`.includes(q) || `${std} - ${sec}`.includes(q) || tch.includes(q) || room.includes(q);
      const matchesBoard = classBoardFilter === 'All' || (cls.board || 'CBSE').toUpperCase() === classBoardFilter.toUpperCase();
      return matchesSearch && matchesBoard;
    });
  }, [classes, classSearch, classBoardFilter]);

  const filteredSubjects = useMemo(() => {
    return (Array.isArray(subjects) ? subjects : []).filter(sub => {
      const name = (sub.name || '').toLowerCase();
      const code = (sub.code || '').toLowerCase();
      const std = (sub.standard || '').toLowerCase();
      const sec = (sub.section || '').toLowerCase();
      const className = (sub.className || '').toLowerCase();
      const q = subjectSearch.toLowerCase().trim();
      const matchesSearch = !q || name.includes(q) || code.includes(q) || std.includes(q) || sec.includes(q) || className.includes(q);

      let matchesClass = true;
      if (subjectClassFilter !== 'All') {
        if (subjectClassFilter === 'Universal') {
          matchesClass = !sub.standard || sub.standard === 'All';
        } else {
          matchesClass = sub.classId === subjectClassFilter || sub.standard === subjectClassFilter || `${sub.standard}-${sub.section}` === subjectClassFilter;
        }
      }

      const matchesType = subjectTypeFilter === 'All' || (sub.type || 'Core').toLowerCase() === subjectTypeFilter.toLowerCase();
      return matchesSearch && matchesClass && matchesType;
    });
  }, [subjects, subjectSearch, subjectClassFilter, subjectTypeFilter]);

  const filteredMappings = useMemo(() => {
    return (Array.isArray(mappings) ? mappings : []).filter(map => {
      const tName = (map.teacher?.name || map.teacherName || '').toLowerCase();
      const empId = (map.teacher?.employeeId || map.employeeId || '').toLowerCase();
      const std = (map.class?.standard || map.standard || '').toLowerCase();
      const sec = (map.class?.section || map.section || '').toLowerCase();
      const sub = (map.subject?.name || map.subject || '').toLowerCase();
      const q = mappingSearch.toLowerCase().trim();

      const matchesSearch = !q || tName.includes(q) || empId.includes(q) || std.includes(q) || sec.includes(q) || sub.includes(q);

      let matchesTeacher = true;
      if (mappingTeacherFilter !== 'All') {
        matchesTeacher = map.teacherId === mappingTeacherFilter || (map.teacher?.name || map.teacherName) === mappingTeacherFilter;
      }

      let matchesClass = true;
      if (mappingClassFilter !== 'All') {
        matchesClass = map.classId === mappingClassFilter || `${map.class?.standard || map.standard}-${map.class?.section || map.section}` === mappingClassFilter;
      }

      let matchesSubject = true;
      if (mappingSubjectFilter !== 'All') {
        matchesSubject = map.subjectId === mappingSubjectFilter || (map.subject?.name || map.subject) === mappingSubjectFilter;
      }

      return matchesSearch && matchesTeacher && matchesClass && matchesSubject;
    });
  }, [mappings, mappingSearch, mappingTeacherFilter, mappingClassFilter, mappingSubjectFilter]);

  // Loading check
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#29456D] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If NOT authenticated, redirect to the official login portal (LoginPage)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If student or parent, redirect to their respective portal
  const userRoleLower = (user.role || '').toLowerCase();
  if (userRoleLower === 'student') {
    return <Navigate to="/student" replace />;
  }
  if (userRoleLower === 'parent') {
    return <Navigate to="/parent" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#334155] flex flex-col md:flex-row animate-fadeIn font-sans">
      <Sidebar />
      <div className="flex-1 bg-[#F7F9FC] flex flex-col min-w-0">
        <div className="min-h-[calc(100vh-4rem)] bg-[#F7F9FC] p-6 lg:p-8 overflow-y-auto">
          <div className="w-full mx-auto">

        {/* Header Bar */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3 bg-[#172B4D] p-3 sm:p-4 rounded-2xl border border-[#29456D] shadow-sm text-white">
          <div className="inline-flex items-center gap-2.5 bg-[#29456D] px-4 py-2 rounded-xl border border-[#29456D] shadow-2xs w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-pulse shrink-0"></span>
              <span className="text-xs sm:text-sm text-[#CBD5E1] font-semibold tracking-tight truncate">
                {t('logged_in_as')} <strong className="font-extrabold text-white">{user?.name}</strong>
              </span>
            </div>
            {user?.role && (
              <span className="bg-[#172B4D] text-[#DBEAFE] text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 border border-[#29456D]">
                {user?.role}
              </span>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full sm:w-auto px-4 py-2 bg-rose-950/60 hover:bg-rose-800 text-rose-200 hover:text-white active:scale-95 font-bold text-xs rounded-xl shadow-xs transition-all duration-200 flex items-center justify-center gap-2 border border-rose-800/80 cursor-pointer shrink-0"
          >
            <LogOutIcon className="w-3.5 h-3.5 text-rose-300" />
            <span>Logout</span>
          </button>
        </header>

        {/* Content Section */}
        <>

        {/* Horizontal Navigation Tabs */}
        {['settings', 'roles', 'employees', 'consolidated', 'details', 'daily_status', 'individual_details'].includes(activeTab) && (
          <div className="w-full bg-slate-100/80 p-1 sm:p-1.5 rounded-2xl border border-slate-200/80 mb-6">
            <div className="flex gap-1.5 overflow-x-auto py-1 px-1 items-center justify-start w-full touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
              {[
                { id: 'settings', label: 'School Settings', icon: <SettingsIcon className="w-4 h-4 shrink-0" /> },
                { id: 'roles', label: 'Role', icon: <ShieldCheck className="w-4 h-4 shrink-0" /> },
                { id: 'employees', label: t('employee_mgmt') || 'Employee Management', icon: <UsersRound className="w-4 h-4 shrink-0" /> },
                { id: 'consolidated', label: 'Consolidated', icon: <BarChart2 className="w-4 h-4 shrink-0" /> },
                { id: 'details', label: 'All Details', icon: <FileText className="w-4 h-4 shrink-0" /> },
                { id: 'daily_status', label: 'Daily Status', icon: <Calendar className="w-4 h-4 shrink-0" /> },
                { id: 'individual_details', label: 'Personal Details', icon: <User className="w-4 h-4 shrink-0" /> }
              ].map(tObj => {
                const isActive = activeTab === tObj.id;
                return (
                  <button
                    key={tObj.id}
                    onClick={() => navigate(`/admin?tab=${tObj.id}`)}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm whitespace-nowrap transition-all duration-150 flex items-center gap-2 cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-[#29456D] text-white shadow-sm font-semibold'
                        : 'bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60 font-medium shadow-2xs'
                    }`}
                  >
                    <span className={isActive ? 'text-blue-100' : 'text-slate-400'}>
                      {tObj.icon}
                    </span>
                    <span>{tObj.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <>
          {/* School Configuration & Master Settings Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden mb-8 text-slate-900">
            
            {/* Header Bar */}
            <div className="bg-white px-6 sm:px-8 py-5 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#172B4D] border border-blue-100 flex items-center justify-center shrink-0">
                  <SettingsIcon className="w-5 h-5 text-[#172B4D]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    School Configuration & Master Settings
                  </h2>
                  <p className="text-slate-500 text-xs mt-0.5 font-medium">
                    Configure institutional identity, academic timings, and platform-wide security policies.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Academic Year: 2026–2027
                </span>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  className="px-4 py-2 bg-[#29456D] hover:bg-[#172B4D] active:scale-[0.98] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-4 h-4 text-white" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8 bg-slate-50/40">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <span className="w-8 h-8 border-3 border-[#29456D] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">

                  {/* SECTION 1: INSTITUTIONAL IDENTITY & DYNAMIC BRANDING */}
                  <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                          Institutional Identity & Branding
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Updates apply dynamically across portals, attendance kiosk, and reports.
                        </p>
                      </div>
                      <span className="text-[11px] bg-blue-50 text-[#172B4D] font-semibold px-2.5 py-0.5 rounded-md border border-blue-100">
                        Live System Branding
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Logo Container */}
                      <div className="lg:col-span-4 bg-slate-50 p-5 rounded-xl border border-slate-200/80 flex flex-col items-center justify-center text-center space-y-3">
                        <span className="text-xs font-semibold text-slate-700">
                          Institutional Crest / Logo
                        </span>

                        <div className="w-24 h-24 rounded-xl bg-white p-2.5 shadow-xs border border-slate-200 flex items-center justify-center">
                          <img
                            src={settings.schoolLogo || "/logo.png"}
                            alt="School Logo"
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <label className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span>Upload Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  return toast.error("Logo file size must be less than 2MB");
                                }
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const newLogo = event.target.result;
                                  setSettings(prev => ({ ...prev, schoolLogo: newLogo }));
                                  toast.success("Logo uploaded! Click 'Save Changes' to apply.");
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">PNG, JPG or SVG up to 2MB</span>
                      </div>

                      {/* Fields */}
                      <div className="lg:col-span-8 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              School / Institution Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={settings.schoolName || ''}
                              onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                              className="w-full px-3.5 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#29456D] focus:ring-2 focus:ring-blue-600/10 outline-none transition-all text-sm"
                              placeholder="e.g. Qelvora School CRM"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              Header Subtitle / Tagline
                            </label>
                            <input
                              type="text"
                              value={settings.logoSubtext || ''}
                              onChange={(e) => setSettings({ ...settings, logoSubtext: e.target.value })}
                              className="w-full px-3.5 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#29456D] focus:ring-2 focus:ring-blue-600/10 outline-none transition-all text-sm"
                              placeholder="e.g. Empowering Educational Excellence"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Affiliated Curriculum Board
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={settings.board || 'CBSE'}
                              onChange={(e) => setSettings({ ...settings, board: e.target.value })}
                              className="flex-1 px-3.5 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-slate-900 font-medium text-sm focus:border-[#29456D] focus:ring-2 focus:ring-blue-600/10 outline-none cursor-pointer"
                            >
                              {(settings.boardsList || ['CBSE', 'STATE', 'ICSE']).map(boardOpt => (
                                <option key={boardOpt} value={boardOpt}>{boardOpt}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                setNewBoardInput('');
                                setShowAddBoardModal(true);
                              }}
                              className="px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <span>Add Board</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Authentication Policies */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between p-4 bg-slate-50/70 rounded-xl border border-slate-200/80">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">Biometric Face Authentication</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${settings.face_auth_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                              {settings.face_auth_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Require facial recognition at school level</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!settings.face_auth_enabled}
                            onChange={(e) => handleToggleSetting('face_auth_enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#29456D]"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50/70 rounded-xl border border-slate-200/80">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">Campus Geofencing</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${settings.location_auth_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                              {settings.location_auth_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Enforce GPS boundary restrictions (max 500m)</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!settings.location_auth_enabled}
                            onChange={(e) => handleToggleSetting('location_auth_enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#29456D]"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: ACADEMIC TIMINGS & PERIODS */}
                  <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                          Academic Timings & Schedule
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Define shift hours, period lengths, and recess intervals.
                        </p>
                      </div>
                      <span className="text-[11px] bg-slate-100 text-slate-700 font-semibold px-2.5 py-0.5 rounded-md border border-slate-200">
                        Timetable Engine
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      {/* Sub-Card 1: Daily Shift Schedule */}
                      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                        <div className="pb-2 border-b border-slate-200/60">
                          <h4 className="text-xs font-bold text-slate-800">Daily Shift Hours</h4>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              School Starts Time
                            </label>
                            <input
                              type="time"
                              value={settings.office_start_time || '08:30'}
                              onChange={(e) => setSettings({ ...settings, office_start_time: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:border-[#29456D] focus:ring-1 focus:ring-blue-600/10 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              School Ends Time
                            </label>
                            <input
                              type="time"
                              value={settings.office_end_time || '16:00'}
                              onChange={(e) => setSettings({ ...settings, office_end_time: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:border-[#29456D] focus:ring-1 focus:ring-blue-600/10 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Grace Window (Minutes)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                value={settings.grace_period_mins || 0}
                                onChange={(e) => setSettings({ ...settings, grace_period_mins: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:border-[#29456D] focus:ring-1 focus:ring-blue-600/10 outline-none pr-12"
                              />
                              <span className="absolute right-3 top-2 text-[10px] font-semibold text-slate-400">min</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sub-Card 2: Period Allocations */}
                      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                        <div className="pb-2 border-b border-slate-200/60">
                          <h4 className="text-xs font-bold text-slate-800">Period Distribution</h4>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Hours Per Subject
                            </label>
                            <div className="relative">
                              <input
                                type="number" step="0.1" min="0.1"
                                value={settings.hours_per_subject || 1}
                                onChange={(e) => setSettings({ ...settings, hours_per_subject: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:border-[#29456D] focus:ring-1 focus:ring-blue-600/10 outline-none pr-12"
                              />
                              <span className="absolute right-3 top-2 text-[10px] font-semibold text-slate-400">hrs</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Period Duration (Minutes)
                            </label>
                            <div className="relative">
                              <input
                                type="number" min="1"
                                value={settings.period_duration_mins || 45}
                                onChange={(e) => setSettings({ ...settings, period_duration_mins: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:border-[#29456D] focus:ring-1 focus:ring-blue-600/10 outline-none pr-12"
                              />
                              <span className="absolute right-3 top-2 text-[10px] font-semibold text-slate-400">min</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Game / Activity Period
                            </label>
                            <div className="relative">
                              <input
                                type="number" min="0"
                                value={settings.game_period_mins || 45}
                                onChange={(e) => setSettings({ ...settings, game_period_mins: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:border-[#29456D] focus:ring-1 focus:ring-blue-600/10 outline-none pr-12"
                              />
                              <span className="absolute right-3 top-2 text-[10px] font-semibold text-slate-400">min</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sub-Card 3: Recess & Break Windows */}
                      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                        <div className="pb-2 border-b border-slate-200/60">
                          <h4 className="text-xs font-bold text-slate-800">Recess & Intervals</h4>
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Lunch (Duration)</label>
                              <div className="relative">
                                <input
                                  type="number" min="0"
                                  value={settings.lunch_break_mins || 45}
                                  onChange={(e) => setSettings({ ...settings, lunch_break_mins: e.target.value })}
                                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:border-[#29456D] focus:ring-1 focus:ring-blue-600/10 outline-none pr-8"
                                />
                                <span className="absolute right-2 top-2 text-[9px] text-slate-400">min</span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Lunch Starts</label>
                              <input
                                type="time"
                                value={settings.lunch_break_start || '12:00'}
                                onChange={(e) => setSettings({ ...settings, lunch_break_start: e.target.value })}
                                className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:border-[#29456D] focus:ring-1 focus:ring-blue-600/10 outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Short Break</label>
                              <div className="relative">
                                <input
                                  type="number" min="0"
                                  value={settings.small_break_mins || 15}
                                  onChange={(e) => setSettings({ ...settings, small_break_mins: e.target.value })}
                                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:border-[#29456D] focus:ring-1 focus:ring-blue-600/10 outline-none pr-8"
                                />
                                <span className="absolute right-2 top-2 text-[9px] text-slate-400">min</span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Break Starts</label>
                              <input
                                type="time"
                                value={settings.small_break_start || '10:30'}
                                onChange={(e) => setSettings({ ...settings, small_break_start: e.target.value })}
                                className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:border-[#29456D] focus:ring-1 focus:ring-blue-600/10 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: OPERATIONAL BASELINES & WORK HOURS */}
                  <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                          Operational Baselines & Working Hours
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Standard work baselines used for attendance logging, audit tracking, and payroll calculations.
                        </p>
                      </div>
                      <span className="text-[11px] bg-slate-100 text-slate-700 font-semibold px-2.5 py-0.5 rounded-md border border-slate-200">
                        Payroll Baselines
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          Hours Per Day
                        </label>
                        <div className="relative">
                          <input
                            type="number" step="0.5" min="1" max="24"
                            value={settings.hours_per_day || 8}
                            onChange={(e) => setSettings({ ...settings, hours_per_day: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold text-sm focus:border-[#29456D] focus:ring-1 focus:ring-blue-600/10 outline-none pr-14"
                          />
                          <span className="absolute right-3 top-2.5 text-[10px] font-semibold text-slate-400">hrs/day</span>
                        </div>
                      </div>

                      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          Hours Per Week
                        </label>
                        <div className="relative">
                          <input
                            type="number" step="0.5" min="1"
                            value={settings.hours_per_week || 40}
                            onChange={(e) => setSettings({ ...settings, hours_per_week: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold text-sm focus:border-[#29456D] focus:ring-1 focus:ring-blue-600/10 outline-none pr-16"
                          />
                          <span className="absolute right-3 top-2.5 text-[10px] font-semibold text-slate-400">hrs/week</span>
                        </div>
                      </div>

                      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          Hours Per Month
                        </label>
                        <div className="relative">
                          <input
                            type="number" step="0.5" min="1"
                            value={settings.hours_per_month || 160}
                            onChange={(e) => setSettings({ ...settings, hours_per_month: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold text-sm focus:border-[#29456D] focus:ring-1 focus:ring-blue-600/10 outline-none pr-18"
                          />
                          <span className="absolute right-3 top-2.5 text-[10px] font-semibold text-slate-400">hrs/month</span>
                        </div>
                      </div>

                      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          Weekly Off Day
                        </label>
                        <input
                          type="text"
                          value={settings.weekly_off || 'Sunday'}
                          onChange={(e) => setSettings({ ...settings, weekly_off: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold text-sm focus:border-[#29456D] focus:ring-1 focus:ring-blue-600/10 outline-none"
                          placeholder="e.g. Sunday"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Institutional Information Banner */}
          <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-4 mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 text-[#172B4D] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-slate-900 font-semibold text-xs">Global Configuration Notice</p>
              <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                Saving updates will synchronize operational hours, period schedules, and authentication policies across all campus portals and timetable generators.
              </p>
            </div>
          </div>

          {/* Bottom Save Action Bar */}
          <div className="flex items-center justify-end pb-6">
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="px-6 py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving changes...</span>
                </>
              ) : (
                <>
                  <SaveIcon className="w-4 h-4 text-white" />
                  <span>Save School Configuration</span>
                </>
              )}
            </button>
          </div>
          </>
        )}


         {/* CONSOLIDATED REPORT TAB */}
        {activeTab === 'consolidated' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-8 text-gray-900 animate-fadeIn">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#172B4D] flex items-center justify-center border border-blue-100">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Consolidated Monthly Report</h2>
                <p className="text-xs text-slate-500">Aggregated attendance, active hours, and overtime across all departments</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mb-6">
              <select value={reportMonth} onChange={e => setReportMonth(+e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-800 font-semibold">
                {MONTH_NAMES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select value={reportYear} onChange={e => setReportYear(+e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-800 font-semibold">
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Search by name, ID, role, designation, dept..." 
                  value={deptFilter} 
                  onChange={e => setDeptFilter(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && fetchConsolidated()}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-800 font-semibold outline-none focus:border-[#29456D] focus:bg-white transition-all" 
                />
                {deptFilter && (
                  <button 
                    type="button"
                    onClick={() => setDeptFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                    title="Clear filter"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button onClick={fetchConsolidated} className="px-4 py-2 bg-[#29456D] text-white rounded-lg text-sm font-semibold hover:bg-[#172B4D] transition-all flex items-center gap-1.5 shadow-xs">
                <RefreshCw className="w-3.5 h-3.5" /> Load Report
              </button>
              <button onClick={() => handleExport('consolidated')} disabled={exportingType==='consolidated'} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-xs">
                {exportingType==='consolidated' ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <Download className="w-4 h-4" />} Export to Excel
              </button>
            </div>
            {reportLoading ? <div className="text-center py-8"><Spinner size="lg" /></div>
            : consolidated ? (
              <div>
                {(() => {
                  const allEmps = consolidated.employees || [];
                  const filterStr = (deptFilter || '').trim().toLowerCase();
                  const filterClean = filterStr.replace(/[-\s_]/g, '');
                  const filteredEmps = allEmps.filter(emp => {
                    if (!filterStr) return true;
                    const id = (emp.employee_id || '').toLowerCase();
                    const idClean = id.replace(/[-\s_]/g, '');
                    return (
                      (emp.name && emp.name.toLowerCase().includes(filterStr)) ||
                      (id && (id.includes(filterStr) || (filterClean && idClean.includes(filterClean)))) ||
                      (emp.department && emp.department.toLowerCase().includes(filterStr)) ||
                      (emp.designation && emp.designation.toLowerCase().includes(filterStr)) ||
                      (emp.role && emp.role.toLowerCase().includes(filterStr)) ||
                      (emp.email && emp.email.toLowerCase().includes(filterStr))
                    );
                  });

                  return (
                    <div>
                      <div className="mb-4 text-sm text-gray-600 font-medium flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-gray-900">{MONTH_NAMES[consolidated.month]} {consolidated.year}</span> • {consolidated.days_in_month} days •{' '}
                          <span className="font-semibold text-slate-800">
                            {filteredEmps.length} {filteredEmps.length === 1 ? 'employee' : 'employees'}
                          </span>
                          {filterStr && (
                            <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md ml-2 font-semibold">
                              filtered from {allEmps.length}
                            </span>
                          )}
                        </div>
                        {filterStr && (
                          <button
                            type="button"
                            onClick={() => setDeptFilter('')}
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline flex items-center gap-1 cursor-pointer"
                          >
                            <XIcon className="w-3.5 h-3.5" /> Clear Filter
                          </button>
                        )}
                      </div>

                      {filteredEmps.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-2xl">
                          <p className="text-gray-500 font-medium">No employees found matching "{deptFilter}"</p>
                          <button
                            type="button"
                            onClick={() => setDeptFilter('')}
                            className="mt-2 text-xs font-semibold text-[#172B4D] hover:underline cursor-pointer"
                          >
                            Clear search filter
                          </button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm">
                          <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                              <tr>
                                {['Employee','Employee ID','Role / Dept','Days Present','Days Absent','Total Hours','Target Hours','OT Hours','Deficit Hours','Total Late','Total Early'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {filteredEmps.map((emp,i) => {
                                let displayEmpId = emp.employee_id || '';
                                if (displayEmpId.includes('918827') || /shrujay/i.test(emp.name)) {
                                  displayEmpId = 'TCH007';
                                } else if (/([A-Za-z]+[-_]?)(\d{4,})/.test(displayEmpId)) {
                                  displayEmpId = displayEmpId.replace(/([A-Za-z]+[-_]?)(\d+)/, (match, prefix, num) => {
                                    return `${prefix}${num.slice(-3).padStart(3, '0')}`;
                                  });
                                }

                                return (
                                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3"><div className="font-bold text-[#173F35] cursor-pointer hover:underline" onClick={() => handleUserClick(displayEmpId)}>{emp.name}</div></td>
                                    <td className="px-4 py-3 font-mono font-bold text-[#173F35] whitespace-nowrap">{displayEmpId}</td>
                                    <td className="px-4 py-3"><span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">{emp.department || emp.designation || emp.role}</span></td>
                                    <td className="px-4 py-3 text-center"><span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">{emp.days_present}</span></td>
                                    <td className="px-4 py-3 text-center"><span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full font-bold">{emp.days_absent}</span></td>
                                    <td className="px-4 py-3 text-center font-mono font-bold text-gray-700">{emp.total_hours}h</td>
                                    <td className="px-4 py-3 text-center font-mono text-gray-750">{emp.target_hours}h</td>
                                    <td className="px-4 py-3 text-center font-mono text-emerald-600 font-bold">{emp.overtime_hours > 0 ? `+${emp.overtime_hours}h` : '-'}</td>
                                    <td className="px-4 py-3 text-center font-mono text-rose-600 font-bold">{emp.deficit_hours > 0 ? `-${emp.deficit_hours}h` : '-'}</td>
                                    <td className="px-4 py-3 text-center font-mono text-amber-600 font-bold">{emp.total_late || '-'}</td>
                                    <td className="px-4 py-3 text-center font-mono text-teal-650 font-bold">{emp.total_early || '-'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : <p className="text-center text-gray-400 py-8 italic bg-gray-50 border border-gray-200 rounded-2xl">Select month/year and click "Load Report"</p>}
          </div>
        )}

        {/* DETAILS REPORT TAB */}
        {activeTab === 'details' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-8 text-gray-900 animate-fadeIn">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#172B4D] flex items-center justify-center border border-blue-100">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Detailed Attendance Report</h2>
                <p className="text-xs text-slate-500">Day-by-day attendance log, in/out punch stamps, and session metrics</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mb-6">
              <select value={reportMonth} onChange={e => setReportMonth(+e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-800 font-semibold">
                {MONTH_NAMES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select value={reportYear} onChange={e => setReportYear(+e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-800 font-semibold">
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Search by name, ID, role, designation, dept..." 
                  value={deptFilter} 
                  onChange={e => setDeptFilter(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && fetchDetails()}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-800 font-semibold outline-none focus:border-[#29456D] focus:bg-white transition-all" 
                />
                {deptFilter && (
                  <button 
                    type="button"
                    onClick={() => setDeptFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                    title="Clear filter"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button onClick={fetchDetails} className="px-4 py-2 bg-[#29456D] text-white rounded-lg text-sm font-semibold hover:bg-[#172B4D] transition-all flex items-center gap-1.5 shadow-xs">
                <RefreshCw className="w-3.5 h-3.5" /> Load Report
              </button>
              <button onClick={() => handleExport('details')} disabled={exportingType==='details'} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-xs">
                {exportingType==='details' ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <Download className="w-4 h-4" />} Export to Excel
              </button>
            </div>
            {reportLoading ? <div className="text-center py-8"><Spinner size="lg" /></div>
            : details ? (
              <div className="space-y-6">
                {(() => {
                  const allEmps = details.employees || [];
                  const filterStr = (deptFilter || '').trim().toLowerCase();
                  const filterClean = filterStr.replace(/[-\s_]/g, '');
                  const filteredEmps = allEmps.filter(emp => {
                    if (!filterStr) return true;
                    const id = (emp.employee_id || '').toLowerCase();
                    const idClean = id.replace(/[-\s_]/g, '');
                    return (
                      (emp.name && emp.name.toLowerCase().includes(filterStr)) ||
                      (id && (id.includes(filterStr) || (filterClean && idClean.includes(filterClean)))) ||
                      (emp.department && emp.department.toLowerCase().includes(filterStr)) ||
                      (emp.designation && emp.designation.toLowerCase().includes(filterStr)) ||
                      (emp.role && emp.role.toLowerCase().includes(filterStr)) ||
                      (emp.email && emp.email.toLowerCase().includes(filterStr))
                    );
                  });

                  const dateRows = filteredEmps[0]?.daily || [];

                  return (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <p className="text-sm text-gray-600 font-medium">
                          <span className="font-bold text-gray-900">{MONTH_NAMES[details.month]} {details.year}</span> • {details.days_in_month} days •{' '}
                          <span className="font-semibold text-slate-800">
                            {filteredEmps.length} {filteredEmps.length === 1 ? 'employee' : 'employees'}
                          </span>
                          {filterStr && (
                            <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md ml-2 font-semibold">
                              filtered from {allEmps.length}
                            </span>
                          )}
                        </p>
                        {filterStr && (
                          <button
                            type="button"
                            onClick={() => setDeptFilter('')}
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline flex items-center gap-1 cursor-pointer"
                          >
                            <XIcon className="w-3.5 h-3.5" /> Clear Filter
                          </button>
                        )}
                      </div>

                      {filteredEmps.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-2xl">
                          <p className="text-gray-500 font-medium">No employees found matching "{deptFilter}"</p>
                          <button
                            type="button"
                            onClick={() => setDeptFilter('')}
                            className="mt-2 text-xs font-semibold text-[#172B4D] hover:underline cursor-pointer"
                          >
                            Clear search filter
                          </button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-[#E4DED2] rounded-2xl shadow-sm max-h-[600px] overflow-y-auto bg-[#FFFFFF]">
                      <table className="min-w-full divide-y divide-[#E4DED2] text-xs">
                        <thead className="bg-slate-900 text-white sticky top-0 z-20">
                          <tr>
                            <th className="px-3.5 py-3 text-left font-extrabold uppercase tracking-wider sticky left-0 bg-slate-900 z-30 border-r border-slate-800 min-w-[160px]">
                              <div className="text-white text-xs font-bold">EMPLOYEE</div>
                              <div className="text-[#C49A55] text-[9px] font-mono tracking-widest">DETAILS & ID</div>
                            </th>
                            {dateRows.map((row, j) => {
                              const dayNum = row.date?.split('-')[2] || (j + 1);
                              const shortDay = row.day?.slice(0, 3) || '';
                              return (
                                <th key={j} className="px-2 py-2.5 text-center font-bold uppercase tracking-wider whitespace-nowrap min-w-[48px] border-r border-[#234E43]">
                                  <div className="flex flex-col items-center">
                                    <span className="text-white font-extrabold text-xs">{dayNum}</span>
                                    <span className="text-[9px] text-[#C49A55] font-mono font-bold uppercase">{shortDay}</span>
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E4DED2] bg-[#FFFFFF]">
                          {filteredEmps.map((emp, i) => {
                            let displayEmpId = emp.employee_id || emp.employeeId || '';
                            if (displayEmpId.includes('918827') || /shrujay/i.test(emp.name)) {
                              displayEmpId = 'TCH-007';
                            } else if (/([A-Za-z]+[-_]?)(\d{4,})/.test(displayEmpId)) {
                              displayEmpId = displayEmpId.replace(/([A-Za-z]+[-_]?)(\d+)/, (match, prefix, num) => {
                                return `${prefix}${num.slice(-3).padStart(3, '0')}`;
                              });
                            }

                            return (
                              <tr key={emp.employee_id || i} className="hover:bg-[#F3F0E8]/50 transition-colors">
                                <td className="px-3.5 py-3 sticky left-0 bg-[#FFFDF9] z-10 border-r border-[#E4DED2] shadow-xs whitespace-nowrap min-w-[160px]">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-[#173F35] text-xs">{emp.name}</span>
                                    <span className="text-[10px] text-[#B89558] font-mono font-semibold">{displayEmpId}</span>
                                  </div>
                                </td>
                                {dateRows.map((_, j) => {
                                  const dayData = emp.daily?.[j] || {};
                                  const isPresent = dayData.status === 'Present' || dayData.status === 'In Office';
                                  const isAbsent = dayData.status === 'Absent';
                                  const isLeave = dayData.status === 'Leave';
                                  const isHalfDay = dayData.status === 'Half Day';
                                  const isWeeklyOff = dayData.status === 'Weekly Off';

                                  return (
                                    <td key={j} className="px-1.5 py-2.5 text-center border-r border-[#E4DED2]">
                                      {isPresent ? (
                                        <span 
                                          onClick={() => handleOpenEditAttModal(emp, dayData)} 
                                          title={`Click to edit ${emp.name} (${dayData.date}) | Status: ${dayData.status}`}
                                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#173F35] hover:bg-[#102F29] text-white font-extrabold text-[10px] shadow-xs cursor-pointer hover:scale-110 active:scale-95 transition-all"
                                        >
                                          P
                                        </span>
                                      ) : isAbsent ? (
                                        <span 
                                          onClick={() => handleOpenEditAttModal(emp, dayData)}
                                          title={`Click to edit ${emp.name} (${dayData.date}) | Status: Absent`}
                                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-[10px] shadow-xs cursor-pointer hover:scale-110 active:scale-95 transition-all border border-rose-800"
                                        >
                                          A
                                        </span>
                                      ) : isLeave ? (
                                        <span 
                                          onClick={() => handleOpenEditAttModal(emp, dayData)}
                                          title={`Click to edit ${emp.name} (${dayData.date}) | Status: Leave`}
                                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#B89558] hover:bg-[#997B47] text-white font-extrabold text-[10px] shadow-xs cursor-pointer hover:scale-110 active:scale-95 transition-all"
                                        >
                                          L
                                        </span>
                                      ) : isHalfDay ? (
                                        <span 
                                          onClick={() => handleOpenEditAttModal(emp, dayData)}
                                          title={`Click to edit ${emp.name} (${dayData.date}) | Status: Half Day`}
                                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] shadow-xs cursor-pointer hover:scale-110 active:scale-95 transition-all"
                                        >
                                          HD
                                        </span>
                                      ) : isWeeklyOff ? (
                                        <span 
                                          onClick={() => handleOpenEditAttModal(emp, dayData)}
                                          title={`Click to edit ${emp.name} (${dayData.date}) | Status: Weekly Off`}
                                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F3F0E8] hover:bg-[#E5DFD2] text-[#6E716D] font-bold text-[9px] cursor-pointer hover:scale-110 active:scale-95 transition-all border border-[#E4DED2]"
                                        >
                                          WO
                                        </span>
                                      ) : (
                                        <span 
                                          onClick={() => handleOpenEditAttModal(emp, dayData)}
                                          title={`Click to edit ${emp.name} (${dayData.date}) | Status: ${dayData.status}`}
                                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-[10px] shadow-xs cursor-pointer hover:scale-110 active:scale-95 transition-all"
                                        >
                                          A
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      </div>
                    )}
                  </>
                );
              })()}
              </div>
            ) : <p className="text-center text-gray-400 py-8 italic bg-gray-50 border border-gray-200 rounded-2xl">Select month/year and click "Load Report"</p>}
          </div>
        )}

        {/* DAILY OPERATIONAL STATUS MONITOR TAB */}
        {activeTab === 'daily_status' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-8 text-gray-900 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#172B4D] flex items-center justify-center border border-blue-100">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Daily Operational Status</h2>
                    <p className="text-xs text-slate-500">Real-time login, logout, and geo-fence tracking for all employees</p>
                  </div>
                </div>
              </div>

              {/* Date Selector, Quick Search & Export */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  <button
                    onClick={() => {
                      const prev = new Date(dailyStatusDate);
                      prev.setDate(prev.getDate() - 1);
                      setDailyStatusDate(prev.toLocaleDateString('en-CA'));
                    }}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors"
                    title="Yesterday"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <input
                    type="date"
                    value={dailyStatusDate}
                    onChange={(e) => setDailyStatusDate(e.target.value)}
                    className="bg-transparent text-slate-900 font-semibold outline-none text-sm px-2 cursor-pointer"
                  />
                  <button
                    onClick={() => {
                      const next = new Date(dailyStatusDate);
                      next.setDate(next.getDate() + 1);
                      setDailyStatusDate(next.toLocaleDateString('en-CA'));
                    }}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors"
                    title="Tomorrow"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDailyStatusDate(new Date().toLocaleDateString('en-CA'))}
                    className="px-2.5 py-1 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                </div>

                <button
                  onClick={() => handleExport('consolidated')}
                  disabled={exportingType === 'consolidated'}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Export Daily Status to Excel"
                >
                  {exportingType === 'consolidated' ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <Download className="w-3.5 h-3.5" />}
                  <span>Export Excel</span>
                </button>
              </div>
            </div>

            {/* Quick Search & Department Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Employee ID, Name, Role, or Status..."
                  value={dailySearchQuery}
                  onChange={(e) => setDailySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] transition-all"
                />
                {dailySearchQuery && (
                  <button 
                    onClick={() => setDailySearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Sciences & AI">Sciences & AI</option>
                <option value="Languages & Literature">Languages & Literature</option>
                <option value="Social Sciences & Humanities">Social Sciences & Humanities</option>
                <option value="Executive Leadership">Executive Leadership</option>
                <option value="Operations & Administration">Operations & Administration</option>
              </select>
            </div>

            {/* Quick Metrics Widget */}
            {!dailyStatusLoading && dailyStatusData.length > 0 && (() => {
              const present = dailyStatusData.filter(d => ['In Office', 'Left Office', 'Present'].includes(d.status)).length;
              const notLoggedIn = dailyStatusData.filter(d => d.status === 'Not Logged In').length;
              const absent = dailyStatusData.filter(d => d.status === 'Absent').length;
              const weeklyOff = dailyStatusData.filter(d => d.status === 'Weekly Off').length;

              return (
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {/* PRESENT CARD */}
                    <div 
                      onClick={() => setDailyStatusFilter(dailyStatusFilter === 'PRESENT' ? 'ALL' : 'PRESENT')}
                      className={`bg-emerald-50 border rounded-2xl p-4 text-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm ${
                        dailyStatusFilter === 'PRESENT' ? 'border-emerald-500 ring-2 ring-emerald-500 bg-emerald-100/60' : 'border-emerald-200 hover:border-emerald-400'
                      }`}
                      title="Click to filter by Present employees"
                    >
                      <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{present}</p>
                      <p className="text-xs text-emerald-600 mt-1 uppercase tracking-wider font-bold">Present</p>
                    </div>

                    {/* NOT LOGGED IN CARD */}
                    <div 
                      onClick={() => setDailyStatusFilter(dailyStatusFilter === 'NOT_LOGGED_IN' ? 'ALL' : 'NOT_LOGGED_IN')}
                      className={`bg-amber-50 border rounded-2xl p-4 text-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm ${
                        dailyStatusFilter === 'NOT_LOGGED_IN' ? 'border-amber-500 ring-2 ring-amber-500 bg-amber-100/60' : 'border-amber-200 hover:border-amber-400'
                      }`}
                      title="Click to filter by Not Logged In employees"
                    >
                      <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">{notLoggedIn}</p>
                      <p className="text-xs text-amber-600 mt-1 uppercase tracking-wider font-bold">Not Logged In</p>
                    </div>

                    {/* ABSENT CARD */}
                    <div 
                      onClick={() => setDailyStatusFilter(dailyStatusFilter === 'ABSENT' ? 'ALL' : 'ABSENT')}
                      className={`bg-red-50 border rounded-2xl p-4 text-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm ${
                        dailyStatusFilter === 'ABSENT' ? 'border-red-500 ring-2 ring-red-500 bg-red-100/60' : 'border-red-200 hover:border-red-400'
                      }`}
                      title="Click to filter by Absent employees"
                    >
                      <p className="text-2xl sm:text-3xl font-extrabold text-red-600">{absent}</p>
                      <p className="text-xs text-red-600 mt-1 uppercase tracking-wider font-bold">Absent</p>
                    </div>

                    {/* WEEKLY OFF CARD */}
                    <div 
                      onClick={() => setDailyStatusFilter(dailyStatusFilter === 'WEEKLY_OFF' ? 'ALL' : 'WEEKLY_OFF')}
                      className={`bg-purple-50 border rounded-2xl p-4 text-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm ${
                        dailyStatusFilter === 'WEEKLY_OFF' ? 'border-purple-500 ring-2 ring-purple-500 bg-purple-100/60' : 'border-purple-200 hover:border-purple-400'
                      }`}
                      title="Click to filter by Weekly Off employees"
                    >
                      <p className="text-2xl sm:text-3xl font-extrabold text-purple-600">{weeklyOff}</p>
                      <p className="text-xs text-purple-600 mt-1 uppercase tracking-wider font-bold">Weekly Off</p>
                    </div>
                  </div>

                  {/* Filter Active Badge */}
                  {dailyStatusFilter !== 'ALL' && (
                    <div className="flex items-center justify-between bg-stone-100 px-4 py-2 rounded-xl text-xs border border-stone-200">
                      <span className="font-bold text-stone-700">
                        Filtering by status: <strong className="text-[#172B4D] uppercase font-mono">{dailyStatusFilter.replace(/_/g, ' ')}</strong>
                      </span>
                      <button 
                        onClick={() => setDailyStatusFilter('ALL')}
                        className="px-2.5 py-1 bg-white hover:bg-stone-200 text-stone-700 font-semibold border border-stone-300 rounded-lg transition-colors cursor-pointer"
                      >
                        Clear Filter (Show All {dailyStatusData.length})
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {dailyStatusLoading ? (
              <div className="text-center py-12"><Spinner size="lg" className="mx-auto" /></div>
            ) : dailyStatusData.length === 0 ? (
              <p className="text-center text-gray-400 py-8 italic bg-gray-50 border border-gray-200 rounded-2xl">No records found for selected date.</p>
            ) : (() => {
              const queryLower = (dailySearchQuery || '').toLowerCase().trim();
              const filteredData = dailyStatusData.filter(d => {
                if (dailyStatusFilter === 'PRESENT' && !['In Office', 'Left Office', 'Present'].includes(d.status)) return false;
                if (dailyStatusFilter === 'NOT_LOGGED_IN' && d.status !== 'Not Logged In') return false;
                if (dailyStatusFilter === 'ABSENT' && d.status !== 'Absent') return false;
                if (dailyStatusFilter === 'WEEKLY_OFF' && d.status !== 'Weekly Off') return false;

                if (deptFilter && deptFilter !== 'ALL' && d.department !== deptFilter) return false;

                if (queryLower) {
                  const matchId = (d.employee_id || '').toLowerCase().includes(queryLower);
                  const matchName = (d.name || '').toLowerCase().includes(queryLower);
                  const matchDept = (d.department || '').toLowerCase().includes(queryLower);
                  const matchStatus = (d.status || '').toLowerCase().includes(queryLower);
                  if (!matchId && !matchName && !matchDept && !matchStatus) return false;
                }
                return true;
              });

              if (filteredData.length === 0) {
                return (
                  <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-2xl">
                    <p className="text-gray-500 text-xs italic font-medium">No employees found matching the active search or filters.</p>
                    <button 
                      onClick={() => { setDailyStatusFilter('ALL'); setDailySearchQuery(''); setDeptFilter('ALL'); }} 
                      className="mt-2 text-[#172B4D] font-bold text-xs hover:underline cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm max-h-[550px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase sticky top-0 z-10 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left">Employee ID</th>
                        <th className="px-4 py-3 text-left">Employee Name</th>
                        <th className="px-4 py-3 text-left">Role / Department</th>
                        <th className="px-4 py-3 text-left">Punch-In Time</th>
                        <th className="px-4 py-3 text-left">Punch-Out Time</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredData.map((d, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-[#172B4D] cursor-pointer hover:underline" onClick={() => handleUserClick(d.employee_id)}>{d.employee_id}</td>
                          <td className="px-4 py-3 font-bold text-gray-850">{d.name}</td>
                          <td className="px-4 py-3 text-gray-500 font-semibold">{d.department || 'Academic Staff'}</td>
                          <td className="px-4 py-3 font-mono text-emerald-600 font-bold">{d.punch_in ? new Date(d.punch_in).toLocaleTimeString() : '—'}</td>
                          <td className="px-4 py-3 font-mono text-rose-650 font-bold">{d.punch_out ? new Date(d.punch_out).toLocaleTimeString() : '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] border ${
                              ['In Office', 'Left Office', 'Present'].includes(d.status)
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                                : d.status === 'Weekly Off'
                                  ? 'bg-purple-50 text-purple-800 border-purple-200 font-bold'
                                  : 'bg-red-50 text-red-800 border-red-200 font-bold'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenEditAttModal({ employee_id: d.employee_id, name: d.name }, { date: dailyStatusDate, status: d.status, punch_in: d.punch_in, punch_out: d.punch_out })}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg border border-slate-200 transition-colors cursor-pointer"
                              title="Edit Attendance Status for this day"
                            >
                              Edit Status
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* PERSONAL DETAILS REPORT TAB */}
        {activeTab === 'individual_details' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-8 text-gray-900 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#172B4D] flex items-center justify-center border border-blue-100">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Personal Details</h2>
                  <p className="text-xs text-slate-500">Individual punch history and attendance performance logs</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Employee Selector for Personal Details */}
                {details?.employees && details.employees.length > 0 && (
                  <select
                    value={selectedEmpIdForDetails}
                    onChange={(e) => setSelectedEmpIdForDetails(e.target.value)}
                    className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900 font-bold outline-none cursor-pointer focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D]"
                  >
                    <option value="">-- All Employees ({details.employees.length}) --</option>
                    {details.employees.map(e => (
                      <option key={e.employee_id || e._id} value={e.employee_id}>
                        {e.name} ({e.employee_id})
                      </option>
                    ))}
                  </select>
                )}

                <select value={reportMonth} onChange={e => setReportMonth(+e.target.value)} className="px-3 py-2 border border-gray-300 rounded-xl text-xs bg-gray-50 text-gray-800 font-semibold cursor-pointer">
                  {MONTH_NAMES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>

                <select value={reportYear} onChange={e => setReportYear(+e.target.value)} className="px-3 py-2 border border-gray-300 rounded-xl text-xs bg-gray-50 text-gray-800 font-semibold cursor-pointer">
                  {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                <button onClick={fetchDetails} className="px-4 py-2 bg-[#29456D] text-white rounded-xl text-xs font-bold hover:bg-[#172B4D] transition-all cursor-pointer">
                  Load Report
                </button>

                <button 
                  onClick={() => handleExport('details', selectedEmpIdForDetails || user?.employee_id || user?.employeeId)} 
                  disabled={exportingType==='details'} 
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  {exportingType==='details' ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <Download className="w-3.5 h-3.5" />} 
                  <span>Export to Excel</span>
                </button>
              </div>
            </div>

            {reportLoading ? (
              <div className="text-center py-8"><Spinner size="lg" /></div>
            ) : details ? (
              <div className="space-y-6">
                <p className="text-xs text-gray-600 font-medium">
                  Showing records for <span className="font-bold text-[#172B4D]">{MONTH_NAMES[details.month]} {details.year}</span> • {details.days_in_month} days in month
                </p>

                {(() => {
                  const allEmps = details.employees || [];
                  let displayEmps = allEmps;
                  
                  if (selectedEmpIdForDetails) {
                    displayEmps = allEmps.filter(emp => 
                      emp.employee_id === selectedEmpIdForDetails || 
                      emp.employeeId === selectedEmpIdForDetails || 
                      emp.name === selectedEmpIdForDetails
                    );
                  } else {
                    const myMatch = allEmps.filter(emp => 
                      emp.employee_id === user?.employee_id || 
                      emp.employee_id === user?.employeeId || 
                      (emp.name && user?.name && emp.name.toLowerCase() === user.name.toLowerCase())
                    );
                    if (myMatch.length > 0) {
                      displayEmps = myMatch;
                    }
                  }

                  if (displayEmps.length === 0) {
                    displayEmps = allEmps.length > 0 ? [allEmps[0]] : [];
                  }

                  if (displayEmps.length === 0) {
                    return <p className="text-center text-gray-400 py-8 italic bg-gray-50 border border-gray-200 rounded-2xl">No employee records found in the monthly data.</p>;
                  }

                  const dateRows = displayEmps[0]?.daily || [];

                  return (
                    <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm max-w-full overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-stone-900 text-amber-200 sticky top-0 z-20">
                          <tr>
                            <th className="px-3 py-3 text-left font-bold uppercase tracking-wider sticky left-0 bg-stone-900 z-30 border-r border-stone-850 min-w-[160px]">
                              Employee
                            </th>
                            {dateRows.map((row, j) => {
                              const dayNum = row.date?.split('-')[2] || (j + 1);
                              const shortDay = row.day?.slice(0, 3) || '';
                              return (
                                <th key={j} className="px-2 py-2.5 text-center font-bold uppercase tracking-wider whitespace-nowrap min-w-[50px] border-r border-stone-850">
                                  <div className="flex flex-col items-center">
                                    <span className="text-white font-black text-xs">{dayNum}</span>
                                    <span className="text-[9px] text-amber-400/70 font-mono font-medium">{shortDay}</span>
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 bg-white">
                          {displayEmps.map((emp, i) => (
                            <tr key={emp.employee_id || i} className="hover:bg-amber-50/20">
                              <td className="px-3 py-2.5 sticky left-0 bg-white z-10 border-r border-gray-150 shadow-sm whitespace-nowrap min-w-[160px]">
                                <div className="flex flex-col">
                                  <span className="font-bold text-gray-900 text-xs">{emp.name}</span>
                                  <span className="text-[9px] text-gray-500 font-mono font-bold">{emp.employee_id}</span>
                                </div>
                              </td>
                              {dateRows.map((_, j) => {
                                const dayData = emp.daily?.[j] || {};
                                const isPresent = ['Present', 'In Office', 'Left Office'].includes(dayData.status);
                                const isWeeklyOff = dayData.status === 'Weekly Off';
                                const isHalfDay = dayData.status === 'Half Day';
                                return (
                                  <td key={j} className="px-2 py-2.5 text-center border-r border-gray-100">
                                    {isPresent ? (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-[10px] shadow-xs" title="Present">P</span>
                                    ) : isWeeklyOff ? (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-[9px] border border-purple-200" title="Weekly Off">WO</span>
                                    ) : isHalfDay ? (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white font-black text-[9px] shadow-xs" title="Half Day">HD</span>
                                    ) : (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50 text-red-500 font-black text-[10px] ring-1 ring-red-500/20" title="Absent">A</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            ) : <p className="text-center text-gray-400 py-8 italic bg-gray-50 border border-gray-200 rounded-2xl">Select month/year and click "Load Report"</p>}
          </div>
        )}
        {activeTab === 'roles' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden mb-8 text-slate-900 transition-all">
            {/* Header */}
            <div className="bg-white px-6 sm:px-8 py-5 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#172B4D] shrink-0">
                  <ShieldCheck className="w-5 h-5 text-[#172B4D]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Role & Privilege Management
                  </h2>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-normal">
                    Configure institutional user roles, security scopes, codes, and administrative privileges.
                  </p>
                </div>
              </div>
              
              {isAdminUser && (
                <button
                  onClick={() => {
                    setEditingRole(null);
                    setRoleForm({ RoleCode: 'AUTO-GENERATED', Rolename: '', GantAdminPrevillage: false });
                    setIsRoleModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Role</span>
                </button>
              )}
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Controls Search */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                  <input
                    type="text"
                    placeholder="Search roles by name or code..."
                    value={rolesSearch}
                    onChange={(e) => setRolesSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 font-medium text-xs focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none transition-all shadow-2xs"
                  />
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                </div>

                <div className="text-xs font-semibold text-slate-500">
                  Total Configured Roles: <span className="text-[#172B4D] font-bold">{roles.length}</span>
                </div>
              </div>

              {rolesLoading ? (
                <div className="text-center py-16"><Spinner size="lg" /></div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="min-w-full text-sm text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold tracking-wider border-b border-slate-200">
                        <th className="px-5 py-3.5">Role Code</th>
                        <th className="px-5 py-3.5">Role Name</th>
                        <th className="px-5 py-3.5 text-center">Status</th>
                        <th className="px-5 py-3.5">Grant Admin Privilege</th>
                        <th className="px-5 py-3.5">Created By</th>
                        {isAdminUser && <th className="px-5 py-3.5 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {roles
                        .filter(r => 
                          r.RoleCode?.toLowerCase().includes(rolesSearch.toLowerCase()) || 
                          r.Rolename?.toLowerCase().includes(rolesSearch.toLowerCase())
                        )
                        .map(r => (
                          <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-4 font-mono text-slate-800 font-semibold text-xs">{r.RoleCode}</td>
                            <td className="px-5 py-4 font-semibold text-slate-900 text-sm">{r.Rolename}</td>
                            <td className="px-5 py-4 text-center">
                              <div className="inline-flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                  r.isActive !== false
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${r.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                  {r.isActive !== false ? 'Active' : 'Inactive'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleRoleStatus(r)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                                >
                                  {r.isActive !== false ? 'Disable' : 'Enable'}
                                </button>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
                                r.GantAdminPrevillage 
                                  ? 'bg-blue-50 text-[#172B4D] border-blue-200' 
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {r.GantAdminPrevillage ? (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5 text-[#172B4D]" />
                                    <span>Admin Privilege</span>
                                  </>
                                ) : (
                                  <>
                                    <User className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Standard Access</span>
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-slate-500 font-medium text-xs">{r.CreatedBy || 'Admin'}</td>
                            {isAdminUser && (
                              <td className="px-5 py-4 text-right">
                                <div className="inline-flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingRole(r);
                                      setRoleForm({
                                        RoleCode: r.RoleCode,
                                        Rolename: r.Rolename,
                                        GantAdminPrevillage: !!r.GantAdminPrevillage,
                                        isActive: r.isActive !== false
                                      });
                                      setIsRoleModalOpen(true);
                                    }}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRoleDelete(r._id)}
                                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium border border-rose-200 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      {roles.filter(r => 
                        r.RoleCode?.toLowerCase().includes(rolesSearch.toLowerCase()) || 
                        r.Rolename?.toLowerCase().includes(rolesSearch.toLowerCase())
                      ).length === 0 && (
                        <tr>
                          <td colSpan={user?.role === 'admin' ? 6 : 5} className="px-5 py-12 text-center text-slate-400 font-medium">
                            No roles found matching the search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (() => {
          const formatSessionDate = (session) => {
            if (session.date && session.date !== 'Invalid Date') return session.date;
            if (session.startTime) {
              const d = new Date(session.startTime);
              if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' });
              }
            }
            return new Date().toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' });
          };

          const formatSessionTime = (timeVal) => {
            if (!timeVal || timeVal === '—' || timeVal === 'Invalid Date') return '—';
            if (typeof timeVal === 'string' && (timeVal.toLowerCase().includes('am') || timeVal.toLowerCase().includes('pm'))) {
              return timeVal.toUpperCase();
            }
            try {
              const d = new Date(timeVal);
              if (isNaN(d.getTime())) return typeof timeVal === 'string' && timeVal !== 'Invalid Date' ? timeVal : '—';
              return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            } catch (e) {
              return '—';
            }
          };

          // Filter option lists
          const standardOptions = Array.from(new Set([
            '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th',
            ...classSessions.map(s => s.standard || s.class?.standard),
            ...(classes || []).map(c => c.standard)
          ])).filter(Boolean);

          const sectionOptions = Array.from(new Set([
            'A', 'B', 'C', 'D',
            ...classSessions.map(s => s.section || s.class?.section),
            ...(classes || []).map(c => c.section)
          ])).filter(Boolean);

          const teacherOptions = Array.from(new Set([
            ...classSessions.map(s => s.teacher?.name || s.teacherName || (typeof s.teacher === 'string' ? s.teacher : '')),
            ...(employees || []).map(e => e.name)
          ])).filter(Boolean).sort();

          // Filtering logic
          const filteredSessions = classSessions.filter(session => {
            // Search text
            if (classSessionsSearch.trim()) {
              const q = classSessionsSearch.toLowerCase().trim();
              const teacherName = (session.teacher?.name || session.teacherName || (typeof session.teacher === 'string' ? session.teacher : '')).toLowerCase();
              const empId = (session.teacher?.employeeId || session.employeeId || '').toLowerCase();
              const std = (session.standard || session.class?.standard || '').toLowerCase();
              const sec = (session.section || session.class?.section || '').toLowerCase();
              const sub = (session.subject?.name || session.subjectName || (typeof session.subject === 'string' ? session.subject : '')).toLowerCase();
              const room = (session.class?.roomNumber || session.roomNumber || '').toLowerCase();
              const match = teacherName.includes(q) || empId.includes(q) || std.includes(q) || sec.includes(q) || `${std}-${sec}`.includes(q) || sub.includes(q) || room.includes(q);
              if (!match) return false;
            }

            // Session active/completed filter
            const isAct = session.status === 'active' || session.status === 'in-progress';
            if (classSessionsStatusFilter === 'active' && !isAct) return false;
            if (classSessionsStatusFilter === 'completed' && isAct) return false;

            // Standard filter
            if (classSessionsStandardFilter !== 'All') {
              const curStd = (session.standard || session.class?.standard || '').toLowerCase();
              if (curStd !== classSessionsStandardFilter.toLowerCase()) return false;
            }

            // Section filter
            if (classSessionsSectionFilter !== 'All') {
              const curSec = (session.section || session.class?.section || '').toLowerCase();
              if (curSec !== classSessionsSectionFilter.toLowerCase()) return false;
            }

            // Teacher filter
            if (classSessionsTeacherFilter !== 'All') {
              const tName = session.teacher?.name || session.teacherName || (typeof session.teacher === 'string' ? session.teacher : '');
              if (tName.toLowerCase() !== classSessionsTeacherFilter.toLowerCase()) return false;
            }

            // Punctuality / Late Filter
            const lateMins = Number(session.lateMinutes) || 0;
            const severity = session.lateSeverity || (lateMins > 25 ? 'red' : lateMins > 15 ? 'orange' : lateMins > 0 ? 'yellow' : 'on-time');
            if (classSessionsPunctualityFilter === 'on-time' && (severity !== 'on-time' && lateMins > 0)) return false;
            if (classSessionsPunctualityFilter === 'yellow' && severity !== 'yellow') return false;
            if (classSessionsPunctualityFilter === 'orange' && severity !== 'orange') return false;
            if (classSessionsPunctualityFilter === 'red' && severity !== 'red') return false;
            if (classSessionsPunctualityFilter === 'any-late' && lateMins <= 0) return false;

            return true;
          });

          // Metrics
          const totalSessions = classSessions.length;
          const activeSessionsCount = classSessions.filter(s => s.status === 'active' || s.status === 'in-progress').length;
          const onTimeCount = classSessions.filter(s => (s.lateMinutes || 0) <= 0).length;
          const yellowLateCount = classSessions.filter(s => (s.lateSeverity === 'yellow' || ((s.lateMinutes || 0) > 0 && (s.lateMinutes || 0) <= 15))).length;
          const orangeLateCount = classSessions.filter(s => (s.lateSeverity === 'orange' || ((s.lateMinutes || 0) > 15 && (s.lateMinutes || 0) <= 25))).length;
          const redLateCount = classSessions.filter(s => (s.lateSeverity === 'red' || (s.lateMinutes || 0) > 25)).length;

          return (
            <div className="space-y-6 animate-fadeIn pb-12">
              {/* Executive Header Banner */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#29456D]/10 border border-[#29456D]/20 flex items-center justify-center text-[#172B4D] shrink-0 shadow-2xs">
                    <History className="w-6 h-6 text-[#172B4D]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        Class Sessions & Punctuality Radar
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#29456D]/10 text-[#172B4D] border border-[#29456D]/20">
                        Principal Supervision
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                      Monitor teacher check-in times across classes & sections. Issue official explanation notices for late faculty.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => setShowLogSessionModal(true)}
                    className="px-4 py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Log Class Check-In</span>
                  </button>
                  <button
                    onClick={fetchClassSessionsList}
                    disabled={loadingClassSessions}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Refresh Class Sessions"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingClassSessions ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards with Punctuality Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Sessions */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Sessions</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{totalSessions}</p>
                    <span className="text-[11px] text-slate-400 mt-0.5 inline-block">Scheduled across classes</span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#172B4D]">
                    <BookOpen className="w-5 h-5 text-[#172B4D]" />
                  </div>
                </div>

                {/* On-Time Check-Ins */}
                <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">On-Time (Green)</p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{onTimeCount}</p>
                    <span className="text-[11px] text-emerald-600 font-medium mt-0.5 inline-block">Prompt check-ins</span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>

                {/* Moderate Delays (Yellow + Orange) */}
                <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <p className="text-xs font-medium text-amber-800 uppercase tracking-wider">Delays (1–25 min)</p>
                    </div>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{yellowLateCount + orangeLateCount}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                      <span className="text-yellow-700 font-semibold">{yellowLateCount} Yellow (&le;15m)</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-orange-700 font-semibold">{orangeLateCount} Orange (&gt;15m)</span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                </div>

                {/* Critical Delays (Red > 25 min) */}
                <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-2xs flex items-center justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-rose-50 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                      </span>
                      <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Critical Delay (&gt;25m)</p>
                    </div>
                    <p className="text-2xl font-black text-rose-700 mt-1">{redLateCount}</p>
                    <span className="text-[11px] text-rose-600 font-semibold mt-0.5 inline-block">Action Required (Full Red)</span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                    <AlertOctagon className="w-5 h-5 text-rose-600" />
                  </div>
                </div>
              </div>

              {/* Late Threshold Legend Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#172B4D]" />
                  <span>Principal Punctuality Thresholds:</span>
                </span>
                <div className="flex items-center gap-3 flex-wrap font-medium">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>&le; 0 min: <strong>On Time (Green)</strong></span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-100 text-yellow-900 border border-yellow-300">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    <span>1–15 min: <strong>Yellow (Minor Delay)</strong></span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-100 text-orange-900 border border-orange-300">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    <span>16–25 min: <strong>Orange (Late Notice)</strong></span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-100 text-red-900 border border-red-300">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    <span>&gt; 25 min: <strong>Full Red (Critical Warning)</strong></span>
                  </span>
                </div>
              </div>

              {/* Filtering Controls: Class, Section, Punctuality, Teacher, Search */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-4 sm:p-5">
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-[#172B4D]" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Supervision Filters</span>
                    </div>

                    {/* Status Pill Filters */}
                    <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                      <button
                        onClick={() => setClassSessionsStatusFilter('All')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          classSessionsStatusFilter === 'All'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All ({totalSessions})
                      </button>
                      <button
                        onClick={() => setClassSessionsStatusFilter('active')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          classSessionsStatusFilter === 'active'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-emerald-700 hover:text-emerald-900'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        Active Now ({activeSessionsCount})
                      </button>
                      <button
                        onClick={() => setClassSessionsStatusFilter('completed')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          classSessionsStatusFilter === 'completed'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Concluded
                      </button>
                    </div>
                  </div>

                  {/* Dropdowns Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {/* Class / Standard Dropdown */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Class / Standard
                      </label>
                      <select
                        value={classSessionsStandardFilter}
                        onChange={(e) => setClassSessionsStandardFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none cursor-pointer"
                      >
                        <option value="All">All Classes (Standards)</option>
                        {standardOptions.map(std => (
                          <option key={std} value={std}>Class {std}</option>
                        ))}
                      </select>
                    </div>

                    {/* Section Dropdown */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Section
                      </label>
                      <select
                        value={classSessionsSectionFilter}
                        onChange={(e) => setClassSessionsSectionFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none cursor-pointer"
                      >
                        <option value="All">All Sections</option>
                        {sectionOptions.map(sec => (
                          <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Punctuality Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Punctuality Status
                      </label>
                      <select
                        value={classSessionsPunctualityFilter}
                        onChange={(e) => setClassSessionsPunctualityFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none cursor-pointer"
                      >
                        <option value="All">All Check-In Statuses</option>
                        <option value="on-time">🟢 On-Time Only</option>
                        <option value="any-late">⚠️ All Late Teachers (&gt;0 min)</option>
                        <option value="yellow">🟡 Yellow: Late (1–15 min)</option>
                        <option value="orange">🟠 Orange: Delayed (16–25 min)</option>
                        <option value="red">🔴 Full Red: Critical (&gt;25 min)</option>
                      </select>
                    </div>

                    {/* Teacher Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Teacher / Faculty
                      </label>
                      <select
                        value={classSessionsTeacherFilter}
                        onChange={(e) => setClassSessionsTeacherFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none cursor-pointer"
                      >
                        <option value="All">All Faculty Members</option>
                        {teacherOptions.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Search Input */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Search Keyword
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search teacher, room..."
                          value={classSessionsSearch}
                          onChange={(e) => setClassSessionsSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none text-slate-800 transition-all"
                        />
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {(classSessionsSearch || classSessionsStandardFilter !== 'All' || classSessionsSectionFilter !== 'All' || classSessionsPunctualityFilter !== 'All' || classSessionsTeacherFilter !== 'All' || classSessionsStatusFilter !== 'All') && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-500">
                        Showing <strong>{filteredSessions.length}</strong> of <strong>{totalSessions}</strong> sessions matching filters.
                      </span>
                      <button
                        onClick={() => {
                          setClassSessionsSearch('');
                          setClassSessionsStandardFilter('All');
                          setClassSessionsSectionFilter('All');
                          setClassSessionsPunctualityFilter('All');
                          setClassSessionsTeacherFilter('All');
                          setClassSessionsStatusFilter('All');
                        }}
                        className="px-3 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sessions Table Container */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden">
                {loadingClassSessions ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Spinner size="lg" />
                    <p className="text-xs text-slate-500 font-medium">Fetching real-time class sessions...</p>
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <History className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">No class sessions match filters</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                      No records found for the selected Class, Section, or Punctuality status. Try adjusting your filters.
                    </p>
                    <button
                      onClick={() => {
                        setClassSessionsStandardFilter('All');
                        setClassSessionsSectionFilter('All');
                        setClassSessionsPunctualityFilter('All');
                        setClassSessionsSearch('');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Reset Filters</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50/90">
                        <tr className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="px-5 py-3.5 text-left">Date</th>
                          <th className="px-5 py-3.5 text-left">Teacher / Faculty</th>
                          <th className="px-5 py-3.5 text-left">Class & Section</th>
                          <th className="px-5 py-3.5 text-left">Subject</th>
                          <th className="px-4 py-3.5 text-center">Period & Scheduled</th>
                          <th className="px-5 py-3.5 text-left">Check-In Time</th>
                          <th className="px-5 py-3.5 text-center">Punctuality / Delay</th>
                          <th className="px-5 py-3.5 text-left">Check-Out Time</th>
                          <th className="px-5 py-3.5 text-center">Status</th>
                          <th className="px-5 py-3.5 text-right">Principal Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredSessions.map((session, sIdx) => {
                          const teacherName = session.teacher?.name || session.teacherName || (typeof session.teacher === 'string' ? session.teacher : 'Faculty Member');
                          const teacherEmpId = session.teacher?.employeeId || session.employeeId || 'EMP001';
                          const classStd = session.standard || session.class?.standard || '10th';
                          const classSec = session.section || session.class?.section || 'A';
                          const classBoard = session.class?.board || 'CBSE';
                          const roomNum = session.class?.roomNumber || session.roomNumber || 'Room 101';
                          const subjectName = session.subject?.name || session.subjectName || (typeof session.subject === 'string' ? session.subject : 'General');
                          const isLiveActive = session.status === 'active' || session.status === 'in-progress';
                          const periodNum = session.period || (sIdx % 6) + 1;
                          const scheduledTime = session.scheduledStartTime || '09:00 AM';
                          const loginTimeStr = formatSessionTime(session.loginTime || session.startTime);
                          const logoutTimeStr = isLiveActive ? '—' : formatSessionTime(session.logoutTime || session.endTime);
                          const sessionDateStr = formatSessionDate(session);

                          const lateMins = Number(session.lateMinutes) || 0;
                          const severity = session.lateSeverity || (lateMins > 25 ? 'red' : lateMins > 15 ? 'orange' : lateMins > 0 ? 'yellow' : 'on-time');

                          // Row style based on severity
                          let rowBgClass = 'hover:bg-slate-50/80 transition-colors';
                          if (severity === 'red') {
                            rowBgClass = 'bg-red-50/70 hover:bg-red-100/60 border-l-4 border-l-red-600 transition-colors';
                          } else if (severity === 'orange') {
                            rowBgClass = 'bg-orange-50/50 hover:bg-orange-100/50 border-l-4 border-l-orange-500 transition-colors';
                          } else if (severity === 'yellow') {
                            rowBgClass = 'bg-amber-50/40 hover:bg-amber-100/40 border-l-4 border-l-amber-400 transition-colors';
                          }

                          return (
                            <tr key={session.id || session._id || sIdx} className={rowBgClass}>
                              {/* Date */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="font-mono font-semibold text-slate-700">{sessionDateStr}</span>
                                </div>
                              </td>

                              {/* Teacher */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                                    severity === 'red'
                                      ? 'bg-red-600 text-white'
                                      : severity === 'orange'
                                      ? 'bg-orange-500 text-white'
                                      : severity === 'yellow'
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-gradient-to-br from-[#172B4D] to-[#1D4ED8] text-white'
                                  }`}>
                                    {teacherName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-900 block leading-tight">{teacherName}</span>
                                    <span className="text-[10px] font-mono text-slate-400 tracking-wide">{teacherEmpId}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Class & Section */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 text-xs">Class {classStd}-{classSec}</span>
                                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] text-slate-600 font-semibold border border-slate-200">
                                      {classBoard}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-500 font-medium">{roomNum}</span>
                                </div>
                              </td>

                              {/* Subject */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/70 border border-blue-100 text-[#172B4D] font-semibold">
                                  <BookOpen className="w-3 h-3 text-[#172B4D]" />
                                  <span>{subjectName}</span>
                                </div>
                              </td>

                              {/* Period & Scheduled Time */}
                              <td className="px-4 py-4 whitespace-nowrap text-center">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold text-xs">
                                  P{periodNum}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                                  Sched: {scheduledTime}
                                </span>
                              </td>

                              {/* Check-In Time */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div className={`inline-flex items-center gap-1.5 font-mono font-medium px-2.5 py-1 rounded-md border ${
                                  severity === 'red'
                                    ? 'bg-red-100 text-red-900 border-red-300 font-bold'
                                    : severity === 'orange'
                                    ? 'bg-orange-100 text-orange-900 border-orange-300 font-bold'
                                    : severity === 'yellow'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}>
                                  <LogInIcon className="w-3 h-3" />
                                  <span>{loginTimeStr}</span>
                                </div>
                              </td>

                              {/* Punctuality Status: Green / Yellow / Orange / Red */}
                              <td className="px-5 py-4 whitespace-nowrap text-center">
                                {severity === 'red' ? (
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-red-600 text-white shadow-md animate-pulse border border-red-700">
                                    <AlertOctagon className="w-3.5 h-3.5 text-white shrink-0" />
                                    <span>CRITICAL: +{lateMins}m LATE</span>
                                  </div>
                                ) : severity === 'orange' ? (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300 shadow-2xs">
                                    <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                                    <span>Delayed: +{lateMins}m</span>
                                  </div>
                                ) : severity === 'yellow' ? (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Late: +{lateMins}m</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>On Time</span>
                                  </div>
                                )}
                              </td>

                              {/* Check-Out Time */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                {isLiveActive ? (
                                  <span className="font-mono text-slate-400 italic text-[11px]">In Session...</span>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 font-mono font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                    <LogOutIcon className="w-3 h-3 text-slate-500" />
                                    <span>{logoutTimeStr}</span>
                                  </div>
                                )}
                              </td>

                              {/* Status */}
                              <td className="px-5 py-4 whitespace-nowrap text-center">
                                {isLiveActive ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                    <CheckCircle2 className="w-3 h-3 text-slate-400" />
                                    Concluded
                                  </span>
                                )}
                              </td>

                              {/* Principal Actions: Send Notice or End Class */}
                              <td className="px-5 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {lateMins > 0 && (
                                    session.noticeSent ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                                        <Check className="w-3 h-3 text-purple-600" />
                                        <span>Notice Issued</span>
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleOpenLateNoticeModal(session)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                                          severity === 'red'
                                            ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-300'
                                            : severity === 'orange'
                                            ? 'bg-orange-500 hover:bg-orange-600 text-white ring-1 ring-orange-300'
                                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                                        }`}
                                        title="Issue formal late explanation notice to teacher"
                                      >
                                        <Mail className="w-3 h-3" />
                                        <span>Send Notice</span>
                                      </button>
                                    )
                                  )}

                                  {isLiveActive && (
                                    <button
                                      onClick={() => handleConcludeSession(session.id || session._id)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                                      title="Conclude class and record checkout time"
                                    >
                                      <StopCircle className="w-3 h-3 text-amber-400" />
                                      <span>End Class</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Principal Send Late Explanation Notice Modal */}
              {showLateNoticeModal && selectedLateSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col transform transition-all">
                    {/* Header */}
                    <div className={`px-6 py-4 flex items-center justify-between text-white ${
                      selectedLateSession.lateSeverity === 'red' || (selectedLateSession.lateMinutes || 0) > 25
                        ? 'bg-red-600'
                        : selectedLateSession.lateSeverity === 'orange' || (selectedLateSession.lateMinutes || 0) > 15
                        ? 'bg-orange-600'
                        : 'bg-amber-600'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white leading-tight">
                            Issue Late Check-In Notice to Faculty
                          </h3>
                          <p className="text-white/80 text-[11px]">
                            Request formal explanation for classroom delay
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowLateNoticeModal(false)}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Notice Form */}
                    <form onSubmit={handleSendLateNoticeSubmit} className="p-6 space-y-4">
                      {/* Teacher and Class Summary Card */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Faculty Member</span>
                            <p className="text-sm font-bold text-slate-900">
                              {selectedLateSession.teacher?.name || selectedLateSession.teacherName || selectedLateSession.teacher}
                              <span className="text-xs text-slate-500 font-normal ml-1.5 font-mono">
                                ({selectedLateSession.teacher?.employeeId || selectedLateSession.employeeId || 'Faculty'})
                              </span>
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Class & Period</span>
                            <p className="text-xs font-bold text-[#172B4D]">
                              Class {selectedLateSession.standard || selectedLateSession.class?.standard}-{selectedLateSession.section || selectedLateSession.class?.section} (P{selectedLateSession.period})
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-500">Scheduled: <strong>{selectedLateSession.scheduledStartTime || '09:00 AM'}</strong></span>
                            <span className="mx-2 text-slate-300">|</span>
                            <span className="text-slate-500">Actual Check-In: <strong className="text-rose-600">{formatSessionTime(selectedLateSession.loginTime || selectedLateSession.startTime)}</strong></span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                            selectedLateSession.lateSeverity === 'red' || (selectedLateSession.lateMinutes || 0) > 25
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : selectedLateSession.lateSeverity === 'orange' || (selectedLateSession.lateMinutes || 0) > 15
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            +{selectedLateSession.lateMinutes} min late
                          </span>
                        </div>
                      </div>

                      {/* Notice Subject Line */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Notice Subject Line
                        </label>
                        <input
                          type="text"
                          value={lateNoticeSubject}
                          onChange={(e) => setLateNoticeSubject(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none"
                        />
                      </div>

                      {/* Notice Message Textarea */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Official Notice Message & Explanation Request
                        </label>
                        <textarea
                          rows={6}
                          value={lateNoticeMessage}
                          onChange={(e) => setLateNoticeMessage(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none leading-relaxed"
                        />
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          This notice will be recorded on the faculty member's portal and school communications ledger.
                        </span>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setShowLateNoticeModal(false)}
                          className="px-4 py-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSendingLateNotice}
                          className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                            selectedLateSession.lateSeverity === 'red' || (selectedLateSession.lateMinutes || 0) > 25
                              ? 'bg-red-600 hover:bg-red-700'
                              : selectedLateSession.lateSeverity === 'orange' || (selectedLateSession.lateMinutes || 0) > 15
                              ? 'bg-orange-600 hover:bg-orange-700'
                              : 'bg-amber-600 hover:bg-amber-700'
                          }`}
                        >
                          {isSendingLateNotice ? (
                            <>
                              <Spinner size="xs" />
                              <span>Issuing Notice...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Send Notice to Teacher</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Log Class Session Modal */}
              {showLogSessionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col transform transition-all">
                    {/* Header */}
                    <div className="bg-[#29456D] px-6 py-4 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                          <History className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white leading-tight">Start Class Session Check-In</h3>
                          <p className="text-blue-100 text-[11px]">Log a live class session for faculty</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowLogSessionModal(false)}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Form Body */}
                    <form onSubmit={handleStartNewSession} className="p-6 space-y-4">
                      {/* Teacher Selection */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Teacher / Faculty Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={logSessionForm.teacher}
                            onChange={(e) => setLogSessionForm({ ...logSessionForm, teacher: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none cursor-pointer"
                          >
                            <option value="">Select Faculty...</option>
                            {(employees || []).map(emp => (
                              <option key={emp.employee_id || emp.id || emp.name} value={emp.name}>
                                {emp.name} ({emp.employee_id || 'Faculty'})
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          placeholder="Or type custom teacher name..."
                          value={logSessionForm.teacher}
                          onChange={(e) => setLogSessionForm({ ...logSessionForm, teacher: e.target.value })}
                          className="mt-1.5 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 outline-none"
                        />
                      </div>

                      {/* Class Selection */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Standard / Grade <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={logSessionForm.standard}
                            onChange={(e) => setLogSessionForm({ ...logSessionForm, standard: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none cursor-pointer"
                          >
                            {Array.from(new Set(['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', ...(classes || []).map(c => c.standard)])).map(std => (
                              <option key={std} value={std}>{std}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Section <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={logSessionForm.section}
                            onChange={(e) => setLogSessionForm({ ...logSessionForm, section: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none cursor-pointer"
                          >
                            {['A', 'B', 'C', 'D'].map(sec => (
                              <option key={sec} value={sec}>Section {sec}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Subject Selection */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Subject <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={logSessionForm.subject}
                          onChange={(e) => setLogSessionForm({ ...logSessionForm, subject: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none cursor-pointer"
                        >
                          <option value="">Select Subject...</option>
                          {(subjects || []).map(sub => (
                            <option key={sub.id || sub._id || sub.name} value={sub.name}>
                              {sub.name} {sub.code ? `(${sub.code})` : ''}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Or type custom subject name..."
                          value={logSessionForm.subject}
                          onChange={(e) => setLogSessionForm({ ...logSessionForm, subject: e.target.value })}
                          className="mt-1.5 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 outline-none"
                        />
                      </div>

                      {/* Period Selection */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Period
                        </label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {[1, 2, 3, 4, 5, 6].map(pNum => (
                            <button
                              type="button"
                              key={pNum}
                              onClick={() => setLogSessionForm({ ...logSessionForm, period: pNum })}
                              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                Number(logSessionForm.period) === pNum
                                  ? 'bg-[#29456D] text-white border-[#29456D] shadow-xs'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              P{pNum}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setShowLogSessionModal(false)}
                          className="px-4 py-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isLoggingSession}
                          className="px-5 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isLoggingSession ? (
                            <>
                              <Spinner size="xs" />
                              <span>Starting...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Start Class Session</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {(activeTab === 'recordings' || activeTab === 'feedbacks' || activeTab === 'feedback') && (() => {
          // Calculations and filtering for evaluations
          let list = [...adminFeedback];
          if (feedbackSearch.trim()) {
            const q = feedbackSearch.toLowerCase().trim();
            list = list.filter(f =>
              (f.teacherName || '').toLowerCase().includes(q) ||
              (f.studentName || '').toLowerCase().includes(q) ||
              (f.parentName || '').toLowerCase().includes(q) ||
              (f.subject || '').toLowerCase().includes(q) ||
              (f.feedback || f.suggestion || '').toLowerCase().includes(q) ||
              (f.class || '').toLowerCase().includes(q)
            );
          }
          if (feedbackRatingFilter !== 'All') {
            const rNum = parseInt(feedbackRatingFilter, 10);
            list = list.filter(f => Math.round(Number(f.rating)) === rNum);
          }
          if (feedbackTypeFilter !== 'All') {
            list = list.filter(f => (f.evaluatorType || '').toLowerCase() === feedbackTypeFilter.toLowerCase());
          }
          if (feedbackTeacherFilter !== 'All') {
            list = list.filter(f => (f.teacherName || '').toLowerCase() === feedbackTeacherFilter.toLowerCase());
          }
          if (feedbackClassFilter !== 'All') {
            list = list.filter(f => (f.class || '').toLowerCase().includes(feedbackClassFilter.toLowerCase()) || (f.standard || '').toLowerCase() === feedbackClassFilter.toLowerCase());
          }

          if (feedbackSortBy === 'highest') {
            list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
          } else if (feedbackSortBy === 'lowest') {
            list.sort((a, b) => (Number(a.rating) || 0) - (Number(b.rating) || 0));
          } else {
            list.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
          }

          const rawList = adminFeedback;
          const total = rawList.length;
          const sum = rawList.reduce((a, b) => a + (Number(b.rating) || 5), 0);
          const avg = total > 0 ? parseFloat((sum / total).toFixed(1)) : 5.0;
          const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          let sCount = 0, pCount = 0, sSum = 0, pSum = 0, pos = 0;
          rawList.forEach(f => {
            const r = Math.max(1, Math.min(5, Math.round(Number(f.rating) || 5)));
            counts[r] = (counts[r] || 0) + 1;
            if (f.rating >= 4) pos++;
            if ((f.evaluatorType || '').toLowerCase() === 'parent') {
              pCount++; pSum += (Number(f.rating) || 5);
            } else {
              sCount++; sSum += (Number(f.rating) || 5);
            }
          });

          const stats = {
            averageRating: feedbackSummary?.averageRating || avg,
            totalReviews: feedbackSummary?.totalReviews || total,
            starCounts: feedbackSummary?.starCounts || counts,
            starPercentages: feedbackSummary?.starPercentages || {
              5: total > 0 ? Math.round((counts[5] / total) * 100) : 0,
              4: total > 0 ? Math.round((counts[4] / total) * 100) : 0,
              3: total > 0 ? Math.round((counts[3] / total) * 100) : 0,
              2: total > 0 ? Math.round((counts[2] / total) * 100) : 0,
              1: total > 0 ? Math.round((counts[1] / total) * 100) : 0,
            },
            studentReviewsCount: feedbackSummary?.studentReviewsCount || sCount,
            parentReviewsCount: feedbackSummary?.parentReviewsCount || pCount,
            avgStudentRating: feedbackSummary?.avgStudentRating || (sCount > 0 ? parseFloat((sSum / sCount).toFixed(1)) : 5.0),
            avgParentRating: feedbackSummary?.avgParentRating || (pCount > 0 ? parseFloat((pSum / pCount).toFixed(1)) : 5.0),
            positivePercentage: feedbackSummary?.positivePercentage || (total > 0 ? Math.round((pos / total) * 100) : 100)
          };

          return (
            <div className="space-y-6 mb-8 text-slate-900 animate-fadeIn">
              {/* ════════ HEADER BAR ════════ */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#29456D]/10 border border-[#29456D]/20 flex items-center justify-center text-[#172B4D] shrink-0 shadow-2xs">
                    <MessageSquare className="w-6 h-6 text-[#172B4D]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Student & Parent Evaluations
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        {stats.averageRating} / 5.0 Rating
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#172B4D] border border-blue-200">
                        {stats.totalReviews} Total Verified Reviews
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1">
                      Real-time academic performance reviews, classroom feedback, and faculty star ratings submitted by students and guardians.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenAddFeedbackModal}
                    className="px-4 py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Submit Evaluation</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchAdminFeedbackList(feedbackSearch)}
                    disabled={loadingAdminFeedback}
                    className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                    title="Refresh evaluations"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingAdminFeedback ? 'animate-spin text-[#172B4D]' : ''}`} />
                  </button>
                </div>
              </div>

              {/* ════════ EXECUTIVE KPI ANALYTICS GRID ════════ */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* HERO CARD 1: Overall Star Rating & Breakdown */}
                <div className="bg-gradient-to-br from-white to-amber-50/30 rounded-2xl p-6 border border-amber-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Overall Rating
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {stats.positivePercentage}% Positive
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                        {stats.averageRating}
                      </span>
                      <span className="text-sm font-bold text-slate-400">/ 5.0</span>
                    </div>

                    <div className="flex items-center gap-1 mb-4 text-amber-400">
                      {[1, 2, 3, 4, 5].map((starNum) => {
                        const filled = starNum <= Math.round(stats.averageRating);
                        return (
                          <Star
                            key={starNum}
                            className={`w-5 h-5 ${filled ? 'fill-amber-400 text-amber-400 drop-shadow-xs' : 'text-slate-200 fill-slate-100'}`}
                          />
                        );
                      })}
                      <span className="text-xs font-bold text-slate-500 ml-1.5 font-mono">
                        ({stats.totalReviews} reviews)
                      </span>
                    </div>
                  </div>

                  {/* 5-Star Distribution Bars */}
                  <div className="space-y-1.5 pt-3 border-t border-amber-100">
                    {[5, 4, 3, 2, 1].map((s) => {
                      const count = stats.starCounts[s] || 0;
                      const pct = stats.starPercentages[s] || 0;
                      const isFilterActive = feedbackRatingFilter === String(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFeedbackRatingFilter(isFilterActive ? 'All' : String(s))}
                          className={`w-full flex items-center gap-2 text-[11px] group transition-all text-left py-0.5 px-1 rounded-md ${
                            isFilterActive ? 'bg-amber-100/70 font-bold' : 'hover:bg-amber-50/50'
                          }`}
                        >
                          <span className="w-6 font-bold text-slate-700 flex items-center gap-0.5">
                            {s} <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 inline" />
                          </span>
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-9 text-right text-[10px] text-slate-500 font-mono">
                            {pct}% ({count})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* HERO CARD 2: Total Reviews Volume */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Total Evaluations
                      </span>
                      <span className="p-2 rounded-xl bg-blue-50 text-[#172B4D]">
                        <MessageSquare className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-2">
                      {stats.totalReviews}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Verified feedback collected from students and parents.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-blue-600" /> {stats.studentReviewsCount} Students
                    </span>
                    <span className="font-bold text-slate-600 flex items-center gap-1.5">
                      <UsersRound className="w-4 h-4 text-emerald-600" /> {stats.parentReviewsCount} Parents
                    </span>
                  </div>
                </div>

                {/* HERO CARD 3: Student Satisfaction */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                        <GraduationCap className="w-4 h-4 text-blue-600" /> Student Index
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                        {stats.studentReviewsCount} Enrolled
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl sm:text-5xl font-black text-blue-900 tracking-tight">
                        {stats.avgStudentRating}
                      </span>
                      <span className="text-sm font-bold text-slate-400">/ 5.0</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Average rating given by students for conceptual clarity and doubt solving.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <Star
                        key={num}
                        className={`w-4 h-4 ${num <= Math.round(stats.avgStudentRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'}`}
                      />
                    ))}
                    <span className="text-[11px] font-bold text-blue-700 ml-auto">
                      High Satisfaction
                    </span>
                  </div>
                </div>

                {/* HERO CARD 4: Parent & Guardian Index */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                        <UsersRound className="w-4 h-4 text-emerald-600" /> Parent Index
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {stats.parentReviewsCount} Guardians
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl sm:text-5xl font-black text-emerald-900 tracking-tight">
                        {stats.avgParentRating}
                      </span>
                      <span className="text-sm font-bold text-slate-400">/ 5.0</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Average rating by parents regarding academic progress and mentor support.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <Star
                        key={num}
                        className={`w-4 h-4 ${num <= Math.round(stats.avgParentRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'}`}
                      />
                    ))}
                    <span className="text-[11px] font-bold text-emerald-700 ml-auto">
                      Strong Approval
                    </span>
                  </div>
                </div>
              </div>

              {/* ════════ MULTI-FACETED FILTER & CONTROL TOOLBAR ════════ */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Evaluator Type Segment Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                      type="button"
                      onClick={() => setFeedbackTypeFilter('All')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        feedbackTypeFilter === 'All'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({stats.totalReviews})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackTypeFilter('Student')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        feedbackTypeFilter === 'Student'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      Students ({stats.studentReviewsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackTypeFilter('Parent')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        feedbackTypeFilter === 'Parent'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <UsersRound className="w-3.5 h-3.5" />
                      Parents ({stats.parentReviewsCount})
                    </button>
                  </div>

                  {/* Search and View Mode */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student, teacher, subject..."
                        value={feedbackSearch}
                        onChange={(e) => setFeedbackSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none text-slate-900 placeholder-slate-400 transition-all"
                      />
                      {feedbackSearch && (
                        <button
                          type="button"
                          onClick={() => setFeedbackSearch('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setFeedbackViewMode('card')}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          feedbackViewMode === 'card'
                            ? 'bg-white text-[#172B4D] shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="Card Grid View"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedbackViewMode('table')}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          feedbackViewMode === 'table'
                            ? 'bg-white text-[#172B4D] shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="Detailed Table View"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-Filters Row: Rating Pills, Faculty Filter, Class Filter, Sort */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Star Rating Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Stars:
                    </span>
                    {['All', '5', '4', '3', '2', '1'].map((r) => {
                      const isActive = feedbackRatingFilter === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFeedbackRatingFilter(r)}
                          className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-amber-400 text-slate-900 border-amber-500 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {r === 'All' ? 'All Ratings' : `${r} ★`}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Faculty Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-400">Teacher:</span>
                      <select
                        value={feedbackTeacherFilter}
                        onChange={(e) => setFeedbackTeacherFilter(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-[#29456D] cursor-pointer"
                      >
                        <option value="All">All Faculty</option>
                        {teachersList.map((t) => (
                          <option key={t._id || t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Class Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-400">Class:</span>
                      <select
                        value={feedbackClassFilter}
                        onChange={(e) => setFeedbackClassFilter(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-[#29456D] cursor-pointer"
                      >
                        <option value="All">All Classes</option>
                        {classesList.map((c) => (
                          <option key={c._id || c.id} value={`${c.standard}-${c.section}`}>
                            {c.standard}-{c.section}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-400">Sort:</span>
                      <select
                        value={feedbackSortBy}
                        onChange={(e) => setFeedbackSortBy(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-[#29456D] cursor-pointer"
                      >
                        <option value="newest">Newest First</option>
                        <option value="highest">Highest Rating (5★)</option>
                        <option value="lowest">Lowest Rating (1★)</option>
                      </select>
                    </div>

                    {/* Reset Filters */}
                    {(feedbackSearch || feedbackRatingFilter !== 'All' || feedbackTypeFilter !== 'All' || feedbackTeacherFilter !== 'All' || feedbackClassFilter !== 'All') && (
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackSearch('');
                          setFeedbackRatingFilter('All');
                          setFeedbackTypeFilter('All');
                          setFeedbackTeacherFilter('All');
                          setFeedbackClassFilter('All');
                        }}
                        className="text-[11px] font-bold text-[#172B4D] hover:underline cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ════════ EVALUATIONS RESULTS FEED ════════ */}
              {loadingAdminFeedback ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                  <Spinner size="lg" className="mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-400">Loading student and parent reviews...</p>
                </div>
              ) : list.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-extrabold text-slate-700">No Evaluations Found</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    No student or parent evaluations match the currently applied search and filters.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFeedbackSearch('');
                        setFeedbackRatingFilter('All');
                        setFeedbackTypeFilter('All');
                        setFeedbackTeacherFilter('All');
                        setFeedbackClassFilter('All');
                      }}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Clear All Filters
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddFeedbackModal}
                      className="px-3.5 py-1.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                    >
                      + Submit Evaluation
                    </button>
                  </div>
                </div>
              ) : feedbackViewMode === 'card' ? (
                /* ─── CARD VIEW ─── */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {list.map((f) => {
                    const isParent = (f.evaluatorType || '').toLowerCase() === 'parent';
                    const displayName = isParent ? f.parentName : f.studentName;
                    const initials = (displayName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                    return (
                      <div
                        key={f._id || f.id}
                        className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                      >
                        <div>
                          {/* Top Row: Reviewer avatar, name, badges */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                                isParent ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-[#172B4D]'
                              }`}>
                                {initials}
                              </div>
                              <div>
                                <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                                  {displayName}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-medium">
                                  <span className={`px-2 py-0.2 rounded-md font-bold uppercase ${
                                    isParent ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-[#172B4D] border border-blue-200'
                                  }`}>
                                    {isParent ? 'Parent / Guardian' : 'Enrolled Student'}
                                  </span>
                                  {f.rollNumber && <span className="font-mono text-slate-400">#{f.rollNumber}</span>}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteFeedback(f._id || f.id)}
                              className="text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100 p-1 cursor-pointer"
                              title="Delete evaluation record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Target Faculty & Subject Banner */}
                          <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 mb-3.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800">👨‍🏫 {f.teacherName}</span>
                              <span className="text-[10px] font-semibold text-slate-400">• {f.subject}</span>
                            </div>
                            <span className="text-[10px] font-bold text-[#172B4D] bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                              {f.class}
                            </span>
                          </div>

                          {/* Stars & Sentiment */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1 text-amber-400">
                              {[1, 2, 3, 4, 5].map((starNum) => (
                                <Star
                                  key={starNum}
                                  className={`w-4 h-4 ${starNum <= f.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'}`}
                                />
                              ))}
                              <span className="text-xs font-black text-slate-800 ml-1.5">
                                {f.rating}.0
                              </span>
                            </div>

                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                              f.rating >= 4 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              f.rating === 3 ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {f.sentiment || (f.rating >= 4 ? 'Positive' : 'Review')}
                            </span>
                          </div>

                          {/* Feedback Comment Text */}
                          <div className="relative pl-3 text-xs text-slate-700 italic border-l-2 border-slate-300 py-0.5 mb-4">
                            "{f.feedback || f.suggestion || f.comment || 'No comments provided.'}"
                          </div>
                        </div>

                        {/* Card Footer Timestamp */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-mono">
                            {f.date ? new Date(f.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Verified Date'}
                          </span>
                          <span className="text-emerald-700 font-bold flex items-center gap-1 text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> Verified Entry
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ─── DETAILED TABLE VIEW ─── */
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Evaluator</th>
                          <th className="px-4 py-3 text-left">Type</th>
                          <th className="px-4 py-3 text-left">Class</th>
                          <th className="px-4 py-3 text-left">Teacher</th>
                          <th className="px-4 py-3 text-left">Subject</th>
                          <th className="px-4 py-3 text-center">Stars</th>
                          <th className="px-4 py-3 text-left">Comments & Suggestions</th>
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {list.map((f) => {
                          const isParent = (f.evaluatorType || '').toLowerCase() === 'parent';
                          const displayName = isParent ? f.parentName : f.studentName;

                          return (
                            <tr key={f._id || f.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                                {f.date ? new Date(f.date).toLocaleDateString('en-IN') : '—'}
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-900">
                                <div>{displayName}</div>
                                {f.rollNumber && <div className="text-[10px] text-slate-400 font-mono">#{f.rollNumber}</div>}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                                  isParent ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                                }`}>
                                  {isParent ? 'Parent' : 'Student'}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">
                                {f.class}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                                {f.teacherName}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {f.subject}
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <div className="inline-flex items-center gap-1 text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  <span>{f.rating}</span>
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-700 italic max-w-xs truncate" title={f.feedback || f.suggestion}>
                                "{f.feedback || f.suggestion || '—'}"
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFeedback(f._id || f.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                                  title="Delete evaluation"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ════════ SUBMIT EVALUATION MODAL ════════ */}
              {showAddFeedbackModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                  <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scaleUp">
                    {/* Modal Header */}
                    <div className="bg-gradient-to-r from-[#172B4D] to-[#1D4ED8] p-6 text-white flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                          <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black tracking-tight">Submit New Evaluation</h3>
                          <p className="text-blue-100 text-xs">Record verified rating & review for faculty</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddFeedbackModal(false)}
                        className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <XIcon className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Modal Form */}
                    <form onSubmit={handleSubmitEvaluationModal} className="p-6 space-y-4 text-xs font-semibold">
                      {/* Evaluator Type Selection */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5 uppercase text-[11px] tracking-wider">Evaluator Role</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setAddFeedbackForm(prev => ({ ...prev, evaluatorType: 'Student' }))}
                            className={`py-2 px-3 rounded-xl border font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                              addFeedbackForm.evaluatorType === 'Student'
                                ? 'bg-blue-50 border-[#29456D] text-[#172B4D] ring-2 ring-[#1E3A8A]/20'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                            }`}
                          >
                            <GraduationCap className="w-4 h-4" /> Student
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddFeedbackForm(prev => ({ ...prev, evaluatorType: 'Parent' }))}
                            className={`py-2 px-3 rounded-xl border font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                              addFeedbackForm.evaluatorType === 'Parent'
                                ? 'bg-emerald-50 border-emerald-600 text-emerald-800 ring-2 ring-emerald-600/20'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                            }`}
                          >
                            <UsersRound className="w-4 h-4" /> Parent / Guardian
                          </button>
                        </div>
                      </div>

                      {/* Evaluator Name & Roll / Ward */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">
                            {addFeedbackForm.evaluatorType === 'Parent' ? 'Parent / Guardian Name *' : 'Student Name *'}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={addFeedbackForm.evaluatorType === 'Parent' ? 'e.g. Mr. & Mrs. Sharma' : 'e.g. Rahul Sharma'}
                            value={addFeedbackForm.evaluatorType === 'Parent' ? addFeedbackForm.parentName : addFeedbackForm.studentName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAddFeedbackForm(prev => addFeedbackForm.evaluatorType === 'Parent' ? { ...prev, parentName: val } : { ...prev, studentName: val });
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#29456D] text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">
                            {addFeedbackForm.evaluatorType === 'Parent' ? 'Student Ward Name' : 'Roll Number'}
                          </label>
                          <input
                            type="text"
                            placeholder={addFeedbackForm.evaluatorType === 'Parent' ? 'e.g. Rahul' : 'e.g. 10A-05'}
                            value={addFeedbackForm.evaluatorType === 'Parent' ? addFeedbackForm.studentName : addFeedbackForm.rollNumber}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAddFeedbackForm(prev => addFeedbackForm.evaluatorType === 'Parent' ? { ...prev, studentName: val } : { ...prev, rollNumber: val });
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#29456D] text-slate-900"
                          />
                        </div>
                      </div>

                      {/* Target Teacher & Subject */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Target Teacher *</label>
                          <select
                            value={addFeedbackForm.teacherName}
                            onChange={(e) => {
                              const selectedT = e.target.value;
                              const matchMapping = allMappings.find(m => m.teacherName === selectedT);
                              setAddFeedbackForm(prev => ({
                                ...prev,
                                teacherName: selectedT,
                                subject: matchMapping?.subject || prev.subject
                              }));
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#29456D] text-slate-900 cursor-pointer"
                          >
                            {teachersList.map((t) => (
                              <option key={t._id || t.id} value={t.name}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Subject</label>
                          <input
                            type="text"
                            placeholder="e.g. Mathematics"
                            value={addFeedbackForm.subject}
                            onChange={(e) => setAddFeedbackForm(prev => ({ ...prev, subject: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#29456D] text-slate-900"
                          />
                        </div>
                      </div>

                      {/* Class */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Class Standard</label>
                          <select
                            value={addFeedbackForm.standard}
                            onChange={(e) => setAddFeedbackForm(prev => ({ ...prev, standard: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#29456D] text-slate-900 cursor-pointer"
                          >
                            {Array.from(new Set(classesList.map(c => c.standard))).map((std) => (
                              <option key={std} value={std}>Class {std}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Section</label>
                          <select
                            value={addFeedbackForm.section}
                            onChange={(e) => setAddFeedbackForm(prev => ({ ...prev, section: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#29456D] text-slate-900 cursor-pointer"
                          >
                            {['A', 'B', 'C', 'D'].map((sec) => (
                              <option key={sec} value={sec}>Section {sec}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Interactive Star Rating Selector */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5 uppercase text-[11px] tracking-wider">Star Rating (1 to 5 Stars)</label>
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setAddFeedbackForm(prev => ({ ...prev, rating: star }))}
                                className="p-1 hover:scale-125 transition-transform cursor-pointer text-amber-400"
                              >
                                <Star
                                  className={`w-6 h-6 ${star <= addFeedbackForm.rating ? 'fill-amber-400 text-amber-400 drop-shadow-xs' : 'text-slate-300 fill-slate-100'}`}
                                />
                              </button>
                            ))}
                          </div>
                          <span className="ml-3 text-xs font-black text-slate-800 bg-white border border-slate-200 px-3 py-1 rounded-lg">
                            {addFeedbackForm.rating === 5 ? '5 ★ — Outstanding' :
                             addFeedbackForm.rating === 4 ? '4 ★ — Very Good' :
                             addFeedbackForm.rating === 3 ? '3 ★ — Good / Average' :
                             addFeedbackForm.rating === 2 ? '2 ★ — Needs Improvement' :
                             '1 ★ — Unsatisfactory'}
                          </span>
                        </div>
                      </div>

                      {/* Detailed Feedback Text */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Review & Comments *</label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Write constructive evaluation notes, pedagogy feedback, or practical suggestions..."
                          value={addFeedbackForm.feedback}
                          onChange={(e) => setAddFeedbackForm(prev => ({ ...prev, feedback: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#29456D] text-slate-900 text-xs"
                        />
                      </div>

                      {/* Modal Footer Buttons */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setShowAddFeedbackModal(false)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingFeedback}
                          className="px-5 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2"
                        >
                          {isSubmittingFeedback ? <Spinner size="sm" /> : <SaveIcon className="w-4 h-4" />}
                          <span>Save Evaluation</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'employees' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden mb-8 text-slate-900 transition-all">
            {/* Header */}
            <div className="bg-white px-6 sm:px-8 py-5 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#172B4D] shrink-0">
                  <UsersRound className="w-5 h-5 text-[#172B4D]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Employee & Faculty Directory
                  </h2>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-normal">
                    Manage staff profiles, access credentials, authentication exemptions, and institutional role assignments.
                  </p>
                </div>
              </div>
              <button
                onClick={handleAddClick}
                className="px-4 py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Search Bar & Auto-save Note */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                  <input
                    type="text"
                    placeholder="Search employees by name, ID, or email..."
                    value={empSearch}
                    onChange={e => setEmpSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 font-medium text-xs focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none transition-all shadow-2xs"
                  />
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                </div>
                
                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
                  Auto-saves changes live
                </span>
              </div>

              {empLoading ? (
                <div className="text-center py-16"><Spinner size="lg" /></div>
              ) : (
                <div>
                  {/* Desktop View Table */}
                  <div className="overflow-x-auto hidden lg:block rounded-xl border border-slate-200 shadow-2xs">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
                          <th className="px-5 py-3.5 text-left">Employee / Faculty</th>
                          <th className="px-5 py-3.5 text-left">ID</th>
                          <th className="px-5 py-3.5 text-center">Skip Face</th>
                          <th className="px-5 py-3.5 text-center">Skip Location</th>
                          <th className="px-5 py-3.5 text-center">Direct Login</th>
                          <th className="px-5 py-3.5 text-center">Account Status</th>
                          <th className="px-5 py-3.5 text-center">Assigned Role</th>
                          <th className="px-5 py-3.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {(Array.isArray(employees) ? employees : [])
                          .filter(e => 
                            !empSearch || 
                            e.name?.toLowerCase().includes(empSearch.toLowerCase()) || 
                            e.employeeId?.toLowerCase().includes(empSearch.toLowerCase()) || 
                            e.email?.toLowerCase().includes(empSearch.toLowerCase())
                          )
                          .map((emp) => {
                            const realIdx = (Array.isArray(employees) ? employees : []).findIndex(e => e._id === emp._id);

                            return (
                              <tr key={emp._id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                                      {emp.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                                        <span 
                                          onClick={() => handleUserClick(emp._id)}
                                          className="cursor-pointer hover:underline text-slate-900 hover:text-[#172B4D]"
                                        >
                                          {emp.name}
                                        </span> 
                                        {emp.is_super_admin && (
                                          <span className="text-[10px] bg-blue-50 text-[#172B4D] px-2 py-0.5 rounded-md font-semibold border border-blue-200">
                                            Super Admin
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5 font-normal">
                                        <span>{emp.email}</span>
                                        {emp.primary_subject && (
                                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px] border border-slate-200">
                                            {emp.primary_subject}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                
                                <td className="px-5 py-4 font-mono text-xs text-slate-700 font-semibold">
                                  {emp.employeeId || 'N/A'}
                                </td>

                                <td className="px-5 py-4 text-center">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={emp.skip_face} 
                                      onChange={() => handleEmpToggle(realIdx, 'skip_face')} 
                                      className="sr-only peer" 
                                    />
                                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#29456D]"></div>
                                  </label>
                                </td>

                                <td className="px-5 py-4 text-center">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={emp.skip_location} 
                                      onChange={() => handleEmpToggle(realIdx, 'skip_location')} 
                                      className="sr-only peer" 
                                    />
                                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#29456D]"></div>
                                  </label>
                                </td>

                                <td className="px-5 py-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDirectLogin(emp)}
                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#172B4D] font-semibold text-xs rounded-lg transition-colors border border-indigo-200 flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                                    title={`Directly login as ${emp.name}`}
                                  >
                                    <LogInIcon className="w-3.5 h-3.5" />
                                    <span>Login</span>
                                  </button>
                                </td>

                                <td className="px-5 py-4 text-center">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={emp.is_enabled} 
                                      onChange={() => handleEmpToggle(realIdx, 'is_enabled')} 
                                      className="sr-only peer" 
                                    />
                                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                  </label>
                                  <div className={`text-[10px] font-semibold mt-1 uppercase ${emp.is_enabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                                    {emp.is_enabled ? 'Enabled' : 'Disabled'}
                                  </div>
                                </td>

                                <td className="px-5 py-4 text-center">
                                  <select 
                                    value={getMergedRoleOptions(roles, emp.role).find(r => r.code.toLowerCase() === (emp.role || '').toLowerCase())?.code || emp.role} 
                                    onChange={e => handleEmpRole(realIdx, e.target.value)} 
                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium text-xs focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none cursor-pointer"
                                  >
                                    {getMergedRoleOptions(roles, emp.role).map(r => (
                                      <option key={r.code} value={r.code}>{r.name}</option>
                                    ))}
                                  </select>
                                </td>

                                <td className="px-5 py-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleEditClick(emp)}
                                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center cursor-pointer"
                                      title="Edit Profile"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>

                                    <button
                                      onClick={() => handleOpenResetPasswordModal(emp._id, emp.name)}
                                      className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors flex items-center justify-center cursor-pointer"
                                      title="Reset Password"
                                    >
                                      <Key className="w-4 h-4" />
                                    </button>

                                    {!emp.is_super_admin && (
                                      <button
                                        onClick={() => handleDeleteEmployee(emp._id, emp.name)}
                                        className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors flex items-center justify-center cursor-pointer"
                                        title="Delete Employee"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile & Tablet Card Layout */}
                  <div className="lg:hidden flex flex-col gap-4">
                    {(Array.isArray(employees) ? employees : [])
                      .filter(e => 
                        !empSearch || 
                        e.name?.toLowerCase().includes(empSearch.toLowerCase()) || 
                        e.employeeId?.toLowerCase().includes(empSearch.toLowerCase()) || 
                        e.email?.toLowerCase().includes(empSearch.toLowerCase())
                      )
                      .map((emp) => {
                        const realIdx = (Array.isArray(employees) ? employees : []).findIndex(e => e._id === emp._id);
                        return (
                          <div 
                            key={emp._id} 
                            className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col gap-4 transition-all hover:border-stone-200"
                          >
                            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                              <div className="flex items-center gap-3">
                                <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm ${
                                  emp.is_super_admin 
                                    ? 'bg-stone-100 text-[#405189] ring-2 ring-1 ring-[#1E3A8A]' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {emp.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                                    <span 
                                      onClick={() => handleUserClick(emp._id)}
                                      className="cursor-pointer hover:underline text-[#172B4D] hover:text-[#405189] font-bold"
                                    >
                                      {emp.name}
                                    </span>
                                    {emp.is_super_admin && <span className="text-[9px] bg-stone-100 text-[#405189] px-1.5 py-0.5 rounded-full font-bold">Super Admin</span>}
                                  </div>
                                  <div className="text-xs text-gray-500">{emp.email}</div>
                                  <div className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {emp.employeeId || 'N/A'}</div>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="text-gray-500 font-bold">Skip Face</span>
                                <label className="relative inline-flex items-center cursor-pointer mt-1">
                                  <input 
                                    type="checkbox" 
                                    checked={emp.skip_face} 
                                    onChange={() => handleEmpToggle(realIdx, 'skip_face')} 
                                    className="sr-only peer" 
                                  />
                                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                              </div>

                              <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="text-gray-500 font-bold">Skip Location</span>
                                <label className="relative inline-flex items-center cursor-pointer mt-1">
                                  <input 
                                    type="checkbox" 
                                    checked={emp.skip_location} 
                                    onChange={() => handleEmpToggle(realIdx, 'skip_location')} 
                                    className="sr-only peer" 
                                  />
                                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                              </div>

                              <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="text-gray-500 font-bold">Status</span>
                                <div className="flex items-center justify-between mt-1">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={emp.is_enabled} 
                                      onChange={() => handleEmpToggle(realIdx, 'is_enabled')} 
                                      className="sr-only peer" 
                                    />
                                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                                  </label>
                                  <span className={`text-[9px] font-bold ${emp.is_enabled ? 'text-blue-600' : 'text-gray-400'}`}>
                                    {emp.is_enabled ? 'ENABLED' : 'DISABLED'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="text-gray-500 font-bold">Role</span>
                                <select 
                                  value={getMergedRoleOptions(roles, emp.role).find(r => r.code.toLowerCase() === (emp.role || '').toLowerCase())?.code || emp.role} 
                                  onChange={e => handleEmpRole(realIdx, e.target.value)} 
                                  className="w-full mt-0.5 px-2 py-1 bg-white border border-gray-300 rounded-lg text-gray-900 text-[10px] font-semibold focus:ring-1 focus:ring-[#173F35] focus:border-[#173F35] outline-none cursor-pointer"
                                >
                                  {getMergedRoleOptions(roles, emp.role).map(r => (
                                    <option key={r.code} value={r.code}>{r.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="flex items-center justify-center gap-4 border-t border-gray-100 pt-3">
                              <button
                                onClick={() => handleEditClick(emp)}
                                className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white border border-emerald-200 rounded-lg text-xs font-bold transition-all text-center"
                              >
                                Edit Profile
                              </button>
                              <button
                                onClick={() => handleOpenResetPasswordModal(emp._id, emp.name)}
                                className="flex-1 py-2 bg-stone-50 hover:bg-[#29456D] text-[#405189] hover:text-white border border-[#e9ebec] rounded-lg text-xs font-bold transition-all text-center"
                              >
                                Reset Pass
                              </button>
                              {!emp.is_super_admin && (
                                <button
                                  onClick={() => handleDeleteEmployee(emp._id, emp.name)}
                                  className="flex-1 py-2 bg-red-50 hover:bg-red-500 text-red-700 hover:text-white border border-red-200 rounded-lg text-xs font-bold transition-all text-center"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Class Management Tab */}
        {activeTab === 'classes' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden mb-8 text-slate-900 animate-fadeIn">
            {/* Header with Overview Stats */}
            <div className="bg-white px-6 sm:px-8 py-5 border-b border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#172B4D] shrink-0">
                  <School className="w-5 h-5 text-[#172B4D]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Class & Section Management
                  </h2>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-normal">
                    Configure academic standards (Nursery to 12th), map sections, and assign class mentors.
                  </p>
                </div>
              </div>

              {/* Quick Stat Badges & Bulk Upload */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenBulkUploadModal()}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#172B4D] font-bold text-xs rounded-xl border border-blue-200 shadow-2xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#172B4D]" />
                  <span>Bulk Upload Students</span>
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-[#29456D]"></span>
                  <span>Total Classes: <strong className="text-slate-900">{classes.length}</strong></span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Mentors Assigned: <strong className="text-slate-900">{classes.filter(c => c.classTeacher?.name || c.classTeacherName).length}</strong></span>
                </div>
              </div>
            </div>
            
            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Add / Edit Class Form Card */}
              <div className={`p-6 rounded-2xl border transition-all h-fit space-y-5 ${
                editingClass 
                  ? 'bg-amber-50/40 border-amber-200 shadow-sm' 
                  : 'bg-slate-50/70 border-slate-200'
              }`}>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {editingClass ? (
                        <>
                          <Edit3 className="w-4 h-4 text-amber-600" />
                          <span>Edit Class</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 text-[#172B4D]" />
                          <span>Add New Class</span>
                        </>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {editingClass ? `Editing ${editingClass.standard} - ${editingClass.section}` : 'Register a new standard & section'}
                    </p>
                  </div>
                  {editingClass && (
                    <button
                      type="button"
                      onClick={handleCancelEditClass}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveClassSubmit} className="space-y-4">
                  {/* Standard */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Standard *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={classStandard}
                        onChange={(e) => setClassStandard(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none font-medium text-xs cursor-pointer shadow-2xs"
                      >
                        {(settings.standardsList || ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th']).map(std => (
                          <option key={std} value={std}>{std}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          const newStd = window.prompt("Enter new Standard name (e.g. PUC, Degree):");
                          if (newStd && newStd.trim()) {
                            const trimmed = newStd.trim();
                            const currentList = settings.standardsList || ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
                            if (currentList.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
                              toast.error("Standard already exists");
                              return;
                            }
                            const updatedList = [...currentList, trimmed];
                            const newSettings = { ...settings, standardsList: updatedList };
                            setSettings(newSettings);
                            setClassStandard(trimmed);
                            try {
                              const settingsPayload = {
                                schoolName: newSettings.schoolName || 'Qelvora School CRM',
                                board: newSettings.board || 'CBSE',
                                boardsList: newSettings.boardsList || ['CBSE', 'STATE', 'ICSE', 'IGCSE'],
                                standardsList: updatedList
                              };
                              await updateCompanySettings(settingsPayload);
                              toast.success(`Standard "${trimmed}" added and saved!`);
                            } catch (err) {
                              toast.error("Failed to save new standard");
                            }
                          }
                        }}
                        className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer border border-slate-300 shadow-2xs"
                        title="Add Custom Standard"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  {/* Section */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Section *
                    </label>
                    <input
                      type="text"
                      maxLength="3"
                      placeholder="e.g. A"
                      required
                      value={classSection}
                      onChange={(e) => setClassSection(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none font-medium text-xs uppercase shadow-2xs"
                    />
                  </div>

                  {/* Board Affiliation */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Board Affiliation *
                    </label>
                    <select
                      value={classBoard}
                      onChange={(e) => setClassBoard(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none font-medium text-xs cursor-pointer shadow-2xs"
                    >
                      {['CBSE', 'STATE', 'ICSE', 'IGCSE', 'IB'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Class Teacher (Optional) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Class Teacher (Optional)
                    </label>
                    <select
                      value={classTeacherId}
                      onChange={(e) => setClassTeacherId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none font-medium text-xs cursor-pointer shadow-2xs"
                    >
                      <option value="">-- Select Teacher --</option>
                      {(Array.isArray(employees) ? employees : []).filter(emp => !emp.is_super_admin && !['admin', 'parent', 'student'].includes((emp.role || '').toLowerCase())).map(tch => (
                        <option key={tch._id} value={tch._id}>{tch.name} ({tch.employeeId || 'ID: N/A'})</option>
                      ))}
                    </select>
                  </div>

                  {/* Room Number & Class Strength */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Room No.
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Room 101"
                        value={classRoomNumber}
                        onChange={(e) => setClassRoomNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none font-medium text-xs shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Strength
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={classStrength}
                        onChange={(e) => setClassStrength(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none font-medium text-xs shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="pt-2 flex gap-2">
                    {editingClass && (
                      <button
                        type="button"
                        onClick={handleCancelEditClass}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSavingClass}
                      className="flex-1 py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
                    >
                      {isSavingClass ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>{editingClass ? 'Saving Changes...' : 'Creating Class...'}</span>
                        </>
                      ) : (
                        <span>{editingClass ? 'Save Changes' : '+ Create Class'}</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Class List Table & Filter Section */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Registered Classes</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#172B4D] border border-blue-200">
                        {filteredClasses.length}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Academic divisions active for student admissions and scheduling.</p>
                  </div>

                  {/* Board Quick Filters */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['All', 'CBSE', 'STATE', 'ICSE'].map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setClassBoardFilter(b)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          classBoardFilter === b
                            ? 'bg-[#29456D] text-white border-[#29456D]'
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                    placeholder="Search classes by standard, section, teacher, or room..."
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none text-xs font-medium shadow-2xs transition-all"
                  />
                  {classSearch && (
                    <button
                      type="button"
                      onClick={() => setClassSearch('')}
                      className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {classesLoading ? (
                  <div className="text-center py-16 flex flex-col items-center justify-center gap-3">
                    <Spinner size="md" />
                    <span className="text-xs text-slate-500 font-medium">Loading classes from database...</span>
                  </div>
                ) : filteredClasses.length === 0 ? (
                  <div className="text-center py-14 bg-slate-50/80 rounded-2xl border border-dashed border-slate-300 p-6">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
                      <School className="w-5 h-5" />
                    </div>
                    <p className="text-slate-600 font-semibold text-xs">No classes matched your filter.</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">Try adjusting your search query or add a new class using the form.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                          <th className="px-4 py-3.5 text-left">Class Name</th>
                          <th className="px-4 py-3.5 text-left">Board</th>
                          <th className="px-4 py-3.5 text-left">Class Teacher</th>
                          <th className="px-4 py-3.5 text-center">Strength</th>
                          <th className="px-4 py-3.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-xs">
                        {filteredClasses.map((cls) => {
                          const boardName = cls.board || 'CBSE';
                          const isBeingEdited = editingClass && (editingClass.id === cls.id || editingClass._id === cls._id);

                          return (
                            <tr 
                              key={cls._id || cls.id} 
                              className={`transition-colors ${isBeingEdited ? 'bg-amber-50/70' : 'hover:bg-slate-50/80'}`}
                            >
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                  <span>{cls.standard} - {cls.section}</span>
                                  {isBeingEdited && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded">
                                      Editing
                                    </span>
                                  )}
                                </div>
                                {cls.roomNumber && (
                                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                    📍 {cls.roomNumber}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border tracking-wide ${
                                  boardName === 'CBSE' 
                                    ? 'bg-blue-50 text-[#172B4D] border-blue-200' 
                                    : boardName === 'ICSE'
                                      ? 'bg-teal-50 text-teal-800 border-teal-200'
                                      : boardName === 'STATE'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-purple-50 text-purple-800 border-purple-200'
                                }`}>
                                  {boardName}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                {cls.classTeacher?.name || cls.classTeacherName ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-[#172B4D] font-bold text-[10px] flex items-center justify-center shrink-0">
                                      {(cls.classTeacher?.name || cls.classTeacherName).charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-slate-800">
                                      {cls.classTeacher?.name || cls.classTeacherName}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[11px] font-medium">
                                    Not Assigned
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs">
                                  {cls.strength !== undefined ? cls.strength : 35}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Edit Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditClass(cls)}
                                    className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#172B4D] border border-blue-200 transition-colors flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                                    title="Edit Class"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeletingClass(cls);
                                      setIsDeleteClassModalOpen(true);
                                    }}
                                    className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                                    title="Delete Class"
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
                )}
              </div>
            </div>
          </div>
        )}

        {(activeTab === 'students_mgt' || activeTab === 'students') && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden mb-8 text-slate-900 animate-fadeIn">
            <div className="bg-white px-6 sm:px-8 py-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#172B4D] shrink-0">
                  <GraduationCap className="w-5 h-5 text-[#172B4D]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Student & Parent Management
                  </h2>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-normal">Manage student enrollment, parent contacts, categories (General / RTE), and directory.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleOpenBulkUploadModal(filterStd !== 'All' ? filterStd : '', filterSec)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-50 text-[#172B4D] font-bold text-xs sm:text-sm rounded-xl border border-blue-200 shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Upload className="w-4 h-4 text-[#172B4D]" />
                  <span>Bulk Upload Students</span>
                </button>
                <button
                  onClick={handleOpenAddStudentModal}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Student</span>
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Filters Bar & Search Box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Class Standard</label>
                  <select
                    value={filterStd}
                    onChange={(e) => {
                      setFilterStd(e.target.value);
                      setStudentPage(1);
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none text-xs font-medium cursor-pointer shadow-2xs"
                  >
                    {['All', 'Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'].map(std => {
                      const secs = classStandardSectionsMap[std];
                      const secLabel = (std !== 'All' && secs && secs.length > 0) ? ` (Sections: ${secs.join(', ')})` : '';
                      return (
                        <option key={std} value={std}>
                          {std === 'All' ? 'All Classes' : `${std}${secLabel}`}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Section Name</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={filterSec}
                    onChange={(e) => {
                      setFilterSec(e.target.value.toUpperCase());
                      setStudentPage(1);
                    }}
                    placeholder="e.g. A"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none text-xs font-medium uppercase shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Search Student</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setStudentPage(1);
                      }}
                      placeholder="Search by name or admission no..."
                      className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none text-xs font-medium shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Student List Table */}
              {studentsLoading ? (
                <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                  <Spinner size="lg" />
                  <span className="text-xs text-slate-500 font-medium">Fetching students...</span>
                </div>
              ) : studentsList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-slate-200 font-medium text-xs">
                  No students found in class {filterStd} {filterSec ? `- ${filterSec}` : ''}.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                          <th className="px-4 py-3.5 text-center">Photo</th>
                          <th className="px-4 py-3.5 text-left">Admission No</th>
                          <th className="px-4 py-3.5 text-left">Full Name</th>
                          <th className="px-4 py-3.5 text-center">Roll No</th>
                          <th className="px-4 py-3.5 text-center">Gender</th>
                          <th className="px-4 py-3.5 text-left">Parent Name</th>
                          <th className="px-4 py-3.5 text-left">Phone</th>
                          <th className="px-4 py-3.5 text-center">Category</th>
                          <th className="px-4 py-3.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {studentsList.map((stu) => (
                          <tr key={stu._id || stu.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 text-center">
                              {stu.photoUrl ? (
                                <img
                                  src={stu.photoUrl}
                                  alt={stu.name}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-200 mx-auto"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-blue-100 text-[#172B4D] font-bold text-xs flex items-center justify-center border border-blue-200 mx-auto">
                                  {stu.name?.charAt(0)?.toUpperCase() || 'S'}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3.5 font-mono font-bold text-[#172B4D]">
                              {stu.admissionNumber || stu.studentId || '—'}
                            </td>
                            <td className="px-4 py-3.5">
                              <button
                                onClick={() => handleOpenViewStudentModal(stu)}
                                className="font-bold text-slate-900 hover:text-[#172B4D] hover:underline text-left cursor-pointer"
                              >
                                {stu.name}
                              </button>
                              <div className="text-[10px] text-slate-400 font-medium">
                                Class {stu.standard}-{stu.section}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono font-semibold text-slate-700">
                              {stu.rollNumber || '—'}
                            </td>
                            <td className="px-4 py-3.5 text-center font-medium text-slate-600">
                              {stu.gender || 'Male'}
                            </td>
                            <td className="px-4 py-3.5 text-slate-700 font-medium">
                              {stu.parentName || '—'}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-600">
                              {stu.parentPhone || stu.phone || stu.parentContact || '—'}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {stu.rollNumber === '04' || stu.rollNumber === '08' || stu.rollNumber === '12' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  RTE
                                </span>
                              ) : (stu.rollNumber === '01') ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300">
                                  Merit
                                </span>
                              ) : (stu.rollNumber === '02') ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                  Staff Ward
                                </span>
                              ) : (stu.rollNumber === '06') ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300">
                                  Sibling
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-300">
                                  General
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenViewStudentModal(stu)}
                                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center cursor-pointer"
                                  title="View Profile"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditStudentModal(stu)}
                                  className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#172B4D] border border-blue-200 transition-colors flex items-center justify-center cursor-pointer"
                                  title="Edit Student"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenDeleteStudentModal(stu)}
                                  className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors flex items-center justify-center cursor-pointer"
                                  title="Delete Student"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Bar */}
                  {studentTotalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <p className="text-xs text-slate-500 font-medium">
                        Showing page {studentPage} of {studentTotalPages} ({studentTotalCount} total students)
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setStudentPage(prev => Math.max(prev - 1, 1))}
                          disabled={studentPage === 1}
                          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Previous</span>
                        </button>
                        <span className="text-xs font-bold text-slate-700 px-2">{studentPage}</span>
                        <button
                          onClick={() => setStudentPage(prev => Math.min(prev + 1, studentTotalPages))}
                          disabled={studentPage === studentTotalPages}
                          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Next</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subject Management Tab */}
        {activeTab === 'subjects' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden mb-8 text-slate-900">
            {/* Header with Title and Quick Stats */}
            <div className="bg-white px-6 sm:px-8 py-5 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#172B4D] to-blue-700 text-white flex items-center justify-center shadow-xs shrink-0">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Curriculum Subject Catalogue
                  </h2>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-normal">
                    Manage institutional subjects linked to academic classes, syllabi, and weekly academic allocations.
                  </p>
                </div>
              </div>

              {/* Stats Badges */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="px-3.5 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/60 flex items-center gap-2 text-xs">
                  <BookOpen className="w-3.5 h-3.5 text-[#172B4D]" />
                  <span className="text-slate-600 font-medium">Total Subjects:</span>
                  <span className="font-bold text-[#172B4D]">{subjects.length}</span>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-200/60 flex items-center gap-2 text-xs">
                  <School className="w-3.5 h-3.5 text-indigo-700" />
                  <span className="text-slate-600 font-medium">Available Classes:</span>
                  <span className="font-bold text-indigo-700">{classes.length}</span>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Add / Edit Subject Form (4 cols) */}
              <div className="lg:col-span-4 bg-slate-50/70 p-6 rounded-2xl border border-slate-200 h-fit space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {editingSubject ? (
                      <>
                        <Edit3 className="w-4 h-4 text-amber-600" />
                        <span className="text-amber-800">Edit Subject</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-[#172B4D]" />
                        <span>Add New Subject</span>
                      </>
                    )}
                  </h3>
                  {editingSubject && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                      Edit Mode
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveSubjectSubmit} className="space-y-4">
                  {/* 1. Class Selection Dropdown (Linked to Class Management) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <School className="w-3.5 h-3.5 text-[#172B4D]" />
                        <span>1. Select Class *</span>
                      </span>
                      <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {uniqueClassStandards.length} Classes Loaded
                      </span>
                    </label>
                    <select
                      value={subjectForm.standard || ''}
                      onChange={(e) => handleSelectClassForSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none font-medium text-xs shadow-2xs cursor-pointer"
                    >
                      <option value="">-- Choose Class (from Class Management) --</option>
                      <option value="All">Universal / All Classes</option>
                      {uniqueClassStandards.map(item => (
                        <option key={item.standard} value={item.standard}>
                          Class {item.standard}
                        </option>
                      ))}
                    </select>

                    {/* Active Selected Class Confirmation Pill */}
                    {subjectForm.standard && (
                      <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900">
                        <School className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        <span className="font-semibold">
                          Linked to: {subjectForm.standard === 'All' ? 'Universal (All Classes)' : `Class ${subjectForm.standard} (All Sections)`}
                        </span>
                        <span className="ml-auto px-1.5 py-0.2 bg-white text-blue-800 text-[10px] font-bold rounded border border-blue-200">
                          {subjectForm.board || 'CBSE'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 2. Subject Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      2. Subject Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mathematics, Science, English..."
                      value={subjectForm.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSubjectForm(prev => {
                          const prefix = val.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
                          const std = prev.standard && prev.standard !== 'All' ? `-${prev.standard}${prev.section || ''}` : '';
                          return {
                            ...prev,
                            name: val,
                            code: !editingSubject && (!prev.code || prev.code.startsWith('SUB') || prev.code.includes('-')) ? `${prefix}${std}` : prev.code
                          };
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none font-medium text-xs shadow-2xs"
                    />

                    {/* Quick Subject Suggestions */}
                    <div className="mt-2">
                      <span className="text-[10px] font-semibold text-slate-400 block mb-1">Quick Select:</span>
                      <div className="flex flex-wrap gap-1">
                        {['Mathematics', 'Science', 'English', 'Physics', 'Chemistry', 'Biology', 'Computer Science & AI', 'Social Studies', 'Hindi'].map((suggestedName) => (
                          <button
                            key={suggestedName}
                            type="button"
                            onClick={() => {
                              setSubjectForm(prev => {
                                const prefix = suggestedName.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
                                const std = prev.standard && prev.standard !== 'All' ? `-${prev.standard}${prev.section || ''}` : '';
                                return {
                                  ...prev,
                                  name: suggestedName,
                                  code: !editingSubject ? `${prefix}${std}` : prev.code
                                };
                              });
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer border ${
                              subjectForm.name === suggestedName
                                ? 'bg-[#29456D] text-white border-[#29456D]'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            {suggestedName}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. Subject Code */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Subject Code</span>
                      <span className="text-[10px] text-slate-400 font-normal">Auto or Custom</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MATH-10A"
                      value={subjectForm.code}
                      onChange={(e) => setSubjectForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none shadow-2xs"
                    />
                  </div>

                  {/* 4. Type & Weekly Hours */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Category
                      </label>
                      <select
                        value={subjectForm.type}
                        onChange={(e) => setSubjectForm(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none font-medium text-xs shadow-2xs"
                      >
                        <option value="Core">Core Subject</option>
                        <option value="Elective">Elective</option>
                        <option value="Language">Language</option>
                        <option value="Practical">Practical / Lab</option>
                        <option value="Co-Curricular">Co-Curricular</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Periods / Wk
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={subjectForm.weeklyHours}
                        onChange={(e) => setSubjectForm(prev => ({ ...prev, weeklyHours: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none font-medium text-xs shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="pt-2">
                    {editingSubject ? (
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSavingSubject}
                          className="flex-1 py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs cursor-pointer"
                        >
                          {isSavingSubject ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <>
                              <SaveIcon className="w-4 h-4" />
                              <span>Update Subject</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditSubject}
                          className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSavingSubject}
                          className="flex-1 py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs cursor-pointer"
                        >
                          {isSavingSubject ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              <span>Add Subject</span>
                            </>
                          )}
                        </button>
                        {(subjectForm.name || subjectForm.classId) && (
                          <button
                            type="button"
                            onClick={handleCancelEditSubject}
                            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                            title="Reset form"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Right Column: Subject Catalogue & Class Filter (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                {/* Search & Filter Header Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search subjects, codes, or classes..."
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none font-medium text-xs shadow-2xs"
                    />
                    {subjectSearch && (
                      <button
                        onClick={() => setSubjectSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter by Class (Connected directly to Class Management) */}
                  <div className="flex items-center gap-2">
                    <select
                      value={subjectClassFilter}
                      onChange={(e) => setSubjectClassFilter(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold text-xs focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none shadow-2xs cursor-pointer"
                    >
                      <option value="All">All Classes ({subjects.length})</option>
                      <option value="Universal">Universal / General</option>
                      {uniqueClassStandards.map(item => (
                        <option key={item.standard} value={item.standard}>
                          Class {item.standard}
                        </option>
                      ))}
                    </select>

                    {/* Filter by Type */}
                    <select
                      value={subjectTypeFilter}
                      onChange={(e) => setSubjectTypeFilter(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold text-xs focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none shadow-2xs cursor-pointer"
                    >
                      <option value="All">All Categories</option>
                      <option value="Core">Core</option>
                      <option value="Elective">Elective</option>
                      <option value="Language">Language</option>
                      <option value="Practical">Practical</option>
                    </select>
                  </div>
                </div>

                {/* Subject Catalogue Table */}
                {subjectsLoading ? (
                  <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-200">
                    <Spinner size="md" />
                    <p className="text-xs text-slate-500 font-medium mt-3">Loading subjects directory...</p>
                  </div>
                ) : filteredSubjects.length === 0 ? (
                  <div className="text-center py-14 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#172B4D] flex items-center justify-center mx-auto mb-3">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No subjects found</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {subjectSearch || subjectClassFilter !== 'All' || subjectTypeFilter !== 'All'
                        ? 'Try clearing the search or class filter to view all subjects.'
                        : 'Select a class on the left and add your first subject to get started.'}
                    </p>
                    {(subjectSearch || subjectClassFilter !== 'All' || subjectTypeFilter !== 'All') && (
                      <button
                        onClick={() => { setSubjectSearch(''); setSubjectClassFilter('All'); setSubjectTypeFilter('All'); }}
                        className="mt-3 px-3.5 py-1.5 bg-[#29456D] text-white rounded-xl text-xs font-semibold hover:bg-blue-800 cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs bg-white">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider">
                          <th className="px-4 py-3.5 text-left">Subject Name & Code</th>
                          <th className="px-4 py-3.5 text-left">Linked Class</th>
                          <th className="px-4 py-3.5 text-left">Category</th>
                          <th className="px-4 py-3.5 text-center">Periods</th>
                          <th className="px-4 py-3.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-xs">
                        {filteredSubjects.map((sub) => {
                          const isUniversal = !sub.standard || sub.standard === 'All';
                          return (
                            <tr
                              key={sub.id || sub._id}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                editingSubject && (editingSubject.id === sub.id || editingSubject._id === sub._id)
                                  ? 'bg-amber-50/60'
                                  : ''
                              }`}
                            >
                              {/* Subject Name & Code */}
                              <td className="px-4 py-3.5 font-bold text-slate-900">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 text-[#172B4D] flex items-center justify-center shrink-0">
                                    <BookOpen className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                      {sub.name}
                                    </div>
                                    {sub.code && (
                                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                        {sub.code}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Linked Class */}
                              <td className="px-4 py-3.5">
                                {isUniversal ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-200">
                                    Universal (All)
                                  </span>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 font-bold text-xs border border-blue-200/70">
                                      <School className="w-3.5 h-3.5 text-[#172B4D]" />
                                      <span>Class {sub.standard} {sub.section ? `- ${sub.section}` : ''}</span>
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-800 border border-amber-200/80">
                                      {sub.board || 'CBSE'}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Category */}
                              <td className="px-4 py-3.5">
                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                  sub.type === 'Elective'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : sub.type === 'Language'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : sub.type === 'Practical'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                                }`}>
                                  {sub.type || 'Core'}
                                </span>
                              </td>

                              {/* Periods / Weekly Load */}
                              <td className="px-4 py-3.5 text-center font-semibold text-slate-600">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{sub.weeklyHours || 4}/wk</span>
                                </span>
                              </td>

                              {/* Action Buttons: Edit & Delete */}
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleStartEditSubject(sub)}
                                    className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#172B4D] border border-blue-200/80 transition-all flex items-center justify-center cursor-pointer shadow-2xs hover:scale-105"
                                    title="Edit Subject"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingSubject(sub);
                                      setIsDeleteSubjectModalOpen(true);
                                    }}
                                    className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all flex items-center justify-center cursor-pointer shadow-2xs hover:scale-105"
                                    title="Delete Subject"
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
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Subject Confirmation Modal */}
        {isDeleteSubjectModalOpen && deletingSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all animate-scaleUp">
              <div className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 text-center">
                  Delete Subject
                </h3>
                <p className="text-xs text-slate-500 text-center mt-2 leading-relaxed">
                  Are you sure you want to remove <strong className="text-slate-900 font-bold">"{deletingSubject.name}"</strong>
                  {deletingSubject.standard && deletingSubject.standard !== 'All' ? ` for Class ${deletingSubject.standard} ${deletingSubject.section ? `(${deletingSubject.section})` : ''}` : ''}?
                  This will remove the subject and any associated timetable or faculty mappings.
                </p>

                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteSubjectModalOpen(false);
                      setDeletingSubject(null);
                    }}
                    disabled={isDeletingSubject}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteSubject}
                    disabled={isDeletingSubject}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isDeletingSubject ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Confirm Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mapping Management Tab */}
        {activeTab === 'mappings' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden mb-8 text-slate-900">
            {/* Header with Title and Quick Stats */}
            <div className="bg-white px-6 sm:px-8 py-5 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#172B4D] to-blue-700 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Link2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Teacher, Class & Subject Mappings
                  </h2>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-normal">
                    Assign subject educators to specific grades, sections, and curriculum courses from Class & Subject Management.
                  </p>
                </div>
              </div>

              {/* Stats Badges */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="px-3.5 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/60 flex items-center gap-2 text-xs">
                  <Link2 className="w-3.5 h-3.5 text-[#172B4D]" />
                  <span className="text-slate-600 font-medium">Total Assignments:</span>
                  <span className="font-bold text-[#172B4D]">{mappings.length}</span>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-200/60 flex items-center gap-2 text-xs">
                  <UsersRound className="w-3.5 h-3.5 text-indigo-700" />
                  <span className="text-slate-600 font-medium">Educators Assigned:</span>
                  <span className="font-bold text-indigo-700">
                    {new Set(mappings.map(m => m.teacher?.name || m.teacherName).filter(Boolean)).size}
                  </span>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2 text-xs">
                  <School className="w-3.5 h-3.5 text-slate-700" />
                  <span className="text-slate-600 font-medium">Classes Covered:</span>
                  <span className="font-bold text-slate-800">
                    {new Set(mappings.map(m => `${m.class?.standard || m.standard}-${m.class?.section || m.section}`).filter(s => s !== '-')).size}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Add / Edit Mapping Form (4 cols) */}
              <div className="lg:col-span-4 bg-slate-50/70 p-6 rounded-2xl border border-slate-200 h-fit space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {editingMapping ? (
                      <>
                        <Edit3 className="w-4 h-4 text-amber-600" />
                        <span className="text-amber-800">Edit Assignment</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-[#172B4D]" />
                        <span>Assign Subject Teacher</span>
                      </>
                    )}
                  </h3>
                  {editingMapping && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                      Edit Mode
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveMappingSubmit} className="space-y-4">
                  {/* 1. Teacher Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <UsersRound className="w-3.5 h-3.5 text-[#172B4D]" />
                        <span>1. Teacher *</span>
                      </span>
                      <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {employees.filter(emp => !emp.is_super_admin && !['admin', 'parent', 'student'].includes((emp.role || '').toLowerCase())).length} Educators
                      </span>
                    </label>
                    <select
                      value={mappingForm.teacherId}
                      onChange={(e) => setMappingForm(prev => ({ ...prev, teacherId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none font-medium text-xs cursor-pointer shadow-2xs"
                    >
                      <option value="">-- Select Teacher --</option>
                      {(Array.isArray(employees) ? employees : [])
                        .filter(emp => !emp.is_super_admin && !['admin', 'parent', 'student'].includes((emp.role || '').toLowerCase()))
                        .map(tch => (
                          <option key={tch._id || tch.id} value={tch._id || tch.id}>
                            {tch.name} ({tch.employeeId || 'N/A'}) {tch.primary_subject ? `• ${tch.primary_subject}` : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* 2. Class Selector (from Class Management) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <School className="w-3.5 h-3.5 text-[#172B4D]" />
                        <span>2. Class *</span>
                      </span>
                      <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                        {classes.length} Classes Available
                      </span>
                    </label>
                    <select
                      value={mappingForm.classId}
                      onChange={(e) => setMappingForm(prev => ({ ...prev, classId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none font-medium text-xs cursor-pointer shadow-2xs"
                    >
                      <option value="">-- Select Class (from Class Management) --</option>
                      {classes.map(cls => (
                        <option key={cls.id || cls._id} value={cls.id || cls._id}>
                          Class {cls.standard} - Section {cls.section} ({cls.board || 'CBSE'}) {cls.roomNumber ? `• ${cls.roomNumber}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Subject Selector (from Subject Management) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#172B4D]" />
                        <span>3. Subject *</span>
                      </span>
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {subjects.length} Subjects Registered
                      </span>
                    </label>
                    <select
                      value={mappingForm.subjectId}
                      onChange={(e) => setMappingForm(prev => ({ ...prev, subjectId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none font-medium text-xs cursor-pointer shadow-2xs"
                    >
                      <option value="">-- Select Subject (from Subject Management) --</option>
                      {subjects.map(sub => (
                        <option key={sub.id || sub._id} value={sub.id || sub._id}>
                          {sub.name} {sub.code ? `(${sub.code})` : ''} {sub.standard ? `• Class ${sub.standard}` : '• Universal'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="pt-2">
                    {editingMapping ? (
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSavingMapping}
                          className="flex-1 py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs cursor-pointer"
                        >
                          {isSavingMapping ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <>
                              <SaveIcon className="w-4 h-4" />
                              <span>Update Assignment</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditMapping}
                          className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSavingMapping}
                          className="flex-1 py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs cursor-pointer"
                        >
                          {isSavingMapping ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              <span>Create Assignment</span>
                            </>
                          )}
                        </button>
                        {(mappingForm.teacherId || mappingForm.classId || mappingForm.subjectId) && (
                          <button
                            type="button"
                            onClick={handleCancelEditMapping}
                            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                            title="Reset form"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Right Column: Mapping List & Filters (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                {/* Search & Filter Header Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search assignments by teacher, subject, class..."
                      value={mappingSearch}
                      onChange={(e) => setMappingSearch(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none font-medium text-xs shadow-2xs"
                    />
                    {mappingSearch && (
                      <button
                        onClick={() => setMappingSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter by Class (From Class Management) */}
                  <div className="flex items-center gap-2">
                    <select
                      value={mappingClassFilter}
                      onChange={(e) => setMappingClassFilter(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold text-xs focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none shadow-2xs cursor-pointer"
                    >
                      <option value="All">All Classes ({classes.length})</option>
                      {classes.map(cls => (
                        <option key={cls.id || cls._id} value={cls.id || cls._id}>
                          Class {cls.standard} - {cls.section}
                        </option>
                      ))}
                    </select>

                    {/* Filter by Subject (From Subject Management) */}
                    <select
                      value={mappingSubjectFilter}
                      onChange={(e) => setMappingSubjectFilter(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold text-xs focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none shadow-2xs cursor-pointer"
                    >
                      <option value="All">All Subjects ({subjects.length})</option>
                      {subjects.map(sub => (
                        <option key={sub.id || sub._id} value={sub.id || sub._id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mapping List Table */}
                {mappingsLoading ? (
                  <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-200">
                    <Spinner size="md" />
                    <p className="text-xs text-slate-500 font-medium mt-3">Loading assignments directory...</p>
                  </div>
                ) : filteredMappings.length === 0 ? (
                  <div className="text-center py-14 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#172B4D] flex items-center justify-center mx-auto mb-3">
                      <Link2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No assignments found</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {mappingSearch || mappingClassFilter !== 'All' || mappingSubjectFilter !== 'All'
                        ? 'Try clearing the search or filters to view all assignments.'
                        : 'Select a teacher, class, and subject on the left to create your first assignment.'}
                    </p>
                    {(mappingSearch || mappingClassFilter !== 'All' || mappingSubjectFilter !== 'All') && (
                      <button
                        onClick={() => { setMappingSearch(''); setMappingClassFilter('All'); setMappingSubjectFilter('All'); setMappingTeacherFilter('All'); }}
                        className="mt-3 px-3.5 py-1.5 bg-[#29456D] text-white rounded-xl text-xs font-semibold hover:bg-blue-800 cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs bg-white">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider">
                          <th className="px-4 py-3.5 text-left">Teacher</th>
                          <th className="px-4 py-3.5 text-left">Class</th>
                          <th className="px-4 py-3.5 text-left">Subject</th>
                          <th className="px-4 py-3.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-xs">
                        {filteredMappings.map((map) => {
                          const teacherName = map.teacher?.name || map.teacherName || 'Faculty';
                          const teacherEmpId = map.teacher?.employeeId || map.employeeId || 'FAC';
                          const classStd = map.class?.standard || map.standard || 'Grade';
                          const classSec = map.class?.section || map.section || 'A';
                          const classBrd = map.class?.board || map.board || 'CBSE';
                          const subName = map.subject?.name || map.subject || 'Subject';
                          const subCode = map.subject?.code || map.subjectCode || '';

                          return (
                            <tr
                              key={map.id || map._id}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                editingMapping && (editingMapping.id === map.id || editingMapping._id === map._id)
                                  ? 'bg-amber-50/60'
                                  : ''
                              }`}
                            >
                              {/* Teacher Column */}
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#172B4D] to-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                    {teacherName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                      {teacherName}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono tracking-wide">
                                      {teacherEmpId}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Class Column */}
                              <td className="px-4 py-3.5">
                                <div className="inline-flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 font-bold text-xs border border-blue-200/70">
                                    <School className="w-3.5 h-3.5 text-[#172B4D]" />
                                    <span>Class {classStd} - {classSec}</span>
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-800 border border-amber-200/80">
                                    {classBrd}
                                  </span>
                                </div>
                              </td>

                              {/* Subject Column */}
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1.5 font-bold text-[#172B4D]">
                                    <BookOpen className="w-3.5 h-3.5 text-[#172B4D]" />
                                    <span>{subName}</span>
                                  </span>
                                  {subCode && (
                                    <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                      {subCode}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Actions Column */}
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleStartEditMapping(map)}
                                    className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#172B4D] border border-blue-200/80 transition-all flex items-center justify-center cursor-pointer shadow-2xs hover:scale-105"
                                    title="Edit Assignment"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingMapping(map);
                                      setIsDeleteMappingModalOpen(true);
                                    }}
                                    className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all flex items-center justify-center cursor-pointer shadow-2xs hover:scale-105"
                                    title="Remove Assignment"
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
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Mapping Confirmation Modal */}
        {isDeleteMappingModalOpen && deletingMapping && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all animate-scaleUp">
              <div className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 text-center">
                  Remove Assignment
                </h3>
                <p className="text-xs text-slate-500 text-center mt-2 leading-relaxed">
                  Are you sure you want to remove the assignment for <strong className="text-slate-900 font-bold">"{deletingMapping.teacher?.name || deletingMapping.teacherName}"</strong> teaching <strong className="text-blue-900 font-bold">"{deletingMapping.subject?.name || deletingMapping.subject}"</strong> to <strong className="text-slate-900 font-bold">Class {deletingMapping.class?.standard || deletingMapping.standard} - {deletingMapping.class?.section || deletingMapping.section}</strong>?
                </p>

                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteMappingModalOpen(false);
                      setDeletingMapping(null);
                    }}
                    disabled={isDeletingMapping}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteMapping}
                    disabled={isDeletingMapping}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isDeletingMapping ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Confirm Remove</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timetable Management Tab */}
        {activeTab === 'timetable' && (() => {
          const selClassObj = classes.find(c => (c._id && c._id.toString() === selectedClassForGrid?.toString()) || (c.id && c.id.toString() === selectedClassForGrid?.toString()));
          const selTeacherObj = employees.find(t => (t._id && t._id.toString() === selectedTeacherForGrid?.toString()) || (t.id && t.id.toString() === selectedTeacherForGrid?.toString()));

          const currentViewSlots = weeklyTimetable.filter(e => {
            if (selectedViewType === 'class') {
              if (!selectedClassForGrid) return false;
              const cid = e.class?._id || e.class?.id || e.class || e.classId;
              const matchId = Boolean(cid && cid.toString() === selectedClassForGrid.toString());
              const matchStdSec = Boolean(
                selClassObj && e.standard && e.section &&
                e.standard.toString().toLowerCase().trim() === selClassObj.standard.toString().toLowerCase().trim() &&
                e.section.toString().toLowerCase().trim() === selClassObj.section.toString().toLowerCase().trim()
              );
              return matchId || matchStdSec;
            } else {
              if (!selectedTeacherForGrid) return false;
              const tid = e.teacher?._id || e.teacher?.id || e.teacher || e.teacherId;
              const matchId = Boolean(tid && tid.toString() === selectedTeacherForGrid.toString());
              const matchName = Boolean(
                selTeacherObj && (
                  (e.teacherName && e.teacherName.toString().toLowerCase().trim() === selTeacherObj.name.toString().toLowerCase().trim()) ||
                  (typeof e.teacher === 'string' && e.teacher.toString().toLowerCase().trim() === selTeacherObj.name.toString().toLowerCase().trim()) ||
                  (e.teacher?.name && e.teacher.name.toString().toLowerCase().trim() === selTeacherObj.name.toString().toLowerCase().trim())
                )
              );
              return matchId || matchName;
            }
          });

          const nonBreakPeriods = calculatedPeriods.filter(p => !p.isBreak);
          const totalPossibleSlots = (nonBreakPeriods.length || 7) * 6;
          const scheduledSlotCount = currentViewSlots.length;
          const coveragePercent = Math.min(100, Math.round((scheduledSlotCount / (totalPossibleSlots || 1)) * 100));

          const distinctCount = selectedViewType === 'class'
            ? new Set(currentViewSlots.map(s => s.teacherName || s.teacher?.name || (typeof s.teacher === 'string' ? s.teacher : '') || s.teacherId).filter(Boolean)).size
            : new Set(currentViewSlots.map(s => `${s.standard}-${s.section}`).filter(Boolean)).size;

          const entityMappings = mappings.filter(m => {
            if (selectedViewType === 'class') {
              if (!selectedClassForGrid) return false;
              const cid = m.class?._id || m.class?.id || m.classId || m.class;
              const matchId = Boolean(cid && cid.toString() === selectedClassForGrid.toString());
              const matchStdSec = Boolean(
                selClassObj && m.standard && m.section &&
                m.standard.toString().toLowerCase().trim() === selClassObj.standard.toString().toLowerCase().trim() &&
                m.section.toString().toLowerCase().trim() === selClassObj.section.toString().toLowerCase().trim()
              );
              return matchId || matchStdSec;
            } else {
              if (!selectedTeacherForGrid) return false;
              const tid = m.teacher?._id || m.teacher?.id || m.teacherId || m.teacher;
              const matchId = Boolean(tid && tid.toString() === selectedTeacherForGrid.toString());
              const matchName = Boolean(
                selTeacherObj && (
                  (m.teacherName && m.teacherName.toString().toLowerCase().trim() === selTeacherObj.name.toString().toLowerCase().trim()) ||
                  (m.teacher?.name && m.teacher.name.toString().toLowerCase().trim() === selTeacherObj.name.toString().toLowerCase().trim())
                )
              );
              return matchId || matchName;
            }
          });

          return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden mb-8 text-slate-900">
              {/* Header */}
              <div className="bg-white px-6 sm:px-8 py-5 border-b border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#172B4D] shrink-0 shadow-2xs">
                    <CalendarDays className="w-5 h-5 text-[#172B4D]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                        Academic Timetable Matrix
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-[#172B4D] border border-blue-200">
                        Live Sync
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-normal">
                      Manage and verify weekly period schedules linked with Class & Subject Management.
                    </p>
                  </div>
                </div>

                {/* View Switcher Pills */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedViewType('class');
                      if (!selectedClassForGrid && classes.length > 0) {
                        setSelectedClassForGrid(classes[0]._id || classes[0].id);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedViewType === 'class'
                        ? 'bg-[#29456D] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <School className="w-3.5 h-3.5" />
                    <span>Class Matrix</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedViewType('teacher');
                      if (!selectedTeacherForGrid) {
                        const validTeachers = employees.filter(e => !e.is_super_admin && !['admin', 'parent', 'student'].includes((e.role || '').toLowerCase()));
                        if (validTeachers.length > 0) {
                          setSelectedTeacherForGrid(validTeachers[0]._id || validTeachers[0].id);
                        }
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedViewType === 'teacher'
                        ? 'bg-[#29456D] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Faculty Matrix</span>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Control Bar: Selection & Actions */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/90 border border-slate-200 p-4 rounded-2xl mb-6 shadow-2xs">
                  <div className="flex flex-wrap items-center gap-3">
                    {selectedViewType === 'class' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                          <School className="w-3.5 h-3.5 text-[#172B4D]" />
                          <span>Select Class:</span>
                        </span>
                        <select
                          value={selectedClassForGrid}
                          onChange={(e) => handleClassGridSelect(e.target.value)}
                          className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold outline-none text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] shadow-2xs cursor-pointer min-w-[220px]"
                        >
                          <option value="">-- Choose Class --</option>
                          {classes.map(cls => {
                            const count = weeklyTimetable.filter(e => {
                              const cid = e.class?._id || e.class?.id || e.class || e.classId;
                              const matchId = Boolean(cid && cid.toString() === (cls._id || cls.id).toString());
                              const matchStdSec = Boolean(
                                e.standard && e.section &&
                                e.standard.toString().toLowerCase().trim() === cls.standard.toString().toLowerCase().trim() &&
                                e.section.toString().toLowerCase().trim() === cls.section.toString().toLowerCase().trim()
                              );
                              return matchId || matchStdSec;
                            }).length;

                            return (
                              <option key={cls._id || cls.id} value={cls._id || cls.id}>
                                Class {cls.standard} - {cls.section} ({cls.board || 'CBSE'}) {count > 0 ? `• [${count} slots]` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-[#172B4D]" />
                          <span>Select Faculty:</span>
                        </span>
                        <select
                          value={selectedTeacherForGrid}
                          onChange={(e) => handleTeacherGridSelect(e.target.value)}
                          className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold outline-none text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] shadow-2xs cursor-pointer min-w-[220px]"
                        >
                          <option value="">-- Choose Faculty --</option>
                          {employees.filter(e => !e.is_super_admin && !['admin', 'parent', 'student'].includes((e.role || '').toLowerCase())).map(t => {
                            const count = weeklyTimetable.filter(e => {
                              const tid = e.teacher?._id || e.teacher?.id || e.teacher || e.teacherId;
                              const matchId = Boolean(tid && tid.toString() === (t._id || t.id).toString());
                              const matchName = Boolean(
                                (e.teacherName && e.teacherName.toString().toLowerCase().trim() === t.name.toString().toLowerCase().trim()) ||
                                (typeof e.teacher === 'string' && e.teacher.toString().toLowerCase().trim() === t.name.toString().toLowerCase().trim()) ||
                                (e.teacher?.name && e.teacher.name.toString().toLowerCase().trim() === t.name.toString().toLowerCase().trim())
                              );
                              return matchId || matchName;
                            }).length;

                            return (
                              <option key={t._id || t.id} value={t._id || t.id}>
                                {t.name} ({t.employeeId || 'FAC'}) {count > 0 ? `• [${count} slots]` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleAutoGenerateTimetable}
                      className="px-3.5 py-2 bg-gradient-to-r from-[#172B4D] to-blue-700 hover:from-blue-800 hover:to-blue-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer hover:shadow-md"
                      title="Automatically populate empty periods using verified teacher-class mappings"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                      <span>Auto-Fill from Mappings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.success("Timetable locked successfully! Notifications sent to teachers.")}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Lock</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
                    >
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                {/* Summary Metrics & Mappings Banner */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 mb-6">
                  {/* Active Target Banner */}
                  <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#29456D] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {selectedViewType === 'class' ? <School className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
                        {selectedViewType === 'class' ? 'Active Class Target' : 'Active Faculty Target'}
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {selectedViewType === 'class'
                          ? (selClassObj ? `Class ${selClassObj.standard} - ${selClassObj.section} (${selClassObj.board || 'CBSE'})` : 'No Class Selected')
                          : (selTeacherObj ? `${selTeacherObj.name} (${selTeacherObj.employeeId || 'FAC'})` : 'No Faculty Selected')}
                      </div>
                      {selClassObj?.roomNumber && (
                        <div className="text-[10px] text-blue-700 font-semibold">
                          Room: {selClassObj.roomNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scheduled Periods Metric */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Periods Scheduled
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {scheduledSlotCount} <span className="text-xs text-slate-400 font-normal">/ {totalPossibleSlots} Weekly</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        {coveragePercent}% Week Coverage
                      </div>
                    </div>
                  </div>

                  {/* Faculty / Classes Metric */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <UsersRound className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        {selectedViewType === 'class' ? 'Assigned Faculty' : 'Assigned Classes'}
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {distinctCount} {selectedViewType === 'class' ? 'Educators' : 'Classes'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        Actively Scheduled
                      </div>
                    </div>
                  </div>

                  {/* Active Mappings Metric */}
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      <Link2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                        Active Mappings
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {entityMappings.length} Subject Mapping(s)
                      </div>
                      <div className="text-[10px] text-amber-800 font-semibold truncate">
                        {entityMappings.length > 0 ? 'Ready for auto-fill' : 'Add in Mappings tab'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid Container */}
                {timetableLoading ? (
                  <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Spinner size="md" />
                    <p className="text-xs text-slate-500 mt-2 font-medium">Synchronizing weekly timetable matrix...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs bg-white mb-6">
                    <table className="w-full text-center text-xs border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-slate-900 text-white border-b border-slate-300">
                          <th className="py-3.5 px-4 text-left border-r border-slate-700 bg-slate-950 sticky left-0 z-10 w-[140px] uppercase font-bold tracking-wider text-[11px]">
                            PERIOD / TIME
                          </th>
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                            <th key={d} className="py-3.5 px-3 border-r border-slate-700 text-center uppercase tracking-wider font-bold text-[11px] last:border-r-0">
                              {d}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {calculatedPeriods.map(p => {
                          if (p.isBreak) {
                            return (
                              <tr key={`break-${p.period}`} className="bg-amber-50/40 border-b border-amber-200/60">
                                <td className="py-2.5 px-3 border-r border-amber-200 bg-amber-100/50 sticky left-0 z-10 text-left font-bold text-amber-900 text-[10px]">
                                  {p.label || 'BREAK'} ({p.timeSlot})
                                </td>
                                <td colSpan={6} className="py-2.5 px-4 text-center font-extrabold uppercase text-[10px] tracking-widest text-amber-800">
                                  {p.label || 'RECESS / BREAK'} • {p.timeSlot}
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={p.period} className="border-b border-slate-200 hover:bg-slate-50/40 transition-colors">
                              <td className="py-3.5 px-3 border-r border-slate-200 bg-slate-100/70 sticky left-0 z-10 text-left w-[140px] border-b border-slate-200">
                                <div className="font-extrabold text-xs text-slate-800">Period {p.period}</div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{p.timeSlot}</div>
                              </td>

                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => {
                                const slot = weeklyTimetable.find(e => {
                                  if (selectedViewType === 'class') {
                                    const cid = e.class?._id || e.class?.id || e.class || e.classId;
                                    const matchId = Boolean(cid && selectedClassForGrid && cid.toString() === selectedClassForGrid.toString());
                                    const matchStdSec = Boolean(
                                      selClassObj && e.standard && e.section &&
                                      e.standard.toString().toLowerCase().trim() === selClassObj.standard.toString().toLowerCase().trim() &&
                                      e.section.toString().toLowerCase().trim() === selClassObj.section.toString().toLowerCase().trim()
                                    );
                                    return (matchId || matchStdSec) && e.day === d && Number(e.period) === Number(p.period);
                                  } else {
                                    const tid = e.teacher?._id || e.teacher?.id || e.teacher || e.teacherId;
                                    const matchId = Boolean(tid && selectedTeacherForGrid && tid.toString() === selectedTeacherForGrid.toString());
                                    const matchName = Boolean(
                                      selTeacherObj && (
                                        (e.teacherName && e.teacherName.toString().toLowerCase().trim() === selTeacherObj.name.toString().toLowerCase().trim()) ||
                                        (typeof e.teacher === 'string' && e.teacher.toString().toLowerCase().trim() === selTeacherObj.name.toString().toLowerCase().trim()) ||
                                        (e.teacher?.name && e.teacher.name.toString().toLowerCase().trim() === selTeacherObj.name.toString().toLowerCase().trim())
                                      )
                                    );
                                    return (matchId || matchName) && e.day === d && Number(e.period) === Number(p.period);
                                  }
                                });

                                if (!slot) {
                                  return (
                                    <td key={d} className="p-3 border-r border-slate-200 text-center align-middle last:border-r-0">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditCellModal(d, p.period)}
                                        className="text-slate-400 hover:text-[#172B4D] hover:border-[#29456D] font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 mx-auto py-2 px-3 rounded-xl border border-dashed border-slate-250 bg-slate-50/50 hover:bg-blue-50/60 transition-all cursor-pointer shadow-2xs hover:scale-102"
                                      >
                                        <Plus className="w-3 h-3 text-[#172B4D]" />
                                        <span>Add Period</span>
                                      </button>
                                    </td>
                                  );
                                }

                                const subjectName = slot.subjectName || slot.subject?.name || (typeof slot.subject === 'string' ? slot.subject : 'General');
                                const displaySubText = selectedViewType === 'class'
                                  ? (slot.teacherName || slot.teacher?.name || (typeof slot.teacher === 'string' ? slot.teacher : 'Faculty'))
                                  : (slot.class ? `Class ${slot.class.standard}-${slot.class.section}` : `${slot.standard || ''}-${slot.section || ''}`);

                                return (
                                  <td key={d} className="p-2.5 border-r border-slate-200 text-center align-middle last:border-r-0">
                                    <div className="rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50/60 to-white p-3 shadow-2xs text-center relative group hover:border-blue-300 transition-all">
                                      <div className="font-extrabold text-[11px] text-[#172B4D] uppercase tracking-wide truncate flex items-center justify-center gap-1">
                                        <BookOpen className="w-3 h-3 shrink-0 text-[#172B4D]" />
                                        <span className="truncate">{subjectName}</span>
                                      </div>
                                      <div className="text-[10px] font-semibold text-slate-600 mt-1 truncate flex items-center justify-center gap-1">
                                        {selectedViewType === 'class' ? <User className="w-2.5 h-2.5 shrink-0 text-slate-400" /> : <School className="w-2.5 h-2.5 shrink-0 text-slate-400" />}
                                        <span className="truncate">{displaySubText}</span>
                                      </div>
                                      
                                      <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-slate-200 text-[9px] font-extrabold uppercase">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditCellModal(d, p.period, slot)}
                                          className="hover:scale-110 transition-all text-[#172B4D] hover:underline cursor-pointer flex items-center gap-0.5"
                                        >
                                          <Edit3 className="w-2.5 h-2.5" />
                                          <span>Edit</span>
                                        </button>
                                        <span className="text-slate-300">•</span>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteCell(slot._id || slot.id)}
                                          className="hover:scale-110 transition-all text-rose-600 hover:underline cursor-pointer flex items-center gap-0.5"
                                        >
                                          <Trash2 className="w-2.5 h-2.5" />
                                          <span>Delete</span>
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* Dashboard Modal */}
      {selectedUserDashboard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl p-8 w-full max-w-2xl relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setSelectedUserDashboard(null)} className="absolute top-6 right-6 text-gray-500 hover:text-gray-900 bg-gray-100 rounded-full p-1 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 pb-6 border-b border-gray-200">
              <div className="w-20 h-20 bg-[#29456D] rounded-full flex items-center justify-center shadow-md shadow-sm shrink-0">
                <span className="text-3xl font-bold text-white">{selectedUserDashboard.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedUserDashboard.name}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <p className="text-gray-500">{selectedUserDashboard.designation || selectedUserDashboard.profession || 'Employee'}</p>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {selectedUserDashboard.liveness_verified ? 'Face Verified' : 'No Face Data'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Email</p>
                <p className="text-gray-900 font-medium break-all">{selectedUserDashboard.email || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Phone</p>
                <p className="text-gray-900 font-medium">{selectedUserDashboard.phone || 'N/A'}</p>
              </div>
              <div className="bg-stone-50 rounded-xl p-4 border border-[#e9ebec]">
                <p className="text-xs text-[#172B4D] uppercase tracking-wider mb-1">Employee ID</p>
                <p className="text-[#405189] font-bold">{selectedUserDashboard.employee_id || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Joining Date</p>
                <p className="text-gray-900 font-medium">{selectedUserDashboard.joining_date || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Hours / Day</p>
                <p className="text-gray-900 font-medium">{selectedUserDashboard.hours_per_day || 8} hours</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Weekly Off</p>
                <p className="text-gray-900 font-medium">{selectedUserDashboard.weekly_off || 'Sunday'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Account Role</p>
                <p className="text-gray-900 font-medium capitalize bg-stone-100 text-[#405189] px-2 py-0.5 rounded inline-block">
                  {selectedUserDashboard.role || 'user'}
                </p>
              </div>
              <div className="bg-stone-50 rounded-xl p-4 border border-[#e9ebec]">
                <p className="text-xs text-[#172B4D] uppercase tracking-wider mb-1">Employee Password</p>
                <p className="text-gray-900 font-bold tracking-wider">{selectedUserDashboard.plain_password || 'N/A'}</p>
              </div>
              <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-200">
                <p className="text-xs text-[#172B4D] font-bold uppercase tracking-wider mb-1">Primary Subject</p>
                <p className="text-slate-900 font-bold text-sm">{selectedUserDashboard.primary_subject || 'Not Specified'}</p>
              </div>
              <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200">
                <p className="text-xs text-amber-800 font-bold uppercase tracking-wider mb-1">Secondary Subject</p>
                <p className="text-slate-900 font-bold text-sm">{selectedUserDashboard.secondary_subject || 'Not Specified'}</p>
              </div>
            </div>

            {/* Insurance Details Section (Admin-Editable) */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#172B4D]" />
                <span>Institutional Insurance Record</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col">
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Insurance ID</label>
                  <input
                    type="text"
                    value={modalInsuranceId}
                    onChange={(e) => setModalInsuranceId(e.target.value)}
                    placeholder="e.g. INS-982312"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:ring-2 focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-all"
                  />
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col">
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Insurance Provider</label>
                  <input
                    type="text"
                    value={modalInsuranceProvider}
                    onChange={(e) => setModalInsuranceProvider(e.target.value)}
                    placeholder="e.g. MetLife / BlueCross"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:ring-2 focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-all"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveModalInsurance}
                disabled={modalSaving}
                className="w-full mt-4 py-3 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                {modalSaving ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Saving Insurance Details...</>
                ) : (
                  <><SaveIcon className="w-4 h-4" /> Save Insurance Details</>
                )}
              </button>
            </div>

            {/* Document Upload & Retrieval Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#172B4D]" />
                <span>Identity & Verification Documents</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* 1. Government ID Upload / Download */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-between min-h-[140px]">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold block">Government ID Card</label>
                    {selectedUserDashboard.govt_id_filename ? (
                      <div className="flex items-center gap-2 mb-3 bg-white border border-slate-200 px-3 py-2 rounded-lg">
                        <FileText className="w-4 h-4 text-[#172B4D]" />
                        <span className="text-slate-700 text-xs truncate max-w-[200px]" title={selectedUserDashboard.govt_id_filename}>
                          {selectedUserDashboard.govt_id_filename}
                        </span>
                      </div>
                    ) : (
                      <p className="text-stone-400 text-xs italic mb-4">No government ID uploaded yet</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 mt-auto">
                    {selectedUserDashboard.govt_id_filename && (
                      <button
                        onClick={() => handleDocumentDownload('govt_id', selectedUserDashboard.govt_id_filename)}
                        className="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Download Govt ID</span>
                      </button>
                    )}
                    
                    <label className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 text-center">
                      {govtUploading ? (
                        <><span className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span> Uploading...</>
                      ) : (
                        <><Upload className="w-3.5 h-3.5 text-slate-500" /> <span>{selectedUserDashboard.govt_id_filename ? 'Replace' : 'Upload'} Govt ID</span></>
                      )}
                      <input
                        type="file"
                        onChange={(e) => handleDocumentUpload(e, 'govt_id')}
                        disabled={govtUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* 2. Insurance Document Upload / Download */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-between min-h-[140px]">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold block">Insurance Policy Doc</label>
                    {selectedUserDashboard.insurance_filename ? (
                      <div className="flex items-center gap-2 mb-3 bg-white border border-slate-200 px-3 py-2 rounded-lg">
                        <FileText className="w-4 h-4 text-[#172B4D]" />
                        <span className="text-slate-700 text-xs truncate max-w-[200px]" title={selectedUserDashboard.insurance_filename}>
                          {selectedUserDashboard.insurance_filename}
                        </span>
                      </div>
                    ) : (
                      <p className="text-stone-400 text-xs italic mb-4">No insurance document uploaded yet</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 mt-auto">
                    {selectedUserDashboard.insurance_filename && (
                      <button
                        onClick={() => handleDocumentDownload('insurance', selectedUserDashboard.insurance_filename)}
                        className="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Download Policy</span>
                      </button>
                    )}
                    
                    <label className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 text-center">
                      {insUploading ? (
                        <><span className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span> Uploading...</>
                      ) : (
                        <><Upload className="w-3.5 h-3.5 text-slate-500" /> <span>{selectedUserDashboard.insurance_filename ? 'Replace' : 'Upload'} Policy</span></>
                      )}
                      <input
                        type="file"
                        onChange={(e) => handleDocumentUpload(e, 'insurance')}
                        disabled={insUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

              </div>
            </div>

            {/* Teacher Timetable Schedules inside Profile */}
            {(selectedUserDashboard.role === 'teacher' || selectedUserDashboard.role === 'user') && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#172B4D]" />
                  <span>Faculty Timetable & Schedule</span>
                </h3>
                
                <div className="space-y-6">
                  {/* Today's Schedule */}
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span>Today's Timetable ({(() => {
                        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        return days[new Date().getDay()];
                      })()})</span>
                    </h4>
                    {(() => {
                      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      const todayName = days[new Date().getDay()];
                      const slots = weeklyTimetable.filter(slot => {
                        const tid = slot.teacher?._id || slot.teacher;
                        return tid?.toString() === selectedUserDashboard._id?.toString() && slot.day === todayName;
                      }).sort((a, b) => Number(a.period) - Number(b.period));

                      if (slots.length === 0) {
                        return <p className="text-[11px] text-stone-500 italic">No periods scheduled for today.</p>;
                      }

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {slots.map((s, idx) => (
                            <div key={idx} className="bg-white border border-stone-250 rounded-xl p-2.5 shadow-sm text-center">
                              <span className="block text-[10px] text-gray-400 font-bold uppercase">Period {s.period}</span>
                              <span className="block text-xs font-bold text-slate-800 mt-0.5">{s.subject?.name || s.subject || 'N/A'}</span>
                              <span className="block text-[9px] text-[#172B4D] font-semibold mt-0.5">
                                {s.class ? `Class ${s.class.standard}-${s.class.section}` : 'N/A'}
                              </span>
                              <span className="block text-[8px] text-gray-400 font-mono mt-0.5">
                                {calculatedPeriods.find(p => p.period === s.period)?.timeSlot || ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Weekly Schedule Grid */}
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                      Weekly Schedule Overview
                    </h4>
                    <div className="overflow-x-auto border border-stone-200 rounded-xl bg-white shadow-sm">
                      <table className="w-full text-center text-[10px] font-bold border-collapse min-w-[500px]">
                        <thead>
                          <tr className="bg-stone-800 text-white border-b border-stone-200">
                            <th className="py-2 px-3 border-r border-stone-200 bg-stone-900 font-black uppercase text-left w-[100px]">Day</th>
                            {calculatedPeriods.map((p, idx) => (
                              <th key={idx} className="py-2 px-1.5 border-r border-stone-200 uppercase font-black">
                                P{p.period}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => (
                            <tr key={idx} className="border-b border-stone-150 hover:bg-stone-50/50">
                              <td className="py-2.5 px-3 border-r border-stone-200 bg-stone-100 font-black text-stone-700 text-left w-[100px]">{day}</td>
                              {calculatedPeriods.map((p, pIdx) => {
                                const slot = weeklyTimetable.find(s => {
                                  const tid = s.teacher?._id || s.teacher;
                                  return tid?.toString() === selectedUserDashboard._id?.toString() &&
                                    s.day === day &&
                                    Number(s.period) === Number(p.period);
                                });

                                return (
                                  <td key={pIdx} className="p-1 border-r border-stone-200 text-center align-middle font-bold">
                                    {slot ? (
                                      <div className="rounded border border-stone-200 bg-slate-50 p-1">
                                        <div className="text-[10px] font-black text-stone-850 truncate">{slot.subject?.name || slot.subject || 'N/A'}</div>
                                        <div className="text-[8px] text-[#172B4D] font-black mt-0.5 truncate">
                                          {slot.class ? `${slot.class.standard}-${slot.class.section}` : 'N/A'}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-gray-300 font-normal">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Roles Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl p-8 w-full max-w-md relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsRoleModalOpen(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-gray-900 bg-gray-100 rounded-full p-1 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#172B4D]" />
              <span>{editingRole ? 'Edit Role Permissions' : 'Create New Institutional Role'}</span>
            </h3>

            <form onSubmit={handleRoleSubmit} className="space-y-5 text-gray-900">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Role Code *</label>
                <input
                  type="text"
                  required
                  value={editingRole ? roleForm.RoleCode : 'AUTO-GENERATED'}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-500 focus:ring-2 focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-all cursor-not-allowed"
                  disabled={true}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Role Name *</label>
                <input
                  type="text"
                  required
                  value={roleForm.Rolename}
                  onChange={(e) => setRoleForm({ ...roleForm, Rolename: e.target.value })}
                  placeholder="e.g. Sales Manager"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-all"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Grant Admin Privilege</label>
                    <p className="text-xs text-gray-500">Gives administrative read/write settings rights</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleForm.GantAdminPrevillage}
                      onChange={(e) => setRoleForm({ ...roleForm, GantAdminPrevillage: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#29456D]"></div>
                  </label>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Enable Role (Active Status)</label>
                    <p className="text-xs text-gray-500">Enable or disable this role across the platform</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleForm.isActive !== false}
                      onChange={(e) => setRoleForm({ ...roleForm, isActive: e.target.checked, isEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl text-gray-700 font-bold transition-all active:scale-95 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#29456D] hover:bg-[#172B4D] text-white font-bold shadow-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 text-center"
                >
                  {editingRole ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Add Teacher Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl p-8 w-full max-w-lg relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-gray-900 bg-gray-100 rounded-full p-1 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
              <Plus className="w-5 h-5 text-[#172B4D]" />
              <span>Add New Faculty Member</span>
            </h3>

            <form onSubmit={handleAddTeacher} className="space-y-5 text-gray-900">
              {/* Row 1: First Name, Middle Name, Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">First Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.firstName || ''}
                    onChange={(e) => {
                      const f = e.target.value;
                      setAddForm(prev => ({
                        ...prev,
                        firstName: f,
                        name: [f, prev.middleName, prev.lastName].filter(Boolean).join(' ')
                      }));
                    }}
                    placeholder="e.g. John"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none text-xs transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Middle Name</label>
                  <input
                    type="text"
                    value={addForm.middleName || ''}
                    onChange={(e) => {
                      const m = e.target.value;
                      setAddForm(prev => ({
                        ...prev,
                        middleName: m,
                        name: [prev.firstName, m, prev.lastName].filter(Boolean).join(' ')
                      }));
                    }}
                    placeholder="e.g. Michael"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none text-xs transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.lastName || ''}
                    onChange={(e) => {
                      const l = e.target.value;
                      setAddForm(prev => ({
                        ...prev,
                        lastName: l,
                        name: [prev.firstName, prev.middleName, l].filter(Boolean).join(' ')
                      }));
                    }}
                    placeholder="e.g. Doe"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none text-xs transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 2: Email */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="e.g. teacher@school.com"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-all"
                />
              </div>

              {/* Row 3: Phone & Employee ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Phone</label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Employee ID</label>
                  <input
                    type="text"
                    value={addForm.employeeId}
                    onChange={(e) => setAddForm({ ...addForm, employeeId: e.target.value })}
                    placeholder="Auto-generated if blank"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Row 4: Qualification & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Qualification</label>
                  <input
                    type="text"
                    value={addForm.qualification}
                    onChange={(e) => setAddForm({ ...addForm, qualification: e.target.value })}
                    placeholder="e.g. M.Sc Mathematics"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.experience}
                    onChange={(e) => setAddForm({ ...addForm, experience: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Row 5: Role & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Role</label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#173F35] focus:border-[#173F35] outline-none transition-all font-semibold cursor-pointer"
                  >
                    {getMergedRoleOptions(roles, addForm.role).map(r => (
                      <option key={r.code} value={r.code}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Password</label>
                  <input
                    type="text"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    placeholder="Default: Welcome@123"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Primary & Secondary Subject Expertise Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div>
                  <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">
                    Primary Subject (Main Expertise)
                  </label>
                  <select
                    value={addForm.primary_subject}
                    onChange={(e) => setAddForm({ ...addForm, primary_subject: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#93C5FD] outline-none font-semibold text-xs cursor-pointer"
                  >
                    <option value="">-- Select Primary Subject --</option>
                    {subjects.length > 0
                      ? subjects.map(s => <option key={s._id} value={s.name}>{s.name}</option>)
                      : ['Mathematics', 'Science', 'English', 'Hindi', 'Physics', 'Chemistry', 'Biology', 'Social Studies', 'History', 'Geography', 'Computer Science', 'Physical Education'].map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
                    Secondary Subject (Optional)
                  </label>
                  <select
                    value={addForm.secondary_subject}
                    onChange={(e) => setAddForm({ ...addForm, secondary_subject: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#93C5FD] outline-none font-semibold text-xs cursor-pointer"
                  >
                    <option value="">-- Select Secondary Subject --</option>
                    {subjects.length > 0
                      ? subjects.map(s => <option key={s._id} value={s.name}>{s.name}</option>)
                      : ['Mathematics', 'Science', 'English', 'Hindi', 'Physics', 'Chemistry', 'Biology', 'Social Studies', 'History', 'Geography', 'Computer Science', 'Physical Education'].map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))
                    }
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Create Login Account</label>
                    <p className="text-xs text-gray-500">Allow this teacher to login to the platform</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addForm.createLogin}
                      onChange={(e) => setAddForm({ ...addForm, createLogin: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#29456D]"></div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl text-gray-700 font-bold transition-all active:scale-95 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingFaculty}
                  className="flex-1 py-3 bg-[#29456D] hover:bg-[#172B4D] text-white font-bold shadow-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 text-center disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAddingFaculty ? <><span className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></span> Adding...</> : 'Add Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {isEditModalOpen && editingFaculty && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl p-8 w-full max-w-lg relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => { setIsEditModalOpen(false); setEditingFaculty(null); }}
              className="absolute top-6 right-6 text-gray-500 hover:text-gray-900 bg-gray-100 rounded-full p-1 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
              <Edit3 className="w-5 h-5 text-[#172B4D]" />
              <span>Edit Faculty Member — {editingFaculty.name}</span>
            </h3>

            <form onSubmit={handleEditTeacher} className="space-y-5 text-gray-900">
              {/* Row 1: First Name, Middle Name, Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName || ''}
                    onChange={(e) => {
                      const f = e.target.value;
                      setEditForm(prev => ({
                        ...prev,
                        firstName: f,
                        name: [f, prev.middleName, prev.lastName].filter(Boolean).join(' ')
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none text-xs transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Middle Name</label>
                  <input
                    type="text"
                    value={editForm.middleName || ''}
                    onChange={(e) => {
                      const m = e.target.value;
                      setEditForm(prev => ({
                        ...prev,
                        middleName: m,
                        name: [prev.firstName, m, prev.lastName].filter(Boolean).join(' ')
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none text-xs transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName || ''}
                    onChange={(e) => {
                      const l = e.target.value;
                      setEditForm(prev => ({
                        ...prev,
                        lastName: l,
                        name: [prev.firstName, prev.middleName, l].filter(Boolean).join(' ')
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none text-xs transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Qualification</label>
                  <input
                    type="text"
                    value={editForm.qualification}
                    onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.experience}
                    onChange={(e) => setEditForm({ ...editForm, experience: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Role</label>
                  <select
                    value={getMergedRoleOptions(roles, editForm.role).find(r => r.code.toLowerCase() === (editForm.role || '').toLowerCase())?.code || editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#173F35] focus:border-[#173F35] outline-none transition-all font-semibold cursor-pointer"
                  >
                    {getMergedRoleOptions(roles, editForm.role).map(r => (
                      <option key={r.code} value={r.code}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Primary & Secondary Subject Expertise Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div>
                  <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">
                    Primary Subject (Main Expertise)
                  </label>
                  <select
                    value={editForm.primary_subject || ''}
                    onChange={(e) => setEditForm({ ...editForm, primary_subject: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#93C5FD] outline-none font-semibold text-xs cursor-pointer"
                  >
                    <option value="">-- Select Primary Subject --</option>
                    {subjects.length > 0
                      ? subjects.map(s => <option key={s._id} value={s.name}>{s.name}</option>)
                      : ['Mathematics', 'Science', 'English', 'Hindi', 'Physics', 'Chemistry', 'Biology', 'Social Studies', 'History', 'Geography', 'Computer Science', 'Physical Education'].map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
                    Secondary Subject (Optional)
                  </label>
                  <select
                    value={editForm.secondary_subject || ''}
                    onChange={(e) => setEditForm({ ...editForm, secondary_subject: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#93C5FD] outline-none font-semibold text-xs cursor-pointer"
                  >
                    <option value="">-- Select Secondary Subject --</option>
                    {subjects.length > 0
                      ? subjects.map(s => <option key={s._id} value={s.name}>{s.name}</option>)
                      : ['Mathematics', 'Science', 'English', 'Hindi', 'Physics', 'Chemistry', 'Biology', 'Social Studies', 'History', 'Geography', 'Computer Science', 'Physical Education'].map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))
                    }
                  </select>
                </div>
              </div>

              {/* Account Password & Access Section */}
              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-700" />
                    <span>Account Password (Login Credential)</span>
                  </label>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-md border border-amber-200">
                    Visible & Editable
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editForm.password || ''}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Enter employee password..."
                    className="w-full pl-4 pr-11 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-700 hover:text-amber-950 p-1 cursor-pointer"
                    title={showEditPassword ? "Hide password" : "Show password"}
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-amber-800 font-medium">
                  Current Password: <code className="font-bold bg-amber-100/90 px-1.5 py-0.5 rounded text-amber-950 font-mono">{editForm.password || 'qelvora123'}</code> — You can view or change it here anytime.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <span className="block text-xs font-bold text-gray-700">Skip Face</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={editForm.skip_face} onChange={(e) => setEditForm({ ...editForm, skip_face: e.target.checked })} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <span className="block text-xs font-bold text-gray-700">Skip Location</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={editForm.skip_location} onChange={(e) => setEditForm({ ...editForm, skip_location: e.target.checked })} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <span className="block text-xs font-bold text-gray-700">Active</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingFaculty(null); }}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl text-gray-700 font-bold transition-all active:scale-95 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFaculty}
                  className="flex-1 py-3 bg-[#29456D] hover:bg-[#172B4D] text-white font-bold shadow-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 text-center disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingFaculty ? <><span className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></span> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      </>

      {/* Floating Save Changes Bar */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900/90 text-white px-6 py-4 rounded-2xl shadow-2xl border border-[#29456D]/20 backdrop-blur-md flex items-center gap-6 z-[100]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#29456D] rounded-full animate-pulse"></span>
            <span className="text-sm font-medium text-stone-300">You have unsaved changes</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEmployees(JSON.parse(JSON.stringify(originalEmployees)));
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-bold transition-all active:scale-95"
            >
              Discard
            </button>
            <button
              onClick={handleSaveAllChanges}
              disabled={isSavingBulk}
              className="px-5 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSavingBulk ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Saving...</> : <><SaveIcon className="w-4 h-4" /> Save All Changes</>}
            </button>
          </div>
        </div>
      )}

      {/* New Edit Single Cell Modal using Mappings */}
      {showEditCellModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden flex flex-col text-gray-900">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#172B4D]" />
                <span>{editCellEntryId ? 'Edit Timetable Slot' : 'Add Timetable Slot'}</span>
              </h3>
              <button
                onClick={() => setShowEditCellModal(false)}
                className="text-stone-400 hover:text-stone-800 text-xl font-bold transition-colors cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Target Entity Banner */}
              {selectedViewType === 'class' ? (() => {
                const selCls = classes.find(c => (c._id && c._id.toString() === selectedClassForGrid?.toString()) || (c.id && c.id.toString() === selectedClassForGrid?.toString()));
                const classMaps = mappings.filter(m => {
                  const cid = m.class?._id || m.class?.id || m.classId || m.class;
                  return (cid && cid.toString() === selectedClassForGrid?.toString()) ||
                    (selCls && m.standard && m.section &&
                     m.standard.toString().toLowerCase().trim() === selCls.standard.toString().toLowerCase().trim() &&
                     m.section.toString().toLowerCase().trim() === selCls.section.toString().toLowerCase().trim());
                });

                return (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Class Target:</p>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        {classMaps.length} Active Mappings
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-900 mt-0.5">
                      {selCls ? `Class ${selCls.standard} - ${selCls.section} (${selCls.board || 'CBSE'})` : 'Unknown Class'}
                      {selCls?.roomNumber ? ` • Room ${selCls.roomNumber}` : ''}
                    </p>
                  </div>
                );
              })() : (() => {
                const selTeach = employees.find(t => (t._id && t._id.toString() === selectedTeacherForGrid?.toString()) || (t.id && t.id.toString() === selectedTeacherForGrid?.toString()));
                const teachMaps = mappings.filter(m => {
                  const tid = m.teacher?._id || m.teacher?.id || m.teacherId || m.teacher;
                  return (tid && tid.toString() === selectedTeacherForGrid?.toString()) ||
                    (selTeach && (m.teacherName?.toLowerCase().trim() === selTeach.name?.toLowerCase().trim() || m.teacher?.name?.toLowerCase().trim() === selTeach.name?.toLowerCase().trim()));
                });

                return (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Faculty Target:</p>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        {teachMaps.length} Active Assignments
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-900 mt-0.5">
                      {selTeach ? `${selTeach.name} (${selTeach.employeeId || 'FAC'})` : 'Unknown Faculty'}
                    </p>
                  </div>
                );
              })()}

              {/* Day & Period Info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Weekday:</p>
                  <p className="text-xs font-black text-slate-900">{editCellDay}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Period / Time:</p>
                  <p className="text-xs font-black text-[#172B4D]">
                    Period {editCellPeriod} ({calculatedPeriods.find(p => Number(p.period) === Number(editCellPeriod))?.timeSlot || '09:00-09:45'})
                  </p>
                </div>
              </div>

              {selectedViewType === 'class' ? (() => {
                const selCls = classes.find(c => (c._id && c._id.toString() === selectedClassForGrid?.toString()) || (c.id && c.id.toString() === selectedClassForGrid?.toString()));

                return (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Select Subject
                        </label>
                        <span className="text-[10px] text-slate-500">Auto-fills assigned educator</span>
                      </div>
                      <select
                        value={editCellSubjectId}
                        onChange={(e) => handleEditCellSubjectChange(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] text-slate-900 shadow-2xs cursor-pointer"
                      >
                        <option value="">-- Choose Subject --</option>
                        {subjects.map(s => {
                          const mapItem = mappings.find(m => {
                            const cid = m.class?._id || m.class?.id || m.classId || m.class;
                            const classMatch = (cid && cid.toString() === selectedClassForGrid.toString()) ||
                              (selCls && m.standard && m.section && m.standard.toLowerCase().trim() === selCls.standard.toLowerCase().trim() && m.section.toLowerCase().trim() === selCls.section.toLowerCase().trim());
                            const sid = m.subject?._id || m.subject?.id || m.subjectId || m.subject;
                            const subMatch = (sid && sid.toString() === (s._id || s.id).toString()) ||
                              (m.subjectName && m.subjectName.toLowerCase().trim() === s.name.toLowerCase().trim());
                            return classMatch && subMatch;
                          });
                          const assignedName = mapItem?.teacherName || mapItem?.teacher?.name;
                          return (
                            <option key={s._id || s.id} value={s._id || s.id}>
                              {s.name} {assignedName ? `★ [Assigned: ${assignedName}]` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Select Faculty
                        </label>
                        <span className="text-[10px] text-slate-500">Conflict-checked live</span>
                      </div>
                      <select
                        value={editCellTeacherId}
                        onChange={(e) => setEditCellTeacherId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] text-slate-900 shadow-2xs cursor-pointer"
                      >
                        <option value="">-- Choose Faculty --</option>
                        {employees.filter(emp => !emp.is_super_admin && !['admin', 'parent', 'student'].includes((emp.role || '').toLowerCase())).map(t => {
                          const isMapped = mappings.some(m => {
                            const cid = m.class?._id || m.class?.id || m.classId || m.class;
                            const classMatch = (cid && cid.toString() === selectedClassForGrid.toString()) ||
                              (selCls && m.standard && m.section && m.standard.toLowerCase().trim() === selCls.standard.toLowerCase().trim() && m.section.toLowerCase().trim() === selCls.section.toLowerCase().trim());
                            const tid = m.teacher?._id || m.teacher?.id || m.teacherId || m.teacher;
                            const teacherMatch = (tid && tid.toString() === (t._id || t.id).toString()) ||
                              (m.teacherName && m.teacherName.toLowerCase().trim() === t.name.toLowerCase().trim());
                            return classMatch && teacherMatch;
                          });
                          return (
                            <option key={t._id || t.id} value={t._id || t.id}>
                              {t.name} ({t.employeeId || 'FAC'}) {isMapped ? '★ [Mapped for this Class]' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </>
                );
              })() : (() => {
                const selTeach = employees.find(t => (t._id && t._id.toString() === selectedTeacherForGrid?.toString()) || (t.id && t.id.toString() === selectedTeacherForGrid?.toString()));

                return (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Select Class
                        </label>
                        <span className="text-[10px] text-slate-500">Auto-fills assigned subject</span>
                      </div>
                      <select
                        value={editCellClassId}
                        onChange={(e) => handleEditCellClassChange(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] text-slate-900 shadow-2xs cursor-pointer"
                      >
                        <option value="">-- Choose Class --</option>
                        {classes.map(c => {
                          const isMapped = mappings.some(m => {
                            const tid = m.teacher?._id || m.teacher?.id || m.teacherId || m.teacher;
                            const teacherMatch = (tid && tid.toString() === selectedTeacherForGrid.toString()) ||
                              (selTeach && (m.teacherName && m.teacherName.toLowerCase().trim() === selTeach.name.toLowerCase().trim()));
                            const cid = m.class?._id || m.class?.id || m.classId || m.class;
                            const classMatch = (cid && cid.toString() === (c._id || c.id).toString()) ||
                              (m.standard && m.section && m.standard.toLowerCase().trim() === c.standard.toLowerCase().trim() && m.section.toLowerCase().trim() === c.section.toLowerCase().trim());
                            return teacherMatch && classMatch;
                          });
                          return (
                            <option key={c._id || c.id} value={c._id || c.id}>
                              Class {c.standard} - {c.section} ({c.board || 'CBSE'}) {isMapped ? '★ [Assigned]' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Select Subject
                        </label>
                      </div>
                      <select
                        value={editCellSubjectId}
                        onChange={(e) => setEditCellSubjectId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] text-slate-900 shadow-2xs cursor-pointer"
                      >
                        <option value="">-- Choose Subject --</option>
                        {subjects.map(s => (
                          <option key={s._id || s.id} value={s._id || s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                );
              })()}

              {(() => {
                if (!editCellTeacherId) return null;
                const teacherConflict = weeklyTimetable.find(e => {
                  if (editCellEntryId && (e._id?.toString() === editCellEntryId.toString() || e.id?.toString() === editCellEntryId.toString())) return false;
                  const tid = e.teacherId || e.teacher?._id || e.teacher?.id || e.teacher;
                  const selTeacher = employees.find(t => (t._id && t._id.toString() === editCellTeacherId.toString()) || (t.id && t.id.toString() === editCellTeacherId.toString()));
                  const tidMatches = (tid && tid.toString() === editCellTeacherId.toString()) ||
                    (selTeacher && (
                      (e.teacherName && e.teacherName.toLowerCase().trim() === selTeacher.name.toLowerCase().trim()) ||
                      (typeof e.teacher === 'string' && e.teacher.toLowerCase().trim() === selTeacher.name.toLowerCase().trim()) ||
                      (e.teacher?.name && e.teacher.name.toLowerCase().trim() === selTeacher.name.toLowerCase().trim())
                    ));
                  return tidMatches && e.day === editCellDay && Number(e.period) === Number(editCellPeriod);
                });
                if (!teacherConflict) return null;
                const conflictClass = teacherConflict.class ? `Class ${teacherConflict.class.standard}-${teacherConflict.class.section}` : `${teacherConflict.standard}-${teacherConflict.section}`;
                return (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2 shadow-2xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Schedule Notice:</span> Educator is already scheduled in <strong>{conflictClass}</strong> on {editCellDay} Period {editCellPeriod}. You can still save to assign.
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-between items-center gap-3">
              {editCellEntryId ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowEditCellModal(false);
                    handleDeleteCell(editCellEntryId);
                  }}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Slot</span>
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditCellModal(false)}
                  className="px-4 py-2 border border-stone-250 text-stone-500 hover:bg-stone-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCell}
                  disabled={isSavingCell}
                  className="px-5 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white font-black text-xs rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSavingCell ? 'Saving...' : 'Save Slot'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── CREATE WEEKLY TIMETABLE MODAL (BULK BUILDER) ─── */}
      {showBulkCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-7xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-gray-900 animate-scaleUp">
            
            <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5">
                  <CalendarDays className="w-5 h-5 text-[#172B4D]" />
                  <span>Configure Teacher Timetable Matrix</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5 font-medium">Configure all weekly periods for a specific teacher.</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowBulkCreateModal(false)}
                className="text-stone-400 hover:text-stone-600 text-xl font-bold focus:outline-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div>
                <label className="block text-xs font-bold text-stone-505 uppercase mb-2">Select Teacher Name:</label>
                <select
                  value={bulkSelectedTeacherId}
                  onChange={(e) => handleBulkTeacherChange(e.target.value)}
                  className="w-full max-w-md bg-stone-50 border border-stone-250 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#29456D] text-stone-850 shadow-sm cursor-pointer"
                >
                  <option value="">-- Choose Teacher --</option>
                  {employees.filter(e => e.role === 'teacher' || e.role === 'user').map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.employeeId || 'N/A'})</option>
                  ))}
                </select>
              </div>

              {bulkSelectedTeacherId ? (
                <div className="overflow-x-auto border border-stone-200 rounded-2xl bg-stone-50/10">
                  <table className="min-w-full border-collapse font-bold text-xs">
                    <thead>
                      <tr className="bg-stone-100 border-b border-stone-250 text-stone-600 font-extrabold text-[10px] uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                        <th className="px-4 py-3 text-left border-r border-stone-200 bg-stone-105 sticky left-0 z-20">Day</th>
                        {calculatedPeriods.map((p, idx) => (
                          <th key={idx} className="px-4 py-2.5 text-center border-r border-stone-200 min-w-[140px] last:border-r-0">
                            <div className="font-extrabold text-[11px] text-stone-850">Period {p.period}</div>
                            <div className="text-[9px] text-stone-400 font-mono mt-0.5">{p.timeSlot}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => (
                        <tr key={idx} className="border-b border-stone-100 hover:bg-stone-50/40">
                          <td className="px-4 py-3 font-bold text-stone-700 bg-stone-100 border-r border-stone-200 sticky left-0 z-10">{day}</td>
                          {calculatedPeriods.map((p, pIdx) => {
                            const cellKey = `${day}-${p.period}`;
                            const currentCell = bulkGridState[cellKey] || { classId: '', subjectId: '' };

                            return (
                              <td key={pIdx} className="p-2 border-r border-stone-200 text-center align-middle">
                                <div className="flex flex-col gap-1 min-w-[120px]">
                                  <select
                                    value={currentCell.classId || ''}
                                    onChange={(e) => handleBulkCellChange(day, p.period, 'classId', e.target.value)}
                                    className="w-full text-[10px] bg-white border border-stone-200 rounded p-1 text-stone-850 font-bold focus:border-[#29456D] outline-none cursor-pointer"
                                  >
                                    <option value="">-- Class --</option>
                                    {classes.map(c => (
                                      <option key={c._id} value={c._id}>{c.standard}-{c.section} ({c.board})</option>
                                    ))}
                                  </select>
                                  <select
                                    value={currentCell.subjectId || ''}
                                    onChange={(e) => handleBulkCellChange(day, p.period, 'subjectId', e.target.value)}
                                    className="w-full text-[10px] bg-white border border-stone-200 rounded p-1 text-stone-850 font-bold focus:border-[#29456D] outline-none cursor-pointer"
                                  >
                                    <option value="">-- Subject --</option>
                                    {subjects.map(s => (
                                      <option key={s._id} value={s._id}>{s.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16 bg-stone-50 border border-dashed border-stone-200 rounded-2xl">
                  <p className="text-stone-400 text-xs italic">Please select a teacher from the dropdown above to load and create their weekly timetable schedule.</p>
                </div>
              )}
            </div>

            <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkCreateModal(false)}
                className="px-4 py-2 border border-stone-250 text-stone-500 hover:bg-stone-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBulkTimetable}
                disabled={isSavingBulkTimetable || !bulkSelectedTeacherId}
                className="px-5 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white font-black text-xs rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSavingBulkTimetable ? 'Saving...' : 'Save Weekly Timetable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT ATTENDANCE STATUS & TIMESTAMPS MODAL ── */}
      {showEditAttModal && editAttEmployee && editAttDayData && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#FFFFFF] rounded-2xl shadow-2xl border border-[#E4DED2] w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden transform transition-all">
            
            {/* Modal Header */}
            <div className="bg-[#FFFDF9] border-b border-[#E4DED2] px-5 py-3.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F3F0E8] text-[#173F35] flex items-center justify-center border border-[#E4DED2] shrink-0">
                  <Edit3 className="w-4 h-4 text-[#173F35]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#173F35]">
                    Edit Attendance Record
                  </h3>
                  <p className="text-[#777A76] text-[11px] font-medium">Modify status, entry/exit timestamps & reason</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditAttModal(false)}
                className="w-7 h-7 rounded-xl bg-[#F0E9DC] text-[#27332F] hover:bg-[#E5DED2] flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
              >
                <XIcon className="w-3.5 h-3.5 text-[#27332F]" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 min-h-0">
              {/* Target Employee Info Card */}
              <div className="bg-[#FCFBF8] p-3 rounded-xl border border-[#E4DED2] flex items-center justify-between shadow-2xs">
                <div>
                  <div className="font-bold text-[#173F35] text-xs sm:text-sm">{editAttEmployee.name}</div>
                  <div className="text-[11px] font-mono text-[#B89558] font-semibold mt-0.5">{editAttEmployee.employee_id || editAttEmployee.employeeId} • {editAttEmployee.department}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-[#27332F]">{editAttDayData.date}</div>
                  <div className="text-[10px] text-[#B89558] font-mono font-bold uppercase">{editAttDayData.day}</div>
                </div>
              </div>

              {/* Status Radio / Selector */}
              <div>
                <label className="block text-[11px] font-bold text-[#27332F] uppercase tracking-wider mb-1.5">New Attendance Status</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'Present', label: 'Present', class: 'border-[#173F35] bg-[#173F35] text-white' },
                    { key: 'Absent', label: 'Absent', class: 'border-rose-700 bg-rose-700 text-white' },
                    { key: 'Leave', label: 'Leave', class: 'border-[#B89558] bg-[#B89558] text-white' },
                    { key: 'Half Day', label: 'Half Day', class: 'border-blue-700 bg-blue-700 text-white' },
                    { key: 'Weekly Off', label: 'Weekly Off', class: 'border-[#555C56] bg-[#555C56] text-white' }
                  ].map(item => {
                    const isSelected = editAttStatus === item.key;
                    

  return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setEditAttStatus(item.key)}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                          isSelected ? `${item.class} shadow-xs ring-2 ring-[#C49A55]` : 'border-[#E4DED2] bg-[#FFFCF7] text-[#27332F] hover:bg-[#F0E9DC]'
                        }`}
                      >
                        <span>{item.label}</span>
                        {isSelected && <span className="text-xs font-extrabold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Class Entry & Exit Timestamps (FULLY EDITABLE) */}
              <div className="bg-[#FCFBF8] p-3 rounded-xl border border-[#E4DED2] space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#173F35] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#B89558]" />
                    <span>CLASS ENTRY & EXIT TIMESTAMPS</span>
                  </span>
                  <span className="text-[9px] bg-[#EDF4EF] text-[#386048] px-2 py-0.5 rounded-full font-bold border border-[#D7E7DA]">
                    Editable
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[#27332F] mb-1 flex items-center gap-1">
                      <LogInIcon className="w-3 h-3 text-[#173F35]" />
                      <span>Class Entry Time (Punch In)</span>
                    </label>
                    <input
                      type="time"
                      value={editAttPunchIn}
                      onChange={(e) => setEditAttPunchIn(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#E4DED2] focus:border-[#173F35] focus:ring-1 focus:ring-[#173F35] rounded-lg text-[#27332F] font-bold text-xs outline-none shadow-2xs cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#27332F] mb-1 flex items-center gap-1">
                      <LogOutIcon className="w-3 h-3 text-[#173F35]" />
                      <span>Class Exit Time (Punch Out)</span>
                    </label>
                    <input
                      type="time"
                      value={editAttPunchOut}
                      onChange={(e) => setEditAttPunchOut(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#E4DED2] focus:border-[#173F35] focus:ring-1 focus:ring-[#173F35] rounded-lg text-[#27332F] font-bold text-xs outline-none shadow-2xs cursor-pointer"
                    />
                  </div>
                </div>

                <div className="text-[10px] font-semibold text-[#27332F] bg-[#FFFFFF] p-2 rounded-lg border border-[#E4DED2] flex items-center justify-between shadow-2xs">
                  <span>Entry: <strong className="font-black text-[#173F35]">{editAttPunchIn || 'Not Set'}</strong></span>
                  <span>Exit: <strong className="font-black text-[#173F35]">{editAttPunchOut || 'Not Set'}</strong></span>
                </div>
              </div>

              {/* Reason for Change Input */}
              <div>
                <label className="block text-[11px] font-bold text-[#27332F] uppercase tracking-wider mb-1">
                  Reason for Modification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={editAttReason}
                  onChange={(e) => setEditAttReason(e.target.value)}
                  placeholder="Enter reason for modifying attendance (e.g. Medical Emergency, Official Duty)..."
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E4DED2] rounded-xl text-[#27332F] text-xs outline-none focus:ring-1 focus:ring-[#173F35] focus:border-[#173F35] transition-all resize-none"
                />
              </div>
            </div>

            {/* Fixed Modal Footer */}
            <div className="bg-[#FFFDF9] px-5 py-3 border-t border-[#E4DED2] flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowEditAttModal(false)}
                className="px-3.5 py-1.5 border border-[#E4DED2] bg-[#FFFCF7] text-[#27332F] hover:bg-[#F0E9DC] rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAttendanceStatus}
                disabled={isSavingAttStatus}
                className="px-4 py-1.5 bg-[#173F35] hover:bg-[#102F29] text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <SaveIcon className="w-3.5 h-3.5 text-white" />
                <span>{isSavingAttStatus ? 'Saving...' : 'Save Attendance'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Settings Save Success */}
      {showSaveSuccessModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm overflow-hidden text-center p-6 relative">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Configuration Saved Successfully
            </h3>
            <p className="text-xs text-slate-500 font-normal leading-relaxed mb-4">
              All institutional settings, branding parameters, operational timings, and security preferences have been updated live.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-5 text-left space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">School Name:</span>
                <span className="text-slate-900 font-semibold">{settings.schoolName || 'Qelvora School CRM'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Subtitle Tagline:</span>
                <span className="text-slate-900 font-semibold truncate max-w-[160px]">{settings.logoSubtext || 'Academy'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Primary Board:</span>
                <span className="text-[#172B4D] font-semibold">{settings.board || 'CBSE'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSaveSuccessModal(false)}
              className="w-full py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Done & Continue
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Role Save Success */}
      {showRoleSaveModal && savedRoleInfo && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm overflow-hidden text-center p-6 relative">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#172B4D] border border-blue-200 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 text-[#172B4D]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {savedRoleInfo.type === 'create' ? 'Role Created Successfully' : 'Role Updated Successfully'}
            </h3>
            <p className="text-xs text-slate-500 font-normal leading-relaxed mb-4">
              The role configuration is active in the database and linked to employee permission scopes.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-5 text-left space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Role Code:</span>
                <span className="text-slate-900 font-mono font-semibold">{savedRoleInfo.code}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Role Name:</span>
                <span className="text-slate-900 font-semibold">{savedRoleInfo.name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Admin Privilege:</span>
                <span className={savedRoleInfo.adminPriv ? 'text-[#172B4D] font-semibold' : 'text-slate-600 font-medium'}>
                  {savedRoleInfo.adminPriv ? 'Granted' : 'Standard'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Status:</span>
                <span className="text-emerald-700 font-semibold">
                  {savedRoleInfo.status}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowRoleSaveModal(false);
                setSavedRoleInfo(null);
              }}
              className="w-full py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Done & Continue
            </button>
          </div>
        </div>
      )}

      {/* Modal for Reset Password */}
      {showResetPasswordModal && resetPasswordEmp && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm overflow-hidden p-6 relative text-left">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold shadow-2xs">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Reset Employee Password
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">New password for {resetPasswordEmp.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setResetPasswordEmp(null);
                  setResetPasswordInput('');
                }}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between items-center text-slate-600 mb-1">
                  <span>Employee:</span>
                  <span className="text-slate-900 font-semibold">{resetPasswordEmp.name}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Target ID:</span>
                  <span className="text-slate-800 font-mono font-medium">{resetPasswordEmp.id}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium text-xs outline-none focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] shadow-2xs"
                  autoFocus
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setResetPasswordEmp(null);
                    setResetPasswordInput('');
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword || !resetPasswordInput}
                  className="flex-1 py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isResettingPassword ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Adding Curriculum Board */}
      {showAddBoardModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm overflow-hidden p-6 text-left relative">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Add Curriculum Board
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBoardModal(false)}
                className="text-slate-400 hover:text-slate-700 font-semibold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-slate-500 font-medium mb-3">
              Enter the name of the new curriculum board (e.g. CBSE, ICSE, STATE, IGCSE, IB).
            </p>

            <input
              type="text"
              value={newBoardInput}
              onChange={(e) => setNewBoardInput(e.target.value)}
              placeholder="e.g. IGCSE"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm outline-none focus:border-[#29456D] focus:ring-2 focus:ring-blue-600/10 mb-4 uppercase"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddBoardModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newBoardInput && newBoardInput.trim()) {
                    const trimmed = newBoardInput.trim().toUpperCase();
                    const currentList = settings.boardsList || ['CBSE', 'STATE', 'ICSE'];
                    if (currentList.includes(trimmed)) {
                      toast.error("Board already exists");
                      return;
                    }
                    const updatedList = [...currentList, trimmed];
                    setSettings({ ...settings, boardsList: updatedList, board: trimmed });
                    toast.success(`Board "${trimmed}" added! Click 'Save Changes' to persist.`);
                    setShowAddBoardModal(false);
                    setNewBoardInput('');
                  } else {
                    toast.error("Please enter a board name");
                  }
                }}
                className="flex-1 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
              >
                Add Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Students Modal */}
      {isBulkUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl relative overflow-y-auto max-h-[90vh] text-slate-900">
            <button
              type="button"
              onClick={() => {
                if (!isUploadingBulk) {
                  setIsBulkUploadModalOpen(false);
                  setBulkFile(null);
                  setBulkFilePreview([]);
                  setBulkClassBreakdown({});
                }
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full p-1.5 transition-colors cursor-pointer"
            >
              <XIcon className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#172B4D]">
                <Upload className="w-5 h-5 text-[#172B4D]" />
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
                    Includes columns for Admission No, Name, Standard, Section, Roll No, Gender, DOB, Parent Contact, and Address.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isDownloadingTemplate}
                    onClick={() => handleDownloadTemplateFile('xlsx')}
                    className="px-3 py-1.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDownloadingTemplate}
                    onClick={() => handleDownloadTemplateFile('csv')}
                    className="px-3 py-1.5 bg-white hover:bg-blue-100 text-[#172B4D] font-semibold text-xs rounded-xl border border-blue-300 shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                        ? 'bg-blue-50/70 border-[#29456D] text-[#172B4D] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="uploadScope"
                      checked={bulkUploadScope === 'auto'}
                      onChange={() => setBulkUploadScope('auto')}
                      className="mt-0.5 text-[#172B4D] focus:ring-[#93C5FD]"
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
                        ? 'bg-blue-50/70 border-[#29456D] text-[#172B4D] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="uploadScope"
                      checked={bulkUploadScope === 'specific'}
                      onChange={() => setBulkUploadScope('specific')}
                      className="mt-0.5 text-[#172B4D] focus:ring-[#93C5FD]"
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
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none cursor-pointer"
                      >
                        {(settings.standardsList || ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th']).map(std => (
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
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] outline-none"
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
                      : 'border-slate-300 hover:border-[#29456D] bg-slate-50/60 hover:bg-blue-50/20 cursor-pointer'
                  }`}
                  onClick={() => {
                    document.getElementById('bulk-student-file-input')?.click();
                  }}
                >
                  <input
                    id="bulk-student-file-input"
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
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#172B4D] flex items-center justify-center">
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

              {/* Class Breakdown Badge Summary */}
              {Object.keys(bulkClassBreakdown).length > 0 && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-[#172B4D]" />
                      <span>Class Strength Distribution in File:</span>
                    </span>
                    <span className="text-emerald-700 font-mono">
                      {Object.values(bulkClassBreakdown).reduce((a, b) => a + b, 0)} Total Students
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(bulkClassBreakdown).map(([clsKey, count]) => (
                      <span
                        key={clsKey}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs"
                      >
                        <span className="text-[#172B4D] font-bold">Class {clsKey}:</span>
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
                              {row['Student Name'] || row['name'] || row['Full Name'] || '—'}
                            </td>
                            <td className="px-3 py-1.5 text-slate-700">
                              {bulkUploadScope === 'specific' ? bulkTargetStandard : (row['Standard'] || row['class'] || '—')}
                            </td>
                            <td className="px-3 py-1.5 text-slate-700 font-bold">
                              {bulkUploadScope === 'specific' ? bulkTargetSection : (row['Section'] || row['section'] || 'A')}
                            </td>
                            <td className="px-3 py-1.5 font-mono text-slate-600">
                              {row['Roll Number'] || row['rollNumber'] || row['Roll No'] || '—'}
                            </td>
                            <td className="px-3 py-1.5 font-mono text-slate-600">
                              {row['Parent Phone'] || row['parentPhone'] || row['Mobile'] || '—'}
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
                  disabled={isUploadingBulk}
                  onClick={() => {
                    setIsBulkUploadModalOpen(false);
                    setBulkFile(null);
                    setBulkFilePreview([]);
                    setBulkClassBreakdown({});
                  }}
                  className="w-full sm:w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!bulkFile || isUploadingBulk}
                  onClick={handleExecuteBulkUpload}
                  className="w-full sm:w-2/3 py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUploadingBulk ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Uploading & Updating Strengths...</span>
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

      {/* Add / Edit Student Modal */}
      {(isAddStudentModalOpen || isEditStudentModalOpen) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl relative overflow-y-auto max-h-[90vh] text-slate-900">
            <button
              type="button"
              onClick={() => {
                setIsAddStudentModalOpen(false);
                setIsEditStudentModalOpen(false);
                setEditingStudent(null);
                setStudentFormErrors({});
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full p-1.5 transition-colors cursor-pointer"
            >
              <XIcon className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#172B4D]">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingStudent ? 'Edit Student Details' : 'Add New Student'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {editingStudent ? 'Modify student registration info' : 'Register a new student to school admissions'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveStudentSubmit} className="space-y-4">
              {/* Photo Upload & Preview */}
              <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="relative shrink-0">
                  {photoPreview || studentForm.photoUrl ? (
                    <img
                      src={photoPreview || studentForm.photoUrl}
                      alt="Student Preview"
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-300 shadow-xs"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 text-[#172B4D] font-extrabold text-xl flex items-center justify-center border border-blue-200">
                      {studentForm.name ? studentForm.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Student Photo (Optional)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">JPG, PNG or WEBP up to 5MB.</p>
                  <div className="flex items-center gap-3">
                    <label className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer transition-all flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>{photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                      <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    </label>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          setStudentForm(prev => ({ ...prev, photoUrl: '' }));
                        }}
                        className="text-xs text-rose-600 font-semibold hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 1: First Name, Middle Name, Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentForm.firstName}
                    onChange={(e) => {
                      const first = e.target.value;
                      setStudentForm(prev => ({
                        ...prev,
                        firstName: first,
                        name: [first, prev.middleName, prev.lastName].filter(Boolean).join(' ')
                      }));
                      if (studentFormErrors.firstName) setStudentFormErrors(prev => ({ ...prev, firstName: undefined }));
                    }}
                    placeholder="e.g. Aarav"
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-900 text-xs font-medium outline-none transition-all shadow-2xs ${
                      studentFormErrors.firstName ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-slate-300 focus:border-[#29456D] focus:ring-2 focus:ring-[#93C5FD]/20'
                    }`}
                  />
                  {studentFormErrors.firstName && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1">{studentFormErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={studentForm.middleName || ''}
                    onChange={(e) => {
                      const mid = e.target.value;
                      setStudentForm(prev => ({
                        ...prev,
                        middleName: mid,
                        name: [prev.firstName, mid, prev.lastName].filter(Boolean).join(' ')
                      }));
                    }}
                    placeholder="e.g. Kumar"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-medium outline-none focus:border-[#29456D] focus:ring-2 focus:ring-[#93C5FD]/20 transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentForm.lastName}
                    onChange={(e) => {
                      const last = e.target.value;
                      setStudentForm(prev => ({
                        ...prev,
                        lastName: last,
                        name: [prev.firstName, prev.middleName, last].filter(Boolean).join(' ')
                      }));
                      if (studentFormErrors.lastName) setStudentFormErrors(prev => ({ ...prev, lastName: undefined }));
                    }}
                    placeholder="e.g. Sharma"
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-900 text-xs font-medium outline-none transition-all shadow-2xs ${
                      studentFormErrors.lastName ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-slate-300 focus:border-[#29456D] focus:ring-2 focus:ring-[#93C5FD]/20'
                    }`}
                  />
                  {studentFormErrors.lastName && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1">{studentFormErrors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Admission Number & Date of Birth (DD/MM/YYYY) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Admission Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentForm.admissionNumber}
                    onChange={(e) => {
                      setStudentForm(prev => ({ ...prev, admissionNumber: e.target.value }));
                      if (studentFormErrors.admissionNumber) setStudentFormErrors(prev => ({ ...prev, admissionNumber: undefined }));
                    }}
                    placeholder="e.g. ADM-2026-001"
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-900 text-xs font-mono font-semibold outline-none transition-all shadow-2xs ${
                      studentFormErrors.admissionNumber ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-slate-300 focus:border-[#29456D] focus:ring-2 focus:ring-[#93C5FD]/20'
                    }`}
                  />
                  {studentFormErrors.admissionNumber && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1">{studentFormErrors.admissionNumber}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Date of Birth <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      DD/MM/YYYY
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={studentForm.dob}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 8) val = val.slice(0, 8);
                        let formatted = val;
                        if (val.length >= 5) {
                          formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
                        } else if (val.length >= 3) {
                          formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
                        }
                        setStudentForm(prev => ({ ...prev, dob: formatted }));
                        if (studentFormErrors.dob) setStudentFormErrors(prev => ({ ...prev, dob: undefined }));
                      }}
                      placeholder="DD/MM/YYYY (e.g. 15/08/2012)"
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-900 text-xs font-mono font-medium outline-none transition-all shadow-2xs ${
                        studentFormErrors.dob ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-slate-300 focus:border-[#29456D] focus:ring-2 focus:ring-[#93C5FD]/20'
                      }`}
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                  {studentFormErrors.dob ? (
                    <p className="text-[11px] text-rose-500 font-medium mt-1">{studentFormErrors.dob}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">Format: Day/Month/Year (e.g. 15/08/2012)</p>
                  )}
                </div>
              </div>

              {/* Row 3: Gender & Admission Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Gender
                  </label>
                  <select
                    value={studentForm.gender}
                    onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-medium outline-none focus:border-[#29456D] focus:ring-2 focus:ring-[#93C5FD]/20 cursor-pointer shadow-2xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Admission Date
                  </label>
                  <input
                    type="date"
                    value={studentForm.admissionDate}
                    onChange={(e) => setStudentForm({ ...studentForm, admissionDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-medium outline-none focus:border-[#29456D] focus:ring-2 focus:ring-[#93C5FD]/20 shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 4: Class Standard & Section (Shows all sections along with class) */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#172B4D]" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Class & Section Placement</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Current: <span className="font-bold text-[#172B4D]">Class {studentForm.standard} - Section {studentForm.section}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Class Standard with all configured sections shown directly in options */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Class Standard <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={studentForm.standard}
                      onChange={(e) => {
                        const newStd = e.target.value;
                        const secs = classStandardSectionsMap[newStd];
                        const newSec = (secs && secs.length > 0) ? secs[0] : (studentForm.section || 'A');
                        setStudentForm(prev => ({ ...prev, standard: newStd, section: newSec }));
                        if (studentFormErrors.standard) setStudentFormErrors(prev => ({ ...prev, standard: undefined }));
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-medium outline-none focus:border-[#29456D] focus:ring-2 focus:ring-[#93C5FD]/20 cursor-pointer shadow-2xs"
                    >
                      {availableStandards.map(std => {
                        const secs = classStandardSectionsMap[std];
                        const secLabel = (secs && secs.length > 0) ? ` (Sections: ${secs.join(', ')})` : '';
                        return (
                          <option key={std} value={std}>
                            Class {std}{secLabel}
                          </option>
                        );
                      })}
                      {!availableStandards.includes(studentForm.standard) && studentForm.standard && (
                        <option value={studentForm.standard}>
                          Class {studentForm.standard}
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Section selector showing sections available for selected class */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Section <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={studentForm.section}
                      onChange={(e) => {
                        setStudentForm(prev => ({ ...prev, section: e.target.value.toUpperCase() }));
                        if (studentFormErrors.section) setStudentFormErrors(prev => ({ ...prev, section: undefined }));
                      }}
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-900 text-xs font-bold uppercase outline-none transition-all shadow-2xs cursor-pointer ${
                        studentFormErrors.section ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-slate-300 focus:border-[#29456D] focus:ring-2 focus:ring-[#93C5FD]/20'
                      }`}
                    >
                      {availableSectionsForSelectedStandard.map(sec => (
                        <option key={sec} value={sec}>
                          Section {sec}
                        </option>
                      ))}
                      {!availableSectionsForSelectedStandard.includes(studentForm.section) && studentForm.section && (
                        <option value={studentForm.section}>Section {studentForm.section}</option>
                      )}
                    </select>
                    {studentFormErrors.section && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1">{studentFormErrors.section}</p>
                    )}
                  </div>

                  {/* Roll Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Roll Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={studentForm.rollNumber}
                      onChange={(e) => setStudentForm({ ...studentForm, rollNumber: e.target.value })}
                      placeholder="e.g. 101"
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-900 text-xs font-mono outline-none transition-all shadow-2xs ${
                        studentFormErrors.rollNumber ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-slate-300 focus:border-[#29456D] focus:ring-2 focus:ring-[#93C5FD]/20'
                      }`}
                    />
                    {studentFormErrors.rollNumber && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1">{studentFormErrors.rollNumber}</p>
                    )}
                  </div>
                </div>

                {/* Quick clickable section buttons for the selected class */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Sections in Class {studentForm.standard}:
                  </span>
                  {availableSectionsForSelectedStandard.map(sec => {
                    const isSelected = studentForm.section === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setStudentForm(prev => ({ ...prev, section: sec }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#29456D] text-white border-[#29456D] shadow-xs scale-105'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}
                      >
                        Section {sec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 5: Father's Name & Mother's Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Father's Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentForm.fatherName}
                    onChange={(e) => {
                      const fName = e.target.value;
                      setStudentForm(prev => ({
                        ...prev,
                        fatherName: fName,
                        parentName: [fName, prev.motherName].filter(Boolean).join(' / ')
                      }));
                      if (studentFormErrors.fatherName) setStudentFormErrors(prev => ({ ...prev, fatherName: undefined }));
                    }}
                    placeholder="e.g. Rajesh Sharma"
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-900 text-xs font-medium outline-none transition-all shadow-2xs ${
                      studentFormErrors.fatherName ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-slate-300 focus:border-[#29456D] focus:ring-2 focus:ring-[#93C5FD]/20'
                    }`}
                  />
                  {studentFormErrors.fatherName && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1">{studentFormErrors.fatherName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Mother's Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentForm.motherName}
                    onChange={(e) => {
                      const mName = e.target.value;
                      setStudentForm(prev => ({
                        ...prev,
                        motherName: mName,
                        parentName: [prev.fatherName, mName].filter(Boolean).join(' / ')
                      }));
                      if (studentFormErrors.motherName) setStudentFormErrors(prev => ({ ...prev, motherName: undefined }));
                    }}
                    placeholder="e.g. Sunita Sharma"
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-900 text-xs font-medium outline-none transition-all shadow-2xs ${
                      studentFormErrors.motherName ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-slate-300 focus:border-[#29456D] focus:ring-2 focus:ring-[#93C5FD]/20'
                    }`}
                  />
                  {studentFormErrors.motherName && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1">{studentFormErrors.motherName}</p>
                  )}
                </div>
              </div>

              {/* Row 6: Parent Phone & Parent Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Parent Phone Number <span className="text-rose-500">* (10 digits)</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={studentForm.parentPhone}
                    onChange={(e) => {
                      setStudentForm({ ...studentForm, parentPhone: e.target.value.replace(/\D/g, '') });
                      if (studentFormErrors.parentPhone) setStudentFormErrors(prev => ({ ...prev, parentPhone: undefined }));
                    }}
                    placeholder="e.g. 9876543210"
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-900 text-xs font-mono font-semibold outline-none transition-all shadow-2xs ${
                      studentFormErrors.parentPhone ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-slate-300 focus:border-[#29456D] focus:ring-2 focus:ring-[#93C5FD]/20'
                    }`}
                  />
                  {studentFormErrors.parentPhone && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1">{studentFormErrors.parentPhone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Parent Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={studentForm.parentEmail}
                    onChange={(e) => {
                      setStudentForm({ ...studentForm, parentEmail: e.target.value });
                      if (studentFormErrors.parentEmail) setStudentFormErrors(prev => ({ ...prev, parentEmail: undefined }));
                    }}
                    placeholder="e.g. parent@example.com"
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-900 text-xs font-medium outline-none transition-all shadow-2xs ${
                      studentFormErrors.parentEmail ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-slate-300 focus:border-[#29456D] focus:ring-2 focus:ring-[#93C5FD]/20'
                    }`}
                  />
                  {studentFormErrors.parentEmail && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1">{studentFormErrors.parentEmail}</p>
                  )}
                </div>
              </div>

              {/* Row 6: Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={studentForm.address}
                  onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                  placeholder="Residential address details..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-medium outline-none focus:border-[#29456D] focus:ring-2 focus:ring-[#93C5FD]/20 shadow-2xs resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddStudentModalOpen(false);
                    setIsEditStudentModalOpen(false);
                    setEditingStudent(null);
                    setStudentFormErrors({});
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStudent}
                  className="flex-1 py-3 bg-[#29456D] hover:bg-[#172B4D] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingStudent ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Saving Student...</>
                  ) : (
                    <span>{editingStudent ? 'Save Changes' : 'Save Student'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Student Profile Modal */}
      {isViewStudentModalOpen && viewingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-lg relative overflow-y-auto max-h-[90vh] text-slate-900">
            <button
              type="button"
              onClick={() => {
                setIsViewStudentModalOpen(false);
                setViewingStudent(null);
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full p-1.5 transition-colors cursor-pointer"
            >
              <XIcon className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
              {viewingStudent.photoUrl ? (
                <img
                  src={viewingStudent.photoUrl}
                  alt={viewingStudent.name}
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#29456D] shadow-md mb-3"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-100 text-[#172B4D] font-extrabold text-3xl flex items-center justify-center border-2 border-blue-200 shadow-md mb-3">
                  {viewingStudent.name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-900">{viewingStudent.name}</h3>
              <span className="mt-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#172B4D] border border-blue-200">
                Class {viewingStudent.standard} - Section {viewingStudent.section}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-medium block uppercase tracking-wider text-[10px]">Admission Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{viewingStudent.admissionNumber || viewingStudent.studentId || '—'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-medium block uppercase tracking-wider text-[10px]">Roll Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{viewingStudent.rollNumber || '—'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-medium block uppercase tracking-wider text-[10px]">Gender</span>
                <span className="font-bold text-slate-900">{viewingStudent.gender || 'Male'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-medium block uppercase tracking-wider text-[10px]">Date of Birth (DD/MM/YYYY)</span>
                <span className="font-bold text-slate-900">
                  {(() => {
                    if (!viewingStudent.dob) return '—';
                    if (/^\d{4}-\d{2}-\d{2}/.test(viewingStudent.dob)) {
                      const [y, m, d] = viewingStudent.dob.split('T')[0].split('-');
                      return `${d}/${m}/${y}`;
                    }
                    return viewingStudent.dob;
                  })()}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-medium block uppercase tracking-wider text-[10px]">Father's Name</span>
                <span className="font-bold text-slate-900">
                  {viewingStudent.fatherName || (viewingStudent.parentName?.includes(' / ') ? viewingStudent.parentName.split(' / ')[0] : viewingStudent.parentName) || '—'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-medium block uppercase tracking-wider text-[10px]">Mother's Name</span>
                <span className="font-bold text-slate-900">
                  {viewingStudent.motherName || (viewingStudent.parentName?.includes(' / ') ? viewingStudent.parentName.split(' / ')[1] : '') || '—'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-medium block uppercase tracking-wider text-[10px]">Parent Phone</span>
                <span className="font-mono font-bold text-slate-900">{viewingStudent.parentPhone || viewingStudent.phone || viewingStudent.parentContact || '—'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 sm:col-span-2">
                <span className="text-slate-400 font-medium block uppercase tracking-wider text-[10px]">Parent Email</span>
                <span className="font-bold text-slate-900">{viewingStudent.parentEmail || viewingStudent.email || '—'}</span>
              </div>
              <div className="bg-slate-[50] p-3 rounded-xl border border-slate-200 sm:col-span-2">
                <span className="text-slate-400 font-medium block uppercase tracking-wider text-[10px]">Address</span>
                <span className="font-medium text-slate-800">{viewingStudent.address || '—'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsViewStudentModalOpen(false);
                  handleOpenEditStudentModal(viewingStudent);
                }}
                className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#172B4D] border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Details</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsViewStudentModalOpen(false);
                  setViewingStudent(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Student Confirmation Modal */}
      {isDeleteStudentModalOpen && deletingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative text-slate-900">
            <button
              type="button"
              onClick={() => {
                setIsDeleteStudentModalOpen(false);
                setDeletingStudent(null);
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full p-1.5 transition-colors cursor-pointer"
            >
              <XIcon className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mb-4 shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">Remove Student Record</h3>
            <p className="text-xs text-slate-600 mb-6">
              Are you sure you want to remove this student?
              <br />
              <strong className="text-slate-900 mt-1 block font-bold">
                {deletingStudent.name} ({deletingStudent.admissionNumber || deletingStudent.studentId || 'N/A'})
              </strong>
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteStudentModalOpen(false);
                  setDeletingStudent(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingStudent}
                onClick={handleConfirmDeleteStudent}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingStudent ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Removing...</>
                ) : (
                  <span>Delete Student</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Class Confirmation Modal */}
      {isDeleteClassModalOpen && deletingClass && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative text-slate-900">
            <button
              type="button"
              onClick={() => {
                setIsDeleteClassModalOpen(false);
                setDeletingClass(null);
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full p-1.5 transition-colors cursor-pointer"
            >
              <XIcon className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mb-4 shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Class Record</h3>
            <p className="text-xs text-slate-600 mb-6">
              Are you sure you want to delete this class? This will remove the academic section mapping from the system.
              <br />
              <strong className="text-slate-900 mt-2 block font-bold text-sm bg-slate-50 p-3 rounded-xl border border-slate-200">
                Class {deletingClass.standard} - Section {deletingClass.section} ({deletingClass.board || 'CBSE'})
              </strong>
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteClassModalOpen(false);
                  setDeletingClass(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingClass}
                onClick={handleConfirmDeleteClass}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingClass ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Deleting...</>
                ) : (
                  <span>Delete Class</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
