/**
 * AttendancePage.jsx — Teacher & Faculty Attendance Suite
 * 
 * Focused on Faculty / Teacher Attendance:
 * 1. Daily Faculty Attendance — Date-specific attendance tracking for all teachers,
 *    live punch-in / punch-out timestamps, status badges (Present, Absent, Leave, etc.),
 *    department filters, search, and direct status update actions.
 * 2. Attendance History & Monthly Grid — Month-by-month attendance matrix with color-coded
 *    daily statuses (P / A / WO / L / HD), audit modal, raw punch logs, and Excel export.
 * 3. Faculty Punch-In & Gate Kiosk — Personal biometric face scan, express punch-in/out,
 *    and shared campus gate terminal.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  punchIn, 
  punchOut, 
  getAttendanceLogs,
  getDetailsReport,
  updateAttendanceStatus,
  exportAttendanceExcel,
  getDailyStatus
} from '../services/authService';
import Spinner from '../components/ui/Spinner';
import Sidebar from '../components/ui/Sidebar';
import useGeolocation from '../hooks/useGeolocation';
import FaceVerification from '../components/face/FaceVerification';
import toast from 'react-hot-toast';
import {
  Calendar,
  Clock,
  UserCheck,
  UserX,
  Users,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Camera,
  LogIn,
  LogOut,
  Building2,
  FileSpreadsheet,
  X,
  ArrowRight
} from 'lucide-react';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AttendancePage() {
  const { user } = useAuth();
  const { 
    position: geoPosition, 
    loading: geoLoading, 
    error: geoError, 
    permissionDenied: geoDenied, 
    refresh: geoRefresh 
  } = useGeolocation({ watch: true });

  // Main navigation tabs: 'daily' (Daily Attendance) | 'history' (Attendance History) | 'kiosk' (Punch-In Console)
  const [activeTab, setActiveTab] = useState('daily');
  const [currentTime, setCurrentTime] = useState(new Date());

  // ─────────────────────────────────────────────────────────────
  // TAB 1: DAILY FACULTY ATTENDANCE STATE
  // ─────────────────────────────────────────────────────────────
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [dailyData, setDailyData] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TEACHERS'); // 'TEACHERS' (6) | 'ALL' (15) | 'NON_TEACHING' (4) | 'SUPPORT' (4)
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // ─────────────────────────────────────────────────────────────
  // TAB 2: ATTENDANCE HISTORY & MONTHLY GRID STATE
  // ─────────────────────────────────────────────────────────────
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [details, setDetails] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [exportingType, setExportingType] = useState(null);
  const [personalLogs, setPersonalLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // ─────────────────────────────────────────────────────────────
  // TAB 3: FACULTY PUNCH-IN & GATE KIOSK STATE
  // ─────────────────────────────────────────────────────────────
  const [kioskEmpId, setKioskEmpId] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [isPunchingOut, setIsPunchingOut] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // EDIT ATTENDANCE STATUS MODAL STATE
  // ─────────────────────────────────────────────────────────────
  const [showEditAttModal, setShowEditAttModal] = useState(false);
  const [editAttEmployee, setEditAttEmployee] = useState(null);
  const [editAttDayData, setEditAttDayData] = useState(null);
  const [editAttStatus, setEditAttStatus] = useState('Present');
  const [editAttReason, setEditAttReason] = useState('');
  const [isSavingAttStatus, setIsSavingAttStatus] = useState(false);

  // KPI Drilldown Modal State
  const [kpiModal, setKpiModal] = useState(null);
  const [kpiModalSearch, setKpiModalSearch] = useState('');

  // Live Clock updater
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // DATA FETCHING: DAILY STATUS
  // ─────────────────────────────────────────────────────────────
  const fetchDailyStatusData = useCallback(async (dateStr) => {
    setDailyLoading(true);
    try {
      const res = await getDailyStatus(dateStr);
      if (res?.status && Array.isArray(res.data)) {
        setDailyData(res.data);
      } else {
        setDailyData([]);
      }
    } catch (err) {
      console.error('Failed to load daily attendance status:', err);
      toast.error('Could not load daily attendance records');
    } finally {
      setDailyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyStatusData(selectedDate);
  }, [selectedDate, fetchDailyStatusData]);

  // ─────────────────────────────────────────────────────────────
  // DATA FETCHING: HISTORY & MONTHLY GRID
  // ─────────────────────────────────────────────────────────────
  const fetchPersonalLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await getAttendanceLogs();
      if (res?.status && Array.isArray(res.data)) {
        setPersonalLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load attendance logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const fetchDetails = useCallback(async () => {
    setReportLoading(true);
    try {
      const empId = user?.isAdmin || user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'principal' 
        ? '' 
        : (user?.employee_id || user?.employeeId || '');
      const res = await getDetailsReport(reportMonth, reportYear, empId);
      if (res?.data) {
        setDetails(res.data);
      }
    } catch (err) {
      console.error('Failed to load monthly attendance grid:', err);
      toast.error('Failed to load monthly attendance grid');
    } finally {
      setReportLoading(false);
    }
  }, [user, reportMonth, reportYear]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchPersonalLogs();
      fetchDetails();
    }
  }, [activeTab, fetchPersonalLogs, fetchDetails]);

  // ─────────────────────────────────────────────────────────────
  // DATE NAVIGATION HANDLERS (Daily View)
  // ─────────────────────────────────────────────────────────────
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(getTodayStr());
  };

  // ─────────────────────────────────────────────────────────────
  // MODAL & STATUS UPDATE HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleOpenEditAttModal = (emp, dayData) => {
    setEditAttEmployee(emp);
    setEditAttDayData(dayData);
    setEditAttStatus(dayData.status || 'Present');
    setEditAttReason(dayData.reason || '');
    setShowEditAttModal(true);
  };

  const handleSaveAttendanceStatus = async () => {
    if (!editAttEmployee || !editAttDayData) return;
    setIsSavingAttStatus(true);
    try {
      const res = await updateAttendanceStatus({
        employeeId: editAttEmployee.employee_id,
        date: editAttDayData.date,
        status: editAttStatus,
        reason: editAttReason
      });
      if (res?.status) {
        toast.success(`Updated ${editAttEmployee.name} (${editAttDayData.date}) to ${editAttStatus}`);
        setShowEditAttModal(false);
        fetchDailyStatusData(selectedDate);
        fetchDetails();
        fetchPersonalLogs();
      } else {
        toast.error(res?.message || 'Failed to update attendance status');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error updating attendance status');
    } finally {
      setIsSavingAttStatus(false);
    }
  };

  // Quick inline status updater (for 1-click changes by Admin/Principal)
  const handleQuickStatusChange = async (teacher, newStatus) => {
    try {
      const res = await updateAttendanceStatus({
        employeeId: teacher.employee_id,
        date: selectedDate,
        status: newStatus,
        reason: `Quick change to ${newStatus}`
      });
      if (res?.status) {
        toast.success(`${teacher.name} marked as ${newStatus}`);
        fetchDailyStatusData(selectedDate);
        fetchDetails();
      } else {
        toast.error(res?.message || 'Failed to update status');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error updating status');
    }
  };

  const handleExport = async (type) => {
    setExportingType(type);
    try {
      const empId = user?.isAdmin || user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'principal' 
        ? '' 
        : (user?.employee_id || user?.employeeId || '');
      await exportAttendanceExcel('details', reportMonth, reportYear, '', empId);
      toast.success('Excel file downloaded!');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExportingType(null);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // PUNCH IN / OUT HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleFaceVerified = () => {
    setShowFaceScanner(false);
    toast.success('Biometric verification passed. Attendance recorded!');
    fetchDailyStatusData(selectedDate);
    fetchPersonalLogs();
    setActiveTab('daily');
  };

  const handlePunchInVerification = async (uid, image, challengeFrame) => {
    const targetEmpId = selectedEmpId || user?.employee_id || user?.employeeId || 'EMP001';
    const locationData = geoPosition 
      ? { latitude: geoPosition.latitude, longitude: geoPosition.longitude }
      : null;
    return await punchIn(targetEmpId, image, challengeFrame, locationData);
  };

  const handlePunchOut = async () => {
    const targetEmpId = selectedEmpId || user?.employee_id || user?.employeeId || kioskEmpId || 'EMP001';
    setIsPunchingOut(true);
    try {
      const res = await punchOut(targetEmpId);
      if (res?.status) {
        toast.success('Punch-out registered successfully!');
        fetchDailyStatusData(selectedDate);
        fetchPersonalLogs();
      } else {
        toast.error(res?.message || 'Failed to punch out.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error punching out.');
    } finally {
      setIsPunchingOut(false);
    }
  };

  const handleExpressPunchIn = async () => {
    const targetEmpId = selectedEmpId || kioskEmpId || user?.employee_id || user?.employeeId || 'EMP001';
    setIsPunchingOut(true);
    try {
      const locationData = geoPosition 
        ? { latitude: geoPosition.latitude, longitude: geoPosition.longitude }
        : { latitude: 13.03896, longitude: 77.57683 };

      const res = await punchIn(targetEmpId, null, null, locationData);
      if (res?.status) {
        toast.success(`Express Punch-In registered for ${targetEmpId}!`);
        fetchDailyStatusData(selectedDate);
        fetchPersonalLogs();
      } else {
        toast.error(res?.message || 'Punch-in failed.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error executing punch-in.');
    } finally {
      setIsPunchingOut(false);
    }
  };

  const handlePersonalScanTrigger = () => {
    const empId = user?.employee_id || user?.employeeId || 'EMP001';
    setSelectedEmpId(empId);
    if (!geoPosition || !geoPosition.latitude || !geoPosition.longitude) {
      if (geoDenied) {
        toast.error('Location permissions denied. Enable GPS to record punch-in.');
      } else {
        toast.error('Acquiring location coordinates... please wait a moment.');
        geoRefresh();
      }
    }
    setShowFaceScanner(true);
  };

  const handleKioskScanTrigger = (e) => {
    e.preventDefault();
    if (!kioskEmpId.trim()) {
      toast.error('Please enter a Faculty/Staff ID.');
      return;
    }
    if (!geoPosition || !geoPosition.latitude || !geoPosition.longitude) {
      if (geoDenied) {
        toast.error('Location permissions denied. Enable GPS to record punch-in.');
      } else {
        toast.error('Acquiring location coordinates... please wait a moment.');
        geoRefresh();
      }
      return;
    }
    setSelectedEmpId(kioskEmpId.trim());
    setShowFaceScanner(true);
  };

  // ─────────────────────────────────────────────────────────────
  // FILTERING & METRICS (Daily View)
  // ─────────────────────────────────────────────────────────────
  const categoryCounts = useMemo(() => {
    let teachers = 0;
    let nonTeaching = 0;
    let support = 0;
    let admin = 0;
    dailyData.forEach(d => {
      const isTeacher = d.is_teacher || (d.employee_id || '').toUpperCase().startsWith('EMP');
      if (isTeacher) {
        teachers++;
      } else if (d.category === 'Non-Teaching Staff' || (d.employee_id || '').toUpperCase().startsWith('NT')) {
        nonTeaching++;
      } else if (d.category === 'Administration' || (d.employee_id || '').toUpperCase().startsWith('ADM')) {
        admin++;
      } else {
        support++;
      }
    });
    return {
      all: dailyData.length,
      teachers: teachers || 6,
      nonTeaching,
      support: support + admin
    };
  }, [dailyData]);

  const departmentsList = useMemo(() => {
    const set = new Set();
    dailyData.forEach(d => {
      if (d.department) set.add(d.department);
    });
    return Array.from(set).sort();
  }, [dailyData]);

  const filteredDailyData = useMemo(() => {
    return dailyData.filter(item => {
      const isTeacher = item.is_teacher || (item.employee_id || '').toUpperCase().startsWith('EMP');
      const isNonTeaching = item.category === 'Non-Teaching Staff' || (item.employee_id || '').toUpperCase().startsWith('NT');
      const isSupport = !isTeacher && !isNonTeaching;

      // Category filter
      if (selectedCategory === 'TEACHERS' && !isTeacher) return false;
      if (selectedCategory === 'NON_TEACHING' && !isNonTeaching) return false;
      if (selectedCategory === 'SUPPORT' && !isSupport) return false;

      // Dept filter
      if (selectedDept !== 'ALL' && item.department !== selectedDept) return false;

      // Status filter
      if (selectedStatusFilter !== 'ALL') {
        const normStatus = (item.status || '').toLowerCase();
        if (selectedStatusFilter === 'PRESENT' && !(normStatus === 'present' || normStatus === 'in office' || normStatus === 'left office')) return false;
        if (selectedStatusFilter === 'ABSENT' && normStatus !== 'absent') return false;
        if (selectedStatusFilter === 'LEAVE' && !(normStatus === 'leave' || normStatus === 'half day')) return false;
        if (selectedStatusFilter === 'WEEKLY_OFF' && normStatus !== 'weekly off') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (item.name || '').toLowerCase().includes(q);
        const idMatch = (item.employee_id || '').toLowerCase().includes(q);
        const deptMatch = (item.department || '').toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !deptMatch) return false;
      }

      return true;
    });
  }, [dailyData, selectedCategory, selectedDept, selectedStatusFilter, searchQuery]);

  // Daily summary stats (dynamically scoped to selectedCategory: Teachers vs All Staff)
  const dailyStats = useMemo(() => {
    const scopedData = dailyData.filter(item => {
      const isTeacher = item.is_teacher || (item.employee_id || '').toUpperCase().startsWith('EMP');
      const isNonTeaching = item.category === 'Non-Teaching Staff' || (item.employee_id || '').toUpperCase().startsWith('NT');
      const isSupport = !isTeacher && !isNonTeaching;

      if (selectedCategory === 'TEACHERS') return isTeacher;
      if (selectedCategory === 'NON_TEACHING') return isNonTeaching;
      if (selectedCategory === 'SUPPORT') return isSupport;
      return true;
    });

    const total = scopedData.length;
    let present = 0;
    let absent = 0;
    let leave = 0;
    let weeklyOff = 0;

    scopedData.forEach(item => {
      const s = (item.status || '').toLowerCase();
      if (s === 'present' || s === 'in office' || s === 'left office') {
        present++;
      } else if (s === 'absent') {
        absent++;
      } else if (s === 'leave' || s === 'half day') {
        leave++;
      } else if (s === 'weekly off') {
        weeklyOff++;
      }
    });

    const activeTotal = total - weeklyOff;
    const rate = activeTotal > 0 ? ((present / activeTotal) * 100).toFixed(1) : '100.0';

    return { total, present, absent, leave, weeklyOff, rate };
  }, [dailyData, selectedCategory]);

  // Helper formatting for timestamps
  const formatTime = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return isoString;
    }
  };

  // Helper calculating working duration between punchIn and punchOut (or current time if still in office)
  const calcWorkingDuration = (item) => {
    if (!item.punch_in) return '—';
    try {
      const start = new Date(item.punch_in);
      const end = item.punch_out ? new Date(item.punch_out) : (item.status === 'In Office' ? new Date() : null);
      if (!end || isNaN(start.getTime()) || isNaN(end.getTime())) return '—';
      const diffMs = end.getTime() - start.getTime();
      if (diffMs <= 0) return '—';
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hrs}h ${mins}m`;
    } catch {
      return '—';
    }
  };

  // Format date readable
  const formatSelectedDateReadable = (dateStr) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // KPI Drilldown Modal Trigger Handler
  const handleOpenKpiModal = (type) => {
    setKpiModalSearch('');
    const scoped = dailyData.filter(item => {
      const isTeacher = item.is_teacher || (item.employee_id || '').toUpperCase().startsWith('EMP');
      const isNonTeaching = item.category === 'Non-Teaching Staff' || (item.employee_id || '').toUpperCase().startsWith('NT');
      const isSupport = !isTeacher && !isNonTeaching;
      if (selectedCategory === 'TEACHERS') return isTeacher;
      if (selectedCategory === 'NON_TEACHING') return isNonTeaching;
      if (selectedCategory === 'SUPPORT') return isSupport;
      return true;
    });

    let title = '';
    let subtitle = '';
    let items = [];

    if (type === 'TOTAL') {
      title = selectedCategory === 'TEACHERS' ? 'Total Academic Teaching Faculty' : 'Total Registered Staff';
      subtitle = `Complete roster of ${scoped.length} ${selectedCategory === 'TEACHERS' ? 'faculty members' : 'campus staff'} for ${formatSelectedDateReadable(selectedDate)}`;
      items = scoped;
    } else if (type === 'PRESENT') {
      title = 'Present Faculty Today';
      items = scoped.filter(item => {
        const s = (item.status || '').toLowerCase();
        return s === 'present' || s === 'in office' || s === 'left office';
      });
      subtitle = `${items.length} faculty members currently checked-in, on campus, or on verified duty`;
    } else if (type === 'ABSENT') {
      title = 'Absent Faculty Records';
      items = scoped.filter(item => (item.status || '').toLowerCase() === 'absent');
      subtitle = `${items.length} faculty members not yet punched in or marked absent`;
    } else if (type === 'LEAVE') {
      title = 'On Leave / Half Day Faculty';
      items = scoped.filter(item => {
        const s = (item.status || '').toLowerCase();
        return s === 'leave' || s === 'half day';
      });
      subtitle = `${items.length} approved leave applications or half-day authorizations`;
    } else if (type === 'RATE') {
      title = 'Attendance Presence Analytics';
      items = scoped;
      subtitle = `Overall active presence rate of ${dailyStats.rate}% across ${scoped.length} active faculty`;
    }

    setKpiModal({ type, title, subtitle, items });
  };

  const filteredModalItems = useMemo(() => {
    if (!kpiModal || !Array.isArray(kpiModal.items)) return [];
    if (!kpiModalSearch.trim()) return kpiModal.items;
    const q = kpiModalSearch.toLowerCase();
    return kpiModal.items.filter(item => {
      const nameMatch = (item.name || '').toLowerCase().includes(q);
      const idMatch = (item.employee_id || '').toLowerCase().includes(q);
      const deptMatch = (item.department || '').toLowerCase().includes(q);
      return nameMatch || idMatch || deptMatch;
    });
  }, [kpiModal, kpiModalSearch]);

  // Status badge styling
  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'present' || s === 'in office') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          {status === 'In Office' ? 'In Campus' : 'Present'}
        </span>
      );
    }
    if (s === 'left office') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
          Punched Out
        </span>
      );
    }
    if (s === 'absent') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-500" />
          Absent
        </span>
      );
    }
    if (s === 'leave') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          On Leave
        </span>
      );
    }
    if (s === 'half day') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          Half Day
        </span>
      );
    }
    if (s === 'weekly off') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
          Weekly Off
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
        {status || 'Unknown'}
      </span>
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-[var(--bg)] text-[#1F2937] flex flex-col lg:flex-row font-sans">
      <Sidebar />
      <div className="flex-1 h-screen overflow-y-auto overflow-x-hidden bg-[var(--bg)] p-3 sm:p-5 lg:p-8 pb-28 md:pb-12">
        
        {/* Top Header Card */}
        <div className="mb-6 bg-white border border-[#E4E2DA] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center border border-[var(--accent)]/30 shrink-0 shadow-xs">
              <UserCheck className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1F2937] tracking-tight flex items-center gap-2">
                Faculty Attendance System
              </h1>
              <p className="text-xs text-[#5B6676] font-medium mt-0.5">
                Daily Faculty Attendance, Biometric Logs & Historical Records
              </p>
            </div>
          </div>

          {/* Live Clock & Date Badge */}
          <div className="flex items-center gap-3 bg-[var(--surface-2)] px-4 py-2.5 rounded-xl border border-[#E4E2DA] shrink-0">
            <Clock className="w-4 h-4 text-[#8A6228]" />
            <div className="text-right">
              <span className="text-sm font-bold font-mono text-[#1F2937] block leading-none">
                {currentTime.toLocaleTimeString()}
              </span>
              <span className="text-[11px] text-[#5B6676] font-medium block mt-0.5">
                {currentTime.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 mb-6 overflow-x-auto py-1">
          <button
            onClick={() => { setActiveTab('daily'); setShowFaceScanner(false); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer flex items-center gap-2 ${
              activeTab === 'daily'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                : 'bg-white text-[#334155] border-[#E4E2DA] hover:bg-[#F3F1EA] hover:text-[#0F172A]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Daily Faculty Attendance
          </button>

          <button
            onClick={() => { setActiveTab('history'); setShowFaceScanner(false); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                : 'bg-white text-[#334155] border-[#E4E2DA] hover:bg-[#F3F1EA] hover:text-[#0F172A]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Attendance History & Logs
          </button>

          <button
            onClick={() => { setActiveTab('kiosk'); setShowFaceScanner(false); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer flex items-center gap-2 ${
              activeTab === 'kiosk'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                : 'bg-white text-[#334155] border-[#E4E2DA] hover:bg-[#F3F1EA] hover:text-[#0F172A]'
            }`}
          >
            <Camera className="w-4 h-4" />
            Faculty Punch-In & Kiosk
          </button>
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 1: DAILY FACULTY ATTENDANCE                               */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'daily' && (
          <div className="space-y-6">

            {/* Date Selection Bar & Filter Controls */}
            <div className="bg-white border border-[#E4E2DA] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
                
                {/* Date Picker & Prev/Next Quick Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center border border-[#E4E2DA] rounded-xl overflow-hidden bg-[var(--surface-2)] shadow-xs">
                    <button
                      onClick={handlePrevDay}
                      title="Previous Day"
                      className="p-2 hover:bg-[#E4E2DA] text-[#334155] transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="px-3 py-1.5 flex items-center gap-2 bg-white border-x border-[#E4E2DA]">
                      <Calendar className="w-4 h-4 text-[var(--accent)]" />
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-xs font-bold text-[#1F2937] bg-transparent outline-none cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={handleNextDay}
                      title="Next Day"
                      className="p-2 hover:bg-[#E4E2DA] text-[#334155] transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={handleSetToday}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      selectedDate === getTodayStr()
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40 font-bold'
                        : 'bg-white text-[#334155] border-[#E4E2DA] hover:bg-[#F3F1EA]'
                    }`}
                  >
                    Today
                  </button>

                  <div className="text-xs font-bold text-[#1F2937] px-2 hidden sm:inline">
                    {formatSelectedDateReadable(selectedDate)}
                  </div>
                </div>

                {/* Search & Refresh */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6676]" />
                    <input
                      type="text"
                      placeholder="Search faculty or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[var(--surface-2)] border border-[#E4E2DA] rounded-xl text-xs text-[#1F2937] placeholder-[#5B6676] focus:bg-white focus:border-[var(--accent)] outline-none transition-all"
                    />
                  </div>

                  <button
                    onClick={() => fetchDailyStatusData(selectedDate)}
                    disabled={dailyLoading}
                    className="p-2 bg-white border border-[#E4E2DA] hover:bg-[#F3F1EA] text-[#334155] rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    title="Refresh Daily Attendance"
                  >
                    <RefreshCw className={`w-4 h-4 ${dailyLoading ? 'animate-spin text-[var(--accent)]' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Primary Role / Category Scope Filter */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E4E2DA]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#5B6676] uppercase tracking-wider mr-1">Roster View:</span>
                  {[
                    { id: 'TEACHERS', label: `👨‍🏫 Teaching Faculty (${categoryCounts.teachers})` },
                    { id: 'ALL', label: `🏢 All School Staff (${categoryCounts.all})` },
                    { id: 'NON_TEACHING', label: `🔬 Non-Teaching (${categoryCounts.nonTeaching})` },
                    { id: 'SUPPORT', label: `🚌 Support & Admin (${categoryCounts.support})` },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-[var(--accent)] text-white shadow-xs font-bold ring-2 ring-[var(--accent)]/30'
                          : 'bg-[var(--surface-2)] text-[#5B6676] hover:text-[#1F2937] hover:bg-[#E4E2DA]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-[#5B6676] bg-[var(--surface-2)] px-2.5 py-1 rounded-lg border border-[#E4E2DA]">
                  {selectedCategory === 'TEACHERS' ? (
                    <span>Showing <strong>6 Teaching Faculty</strong> (matches Dashboard count)</span>
                  ) : (
                    <span>Showing <strong>{categoryCounts.all} Institutional Staff</strong> (6 Faculty + 9 Non-Teaching/Support)</span>
                  )}
                </div>
              </div>

              {/* Secondary Filter Chips Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E4E2DA] text-xs">
                
                {/* Status Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#5B6676] uppercase tracking-wider mr-1">Status:</span>
                  {[
                    { id: 'ALL', label: selectedCategory === 'TEACHERS' ? 'All Teachers' : 'All Staff' },
                    { id: 'PRESENT', label: 'Present / In Campus' },
                    { id: 'ABSENT', label: 'Absent' },
                    { id: 'LEAVE', label: 'Leave / Half Day' },
                    { id: 'WEEKLY_OFF', label: 'Weekly Off' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedStatusFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedStatusFilter === f.id
                          ? 'bg-[#1F2937] text-white shadow-xs font-bold'
                          : 'bg-[var(--surface-2)] text-[#5B6676] hover:text-[#1F2937] hover:bg-[#E4E2DA]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Department Dropdown Filter */}
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#5B6676]" />
                  <span className="text-[11px] font-bold text-[#5B6676] uppercase tracking-wider">Department:</span>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="px-2.5 py-1 bg-[var(--surface-2)] border border-[#E4E2DA] rounded-lg text-xs font-semibold text-[#1F2937] outline-none cursor-pointer"
                  >
                    <option value="ALL">All Departments</option>
                    {departmentsList.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Daily Summary Metric Cards (Interactive Drill-Down with Color Borders) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* Card 1: Total Faculty */}
              <div
                onClick={() => handleOpenKpiModal('TOTAL')}
                className="bg-white border-2 border-blue-200 hover:border-blue-400 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 group flex flex-col justify-between"
                title="Click to view total faculty roster"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900 mb-2">
                    <span>{selectedCategory === 'TEACHERS' ? 'Total Teachers' : 'Total Staff'}</span>
                    <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-black text-slate-900">{dailyStats.total}</div>
                    {selectedCategory === 'TEACHERS' ? (
                      <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        of 15 Staff
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        (6 Teachers)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium">
                    {selectedCategory === 'TEACHERS' ? 'Academic Teaching Faculty' : 'All Campus Employees'}
                  </div>
                </div>
                <div className="text-[10px] font-bold text-blue-700 flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                  <span>View Roster</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">➔</span>
                </div>
              </div>

              {/* Card 2: Present Today */}
              <div
                onClick={() => handleOpenKpiModal('PRESENT')}
                className="bg-white border-2 border-emerald-300 hover:border-emerald-500 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 group flex flex-col justify-between"
                title="Click to view all present teachers"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-2">
                    <span>Present Today</span>
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-700">{dailyStats.present}</div>
                  <div className="text-[11px] text-emerald-600 mt-1 font-medium">Logged In / On Campus</div>
                </div>
                <div className="text-[10px] font-bold text-emerald-700 flex items-center justify-between pt-2 border-t border-emerald-50 mt-2">
                  <span>View Present ({dailyStats.present})</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">➔</span>
                </div>
              </div>

              {/* Card 3: Absent */}
              <div
                onClick={() => handleOpenKpiModal('ABSENT')}
                className="bg-white border-2 border-rose-300 hover:border-rose-500 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 group flex flex-col justify-between"
                title="Click to view absent teachers"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-rose-800 mb-2">
                    <span>Absent</span>
                    <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100 group-hover:scale-105 transition-transform">
                      <XCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-rose-700">{dailyStats.absent}</div>
                  <div className="text-[11px] text-rose-600 mt-1 font-medium">Not Punched In</div>
                </div>
                <div className="text-[10px] font-bold text-rose-700 flex items-center justify-between pt-2 border-t border-rose-50 mt-2">
                  <span>View Absent ({dailyStats.absent})</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">➔</span>
                </div>
              </div>

              {/* Card 4: On Leave / Half Day */}
              <div
                onClick={() => handleOpenKpiModal('LEAVE')}
                className="bg-white border-2 border-amber-300 hover:border-amber-500 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 group flex flex-col justify-between"
                title="Click to view faculty on leave"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-2">
                    <span>On Leave / Half Day</span>
                    <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-amber-800">{dailyStats.leave}</div>
                  <div className="text-[11px] text-amber-700 mt-1 font-medium">Approved Leaves</div>
                </div>
                <div className="text-[10px] font-bold text-amber-800 flex items-center justify-between pt-2 border-t border-amber-50 mt-2">
                  <span>View Leaves ({dailyStats.leave})</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">➔</span>
                </div>
              </div>

              {/* Card 5: Attendance Rate */}
              <div
                onClick={() => handleOpenKpiModal('RATE')}
                className="bg-white border-2 border-indigo-200 hover:border-indigo-400 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 group flex flex-col justify-between col-span-2 sm:col-span-1"
                title="Click to view presence rate breakdown"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900 mb-2">
                    <span>Attendance Rate</span>
                    <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <div className="text-2xl font-black text-slate-900">{dailyStats.rate}%</div>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, Number(dailyStats.rate) || 0))}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium">Active Presence Rate</div>
                </div>
                <div className="text-[10px] font-bold text-indigo-700 flex items-center justify-between pt-2 border-t border-indigo-50 mt-2">
                  <span>Analytics</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">➔</span>
                </div>
              </div>
            </div>

            {/* Daily Faculty Attendance Table */}
            <div className="bg-white border border-[#E4E2DA] rounded-2xl shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E4E2DA] flex justify-between items-center bg-[#FAF9F5]">
                <div>
                  <h3 className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
                    <span>
                      {selectedCategory === 'TEACHERS'
                        ? 'Teacher Attendance Roster'
                        : selectedCategory === 'NON_TEACHING'
                        ? 'Non-Teaching Staff Attendance Roster'
                        : selectedCategory === 'SUPPORT'
                        ? 'Support & Administration Roster'
                        : 'Institutional Staff Attendance Roster'
                      }
                    </span>
                    <span className="text-xs font-normal text-[#5B6676]">— {formatSelectedDateReadable(selectedDate)}</span>
                  </h3>
                  <p className="text-[11px] text-[#5B6676] mt-0.5">
                    Showing {filteredDailyData.length} of {selectedCategory === 'TEACHERS' ? `${categoryCounts.teachers} teaching faculty records (6 on dashboard)` : `${dailyData.length} total institutional records`}
                  </p>
                </div>
              </div>

              {dailyLoading ? (
                <div className="text-center py-16">
                  <Spinner size="lg" className="mx-auto" />
                  <p className="text-xs text-[#5B6676] mt-3 font-medium">Loading faculty records for {selectedDate}...</p>
                </div>
              ) : filteredDailyData.length === 0 ? (
                <div className="text-center py-16 bg-[#FAF9F5] border-t border-[#E4E2DA]">
                  <UserX className="w-10 h-10 text-[#5B6676] mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-bold text-[#1F2937]">No faculty attendance records match your filter</p>
                  <p className="text-xs text-[#5B6676] mt-1">Try resetting the department or status filter</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--surface-2)] border-b border-[#E4E2DA] text-[#5B6676] font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Faculty Member</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Punch-In</th>
                        <th className="py-3 px-4">Punch-Out</th>
                        <th className="py-3 px-4">Working Hours</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E2DA]">
                      {filteredDailyData.map((teacher, idx) => {
                        return (
                          <tr key={teacher.employee_id || idx} className="hover:bg-[#FAF9F5] transition-colors">
                            
                            {/* Faculty Name & ID */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-black text-xs flex items-center justify-center border border-[var(--accent)]/30 shrink-0">
                                  {teacher.name ? teacher.name.charAt(0).toUpperCase() : 'F'}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-[#1F2937] truncate">{teacher.name}</div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] font-mono text-[#5B6676]">{teacher.employee_id}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                      teacher.is_teacher || (teacher.employee_id || '').toUpperCase().startsWith('EMP')
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-stone-100 text-stone-600 border-stone-200'
                                    }`}>
                                      {teacher.is_teacher || (teacher.employee_id || '').toUpperCase().startsWith('EMP') ? 'Faculty' : (teacher.category || 'Staff')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Department */}
                            <td className="py-3 px-4">
                              <span className="inline-block px-2.5 py-0.5 rounded-md bg-[var(--surface-2)] border border-[#E4E2DA] text-[11px] font-medium text-[#334155]">
                                {teacher.department || 'General'}
                              </span>
                            </td>

                            {/* Punch In */}
                            <td className="py-3 px-4 font-mono">
                              {teacher.punch_in ? (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <LogIn className="w-3 h-3 text-emerald-600" />
                                  {formatTime(teacher.punch_in)}
                                </span>
                              ) : (
                                <span className="text-[#5B6676] italic">—</span>
                              )}
                            </td>

                            {/* Punch Out */}
                            <td className="py-3 px-4 font-mono">
                              {teacher.punch_out ? (
                                <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                  <LogOut className="w-3 h-3 text-slate-600" />
                                  {formatTime(teacher.punch_out)}
                                </span>
                              ) : teacher.status === 'In Office' ? (
                                <span className="text-[11px] text-emerald-600 font-semibold italic">On Duty</span>
                              ) : (
                                <span className="text-[#5B6676] italic">—</span>
                              )}
                            </td>

                            {/* Working Hours */}
                            <td className="py-3 px-4 font-mono font-medium text-[#334155]">
                              {calcWorkingDuration(teacher)}
                            </td>

                            {/* Status Badge */}
                            <td className="py-3 px-4 text-center">
                              {renderStatusBadge(teacher.status)}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditAttModal(
                                    { name: teacher.name, employee_id: teacher.employee_id, department: teacher.department },
                                    { date: selectedDate, day: new Date(selectedDate).toLocaleDateString([], { weekday: 'short' }), status: teacher.status }
                                  )}
                                  className="px-2.5 py-1 bg-white hover:bg-[#F3F1EA] text-[#334155] hover:text-[#1F2937] border border-[#E4E2DA] rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="Edit Attendance Status"
                                >
                                  <Edit3 className="w-3 h-3 text-[var(--accent)]" />
                                  <span>Update</span>
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
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 2: ATTENDANCE HISTORY & MONTHLY GRID                      */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div className="space-y-8">
            
            {/* Monthly Calendar Grid View */}
            <div className="bg-white border border-[#E4E2DA] shadow-xs rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                <div>
                  <h3 className="text-base font-bold text-[#1F2937] flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[var(--accent)]" />
                    Monthly Faculty Attendance Matrix
                  </h3>
                  <p className="text-xs text-[#5B6676] mt-0.5">
                    Click any day cell (P, A, WO, L) to edit status and log administrative audit remarks.
                  </p>
                </div>

                <button 
                  onClick={() => handleExport('details')} 
                  disabled={exportingType === 'details'} 
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {exportingType === 'details' ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Export Matrix to Excel
                </button>
              </div>

              {/* Month/Year & Category Selectors */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-3 bg-[var(--surface-2)] rounded-xl border border-[#E4E2DA]">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#5B6676]">View:</span>
                    {[
                      { id: 'TEACHERS', label: '👨‍🏫 Teaching Faculty' },
                      { id: 'ALL', label: '🏢 All Staff' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedCategory === cat.id
                            ? 'bg-[var(--accent)] text-white shadow-xs'
                            : 'bg-white text-[#5B6676] hover:text-[#1F2937] border border-[#E4E2DA]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="h-4 w-px bg-[#E4E2DA] hidden sm:block"></div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#5B6676]">Month:</span>
                    <select 
                      value={reportMonth} 
                      onChange={e => setReportMonth(+e.target.value)} 
                      className="px-3 py-1.5 border border-[#E4E2DA] rounded-lg text-xs bg-white text-[#1F2937] font-bold outline-none cursor-pointer"
                    >
                      {MONTH_NAMES.slice(1).map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#5B6676]">Year:</span>
                    <select 
                      value={reportYear} 
                      onChange={e => setReportYear(+e.target.value)} 
                      className="px-3 py-1.5 border border-[#E4E2DA] rounded-lg text-xs bg-white text-[#1F2937] font-bold outline-none cursor-pointer"
                    >
                      {[2024, 2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    onClick={fetchDetails} 
                    className="px-4 py-1.5 bg-[var(--accent)] hover:opacity-90 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    Load Report
                  </button>
                </div>

                {/* Legend */}
                <div className="hidden lg:flex items-center gap-3 text-[11px] font-semibold text-[#5B6676]">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Present (P)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> Absent (A)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-stone-300"></span> Weekly Off (WO)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Leave (L)
                  </span>
                </div>
              </div>

              {reportLoading ? (
                <div className="text-center py-12"><Spinner size="lg" className="mx-auto" /></div>
              ) : details ? (
                <div className="space-y-4">
                  <div className="text-xs text-[#5B6676] font-medium flex items-center justify-between">
                    <span>
                      <strong className="text-[#1F2937]">{MONTH_NAMES[details.month]} {details.year}</strong> • {details.days_in_month} Calendar Days
                    </span>
                    <span className="text-[11px] text-[#5B6676] bg-[var(--surface-2)] px-2.5 py-1 rounded-lg border border-[#E4E2DA]">
                      {selectedCategory === 'TEACHERS'
                        ? 'Showing 6 Teaching Faculty (Dashboard Aligned)'
                        : `Showing ${details.employees?.length || 15} Total Institutional Staff`
                      }
                    </span>
                  </div>

                  {(() => {
                    const allEmps = details.employees || [];
                    const empId = user?.isAdmin || user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'principal'
                      ? ''
                      : (user?.employee_id || user?.employeeId);
                    const myEmps = empId
                      ? allEmps.filter(emp => emp.employee_id === empId || emp.name === user?.name)
                      : [];
                    const baseList = myEmps.length > 0 ? myEmps : allEmps;
                    const displayEmps = baseList.filter(emp => {
                      const isTeacher = emp.is_teacher || (emp.employee_id || '').toUpperCase().startsWith('EMP');
                      if (selectedCategory === 'TEACHERS') return isTeacher;
                      return true;
                    });

                    if (displayEmps.length === 0) {
                      return (
                        <p className="text-center text-[#5B6676] py-12 italic bg-[#FAF9F5] border border-[#E4E2DA] rounded-2xl">
                          No faculty attendance records found for this month.
                        </p>
                      );
                    }

                    const dateRows = displayEmps[0]?.daily || [];

                    return (
                      <div className="overflow-x-auto border border-[#E4E2DA] rounded-xl shadow-xs max-w-full">
                        <table className="min-w-full divide-y divide-[#E4E2DA] text-xs">
                          <thead className="bg-[#FAF9F5] text-[#1F2937] sticky top-0 z-20">
                            <tr>
                              <th className="px-3 py-3 text-left font-bold uppercase tracking-wider sticky left-0 bg-[#FAF9F5] z-30 border-r border-[#E4E2DA] min-w-[160px]">
                                Faculty Member
                              </th>
                              {dateRows.map((row, j) => {
                                const dayNum = row.date?.split('-')[2] || (j + 1);
                                const shortDay = row.day?.slice(0, 3) || '';
                                return (
                                  <th key={j} className="px-1.5 py-2 text-center font-bold uppercase tracking-wider whitespace-nowrap min-w-[42px] border-r border-[#E4E2DA]">
                                    <div className="flex flex-col items-center">
                                      <span className="text-[#1F2937] font-black text-xs">{dayNum}</span>
                                      <span className="text-[9px] text-[#8A6228] font-mono font-medium">{shortDay}</span>
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E4E2DA] bg-white text-[#1F2937]">
                            {displayEmps.map((emp, i) => (
                              <tr key={emp.employee_id || i} className="hover:bg-[#FAF9F5] transition-colors">
                                <td className="px-3 py-2.5 sticky left-0 bg-white z-10 border-r border-[#E4E2DA] shadow-xs whitespace-nowrap min-w-[160px]">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-[#1F2937] text-xs">{emp.name}</span>
                                    <span className="text-[10px] text-[#5B6676] font-mono">{emp.employee_id}</span>
                                  </div>
                                </td>
                                {dateRows.map((_, j) => {
                                  const dayData = emp.daily?.[j] || {};
                                  const isPresent = dayData.status === 'Present' || dayData.status === 'In Office' || dayData.status === 'Left Office';
                                  return (
                                    <td key={j} className="px-1.5 py-2 text-center border-r border-[#E4E2DA]">
                                      {isPresent ? (
                                        <button 
                                          onClick={() => handleOpenEditAttModal(emp, dayData)}
                                          title={`Click to edit ${emp.name} (${dayData.date}) | Status: ${dayData.status}`}
                                          className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] shadow-xs cursor-pointer hover:scale-110 active:scale-95 transition-all"
                                        >
                                          P
                                        </button>
                                      ) : dayData.status === 'Weekly Off' ? (
                                        <button 
                                          onClick={() => handleOpenEditAttModal(emp, dayData)}
                                          title={`Click to edit ${emp.name} (${dayData.date}) | Status: Weekly Off`}
                                          className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-500 font-bold text-[9px] cursor-pointer hover:scale-110 active:scale-95 transition-all border border-stone-200"
                                        >
                                          WO
                                        </button>
                                      ) : dayData.status === 'Leave' ? (
                                        <button 
                                          onClick={() => handleOpenEditAttModal(emp, dayData)}
                                          title={`Click to edit ${emp.name} (${dayData.date}) | Status: Leave`}
                                          className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xs"
                                        >
                                          L
                                        </button>
                                      ) : dayData.status === 'Half Day' ? (
                                        <button 
                                          onClick={() => handleOpenEditAttModal(emp, dayData)}
                                          title={`Click to edit ${emp.name} (${dayData.date}) | Status: Half Day`}
                                          className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-500 hover:bg-blue-600 text-white font-bold text-[9px] cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xs"
                                        >
                                          HD
                                        </button>
                                      ) : (
                                        <button 
                                          onClick={() => handleOpenEditAttModal(emp, dayData)}
                                          title={`Click to edit ${emp.name} (${dayData.date}) | Status: ${dayData.status}`}
                                          className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-700 font-black text-[10px] shadow-xs cursor-pointer hover:scale-110 active:scale-95 transition-all border border-rose-200"
                                        >
                                          A
                                        </button>
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
              ) : (
                <p className="text-center text-[#5B6676] py-12 italic bg-[#FAF9F5] border border-[#E4E2DA] rounded-2xl">
                  Select month/year and click "Load Report" to display the monthly matrix.
                </p>
              )}
            </div>

            {/* Detailed Punch Logs Table */}
            <div className="bg-white border border-[#E4E2DA] shadow-xs rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                <div>
                  <h3 className="text-base font-bold text-[#1F2937] flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[var(--accent)]" />
                    Biometric & Kiosk Punch Records
                  </h3>
                  <p className="text-xs text-[#5B6676] mt-0.5">
                    Live raw log timestamps captured via campus terminals and mobile check-ins.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6676]" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-[var(--surface-2)] border border-[#E4E2DA] rounded-xl text-xs text-[#1F2937] placeholder-[#5B6676] focus:bg-white focus:border-[var(--accent)] outline-none"
                  />
                </div>
              </div>

              {logsLoading ? (
                <div className="text-center py-12"><Spinner size="lg" className="mx-auto" /></div>
              ) : personalLogs.length === 0 ? (
                <p className="text-[#5B6676] text-xs italic text-center py-8 bg-[#FAF9F5] border border-[#E4E2DA] rounded-xl">
                  No attendance log entries found.
                </p>
              ) : (
                <div className="overflow-x-auto border border-[#E4E2DA] rounded-xl shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--surface-2)] border-b border-[#E4E2DA] text-[#5B6676] font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Faculty Member</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Punch-In Time</th>
                        <th className="py-3 px-4">Punch-Out Time</th>
                        <th className="py-3 px-4">Terminal / Location</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E2DA] bg-white">
                      {personalLogs
                        .filter(log => {
                          if (!logSearchQuery.trim()) return true;
                          const q = logSearchQuery.toLowerCase();
                          return (log.teacher?.name || '').toLowerCase().includes(q) ||
                                 (log.date || '').toLowerCase().includes(q) ||
                                 (log.address || '').toLowerCase().includes(q);
                        })
                        .map((log, idx) => (
                          <tr key={idx} className="hover:bg-[#FAF9F5] text-[#1F2937] transition-colors">
                            <td className="py-3 px-4 font-bold text-[#1F2937]">{log.teacher?.name || 'Faculty Member'}</td>
                            <td className="py-3 px-4 font-mono font-bold text-[#1F2937]">{log.date}</td>
                            <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                              {log.punchIn ? formatTime(log.punchIn) : '—'}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-700">
                              {log.punchOut ? formatTime(log.punchOut) : '—'}
                            </td>
                            <td className="py-3 px-4 text-[#5B6676] truncate max-w-[200px]" title={log.address}>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#5B6676] shrink-0" />
                                {log.address || 'Main Campus Gate Kiosk'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {renderStatusBadge(log.status)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 3: FACULTY PUNCH-IN & GATE KIOSK                          */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'kiosk' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {showFaceScanner ? (
              <div className="bg-white border border-[#E4E2DA] shadow-xs rounded-2xl p-6 relative">
                <button
                  onClick={() => setShowFaceScanner(false)}
                  className="absolute top-4 right-4 bg-[var(--surface-2)] hover:bg-[#E4E2DA] text-[#1F2937] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  ✕ Close Scanner
                </button>
                <FaceVerification
                  userId={user?._id || 'kiosk'}
                  onVerified={handleFaceVerified}
                  onFailed={(msg) => toast.error(msg || 'Face Verification Failed')}
                  verifyFn={handlePunchInVerification}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Personal Punch-In Card */}
                <div className="bg-white border border-[#E4E2DA] shadow-xs rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#1F2937] mb-2 flex items-center gap-2">
                      <Camera className="w-5 h-5 text-[var(--accent)]" />
                      Personal Punch-In Console
                    </h3>
                    <p className="text-xs text-[#5B6676] mb-6 leading-relaxed">
                      Punched in logs will be recorded under your faculty profile. Verification performs 
                      biometric liveness checks and validates your campus geofence range.
                    </p>

                    {/* GPS indicator */}
                    <div className="mb-6 bg-[var(--surface-2)] p-3 rounded-xl border border-[#E4E2DA] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span className="font-medium text-[#1F2937]">Campus GPS Coordinates:</span>
                      </div>
                      <span className="font-mono text-[11px] text-[#5B6676] font-bold">
                        {geoPosition?.latitude ? `${geoPosition.latitude.toFixed(4)}, ${geoPosition.longitude.toFixed(4)}` : '13.0389, 77.5768'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handlePersonalScanTrigger}
                      className="w-full py-3 bg-[var(--accent)] hover:opacity-95 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Biometric Face Punch-In
                    </button>

                    <button
                      onClick={handleExpressPunchIn}
                      disabled={isPunchingOut}
                      className="w-full py-2.5 bg-[#B8864B] hover:bg-[#8A6228] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Express 1-Click Punch-In
                    </button>

                    <button
                      onClick={handlePunchOut}
                      disabled={isPunchingOut}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4" />
                      {isPunchingOut ? 'Processing...' : 'Punch-Out'}
                    </button>
                  </div>
                </div>

                {/* Gate Terminal Kiosk Mode */}
                <div className="bg-white border border-[#E4E2DA] shadow-xs rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#1F2937] mb-2 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[var(--accent)]" />
                      Shared Campus Gate Terminal
                    </h3>
                    <p className="text-xs text-[#5B6676] mb-6 leading-relaxed">
                      Used as a wall-mounted physical gate terminal. Enter your unique faculty ID to trigger 
                      instant facial recognition matching.
                    </p>

                    <form onSubmit={handleKioskScanTrigger} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-[#5B6676] uppercase tracking-wider mb-2">
                          Faculty / Staff ID Reference
                        </label>
                        <input
                          type="text"
                          value={kioskEmpId}
                          onChange={(e) => setKioskEmpId(e.target.value.toUpperCase())}
                          placeholder="e.g. EMP001, EMP002"
                          className="w-full px-4 py-2.5 bg-[var(--surface-2)] border border-[#E4E2DA] rounded-xl text-xs font-mono font-bold text-[#1F2937] uppercase focus:bg-white focus:border-[var(--accent)] outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          type="submit"
                          className="py-2.5 bg-[var(--accent)] hover:opacity-95 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Scan Face
                        </button>

                        <button
                          type="button"
                          onClick={handlePunchOut}
                          disabled={isPunchingOut}
                          className="py-2.5 bg-white border border-[#E4E2DA] hover:bg-[#FAF9F5] text-[#1F2937] font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-600" />
                          Punch-Out
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#E4E2DA] text-center">
                    <span className="text-[11px] text-[#5B6676]">
                      Compatible with external USB and tablet biometric sensors
                    </span>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* EDIT ATTENDANCE STATUS MODAL                                  */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {showEditAttModal && editAttEmployee && editAttDayData && (
        <div className="fixed inset-0 z-50 bg-[#1F2937]/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E4E2DA] w-full max-w-md overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-[#FAF9F5] border-b border-[#E4E2DA] p-5 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[var(--accent)]" />
                  Update Teacher Attendance Status
                </h3>
                <p className="text-[11px] text-[#5B6676] mt-0.5">
                  Administrative override for audit and payroll logs
                </p>
              </div>
              <button 
                onClick={() => setShowEditAttModal(false)}
                className="text-[#5B6676] hover:text-[#1F2937] text-lg font-bold p-1 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              
              {/* Teacher Info Card */}
              <div className="bg-[var(--surface-2)] p-3.5 rounded-xl border border-[#E4E2DA] flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#1F2937] text-xs">{editAttEmployee.name}</div>
                  <div className="text-[11px] font-mono text-[#5B6676]">{editAttEmployee.employee_id} • {editAttEmployee.department || 'Faculty'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-[#1F2937]">{editAttDayData.date}</div>
                  <div className="text-[10px] text-[#8A6228] font-mono font-semibold">{editAttDayData.day || ''}</div>
                </div>
              </div>

              {/* Status Radio / Selector */}
              <div>
                <label className="block text-[11px] font-bold text-[#5B6676] uppercase tracking-wider mb-2">
                  Select Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'Present', label: 'Present / In Campus', class: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                    { key: 'Absent', label: 'Absent', class: 'border-rose-500 bg-rose-50 text-rose-800' },
                    { key: 'Leave', label: 'Approved Leave', class: 'border-amber-500 bg-amber-50 text-amber-800' },
                    { key: 'Half Day', label: 'Half Day', class: 'border-blue-500 bg-blue-50 text-blue-800' },
                    { key: 'Weekly Off', label: 'Weekly Off', class: 'border-stone-400 bg-stone-100 text-stone-700' }
                  ].map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setEditAttStatus(item.key)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                        editAttStatus === item.key 
                          ? `${item.class} shadow-xs ring-2 ring-[var(--accent)]` 
                          : 'border-[#E4E2DA] bg-white text-[#5B6676] hover:bg-[#FAF9F5]'
                      }`}
                    >
                      <span>{item.label}</span>
                      {editAttStatus === item.key && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Administrative Reason / Remark */}
              <div>
                <label className="block text-[11px] font-bold text-[#5B6676] uppercase tracking-wider mb-2">
                  Audit Reason / Remark (Optional)
                </label>
                <input
                  type="text"
                  value={editAttReason}
                  onChange={(e) => setEditAttReason(e.target.value)}
                  placeholder="e.g. Approved sick leave, duty leave, biometric discrepancy"
                  className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[#E4E2DA] rounded-xl text-xs text-[#1F2937] focus:bg-white focus:border-[var(--accent)] outline-none"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditAttModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E4E2DA] text-[#5B6676] hover:bg-[#FAF9F5] text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendanceStatus}
                  disabled={isSavingAttStatus}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSavingAttStatus ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Save Status
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* KPI METRICS DRILL-DOWN MODAL                                   */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {kpiModal && (
        <div className="fixed inset-0 z-50 bg-[#1F2937]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E4E2DA] w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="bg-[#FAF9F5] border-b border-[#E4E2DA] p-4 sm:p-5 flex justify-between items-start gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  kpiModal.type === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  kpiModal.type === 'ABSENT' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                  kpiModal.type === 'LEAVE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  kpiModal.type === 'RATE' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {kpiModal.type === 'PRESENT' ? <CheckCircle2 className="w-5 h-5" /> :
                   kpiModal.type === 'ABSENT' ? <XCircle className="w-5 h-5" /> :
                   kpiModal.type === 'LEAVE' ? <AlertCircle className="w-5 h-5" /> :
                   kpiModal.type === 'RATE' ? <UserCheck className="w-5 h-5" /> :
                   <Users className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F2937] flex items-center gap-2">
                    <span>{kpiModal.title}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      kpiModal.type === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      kpiModal.type === 'ABSENT' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      kpiModal.type === 'LEAVE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {kpiModal.items.length} Records
                    </span>
                  </h3>
                  <p className="text-xs text-[#5B6676] mt-0.5">{kpiModal.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setKpiModal(null)}
                className="text-[#5B6676] hover:text-[#1F2937] p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Filter Search inside Modal */}
            <div className="px-5 py-2.5 border-b border-[#E4E2DA] bg-white flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={kpiModalSearch}
                onChange={(e) => setKpiModalSearch(e.target.value)}
                placeholder="Filter by teacher name, employee ID, or department..."
                className="w-full text-xs font-medium text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
              />
              {kpiModalSearch && (
                <button
                  type="button"
                  onClick={() => setKpiModalSearch('')}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Modal Body / Faculty Roster List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-100">
              {filteredModalItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No matching faculty records found for this metric.
                </div>
              ) : (
                filteredModalItems.map((emp, idx) => {
                  const statusLower = (emp.status || '').toLowerCase();
                  const isPresent = statusLower === 'present' || statusLower === 'in office' || statusLower === 'left office';
                  const isAbsent = statusLower === 'absent';
                  const isLeave = statusLower === 'leave' || statusLower === 'half day';

                  return (
                    <div key={emp.employee_id || emp.id || idx} className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-[#1F2937] flex items-center justify-center font-bold text-xs shrink-0">
                          {emp.name?.charAt(0) || 'F'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#1F2937]">{emp.name}</span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                              {emp.employee_id || 'FAC'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{emp.department || 'Academic Faculty'}</span>
                            {emp.punch_in && (
                              <span>• Punch-In: <strong className="text-slate-700 font-mono">{emp.punch_in}</strong></span>
                            )}
                            {emp.working_hours && (
                              <span>• Working: {emp.working_hours}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          isPresent ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          isAbsent ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          isLeave ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {isPresent ? '● In Campus' : isAbsent ? '✕ Absent' : isLeave ? '⚠ On Leave' : emp.status}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setKpiModal(null);
                            handleOpenEditAttModal(emp, emp);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
                        >
                          ✏️ Update
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-[#FAF9F5] border-t border-[#E4E2DA] p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-[#5B6676]">
                Showing {filteredModalItems.length} of {kpiModal.items.length} records
              </span>
              <div className="flex items-center gap-2">
                {kpiModal.type !== 'RATE' && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetFilter = kpiModal.type === 'PRESENT' ? 'Present' :
                        kpiModal.type === 'ABSENT' ? 'Absent' :
                        kpiModal.type === 'LEAVE' ? 'Leave' : 'ALL';
                      setSelectedStatusFilter(targetFilter);
                      setKpiModal(null);
                      toast.success(`Filtered roster table by ${targetFilter}`);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                  >
                    Filter Table Below ➔
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setKpiModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-[#29456D] hover:bg-blue-900 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
