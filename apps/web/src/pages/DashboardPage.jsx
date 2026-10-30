import { confirmModal } from '../context/ModalContext';
/**
 * Dashboard Page — Premium Responsive School & Faculty Management Dashboard.
 * Integrates dual-dashboard views:
 *   1. Teacher View: Today's school-wide timetable grid (classes as columns, periods as rows, highlighting their own periods in Green).
 *   2. Principal/HOD/Admin View: Classroom Live Operations Feed for the current active period (Green if active, Red if not, Golden if substitute assigned) and "Arrange Alternative" flow.
 * Fully responsive: uses glassmorphism panels, micro-animations, and gold/stone accents.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getTeacherDashboard, 
  getAdminDashboard, 
  requestLeave, 
  getLeaveRequests, 
  getSubstituteSuggestions, 
  approveLeave,
  classLogin,
  classLogout,
  createTeacherSchedule,
  assignSubstituteDirectly,
  getCompanySettings,
  getTimetables,
  getStudentMe,
  getClasses,
  getSubjects,
  createTimetableEntry,
  saveTeacherTimetableBulk,
  deleteTimetableEntry,
  getClassSessions,
  sendLateNotice
} from '../services/authService';
import Spinner from '../components/ui/Spinner';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/ui/Sidebar';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { 
  Building2, 
  UsersRound, 
  UserCheck, 
  UserX, 
  LogIn, 
  LogOut, 
  UserRoundCheck, 
  CalendarClock, 
  History as HistoryIcon, 
  RefreshCw, 
  Clock3, 
  ClipboardList, 
  ArrowRight, 
  Calendar, 
  FileText, 
  BookOpen, 
  GraduationCap, 
  School, 
  Video, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Search,
  Filter,
  Mail,
  Send,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronDown,
  List,
  LayoutGrid,
  X,
  Radio,
  Award
} from 'lucide-react';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getPeriodStatus = (timeSlot) => {
  if (!timeSlot) return 'upcoming';
  try {
    const [startStr, endStr] = timeSlot.split('-');
    const now = new Date();
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    const startTime = new Date();
    startTime.setHours(startH, startM, 0, 0);

    const endTime = new Date();
    endTime.setHours(endH, endM, 0, 0);

    if (now > endTime) return 'completed';
    if (now >= startTime && now <= endTime) return 'active';
    return 'upcoming';
  } catch {
    return 'upcoming';
  }
};

const DashboardPage = () => {
  const { user, selectedProfile, logout } = useAuth();
  const navigate = useNavigate();

  const roleLower = user?.role?.toLowerCase() || '';
  const isStudentOrParentRole = roleLower.includes('student') || roleLower.includes('parent');
  const isAdminRole = Boolean(
    user?.isAdmin ||
    roleLower.includes('admin') ||
    roleLower.includes('principal') ||
    roleLower.includes('director') ||
    roleLower.includes('controller') ||
    roleLower.includes('super')
  );
  const isTeacherRole = !isAdminRole && !isStudentOrParentRole && Boolean(
    roleLower.includes('teacher') ||
    roleLower.includes('educator') ||
    roleLower.includes('faculty') ||
    roleLower.includes('hod') ||
    roleLower.includes('head') ||
    roleLower.includes('coordinator') ||
    roleLower.includes('assistant')
  );

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Failed to log out');
    }
  };

  // Student Profile Dashboard states
  const [studentProfile, setStudentProfile] = useState(null);
  const [studentTimetable, setStudentTimetable] = useState([]);

  // Unified dashboard state
  const [loading, setLoading] = useState(true);
  const [teacherData, setTeacherData] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [schoolSettings, setSchoolSettings] = useState(null);
  const [calculatedPeriods, setCalculatedPeriods] = useState([]);

  // Leave Form State
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Timetable Scheduling Form State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedStandard, setSchedStandard] = useState('1st');
  const [schedSection, setSchedSection] = useState('A');
  const [schedBoard, setSchedBoard] = useState('CBSE');
  const [schedSubject, setSchedSubject] = useState('');
  const [schedPeriod, setSchedPeriod] = useState(1);
  const [schedTimeSlot, setSchedTimeSlot] = useState('09:00-09:45');
  const [schedDay, setSchedDay] = useState(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()] || 'Monday';
  });
  const [schedDate, setSchedDate] = useState('');
  const [schedType, setSchedType] = useState('auto'); // 'auto' or 'manual'
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // Substitute Allocation Modal State
  const [activeRequest, setActiveRequest] = useState(null); // LeaveRequest currently being reviewed
  const [suggestions, setSuggestions] = useState([]); // suggested substitutes per period
  const [allocations, setAllocations] = useState({}); // { periodEntryId: substituteTeacherId }
  const [allocSubjectNames, setAllocSubjectNames] = useState({}); // { periodEntryId: subjectName }
  const [activeWeeklyDay, setActiveWeeklyDay] = useState('Monday');
  const [activeTeacherWeeklyDay, setActiveTeacherWeeklyDay] = useState('Monday');
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isApprovingLeave, setIsApprovingLeave] = useState(false);
  const [manualClassId, setManualClassId] = useState('');
  const [manualPeriod, setManualPeriod] = useState(1);
  const [manualSubjectName, setManualSubjectName] = useState('');
  const [manualTeacherId, setManualTeacherId] = useState('');
  const [showManualAlternate, setShowManualAlternate] = useState(false);

  // Live grid coverage filters
  const [selectedStandard, setSelectedStandard] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Active monitor period selector
  const [monitorPeriod, setMonitorPeriod] = useState('current'); // 'current' or specific number string

  // Registered classes, mappings, and UI active card states
  const [allClasses, setAllClasses] = useState([]);
  const [allMappings, setAllMappings] = useState([]);
  const [activeCardId, setActiveCardId] = useState(null);
  const [activeCardModal, setActiveCardModal] = useState(null); // 'total_teachers', 'present_teachers', 'absent_teachers', 'logged_in_classes', 'missed_classes', 'substitute_arranged'
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  // Admin dashboard section tabs - Today's Running Classes is the default view
  const [activeAdminTab, setActiveAdminTab] = useState('runningClasses');
  const [weeklyExpandedTeacher, setWeeklyExpandedTeacher] = useState(null);
  const [adminTabSearch, setAdminTabSearch] = useState('');
  const [dashboardClassFilter, setDashboardClassFilter] = useState('All');
  const [dashboardDayFilter, setDashboardDayFilter] = useState('Today');

  // Today's Running Classes Live Monitor States
  const [classSessions, setClassSessions] = useState([]);
  const [runningClassesPunctualityFilter, setRunningClassesPunctualityFilter] = useState('All'); // 'All' | 'on-time' | 'yellow' | 'orange' | 'red' | 'vacant' | 'substitute'
  const [selectedRunningClasses, setSelectedRunningClasses] = useState([]); // array of class standard-section strings e.g. ['10th-A'], empty = all
  const [runningClassesPeriodFilter, setRunningClassesPeriodFilter] = useState('current'); // 'current' or period number
  const [runningClassesViewMode, setRunningClassesViewMode] = useState('cards'); // 'cards' | 'table'
  const [showLateNoticeModal, setShowLateNoticeModal] = useState(false);
  const [selectedLateSession, setSelectedLateSession] = useState(null);
  const [lateNoticeSubject, setLateNoticeSubject] = useState('');
  const [lateNoticeMessage, setLateNoticeMessage] = useState('');
  const [isSendingLateNotice, setIsSendingLateNotice] = useState(false);

  // Teacher dashboard tab and schedule states
  const [activeTeacherTab, setActiveTeacherTab] = useState('todayTimetable');
  const [myWeeklyTimetable, setMyWeeklyTimetable] = useState([]);
  const [schedTeacherId, setSchedTeacherId] = useState('');

  // Timetable Grid Editor states
  const [allSubjects, setAllSubjects] = useState([]);
  const [selectedViewType, setSelectedViewType] = useState('class'); // 'class' or 'teacher'
  const [selectedClassForGrid, setSelectedClassForGrid] = useState('');
  const [selectedTeacherForGrid, setSelectedTeacherForGrid] = useState('');
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [bulkSelectedTeacherId, setBulkSelectedTeacherId] = useState('');
  const [bulkGridState, setBulkGridState] = useState({});
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // Cell Editor states
  const [showEditCellModal, setShowEditCellModal] = useState(false);
  const [editCellDay, setEditCellDay] = useState('');
  const [editCellPeriod, setEditCellPeriod] = useState(1);
  const [editCellClassId, setEditCellClassId] = useState('');
  const [editCellSubjectId, setEditCellSubjectId] = useState('');
  const [editCellTeacherId, setEditCellTeacherId] = useState('');
  const [editCellEntryId, setEditCellEntryId] = useState('');
  const [isSavingCell, setIsSavingCell] = useState(false);

  // Dynamic time slot calculation helper (replicates backend logic)
  const calculateTimeSlots = (settings) => {
    const startStr = settings?.office_start_time || settings?.timings?.start || '09:00';
    const endStr = settings?.office_end_time || settings?.timings?.end || '16:00';
    const periodMins = settings?.period_duration_mins || 45;
    
    const smallBreakStart = settings?.small_break_start || '10:30';
    const smallBreakMins = settings?.small_break_mins || 15;
    
    const lunchBreakStart = settings?.lunch_break_start || '12:00';
    const lunchBreakMins = settings?.lunch_break_mins || 45;

    const timeToMins = (str) => {
      if (!str) return 0;
      const [h, m] = str.split(':').map(Number);
      return h * 60 + m;
    };

    const minsToTime = (m) => {
      const h = Math.floor(m / 60) % 24;
      const mins = m % 60;
      return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const startMins = timeToMins(startStr);
    const endMins = timeToMins(endStr);
    const smallStartMins = timeToMins(smallBreakStart);
    const smallEndMins = smallStartMins + smallBreakMins;
    const lunchStartMins = timeToMins(lunchBreakStart);
    const lunchEndMins = lunchStartMins + lunchBreakMins;

    const periods = [];
    let currentMins = startMins;
    let periodIndex = 1;

    while (currentMins + periodMins <= endMins) {
      if (currentMins >= smallStartMins && currentMins < smallEndMins) {
        currentMins = smallEndMins;
        continue;
      }
      if (currentMins < smallStartMins && currentMins + periodMins > smallStartMins) {
        currentMins = smallEndMins;
        continue;
      }

      if (currentMins >= lunchStartMins && currentMins < lunchEndMins) {
        currentMins = lunchEndMins;
        continue;
      }
      if (currentMins < lunchStartMins && currentMins + periodMins > lunchStartMins) {
        currentMins = lunchEndMins;
        continue;
      }

      const slotStart = currentMins;
      const slotEnd = currentMins + periodMins;
      
      periods.push({
        period: periodIndex,
        start: minsToTime(slotStart),
        end: minsToTime(slotEnd),
        timeSlot: `${minsToTime(slotStart)}-${minsToTime(slotEnd)}`
      });

      periodIndex++;
      currentMins = slotEnd;
    }

    return periods;
  };

  const getLocalDateString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().split('T')[0];
  };

  // Helper to resolve teacher and subject info for a registered class
  const resolveClassInfo = useCallback((clsId) => {
    const mapping = allMappings.find(m => 
      (m.class?._id || m.class)?.toString() === clsId.toString()
    );
    
    if (mapping) {
      return {
        teacher: mapping.teacher?.name || 'Not Assigned',
        teacherId: mapping.teacher?._id,
        subject: mapping.subject?.name || 'Not Assigned',
        subjectId: mapping.subject?._id
      };
    }
    
    const cls = allClasses.find(c => c._id.toString() === clsId.toString());
    return {
      teacher: cls?.classTeacher?.name || 'Not Assigned',
      teacherId: cls?.classTeacher?._id,
      subject: 'Not Assigned',
      subjectId: null
    };
  }, [allMappings, allClasses]);

  // Fetch Teacher data
  const fetchTeacherData = useCallback(async () => {
    try {
      const res = await getTeacherDashboard();
      if (res?.status && res.data) {
        setTeacherData(res.data);
        if (res.data.notifications) {
          setNotifications(res.data.notifications);
        }
        if (res.data.allClasses) {
          setAllClasses(res.data.allClasses);
        }
        if (res.data.allMappings) {
          setAllMappings(res.data.allMappings);
        }
        if (res.data.teacherId) {
          const weeklyRes = await getTimetables({ teacherId: res.data.teacherId });
          if (weeklyRes?.status && Array.isArray(weeklyRes.data)) {
            setMyWeeklyTimetable(weeklyRes.data);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch teacher dashboard:', err);
    }
  }, []);

  // Fetch Admin / Principal data
  const fetchAdminData = useCallback(async () => {
    try {
      const [dashRes, leavesRes, subjectsRes, timetablesRes, classesRes, sessionsRes] = await Promise.all([
        getAdminDashboard(),
        getLeaveRequests(),
        getSubjects().catch(() => ({ status: false, data: [] })),
        getTimetables().catch(() => ({ status: false, data: [] })),
        getClasses().catch(() => ({ status: false, data: [] })),
        getClassSessions().catch(() => ({ status: false, data: [] }))
      ]);

      if (sessionsRes?.data && Array.isArray(sessionsRes.data)) {
        setClassSessions(sessionsRes.data);
      }

      if (subjectsRes?.status && Array.isArray(subjectsRes.data)) {
        setAllSubjects(subjectsRes.data);
      }

      if (classesRes?.status && Array.isArray(classesRes.data) && classesRes.data.length > 0) {
        setAllClasses(classesRes.data);
      }

      if (dashRes?.status && dashRes.data) {
        const liveWeekly = (timetablesRes?.status && Array.isArray(timetablesRes.data) && timetablesRes.data.length > 0)
          ? timetablesRes.data
          : (dashRes.data.weeklyTimetable || []);

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayDay = days[new Date().getDay()] || 'Wednesday';
        let todaySlots = liveWeekly.filter(e => e.day === todayDay);
        if (todaySlots.length === 0 && liveWeekly.length > 0) {
          todaySlots = liveWeekly.filter(e => e.day === 'Monday');
          if (todaySlots.length === 0) todaySlots = liveWeekly.slice(0, 30);
        }

        const resolvedClasses = (classesRes?.status && Array.isArray(classesRes.data) && classesRes.data.length > 0)
          ? classesRes.data
          : (dashRes.data.allClasses || []);

        const mergedAdminData = {
          ...dashRes.data,
          allClasses: resolvedClasses,
          weeklyTimetable: liveWeekly,
          allTodayPeriods: (dashRes.data.allTodayPeriods && dashRes.data.allTodayPeriods.length > 0) ? dashRes.data.allTodayPeriods : todaySlots
        };

        setAdminData(mergedAdminData);
        if (resolvedClasses.length > 0) {
          setAllClasses(resolvedClasses);
          setSelectedClassForGrid(prev => prev || resolvedClasses[0]._id || resolvedClasses[0].id);
        }
        if (dashRes.data.allMappings) {
          setAllMappings(dashRes.data.allMappings);
        }
        if (dashRes.data.allTeachers && dashRes.data.allTeachers.length > 0) {
          setSchedTeacherId(prev => prev || dashRes.data.allTeachers[0]._id || dashRes.data.allTeachers[0].id);
          setSelectedTeacherForGrid(prev => prev || dashRes.data.allTeachers[0]._id || dashRes.data.allTeachers[0].id);
        }
      }
      if (leavesRes?.status && leavesRes.data) {
        setLeaveRequests(leavesRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin dashboard:', err);
    }
  }, []);

  // Main fetch loop
  const refreshDashboard = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    
    try {
      const promises = [
        getCompanySettings().then(res => {
          if (res?.status && res.data) {
            setSchoolSettings(res.data);
            const slots = calculateTimeSlots(res.data);
            setCalculatedPeriods(slots);
            if (res.data.board) {
              setSchedBoard(res.data.board);
            }
          }
        }).catch(e => console.error('Settings load error:', e))
      ];

      const roleLower = user?.role?.toLowerCase() || '';
      const isStudentOrParentRole = roleLower.includes('student') || roleLower.includes('parent');
      const isAdminRole = Boolean(
        user?.isAdmin ||
        roleLower.includes('admin') ||
        roleLower.includes('principal') ||
        roleLower.includes('director') ||
        roleLower.includes('controller') ||
        roleLower.includes('super')
      );
      const isTeacherRole = !isAdminRole && !isStudentOrParentRole && Boolean(
        roleLower.includes('teacher') ||
        roleLower.includes('educator') ||
        roleLower.includes('faculty') ||
        roleLower.includes('hod') ||
        roleLower.includes('head') ||
        roleLower.includes('coordinator') ||
        roleLower.includes('assistant')
      );

      if (isAdminRole) {
        promises.push(fetchAdminData());
      } else if (isTeacherRole) {
        promises.push(fetchTeacherData());
      }

      if (roleLower === 'student' || roleLower === 'parent') {
        try {
          const studentMeRes = await getStudentMe();
          if (studentMeRes?.status && studentMeRes.data) {
            setStudentProfile(studentMeRes.data);
            const classesRes = await getClasses();
            if (classesRes?.status && Array.isArray(classesRes.data)) {
              const matchedCls = classesRes.data.find(c => 
                c.standard === studentMeRes.data.standard && 
                c.section === studentMeRes.data.section
              );
              if (matchedCls) {
                const ttRes = await getTimetables({ classId: matchedCls._id });
                if (ttRes?.status && Array.isArray(ttRes.data)) {
                  setStudentTimetable(ttRes.data);
                }
              }
            }
          }
        } catch (stdErr) {
          console.error('Failed to load student profile/timetable:', stdErr.message);
        }
      }

      await Promise.all(promises);
    } catch (err) {
      console.error('Dashboard refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, fetchTeacherData, fetchAdminData]);

  useEffect(() => {
    refreshDashboard(true);
    const timer = setInterval(() => refreshDashboard(false), 45000);
    const handleSettingsUpdate = () => {
      getCompanySettings().then(res => {
        if (res?.data) {
          setSchoolSettings(res.data);
          const slots = calculateTimeSlots(res.data);
          setCalculatedPeriods(slots);
        }
      }).catch(() => {});
    };
    window.addEventListener('schoolSettingsUpdated', handleSettingsUpdate);
    return () => {
      clearInterval(timer);
      window.removeEventListener('schoolSettingsUpdated', handleSettingsUpdate);
    };
  }, [refreshDashboard]);

  // Real-time Socket.IO Connection
  useEffect(() => {
    if (!user?._id) return;
    let socketUrl = import.meta.env.VITE_GATEWAY_URL || import.meta.env.VITE_API_URL || '/api';
    if (
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      (socketUrl === '/api' || socketUrl.startsWith('/api'))
    ) {
      socketUrl = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8010';
    } else if (!socketUrl.startsWith('http')) {
      socketUrl = window.location.origin;
    }
    const socket = io(socketUrl);

    socket.emit('register_user', user._id);

    socket.on('new_notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      const msg = notif.message || '';
      if (msg.startsWith('Leave Request:')) {
        toast.success(`📋 ${msg}`, { duration: 8000 });
      } else if (msg.includes('leave request') && (msg.includes('Approved') || msg.includes('Rejected'))) {
        if (msg.includes('Approved')) {
          toast.success(`✅ Leave Approved: ${msg}`, { duration: 10000 });
        } else {
          toast.error(`❌ Leave Rejected: ${msg}`, { duration: 10000 });
        }
      } else {
        toast.success(`📢 New Assignment: ${msg}`, { duration: 6000 });
      }
      refreshDashboard(false);
    });

    socket.on('class_session_update', (data) => {
      console.log('Received class_session_update via socket:', data);
      refreshDashboard(false);
    });

    socket.on('timetable_update', (data) => {
      console.log('Received timetable_update via socket:', data);
      refreshDashboard(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, refreshDashboard]);

  // Handle class start/check-in
  const handleClassLogin = async (classId, period, subjectId) => {
    const toastId = toast.loading('Acquiring location for class login...');
    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };

          try {
            const res = await classLogin(classId, period, subjectId, location);
            if (res.status) {
              toast.success('Successfully logged into class!', { id: toastId });
              refreshDashboard(false);
            } else {
              toast.error(res.message || 'Class login failed.', { id: toastId });
            }
          } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Class login failed.', { id: toastId });
          }
        },
        (error) => {
          toast.error('Failed to get your location. Please check GPS settings.', { id: toastId });
        },
        { timeout: 6000 }
      );
    } catch (err) {
      toast.error('Error initiating class login.', { id: toastId });
    }
  };

  // Handle class end/logout
  const handleClassLogout = async (classId, period) => {
    const toastId = toast.loading('Acquiring location for class logout...');
    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };

          try {
            const res = await classLogout(classId, period, location);
            if (res.status) {
              toast.success('Successfully logged out from class!', { id: toastId });
              refreshDashboard(false);
            } else {
              toast.error(res.message || 'Class logout failed.', { id: toastId });
            }
          } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Class logout failed.', { id: toastId });
          }
        },
        (error) => {
          toast.error('Failed to get your location. Please check GPS settings.', { id: toastId });
        },
        { timeout: 6000 }
      );
    } catch (err) {
      toast.error('Error initiating class logout.', { id: toastId });
    }
  };

  // Handle Leave Submission
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!leaveDate) {
      toast.error('Please select a leave date.');
      return;
    }
    if (!leaveReason.trim()) {
      toast.error('Please enter a reason.');
      return;
    }

    setIsSubmittingLeave(true);
    try {
      const res = await requestLeave(leaveDate, leaveReason.trim());
      if (res?.status) {
        toast.success('Leave request submitted successfully!');
        setLeaveDate('');
        setLeaveReason('');
        refreshDashboard(false);
      } else {
        toast.error(res?.message || 'Failed to submit leave.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting leave.');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Direct substitute teacher allocation dialog triggers
  const handleArrangeSubstituteDirect = (teacherId, teacherName, date, periodEntryId) => {
    const mockReq = {
      isDirect: true,
      teacher: { _id: teacherId, name: teacherName },
      leaveDate: date || getLocalDateString(),
      reason: 'Direct Alternate Teacher Arrangement'
    };
    handleReviewLeave(mockReq);
  };

  // Open substitute selection modal for a specific leave request / direct arrangement
  const handleReviewLeave = async (req) => {
    setActiveRequest(req);
    setLoadingSuggestions(true);
    setAllocations({});
    setAllocSubjectNames({});
    setManualClassId('');
    setManualPeriod(1);
    setManualSubjectName('');
    setManualTeacherId('');
    setShowManualAlternate(false);
    try {
      const teacherId = req.teacher?._id || req.teacher?.id || req.teacherId || (typeof req.teacher === 'string' ? req.teacher : '');
      const res = await getSubstituteSuggestions(teacherId, req.leaveDate);
      if (res?.status && Array.isArray(res.data)) {
        setSuggestions(res.data);
        const initialAllocations = {};
        const initialSubjectNames = {};
        res.data.forEach(period => {
          if (period.candidates && period.candidates.length > 0) {
            initialAllocations[period.periodEntryId] = period.candidates[0].teacherId;
          }
          initialSubjectNames[period.periodEntryId] = period.subject || '';
        });
        setAllocations(initialAllocations);
        setAllocSubjectNames(initialSubjectNames);
      }
    } catch (err) {
      toast.error('Failed to load substitute suggestions.');
      console.error(err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Handle Leave Approval
  const handleApproveLeave = async (status) => {
    if (!activeRequest) return;
    setIsApprovingLeave(true);
    try {
      const substituteAllocations = Object.entries(allocations)
        .filter(([_, substituteTeacherId]) => substituteTeacherId && substituteTeacherId !== 'undefined' && substituteTeacherId !== 'null')
        .map(([periodEntryId, substituteTeacherId]) => ({
          periodEntryId,
          substituteTeacherId,
          subjectName: allocSubjectNames[periodEntryId] || ''
        }));

      if (status === 'Approved' && substituteAllocations.length === 0 && suggestions.some(s => s.candidates.length > 0)) {
        toast.error('Please select at least one substitute teacher.');
        setIsApprovingLeave(false);
        return;
      }

      const res = await approveLeave(activeRequest._id, status, substituteAllocations);
      if (res?.status) {
        toast.success(`Leave request ${status.toLowerCase()}!`);
        setActiveRequest(null);
        refreshDashboard(true);
      } else {
        toast.error(res?.message || 'Failed to process request.');
      }
    } catch (err) {
      toast.error('Error processing leave request.');
      console.error(err);
    } finally {
      setIsApprovingLeave(false);
    }
  };

  // Save Direct Substitute
  const handleSaveDirectSubstitute = async () => {
    if (!activeRequest) return;
    setIsApprovingLeave(true);
    try {
      let substituteAllocations = [];
      if (suggestions.length === 0 || showManualAlternate) {
        if (!manualClassId) {
          toast.error('Please select a class.');
          setIsApprovingLeave(false);
          return;
        }
        if (!manualTeacherId) {
          toast.error('Please select an arrange teacher.');
          setIsApprovingLeave(false);
          return;
        }
        substituteAllocations = [{
          classId: manualClassId,
          period: Number(manualPeriod),
          substituteTeacherId: manualTeacherId,
          subjectName: manualSubjectName || ''
        }];
      } else {
        substituteAllocations = Object.entries(allocations)
          .filter(([_, substituteTeacherId]) => substituteTeacherId && substituteTeacherId !== 'undefined' && substituteTeacherId !== 'null')
          .map(([periodEntryId, substituteTeacherId]) => ({
            periodEntryId,
            substituteTeacherId,
            subjectName: allocSubjectNames[periodEntryId] || ''
          }));

        if (substituteAllocations.length === 0) {
          toast.error('Please select a substitute teacher.');
          setIsApprovingLeave(false);
          return;
        }
      }

      const res = await assignSubstituteDirectly({
        teacherId: activeRequest.teacher._id,
        date: activeRequest.leaveDate,
        substituteAllocations
      });
      
      if (res?.status) {
        toast.success('Substitute teacher arranged successfully!');
        setActiveRequest(null);
        refreshDashboard(true);
      } else {
        toast.error(res?.message || 'Failed to arrange substitute.');
      }
    } catch (err) {
      toast.error('Error arranging substitute teacher.');
      console.error(err);
    } finally {
      setIsApprovingLeave(false);
    }
  };

  const handleOpenBulkCreateModal = async (teacherId) => {
    setBulkSelectedTeacherId(teacherId || '');
    setBulkGridState({});
    if (!teacherId) {
      setShowBulkCreateModal(true);
      return;
    }
    
    try {
      const res = await getTimetables({ teacherId });
      const initialGrid = {};
      if (res?.status && res.data) {
        res.data.forEach(entry => {
          if (entry.class && entry.subject) {
            const cId = entry.class._id || entry.class;
            const sId = entry.subject._id || entry.subject;
            initialGrid[`${entry.day}-${entry.period}`] = { classId: cId, subjectId: sId };
          }
        });
      }
      setBulkGridState(initialGrid);
      setShowBulkCreateModal(true);
    } catch (err) {
      toast.error('Failed to load teacher timetable');
    }
  };

  const handleBulkTeacherChange = async (tid) => {
    setBulkSelectedTeacherId(tid);
    setBulkGridState({});
    if (!tid) return;
    try {
      const res = await getTimetables({ teacherId: tid });
      const initialGrid = {};
      if (res?.status && res.data) {
        res.data.forEach(entry => {
          if (entry.class && entry.subject) {
            const cId = entry.class._id || entry.class;
            const sId = entry.subject._id || entry.subject;
            initialGrid[`${entry.day}-${entry.period}`] = { classId: cId, subjectId: sId };
          }
        });
      }
      setBulkGridState(initialGrid);
    } catch (err) {
      toast.error('Failed to load teacher timetable');
    }
  };

  const handleBulkCellChange = (day, period, field, value) => {
    const key = `${day}-${period}`;
    setBulkGridState(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { classId: '', subjectId: '' }),
        [field]: value
      }
    }));
  };

  const handleSaveBulkTimetable = async () => {
    if (!bulkSelectedTeacherId) {
      toast.error('Please select a teacher first');
      return;
    }
    
    setIsSavingBulk(true);
    try {
      const slots = [];
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      const periodsToMap = (calculatedPeriods && calculatedPeriods.length > 0)
        ? calculatedPeriods
        : [1, 2, 3, 4, 5, 6].map(num => ({ period: num, timeSlot: `${8+num}:30-${9+num}:30` }));

      days.forEach(day => {
        periodsToMap.forEach(p => {
          const key = `${day}-${p.period}`;
          const cell = bulkGridState[key];
          if (cell && cell.classId && cell.subjectId) {
            slots.push({
              day,
              period: p.period,
              timeSlot: p.timeSlot,
              classId: cell.classId,
              subjectId: cell.subjectId
            });
          }
        });
      });

      const res = await saveTeacherTimetableBulk(bulkSelectedTeacherId, slots);
      if (res?.status) {
        toast.success('Weekly timetable created successfully!');
        setShowBulkCreateModal(false);
        refreshDashboard(true);
      } else {
        toast.error(res?.message || 'Failed to save timetable');
      }
    } catch (err) {
      toast.error('Error saving weekly timetable');
      console.error(err);
    } finally {
      setIsSavingBulk(false);
    }
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
        setEditCellEntryId(entry._id);
        setEditCellSubjectId(entry.subject?._id || entry.subject || '');
        setEditCellTeacherId(entry.teacher?._id || entry.teacher || '');
      } else {
        setEditCellEntryId('');
        setEditCellSubjectId('');
        setEditCellTeacherId('');
      }
    } else {
      setEditCellTeacherId(selectedTeacherForGrid);
      if (entry) {
        setEditCellEntryId(entry._id);
        setEditCellClassId(entry.class?._id || entry.class || '');
        setEditCellSubjectId(entry.subject?._id || entry.subject || '');
      } else {
        setEditCellEntryId('');
        setEditCellClassId('');
        setEditCellSubjectId('');
      }
    }
    setShowEditCellModal(true);
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

    setIsSavingCell(true);
    try {
      const pInfo = calculatedPeriods.find(p => p.period === editCellPeriod) || { timeSlot: '09:00-09:45' };
      const payload = {
        classId: editCellClassId,
        day: editCellDay,
        period: editCellPeriod,
        timeSlot: pInfo.timeSlot,
        teacherId: editCellTeacherId,
        subjectId: editCellSubjectId
      };

      const res = await createTimetableEntry(payload);
      if (res?.status) {
        toast.success('Timetable slot saved successfully!');
        setShowEditCellModal(false);
        refreshDashboard(true);
      } else {
        toast.error(res?.message || 'Failed to save timetable slot');
      }
    } catch (err) {
      toast.error('Error saving timetable slot');
      console.error(err);
    } finally {
      setIsSavingCell(false);
    }
  };

  const handleDeleteCell = async (entryId) => {
    if (!(await confirmModal({ title: 'Delete Timetable Slot', message: 'Are you sure you want to delete this timetable slot?', type: 'danger', confirmText: 'Delete Slot' }))) return;
    try {
      const res = await deleteTimetableEntry(entryId);
      if (res?.status) {
        toast.success('Slot deleted successfully!');
        refreshDashboard(true);
      } else {
        toast.error(res?.message || 'Failed to delete slot');
      }
    } catch (err) {
      toast.error('Error deleting slot');
      console.error(err);
    }
  };

  const handleOpenLateNoticeModal = (item) => {
    setSelectedLateSession(item);
    const teacherName = item.teacherName || 'Faculty Member';
    const stdSec = item.className || `Class ${item.standard}-${item.section}`;
    const periodNum = item.period || currentPeriodNum || 1;
    const subName = item.subjectName || 'Class';
    const lateMins = item.lateMinutes || 0;
    const schedTime = item.timeSlot?.split('-')[0]?.trim() || 'Scheduled Time';
    const checkInTime = item.checkInTime || '-';

    setLateNoticeSubject(`Official Explanation Notice: ${lateMins}m Late Check-In (${stdSec}, Period P${periodNum})`);
    setLateNoticeMessage(
`Dear ${teacherName},

Our automated classroom check-in system recorded your check-in as ${lateMins} minutes late for ${stdSec} (Subject: ${subName}, Period: P${periodNum}) on today's schedule.
- Scheduled Start: ${schedTime}
- Recorded Check-In: ${checkInTime}
- Delay Duration: ${lateMins} minutes

Please submit your formal explanation for this late arrival to the Principal's office within 24 hours.

Office of the Principal / Academic Administration`
    );
    setShowLateNoticeModal(true);
  };

  const handleSendLateNoticeSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedLateSession) return;
    setIsSendingLateNotice(true);
    try {
      const res = await sendLateNotice({
        sessionId: selectedLateSession.sessionId || selectedLateSession.id,
        teacherName: selectedLateSession.teacherName,
        standard: selectedLateSession.standard,
        section: selectedLateSession.section,
        subject: selectedLateSession.subjectName,
        period: selectedLateSession.period || currentPeriodNum || 1,
        lateMinutes: selectedLateSession.lateMinutes || 0,
        lateSeverity: selectedLateSession.lateSeverity,
        title: lateNoticeSubject,
        message: lateNoticeMessage
      });
      if (res?.status !== false) {
        toast.success(`Late notice sent to ${selectedLateSession.teacherName}!`);
        setShowLateNoticeModal(false);
        // Mark notice in local sessions
        setClassSessions(prev => prev.map(s => {
          if (s.id === selectedLateSession.id || (s.standard === selectedLateSession.standard && s.section === selectedLateSession.section)) {
            return { ...s, noticeInfo: { issuedAt: new Date().toISOString(), title: lateNoticeSubject } };
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

  const handlePeriodChange = (p) => {
    setSchedPeriod(p);
    const matched = calculatedPeriods.find(slot => slot.period === p);
    if (matched) {
      setSchedTimeSlot(matched.timeSlot);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!schedSubject.trim()) {
      toast.error('Please enter a subject name');
      return;
    }
    
    setIsSubmittingSchedule(true);
    try {
      const payload = {
        standard: schedStandard,
        section: schedSection.toUpperCase(),
        board: schedBoard,
        subjectName: schedSubject,
        period: Number(schedPeriod),
        timeSlot: schedTimeSlot,
        day: schedDay
      };
      
      if (isAdminRole) {
        if (!schedTeacherId) {
          toast.error('Please select a teacher');
          setIsSubmittingSchedule(false);
          return;
        }
        payload.teacherId = schedTeacherId;
      }
      
      if (schedType === 'manual') {
        if (!schedDate) {
          toast.error('Please pick a date for manual override');
          setIsSubmittingSchedule(false);
          return;
        }
        payload.date = schedDate;
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        payload.day = daysOfWeek[new Date(schedDate).getDay()];
      }
      
      const res = await createTeacherSchedule(payload);
      if (res?.status) {
        toast.success(res.message || 'Schedule entry saved successfully!');
        setShowScheduleModal(false);
        setSchedSubject('');
        setSchedDate('');
        refreshDashboard(true);
      } else {
        toast.error(res?.message || 'Failed to save schedule');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error occurred while saving schedule');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-stone-400">Loading portal systems...</p>
        </div>
      </div>
    );
  }

  // Role & timetable computations
  const todayStr = getLocalDateString();

  const allTodayPeriodsList = (isTeacherRole ? teacherData?.allTodayPeriods : adminData?.allTodayPeriods) || [];
  
  // Active alerts for late class log
  const activeAlerts = adminData?.allTodayPeriods?.filter(e => 
    e.isLateAlert && !dismissedAlerts.includes(e._id)
  ) || [];
  
  // Extract distinct classes in the school today
  const distinctClasses = [];
  allTodayPeriodsList.forEach(p => {
    if (p.class && p.classId && !distinctClasses.find(c => c._id === p.classId)) {
      distinctClasses.push({
        _id: p.classId,
        name: p.class,
        standard: p.standard,
        section: p.section,
        board: p.board
      });
    }
  });
  // Sort classes standard-wise and section-wise
  distinctClasses.sort((a, b) => {
    const stdA = a.standard || '';
    const stdB = b.standard || '';
    if (stdA !== stdB) return stdA.localeCompare(stdB, undefined, { numeric: true });
    return (a.section || '').localeCompare(b.section || '');
  });

  // ─── Admin Dashboard Section Computed Data ───
  const adminTabs = [
    { id: 'runningClasses', label: "Today's Running Classes", icon: '⚡' },
    { id: 'todayTimetable', label: 'Daily Timetable', icon: '📋' },
    { id: 'classSchedule', label: 'Class Schedule', icon: '🏫' },
    { id: 'teacherSchedule', label: 'Teacher Schedule', icon: '👨‍🏫' },
    { id: 'activityLogs', label: 'Activity Logs', icon: '📊' },
    { id: 'leavesApplied', label: 'Leave Applied', icon: '🌴' },
  ];

  const currentPeriodObj = isTeacherRole ? teacherData?.currentPeriod : adminData?.currentPeriod;
  const currentPeriodNum = currentPeriodObj?.period;
  const currentPeriodSlot = currentPeriodObj?.timeSlot;

  // ─── Computed: Today's Running Classes & Real-Time Monitor ───
  const activeMonitorPeriodNum = runningClassesPeriodFilter === 'current'
    ? (currentPeriodNum || 1)
    : (runningClassesPeriodFilter === 'all' ? null : Number(runningClassesPeriodFilter));

  const activePeriodSlotInfo = calculatedPeriods.find(p => p.period === (activeMonitorPeriodNum || currentPeriodNum || 1))
    || { timeSlot: currentPeriodSlot || '09:00 - 09:45 AM', startTime: '09:00 AM', endTime: '09:45 AM' };

  // Combine timetable schedules with real-time classSessions
  const todaysRunningClassesRaw = (allClasses || []).map((cls, idx) => {
    const std = cls.standard;
    const sec = cls.section;
    const classId = cls._id || cls.id || `cls-${idx}`;
    const room = cls.roomNumber || cls.room || `Room ${100 + idx + 1}`;

    // Scheduled slot for today & active period
    const schedEntry = (adminData?.allTodayPeriods || []).find(e => {
      const matchStd = e.standard?.toString().toLowerCase().trim() === std?.toString().toLowerCase().trim();
      const matchSec = e.section?.toString().toLowerCase().trim() === sec?.toString().toLowerCase().trim();
      const matchPeriod = activeMonitorPeriodNum ? Number(e.period) === Number(activeMonitorPeriodNum) : true;
      return matchStd && matchSec && matchPeriod;
    });

    // Check active session log
    const activeSession = (classSessions || []).find(s => {
      const sStd = s.standard || s.class?.standard;
      const sSec = s.section || s.class?.section;
      const matchStd = sStd?.toString().toLowerCase().trim() === std?.toString().toLowerCase().trim();
      const matchSec = sSec?.toString().toLowerCase().trim() === sec?.toString().toLowerCase().trim();
      const matchPeriod = activeMonitorPeriodNum ? Number(s.period) === Number(activeMonitorPeriodNum) : true;
      return matchStd && matchSec && matchPeriod;
    });

    const isSubstitute = Boolean(schedEntry?.substitute || activeSession?.substitute);
    const substituteName = schedEntry?.substitute?.substituteTeacherName || activeSession?.substitute?.substituteTeacherName;

    if (activeSession) {
      const lateMins = Number(activeSession.lateMinutes || 0);
      let lateSev = 'on-time';
      if (lateMins >= 15) {
        lateSev = 'red';
      } else if (lateMins >= 10) {
        lateSev = 'orange';
      } else if (lateMins >= 5) {
        lateSev = 'yellow';
      } else {
        lateSev = 'on-time';
      }

      return {
        id: activeSession.id || `rc-${classId}`,
        sessionId: activeSession.id,
        classId,
        standard: std,
        section: sec,
        className: `Class ${std} - ${sec}`,
        board: cls.board || 'CBSE',
        room,
        period: activeSession.period || activeMonitorPeriodNum || 1,
        timeSlot: schedEntry?.timeSlot || activePeriodSlotInfo.timeSlot,
        subjectName: activeSession.subject?.name || activeSession.subject || schedEntry?.subject || 'Mathematics',
        teacherName: activeSession.teacher?.name || activeSession.teacher || schedEntry?.teacher || 'Dr. Rajesh Sharma',
        teacherId: activeSession.teacher?.id || activeSession.teacher?._id,
        employeeId: activeSession.teacher?.employeeId || schedEntry?.employeeId || 'FAC',
        hasTeacher: true,
        isVacant: false,
        isSubstitute,
        substituteName,
        checkInTime: activeSession.startTime ? new Date(activeSession.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '09:05 AM',
        lateMinutes: lateMins,
        lateSeverity: lateSev,
        isLiveActive: activeSession.status === 'in-progress' || activeSession.status === 'active',
        noticeInfo: activeSession.noticeInfo || null
      };
    } else if (schedEntry) {
      return {
        id: `rc-vacant-${classId}`,
        sessionId: null,
        classId,
        standard: std,
        section: sec,
        className: `Class ${std} - ${sec}`,
        board: cls.board || 'CBSE',
        room,
        period: schedEntry.period || activeMonitorPeriodNum || 1,
        timeSlot: schedEntry.timeSlot || activePeriodSlotInfo.timeSlot,
        subjectName: schedEntry.subject || 'Scheduled Subject',
        teacherName: schedEntry.teacher || 'Unassigned Faculty',
        teacherId: schedEntry.teacherId,
        employeeId: schedEntry.employeeId || 'FAC',
        hasTeacher: false,
        isVacant: true,
        isSubstitute,
        substituteName,
        checkInTime: null,
        lateMinutes: 0,
        lateSeverity: 'vacant',
        isLiveActive: false,
        noticeInfo: null
      };
    } else {
      return {
        id: `rc-free-${classId}`,
        sessionId: null,
        classId,
        standard: std,
        section: sec,
        className: `Class ${std} - ${sec}`,
        board: cls.board || 'CBSE',
        room,
        period: activeMonitorPeriodNum || 1,
        timeSlot: activePeriodSlotInfo.timeSlot,
        subjectName: 'Self Study / Free Period',
        teacherName: 'No Faculty Required',
        teacherId: null,
        employeeId: null,
        hasTeacher: false,
        isVacant: false,
        isFreePeriod: true,
        lateMinutes: 0,
        lateSeverity: 'free',
        isLiveActive: false,
        noticeInfo: null
      };
    }
  });

  const rcStats = {
    total: todaysRunningClassesRaw.filter(c => !c.isFreePeriod).length,
    onTime: todaysRunningClassesRaw.filter(c => c.hasTeacher && c.lateSeverity === 'on-time').length,
    lateYellow: todaysRunningClassesRaw.filter(c => c.lateSeverity === 'yellow').length,
    lateOrange: todaysRunningClassesRaw.filter(c => c.lateSeverity === 'orange').length,
    lateRed: todaysRunningClassesRaw.filter(c => c.lateSeverity === 'red').length,
    lateTotal: todaysRunningClassesRaw.filter(c => ['yellow', 'orange', 'red'].includes(c.lateSeverity)).length,
    vacant: todaysRunningClassesRaw.filter(c => c.isVacant).length,
    substitute: todaysRunningClassesRaw.filter(c => c.isSubstitute).length
  };

  const filteredRunningClasses = todaysRunningClassesRaw.filter(item => {
    // 1. Class filter: Principal selection
    if (selectedRunningClasses.length > 0) {
      const matchStdSec = selectedRunningClasses.includes(`${item.standard}-${item.section}`);
      const matchId = selectedRunningClasses.includes(item.classId?.toString());
      if (!matchStdSec && !matchId) return false;
    } else if (dashboardClassFilter !== 'All') {
      const matchStdSec = dashboardClassFilter === `${item.standard}-${item.section}`;
      const matchId = dashboardClassFilter === item.classId?.toString();
      if (!matchStdSec && !matchId) return false;
    }

    // 2. Punctuality status filter
    if (runningClassesPunctualityFilter !== 'All') {
      if (runningClassesPunctualityFilter === 'on-time') {
        if (!(item.hasTeacher && item.lateSeverity === 'on-time')) return false;
      } else if (runningClassesPunctualityFilter === 'yellow') {
        if (item.lateSeverity !== 'yellow') return false;
      } else if (runningClassesPunctualityFilter === 'orange') {
        if (item.lateSeverity !== 'orange') return false;
      } else if (runningClassesPunctualityFilter === 'red') {
        if (item.lateSeverity !== 'red') return false;
      } else if (runningClassesPunctualityFilter === 'vacant') {
        if (!item.isVacant) return false;
      } else if (runningClassesPunctualityFilter === 'substitute') {
        if (!item.isSubstitute) return false;
      }
    }

    // 3. Search filter
    if (adminTabSearch.trim()) {
      const q = adminTabSearch.toLowerCase().trim();
      const matchT = item.teacherName?.toLowerCase().includes(q);
      const matchS = item.subjectName?.toLowerCase().includes(q);
      const matchC = item.className?.toLowerCase().includes(q) || item.standard?.toLowerCase().includes(q);
      if (!matchT && !matchS && !matchC) return false;
    }

    return true;
  });

  // 1. Current Period entries - all classes for the active period (filterable by class)
  const currentPeriodEntries = (allTodayPeriodsList)
    .filter(e => {
      const isPeriod = Number(e.period) === Number(currentPeriodNum);
      if (!isPeriod) return false;
      if (dashboardClassFilter !== 'All') {
        const clsMatch = (allClasses || adminData?.allClasses || []).find(c =>
          (c._id && e.classId && c._id.toString() === e.classId.toString()) ||
          (c.standard && e.standard && c.section && e.section &&
           c.standard.toString().toLowerCase().trim() === e.standard.toString().toLowerCase().trim() &&
           c.section.toString().toLowerCase().trim() === e.section.toString().toLowerCase().trim())
        );
        const matchesFilter = (e.classId && e.classId.toString() === dashboardClassFilter) ||
          (clsMatch && (clsMatch._id?.toString() === dashboardClassFilter || clsMatch.id?.toString() === dashboardClassFilter || `${clsMatch.standard}-${clsMatch.section}` === dashboardClassFilter)) ||
          (`${e.standard}-${e.section}` === dashboardClassFilter) ||
          (e.class === dashboardClassFilter);
        return Boolean(matchesFilter);
      }
      return true;
    })
    .sort((a, b) => (a.standard || '').localeCompare(b.standard || '', undefined, { numeric: true }));

  // 2. Today's Timetable grouped by Teacher
  const todayByTeacherMap = {};
  (adminData?.allTodayPeriods || []).forEach(e => {
    const tid = e.teacherId || (typeof e.teacher === 'object' ? (e.teacher?._id || e.teacher?.id) : null) || e.teacherName || (typeof e.teacher === 'string' ? e.teacher : null) || 'unknown';
    const tName = (typeof e.teacher === 'object' ? e.teacher?.name : e.teacher) || e.teacherName || 'Faculty';
    if (!todayByTeacherMap[tid]) todayByTeacherMap[tid] = { name: tName, teacherId: tid, entries: [] };
    todayByTeacherMap[tid].entries.push(e);
  });
  Object.values(todayByTeacherMap).forEach(t => t.entries.sort((a, b) => a.period - b.period));
  const todayByTeacher = Object.values(todayByTeacherMap)
    .filter(t => !adminTabSearch || t.name?.toLowerCase().includes(adminTabSearch.toLowerCase()))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // 3. Weekly Timetable grouped by Teacher then Day
  const weeklyByTeacherMap = {};
  (adminData?.weeklyTimetable || []).forEach(e => {
    const tid = e.teacherId || (typeof e.teacher === 'object' ? (e.teacher?._id || e.teacher?.id) : null) || e.teacherName || (typeof e.teacher === 'string' ? e.teacher : null) || 'unknown';
    const tName = (typeof e.teacher === 'object' ? e.teacher?.name : e.teacher) || e.teacherName || 'Faculty';
    if (!weeklyByTeacherMap[tid]) weeklyByTeacherMap[tid] = { name: tName, teacherId: tid, days: {} };
    if (!weeklyByTeacherMap[tid].days[e.day]) weeklyByTeacherMap[tid].days[e.day] = [];
    const clsName = e.class?.standard && e.class?.section ? `${e.class.standard}-${e.class.section}` : (e.standard && e.section ? `${e.standard}-${e.section}` : 'N/A');
    const subName = (typeof e.subject === 'object' ? e.subject?.name : e.subject) || e.subjectName || 'N/A';
    weeklyByTeacherMap[tid].days[e.day].push({ period: e.period, timeSlot: e.timeSlot, class: clsName, subject: subName, board: e.board || e.class?.board });
  });
  Object.values(weeklyByTeacherMap).forEach(t => Object.keys(t.days).forEach(d => t.days[d].sort((a, b) => a.period - b.period)));
  const weeklyByTeacher = Object.values(weeklyByTeacherMap)
    .filter(t => !adminTabSearch || t.name?.toLowerCase().includes(adminTabSearch.toLowerCase()))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // 4. Teacher Schedule - unique teacher → subject → class combos
  const teacherScheduleMap = {};
  (adminData?.weeklyTimetable || []).forEach(e => {
    const tid = e.teacherId || (typeof e.teacher === 'object' ? (e.teacher?._id || e.teacher?.id) : null) || e.teacherName || (typeof e.teacher === 'string' ? e.teacher : null) || 'unknown';
    const tName = (typeof e.teacher === 'object' ? e.teacher?.name : e.teacher) || e.teacherName || 'Faculty';
    const empId = e.employeeId || (typeof e.teacher === 'object' ? e.teacher?.employeeId : null) || '—';

    if (!teacherScheduleMap[tid]) {
      teacherScheduleMap[tid] = { name: tName, employeeId: empId, subjects: {}, totalPeriods: 0, classesSet: new Set() };
    }
    const subName = (typeof e.subject === 'object' ? e.subject?.name : e.subject) || e.subjectName || 'N/A';
    if (!teacherScheduleMap[tid].subjects[subName]) teacherScheduleMap[tid].subjects[subName] = new Set();
    const clsName = (e.class?.standard && e.class?.section) ? `${e.class.standard}-${e.class.section}` : (e.standard && e.section ? `${e.standard}-${e.section}` : 'N/A');
    teacherScheduleMap[tid].subjects[subName].add(clsName);
    teacherScheduleMap[tid].classesSet.add(clsName);
    teacherScheduleMap[tid].totalPeriods++;
  });

  // Also include any teachers from allTeachers who might not have timetable entries yet
  (adminData?.allTeachers || []).forEach(t => {
    const tid = t.id || t._id;
    if (tid && !teacherScheduleMap[tid] && !Object.values(teacherScheduleMap).some(x => x.name.toLowerCase() === (t.name || '').toLowerCase())) {
      teacherScheduleMap[tid] = {
        name: t.name,
        employeeId: t.employeeId || '—',
        subjects: {},
        totalPeriods: 0,
        classesSet: new Set()
      };
      if (t.specialization || t.subject) {
        teacherScheduleMap[tid].subjects[t.specialization || t.subject] = new Set();
      }
    }
  });

  const teacherSchedules = Object.values(teacherScheduleMap)
    .map(t => ({
      ...t,
      classes: Array.from(t.classesSet || []),
      subjects: Object.entries(t.subjects).map(([name, classSet]) => ({ name, classes: Array.from(classSet) }))
    }))
    .filter(t => {
      if (adminTabSearch && !t.name?.toLowerCase().includes(adminTabSearch.toLowerCase()) && !t.employeeId?.toLowerCase().includes(adminTabSearch.toLowerCase())) {
        return false;
      }
      if (dashboardClassFilter !== 'All') {
        const hasClass = t.classes.some(c => c === dashboardClassFilter || (t.subjects || []).some(s => s.classes.includes(dashboardClassFilter)));
        if (!hasClass) return false;
      }
      return true;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // 5. Class Schedule - group periods by class with filtering support
  const effectiveDay = dashboardDayFilter === 'Today'
    ? (weekdays[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] || 'Wednesday')
    : dashboardDayFilter;

  const periodsForClassSchedule = (adminData?.weeklyTimetable || []).filter(e => {
    if (dashboardDayFilter === 'Today') {
      return (adminData?.allTodayPeriods && adminData.allTodayPeriods.length > 0)
        ? adminData.allTodayPeriods.some(tp => (tp._id && e._id && tp._id === e._id) || (tp.standard === e.standard && tp.section === e.section && Number(tp.period) === Number(e.period))) || e.day === effectiveDay
        : e.day === effectiveDay;
    }
    return e.day === dashboardDayFilter;
  });

  const slotsToDisplay = periodsForClassSchedule.length > 0 ? periodsForClassSchedule : (adminData?.allTodayPeriods || []);

  const classScheduleMap = {};
  slotsToDisplay.forEach(e => {
    const clsMatch = (allClasses || adminData?.allClasses || []).find(c =>
      (c._id && e.classId && c._id.toString() === e.classId.toString()) ||
      (c.standard && e.standard && c.section && e.section &&
       c.standard.toString().toLowerCase().trim() === e.standard.toString().toLowerCase().trim() &&
       c.section.toString().toLowerCase().trim() === e.section.toString().toLowerCase().trim())
    );

    const cid = e.classId || clsMatch?._id || clsMatch?.id || `${e.standard}-${e.section}`;
    if (!cid) return;

    if (dashboardClassFilter !== 'All') {
      const matchesFilter = (clsMatch && (clsMatch._id?.toString() === dashboardClassFilter || clsMatch.id?.toString() === dashboardClassFilter)) ||
        (cid.toString() === dashboardClassFilter) ||
        (clsMatch && `${clsMatch.standard}-${clsMatch.section}` === dashboardClassFilter);
      if (!matchesFilter) return;
    }

    if (!classScheduleMap[cid]) {
      classScheduleMap[cid] = {
        classId: cid,
        standard: e.standard || clsMatch?.standard || '10th',
        section: e.section || clsMatch?.section || 'A',
        board: e.board || clsMatch?.board || 'CBSE',
        strength: clsMatch?.strength || e.classStrength || 35,
        roomNumber: e.room || clsMatch?.roomNumber,
        periods: []
      };
    }
    classScheduleMap[cid].periods.push({
      period: Number(e.period),
      timeSlot: e.timeSlot,
      subject: e.subject || e.subjectName || 'General',
      teacher: e.teacher || e.teacherName || 'Faculty',
      color: e.color || 'green',
      statusText: e.statusText || 'Scheduled',
      taken: true
    });
  });

  // If a specific class is selected but has no periods scheduled for this day, still show its card
  if (dashboardClassFilter !== 'All' && Object.keys(classScheduleMap).length === 0) {
    const targetCls = (allClasses || adminData?.allClasses || []).find(c =>
      c._id?.toString() === dashboardClassFilter ||
      c.id?.toString() === dashboardClassFilter ||
      `${c.standard}-${c.section}` === dashboardClassFilter
    );
    if (targetCls) {
      classScheduleMap[targetCls._id || targetCls.id] = {
        classId: targetCls._id || targetCls.id,
        standard: targetCls.standard,
        section: targetCls.section,
        board: targetCls.board || 'CBSE',
        strength: targetCls.strength || 35,
        roomNumber: targetCls.roomNumber,
        periods: []
      };
    }
  }

  Object.values(classScheduleMap).forEach(c => c.periods.sort((a, b) => a.period - b.period));
  const classSchedules = Object.values(classScheduleMap)
    .sort((a, b) => (a.standard || '').localeCompare(b.standard || '', undefined, { numeric: true }) || (a.section || '').localeCompare(b.section || ''));

  // 6. Activity Logs - merge teacher attendance + class sessions
  const activityLogsList = (adminData?.allTeachers || []).map(t => {
    const tName = (t.name || '').toLowerCase().trim();
    const att = (adminData?.todayAttendances || []).find(a =>
      (a.teacherId && (a.teacherId === t.id || a.teacherId === t._id)) ||
      (a.teacherName && a.teacherName.toLowerCase().trim() === tName) ||
      (a.teacher?.name && a.teacher.name.toLowerCase().trim() === tName) ||
      (a.teacher?._id && (a.teacher._id === t.id || a.teacher._id === t._id))
    );

    const teacherSessions = (adminData?.populatedSessions || []).filter(s =>
      (s.teacherId && (s.teacherId === t.id || s.teacherId === t._id)) ||
      (s.teacher && typeof s.teacher === 'string' && s.teacher.toLowerCase().trim() === tName) ||
      (s.teacher?.name && s.teacher.name.toLowerCase().trim() === tName) ||
      (s.teacher?._id && (s.teacher._id === t.id || s.teacher._id === t._id))
    );

    const status = att?.status || (t.status === 'Active' ? 'Present' : 'Absent');
    const inTime = att?.markedTime && att.markedTime !== '—'
      ? att.markedTime
      : (att?.punchIn ? new Date(att.punchIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : (status === 'Present' ? '08:20 AM' : '—'));
    const outTime = att?.punchOut
      ? new Date(att.punchOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : (status === 'Present' ? '03:30 PM' : '—');

    return {
      name: t.name,
      employeeId: t.employeeId,
      schoolLogin: status === 'Present' ? inTime : '—',
      schoolLogout: status === 'Present' ? outTime : '—',
      schoolStatus: status,
      classLogins: teacherSessions.map(s => ({
        class: s.class ? (typeof s.class === 'object' ? `${s.class.standard}-${s.class.section}` : s.class) : (s.standard && s.section ? `${s.standard}-${s.section}` : 'N/A'),
        subject: (typeof s.subject === 'object' ? s.subject?.name : s.subject) || 'General',
        period: s.period || 1,
        loginTime: s.startTime ? (s.startTime.includes('T') ? new Date(s.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : s.startTime) : '—',
        logoutTime: s.endTime ? (s.endTime.includes('T') ? new Date(s.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : s.endTime) : (s.status === 'in-progress' ? 'Active Now' : '—'),
        status: s.status || 'completed'
      })),
      totalClassesTaken: teacherSessions.length > 0
        ? teacherSessions.filter(s => s.status === 'completed' || s.status === 'active' || s.status === 'in-progress').length
        : (status === 'Present' ? 3 : 0)
    };
  }).filter(t => {
    if (adminTabSearch && !t.name?.toLowerCase().includes(adminTabSearch.toLowerCase()) && !t.employeeId?.toLowerCase().includes(adminTabSearch.toLowerCase())) {
      return false;
    }
    return true;
  });
  const parseTimeSlot = (timeSlot) => {
    if (!timeSlot) return { from: '—', to: '—' };
    const parts = timeSlot.split('-');
    return {
      from: parts[0] || '—',
      to: parts[1] || '—'
    };
  };

  const getClassColorClass = (standard) => {
    const std = String(standard).toLowerCase();
    if (std.includes('5')) return 'bg-orange-50/75 text-orange-950 border-orange-100';
    if (std.includes('nursery')) return 'bg-stone-100/70 text-stone-950 border-stone-200';
    if (std.includes('6')) return 'bg-yellow-50/70 text-yellow-950 border-yellow-250';
    if (std.includes('1') || std.includes('1st')) return 'bg-emerald-50/70 text-emerald-950 border-emerald-100';
    if (std.includes('8')) return 'bg-indigo-50/70 text-indigo-950 border-indigo-100';
    if (std.includes('9')) return 'bg-purple-50/70 text-purple-950 border-purple-100';
    if (std.includes('10')) return 'bg-cyan-50/70 text-cyan-950 border-cyan-100';
    return 'bg-blue-50/70 text-blue-950 border-blue-100';
  };

  const renderClassWeeklyGrid = () => {
    const effectiveClassId = (dashboardClassFilter !== 'All' ? dashboardClassFilter : (selectedClassForGrid || allClasses[0]?._id || allClasses[0]?.id));
    if (selectedViewType === 'class' && !effectiveClassId) {
      return <p className="text-stone-400 text-xs italic text-center py-12">Please select a class to view the weekly grid.</p>;
    }
    if (selectedViewType === 'teacher' && !selectedTeacherForGrid) {
      return <p className="text-stone-400 text-xs italic text-center py-12">Please select a teacher to view the weekly grid.</p>;
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

    const targetClass = allClasses.find(c =>
      (c._id && c._id.toString() === effectiveClassId?.toString()) ||
      (c.id && c.id.toString() === effectiveClassId?.toString()) ||
      (`${c.standard}-${c.section}` === effectiveClassId?.toString())
    );

    // Filter timetable entries for selected class or teacher
    const classEntries = (adminData?.weeklyTimetable || []).filter(e => {
      if (selectedViewType === 'class') {
        const cid = e.classId || e.class?._id || e.class?.id || e.class;
        const matchId = Boolean(effectiveClassId && cid && cid.toString() === effectiveClassId.toString());
        const matchTargetClassId = Boolean(targetClass && cid && (cid.toString() === targetClass._id?.toString() || cid.toString() === targetClass.id?.toString()));
        const matchStdSec = Boolean(
          targetClass && e.standard && e.section && targetClass.standard && targetClass.section &&
          e.standard.toString().toLowerCase().trim() === targetClass.standard.toString().toLowerCase().trim() &&
          e.section.toString().toLowerCase().trim() === targetClass.section.toString().toLowerCase().trim()
        );
        return matchId || matchTargetClassId || matchStdSec;
      } else {
        const tid = e.teacherId || e.teacher?._id || e.teacher?.id || e.teacher;
        return tid?.toString() === selectedTeacherForGrid?.toString();
      }
    });

    return (
      <div className="overflow-x-auto border border-stone-200 rounded-2xl shadow-sm bg-white mb-6">
        <table className="w-full text-center text-xs font-bold border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-stone-800 text-white border-b border-stone-300">
              <th className="py-3.5 px-4 text-left border-r border-stone-300 bg-stone-900 sticky left-0 z-10 w-[140px] uppercase font-extrabold tracking-wide">PERIOD / TIME</th>
              {days.map(d => {
                const isToday = d.toLowerCase() === todayDayName.toLowerCase();
                return (
                  <th key={d} className={`py-3.5 px-2 border-r border-stone-300 text-center uppercase tracking-wide font-extrabold ${isToday ? 'bg-amber-100 text-amber-900 font-black' : ''}`}>
                    {d} {isToday ? '(TODAY)' : ''}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {calculatedPeriods.map(p => (
              <tr key={p.period} className="border-b border-stone-200 hover:bg-stone-50/50 transition-colors">
                {/* Period Header Column */}
                <td className="py-4 px-3 border-r border-stone-300 bg-stone-100 sticky left-0 z-10 text-left w-[140px] border-b border-stone-200">
                  <div className="font-extrabold text-xs text-stone-850">Period {p.period}</div>
                  <div className="text-[10px] text-stone-400 font-mono mt-0.5">{p.timeSlot}</div>
                </td>
                
                {days.map(d => {
                  const slot = classEntries.find(e => e.day === d && Number(e.period) === Number(p.period));
                  const isToday = d.toLowerCase() === todayDayName.toLowerCase();
                  
                  let cellColorClass = isToday ? 'bg-amber-50/10' : '';
                  
                  if (!slot) {
                    return (
                      <td key={d} className={`p-4 border-r border-stone-200 text-center align-middle ${cellColorClass}`}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditCellModal(d, p.period)}
                          className="text-stone-400 hover:text-[#172B4D] hover:border-[#29456D] font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 mx-auto py-1.5 px-3 rounded-xl border border-dashed border-stone-200 bg-stone-50/30 hover:bg-[#29456D]/5 transition-all cursor-pointer"
                        >
                          ➕ Add Period
                        </button>
                      </td>
                    );
                  }

                  const subjectName = slot.subject?.name || slot.subject || 'N/A';
                  // Show class name standard-section if in teacher view, otherwise show teacher name
                  const displaySubText = selectedViewType === 'class'
                    ? (slot.teacher?.name || slot.teacher || 'N/A')
                    : (slot.class ? `Class ${slot.class.standard}-${slot.class.section} (${slot.class.board || 'CBSE'})` : 'N/A');
                  
                  // Live status logic
                  let statusCardClass = 'bg-stone-50 border-stone-200 text-stone-850';
                  let liveIndicatorText = '';
                  
                  if (isToday && adminData?.allTodayPeriods) {
                    const liveTodaySlot = adminData.allTodayPeriods.find(tp => {
                      if (selectedViewType === 'class') {
                        const cid = tp.classId || tp.class?._id || tp.class;
                        return cid?.toString() === selectedClassForGrid.toString() && Number(tp.period) === Number(p.period);
                      } else {
                        const tid = tp.teacherId || tp.teacher?._id || tp.teacher;
                        return tid?.toString() === selectedTeacherForGrid.toString() && Number(tp.period) === Number(p.period);
                      }
                    });
                    
                    if (liveTodaySlot) {
                      if (liveTodaySlot.color === 'green') {
                        statusCardClass = 'bg-emerald-50 border-emerald-300 text-emerald-900';
                        liveIndicatorText = 'On Time';
                      } else if (liveTodaySlot.color === 'gold' || liveTodaySlot.color === 'orange') {
                        statusCardClass = 'bg-purple-50 border-purple-300 text-purple-900';
                        liveIndicatorText = 'Sub Active';
                      } else if (liveTodaySlot.color === 'red') {
                        statusCardClass = 'bg-rose-50 border-rose-350 text-rose-900';
                        liveIndicatorText = 'Delayed/Abs';
                      } else {
                        statusCardClass = 'bg-blue-50 border-blue-300 text-blue-900';
                        liveIndicatorText = 'Upcoming';
                      }
                    }
                  } else {
                    statusCardClass = 'bg-slate-50 border-slate-200 text-slate-800';
                  }

                  return (
                    <td key={d} className={`p-3 border-r border-stone-200 text-center align-middle ${cellColorClass}`}>
                      <div className={`rounded-xl border p-3 shadow-sm text-center relative ${statusCardClass}`}>
                        <div className="font-extrabold text-[11px] uppercase tracking-wide">{subjectName}</div>
                        <div className="text-[9px] font-bold opacity-80 mt-0.5">{displaySubText}</div>
                        {liveIndicatorText && (
                          <span className="inline-block mt-1 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-white/60 border border-current/10">
                            {liveIndicatorText}
                          </span>
                        )}
                        
                        <div className="flex items-center justify-center gap-2 mt-2.5 pt-2 border-t border-current/10 text-[9px] font-extrabold uppercase">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCellModal(d, p.period, slot)}
                            className="hover:scale-105 transition-all text-[#405189] cursor-pointer"
                            title="Edit"
                          >
                            ✏️ Edit
                          </button>
                          <span className="opacity-30">•</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteCell(slot._id)}
                            className="hover:scale-105 transition-all text-rose-600 cursor-pointer"
                            title="Delete"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTimetableGrid = (type, entries, isTeacherView) => {
    // 1. Get unique classes to render as columns
    let gridClasses = [];
    if (isTeacherView) {
      const classMap = {};
      entries.forEach(e => {
        const cid = e.classId || e.class?._id || e.class;
        if (!cid) return;
        const cidStr = cid.toString();
        if (!classMap[cidStr]) {
          classMap[cidStr] = {
            _id: cidStr,
            standard: e.standard || e.class?.standard || 'Unknown',
            section: e.section || e.class?.section || '',
            board: e.board || e.class?.board || 'CBSE'
          };
        }
      });
      gridClasses = Object.values(classMap).sort((a, b) => {
        const aStd = parseFloat(a.standard) || 0;
        const bStd = parseFloat(b.standard) || 0;
        if (aStd !== bStd) return aStd - bStd;
        return a.section.localeCompare(b.section);
      });
    } else {
      let sortedClasses = [...allClasses].sort((a, b) => {
        const aStd = parseFloat(a.standard) || 0;
        const bStd = parseFloat(b.standard) || 0;
        if (aStd !== bStd) return aStd - bStd;
        return (a.section || '').localeCompare(b.section || '');
      });
      if (dashboardClassFilter !== 'All') {
        sortedClasses = sortedClasses.filter(c =>
          (c._id && c._id.toString() === dashboardClassFilter) ||
          (c.id && c.id.toString() === dashboardClassFilter) ||
          (`${c.standard}-${c.section}` === dashboardClassFilter)
        );
      }
      gridClasses = sortedClasses;
    }

    // 2. Get sorted list of periods
    const gridPeriods = (calculatedPeriods && calculatedPeriods.length > 0)
      ? [...calculatedPeriods].sort((a, b) => a.period - b.period)
      : [1, 2, 3, 4, 5, 6].map(num => ({ period: num, timeSlot: `${8+num}:30-${9+num}:30` }));

    if (gridClasses.length === 0) {
      return (
        <div className="text-center py-12 text-stone-400 italic text-xs">
          No classes configured or matching the selection.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto border border-stone-200 rounded-2xl shadow-sm bg-white mb-6">
        <table className="w-full text-center text-[11px] font-bold border-collapse">
          <thead>
            {/* Row 1: Merged Class Columns */}
            <tr className="bg-stone-800 text-white border-b border-stone-300">
              <th className="py-3 px-4 border-r border-stone-300 bg-stone-900 sticky left-0 z-10 w-[70px] min-w-[70px] text-[11px] uppercase tracking-wider font-extrabold text-white">class</th>
              {gridClasses.map(cls => (
                <th key={cls._id || cls.id} colSpan={3} className="py-3 px-2 border-r border-stone-300 text-center font-extrabold uppercase tracking-wide">
                  class {cls.standard} - {cls.section} <span className="text-[9px] opacity-75 font-normal">({cls.board})</span>
                </th>
              ))}
            </tr>
            {/* Row 2: Sub-headers for times and subject */}
            <tr className="bg-stone-700 text-white border-b border-stone-300">
              <th className="py-2.5 px-3 border-r border-stone-300 bg-stone-850 sticky left-0 z-10 text-[10px] uppercase font-extrabold">Period</th>
              {gridClasses.map(cls => (
                <React.Fragment key={cls._id || cls.id}>
                  <th className="py-2 px-1 border-r border-stone-200 text-center font-bold text-stone-300">From</th>
                  <th className="py-2 px-1 border-r border-stone-200 text-center font-bold text-stone-300">To</th>
                  <th className="py-2 px-1 border-r border-stone-300 text-center font-bold text-stone-100 bg-stone-750">Subject</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {gridPeriods.map(p => (
              <tr key={p.period} className="border-b border-stone-200 hover:bg-stone-50/50 transition-colors">
                {/* Yellow Period Header column matching image */}
                <td className="py-3 px-2 border-r border-stone-300 bg-[#ffe600] text-stone-900 text-center font-black sticky left-0 z-10 w-[70px] min-w-[70px] border-b border-stone-300">
                  {p.period}
                </td>
                {gridClasses.map(cls => {
                  // Find the scheduled slot matching by ID or standard/section
                  const slot = entries.find(e => {
                    const cid = e.classId || e.class?._id || e.class?.id || e.class;
                    const matchId = Boolean(cid && (cid.toString() === cls._id?.toString() || cid.toString() === cls.id?.toString()));
                    const matchStdSec = Boolean(
                      e.standard && e.section && cls.standard && cls.section &&
                      e.standard.toString().toLowerCase().trim() === cls.standard.toString().toLowerCase().trim() &&
                      e.section.toString().toLowerCase().trim() === cls.section.toString().toLowerCase().trim()
                    );
                    return (matchId || matchStdSec) && Number(e.period) === Number(p.period);
                  });

                  const { from, to } = parseTimeSlot(slot ? slot.timeSlot : p.timeSlot);
                  const colorClass = getClassColorClass(cls.standard);

                  if (!slot) {
                    return (
                      <React.Fragment key={cls._id}>
                        <td className={`py-3 px-1 border-r border-stone-200 font-mono text-[10px] text-stone-400 font-normal bg-stone-50/30`}>—</td>
                        <td className={`py-3 px-1 border-r border-stone-200 font-mono text-[10px] text-stone-400 font-normal bg-stone-50/30`}>—</td>
                        <td className={`py-3 px-1 border-r border-stone-300 font-normal text-stone-400 bg-stone-50/30`}>—</td>
                      </React.Fragment>
                    );
                  }

                  // Determine background classes based on state color
                  let subjectColorClass = colorClass;
                  if (type === 'today') {
                    if (slot.color === 'green') {
                      subjectColorClass = 'bg-emerald-500 text-white font-extrabold shadow-sm border-emerald-600';
                    } else if (slot.color === 'red') {
                      subjectColorClass = 'bg-rose-500 text-white font-extrabold shadow-sm border-rose-600';
                    } else if (slot.color === 'gold') {
                      subjectColorClass = 'bg-amber-400 text-amber-950 font-extrabold shadow-sm border-[#29456D]';
                    }
                  }

                  const subjectNameText = slot.subject?.name || slot.subject || 'N/A';
                  const teacherNameText = slot.teacher?.name || slot.teacher || '';

                  return (
                    <React.Fragment key={cls._id}>
                      <td className={`py-3 px-1 border-r border-stone-200 font-mono text-[10px] font-medium ${colorClass}`}>{from}</td>
                      <td className={`py-3 px-1 border-r border-stone-200 font-mono text-[10px] font-medium ${colorClass}`}>{to}</td>
                      <td className={`group py-3 px-2 border-r border-stone-300 font-bold transition-all relative ${subjectColorClass}`}>
                        <div>
                          <span className="text-[11px] block uppercase tracking-tight">{subjectNameText}</span>
                          {type === 'today' && (slot.type === 'substitute' || slot.substitute) && (
                            <span className="inline-flex items-center gap-1 mt-0.5 text-[8px] leading-tight uppercase font-extrabold tracking-wider text-amber-900 bg-amber-100/90 border border-amber-300 px-1.5 py-0.2 rounded-full mx-auto shadow-2xs">
                              <span>🔄</span> Sub
                            </span>
                          )}
                          {!isTeacherView && teacherNameText && (
                            <span className="block text-[8px] font-semibold opacity-85 mt-0.5 truncate max-w-[130px] mx-auto">
                              {slot.substitute ? `Arr: ${slot.substitute.substituteTeacherName}` : teacherNameText}
                            </span>
                          )}
                        </div>

                        {/* Admin Action Button: Subtle on-hover action without cluttering the view */}
                        {type === 'today' && !isTeacherView && (
                          <div className="mt-1 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArrangeSubstituteDirect(
                                  slot.teacherId || slot.teacher?._id,
                                  slot.teacher || slot.teacher?.name || 'Absent Teacher',
                                  getLocalDateString(),
                                  slot.periodEntryId || slot._id
                                );
                              }}
                              title="Assign alternate / substitute teacher for this period"
                              className="opacity-0 group-hover:opacity-100 transition-all duration-200 px-1.5 py-0.5 bg-white/95 hover:bg-white text-stone-800 shadow-xs border border-stone-300 text-[8px] rounded font-extrabold uppercase tracking-wider inline-flex items-center gap-0.5 mx-auto cursor-pointer"
                            >
                              <span>⇄</span>
                              <span>Alternate</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#334155] flex flex-col md:flex-row font-sans">
      <Sidebar />

      <div className="flex-1 bg-[#F7F9FC] p-6 lg:p-8 overflow-y-auto">
        
        {/* Top welcome banner with dynamic School / College Name from School Settings */}
        <header className="mb-6 bg-[#172B4D] border border-[#29456D] shadow-md rounded-2xl px-5 py-4 transition-all relative overflow-hidden text-white">
          {/* Subtle decorative background accent */}
          <div className="absolute top-0 right-0 w-80 h-32 bg-gradient-to-bl from-[#29456D]/40 via-blue-900/10 to-transparent pointer-events-none rounded-bl-full" />

          <div className="relative z-10 space-y-3">
            {/* Top row: All 4 status badges in one line across full card width — no cutoff */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#29456D] text-white border border-[#29456D] text-[10px] font-black uppercase tracking-wider shrink-0 shadow-2xs">
                <Building2 className="w-3 h-3 text-[#F3F6FC]" />
                <span>
                  {isStudentOrParentRole
                    ? `${selectedProfile === 'parent' || roleLower.includes('parent') ? 'Parent' : 'Student'} Workspace`
                    : isAdminRole
                      ? 'Institution Administration'
                      : 'Teaching Faculty Profile'}
                </span>
              </span>

              <span className="text-[#29456D] text-xs shrink-0">·</span>

              {schoolSettings?.board && (
                <>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#29456D] text-[#CBD5E1] text-[10px] font-bold border border-[#29456D] shrink-0">
                    <School className="w-3 h-3 text-[#F3F6FC]" />
                    <span>{schoolSettings.board} Board</span>
                  </span>
                  <span className="text-[#29456D] text-xs shrink-0">·</span>
                </>
              )}

              {schoolSettings?.academicYear && (
                <>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#29456D] text-[#CBD5E1] text-[10px] font-bold border border-[#29456D] shrink-0">
                    <Calendar className="w-3 h-3 text-[#F3F6FC]" />
                    <span>Session {schoolSettings.academicYear}</span>
                  </span>
                  <span className="text-[#29456D] text-xs shrink-0">·</span>
                </>
              )}

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 text-[10px] font-extrabold border border-emerald-800/80 shadow-xs shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="tracking-wide">Live Operations</span>
              </span>
            </div>

            {/* Main Greeting Row (Left) + Action Controls (Right) */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pt-0.5">
              {/* Left: Branding & Dynamic School Name Greeting */}
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-3">
                  {schoolSettings?.schoolLogo ? (
                    <img
                      src={schoolSettings.schoolLogo}
                      alt={schoolSettings.schoolName || 'Institution Logo'}
                      className="w-10 h-10 object-contain rounded-xl border border-[#29456D] bg-white p-1 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#29456D] text-white flex items-center justify-center shadow-sm border border-[#29456D] shrink-0">
                      <School className="w-5 h-5 text-[#F3F6FC]" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight truncate">
                      Welcome to {schoolSettings?.schoolName || 'Qelvora School CRM'}
                    </h1>
                    {schoolSettings?.logoSubtext && (
                      <p className="text-[11px] font-medium text-[#CBD5E1] tracking-wide mt-0.5 truncate">
                        {schoolSettings.logoSubtext}
                      </p>
                    )}
                  </div>
                </div>

                {/* User meta footer */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#CBD5E1] font-medium">
                  <span className="flex items-center gap-1 font-semibold text-white">
                    <UserCheck className="w-3.5 h-3.5 text-[#DBEAFE]" />
                    <span>Logged in as <strong className="text-white">{user?.name}</strong></span>
                    <span className="text-[#CBD5E1] font-normal">
                      ({user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Administrator'})
                    </span>
                  </span>
                  <span className="text-[#29456D] hidden sm:inline">·</span>
                  <span className="flex items-center gap-1 text-[#CBD5E1]">
                    <Clock className="w-3 h-3 text-[#DBEAFE]" />
                    <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </span>
                </div>
              </div>

              {/* Right: Quick Action Controls */}
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-start sm:justify-end">
                <button
                  onClick={() => refreshDashboard(true)}
                  disabled={loading}
                  className="px-3.5 py-2 bg-[#29456D] hover:bg-[#172B4D] border border-[#29456D] rounded-xl text-[11px] font-bold text-white hover:text-[#DBEAFE] shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Refresh Live Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#F3F6FC] ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>

                {isAdminRole && (
                  <button
                    onClick={() => navigate('/admin?tab=settings')}
                    className="px-3.5 py-2 bg-[#29456D] hover:bg-[#172B4D] border border-[#29456D] rounded-xl text-[11px] font-bold text-white hover:text-[#DBEAFE] shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="Configure School & Branding Settings"
                  >
                    <School className="w-3.5 h-3.5 text-[#F3F6FC]" />
                    <span>School Settings</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-800 border border-rose-800/80 rounded-xl text-[11px] font-bold text-rose-200 hover:text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-300" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ─── STUDENT / PARENT VIEW ─── */}
        {isStudentOrParentRole && studentProfile && (
          <div className="space-y-6 animate-fadeIn mb-8">
            {/* Student/Parent Banner Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="lg:col-span-1 bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center text-4xl border border-stone-200 shadow-inner">
                  {selectedProfile === 'parent' ? '👨‍👩‍👧' : '👨‍🎓'}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-stone-850">{studentProfile.name}</h3>
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[#29456D]/10 text-[#172B4D] border border-[#29456D]/20">
                    {selectedProfile === 'parent' ? 'Parent Profile' : 'Student Profile'}
                  </span>
                </div>
                <div className="w-full border-t border-stone-100 pt-4 text-left space-y-2.5 text-xs text-stone-600">
                  <div>
                    <span className="font-bold text-stone-400 block uppercase text-[9px] tracking-wider mb-0.5">Student ID</span>
                    <span className="font-bold text-stone-850 font-mono">{studentProfile.studentId}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-400 block uppercase text-[9px] tracking-wider mb-0.5">Class & Section</span>
                    <span className="font-bold text-stone-850">Class {studentProfile.standard} - {studentProfile.section}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-400 block uppercase text-[9px] tracking-wider mb-0.5">Roll Number</span>
                    <span className="font-bold text-stone-850">{studentProfile.rollNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-400 block uppercase text-[9px] tracking-wider mb-0.5">Email</span>
                    <span className="font-semibold text-stone-800 truncate block">{studentProfile.email}</span>
                  </div>
                  {selectedProfile === 'parent' && (
                    <>
                      <div>
                        <span className="font-bold text-stone-400 block uppercase text-[9px] tracking-wider mb-0.5">Parent / Guardian</span>
                        <span className="font-bold text-stone-850">{studentProfile.parentName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-stone-400 block uppercase text-[9px] tracking-wider mb-0.5">Parent Contact</span>
                        <span className="font-bold text-stone-850 font-mono">{studentProfile.parentPhone || 'N/A'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Navigation Cards */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/videos')}
                  className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 hover:border-[#29456D] transition-all hover:scale-[1.02] text-left space-y-3 active:scale-95"
                >
                  <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-2xl border border-red-100">
                    🎥
                  </div>
                  <div>
                    <h4 className="text-base font-black text-stone-850">Classroom Recordings</h4>
                    <p className="text-xs text-stone-500 mt-1 leading-normal">
                      Watch recorded classroom video sessions and lectures for Class {studentProfile.standard}-{studentProfile.section}.
                    </p>
                  </div>
                </button>

                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 text-left space-y-3">
                  <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-2xl border border-blue-100">
                    📊
                  </div>
                  <div>
                    <h4 className="text-base font-black text-stone-850">Academic Dashboard</h4>
                    <p className="text-xs text-stone-500 mt-1 leading-normal">
                      Check attendance status, submitted assignments, homeworks, and final marks records.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 text-left space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center text-2xl border border-emerald-100">
                    📅
                  </div>
                  <div>
                    <h4 className="text-base font-black text-stone-850">Class Timetable</h4>
                    <p className="text-xs text-stone-550 mt-1 leading-normal">
                      View the weekly timetable and period schedules for standard {studentProfile.standard}-{studentProfile.section}.
                    </p>
                  </div>
                </div>

                {selectedProfile === 'parent' ? (
                  <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-250 shadow-sm rounded-2xl p-6 text-left space-y-3 relative overflow-hidden">
                    <div className="w-12 h-12 bg-amber-50 text-amber-550 rounded-xl flex items-center justify-center text-2xl border border-amber-100">
                      ⭐
                    </div>
                    <div>
                      <h4 className="text-base font-black text-stone-850">Parent Feedback Active</h4>
                      <p className="text-xs text-amber-900 mt-1 leading-normal font-medium">
                        You can rate classroom teachers and submit feedback suggestions directly under each lecture recording video.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-stone-50 border border-stone-250/60 shadow-sm rounded-2xl p-6 text-left space-y-3">
                    <div className="w-12 h-12 bg-stone-100 text-stone-400 rounded-xl flex items-center justify-center text-2xl border border-stone-200">
                      🔒
                    </div>
                    <div>
                      <h4 className="text-base font-black text-stone-400">Feedback Disabled</h4>
                      <p className="text-xs text-stone-500 mt-1 leading-normal font-medium">
                        Student profiles are restricted from rating teachers or submitting suggestions. Switch to Parent Profile to rate.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Student Weekly Timetable Section */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
              <div className="mb-6">
                <h3 className="text-lg font-black text-stone-850">Weekly Class Timetable</h3>
                <p className="text-stone-400 text-xs mt-0.5 font-medium">Weekly schedule grid for Class {studentProfile.standard} - {studentProfile.section}</p>
              </div>

              {studentTimetable.length === 0 ? (
                <div className="text-center py-12 text-stone-400 italic text-xs">
                  Timetable not yet configured for your class.
                </div>
              ) : (
                renderTimetableGrid('weekly', studentTimetable, true)
              )}
            </div>
          </div>
        )}

        {/* ─── TEACHER VIEW (TODAY TIMETABLE & WEEKLY TIMETABLE) ─── */}
        {isTeacherRole && teacherData && (
          <div className="space-y-6">
            

            {/* Teacher Dashboard Tabs */}
            <div className="bg-white border border-slate-200 shadow-sm rounded overflow-hidden">
              {/* Tab Navigation */}
              <div className="flex overflow-x-auto border-b border-stone-200 bg-stone-50/80" style={{ scrollbarWidth: 'none' }}>
                <button
                  onClick={() => setActiveTeacherTab('todayTimetable')}
                  className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                    activeTeacherTab === 'todayTimetable'
                      ? 'border-[#29456D] text-[#172B4D] bg-white border-b-2'
                      : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-white/50'
                  }`}
                >
                  <span>📋</span> Today's Timetable
                </button>
                <button
                  onClick={() => setActiveTeacherTab('weeklyTimetable')}
                  className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                    activeTeacherTab === 'weeklyTimetable'
                      ? 'border-[#29456D] text-[#172B4D] bg-white border-b-2'
                      : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-white/50'
                  }`}
                >
                  <span>📅</span> Weekly Timetable
                </button>
              </div>

              <div className="p-6">
                          {/* ═══ TAB 1: TODAY'S TIMETABLE ═══ */}
          {activeTeacherTab === 'todayTimetable' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-black text-stone-850">Today's Timetable</h3>
                  <p className="text-stone-400 text-[11px] mt-0.5">Your teaching schedule for today. Start and end classes directly from here.</p>
                </div>
                <span className="text-xs text-stone-550 bg-stone-50 border border-stone-200 px-3 py-1 rounded-full font-bold">
                  Total: {teacherData.schedule.length} Periods
                </span>
              </div>

              {teacherData.schedule.length === 0 ? (
                <div className="text-center py-12 text-stone-400 italic text-xs">
                  No classes assigned to you today.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Grid View */}
                  {renderTimetableGrid('today', teacherData.schedule, true)}

                  {/* Actions List */}
                  <div className="overflow-x-auto border border-stone-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-extrabold uppercase tracking-wider">
                          <th className="py-3 px-4">Period</th>
                          <th className="py-3 px-4">Time</th>
                          <th className="py-3 px-4">Class</th>
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacherData.schedule.sort((a, b) => a.period - b.period).map((slot, idx) => (
                          <tr key={idx} className="border-b border-stone-150 hover:bg-stone-50 text-stone-750">
                            <td className="py-3.5 px-4 font-mono font-bold text-stone-800">P{slot.period}</td>
                            <td className="py-3.5 px-4 font-mono text-stone-550">{slot.timeSlot}</td>
                            <td className="py-3.5 px-4 font-bold text-stone-800">
                              Class {slot.standard} - {slot.section} <span className="text-[10px] text-stone-400 font-normal">({slot.board})</span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-stone-700">
                              {slot.subject}
                              {slot.type === 'substitute' && (
                                <span className="inline-block ml-2 text-[8px] bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold border border-slate-200">
                                  Substitute
                                </span>
                              )}
                            </td>
                             <td className="py-3.5 px-4 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full font-bold uppercase text-[9px] border ${
                                slot.classSession?.status === 'active' 
                                  ? 'bg-green-800 text-white border-green-900 font-bold' 
                                  : slot.classSession?.status === 'completed'
                                    ? 'bg-stone-100 text-stone-600 border-stone-250 font-bold'
                                    : 'bg-red-50 text-red-800 border-red-200 font-bold'
                              }`}>
                                {slot.classSession?.status === 'active' ? 'Checked In' : slot.classSession?.status === 'completed' ? 'Checked Out' : 'Not Started'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {!slot.classSession ? (
                                <button
                                  disabled={Number(slot.period) !== Number(currentPeriodNum)}
                                  onClick={() => handleClassLogin(slot.classId, slot.period, slot.subjectId)}
                                  className={`px-3.5 py-1.5 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all ${
                                    Number(slot.period) === Number(currentPeriodNum)
                                      ? "bg-green-800 hover:bg-green-950 cursor-pointer"
                                      : "bg-stone-300 text-stone-500 cursor-not-allowed opacity-60"
                                  }`}
                                  title={Number(slot.period) !== Number(currentPeriodNum) ? `Can only Check In during Period ${slot.period}` : ""}
                                >
                                  📥 Check In
                                </button>
                              ) : slot.classSession.status === 'active' ? (
                                <button
                                  onClick={() => handleClassLogout(slot.classId, slot.period)}
                                  className="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all"
                                >
                                  📤 Check Out
                                </button>
                              ) : (
                                <span className="text-[10px] text-stone-400 font-bold bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-lg">
                                  ✓ Logs Saved
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB 2: WEEKLY TIMETABLE ═══ */}
          {activeTeacherTab === 'weeklyTimetable' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-black text-stone-850">Weekly Timetable</h3>
                  <p className="text-stone-400 text-[11px] mt-0.5">Your weekly scheduled teaching template assigned by administration.</p>
                </div>
                <span className="text-xs text-stone-550 bg-stone-50 border border-stone-200 px-3 py-1 rounded-full font-bold">
                  Total: {myWeeklyTimetable.length} Slots
                </span>
              </div>

              {myWeeklyTimetable.length === 0 ? (
                <div className="text-center py-12 text-stone-400 italic text-xs">
                  No weekly timetable slots assigned to you.
                </div>
              ) : (
                <div>
                  {/* Weekday selector */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2 border-b border-stone-150">
                    {weekdays.map(day => (
                      <button
                        key={day}
                        onClick={() => setActiveTeacherWeeklyDay(day)}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                          activeTeacherWeeklyDay === day
                            ? 'bg-stone-500 border-amber-600 text-white shadow-sm'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>

                  {/* Grid layout */}
                  {renderTimetableGrid('weekly', myWeeklyTimetable.filter(t => t.day === activeTeacherWeeklyDay), true)}
                </div>
              )}
            </div>
          )}
              </div>
            </div>

            {/* Bottom Row: Operations Monitor & Leave filing */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Classroom Operations Monitor */}
              <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                  <div>
                    <h3 className="text-base font-black text-stone-850 flex items-center gap-2.5">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                      Live Period Operations Monitor
                    </h3>
                    <p className="text-stone-500 text-[11px] mt-0.5">Real-time classroom activity status across all sections.</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-stone-500 font-bold uppercase">Period:</label>
                    <select
                      value={monitorPeriod}
                      onChange={(e) => setMonitorPeriod(e.target.value)}
                      className="bg-stone-50 border border-stone-200 text-stone-850 text-[11px] rounded-lg px-2 py-1 outline-none font-bold"
                    >
                      <option value="current">⚡ Current Period ({currentPeriodObj ? `Period ${currentPeriodObj.period}` : 'None'})</option>
                      {calculatedPeriods.map(p => (
                        <option key={p.period} value={p.period}>Period {p.period} ({p.timeSlot})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
                  {(() => {
                    const activePeriodNum = monitorPeriod === 'current' ? (currentPeriodNum || 1) : Number(monitorPeriod);
                    // For teacher view: only show classes from their own schedule for the active period
                    const myProfileId = teacherData?.teacherId || teacherData?.schedule?.[0]?.teacherId;
                    const isTeacher = isTeacherRole;
                    
                    const myScheduleForSelectedPeriod = isTeacher
                      ? (teacherData?.schedule || []).filter(s => Number(s.period) === Number(activePeriodNum))
                      : [];
                    const myScheduleClassIds = isTeacher
                      ? [...new Set(myScheduleForSelectedPeriod.map(s => s.classId?.toString()).filter(Boolean))]
                      : [];
                    const filteredClasses = isTeacher
                      ? allClasses.filter(cls => myScheduleClassIds.includes(cls._id?.toString()))
                      : allClasses;
                    
                    return filteredClasses.length === 0 ? (
                      <p className="text-stone-400 text-xs italic text-center py-6 col-span-full">{isTeacher ? 'No classes assigned to you for this period.' : 'No registered classes found.'}</p>
                    ) : (
                      filteredClasses.map((cls) => {
                      const entry = allTodayPeriodsList.find(e => e.classId?.toString() === cls._id?.toString() && Number(e.period) === Number(activePeriodNum));
                      let color = 'red';
                      let statusText = 'Not Taking';

                      if (entry) {
                        if (entry.color === 'green') {
                          color = 'green';
                          statusText = 'Class In Progress';
                        } else if (entry.color === 'gold' || entry.color === 'orange') {
                          color = 'gold';
                          statusText = 'Substitute Arranged';
                        } else if (entry.color === 'red') {
                          color = 'red';
                          statusText = entry.statusText || 'Not Taking';
                        }
                      }

                      const info = entry ? { teacher: entry.teacher, subject: entry.subject, timeSlot: entry.timeSlot } : resolveClassInfo(cls._id);
                      const myProfileId = teacherData?.teacherId || teacherData?.schedule?.[0]?.teacherId;
                      const isMyClassForPeriod = entry
                        ? (entry.teacherId?.toString() === myProfileId?.toString() || (entry.substitute && entry.substitute.substituteTeacherId?.toString() === myProfileId?.toString()))
                        : (info?.teacherId?.toString() === myProfileId?.toString());

                      return (
                        <div 
                          key={cls._id}
                          onClick={() => setActiveCardId(activeCardId === cls._id ? null : cls._id)}
                          className={`border rounded-xl p-3 flex flex-col justify-between gap-2 text-xs transition-all hover:shadow-md cursor-pointer ${
                            color === 'green' 
                              ? 'bg-emerald-50/40 border-emerald-250 text-stone-850' 
                              : color === 'gold'
                                ? 'bg-stone-50/40 border-slate-200 text-stone-855'
                                : 'bg-rose-50/30 border-rose-150 text-stone-855'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-extrabold text-stone-850 truncate">
                                Class {cls.standard} - {cls.section}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                color === 'green' ? 'bg-emerald-100 text-emerald-800' :
                                color === 'gold' ? 'bg-stone-100 text-stone-850' :
                                'bg-rose-100 text-rose-800'
                              }`}>{statusText}</span>
                            </div>
                            <p className="text-[10px] text-stone-500 font-medium">Subject: <strong className="text-stone-800">{info.subject}</strong></p>
                            <p className="text-[10px] text-stone-500 font-medium text-ellipsis overflow-hidden whitespace-nowrap">Teacher: <strong className="text-stone-800">{info.teacher}</strong></p>
                            
                            {isMyClassForPeriod && (
                              <span className="inline-block text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold uppercase mt-1">
                                ⭐ My Class
                              </span>
                            )}
                          </div>

                          {activeCardId === cls._id && (
                            <div className="pt-1.5 border-t border-stone-200/50 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {color !== 'green' ? (
                                <button
                                  disabled={Number(activePeriodNum) !== Number(currentPeriodNum)}
                                  type="button"
                                  onClick={() => handleClassLogin(cls._id, activePeriodNum, entry?.subjectId || info?.subjectId)}
                                  className={`w-full py-1.5 text-white text-[10px] font-bold rounded transition-all ${
                                    Number(activePeriodNum) === Number(currentPeriodNum)
                                      ? "bg-emerald-500 hover:bg-emerald-600 cursor-pointer"
                                      : "bg-stone-300 text-stone-500 cursor-not-allowed opacity-60"
                                  }`}
                                  title={Number(activePeriodNum) !== Number(currentPeriodNum) ? `Can only login during Period ${activePeriodNum}` : ""}
                                >
                                  Start Class
                                </button>
                              ) : (entry?.teacherId?.toString() === myProfileId?.toString() || (entry?.substitute && entry.substitute.substituteTeacherId?.toString() === myProfileId?.toString())) ? (
                                <button
                                  type="button"
                                  onClick={() => handleClassLogout(cls._id, activePeriodNum)}
                                  className="w-full py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold rounded transition-all"
                                >
                                  End Class
                                </button>
                              ) : (
                                <div className="text-[10px] text-stone-500 text-center py-1 font-bold">
                                  Taking by {info.teacher}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                      })
                    );
                  })()}
                </div>
              </div>

              {/* Request Leave Section */}
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 shadow-sm rounded p-6">
                  <h3 className="text-base font-black text-stone-850 mb-4 flex items-center gap-2">
                    <span>✍️</span> Request Leave
                  </h3>
                  <form onSubmit={handleLeaveSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Leave Date</label>
                      <input 
                        type="date"
                        value={leaveDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setLeaveDate(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#29456D] text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Reason</label>
                      <textarea
                        rows="2"
                        value={leaveReason}
                        placeholder="Family emergency, medical reasons..."
                        onChange={(e) => setLeaveReason(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#29456D] text-white placeholder-stone-400 resize-none"
                      ></textarea>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingLeave}
                      className="w-full py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-black text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                    >
                      {isSubmittingLeave ? 'Filing leave...' : 'Submit Request'}
                    </button>
                  </form>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ─── PRINCIPAL / ADMIN VIEW (LIVE PERIOD OPERATIONS MONITOR) ─── */}
        {isAdminRole && adminData && (
          <div className="space-y-6">
            


            {/* Stats Cards Row with Icons and Click-to-View Drilldown */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Total Teachers Card */}
              <div 
                onClick={() => setActiveCardModal('total_teachers')}
                className="bg-[#FFFFFF] border border-slate-200 shadow-xs rounded-2xl p-5 flex flex-col justify-between hover:border-[#29456D] hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-[0.8px]">TOTAL TEACHERS</span>
                  <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-[#172B4D] flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform shrink-0">
                    <UsersRound className="w-5 h-5 text-[#172B4D]" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-2xl lg:text-3xl font-black text-[#172B4D]">{adminData.allTeachers?.length || adminData.stats?.totalTeachers || 0}</span>
                  <span className="text-[10px] font-bold text-[#172B4D] bg-blue-50/80 hover:bg-blue-100/90 border border-blue-200/80 rounded-full px-3 py-1 transition-all inline-flex items-center gap-1">
                    View List <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Present Card */}
              <div 
                onClick={() => setActiveCardModal('present_teachers')}
                className="bg-[#FFFFFF] border border-slate-200 shadow-xs rounded-2xl p-5 flex flex-col justify-between hover:border-[#29456D] hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-[0.8px]">PRESENT</span>
                  <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-[#172B4D] flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform shrink-0">
                    <UserCheck className="w-5 h-5 text-[#172B4D]" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-2xl lg:text-3xl font-black text-[#172B4D]">{adminData.stats?.presentTeachers || 0}</span>
                  <span className="text-[10px] font-bold text-[#172B4D] bg-blue-50/80 hover:bg-blue-100/90 border border-blue-200/80 rounded-full px-3 py-1 transition-all inline-flex items-center gap-1">
                    View List <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Absent Card */}
              <div 
                onClick={() => setActiveCardModal('absent_teachers')}
                className="bg-[#FFFFFF] border border-slate-200 shadow-xs rounded-2xl p-5 flex flex-col justify-between hover:border-[#29456D] hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-[0.8px]">ABSENT</span>
                  <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-[#172B4D] flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform shrink-0">
                    <UserX className="w-5 h-5 text-[#172B4D]" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-2xl lg:text-3xl font-black text-[#172B4D]">{adminData.stats?.absentTeachers || 0}</span>
                  <span className="text-[10px] font-bold text-[#172B4D] bg-blue-50/80 hover:bg-blue-100/90 border border-blue-200/80 rounded-full px-3 py-1 transition-all inline-flex items-center gap-1">
                    View List <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Logged In Card */}
              <div 
                onClick={() => setActiveCardModal('logged_in_classes')}
                className="bg-[#FFFFFF] border border-slate-200 shadow-xs rounded-2xl p-5 flex flex-col justify-between hover:border-[#29456D] hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-[0.8px]">LOGGED IN</span>
                  <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-[#172B4D] flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform shrink-0">
                    <LogIn className="w-5 h-5 text-[#172B4D]" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-2xl lg:text-3xl font-black text-[#172B4D]">{adminData.stats?.greenClasses || 0}</span>
                  <span className="text-[10px] font-bold text-[#172B4D] bg-blue-50/80 hover:bg-blue-100/90 border border-blue-200/80 rounded-full px-3 py-1 transition-all inline-flex items-center gap-1">
                    View List <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Logged Out / Missed Card */}
              <div 
                onClick={() => setActiveCardModal('missed_classes')}
                className="bg-[#FFFFFF] border border-slate-200 shadow-xs rounded-2xl p-5 flex flex-col justify-between hover:border-[#29456D] hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-[0.8px]">LOGGED OUT / MISSED</span>
                  <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-[#172B4D] flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform shrink-0">
                    <LogOut className="w-5 h-5 text-[#172B4D]" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-2xl lg:text-3xl font-black text-[#172B4D]">{adminData.stats?.redClasses || 0}</span>
                  <span className="text-[10px] font-bold text-[#172B4D] bg-blue-50/80 hover:bg-blue-100/90 border border-blue-200/80 rounded-full px-3 py-1 transition-all inline-flex items-center gap-1">
                    View Missed <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Substitute Arranged Card */}
              <div 
                onClick={() => setActiveCardModal('substitute_arranged')}
                className="bg-[#FFFFFF] border border-slate-200 shadow-xs rounded-2xl p-5 flex flex-col justify-between hover:border-[#29456D] hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-[0.8px]">SUBSTITUTE ARRANGED</span>
                  <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-[#172B4D] flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform shrink-0">
                    <UserRoundCheck className="w-5 h-5 text-[#172B4D]" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-2xl lg:text-3xl font-black text-[#172B4D]">{adminData.stats?.goldClasses || 0}</span>
                  <span className="text-[10px] font-bold text-[#172B4D] bg-blue-50/80 hover:bg-blue-100/90 border border-blue-200/80 rounded-full px-3 py-1 transition-all inline-flex items-center gap-1">
                    View Details <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* Leaves & Substitutions Management Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Real-time pending leaves queue */}
              <div className="bg-[#FFFFFF] border border-slate-200 shadow-xs rounded-2xl p-6">
                <h4 className="text-xs font-black text-[#172B4D] uppercase tracking-widest mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-[#172B4D]" />
                    <span>PENDING LEAVE REQUESTS</span>
                  </div>
                  <span className="text-xs font-bold text-[#172B4D] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {leaveRequests.filter(r => r.status === 'Pending').length}
                  </span>
                </h4>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {leaveRequests.filter(r => r.status === 'Pending').length === 0 ? (
                    <p className="text-slate-500 text-xs italic text-center py-12">No pending leave requests.</p>
                  ) : (
                    leaveRequests.filter(r => r.status === 'Pending').map((req, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-2.5 text-xs shadow-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{req.teacher?.name || req.teacherName || req.name || 'Faculty Member'}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Date: {req.leaveDate}</p>
                          </div>
                          <span className="text-[9px] text-amber-700 bg-slate-100 px-2.5 py-0.5 rounded-full font-bold border border-slate-200">
                            Pending
                          </span>
                        </div>
                        <p className="text-slate-500 italic text-[11px] line-clamp-3">"{req.reason}"</p>
                        <button
                          onClick={() => handleReviewLeave(req)}
                          className="w-full mt-1.5 py-2 bg-blue-50 hover:bg-[#29456D] hover:text-white text-[#172B4D] font-bold rounded-xl text-center text-xs border border-blue-200 transition-all cursor-pointer shadow-xs"
                        >
                          Review & Allocate Alternate
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Historic Leave Logs */}
              <div className="xl:col-span-2 bg-[#FFFFFF] border border-slate-200 shadow-xs rounded-2xl p-6">
                <h3 className="text-sm font-black text-[#172B4D] uppercase tracking-widest mb-5 flex items-center gap-2">
                  <HistoryIcon className="w-4 h-4 text-[#172B4D]" />
                  <span>HISTORIC LEAVE LOGS</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Faculty Name</th>
                        <th className="py-3 px-4">Leave Date</th>
                        <th className="py-3 px-4">Reason</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.filter(r => r.status !== 'Pending').length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-6 text-slate-500 italic">No processed leaves.</td>
                        </tr>
                      ) : (
                        leaveRequests.filter(r => r.status !== 'Pending').slice(0, 15).map((req, idx) => (
                          <tr key={idx} className="border-b border-slate-200/60 hover:bg-slate-50/50 text-slate-800">
                            <td className="py-3 px-4 font-bold text-[#172B4D]">{req.teacher?.name || req.teacherName || req.name || 'Faculty Member'}</td>
                            <td className="py-3 px-4 font-mono text-slate-500">{req.leaveDate}</td>
                            <td className="py-3 px-4 text-slate-800">{req.reason}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] border ${
                                req.status === 'Approved'
                                  ? 'bg-blue-50 text-[#172B4D] border-blue-200 font-bold'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* ─── ADMIN DASHBOARD SECTIONS (6 TABS) ─── */}
            <div className="bg-[#FFFFFF] border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
              {/* Tab Navigation */}
              <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50" style={{ scrollbarWidth: 'none' }}>
                {adminTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveAdminTab(tab.id); setAdminTabSearch(''); setWeeklyExpandedTeacher(null); }}
                    className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                      activeAdminTab === tab.id
                        ? 'border-[#29456D] text-[#172B4D] bg-white border-b-2 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-[#172B4D] hover:bg-white/50'
                    }`}
                  >
                    <span>{tab.icon}</span> {tab.label}
                  </button>
                ))}
              </div>

              {/* Principal / Admin Class & Day Filter Toolbar */}
              <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Class Filter Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                      <School className="w-3.5 h-3.5 text-[#172B4D]" />
                      <span>Class:</span>
                    </span>
                    <select
                      value={dashboardClassFilter}
                      onChange={(e) => setDashboardClassFilter(e.target.value)}
                      className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-bold outline-none text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] shadow-2xs cursor-pointer min-w-[200px]"
                    >
                      <option value="All">All Classes ({allClasses.length})</option>
                      {allClasses.map(cls => (
                        <option key={cls._id || cls.id} value={cls._id || cls.id}>
                          Class {cls.standard} - {cls.section} ({cls.board || 'CBSE'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Day Filter Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#172B4D]" />
                      <span>Day:</span>
                    </span>
                    <select
                      value={dashboardDayFilter}
                      onChange={(e) => setDashboardDayFilter(e.target.value)}
                      className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-bold outline-none text-slate-800 focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] shadow-2xs cursor-pointer"
                    >
                      <option value="Today">Today ({weekdays[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] || 'Wednesday'})</option>
                      <option value="All Days">All Days (Full Week)</option>
                      {weekdays.slice(0, 6).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>

                  {dashboardClassFilter !== 'All' && (
                    <button
                      type="button"
                      onClick={() => setDashboardClassFilter('All')}
                      className="text-[11px] font-bold text-[#172B4D] hover:underline cursor-pointer"
                    >
                      Reset Class Filter
                    </button>
                  )}
                </div>

                {/* Search bar for filterable tabs */}
                {['todayTimetable', 'weeklyTimetable', 'teacherSchedule', 'activityLogs', 'leavesApplied'].includes(activeAdminTab) && (
                  <div className="w-full sm:w-auto">
                    <input
                      type="text"
                      value={adminTabSearch}
                      onChange={(e) => setAdminTabSearch(e.target.value)}
                      placeholder="🔍 Search educator or subject..."
                      className="w-full sm:w-56 bg-white border border-stone-300 rounded-xl px-3.5 py-1.5 text-xs outline-none focus:border-[#29456D] text-stone-800 placeholder-stone-400 font-medium shadow-2xs"
                    />
                  </div>
                )}
              </div>

              <div className="p-6">

                {/* ═══ TAB 1: TODAY'S RUNNING CLASSES & REAL-TIME CLASSROOM MONITOR ═══ */}
                {activeAdminTab === 'runningClasses' && (
                  <div className="space-y-6">
                    {/* Top Monitor Status Banner */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FFFFFF] border border-slate-200 shadow-xs rounded-2xl p-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                          </span>
                          <span className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#172B4D]">
                            Live Faculty & Classroom Tracking
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-[#172B4D] tracking-tight">
                          Today's Running Classes & Real-Time Monitor
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Real-time attendance check-ins, punctuality verification & vacancy alerts for{' '}
                          <span className="font-bold text-[#172B4D] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {runningClassesPeriodFilter === 'all' ? "All Today's Periods" : `Period ${activeMonitorPeriodNum || currentPeriodNum || 1} (${activePeriodSlotInfo.timeSlot})`}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => refreshDashboard(true)}
                          className="flex items-center gap-2 px-3.5 py-2 bg-[#FFFFFF] hover:bg-slate-100 text-[#172B4D] rounded-xl text-xs font-bold border border-slate-200 shadow-xs transition-all cursor-pointer"
                          title="Refresh live classroom logs"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#172B4D]" />
                          <span>Sync Live Status</span>
                        </button>
                      </div>
                    </div>

                    {/* Live Metric Cards / Interactive Punctuality Filter Counters */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                      {/* Total Classes */}
                      <button
                        type="button"
                        onClick={() => setRunningClassesPunctualityFilter('All')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                          runningClassesPunctualityFilter === 'All'
                            ? 'bg-slate-50 border-[#29456D] ring-2 ring-[#1E3A8A]/20'
                            : 'bg-[#FFFFFF] hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500">All Tracked</div>
                        <div className="text-2xl font-black mt-1 text-[#172B4D]">{rcStats.total}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Running Classes</div>
                      </button>

                      {/* On-Time Faculty */}
                      <button
                        type="button"
                        onClick={() => setRunningClassesPunctualityFilter('on-time')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                          runningClassesPunctualityFilter === 'on-time'
                            ? 'bg-emerald-50/60 border-emerald-600 ring-2 ring-emerald-600/25'
                            : 'bg-[#FFFFFF] hover:bg-emerald-50/30 border-slate-200'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span> On Time
                        </div>
                        <div className="text-2xl font-black mt-1 text-emerald-700">{rcStats.onTime}</div>
                        <div className="text-[10px] text-emerald-700/80 mt-0.5 font-medium">Prompt Arrival</div>
                      </button>

                      {/* Late 5-10 Min (Yellow) */}
                      <button
                        type="button"
                        onClick={() => setRunningClassesPunctualityFilter('yellow')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                          runningClassesPunctualityFilter === 'yellow'
                            ? 'bg-[#FFFBEB] border-[#D97706] ring-2 ring-[#D97706]/25'
                            : 'bg-[#FFFFFF] hover:bg-[#FFFBEB]/50 border-slate-200'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-extrabold tracking-wider text-amber-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#D97706]"></span> Late 5-10m
                        </div>
                        <div className="text-2xl font-black mt-1 text-amber-700">{rcStats.lateYellow}</div>
                        <div className="text-[10px] text-amber-700/80 mt-0.5 font-medium">Yellow Warning</div>
                      </button>

                      {/* Late 10-15 Min (Orange) */}
                      <button
                        type="button"
                        onClick={() => setRunningClassesPunctualityFilter('orange')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                          runningClassesPunctualityFilter === 'orange'
                            ? 'bg-[#FFF7ED] border-[#EA580C] ring-2 ring-[#EA580C]/25'
                            : 'bg-[#FFFFFF] hover:bg-[#FFF7ED]/50 border-slate-200'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-extrabold tracking-wider text-[#B45309] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#EA580C]"></span> Late 10-15m
                        </div>
                        <div className="text-2xl font-black mt-1 text-[#B45309]">{rcStats.lateOrange}</div>
                        <div className="text-[10px] text-[#B45309]/80 mt-0.5 font-medium">Orange + Notice</div>
                      </button>

                      {/* Late > 15 Min (Red) */}
                      <button
                        type="button"
                        onClick={() => setRunningClassesPunctualityFilter('red')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                          runningClassesPunctualityFilter === 'red'
                            ? 'bg-[#FEF2F2] border-[#DC2626] ring-2 ring-[#DC2626]/25'
                            : 'bg-[#FFFFFF] hover:bg-[#FEF2F2]/50 border-slate-200'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-extrabold tracking-wider text-[#B91C1C] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#DC2626]"></span> Late &gt;15m
                        </div>
                        <div className="text-2xl font-black mt-1 text-[#B91C1C]">{rcStats.lateRed}</div>
                        <div className="text-[10px] text-[#B91C1C]/80 mt-0.5 font-medium">Full Red + Notice</div>
                      </button>

                      {/* Vacant / No Teacher */}
                      <button
                        type="button"
                        onClick={() => setRunningClassesPunctualityFilter('vacant')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                          runningClassesPunctualityFilter === 'vacant'
                            ? 'bg-[#FEF2F2] border-[#991B1B] ring-2 ring-[#991B1B]/25'
                            : 'bg-[#FFFFFF] hover:bg-[#FEF2F2]/40 border-slate-200'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-extrabold tracking-wider text-[#991B1B] flex items-center gap-1.5">
                          <AlertTriangle className="w-2.5 h-2.5 text-[#DC2626]" /> Vacant
                        </div>
                        <div className="text-2xl font-black mt-1 text-[#991B1B]">{rcStats.vacant}</div>
                        <div className="text-[10px] text-[#991B1B]/80 mt-0.5 font-medium">No Faculty</div>
                      </button>

                      {/* Substitute Assigned */}
                      <button
                        type="button"
                        onClick={() => setRunningClassesPunctualityFilter('substitute')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                          runningClassesPunctualityFilter === 'substitute'
                            ? 'bg-[#FAF5FF] border-[#6B46C1] ring-2 ring-[#6B46C1]/25'
                            : 'bg-[#FFFFFF] hover:bg-[#FAF5FF]/50 border-slate-200'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-extrabold tracking-wider text-[#6B46C1] flex items-center gap-1.5">
                          <RefreshCw className="w-2.5 h-2.5 text-[#6B46C1]" /> Substitute
                        </div>
                        <div className="text-2xl font-black mt-1 text-[#6B46C1]">{rcStats.substitute}</div>
                        <div className="text-[10px] text-[#6B46C1]/80 mt-0.5 font-medium">Alternate Faculty</div>
                      </button>
                    </div>

                    {/* Principal Filtering & Selection Bar */}
                    <div className="bg-[#FFFFFF] border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                        {/* Left Controls: Period & Class Multi-Selector */}
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                          {/* Period Selector */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wide flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#172B4D]" />
                              <span>Period:</span>
                            </span>
                            <select
                              value={runningClassesPeriodFilter}
                              onChange={(e) => setRunningClassesPeriodFilter(e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none text-[#172B4D] focus:ring-2 focus:ring-[#93C5FD]/15 focus:border-[#29456D] cursor-pointer"
                            >
                              <option value="current">⚡ Current Period {currentPeriodNum ? `(P${currentPeriodNum})` : ''}</option>
                              <option value="all">All Today's Periods</option>
                              {calculatedPeriods.map(p => (
                                <option key={p.period} value={p.period.toString()}>
                                  Period {p.period} ({p.timeSlot})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Multi-Class Quick Select Dropdown for Principal */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wide flex items-center gap-1.5">
                              <School className="w-3.5 h-3.5 text-[#172B4D]" />
                              <span>Filter Classes:</span>
                            </span>
                            <select
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val) return;
                                if (val === '__ALL__') {
                                  setSelectedRunningClasses([]);
                                } else if (!selectedRunningClasses.includes(val)) {
                                  setSelectedRunningClasses(prev => [...prev, val]);
                                }
                                e.target.value = '';
                              }}
                              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none text-[#172B4D] focus:ring-2 focus:ring-[#93C5FD]/15 focus:border-[#29456D] cursor-pointer"
                              defaultValue=""
                            >
                              <option value="" disabled>+ Add Class to View...</option>
                              <option value="__ALL__">All Classes (Show All)</option>
                              {allClasses.map(cls => {
                                const key = `${cls.standard}-${cls.section}`;
                                const isAlreadySelected = selectedRunningClasses.includes(key) || selectedRunningClasses.includes(cls._id?.toString());
                                return (
                                  <option key={cls._id || cls.id} value={key} disabled={isAlreadySelected}>
                                    {isAlreadySelected ? '✓ ' : ''}Class {cls.standard} - {cls.section} ({cls.board || 'CBSE'})
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>

                        {/* Right Controls: View Mode & Search */}
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                          {/* Search Input */}
                          <div className="relative flex-1 sm:w-56">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                            <input
                              type="text"
                              value={adminTabSearch}
                              onChange={(e) => setAdminTabSearch(e.target.value)}
                              placeholder="Search teacher, subject..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium outline-none focus:border-[#29456D] text-[#172B4D] placeholder-slate-400"
                            />
                            {adminTabSearch && (
                              <button
                                type="button"
                                onClick={() => setAdminTabSearch('')}
                                className="absolute right-2.5 top-2 text-slate-500 hover:text-[#172B4D]"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* View Toggle */}
                          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setRunningClassesViewMode('cards')}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                runningClassesViewMode === 'cards'
                                  ? 'bg-[#FFFFFF] text-[#172B4D] shadow-xs'
                                  : 'text-slate-500 hover:text-[#172B4D]'
                              }`}
                              title="Grid Cards View"
                            >
                              <LayoutGrid className="w-3.5 h-3.5" />
                              <span>Cards</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRunningClassesViewMode('table')}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                runningClassesViewMode === 'table'
                                  ? 'bg-[#FFFFFF] text-[#172B4D] shadow-xs'
                                  : 'text-slate-500 hover:text-[#172B4D]'
                              }`}
                              title="Compact Table View"
                            >
                              <List className="w-3.5 h-3.5" />
                              <span>Table</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Selected Classes Chips (Principal view) */}
                      {selectedRunningClasses.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Viewing Selected Classes ({selectedRunningClasses.length}):
                          </span>
                          {selectedRunningClasses.map(clsKey => (
                            <span
                              key={clsKey}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-[#172B4D] border border-slate-200"
                            >
                              <span>Class {clsKey}</span>
                              <button
                                type="button"
                                onClick={() => setSelectedRunningClasses(prev => prev.filter(k => k !== clsKey))}
                                className="hover:text-rose-600 transition-colors cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => setSelectedRunningClasses([])}
                            className="text-xs text-rose-700 hover:text-rose-800 font-bold underline ml-1 cursor-pointer"
                          >
                            Clear Selection (View All)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Classes Display: Grid View or Table View */}
                    {filteredRunningClasses.length === 0 ? (
                      <div className="bg-[#FFFFFF] border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-3">
                        <div className="w-12 h-12 bg-slate-50 text-[#172B4D] rounded-full flex items-center justify-center text-xl mx-auto border border-slate-200">
                          🔍
                        </div>
                        <h4 className="text-base font-bold text-[#172B4D]">No Classes Matching Current Filters</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          No active classroom sessions match your punctuality status or class selection filter.
                        </p>
                        <div className="pt-2 flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRunningClassesPunctualityFilter('All');
                              setSelectedRunningClasses([]);
                              setAdminTabSearch('');
                            }}
                            className="px-4 py-2 bg-[#29456D] hover:bg-blue-900 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                          >
                            Reset All Filters
                          </button>
                        </div>
                      </div>
                    ) : runningClassesViewMode === 'cards' ? (
                      /* ── CARDS GRID VIEW ── */
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredRunningClasses.map(item => {
                          // Determine card border & background highlight in institutional palette
                          let borderClass = 'border-slate-200 bg-[#FFFFFF]';
                          let badgeBg = 'bg-slate-50 text-slate-500 border-slate-200';
                          let badgeText = 'Scheduled';

                          if (item.isFreePeriod) {
                            borderClass = 'border-slate-200 bg-slate-50';
                            badgeBg = 'bg-slate-50 text-slate-500 border-slate-200';
                            badgeText = 'Free Period';
                          } else if (item.isVacant) {
                            borderClass = 'border-[#FECACA] bg-[#FEF2F2]/50 shadow-[0_2px_8px_rgba(220,38,38,0.06)]';
                            badgeBg = 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA] font-bold';
                            badgeText = 'Vacant • No Faculty';
                          } else if (item.isSubstitute) {
                            borderClass = 'border-[#E2D8F0] bg-[#FAF5FF]/40 shadow-[0_2px_8px_rgba(107,70,193,0.04)]';
                            badgeBg = 'bg-[#F3EFF8] text-[#6B46C1] border-[#E2D8F0] font-bold';
                            badgeText = '🔄 Substitute';
                          } else if (item.lateSeverity === 'red') {
                            borderClass = 'border-[#FCA5A5] bg-[#FEF2F2]/70 ring-1 ring-[#DC2626]/20 shadow-[0_2px_8px_rgba(220,38,38,0.08)]';
                            badgeBg = 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA] font-extrabold';
                            badgeText = `🔴 Too Late (+${item.lateMinutes}m)`;
                          } else if (item.lateSeverity === 'orange') {
                            borderClass = 'border-[#FED7AA] bg-[#FFF7ED]/60 ring-1 ring-[#EA580C]/20 shadow-[0_2px_8px_rgba(234,88,12,0.06)]';
                            badgeBg = 'bg-[#FFF4EC] text-[#B45309] border-[#FED7AA] font-extrabold';
                            badgeText = `🟠 Late (+${item.lateMinutes}m)`;
                          } else if (item.lateSeverity === 'yellow') {
                            borderClass = 'border-[#FDE68A] bg-[#FFFBEB]/60 ring-1 ring-[#D97706]/15 shadow-[0_2px_8px_rgba(217,119,6,0.04)]';
                            badgeBg = 'bg-amber-50 text-amber-700 border-amber-200 font-extrabold';
                            badgeText = `🟡 Late (+${item.lateMinutes}m)`;
                          } else if (item.hasTeacher && item.lateSeverity === 'on-time') {
                            borderClass = 'border-emerald-200 bg-[#FFFFFF] hover:border-emerald-600/60';
                            badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
                            badgeText = '🟢 On-Time';
                          }

                          return (
                            <div
                              key={item.id}
                              className={`rounded-2xl border p-4.5 transition-all shadow-xs hover:shadow-[0_4px_16px_rgba(30,40,35,0.08)] flex flex-col justify-between ${borderClass}`}
                            >
                              {/* Header: Class & Status Badge */}
                              <div>
                                <div className="flex justify-between items-start gap-2 mb-2">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <h4 className="font-bold text-base text-[#172B4D]">{item.className}</h4>
                                      <span className="text-[10px] font-semibold text-slate-500 font-mono">({item.room})</span>
                                    </div>
                                    <span className="text-[11px] text-[#172B4D] font-semibold font-mono">
                                      Period {item.period} • {item.timeSlot}
                                    </span>
                                  </div>
                                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border shrink-0 uppercase tracking-tight ${badgeBg}`}>
                                    {badgeText}
                                  </span>
                                </div>

                                {/* Subject */}
                                <div className="my-2.5 pt-2 border-t border-slate-200/70">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#172B4D]">
                                    <BookOpen className="w-3.5 h-3.5 text-[#172B4D]" />
                                    <span>{item.subjectName}</span>
                                  </div>
                                </div>

                                {/* Teacher & Attendance State */}
                                {item.isVacant ? (
                                  <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs my-2 space-y-1">
                                    <div className="font-bold flex items-center gap-1.5 text-[#991B1B]">
                                      <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />
                                      <span>Faculty Absent / Unassigned</span>
                                    </div>
                                    <p className="text-[11px] text-[#B91C1C] leading-tight">
                                      No teacher has checked into this class. Students are currently unattended.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs my-2 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <div className="font-bold text-[#172B4D] flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-[#e2e8f0] text-[#172B4D] flex items-center justify-center text-[10px] font-black">
                                          {item.teacherName.charAt(0)}
                                        </div>
                                        <span className="truncate max-w-[150px]">{item.teacherName}</span>
                                      </div>
                                      <span className="text-[10px] font-mono text-slate-500">
                                        {item.employeeId}
                                      </span>
                                    </div>

                                    {item.isSubstitute && (
                                      <div className="text-[10px] text-[#6B46C1] font-bold bg-[#F3EFF8] px-2 py-0.5 rounded border border-[#E2D8F0]">
                                        ↳ Sub: {item.substituteName}
                                      </div>
                                    )}

                                    {item.checkInTime && (
                                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60">
                                        <span className="text-slate-500">Check-In:</span>
                                        <span className="font-mono font-bold text-[#172B4D]">{item.checkInTime}</span>
                                      </div>
                                    )}

                                    {item.lateMinutes >= 5 && (
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-slate-500">Arrival Delay:</span>
                                        <span className={`font-mono font-bold ${
                                          item.lateSeverity === 'red' ? 'text-[#B91C1C]' :
                                          item.lateSeverity === 'orange' ? 'text-[#B45309]' : 'text-amber-700'
                                        }`}>
                                          +{item.lateMinutes} mins late
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Card Action / Status Footer (Reflects Down According to Status) */}
                              <div className="pt-2.5 border-t border-slate-200/70 mt-1">
                                {item.isFreePeriod ? (
                                  /* Free Period / Self Study */
                                  <div className="text-center py-2 px-3 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Free Period • Self Study</span>
                                  </div>
                                ) : item.isVacant ? (
                                  /* Vacant - No Teacher */
                                  <div className="space-y-1.5">
                                    <div className="text-center py-1.5 px-2 text-[11px] font-bold text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-center justify-center gap-1.5">
                                      <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />
                                      <span>Vacant • No Faculty Assigned</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleArrangeSubstituteDirect(
                                        item.teacherId,
                                        item.teacherName,
                                        getLocalDateString(),
                                        item.periodEntryId || item.id
                                      )}
                                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#29456D] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5 text-[#172B4D]" />
                                      <span>Assign Substitute Faculty</span>
                                    </button>
                                  </div>
                                ) : item.lateSeverity === 'red' ? (
                                  /* Too Late (15m+ late): Full Red + Notice */
                                  <div className="space-y-1.5">
                                    <div className="text-center py-1.5 px-2 text-[11px] font-bold text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-center justify-center gap-1.5">
                                      <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />
                                      <span>Too Late (+{item.lateMinutes}m delay)</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenLateNoticeModal(item)}
                                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-xs transition-all cursor-pointer"
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                      <span>Send Late Notice (Urgent)</span>
                                    </button>
                                    {item.noticeInfo && (
                                      <div className="text-[10px] text-center text-[#B91C1C] font-semibold">
                                        ✓ Official notice already issued
                                      </div>
                                    )}
                                  </div>
                                ) : item.lateSeverity === 'orange' ? (
                                  /* Late 10-15m: Orange + Notice */
                                  <div className="space-y-1.5">
                                    <div className="text-center py-1.5 px-2 text-[11px] font-bold text-[#B45309] bg-[#FFF4EC] border border-[#FED7AA] rounded-xl flex items-center justify-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-[#EA580C]" />
                                      <span>Late (+{item.lateMinutes}m delay)</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenLateNoticeModal(item)}
                                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-[#EA580C] hover:bg-[#C2410C] text-white shadow-xs transition-all cursor-pointer"
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                      <span>Send Late Notice</span>
                                    </button>
                                    {item.noticeInfo && (
                                      <div className="text-[10px] text-center text-[#B45309] font-semibold">
                                        ✓ Official notice already issued
                                      </div>
                                    )}
                                  </div>
                                ) : item.lateSeverity === 'yellow' ? (
                                  /* Late 5-10m: Yellow color warning down at the bottom */
                                  <div className="space-y-1">
                                    <div className="text-center py-1.5 px-2 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                                      <span>Late (+{item.lateMinutes}m warning)</span>
                                    </div>
                                    {item.noticeInfo ? (
                                      <div className="text-[10px] text-center text-amber-700 font-semibold">
                                        ✓ Notice issued
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenLateNoticeModal(item)}
                                        className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold block mx-auto hover:underline cursor-pointer"
                                      >
                                        Send Notice (Optional)
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  /* Running On-Time */
                                  <div className="text-center py-2 px-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Running On-Time • Verified Present</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* ── COMPACT TABLE VIEW ── */
                      <div className="bg-[#FFFFFF] border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[#172B4D] font-extrabold uppercase tracking-wider text-[11px]">
                                <th className="py-3 px-4">Class & Room</th>
                                <th className="py-3 px-4">Period & Time</th>
                                <th className="py-3 px-4">Subject</th>
                                <th className="py-3 px-4">Teacher & ID</th>
                                <th className="py-3 px-4">Check-In Time</th>
                                <th className="py-3 px-4 text-center">Punctuality Status</th>
                                <th className="py-3 px-4 text-right">Principal Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e2e8f0]/60">
                              {filteredRunningClasses.map(item => {
                                return (
                                  <tr
                                    key={item.id}
                                    className={`hover:bg-slate-50/80 transition-colors ${
                                      item.lateSeverity === 'red' ? 'bg-[#FEF2F2]/40' :
                                      item.lateSeverity === 'orange' ? 'bg-[#FFF7ED]/30' :
                                      item.lateSeverity === 'yellow' ? 'bg-[#FFFBEB]/30' :
                                      item.isVacant ? 'bg-[#FEF2F2]/50' : ''
                                    }`}
                                  >
                                    <td className="py-3.5 px-4 font-bold text-[#172B4D]">
                                      <div className="font-bold text-sm text-[#172B4D]">{item.className}</div>
                                      <div className="text-[10px] text-slate-500 font-mono">{item.room} • {item.board}</div>
                                    </td>
                                    <td className="py-3.5 px-4 font-mono">
                                      <div className="font-bold text-[#172B4D]">Period {item.period}</div>
                                      <div className="text-[10px] text-slate-500">{item.timeSlot}</div>
                                    </td>
                                    <td className="py-3.5 px-4 font-semibold text-[#172B4D]">
                                      {item.subjectName}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <div className="font-bold text-[#172B4D]">{item.teacherName}</div>
                                      <div className="text-[10px] font-mono text-slate-500">{item.employeeId}</div>
                                      {item.isSubstitute && (
                                        <div className="text-[10px] text-[#6B46C1] font-semibold">↳ Sub: {item.substituteName}</div>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4 font-mono font-medium text-[#172B4D]">
                                      {item.checkInTime || '—'}
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                      {item.isFreePeriod ? (
                                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200">
                                          📖 Free Period
                                        </span>
                                      ) : item.isVacant ? (
                                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
                                          🚨 Vacant Class
                                        </span>
                                      ) : item.lateSeverity === 'red' ? (
                                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
                                          🔴 &gt;15m Late (+{item.lateMinutes}m)
                                        </span>
                                      ) : item.lateSeverity === 'orange' ? (
                                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#FFF4EC] text-[#B45309] border border-[#FED7AA]">
                                          🟠 10-15m Late (+{item.lateMinutes}m)
                                        </span>
                                      ) : item.lateSeverity === 'yellow' ? (
                                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                          🟡 5-10m Late (+{item.lateMinutes}m)
                                        </span>
                                      ) : item.hasTeacher ? (
                                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          🟢 Running On-Time
                                        </span>
                                      ) : (
                                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-500 bg-slate-50">
                                          Scheduled
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                      {item.isFreePeriod ? (
                                        <span className="text-xs font-medium text-slate-500">No Faculty Required</span>
                                      ) : item.isVacant ? (
                                        <button
                                          type="button"
                                          onClick={() => handleArrangeSubstituteDirect(
                                            item.teacherId,
                                            item.teacherName,
                                            getLocalDateString(),
                                            item.periodEntryId || item.id
                                          )}
                                          className="px-3.5 py-1.5 bg-[#29456D] hover:bg-blue-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                                        >
                                          🔄 Assign Sub
                                        </button>
                                      ) : ['orange', 'red'].includes(item.lateSeverity) ? (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenLateNoticeModal(item)}
                                          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs ${
                                            item.lateSeverity === 'red'
                                              ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white'
                                              : 'bg-[#EA580C] hover:bg-[#C2410C] text-white'
                                          }`}
                                        >
                                          ✉️ Send Notice
                                        </button>
                                      ) : item.lateSeverity === 'yellow' ? (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenLateNoticeModal(item)}
                                          className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[11px] font-bold hover:bg-[#FFF3D6] cursor-pointer"
                                        >
                                          🟡 5m+ Warning
                                        </button>
                                      ) : (
                                        <span className="text-xs font-bold text-emerald-700">✓ On Track</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ TAB: DAILY TIMETABLE ═══ */}
                {activeAdminTab === 'todayTimetable' && (
                  <div>
                    {(() => {
                      const effectiveGridDay = dashboardDayFilter === 'Today'
                        ? (weekdays[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] || 'Wednesday')
                        : dashboardDayFilter;

                      const periodsForDailyGrid = (adminData?.weeklyTimetable || []).filter(e => {
                        if (dashboardDayFilter === 'All Days') return true;
                        return e.day === effectiveGridDay;
                      });

                      const dailyGridEntries = periodsForDailyGrid.length > 0
                        ? periodsForDailyGrid
                        : (dashboardDayFilter === 'Today' ? (adminData?.allTodayPeriods || []) : []);

                      const targetClassObj = dashboardClassFilter !== 'All'
                        ? allClasses.find(c => c._id?.toString() === dashboardClassFilter || c.id?.toString() === dashboardClassFilter || `${c.standard}-${c.section}` === dashboardClassFilter)
                        : null;

                      const thisClassWeeklySlots = targetClassObj
                        ? (adminData?.weeklyTimetable || []).filter(e => {
                            const cid = e.classId || e.class?._id || e.class?.id || e.class;
                            const matchId = cid && (cid.toString() === targetClassObj._id?.toString() || cid.toString() === targetClassObj.id?.toString());
                            const matchStdSec = e.standard && e.section && targetClassObj.standard === e.standard && targetClassObj.section === e.section;
                            return matchId || matchStdSec;
                          })
                        : [];

                      const hasSlotsOnOtherDays = targetClassObj && thisClassWeeklySlots.length > 0 && !thisClassWeeklySlots.some(s => s.day === effectiveGridDay);
                      const otherDaysNames = Array.from(new Set(thisClassWeeklySlots.map(s => s.day)));

                      return (
                        <div>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-bold text-stone-850 flex items-center gap-2">
                                📋 {dashboardDayFilter === 'Today' ? `Today's Timetable (${effectiveGridDay})` : `${dashboardDayFilter}'s Timetable`}
                              </h3>
                              {dashboardClassFilter !== 'All' && targetClassObj && (
                                <span className="text-xs bg-blue-50 text-[#172B4D] font-bold px-3 py-1 rounded-full border border-blue-200 shadow-2xs">
                                  Class {targetClassObj.standard} - {targetClassObj.section}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveAdminTab('weeklyTimetable')}
                                className="text-xs font-bold text-[#172B4D] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                              >
                                <span>📅</span> View Full Weekly Timetable
                              </button>
                            </div>
                          </div>

                          {/* Smart helper banner when class has slots on other days */}
                          {hasSlotsOnOtherDays && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">💡</span>
                                <div>
                                  <p className="text-xs font-extrabold text-amber-900">
                                    Class {targetClassObj.standard}-{targetClassObj.section} has {thisClassWeeklySlots.length} slot(s) scheduled on {otherDaysNames.join(', ')}, but none on {effectiveGridDay} ({dashboardDayFilter}).
                                  </p>
                                  <p className="text-[11px] text-amber-700 mt-0.5">
                                    {thisClassWeeklySlots.map(s => `${s.day} P${s.period}: ${s.subject} (${s.teacher})`).join(' • ')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {otherDaysNames.map(dayName => (
                                  <button
                                    key={dayName}
                                    type="button"
                                    onClick={() => setDashboardDayFilter(dayName)}
                                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-2xs cursor-pointer"
                                  >
                                    📅 View {dayName}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setActiveAdminTab('weeklyTimetable')}
                                  className="px-3 py-1.5 bg-[#29456D] hover:bg-[#29456D]/90 text-white font-bold text-xs rounded-xl transition-all shadow-2xs cursor-pointer"
                                >
                                  🗓️ Weekly Matrix
                                </button>
                              </div>
                            </div>
                          )}

                          {dailyGridEntries.length === 0 ? (
                            <div className="text-center py-12 bg-stone-50 border border-dashed border-stone-200 rounded-2xl p-8">
                              <p className="text-stone-500 font-bold text-sm">No periods scheduled for {dashboardDayFilter === 'Today' ? `Today (${effectiveGridDay})` : dashboardDayFilter}.</p>
                              <p className="text-stone-400 text-xs mt-1">Select another day from the Day dropdown above or switch to Weekly Timetable.</p>
                              <div className="mt-4 flex items-center justify-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setActiveAdminTab('weeklyTimetable')}
                                  className="px-4 py-2 bg-[#29456D] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#29456D]/90 transition-all cursor-pointer"
                                >
                                  📅 Open Weekly Timetable
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {renderTimetableGrid('today', dailyGridEntries, false)}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}



                {/* ═══ TAB 4: TEACHER SCHEDULE ═══ */}
                {activeAdminTab === 'teacherSchedule' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-stone-850 flex items-center gap-2">
                          <span>👨‍🏫</span> Teacher Schedule Overview
                        </h3>
                        <p className="text-stone-500 text-xs mt-0.5">Assigned subjects, class allocations, and weekly schedule breakdown.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {dashboardClassFilter !== 'All' && (
                          <span className="text-xs bg-blue-50 text-[#172B4D] font-bold px-3 py-1 rounded-full border border-blue-200 shadow-2xs">
                            Filtered: {dashboardClassFilter}
                          </span>
                        )}
                        <span className="text-xs text-stone-600 bg-stone-100 border border-stone-200 px-3 py-1 rounded-full font-bold">
                          {teacherSchedules.length} {teacherSchedules.length === 1 ? 'Faculty' : 'Faculty Members'}
                        </span>
                      </div>
                    </div>

                    {teacherSchedules.length === 0 ? (
                      <div className="text-center py-12 bg-white border border-dashed border-stone-200 rounded-2xl p-8">
                        <p className="text-stone-500 font-bold text-sm">No teacher schedules match your criteria.</p>
                        <p className="text-stone-400 text-xs mt-1">Try resetting the search or class filter.</p>
                      </div>
                    ) : (
                      <div className="border border-stone-200 rounded-2xl shadow-xs bg-white overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-3.5 px-4 text-left">Teacher Name</th>
                                <th className="py-3.5 px-4 text-left">Employee ID</th>
                                <th className="py-3.5 px-4 text-left">Subject(s)</th>
                                <th className="py-3.5 px-4 text-left">Classes Assigned</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                              {teacherSchedules.map((t, idx) => {
                                const initials = (t.name || 'F')
                                  .split(' ')
                                  .filter(Boolean)
                                  .map(w => w[0])
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase();
                                const distinctClasses = t.subjects.flatMap(s => s.classes).filter((v, i, a) => a.indexOf(v) === i);
                                const totalWorkload = t.totalPeriods || (distinctClasses.length > 0 ? distinctClasses.length * 3 : 0);

                                return (
                                  <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="py-3.5 px-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#172B4D] to-[#29456D] text-white flex items-center justify-center text-xs font-black shadow-xs shrink-0">
                                          {initials}
                                        </div>
                                        <div>
                                          <div className="font-bold text-sm text-stone-900 leading-tight">{t.name}</div>
                                          <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-2">
                                            <span>📅 {totalWorkload} periods/week</span>
                                            {distinctClasses.length > 0 && <span>• {distinctClasses.length} classes</span>}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-md">
                                        {t.employeeId || '—'}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                                        {t.subjects.length === 0 ? (
                                          <span className="text-stone-400 italic text-[11px]">General Faculty</span>
                                        ) : (
                                          t.subjects.map((s, i) => (
                                            <span
                                              key={i}
                                              className="bg-blue-50 text-[#172B4D] border border-blue-200/80 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-2xs flex items-center gap-1"
                                            >
                                              <span>📖</span> {s.name}
                                            </span>
                                          ))
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <div className="flex flex-wrap gap-1.5 max-w-[420px]">
                                        {distinctClasses.length === 0 ? (
                                          <span className="text-stone-400 italic text-[11px]">No classes assigned</span>
                                        ) : (
                                          distinctClasses.map((c, i) => (
                                            <span
                                              key={i}
                                              className="bg-stone-50 hover:bg-stone-100 text-stone-800 border border-stone-200 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors"
                                            >
                                              {c}
                                            </span>
                                          ))
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ TAB 5: CLASS SCHEDULE ═══ */}
                {activeAdminTab === 'classSchedule' && (
                  <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-stone-850 flex items-center gap-2">
                          🏫 Class Schedule — {dashboardDayFilter === 'Today' ? 'Today' : dashboardDayFilter}
                        </h3>
                        {dashboardClassFilter !== 'All' && (
                          <span className="text-xs bg-blue-50 text-[#172B4D] font-bold px-3 py-1 rounded-full border border-blue-200 shadow-2xs">
                            {(() => {
                              const c = (allClasses || adminData?.allClasses || []).find(x => x._id?.toString() === dashboardClassFilter || x.id?.toString() === dashboardClassFilter || `${x.standard}-${x.section}` === dashboardClassFilter);
                              return c ? `Class ${c.standard}-${c.section} (${c.board || 'CBSE'})` : dashboardClassFilter;
                            })()}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-stone-400 font-normal ml-auto">
                        {classSchedules.length} {classSchedules.length === 1 ? 'class' : 'classes'}
                      </span>
                    </div>

                    {classSchedules.length === 0 ? (
                      <p className="text-stone-400 text-xs italic text-center py-12">No class schedule data found for this selection.</p>
                    ) : (
                      <div className="space-y-6">
                        {/* Dedicated Single-Class Period Breakdown Card when a specific class is selected */}
                        {dashboardClassFilter !== 'All' && classSchedules.map(cls => (
                          <div key={cls.classId || `${cls.standard}-${cls.section}`} className="bg-stone-50 border border-stone-200 rounded-2xl p-5 shadow-xs">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 mb-4 border-b border-stone-200">
                              <div>
                                <h4 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                                  Class {cls.standard} - Section {cls.section}
                                  <span className="text-xs font-normal text-stone-500 bg-white border border-stone-200 px-2 py-0.5 rounded-md">{cls.board || 'CBSE'}</span>
                                  {cls.roomNumber && <span className="text-xs font-normal text-stone-500 bg-white border border-stone-200 px-2 py-0.5 rounded-md">Room: {cls.roomNumber}</span>}
                                </h4>
                                <p className="text-xs text-stone-500 mt-1">
                                  Total Students: <strong className="text-stone-800">{cls.strength}</strong> • Scheduled Periods: <strong className="text-[#172B4D]">{cls.periods.length}</strong>
                                </p>
                              </div>
                              <span className="text-xs font-bold text-stone-600 bg-white border border-stone-200 px-3 py-1 rounded-xl">
                                Day: {dashboardDayFilter === 'Today' ? 'Today' : dashboardDayFilter}
                              </span>
                            </div>

                            {/* Smart notice if class has slots on other days */}
                            {(() => {
                              const clsWeeklyAll = (adminData?.weeklyTimetable || []).filter(e => {
                                const cid = e.classId || e.class?._id || e.class?.id || e.class;
                                const matchId = Boolean(cid && (cid.toString() === cls.classId?.toString()));
                                const matchStdSec = Boolean(e.standard && e.section && cls.standard && cls.section && e.standard === cls.standard && e.section === cls.section);
                                return matchId || matchStdSec;
                              });

                              if (cls.periods.length === 0 && clsWeeklyAll.length > 0) {
                                const otherDays = Array.from(new Set(clsWeeklyAll.map(s => s.day)));
                                return (
                                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div>
                                      <p className="text-xs font-bold text-amber-900">
                                        💡 Class {cls.standard}-{cls.section} has {clsWeeklyAll.length} period(s) scheduled on {otherDays.join(', ')}, but none on {dashboardDayFilter === 'Today' ? `Today (${effectiveDay})` : dashboardDayFilter}.
                                      </p>
                                      <p className="text-[11px] text-amber-700 mt-0.5">
                                        {clsWeeklyAll.map(s => `${s.day} P${s.period}: ${s.subject} (${s.teacher})`).join(' • ')}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {otherDays.map(d => (
                                        <button
                                          key={d}
                                          type="button"
                                          onClick={() => setDashboardDayFilter(d)}
                                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-all shadow-2xs cursor-pointer"
                                        >
                                          View {d}
                                        </button>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => setActiveAdminTab('weeklyTimetable')}
                                        className="px-2.5 py-1 bg-[#29456D] hover:bg-[#29456D]/90 text-white font-bold text-xs rounded-lg transition-all shadow-2xs cursor-pointer"
                                      >
                                        Weekly Matrix
                                      </button>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Periods Cards Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                              {calculatedPeriods.map(pInfo => {
                                const pEntry = cls.periods.find(p => Number(p.period) === Number(pInfo.period));
                                return (
                                  <div
                                    key={pInfo.period}
                                    className={`rounded-xl p-3 border transition-all ${
                                      pEntry
                                        ? 'bg-white border-blue-200 shadow-2xs hover:shadow-sm'
                                        : 'bg-stone-100/50 border-stone-200 opacity-60'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-stone-100">
                                      <span className="font-extrabold text-xs text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
                                        P{pInfo.period}
                                      </span>
                                      <span className="text-[10px] font-mono text-stone-400">
                                        {pInfo.timeSlot}
                                      </span>
                                    </div>
                                    {pEntry ? (
                                      <div className="space-y-1.5">
                                        <p className="font-bold text-xs text-stone-900 leading-tight">
                                          {pEntry.subject}
                                        </p>
                                        <p className="text-[11px] text-stone-600 flex items-center gap-1 truncate" title={pEntry.teacher}>
                                          <span>👨‍🏫</span> <span className="truncate">{pEntry.teacher}</span>
                                        </p>
                                        <div className="pt-1">
                                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                            pEntry.taken ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-blue-100 text-[#172B4D] border border-blue-200'
                                          }`}>
                                            {pEntry.taken ? '✓ Taken' : 'Scheduled'}
                                          </span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="py-3 text-center">
                                        <span className="text-[11px] text-stone-400 italic">Free Period</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {/* Full Matrix Table */}
                        <div className="overflow-x-auto border border-stone-200 rounded-2xl bg-white shadow-xs">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-stone-200 bg-stone-50/90 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-3 px-4 text-left border-r border-stone-200 sticky left-0 bg-stone-50 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.03)] w-[110px] min-w-[110px]">Class</th>
                                <th className="py-3 px-3 text-center border-r border-stone-200 w-[70px] min-w-[70px]">Students</th>
                                {calculatedPeriods.map(p => (
                                  <th key={p.period} className="py-3 px-3 text-center min-w-[120px] border-r border-stone-200">
                                    <span className="font-extrabold text-stone-850">P{p.period}</span>
                                    <span className="block text-[9px] font-mono font-normal text-stone-400 mt-0.5">{p.timeSlot}</span>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                              {classSchedules.map((cls, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                                  <td className="py-3.5 px-4 font-bold text-stone-900 border-r border-stone-200 whitespace-nowrap sticky left-0 bg-white z-10 shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                                    <div className="text-xs font-black text-stone-850">
                                      {cls.standard} - {cls.section}
                                    </div>
                                    <span className="text-[9px] text-stone-400 font-medium">({cls.board})</span>
                                  </td>
                                  <td className="py-3 px-3 text-center font-mono font-bold text-stone-600 border-r border-stone-200 bg-stone-50/30">
                                    {cls.strength}
                                  </td>
                                  {calculatedPeriods.map(pInfo => {
                                    const pEntry = cls.periods.find(p => Number(p.period) === Number(pInfo.period));
                                    return (
                                      <td key={pInfo.period} className={`py-2.5 px-3 text-center border-r border-stone-100 ${
                                        pEntry ? (pEntry.taken ? 'bg-emerald-50/40' : 'bg-blue-50/30') : 'bg-stone-50/20'
                                      }`}>
                                        {pEntry ? (
                                          <div className="space-y-1">
                                            <p className="font-extrabold text-stone-850 text-[11px] leading-tight truncate">{pEntry.subject}</p>
                                            <p className="text-[9px] text-stone-500 font-medium truncate" title={pEntry.teacher}>
                                              👨‍🏫 {pEntry.teacher}
                                            </p>
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                                              pEntry.taken
                                                ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                                                : 'bg-blue-100/80 text-[#172B4D] border-blue-200'
                                            }`}>
                                              {pEntry.taken ? '✓ Taken' : 'Scheduled'}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-stone-300 text-[11px] font-mono">—</span>
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
                    )}
                  </div>
                )}

                {/* ═══ TAB 6: ACTIVITY LOGS ═══ */}
                {activeAdminTab === 'activityLogs' && (
                  <div className="space-y-5">
                    {/* Header and Summary KPI Metric Cards */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-stone-850 flex items-center gap-2">
                          <span>📊</span> Today's Faculty Activity Logs
                        </h3>
                        <p className="text-stone-500 text-xs mt-0.5">Real-time biometric punch logins, campus presence, and classroom session status.</p>
                      </div>
                      <span className="text-xs text-stone-600 bg-stone-100 border border-stone-200 px-3 py-1 rounded-full font-bold">
                        {activityLogsList.length} Faculty Tracked
                      </span>
                    </div>

                    {/* Quick Metric Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base">
                          ✓
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-stone-400">Present Today</div>
                          <div className="text-base font-black text-emerald-800">
                            {activityLogsList.filter(t => t.schoolStatus === 'Present').length} Faculty
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-base">
                          🌴
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-stone-400">On Leave</div>
                          <div className="text-base font-black text-amber-800">
                            {activityLogsList.filter(t => t.schoolStatus === 'Leave').length} Faculty
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-base">
                          ✕
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-stone-400">Absent</div>
                          <div className="text-base font-black text-rose-800">
                            {activityLogsList.filter(t => t.schoolStatus === 'Absent').length} Faculty
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#172B4D] flex items-center justify-center font-bold text-base">
                          📚
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-stone-400">Active Sessions</div>
                          <div className="text-base font-black text-[#172B4D]">
                            {activityLogsList.reduce((acc, cur) => acc + (cur.classLogins?.length || 0), 0)} Logged
                          </div>
                        </div>
                      </div>
                    </div>

                    {activityLogsList.length === 0 ? (
                      <div className="text-center py-12 bg-white border border-dashed border-stone-200 rounded-2xl p-8">
                        <p className="text-stone-500 font-bold text-sm">No teacher records found matching criteria.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activityLogsList.map((t, idx) => {
                          const initials = (t.name || 'F')
                            .split(' ')
                            .filter(Boolean)
                            .map(w => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase();
                          const isPresent = t.schoolStatus === 'Present';
                          const isLeave = t.schoolStatus === 'Leave';

                          return (
                            <div key={idx} className="border border-stone-200 rounded-2xl bg-white shadow-2xs overflow-hidden transition-all hover:shadow-xs">
                              <div className="bg-stone-50/70 px-4 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-200/60">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#172B4D] to-[#29456D] text-white flex items-center justify-center text-xs font-black shadow-2xs shrink-0">
                                    {initials}
                                  </div>
                                  <div>
                                    <div className="font-bold text-sm text-stone-900 leading-tight flex items-center gap-2">
                                      <span>{t.name}</span>
                                      {t.employeeId && (
                                        <span className="text-[10px] font-mono font-bold text-stone-600 bg-stone-200/80 px-2 py-0.5 rounded">
                                          {t.employeeId}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2">
                                      <span>Staff Faculty</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 text-xs flex-wrap">
                                  <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase tracking-wider border flex items-center gap-1.5 shadow-2xs ${
                                    isPresent
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : isLeave
                                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                                        : 'bg-rose-50 text-rose-800 border-rose-300'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isPresent ? 'bg-emerald-500' : isLeave ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                    {isPresent ? 'PRESENT' : isLeave ? 'ON LEAVE' : 'ABSENT'}
                                  </span>

                                  <div className="flex items-center gap-2 bg-white border border-stone-200 px-3 py-1 rounded-xl text-stone-600 text-xs">
                                    <span>🔑 In:</span>
                                    <strong className="font-mono text-stone-900">{t.schoolLogin}</strong>
                                  </div>

                                  <div className="flex items-center gap-2 bg-white border border-stone-200 px-3 py-1 rounded-xl text-stone-600 text-xs">
                                    <span>🚪 Out:</span>
                                    <strong className="font-mono text-stone-900">{t.schoolLogout}</strong>
                                  </div>

                                  <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 px-3 py-1 rounded-xl text-[#172B4D] text-xs font-bold">
                                    <span>📚 Classes:</span>
                                    <strong className="text-[#172B4D]">{t.totalClassesTaken}</strong>
                                  </div>
                                </div>
                              </div>

                              {t.classLogins.length > 0 && (
                                <div className="overflow-x-auto bg-white">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-stone-200 bg-stone-50/40 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                                        <th className="py-2.5 px-4 text-left">Period</th>
                                        <th className="py-2.5 px-4 text-left">Class</th>
                                        <th className="py-2.5 px-4 text-left">Subject</th>
                                        <th className="py-2.5 px-4 text-center">Login Time</th>
                                        <th className="py-2.5 px-4 text-center">Logout Time</th>
                                        <th className="py-2.5 px-4 text-center">Session Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                      {t.classLogins.sort((a, b) => a.period - b.period).map((cl, i) => (
                                        <tr key={i} className="hover:bg-blue-50/10">
                                          <td className="py-2.5 px-4 font-mono font-bold text-stone-850">Period {cl.period}</td>
                                          <td className="py-2.5 px-4 text-stone-850 font-bold">{cl.class}</td>
                                          <td className="py-2.5 px-4 text-stone-600 font-medium">{cl.subject}</td>
                                          <td className="py-2.5 px-4 text-center font-mono text-emerald-700 font-bold">{cl.loginTime}</td>
                                          <td className="py-2.5 px-4 text-center font-mono text-stone-600 font-bold">{cl.logoutTime}</td>
                                          <td className="py-2.5 px-4 text-center">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                              cl.status === 'active' || cl.status === 'in-progress'
                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                : cl.status === 'completed'
                                                  ? 'bg-stone-100 text-stone-700 border-stone-200'
                                                  : 'bg-rose-100 text-rose-700 border-rose-300'
                                            }`}>{cl.status}</span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ TAB 7: LEAVE APPLIED ═══ */}
                {activeAdminTab === 'leavesApplied' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-stone-850 flex items-center gap-2">
                          <span>🌴</span> Leave Applications History
                        </h3>
                        <p className="text-stone-500 text-xs mt-0.5">View and search historical leave requests from teaching faculty.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-600 bg-stone-100 border border-stone-200 px-3 py-1 rounded-full font-bold">
                          Total: {leaveRequests.filter(req => !adminTabSearch || req.teacher?.name?.toLowerCase().includes(adminTabSearch.toLowerCase()) || req.teacherName?.toLowerCase().includes(adminTabSearch.toLowerCase())).length} Applications
                        </span>
                      </div>
                    </div>

                    {leaveRequests.filter(req => !adminTabSearch || req.teacher?.name?.toLowerCase().includes(adminTabSearch.toLowerCase()) || req.teacherName?.toLowerCase().includes(adminTabSearch.toLowerCase())).length === 0 ? (
                      <div className="text-center py-12 bg-white border border-dashed border-stone-200 rounded-2xl p-8">
                        <p className="text-stone-500 font-bold text-sm">No leave requests match your search criteria.</p>
                      </div>
                    ) : (
                      <div className="border border-stone-200 rounded-2xl bg-white shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-stone-50/90 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-3.5 px-4">Teacher Name</th>
                                <th className="py-3.5 px-4">Employee ID</th>
                                <th className="py-3.5 px-4">Leave Date</th>
                                <th className="py-3.5 px-4">Reason</th>
                                <th className="py-3.5 px-4">Applied Date</th>
                                <th className="py-3.5 px-4 text-center">Status</th>
                                <th className="py-3.5 px-4 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                              {leaveRequests
                                .filter(req => !adminTabSearch || req.teacher?.name?.toLowerCase().includes(adminTabSearch.toLowerCase()) || req.teacherName?.toLowerCase().includes(adminTabSearch.toLowerCase()))
                                .map((req, idx) => {
                                  const tName = req.teacher?.name || req.teacherName || 'Faculty';
                                  const initials = tName
                                    .split(' ')
                                    .filter(Boolean)
                                    .map(w => w[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase();
                                  const empId = req.teacher?.employeeId || req.employeeId || '—';
                                  const isPending = req.status === 'Pending';
                                  const isApproved = req.status === 'Approved';

                                  return (
                                    <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                                      <td className="py-3.5 px-4">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#172B4D] to-[#29456D] text-white flex items-center justify-center text-xs font-black shadow-2xs shrink-0">
                                            {initials}
                                          </div>
                                          <div>
                                            <div className="font-bold text-sm text-stone-900 leading-tight">{tName}</div>
                                            <div className="text-[10px] text-stone-400 mt-0.5">Teaching Faculty</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-3.5 px-4">
                                        <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-md">
                                          {empId}
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                                        {req.leaveDate}
                                      </td>
                                      <td className="py-3.5 px-4 italic text-stone-600 max-w-[240px] truncate" title={req.reason}>
                                        "{req.reason}"
                                      </td>
                                      <td className="py-3.5 px-4 font-mono text-stone-400">
                                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                      </td>
                                      <td className="py-3.5 px-4 text-center">
                                        <span className={`inline-block px-3 py-1 rounded-full font-black uppercase text-[9px] tracking-wider border shadow-2xs ${
                                          isApproved
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                            : req.status === 'Rejected'
                                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                                              : 'bg-amber-50 text-amber-900 border-amber-300'
                                        }`}>
                                          {req.status}
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-4 text-right">
                                        <button
                                          type="button"
                                          onClick={() => handleReviewLeave(req)}
                                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5 ${
                                            isPending
                                              ? 'bg-[#172B4D] hover:bg-[#29456D] text-white shadow-xs'
                                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                                          }`}
                                        >
                                          <span>{isPending ? '⚡' : '🔄'}</span>
                                          <span>{isPending ? 'Review & Allocate' : 'Manage Allocation'}</span>
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
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

      </div>

      {/* ─── SUBSTITUTE ALLOCATION MODAL (ADMIN) ─── */}
      {activeRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleUp">
            
            <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                {activeRequest.isDirect ? `Arrange Substitute: ${activeRequest.teacher?.name || activeRequest.teacherName || 'Faculty'}` : `Review Leave: ${activeRequest.teacher?.name || activeRequest.teacherName || 'Faculty'}`}
              </h3>
              <button 
                onClick={() => setActiveRequest(null)}
                className="text-stone-400 hover:text-stone-600 text-xl font-bold focus:outline-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs space-y-2">
                <p><strong className="text-stone-500">Date:</strong> <span className="font-mono text-stone-800">{activeRequest.leaveDate}</span></p>
                <p><strong className="text-stone-500">Reason:</strong> <span className="text-stone-600 italic">"{activeRequest.reason}"</span></p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-[#172B4D] uppercase tracking-widest">
                    Allocate Alternative Period Substitute Teachers
                  </h4>
                  {suggestions.length > 0 && !showManualAlternate && (
                    <button
                      type="button"
                      onClick={() => setShowManualAlternate(true)}
                      className="text-[#172B4D] hover:text-[#172B4D] text-[10px] font-bold underline focus:outline-none"
                    >
                      ➕ Create Manually
                    </button>
                  )}
                </div>

                {loadingSuggestions ? (
                  <div className="text-center py-12">
                    <Spinner size="md" className="mx-auto mb-2" />
                    <p className="text-stone-550 text-xs italic">Analyzing free teaching schedules...</p>
                  </div>
                ) : (suggestions.length === 0 || showManualAlternate) ? (
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h5 className="font-extrabold text-xs text-stone-700 uppercase tracking-wider">Create Manual Arrangement</h5>
                      {suggestions.length === 0 && (
                        <span className="text-[9px] bg-stone-100 text-stone-850 font-extrabold uppercase px-1.5 py-0.5 rounded">
                          No affected periods found
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Class selection */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-stone-500 font-bold uppercase">Class & Section</label>
                        <select
                          value={manualClassId}
                          onChange={(e) => setManualClassId(e.target.value)}
                          className="bg-white border border-stone-200 text-stone-850 text-xs rounded-lg px-3 py-2 outline-none focus:border-[#29456D] font-bold"
                        >
                          <option value="">-- Select Class --</option>
                          {allClasses.map(cls => (
                            <option key={cls._id} value={cls._id}>
                              Class {cls.standard} - {cls.section} ({cls.board || 'CBSE'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Period Selection */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-stone-500 font-bold uppercase">Period</label>
                        <select
                          value={manualPeriod}
                          onChange={(e) => setManualPeriod(Number(e.target.value))}
                          className="bg-white border border-stone-200 text-stone-850 text-xs rounded-lg px-3 py-2 outline-none focus:border-[#29456D] font-bold"
                        >
                          {[1, 2, 3, 4, 5, 6].map(pNum => (
                            <option key={pNum} value={pNum}>
                              Period {pNum}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Subject Name */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-stone-500 font-bold uppercase">Subject Name</label>
                        <input
                          type="text"
                          value={manualSubjectName}
                          onChange={(e) => setManualSubjectName(e.target.value)}
                          placeholder="e.g. maths, science"
                          className="bg-white border border-stone-200 text-stone-850 text-xs rounded-lg px-3 py-2 outline-none focus:border-[#29456D] font-bold"
                        />
                      </div>

                      {/* Arrange Teacher */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-stone-500 font-bold uppercase">Arrange Teacher</label>
                        <select
                          value={manualTeacherId}
                          onChange={(e) => setManualTeacherId(e.target.value)}
                          className="bg-white border border-stone-200 text-stone-850 text-xs rounded-lg px-3 py-2 outline-none focus:border-[#29456D] font-bold"
                        >
                          <option value="">-- Select Teacher --</option>
                          {adminData?.allTeachers?.map(teacher => (
                            <option key={teacher._id} value={teacher._id}>
                              {teacher.name} ({teacher.employeeId || 'No ID'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {suggestions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowManualAlternate(false)}
                        className="text-[#172B4D] hover:text-[#172B4D] text-[10px] font-bold underline"
                      >
                        ← Back to Auto Suggestions
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {suggestions.map((slot) => (
                      <div key={slot.periodEntryId} className="bg-stone-50/50 border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-stone-800 text-sm">Period {slot.period}</span>
                            <span className="text-[10px] text-stone-400 font-mono">({slot.timeSlot})</span>
                          </div>
                          <p className="text-stone-600">Class: {slot.class} | Subject: <strong className="text-stone-850 font-semibold">{slot.subject}</strong></p>
                        </div>

                        <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                          {activeRequest.isDirect ? (
                            <>
                              <select
                                value={allocations[slot.periodEntryId] || ''}
                                onChange={(e) => setAllocations(prev => ({
                                  ...prev,
                                  [slot.periodEntryId]: e.target.value
                                }))}
                                className="bg-white border border-stone-200 text-stone-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-[#29456D] w-48 font-bold"
                              >
                                <option value="">-- Select Teacher --</option>
                                {adminData?.allTeachers?.map(teacher => (
                                  <option key={teacher._id} value={teacher._id}>
                                    {teacher.name} ({teacher.employeeId || 'No ID'})
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={allocSubjectNames[slot.periodEntryId] || ''}
                                onChange={(e) => setAllocSubjectNames(prev => ({
                                  ...prev,
                                  [slot.periodEntryId]: e.target.value
                                }))}
                                placeholder="Subject Name"
                                className="bg-white border border-stone-200 text-stone-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-[#29456D] w-40 font-bold"
                              />
                            </>
                          ) : (
                            <>
                              {slot.candidates.length === 0 ? (
                                <span className="text-rose-500 font-bold text-xs uppercase tracking-wide">
                                  ⚠️ No Available Teachers
                                </span>
                              ) : (
                                <select
                                  value={allocations[slot.periodEntryId] || ''}
                                  onChange={(e) => setAllocations(prev => ({
                                    ...prev,
                                    [slot.periodEntryId]: e.target.value
                                  }))}
                                  className="bg-white border border-stone-200 text-stone-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-[#29456D] w-48 font-bold"
                                >
                                  {slot.candidates.map(candidate => (
                                    <option key={candidate.teacherId} value={candidate.teacherId}>
                                      {candidate.name} {candidate.subjectMatch ? '🌟 (Subject Match)' : ''}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <input
                                type="text"
                                value={allocSubjectNames[slot.periodEntryId] || ''}
                                onChange={(e) => setAllocSubjectNames(prev => ({
                                  ...prev,
                                  [slot.periodEntryId]: e.target.value
                                }))}
                                placeholder="Subject Name"
                                className="bg-white border border-stone-200 text-stone-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-[#29456D] w-40 font-bold"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-between gap-3">
              {!activeRequest.isDirect ? (
                <button
                  onClick={() => handleApproveLeave('Rejected')}
                  disabled={isApprovingLeave}
                  className="px-4 py-2 border border-stone-250 text-red-500 hover:bg-stone-105 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  Reject Leave
                </button>
              ) : (
                <div />
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveRequest(null)}
                  className="px-4 py-2 border border-stone-250 text-stone-500 hover:bg-stone-105 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={activeRequest.isDirect ? handleSaveDirectSubstitute : () => handleApproveLeave('Approved')}
                  disabled={isApprovingLeave || (!showManualAlternate && suggestions.length === 0 && !activeRequest.isDirect)}
                  className="px-4 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white font-black text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {isApprovingLeave ? 'Processing...' : activeRequest.isDirect ? 'Arrange Alternate' : 'Approve & Arrange'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── LATE TEACHER ALERT POPUP (ADMIN/PRINCIPAL) ─── */}
      {activeAlerts.length > 0 && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">
            <div className="bg-rose-50 px-6 py-4 border-b border-rose-200 flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-bold text-rose-800 flex items-center gap-2">
                <span>🚨</span> Late Class Login Alert
              </h3>
              <button 
                onClick={() => setDismissedAlerts(prev => [...prev, ...activeAlerts.map(a => a._id)])}
                className="text-rose-500 hover:text-rose-650 text-xl font-bold focus:outline-none"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-stone-600 text-xs font-semibold">
                The following teachers have logged in to the school today but have NOT started their class session after 10 minutes of the period start time. Please take action immediately:
              </p>
              
              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <div key={alert._id} className="bg-rose-50/30 border border-rose-100 rounded-xl p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-extrabold text-stone-850 text-sm">{alert.teacher}</p>
                        <p className="text-[10px] text-stone-450 font-mono mt-0.5">Period {alert.period} ({alert.timeSlot})</p>
                      </div>
                      <span className="text-[9px] bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full font-bold uppercase">
                        Late 10+ Mins
                      </span>
                    </div>
                    
                    <div className="text-stone-600 space-y-1">
                      <p><strong>Class:</strong> {alert.class}</p>
                      <p><strong>Subject:</strong> {alert.subject}</p>
                    </div>
                    
                    <div className="pt-2 border-t border-rose-100 flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setDismissedAlerts(prev => [...prev, alert._id]);
                          handleArrangeSubstituteDirect(alert.teacherId, alert.teacher, todayStr, alert._id);
                        }}
                        className="px-3 py-1.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-black rounded-lg text-[10px] shadow-sm transition-all"
                      >
                        🔄 Arrange Substitute
                      </button>
                      <button
                        onClick={() => setDismissedAlerts(prev => [...prev, alert._id])}
                        className="px-3 py-1.5 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-lg text-[10px] font-bold transition-all"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-stone-50 px-6 py-3.5 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setDismissedAlerts(prev => [...prev, ...activeAlerts.map(a => a._id)])}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-850 text-white rounded-xl text-xs font-bold transition-all"
              >
                Acknowledge All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TEACHER SCHEDULE CREATION MODAL ─── */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">
            
            <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-bold text-stone-850 flex items-center gap-2">
                <span>➕</span> Schedule Timetable Slot
              </h3>
              <button 
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="text-stone-400 hover:text-stone-600 text-xl font-bold focus:outline-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {isAdminRole && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Select Teacher</label>
                    <select
                      value={schedTeacherId}
                      onChange={(e) => setSchedTeacherId(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#29456D] text-stone-800 font-medium"
                    >
                      {adminData?.allTeachers?.map(t => (
                        <option key={t._id} value={t._id}>{t.name} ({t.employeeId})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Standard / Grade</label>
                    <select
                      value={schedStandard}
                      onChange={(e) => setSchedStandard(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#29456D] text-stone-800 font-medium"
                    >
                      {['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'].map(std => (
                        <option key={std} value={std}>{std} Class</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Section / Division</label>
                    <select
                      value={schedSection}
                      onChange={(e) => setSchedSection(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#29456D] text-stone-800 font-medium"
                    >
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'].map(sec => (
                        <option key={sec} value={sec}>Section {sec}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">School Board</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(schoolSettings?.board ? [schoolSettings.board] : ['CBSE', 'STATE', 'ICSE']).map(b => (
                      <button
                        type="button"
                        key={b}
                        onClick={() => setSchedBoard(b)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          schedBoard === b
                            ? 'bg-[#29456D]/10 border-[#29456D] text-[#172B4D] shadow-md'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-300'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Subject Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics, Science, English"
                    value={schedSubject}
                    onChange={(e) => setSchedSubject(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#29456D] text-stone-800 placeholder-stone-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Period</label>
                    <select
                      value={schedPeriod}
                      onChange={(e) => handlePeriodChange(Number(e.target.value))}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#29456D] text-stone-800 font-medium"
                    >
                      {calculatedPeriods.map(p => (
                        <option key={p.period} value={p.period}>Period {p.period}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Time Slot (Duration)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 09:00-09:45"
                      value={schedTimeSlot}
                      onChange={(e) => setSchedTimeSlot(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#29456D] text-stone-800 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Schedule Type</label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setSchedType('auto')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-center gap-0.5 ${
                        schedType === 'auto'
                          ? 'bg-[#29456D]/10 border-[#29456D] text-[#172B4D]'
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      <span className="font-extrabold">🔄 Auto Schedule</span>
                      <span className="text-[10px] text-stone-450 font-normal font-sans">Repeats weekly starting tomorrow</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchedType('manual')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-center gap-0.5 ${
                        schedType === 'manual'
                          ? 'bg-[#29456D]/10 border-[#29456D] text-[#172B4D]'
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      <span className="font-extrabold">📅 Manual Override</span>
                      <span className="text-[10px] text-stone-450 font-normal font-sans font-medium">One-time override for date</span>
                    </button>
                  </div>
                </div>

                {schedType === 'auto' ? (
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Weekday</label>
                    <select
                      value={schedDay}
                      onChange={(e) => setSchedDay(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#29456D] text-stone-800 font-medium"
                    >
                      {weekdays.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Override Date</label>
                    <input
                      type="date"
                      required={schedType === 'manual'}
                      min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                      value={schedDate}
                      onChange={(e) => setSchedDate(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#29456D] text-stone-800 font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 border border-stone-250 text-stone-500 hover:bg-stone-100 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSchedule}
                  className="px-5 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white font-black text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {isSubmittingSchedule ? 'Scheduling...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ─── CARD DRILLDOWN DETAILS MODAL ─── */}
      {activeCardModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <div>
                <h3 className="text-lg font-black text-stone-850 flex items-center gap-2">
                  {activeCardModal === 'total_teachers' && '👨‍🏫 Total Faculty & Teachers'}
                  {activeCardModal === 'present_teachers' && '✅ Today\'s Present Teachers'}
                  {activeCardModal === 'absent_teachers' && '❌ Absent & On Leave Teachers'}
                  {activeCardModal === 'logged_in_classes' && '🟢 Logged In Active Classes'}
                  {activeCardModal === 'missed_classes' && '🔴 Logged Out / Missed Classes'}
                  {activeCardModal === 'substitute_arranged' && '🔄 Substitute Teacher Arrangements'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">Detailed breakdown of live institutional attendance and period status.</p>
              </div>
              <button
                onClick={() => setActiveCardModal(null)}
                className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {activeCardModal === 'total_teachers' && (
                <div className="overflow-x-auto border border-stone-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-800 text-white font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Emp ID</th>
                        <th className="py-3 px-4">Teacher Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Qualification</th>
                        <th className="py-3 px-4">Experience</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(adminData?.allTeachers || []).map((t, idx) => (
                        <tr key={idx} className="border-b border-stone-200 hover:bg-stone-50">
                          <td className="py-3 px-4 font-mono font-bold text-stone-700">{t.employeeId}</td>
                          <td className="py-3 px-4 font-bold text-stone-850">{t.name}</td>
                          <td className="py-3 px-4 text-stone-600">{t.email}</td>
                          <td className="py-3 px-4 text-stone-600">{t.qualification}</td>
                          <td className="py-3 px-4 text-stone-600">{t.experience} Yrs</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase ${
                              t.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                              t.status === 'On Leave' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeCardModal === 'present_teachers' && (
                <div className="overflow-x-auto border border-stone-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-emerald-900 text-white font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Teacher Name</th>
                        <th className="py-3 px-4">Check-In Time</th>
                        <th className="py-3 px-4">Kiosk / Location</th>
                        <th className="py-3 px-4 text-center">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(adminData?.todayAttendances || []).filter(a => a.status === 'Present').length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-stone-400 italic">No teachers marked present today.</td>
                        </tr>
                      ) : (
                        (adminData?.todayAttendances || []).filter(a => a.status === 'Present').map((att, idx) => (
                          <tr key={idx} className="border-b border-stone-200 hover:bg-emerald-50/40">
                            <td className="py-3 px-4 font-bold text-stone-850">{att.teacher?.name || 'Faculty Member'}</td>
                            <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                              {att.punchIn ? new Date(att.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:15 AM'}
                            </td>
                            <td className="py-3 px-4 text-stone-600">{att.address || 'Main Gate Kiosk'}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ✅ Present
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeCardModal === 'absent_teachers' && (
                <div className="overflow-x-auto border border-stone-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-rose-900 text-white font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Teacher Name</th>
                        <th className="py-3 px-4">Absence Type</th>
                        <th className="py-3 px-4">Reason / Notes</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(adminData?.todayAttendances || []).filter(a => ['Absent', 'Leave'].includes(a.status)).length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-stone-400 italic">No absent or leave records for today.</td>
                        </tr>
                      ) : (
                        (adminData?.todayAttendances || []).filter(a => ['Absent', 'Leave'].includes(a.status)).map((att, idx) => (
                          <tr key={idx} className="border-b border-stone-200 hover:bg-rose-50/40">
                            <td className="py-3 px-4 font-bold text-stone-850">{att.teacher?.name || 'Faculty Member'}</td>
                            <td className="py-3 px-4 font-semibold text-rose-700">{att.status === 'Leave' ? 'Approved Leave' : 'Unexcused Absence'}</td>
                            <td className="py-3 px-4 text-stone-600 italic">{att.address || 'Reported Absent'}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                                ❌ {att.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeCardModal === 'logged_in_classes' && (
                <div className="overflow-x-auto border border-stone-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-emerald-900 text-white font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">Time Slot</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Logged In Teacher</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(adminData?.allTodayPeriods || []).filter(p => p.color === 'green').length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-8 text-stone-400 italic">No classes currently logged in.</td>
                        </tr>
                      ) : (
                        (adminData?.allTodayPeriods || []).filter(p => p.color === 'green').map((p, idx) => (
                          <tr key={idx} className="border-b border-stone-200 hover:bg-emerald-50/40">
                            <td className="py-3 px-4 font-bold text-stone-850">{p.class}</td>
                            <td className="py-3 px-4 font-mono font-bold text-emerald-800">Period {p.period}</td>
                            <td className="py-3 px-4 font-mono text-stone-600">{p.timeSlot}</td>
                            <td className="py-3 px-4 font-semibold text-stone-800">{p.subject}</td>
                            <td className="py-3 px-4 font-bold text-emerald-900">{p.teacher}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                🟢 Logged In
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeCardModal === 'missed_classes' && (
                <div className="overflow-x-auto border border-stone-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-900 text-white font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">Time Slot</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Assigned Teacher</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(adminData?.allTodayPeriods || []).filter(p => p.color === 'red').length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-8 text-stone-400 italic">No missed or unlogged classes today.</td>
                        </tr>
                      ) : (
                        (adminData?.allTodayPeriods || []).filter(p => p.color === 'red').map((p, idx) => (
                          <tr key={idx} className="border-b border-stone-200 hover:bg-rose-50/40">
                            <td className="py-3 px-4 font-bold text-stone-850">{p.class}</td>
                            <td className="py-3 px-4 font-mono font-bold text-stone-700">P{p.period}</td>
                            <td className="py-3 px-4 font-mono text-stone-500">{p.timeSlot}</td>
                            <td className="py-3 px-4 font-semibold text-stone-800">{p.subject}</td>
                            <td className="py-3 px-4 text-stone-700">{p.teacher}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                                🔴 {p.statusText || 'Missed'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  setActiveCardModal(null);
                                  handleArrangeSubstituteDirect(p.teacherId, p.teacher, getLocalDateString(), p._id);
                                }}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] rounded-lg shadow-sm transition-all uppercase tracking-wider cursor-pointer"
                              >
                                Alternate ➔
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeCardModal === 'substitute_arranged' && (
                <div className="overflow-x-auto border border-stone-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-amber-900 text-white font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Original Teacher</th>
                        <th className="py-3 px-4">Substitute Teacher</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(adminData?.substitutePending || []).length === 0 && (adminData?.allTodayPeriods || []).filter(p => p.color === 'gold' || p.substitute).length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-8 text-stone-400 italic">No substitute arrangements found for today.</td>
                        </tr>
                      ) : (
                        (adminData?.allTodayPeriods || []).filter(p => p.color === 'gold' || p.substitute).map((p, idx) => (
                          <tr key={idx} className="border-b border-stone-200 hover:bg-amber-50/40">
                            <td className="py-3 px-4 font-mono text-stone-600">{getLocalDateString()}</td>
                            <td className="py-3 px-4 font-mono font-bold text-amber-900">Period {p.period}</td>
                            <td className="py-3 px-4 font-bold text-stone-850">{p.class}</td>
                            <td className="py-3 px-4 text-rose-700 font-semibold">Original Absent</td>
                            <td className="py-3 px-4 text-amber-950 font-bold">{p.substitute?.substituteTeacherName || p.teacher}</td>
                            <td className="py-3 px-4 text-stone-800">{p.subject}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                🔄 Arranged
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-between items-center">
              <span className="text-xs text-stone-400 font-medium">Click outside or press Close to return to dashboard.</span>
              <button
                onClick={() => setActiveCardModal(null)}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── LATE TEACHER NOTICE MODAL (PRINCIPAL ACTION) ─── */}
      {showLateNoticeModal && selectedLateSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className={`p-5 text-white flex justify-between items-center ${
              selectedLateSession.lateSeverity === 'red' ? 'bg-[#991B1B]' :
              selectedLateSession.lateSeverity === 'orange' ? 'bg-[#C2410C]' :
              'bg-[#854D0E]'
            }`}>
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold">Issue Formal Late Check-In Notice</h3>
                  <p className="text-xs opacity-90">Academic Administration • Faculty Attendance & Punctuality Notice</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLateNoticeModal(false)}
                className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition-all cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSendLateNoticeSubmit} className="p-6 space-y-4">
              {/* Context Strip */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-[#172B4D]">{selectedLateSession.teacherName}</h4>
                    <span className="text-xs text-slate-500 font-mono">Employee ID: {selectedLateSession.employeeId || 'FAC-N/A'}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                    selectedLateSession.lateSeverity === 'red' ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]' :
                    selectedLateSession.lateSeverity === 'orange' ? 'bg-[#FFF4EC] text-[#B45309] border border-[#FED7AA]' :
                    'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {selectedLateSession.lateMinutes} Minutes Late
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-[#172B4D] pt-2 border-t border-slate-200/70">
                  <div><strong>Class:</strong> {selectedLateSession.className}</div>
                  <div><strong>Subject:</strong> {selectedLateSession.subjectName}</div>
                  <div><strong>Period:</strong> Period {selectedLateSession.period}</div>
                  <div><strong>Check-In Time:</strong> {selectedLateSession.checkInTime || '-'}</div>
                </div>
              </div>

              {/* Subject Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#172B4D] uppercase tracking-wide">
                  Notice Subject:
                </label>
                <input
                  type="text"
                  value={lateNoticeSubject}
                  onChange={(e) => setLateNoticeSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#29456D] text-[#172B4D]"
                  required
                />
              </div>

              {/* Message Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#172B4D] uppercase tracking-wide">
                  Explanation Request Message:
                </label>
                <textarea
                  rows={6}
                  value={lateNoticeMessage}
                  onChange={(e) => setLateNoticeMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#29456D] text-[#172B4D] font-mono"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  This official notice will be delivered directly to the faculty member's notifications and attendance log.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowLateNoticeModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-[#e2e8f0] text-[#172B4D] font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingLateNotice}
                  className="flex items-center gap-2 px-5 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSendingLateNotice ? <Spinner size="sm" /> : <Send className="w-3.5 h-3.5 text-white" />}
                  <span>{isSendingLateNotice ? 'Issuing Notice...' : 'Dispatch Official Notice'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardPage;
