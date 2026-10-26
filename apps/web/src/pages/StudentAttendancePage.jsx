import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  QrCode,
  Scan,
  Camera,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Printer,
  Download,
  Search,
  Filter,
  Settings,
  ShieldCheck,
  Sparkles,
  Layers,
  Send,
  MessageSquare,
  Mail,
  Phone,
  RefreshCw,
  Sliders,
  Eye,
  Trash2,
  Plus,
  Award,
  History,
  UserX,
  Check,
  ChevronDown,
  Calendar,
  Volume2,
  BadgeAlert,
  ArrowRight,
  Smile,
  GraduationCap
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import Sidebar from '../components/ui/Sidebar';
import studentAttendanceService from '../services/studentAttendanceService';
import { useAuth } from '../context/AuthContext';

// Helper: Sound Synthesizer for Scanner Beep
const playBeep = (type = 'success') => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.08); // A6 note
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'warning') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (_) {}
};

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active Tab: dashboard | manual | scan | face | biometrics | id-cards | reports | notifications | settings
  const activeTab = searchParams.get('tab') || 'dashboard';

  const setTab = (newTab) => {
    setSearchParams({ tab: newTab });
  };

  // Shared Filter States
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [selectedClass, setSelectedClass] = useState('10th');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedSession, setSelectedSession] = useState('FULL_DAY');
  const [academicYear, setAcademicYear] = useState('2026-2027');

  // Classes Catalogue
  const [classList, setClassList] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Settings State
  const [rules, setRules] = useState({
    academicYear: '2026-2027',
    lateThresholdTime: '08:45 AM',
    halfDayThresholdTime: '11:30 AM',
    checkOutEnabled: true,
    lowAttendanceThreshold: 75.0,
    faceConfidenceThreshold: 80.0,
    allowManualOverride: true,
    smsEnabled: false,
    emailEnabled: true,
    whatsappEnabled: false,
    notifyOnAbsent: true,
    notifyOnLate: true,
    notifyOnPresent: false,
    smsTemplate: '',
    emailTemplate: '',
    whatsappTemplate: ''
  });

  // ─────────────────────────────────────────────────────────────
  // TAB 1: DASHBOARD DATA
  // ─────────────────────────────────────────────────────────────
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const fetchDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const res = await studentAttendanceService.getDashboard({
        date: selectedDate,
        standard: selectedClass,
        section: selectedSection,
        academicYear
      });
      if (res.data?.status) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err.message);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // TAB 2: MANUAL ATTENDANCE ROSTER
  // ─────────────────────────────────────────────────────────────
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [notifyParentsOnSave, setNotifyParentsOnSave] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [manualSearch, setManualSearch] = useState('');

  const fetchRoster = async () => {
    setLoadingRoster(true);
    try {
      const res = await studentAttendanceService.getRoster({
        date: selectedDate,
        standard: selectedClass,
        section: selectedSection,
        session: selectedSession
      });
      if (res.data?.status) {
        setRoster(res.data.data || []);
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      toast.error('Failed to load class roster');
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleStatusChange = (studentId, newStatus) => {
    setRoster(prev => prev.map(s => {
      if (s.studentId === studentId) {
        return {
          ...s,
          status: newStatus,
          checkInTime: (newStatus === 'Present' || newStatus === 'Late') ? (s.checkInTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : ''
        };
      }
      return s;
    }));
    setHasUnsavedChanges(true);
  };

  const handleRemarkChange = (studentId, text) => {
    setRoster(prev => prev.map(s => s.studentId === studentId ? { ...s, remarks: text } : s));
    setHasUnsavedChanges(true);
  };

  const handleMarkAll = (status) => {
    if (!window.confirm(`Are you sure you want to mark all students as "${status}"?`)) return;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setRoster(prev => prev.map(s => ({
      ...s,
      status,
      checkInTime: (status === 'Present' || status === 'Late') ? nowTime : ''
    })));
    setHasUnsavedChanges(true);
    toast.success(`Marked all students as ${status}`);
  };

  const handleResetRoster = () => {
    if (!window.confirm('Reset all changes and reload recorded attendance?')) return;
    fetchRoster();
  };

  const handleSaveManualAttendance = async () => {
    setSavingManual(true);
    try {
      const res = await studentAttendanceService.saveManual({
        date: selectedDate,
        classId: `${selectedClass}-${selectedSection}`,
        session: selectedSession,
        academicYear,
        attendanceList: roster,
        notifyParents: notifyParentsOnSave
      });
      if (res.data?.status) {
        toast.success(res.data.message || 'Attendance saved successfully!');
        setHasUnsavedChanges(false);
        fetchRoster();
        fetchDashboard();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSavingManual(false);
    }
  };

  // Warn on leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved attendance changes. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ─────────────────────────────────────────────────────────────
  // TAB 3: BARCODE / QR SCANNER STATE
  // ─────────────────────────────────────────────────────────────
  const [scanMode, setScanMode] = useState('usb'); // 'usb' | 'camera'
  const [scanType, setScanType] = useState('CHECK_IN'); // 'CHECK_IN' | 'CHECK_OUT'
  const [usbInput, setUsbInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const usbInputRef = useRef(null);
  const videoScannerRef = useRef(null);

  const processScanCode = async (code) => {
    if (!code || isProcessingScan) return;
    setIsProcessingScan(true);

    try {
      const res = await studentAttendanceService.scanQr({
        qrCode: code,
        scanType,
        session: selectedSession,
        date: selectedDate,
        deviceInfo: scanMode === 'camera' ? 'Webcam Scanner' : 'USB Barcode Reader'
      });

      if (res.data?.status) {
        setScanResult(res.data);
        if (res.data.isDuplicate) {
          playBeep('warning');
          toast(res.data.message, { icon: '⚠️' });
        } else {
          playBeep('success');
          toast.success(res.data.message);
        }

        // Add to station log
        setScanHistory(prev => [{
          id: Date.now(),
          student: res.data.data?.student,
          status: res.data.data?.status,
          time: res.data.data?.scanTime || new Date().toLocaleTimeString(),
          scanType,
          isDuplicate: res.data.isDuplicate
        }, ...prev.slice(0, 14)]);
      }
    } catch (err) {
      playBeep('warning');
      const msg = err.response?.data?.message || 'Scan rejected or student not found';
      setScanResult({
        status: false,
        message: msg,
        code: err.response?.data?.code || 'ERROR'
      });
      toast.error(msg);
    } finally {
      setIsProcessingScan(false);
      setUsbInput('');
      if (usbInputRef.current && scanMode === 'usb') {
        usbInputRef.current.focus();
      }
    }
  };

  const handleUsbKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processScanCode(usbInput);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // TAB 4: FACE RECOGNITION ATTENDANCE
  // ─────────────────────────────────────────────────────────────
  const [faceCameraActive, setFaceCameraActive] = useState(false);
  const [faceResult, setFaceResult] = useState(null);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [faceConfidence, setFaceConfidence] = useState(null);
  const faceVideoRef = useRef(null);

  const startFaceCamera = async () => {
    setFaceCameraActive(true);
    setFaceResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
        faceVideoRef.current.play();
      }
    } catch (err) {
      toast.error('Camera access denied or unavailable: ' + err.message);
      setFaceCameraActive(false);
    }
  };

  const stopFaceCamera = () => {
    if (faceVideoRef.current && faceVideoRef.current.srcObject) {
      const tracks = faceVideoRef.current.srcObject.getTracks();
      tracks.forEach(t => t.stop());
      faceVideoRef.current.srcObject = null;
    }
    setFaceCameraActive(false);
  };

  const handleTriggerFacePunch = async () => {
    if (!faceCameraActive || isVerifyingFace) return;
    setIsVerifyingFace(true);

    try {
      // Capture canvas snapshot
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (faceVideoRef.current) {
        ctx.drawImage(faceVideoRef.current, 0, 0, 640, 480);
      }
      const base64 = canvas.toDataURL('image/jpeg', 0.8);

      const res = await studentAttendanceService.faceRecognize({
        currentImage: base64,
        date: selectedDate,
        session: selectedSession,
        deviceInfo: 'Gate Biometric Camera'
      });

      if (res.data?.status) {
        setFaceResult(res.data);
        setFaceConfidence(res.data.confidence);

        if (res.data.matched) {
          playBeep('success');
          toast.success(res.data.message);
        } else {
          playBeep('warning');
          toast.error(res.data.message);
        }
      }
    } catch (err) {
      playBeep('warning');
      const msg = err.response?.data?.message || 'Face verification failed';
      setFaceResult({ status: false, message: msg });
      toast.error(msg);
    } finally {
      setIsVerifyingFace(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // TAB 5: BIOMETRICS & CONSENT
  // ─────────────────────────────────────────────────────────────
  const [biometricsList, setBiometricsList] = useState([]);
  const [loadingBiometrics, setLoadingBiometrics] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedBioStudent, setSelectedBioStudent] = useState(null);
  const [consentForm, setConsentForm] = useState({
    status: 'CONSENT_GRANTED',
    guardianName: '',
    guardianPhone: '',
    guardianRelation: 'Mother'
  });

  const fetchBiometrics = async () => {
    setLoadingBiometrics(true);
    try {
      const res = await studentAttendanceService.getBiometrics({
        standard: selectedClass,
        section: selectedSection
      });
      if (res.data?.status) {
        setBiometricsList(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load biometric consent records');
    } finally {
      setLoadingBiometrics(false);
    }
  };

  const handleOpenConsentModal = (student) => {
    setSelectedBioStudent(student);
    setConsentForm({
      status: student.consentStatus === 'CONSENT_GRANTED' ? 'CONSENT_GRANTED' : 'CONSENT_GRANTED',
      guardianName: student.guardianName || student.parentName || '',
      guardianPhone: student.guardianPhone || student.parentPhone || '',
      guardianRelation: student.guardianRelation || 'Mother'
    });
    setShowConsentModal(true);
  };

  const handleSaveConsent = async () => {
    if (!selectedBioStudent) return;
    try {
      const res = await studentAttendanceService.updateConsent({
        studentId: selectedBioStudent.studentId,
        consentStatus: consentForm.status,
        guardianName: consentForm.guardianName,
        guardianPhone: consentForm.guardianPhone,
        guardianRelation: consentForm.guardianRelation
      });
      if (res.data?.status) {
        toast.success(res.data.message);
        setShowConsentModal(false);
        fetchBiometrics();
      }
    } catch (err) {
      toast.error('Failed to update consent');
    }
  };

  const handleEnrollFaceSimulation = async (student) => {
    if (student.consentStatus !== 'CONSENT_GRANTED') {
      toast.error('Guardian consent is required before face enrollment.');
      return;
    }
    const dummyDescriptor = JSON.stringify(Array.from({ length: 128 }, () => Number((Math.random() * 2 - 1).toFixed(4))));
    try {
      const res = await studentAttendanceService.enrollFace({
        studentId: student.studentId,
        faceTemplate: dummyDescriptor,
        photoThumbnail: student.photoThumbnail || ''
      });
      if (res.data?.status) {
        toast.success(`Face biometric template enrolled for ${student.name}!`);
        fetchBiometrics();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Enrollment failed');
    }
  };

  const handleDeleteBiometric = async (studentId) => {
    if (!window.confirm('Are you sure you want to revoke consent and permanently delete this biometric template?')) return;
    try {
      const res = await studentAttendanceService.deleteBiometric(studentId);
      if (res.data?.status) {
        toast.success('Biometric template deleted');
        fetchBiometrics();
      }
    } catch (err) {
      toast.error('Failed to delete biometric');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // TAB 6: ID CARDS & QR GENERATOR
  // ─────────────────────────────────────────────────────────────
  const [idCards, setIdCards] = useState([]);
  const [loadingIdCards, setLoadingIdCards] = useState(false);
  const [idCardSearch, setIdCardSearch] = useState('');

  const fetchIdCards = async () => {
    setLoadingIdCards(true);
    try {
      const res = await studentAttendanceService.getIdCards({
        standard: selectedClass,
        section: selectedSection,
        search: idCardSearch
      });
      if (res.data?.status) {
        setIdCards(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load ID cards');
    } finally {
      setLoadingIdCards(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // TAB 7: REPORTS
  // ─────────────────────────────────────────────────────────────
  const [reportType, setReportType] = useState('daily'); // 'daily' | 'monthly' | 'low-attendance'
  const [reportData, setReportData] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  const fetchReport = async () => {
    setLoadingReport(true);
    try {
      if (reportType === 'daily') {
        const res = await studentAttendanceService.getDailyReport({
          date: selectedDate,
          standard: selectedClass,
          section: selectedSection
        });
        if (res.data?.status) setReportData(res.data.data || []);
      } else if (reportType === 'monthly') {
        const res = await studentAttendanceService.getMonthlyReport({
          month: reportMonth,
          year: reportYear,
          standard: selectedClass,
          section: selectedSection
        });
        if (res.data?.status) setReportData(res.data.data || []);
      } else if (reportType === 'low-attendance') {
        const res = await studentAttendanceService.getLowAttendanceReport({
          threshold: rules.lowAttendanceThreshold || 75.0
        });
        if (res.data?.status) setReportData(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load report data');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExportExcel = () => {
    if (!reportData || reportData.length === 0) {
      toast.error('No data available to export');
      return;
    }
    try {
      const ws = XLSX.utils.json_to_sheet(reportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'AttendanceReport');
      XLSX.writeFile(wb, `Student_Attendance_${reportType}_${selectedDate}.xlsx`);
      toast.success('Excel report exported successfully!');
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // TAB 8: NOTIFICATIONS LOGS
  // ─────────────────────────────────────────────────────────────
  const [notificationsList, setNotificationsList] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await studentAttendanceService.getNotifications();
      if (res.data?.status) {
        setNotificationsList(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load notification logs');
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleRetryNotification = async (id) => {
    try {
      const res = await studentAttendanceService.retryNotifications({ id });
      if (res.data?.status) {
        toast.success(res.data.message);
        fetchNotifications();
      }
    } catch (err) {
      toast.error('Retry failed');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // TAB 9: SETTINGS
  // ─────────────────────────────────────────────────────────────
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await studentAttendanceService.getSettings();
      if (res.data?.status && res.data.data) {
        setRules(res.data.data);
      }
    } catch (_) {}
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await studentAttendanceService.updateSettings(rules);
      if (res.data?.status) {
        toast.success('Attendance rules & notification settings updated!');
        fetchSettings();
      }
    } catch (err) {
      toast.error('Failed to save settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingSettings(false);
    }
  };

  // Initial Load & Tab switching effects
  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboard();
    else if (activeTab === 'manual') fetchRoster();
    else if (activeTab === 'biometrics') fetchBiometrics();
    else if (activeTab === 'id-cards') fetchIdCards();
    else if (activeTab === 'reports') fetchReport();
    else if (activeTab === 'notifications') fetchNotifications();
    else if (activeTab === 'settings') fetchSettings();
  }, [activeTab, selectedDate, selectedClass, selectedSection, selectedSession, reportType]);

  // Focus USB input when scan tab is opened
  useEffect(() => {
    if (activeTab === 'scan' && scanMode === 'usb') {
      setTimeout(() => {
        if (usbInputRef.current) usbInputRef.current.focus();
      }, 200);
    }
  }, [activeTab, scanMode]);

  // Clean camera tracks on unmount
  useEffect(() => {
    return () => {
      stopFaceCamera();
    };
  }, []);

  // Filtered Roster for Manual Attendance
  const filteredRoster = useMemo(() => {
    if (!manualSearch.trim()) return roster;
    const q = manualSearch.toLowerCase();
    return roster.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q) ||
      String(s.rollNumber).includes(q)
    );
  }, [roster, manualSearch]);

  // Roster live stats
  const rosterStats = useMemo(() => {
    let present = 0, absent = 0, late = 0, halfDay = 0, excused = 0;
    roster.forEach(r => {
      const st = r.status;
      if (st === 'Present') present++;
      else if (st === 'Absent') absent++;
      else if (st === 'Late') late++;
      else if (st === 'Half Day') halfDay++;
      else if (st === 'Excused') excused++;
    });
    return {
      total: roster.length,
      present,
      absent,
      late,
      halfDay,
      excused
    };
  }, [roster]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] font-sans text-[#334155] flex flex-col md:flex-row">
      {/* Platform Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16">
        {/* Sticky Page Header */}
        <header className="bg-[#172B4D] border-b border-[#29456D] text-white px-6 py-4 sticky top-0 z-20 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#29456D] text-[#F3F6FC] border border-[#29456D] flex items-center justify-center shadow-xs">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight">Student Attendance System</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#DBEAFE] text-[#172B4D] border border-[#93C5FD]">
                  AY {academicYear}
                </span>
              </div>
              <p className="text-xs text-[#CBD5E1] font-medium">
                Manual, QR Card Scanner & Face Recognition Biometrics with Multi-Channel Parent Alerts
              </p>
            </div>
          </div>

          {/* Quick Date / Class Switcher Bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#29456D] font-semibold text-[#172B4D] shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-[#29456D]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent outline-none cursor-pointer font-bold text-[#172B4D]"
              />
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#29456D] font-bold text-[#172B4D] shadow-xs">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-white px-2 py-0.5 outline-none cursor-pointer text-[#172B4D] font-bold hover:bg-[#DBEAFE] rounded"
              >
                {['Nursery', 'LKG', 'UKG', '1st', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'].map(c => (
                  <option key={c} value={c} className="bg-white text-[#172B4D]">Class {c}</option>
                ))}
              </select>
              <span className="text-[#29456D]">|</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="bg-white px-2 py-0.5 outline-none cursor-pointer text-[#172B4D] font-bold hover:bg-[#DBEAFE] rounded"
              >
                {['A', 'B', 'C', 'D'].map(s => (
                  <option key={s} value={s} className="bg-white text-[#172B4D]">Sec {s}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Navigation Tabs Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-2 sticky top-[73px] z-10 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 min-w-max text-xs font-bold">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'manual', label: '1. Manual Attendance', icon: ClipboardCheck },
              { id: 'scan', label: '2. QR / Barcode Scan', icon: QrCode },
              { id: 'face', label: '3. Face Recognition', icon: Camera },
              { id: 'biometrics', label: 'Face Consent & Enrollment', icon: ShieldCheck },
              { id: 'id-cards', label: 'Student ID Cards', icon: Award },
              { id: 'reports', label: 'Registers & Reports', icon: FileText },
              { id: 'notifications', label: 'Parent Alerts', icon: MessageSquare },
              { id: 'settings', label: 'Rules & Settings', icon: Settings }
            ].map(tabItem => {
              const Icon = tabItem.icon;
              const isActive = activeTab === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  type="button"
                  onClick={() => setTab(tabItem.id)}
                  className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-[#29456D] text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-300' : 'text-slate-500'}`} />
                  <span>{tabItem.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Canvas */}
        <main className="p-6 flex-1 space-y-6">
          {/* ─────────────────────────────────────────────────────────────
              TAB 1: DASHBOARD
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Metric KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                    <span>Enrolled</span>
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{dashboardData?.totalEnrolled || 0}</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Active Students</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
                    <span>Present</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700">{dashboardData?.presentCount || 0}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">{dashboardData?.attendancePercentage || 0}% Attendance</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-red-200 bg-red-50/30 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-red-700 text-xs font-bold">
                    <span>Absent</span>
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="text-2xl font-black text-red-700">{dashboardData?.absentCount || 0}</div>
                  <div className="text-[10px] text-red-600 font-semibold">Not In School</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
                    <span>Late Arrival</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-700">{dashboardData?.lateCount || 0}</div>
                  <div className="text-[10px] text-amber-600 font-semibold">Past {rules.lateThresholdTime || '08:45 AM'}</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/30 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-purple-700 text-xs font-bold">
                    <span>Half Day</span>
                    <Sliders className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-purple-700">{dashboardData?.halfDayCount || 0}</div>
                  <div className="text-[10px] text-purple-600 font-semibold">Session Credit</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-blue-700 text-xs font-bold">
                    <span>Excused / Leave</span>
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-700">{dashboardData?.excusedCount || 0}</div>
                  <div className="text-[10px] text-blue-600 font-semibold">Approved Leaves</div>
                </div>
              </div>

              {/* Attendance Progress & Method Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Attendance Ratio & Distribution</h3>
                      <p className="text-xs text-slate-500">Live breakdown for Class {selectedClass}-{selectedSection} on {selectedDate}</p>
                    </div>
                    <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                      {dashboardData?.attendancePercentage || 0}%
                    </span>
                  </div>

                  {/* Multi-segmented Progress Bar */}
                  <div className="h-4 rounded-full overflow-hidden flex bg-slate-100 shadow-inner">
                    <div
                      style={{ width: `${(dashboardData?.presentCount / (dashboardData?.totalEnrolled || 1)) * 100}%` }}
                      className="bg-emerald-500 transition-all duration-500"
                      title="Present"
                    />
                    <div
                      style={{ width: `${(dashboardData?.lateCount / (dashboardData?.totalEnrolled || 1)) * 100}%` }}
                      className="bg-amber-400 transition-all duration-500"
                      title="Late"
                    />
                    <div
                      style={{ width: `${(dashboardData?.halfDayCount / (dashboardData?.totalEnrolled || 1)) * 100}%` }}
                      className="bg-purple-500 transition-all duration-500"
                      title="Half Day"
                    />
                    <div
                      style={{ width: `${(dashboardData?.excusedCount / (dashboardData?.totalEnrolled || 1)) * 100}%` }}
                      className="bg-blue-400 transition-all duration-500"
                      title="Excused"
                    />
                    <div
                      style={{ width: `${(dashboardData?.absentCount / (dashboardData?.totalEnrolled || 1)) * 100}%` }}
                      className="bg-red-500 transition-all duration-500"
                      title="Absent"
                    />
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-slate-700">Present: {dashboardData?.presentCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-slate-700">Late: {dashboardData?.lateCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
                      <span className="text-slate-700">Half Day: {dashboardData?.halfDayCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-400 shrink-0" />
                      <span className="text-slate-700">Excused: {dashboardData?.excusedCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                      <span className="text-slate-700">Absent: {dashboardData?.absentCount || 0}</span>
                    </div>
                  </div>
                </div>

                {/* By Method Stats */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Attendance Method Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs font-bold">
                      <div className="flex items-center gap-2 text-slate-700">
                        <ClipboardCheck className="w-4 h-4 text-blue-600" />
                        <span>Teacher Manual Grid</span>
                      </div>
                      <span className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {dashboardData?.byMethod?.manual || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs font-bold">
                      <div className="flex items-center gap-2 text-slate-700">
                        <QrCode className="w-4 h-4 text-emerald-600" />
                        <span>ID Card QR / Barcode Scan</span>
                      </div>
                      <span className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {dashboardData?.byMethod?.qrScan || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs font-bold">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Camera className="w-4 h-4 text-purple-600" />
                        <span>Face Recognition Biometrics</span>
                      </div>
                      <span className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {dashboardData?.byMethod?.faceRecognition || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Shortcuts */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => setTab('manual')}
                  className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 hover:border-blue-400 text-left transition-all shadow-2xs group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#29456D] text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">Take Manual Attendance</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Mark roll call for assigned class & section</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTab('scan')}
                  className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 hover:border-emerald-400 text-left transition-all shadow-2xs group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">Launch QR Scanner Station</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">High-speed USB scanner or webcam gate check-in</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTab('face')}
                  className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-200 hover:border-purple-400 text-left transition-all shadow-2xs group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">Face Recognition Terminal</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Automatic contactless AI punch-in</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTab('id-cards')}
                  className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 hover:border-amber-400 text-left transition-all shadow-2xs group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Award className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">Print Student ID Cards</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Download scannable QR badge cards for students</p>
                </button>
              </div>

              {/* Recent Activity Log */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900">Recent Attendance Activity</h3>
                  <button
                    type="button"
                    onClick={fetchDashboard}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>

                {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                  <div className="divide-y divide-slate-100 text-xs">
                    {dashboardData.recentActivity.map(act => (
                      <div key={act.id} className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${
                            act.status === 'Present' ? 'bg-emerald-500' :
                            act.status === 'Late' ? 'bg-amber-400' :
                            act.status === 'Half Day' ? 'bg-purple-500' :
                            act.status === 'Excused' ? 'bg-blue-400' : 'bg-red-500'
                          }`} />
                          <div>
                            <span className="font-bold text-slate-800">{act.studentName}</span>
                            {act.rollNumber && <span className="text-slate-400 ml-1.5 font-mono">({act.rollNumber})</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-500">{act.time}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {act.method}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 italic">No attendance records logged for today yet.</div>
                )}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 2: METHOD A — MANUAL ATTENDANCE
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'manual' && (
            <div className="space-y-6">
              {/* Roster Controls & Bulk Actions Toolbar */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Session & Search */}
                  <div className="flex items-center gap-3 flex-wrap text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                      <span>Session:</span>
                      <select
                        value={selectedSession}
                        onChange={(e) => setSelectedSession(e.target.value)}
                        className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="FULL_DAY">Full Day Attendance</option>
                        <option value="MORNING">Morning Session</option>
                        <option value="AFTERNOON">Afternoon Session</option>
                        <option value="PERIOD_1">Period 1</option>
                        <option value="PERIOD_2">Period 2</option>
                      </select>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search student or roll no..."
                        value={manualSearch}
                        onChange={(e) => setManualSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#29456D] w-48 sm:w-60"
                      />
                    </div>
                  </div>

                  {/* Bulk Actions */}
                  <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => handleMarkAll('Present')}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                    >
                      ✓ Mark All Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkAll('Absent')}
                      className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl border border-red-200 transition-colors cursor-pointer"
                    >
                      ✗ Mark All Absent
                    </button>
                    <button
                      type="button"
                      onClick={handleResetRoster}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Live Stats Pill Bar */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-slate-100 text-xs font-bold">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-slate-600">Total: {rosterStats.total}</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Present: {rosterStats.present}
                    </span>
                    <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                      Absent: {rosterStats.absent}
                    </span>
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Late: {rosterStats.late}
                    </span>
                    <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      Half Day: {rosterStats.halfDay}
                    </span>
                    <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Excused: {rosterStats.excused}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600 text-xs">
                      <input
                        type="checkbox"
                        checked={notifyParentsOnSave}
                        onChange={(e) => setNotifyParentsOnSave(e.target.checked)}
                        className="rounded text-[#172B4D] focus:ring-0"
                      />
                      <span>Dispatch Parent Alerts on Save</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleSaveManualAttendance}
                      disabled={savingManual || roster.length === 0}
                      className="px-5 py-2 bg-[#29456D] hover:bg-blue-800 text-white rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {savingManual ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>{savingManual ? 'Saving Records...' : 'Save Attendance'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Roster Table */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
                {loadingRoster ? (
                  <div className="py-16 text-center text-xs text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#172B4D]" />
                    <span>Loading class roster...</span>
                  </div>
                ) : filteredRoster.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400 italic">
                    No students found in Class {selectedClass}-{selectedSection}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 w-12 text-center">Roll</th>
                          <th className="py-3 px-4">Student Name & ID</th>
                          <th className="py-3 px-4">Attendance Status</th>
                          <th className="py-3 px-4">Time Recorded</th>
                          <th className="py-3 px-4">Remarks / Excuse Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredRoster.map(student => (
                          <tr key={student.studentId} className="hover:bg-slate-50/70 transition-colors">
                            {/* Roll Number */}
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-600">
                              {student.rollNumber}
                            </td>

                            {/* Name & Admission ID */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-[#172B4D] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                  {student.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{student.name}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    ID: {student.studentId} &bull; Class {student.standard}-{student.section}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Status Button Group */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {[
                                  { key: 'Present', label: 'Present', color: 'emerald' },
                                  { key: 'Absent', label: 'Absent', color: 'red' },
                                  { key: 'Late', label: 'Late', color: 'amber' },
                                  { key: 'Half Day', label: 'Half Day', color: 'purple' },
                                  { key: 'Excused', label: 'On Leave', color: 'blue' }
                                ].map(st => {
                                  const isSelected = student.status === st.key;
                                  return (
                                    <button
                                      key={st.key}
                                      type="button"
                                      onClick={() => handleStatusChange(student.studentId, st.key)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                        isSelected
                                          ? st.color === 'emerald' ? 'bg-emerald-600 text-white shadow-2xs' :
                                            st.color === 'red' ? 'bg-red-600 text-white shadow-2xs' :
                                            st.color === 'amber' ? 'bg-amber-500 text-white shadow-2xs' :
                                            st.color === 'purple' ? 'bg-purple-600 text-white shadow-2xs' :
                                            'bg-blue-600 text-white shadow-2xs'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {st.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>

                            {/* Time Recorded */}
                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                              {student.checkInTime || '-'}
                            </td>

                            {/* Remarks */}
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                placeholder="Add note or reason..."
                                value={student.remarks || ''}
                                onChange={(e) => handleRemarkChange(student.studentId, e.target.value)}
                                className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-[#29456D] bg-slate-50/50"
                              />
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

          {/* ─────────────────────────────────────────────────────────────
              TAB 3: METHOD B — BARCODE / QR SCAN ATTENDANCE
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'scan' && (
            <div className="space-y-6">
              {/* Scan Station Setup Bar */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">QR / Barcode Attendance Terminal</h3>
                    <p className="text-xs text-slate-500">Scan student physical ID cards or smart mobile badges</p>
                  </div>
                </div>

                {/* Mode & Type Toggles */}
                <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
                  {/* Scanner Mode Toggle */}
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setScanMode('usb')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        scanMode === 'usb' ? 'bg-[#29456D] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      USB Scanner / Reader
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanMode('camera')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        scanMode === 'camera' ? 'bg-[#29456D] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Live Camera
                    </button>
                  </div>

                  {/* Check-in vs Check-out Toggle */}
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setScanType('CHECK_IN')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        scanType === 'CHECK_IN' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Gate Check-In
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanType('CHECK_OUT')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        scanType === 'CHECK_OUT' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Exit Check-Out
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Scanner Interface Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Pane: Scan Input Station */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {scanMode === 'usb' ? 'Hardware Scanner Listener Active' : 'Camera Scanning Viewport'}
                  </h4>

                  {scanMode === 'usb' ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                          <Volume2 className="w-4 h-4 text-blue-600" />
                          <span>Ready for scans. Point handheld scanner at student card.</span>
                        </div>
                        <p className="text-[11px] text-blue-700">
                          USB scanners act as keyboard input. Keep cursor inside the box below or scan directly.
                        </p>
                      </div>

                      <div className="relative">
                        <input
                          ref={usbInputRef}
                          type="text"
                          placeholder="Scan or type student code (e.g. CRM-ATT-STU001) & press enter..."
                          value={usbInput}
                          onChange={(e) => setUsbInput(e.target.value)}
                          onKeyDown={handleUsbKeyDown}
                          className="w-full px-4 py-3.5 bg-slate-50 border-2 border-[#29456D] rounded-2xl text-sm font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#93C5FD]/20"
                          autoFocus
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => processScanCode(usbInput)}
                        disabled={!usbInput.trim() || isProcessingScan}
                        className="w-full py-3 bg-[#29456D] hover:bg-blue-800 text-white rounded-xl font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {isProcessingScan ? 'Processing Scan...' : 'Submit Scan'}
                      </button>

                      {/* Manual Quick Override */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Student forgot card?</span>
                        <button
                          type="button"
                          onClick={() => setTab('manual')}
                          className="font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          Switch to Manual Roll Call &rarr;
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Web Camera QR Viewport */}
                      <div className="relative aspect-4/3 bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-300 flex items-center justify-center">
                        <div className="absolute inset-8 border-2 border-emerald-400/80 rounded-2xl animate-pulse pointer-events-none z-10 flex items-center justify-center">
                          <span className="text-[10px] text-white/90 font-bold bg-black/60 px-2.5 py-1 rounded-full uppercase">
                            Align QR Code Within Box
                          </span>
                        </div>
                        <div className="text-center text-slate-400 space-y-2 p-6">
                          <Camera className="w-10 h-10 mx-auto text-slate-500" />
                          <p className="text-xs">Camera scanner interface ready for video devices.</p>
                          <p className="text-[11px] text-slate-500">Use USB scanner mode for instant desktop scanning.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Pane: Scan Result Card & Feedback */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Live Scan Result</h4>

                  {scanResult?.data?.student ? (
                    <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-4 animate-scaleUp">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                          {scanResult.data.student.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-black text-slate-900 truncate">
                            {scanResult.data.student.name}
                          </h3>
                          <div className="text-xs text-slate-600 font-medium">
                            Class {scanResult.data.student.standard}-{scanResult.data.student.section} &bull; Roll: {scanResult.data.student.rollNumber}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            ID: {scanResult.data.student.studentId}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                          scanResult.data.status === 'Present' ? 'bg-emerald-600 text-white' :
                          scanResult.data.status === 'Late' ? 'bg-amber-500 text-white' : 'bg-purple-600 text-white'
                        }`}>
                          {scanResult.data.status}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white/80 border border-emerald-200 text-xs font-mono font-bold flex items-center justify-between text-slate-800">
                        <span>Check-In Time: {scanResult.data.checkInTime || '-'}</span>
                        <span>Check-Out: {scanResult.data.checkOutTime || '-'}</span>
                      </div>

                      <div className="text-xs font-semibold text-emerald-800">
                        ✓ {scanResult.message}
                      </div>
                    </div>
                  ) : scanResult?.status === false ? (
                    <div className="p-5 rounded-2xl border border-red-200 bg-red-50/50 space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-red-700">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Scan Rejected: {scanResult.code}</span>
                      </div>
                      <p className="text-red-600">{scanResult.message}</p>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-2xl">
                      Scan a student card on the left to see instant verification.
                    </div>
                  )}

                  {/* Station Scan History */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Session Scan History (Station 01)
                    </span>
                    {scanHistory.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                        {scanHistory.map(h => (
                          <div key={h.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-150">
                            <span className="font-bold text-slate-800">{h.student?.name || 'Student'}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-500 text-[11px]">{h.time}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                h.isDuplicate ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {h.isDuplicate ? 'Duplicate' : h.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No scans recorded in this session yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 4: METHOD C — FACE RECOGNITION ATTENDANCE
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'face' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Contactless Face Biometric Punch Station</h3>
                    <p className="text-xs text-slate-500">Live AI face recognition with guardian consent verification</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!faceCameraActive ? (
                    <button
                      type="button"
                      onClick={startFaceCamera}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Start Face Terminal
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopFaceCamera}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" /> Stop Camera
                    </button>
                  )}
                </div>
              </div>

              {/* Face Terminal Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Live Video Frame */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Live Video Stream</h4>

                  <div className="relative aspect-4/3 bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-300 flex items-center justify-center">
                    <video
                      ref={faceVideoRef}
                      className={`w-full h-full object-cover ${faceCameraActive ? 'block' : 'hidden'}`}
                      muted
                      playsInline
                    />

                    {!faceCameraActive && (
                      <div className="text-center text-slate-400 space-y-2 p-6">
                        <Camera className="w-12 h-12 mx-auto text-slate-500" />
                        <p className="text-xs font-bold text-slate-300">Camera Terminal Inactive</p>
                        <p className="text-[11px] text-slate-500">Click "Start Face Terminal" above to enable live recognition.</p>
                      </div>
                    )}

                    {faceCameraActive && (
                      <div className="absolute inset-12 border-2 border-purple-400 rounded-3xl pointer-events-none z-10 flex flex-col items-center justify-between p-3">
                        <span className="text-[10px] font-bold text-white bg-black/50 px-2 py-0.5 rounded-full">
                          AI Face Alignment Guide
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-black/60 px-2 py-0.5 rounded-full">
                          Threshold: {rules.faceConfidenceThreshold || 80}%
                        </span>
                      </div>
                    )}
                  </div>

                  {faceCameraActive && (
                    <button
                      type="button"
                      onClick={handleTriggerFacePunch}
                      disabled={isVerifyingFace}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isVerifyingFace ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Matching Face Descriptor...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Punch Attendance for Face in View</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Face Verification Result Card */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Recognition Result</h4>

                  {faceResult?.matched && faceResult.student ? (
                    <div className="p-5 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-4 animate-scaleUp">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                          {faceResult.student.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-black text-slate-900 truncate">{faceResult.student.name}</h3>
                          <div className="text-xs text-slate-600 font-medium">
                            Class {faceResult.student.standard}-{faceResult.student.section} &bull; Roll: {faceResult.student.rollNumber}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">ID: {faceResult.student.studentId}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                            {faceResult.confidence}% Match
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/80 border border-purple-200 text-xs font-mono font-bold flex items-center justify-between text-slate-800">
                        <span>Status: Present</span>
                        <span>Punch Time: {faceResult.checkInTime}</span>
                      </div>

                      <div className="text-xs font-semibold text-purple-900">
                        ✓ {faceResult.message}
                      </div>
                    </div>
                  ) : faceResult?.matched === false ? (
                    <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-amber-800">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>Low Confidence ({faceResult.confidence}%)</span>
                      </div>
                      <p className="text-amber-700">{faceResult.message}</p>
                      <button
                        type="button"
                        onClick={() => setTab('manual')}
                        className="mt-2 text-xs font-bold text-[#172B4D] hover:underline"
                      >
                        Switch to Manual Verification &rarr;
                      </button>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-2xl">
                      Face alignment data and instant attendance record will appear here.
                    </div>
                  )}

                  {/* DPDP Compliance Notice */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-800 block">Biometric Privacy & Consent Guarantee:</span>
                    <p>
                      Only students with recorded guardian consent are processed by the biometric engine. Raw face photographs are not stored; encrypted mathematical feature vectors are evaluated on-device.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 5: BIOMETRICS & CONSENT
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'biometrics' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Guardian Biometric Consent & Face Templates</h3>
                  <p className="text-xs text-slate-500">Manage consent compliance and facial embeddings per DPDP standards</p>
                </div>
                <button
                  type="button"
                  onClick={fetchBiometrics}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {/* Biometrics Registry Table */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
                {loadingBiometrics ? (
                  <div className="py-16 text-center text-xs text-slate-400">Loading biometrics...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Class</th>
                          <th className="py-3 px-4">Guardian Details</th>
                          <th className="py-3 px-4">Consent Status</th>
                          <th className="py-3 px-4">Face Template</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {biometricsList.map(item => (
                          <tr key={item.studentId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                            <td className="py-3 px-4 text-slate-600 font-mono">{item.standard}-{item.section}</td>
                            <td className="py-3 px-4 text-slate-600">
                              <div>{item.guardianName || item.parentName || 'Guardian'}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{item.guardianPhone || '-'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                item.consentStatus === 'CONSENT_GRANTED' ? 'bg-emerald-100 text-emerald-800' :
                                item.consentStatus === 'CONSENT_DECLINED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.consentStatus.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {item.hasFaceTemplate ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Not Enrolled</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => handleOpenConsentModal(item)}
                                className="px-2.5 py-1 text-xs font-bold text-[#172B4D] hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                              >
                                Consent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEnrollFaceSimulation(item)}
                                disabled={item.consentStatus !== 'CONSENT_GRANTED'}
                                className="px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-50 rounded-lg border border-purple-200 transition-colors cursor-pointer disabled:opacity-40"
                              >
                                Enroll Face
                              </button>
                              {item.hasFaceTemplate && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBiometric(item.studentId)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Revoke / Delete Template"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Consent Edit Modal */}
              {showConsentModal && selectedBioStudent && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
                    <h3 className="text-base font-black text-slate-900">Guardian Biometric Consent Form</h3>
                    <p className="text-xs text-slate-500">Record consent for student: <span className="font-bold text-slate-800">{selectedBioStudent.name}</span></p>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Guardian Full Name</label>
                        <input
                          type="text"
                          value={consentForm.guardianName}
                          onChange={(e) => setConsentForm(prev => ({ ...prev, guardianName: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#29456D]"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Guardian Mobile Phone</label>
                        <input
                          type="text"
                          value={consentForm.guardianPhone}
                          onChange={(e) => setConsentForm(prev => ({ ...prev, guardianPhone: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#29456D]"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Consent Decision</label>
                        <select
                          value={consentForm.status}
                          onChange={(e) => setConsentForm(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#29456D] font-bold"
                        >
                          <option value="CONSENT_GRANTED">Consent Granted (Permit Face Recognition)</option>
                          <option value="CONSENT_DECLINED">Consent Declined (Opt-Out, Use QR / Manual)</option>
                          <option value="REVOKED">Revoked by Guardian</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowConsentModal(false)}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveConsent}
                        className="px-5 py-2 text-xs font-black bg-[#29456D] text-white rounded-xl shadow-md"
                      >
                        Save Consent Record
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 6: STUDENT ID CARDS & QR GENERATOR
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'id-cards' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4 no-print">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Student Identity Cards with Scannable QR Codes</h3>
                  <p className="text-xs text-slate-500">Print standard identity cards for Class {selectedClass}-{selectedSection}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-[#29456D] hover:bg-blue-800 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print All ID Cards
                  </button>
                </div>
              </div>

              {/* ID Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="printable-id-cards-grid">
                {idCards.map(card => (
                  <div
                    key={card.studentId}
                    className="bg-white rounded-3xl border-2 border-slate-300 shadow-md p-5 flex flex-col justify-between relative overflow-hidden h-[340px] break-inside-avoid"
                  >
                    {/* Header Ribbon */}
                    <div className="text-center pb-2 border-b border-slate-150">
                      <h4 className="font-black text-xs text-[#172B4D] uppercase tracking-wider">{card.schoolName}</h4>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">Student Identification Card &bull; {card.academicYear}</span>
                    </div>

                    {/* Middle: Student Details + QR Code */}
                    <div className="flex items-center justify-between gap-3 my-auto">
                      <div className="space-y-1 flex-1 min-w-0 text-xs">
                        <div className="w-14 h-14 rounded-2xl bg-blue-100 text-[#172B4D] font-black text-xl flex items-center justify-center mb-1">
                          {card.name.charAt(0)}
                        </div>
                        <h3 className="font-black text-sm text-slate-900 truncate">{card.name}</h3>
                        <div className="text-slate-600 font-bold">Class: {card.standard}-{card.section}</div>
                        <div className="text-slate-500 font-mono text-[11px]">Roll No: {card.rollNumber}</div>
                        <div className="text-slate-500 font-mono text-[10px]">ID: {card.studentId}</div>
                      </div>

                      {/* Scannable High-Contrast QR Code */}
                      <div className="p-2 bg-white rounded-2xl border-2 border-slate-800 shrink-0 shadow-xs flex flex-col items-center">
                        <QRCodeSVG
                          value={card.qrPayload}
                          size={90}
                          level="M"
                          includeMargin={false}
                        />
                        <span className="text-[8px] font-mono font-black text-slate-700 mt-1 uppercase">Scan for Att</span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-2 border-t border-slate-150 text-[10px] text-slate-500 flex justify-between items-center">
                      <span>Emergency: {card.emergencyContact}</span>
                      <span className="font-black text-[#172B4D] uppercase">Qelvora School CRM</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 7: REGISTERS & REPORTS
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { id: 'daily', label: 'Daily Register' },
                    { id: 'monthly', label: 'Monthly Matrix' },
                    { id: 'low-attendance', label: 'Low Attendance Alert (<75%)' }
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setReportType(r.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        reportType === r.id ? 'bg-[#29456D] text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                </div>
              </div>

              {/* Report Canvas */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs overflow-x-auto">
                {loadingReport ? (
                  <div className="py-16 text-center text-xs text-slate-400">Loading report...</div>
                ) : reportData.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400 italic">No report data found.</div>
                ) : reportType === 'daily' ? (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 font-bold border-b border-slate-200 text-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Roll</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Class</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Check-In</th>
                        <th className="py-2.5 px-3">Check-Out</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {reportData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono">{row.rollNumber}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{row.name}</td>
                          <td className="py-2 px-3 text-slate-600 font-mono">{row.standard}-{row.section}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.status === 'Present' ? 'bg-emerald-100 text-emerald-800' :
                              row.status === 'Absent' ? 'bg-red-100 text-red-800' :
                              row.status === 'Late' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono">{row.checkInTime || '-'}</td>
                          <td className="py-2 px-3 font-mono">{row.checkOutTime || '-'}</td>
                          <td className="py-2 px-3 text-[11px] font-bold uppercase text-slate-500">{row.method}</td>
                          <td className="py-2 px-3 text-slate-500">{row.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : reportType === 'low-attendance' ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>The following students have attendance below {rules.lowAttendanceThreshold || 75}%. Follow-up recommended.</span>
                    </div>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 font-bold border-b border-slate-200 text-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Class</th>
                          <th className="py-2.5 px-3">Attendance %</th>
                          <th className="py-2.5 px-3">Attended / Total</th>
                          <th className="py-2.5 px-3">Parent Name</th>
                          <th className="py-2.5 px-3">Parent Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {reportData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-900">{row.name}</td>
                            <td className="py-2 px-3 font-mono">{row.standard}-{row.section}</td>
                            <td className="py-2 px-3 font-bold text-red-700">{row.percentage}%</td>
                            <td className="py-2 px-3 font-mono">{row.attendedClasses} / {row.totalClasses}</td>
                            <td className="py-2 px-3 text-slate-700">{row.parentName || '-'}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{row.parentPhone || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-xs">
                    {/* Monthly Matrix view */}
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-100 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2">Student</th>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                            <th key={d} className="py-2 px-1 text-center font-mono">{d}</th>
                          ))}
                          <th className="py-2 px-2 text-right">Att %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-2 font-bold whitespace-nowrap">{s.name}</td>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
                              const val = s.days ? s.days[d] : '-';
                              return (
                                <td key={d} className="py-2 px-1 text-center font-mono font-bold">
                                  <span className={`px-1 py-0.5 rounded text-[9px] ${
                                    val === 'P' ? 'bg-emerald-100 text-emerald-800' :
                                    val === 'A' ? 'bg-red-100 text-red-800' :
                                    val === 'L' ? 'bg-amber-100 text-amber-800' :
                                    val === 'SUN' ? 'text-slate-300' : 'text-slate-400'
                                  }`}>
                                    {val || '-'}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="py-2 px-2 text-right font-black text-[#172B4D]">{s.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 8: PARENT NOTIFICATIONS LOGS
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Parent Multi-Channel Notification Audit Logs</h3>
                  <p className="text-xs text-slate-500">History of dispatched SMS, Email and WhatsApp messages</p>
                </div>
                <button
                  type="button"
                  onClick={fetchNotifications}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {/* Notifications Table */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
                {loadingNotifications ? (
                  <div className="py-16 text-center text-xs text-slate-400">Loading notifications log...</div>
                ) : notificationsList.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400 italic">No notification dispatches recorded yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Channel</th>
                          <th className="py-3 px-4">Trigger</th>
                          <th className="py-3 px-4">Message Body</th>
                          <th className="py-3 px-4">Sent At</th>
                          <th className="py-3 px-4">Delivery Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {notificationsList.map(n => (
                          <tr key={n.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">{n.studentName}</td>
                            <td className="py-3 px-4 font-mono font-bold text-[#172B4D]">{n.channel}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                n.triggerStatus === 'Absent' ? 'bg-red-100 text-red-800' :
                                n.triggerStatus === 'Late' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {n.triggerStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{n.message}</td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                              {new Date(n.sentAt).toLocaleTimeString()}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                n.status === 'SENT' || n.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {n.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {n.status === 'FAILED' && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryNotification(n.id)}
                                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                                >
                                  Retry
                                </button>
                              )}
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

          {/* ─────────────────────────────────────────────────────────────
              TAB 9: RULES & SETTINGS
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Attendance Policies & Threshold Configuration</h3>
                    <p className="text-xs text-slate-500">Configure cutoff times, low attendance alerts, and biometric thresholds</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="px-5 py-2 bg-[#29456D] hover:bg-blue-800 text-white rounded-xl font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingSettings ? 'Saving Rules...' : 'Save Settings'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Academic Year</label>
                    <input
                      type="text"
                      value={rules.academicYear}
                      onChange={(e) => setRules(prev => ({ ...prev, academicYear: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#29456D]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Late Arrival Cutoff Time</label>
                    <input
                      type="text"
                      value={rules.lateThresholdTime}
                      onChange={(e) => setRules(prev => ({ ...prev, lateThresholdTime: e.target.value }))}
                      placeholder="08:45 AM"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#29456D]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Half-Day Arrival Cutoff Time</label>
                    <input
                      type="text"
                      value={rules.halfDayThresholdTime}
                      onChange={(e) => setRules(prev => ({ ...prev, halfDayThresholdTime: e.target.value }))}
                      placeholder="11:30 AM"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#29456D]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Low Attendance Warning Threshold (%)</label>
                    <input
                      type="number"
                      value={rules.lowAttendanceThreshold}
                      onChange={(e) => setRules(prev => ({ ...prev, lowAttendanceThreshold: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#29456D]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Face Recognition Confidence Threshold (%)</label>
                    <input
                      type="number"
                      value={rules.faceConfidenceThreshold}
                      onChange={(e) => setRules(prev => ({ ...prev, faceConfidenceThreshold: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-[#29456D]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={rules.checkOutEnabled}
                        onChange={(e) => setRules(prev => ({ ...prev, checkOutEnabled: e.target.checked }))}
                        className="rounded text-[#172B4D]"
                      />
                      <span>Enable Check-Out Tracking</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Notification Channels Settings */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <h3 className="text-sm font-black text-slate-900">Parent Notification Channels & Trigger Rules</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rules.emailEnabled}
                      onChange={(e) => setRules(prev => ({ ...prev, emailEnabled: e.target.checked }))}
                      className="rounded text-[#172B4D]"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Email Alerts</span>
                      <span className="text-[10px] text-slate-500">Official SMTP Dispatch</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rules.smsEnabled}
                      onChange={(e) => setRules(prev => ({ ...prev, smsEnabled: e.target.checked }))}
                      className="rounded text-[#172B4D]"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">SMS Alerts</span>
                      <span className="text-[10px] text-slate-500">DLT Telecom Gateway</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rules.whatsappEnabled}
                      onChange={(e) => setRules(prev => ({ ...prev, whatsappEnabled: e.target.checked }))}
                      className="rounded text-[#172B4D]"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">WhatsApp Alerts</span>
                      <span className="text-[10px] text-slate-500">Meta WhatsApp Business API</span>
                    </div>
                  </label>
                </div>

                {/* Templates */}
                <div className="space-y-3 pt-2 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Email Alert Message Template</label>
                    <textarea
                      rows={2}
                      value={rules.emailTemplate}
                      onChange={(e) => setRules(prev => ({ ...prev, emailTemplate: e.target.value }))}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-[#29456D]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">SMS / WhatsApp Message Template</label>
                    <textarea
                      rows={2}
                      value={rules.smsTemplate}
                      onChange={(e) => setRules(prev => ({ ...prev, smsTemplate: e.target.value, whatsappTemplate: e.target.value }))}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-[#29456D]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Print Styles for ID Cards & Daily Registers */}
      <style>{`
        @media print {
          body, html {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          aside, header, nav, button, .no-print {
            display: none !important;
          }
          #printable-id-cards-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
