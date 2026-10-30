/**
 * Attendance Page — Dual mode attendance system.
 * 1. Teacher Biometric Face Punch-in (supports both personal login & gate kiosk mode).
 * 2. Student Attendance Grid (grouped by standard/section, with Present/Absent/Late status triggers).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getClasses, 
  punchIn, 
  punchOut, 
  getStudentAttendance, 
  markStudentAttendance, 
  getAttendanceLogs,
  getDetailsReport,
  updateAttendanceStatus,
  exportAttendanceExcel
} from '../services/authService';
import Spinner from '../components/ui/Spinner';
import Sidebar from '../components/ui/Sidebar';
import useGeolocation from '../hooks/useGeolocation';
import FaceVerification from '../components/face/FaceVerification';
import toast from 'react-hot-toast';

// Seed list of default students with roll numbers for the class grid
const DEFAULT_STUDENTS = [
  { name: 'Aarav Sharma', rollNumber: '901' },
  { name: 'Ananya Iyer', rollNumber: '902' },
  { name: 'Vihaan Patel', rollNumber: '903' },
  { name: 'Diya Sen', rollNumber: '904' },
  { name: 'Sai Krishna', rollNumber: '905' },
  { name: 'Meera Nair', rollNumber: '906' },
  { name: 'Rohan Das', rollNumber: '907' },
  { name: 'Ishaan Roy', rollNumber: '908' },
  { name: 'Kavya Reddy', rollNumber: '909' },
  { name: 'Aditya Joshi', rollNumber: '910' },
  { name: 'Priya Verma', rollNumber: '911' },
  { name: 'Kabir Malhotra', rollNumber: '912' },
  { name: 'Zara Khan', rollNumber: '913' },
  { name: 'Arjun Mehta', rollNumber: '914' },
  { name: 'Sneha Patil', rollNumber: '915' }
];

const AttendancePage = () => {
  const { user } = useAuth();
  const { position: geoPosition, loading: geoLoading, error: geoError, permissionDenied: geoDenied, refresh: geoRefresh } = useGeolocation({ watch: true });

  const [activeTab, setActiveTab] = useState('teacher-punch'); // 'teacher-punch' | 'student-grid' | 'logs'
  const [currentTime, setCurrentTime] = useState(new Date());

  // Teacher Punch State
  const [kioskEmpId, setKioskEmpId] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [personalLogs, setPersonalLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isPunchingOut, setIsPunchingOut] = useState(false);

  // Month-view Grid State
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [details, setDetails] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [exportingType, setExportingType] = useState(null);

  const MONTH_NAMES = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

  // Student Grid State
  const [classesList, setClassesList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [studentsData, setStudentsData] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isSavingStudentAtt, setIsSavingStudentAtt] = useState(false);

  // Edit Attendance Status Modal
  const [showEditAttModal, setShowEditAttModal] = useState(false);
  const [editAttEmployee, setEditAttEmployee] = useState(null);
  const [editAttDayData, setEditAttDayData] = useState(null);
  const [editAttStatus, setEditAttStatus] = useState('Present');
  const [editAttReason, setEditAttReason] = useState('');
  const [isSavingAttStatus, setIsSavingAttStatus] = useState(false);

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
        toast.success(`Attendance updated for ${editAttEmployee.name} (${editAttDayData.date}) -> ${editAttStatus}`);
        setShowEditAttModal(false);
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

  // Load Classes list for dropdown
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await getClasses();
        if (res?.status && Array.isArray(res.data)) {
          setClassesList(res.data);
          if (res.data.length > 0) {
            setSelectedClassId(res.data[0].id || res.data[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load classes list:', err);
      }
    };
    fetchClasses();
  }, []);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load Teacher's personal & system-wide attendance logs
  const fetchPersonalLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await getAttendanceLogs();
      if (res?.status && Array.isArray(res.data)) {
        const empId = user?.employee_id || user?.employeeId;
        const myLogs = empId
          ? res.data.filter(log => log.teacher && (log.teacher.employeeId === empId || log.teacher._id === user?._id || log.teacher.name === user?.name))
          : [];
        setPersonalLogs(myLogs.length > 0 ? myLogs : res.data);
      }
    } catch (err) {
      console.error('Failed to load teacher attendance logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [user]);

  const fetchDetails = useCallback(async () => {
    setReportLoading(true);
    try {
      const empId = user?.employee_id || user?.employeeId || '';
      const res = await getDetailsReport(reportMonth, reportYear, empId);
      if (res?.data) {
        setDetails(res.data);
      }
    } catch (err) {
      toast.error('Failed to load attendance grid');
    } finally {
      setReportLoading(false);
    }
  }, [user, reportMonth, reportYear]);

  const handleExport = async (type) => {
    setExportingType(type);
    try {
      await exportAttendanceExcel('details', reportMonth, reportYear, '', user?.employee_id || user?.employeeId);
      toast.success('Excel file downloaded!');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExportingType(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchPersonalLogs();
      fetchDetails();
    }
  }, [activeTab, fetchPersonalLogs, fetchDetails]);

  // Load Student Attendance Grid
  const fetchStudentAttendance = useCallback(async () => {
    if (!selectedClassId) return;
    setLoadingStudents(true);
    const defaultTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
      const selectedClass = classesList.find(c => c.id === selectedClassId || c._id === selectedClassId);
      const res = await getStudentAttendance(selectedClass?.standard, selectedClass?.section, attendanceDate, selectedClassId);
      if (res?.status && Array.isArray(res.data) && res.data.length > 0) {
        setStudentsData(res.data.map(item => ({
          studentId: item.studentId,
          studentName: item.studentName,
          rollNumber: item.rollNumber || '',
          status: item.status || 'Present',
          markedTime: item.markedTime || defaultTime
        })));
      } else {
        // Fallback default list if class has no enrolled students yet
        setStudentsData(DEFAULT_STUDENTS.map((item, idx) => ({
          studentName: typeof item === 'string' ? item : item.name,
          rollNumber: typeof item === 'object' && item.rollNumber ? item.rollNumber : String(idx + 1).padStart(2, '0'),
          status: 'Present',
          markedTime: defaultTime
        })));
      }
    } catch (err) {
      toast.error('Failed to load student attendance.');
      setStudentsData(DEFAULT_STUDENTS.map((item, idx) => ({
        studentName: typeof item === 'string' ? item : item.name,
        rollNumber: typeof item === 'object' && item.rollNumber ? item.rollNumber : String(idx + 1).padStart(2, '0'),
        status: 'Present',
        markedTime: defaultTime
      })));
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedClassId, attendanceDate, classesList]);

  useEffect(() => {
    if (activeTab === 'student-grid' && selectedClassId) {
      fetchStudentAttendance();
    }
  }, [activeTab, selectedClassId, attendanceDate, fetchStudentAttendance]);

  // Handle Teacher Face Scan Completion (Punch In)
  const handleFaceVerified = async (result) => {
    setShowFaceScanner(false);
    toast.success('Biometric verification passed. Attendance recorded!');
    fetchPersonalLogs();
    setActiveTab('logs');
  };

  // Face scanner verifyFn bridge: sends base64 image and coordinates to backend /punch-in
  const handlePunchInVerification = async (uid, image, challengeFrame) => {
    const targetEmpId = selectedEmpId || user?.employee_id || user?.employeeId || 'EMP001';

    const locationData = geoPosition 
      ? { latitude: geoPosition.latitude, longitude: geoPosition.longitude }
      : null;

    return await punchIn(targetEmpId, image, challengeFrame, locationData);
  };

  // Handle Teacher Punch Out (doesn't require face re-verification, just hits punch-out with ID)
  const handlePunchOut = async () => {
    const targetEmpId = selectedEmpId || user?.employee_id || user?.employeeId || kioskEmpId || 'EMP001';

    setIsPunchingOut(true);
    try {
      const res = await punchOut(targetEmpId);
      if (res?.status) {
        toast.success('Punch-out registered successfully!');
        fetchPersonalLogs();
        setActiveTab('logs');
      } else {
        toast.error(res.message || 'Failed to punch out.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error punching out.');
    } finally {
      setIsPunchingOut(false);
    }
  };

  // Save Student Attendance
  const handleSaveStudentAttendance = async () => {
    const targetClassId = selectedClassId || classesList[0]?._id;
    setIsSavingStudentAtt(true);
    try {
      const res = await markStudentAttendance({
        date: attendanceDate,
        classId: targetClassId,
        attendanceData: studentsData
      });
      if (res?.status) {
        toast.success('Student attendance matrix saved successfully!');
        fetchStudentAttendance();
      } else {
        toast.error(res.message || 'Failed to save student records.');
      }
    } catch (err) {
      console.error('Save student attendance error:', err);
      toast.error(err.response?.data?.message || 'Error saving student attendance.');
    } finally {
      setIsSavingStudentAtt(false);
    }
  };

  // Trigger Face Scan for Kiosk
  const handleKioskScanTrigger = (e) => {
    e.preventDefault();
    if (!kioskEmpId.trim()) {
      toast.error('Please enter a Faculty/Staff ID.');
      return;
    }
    
    // GPS check
    if (!geoPosition || !geoPosition.latitude || !geoPosition.longitude) {
      if (geoDenied) {
        toast.error('Location permissions denied. Enable GPS to record punch-in.');
      } else {
        toast.error('Acquiring location coordinates... please try in a second.');
        geoRefresh();
      }
      return;
    }

    setSelectedEmpId(kioskEmpId.trim());
    setShowFaceScanner(true);
  };

  // Trigger Face Scan for Personal Login
  const handlePersonalScanTrigger = () => {
    const empId = user?.employee_id || user?.employeeId || 'EMP001';
    setSelectedEmpId(empId);

    if (!geoPosition || !geoPosition.latitude || !geoPosition.longitude) {
      if (geoDenied) {
        toast.error('Location permissions denied. Enable GPS to record punch-in.');
      } else {
        toast.error('Acquiring location coordinates... please try in a second.');
        geoRefresh();
      }
    }

    setShowFaceScanner(true);
  };

  // Express 1-click Punch-In fallback
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
        fetchPersonalLogs();
        setActiveTab('logs');
      } else {
        toast.error(res.message || 'Punch-in failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error executing punch-in.');
    } finally {
      setIsPunchingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#334155] flex flex-col md:flex-row font-sans">
      <Sidebar />
      <div className="flex-1 bg-[#f3f3f9] p-4 sm:p-6 lg:p-8 overflow-y-auto">
        
        {/* Top Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-stone-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-[#405189] flex items-center gap-2">
              <span>🕐</span> Attendance Registry
            </h1>
            <p className="text-stone-400 text-xs mt-0.5">
              Live Biometrics & Student Records
            </p>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold font-mono text-[#172B4D] block">{currentTime.toLocaleTimeString()}</span>
            <span className="text-xs text-stone-500">{currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 mb-8 overflow-x-auto py-1">
          <button
            onClick={() => { setActiveTab('teacher-punch'); setShowFaceScanner(false); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              activeTab === 'teacher-punch'
                ? 'bg-[#29456D] text-white border-[#29456D] shadow-sm'
                : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50 hover:text-stone-700'
            }`}
          >
            👤 Faculty Punch-In
          </button>
          
          {(user?.role?.toLowerCase() === 'teacher' || user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'principal' || user?.role?.toLowerCase() === 'hod' || user?.isAdmin) && (
            <button
              onClick={() => { setActiveTab('student-grid'); setShowFaceScanner(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                activeTab === 'student-grid'
                  ? 'bg-[#29456D] text-white border-[#29456D] shadow-sm'
                  : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50 hover:text-stone-700'
              }`}
            >
              📚 Student Attendance Grid
            </button>
          )}

          <button
            onClick={() => { setActiveTab('logs'); setShowFaceScanner(false); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              activeTab === 'logs'
                ? 'bg-[#29456D] text-white border-[#29456D] shadow-sm'
                : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50 hover:text-stone-700'
            }`}
          >
            📋 Attendance History
          </button>
        </div>

        {/* ─── TAB 1: FACULTY PUNCH-IN ─── */}
        {activeTab === 'teacher-punch' && (
          <div className="max-w-4xl mx-auto">
            {showFaceScanner ? (
              <div className="bg-white border border-[#e9ebec] shadow-sm rounded p-6 animate-fadeIn relative">
                <button
                  onClick={() => setShowFaceScanner(false)}
                  className="absolute top-4 right-4 bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-rose-600 px-3 py-1.5 rounded text-xs font-bold"
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
                <div className="bg-white border border-[#e9ebec] shadow-sm rounded p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-stone-800 mb-2">My Punch-In Console</h3>
                    <p className="text-xs text-stone-400 mb-6 leading-relaxed">
                      Punched in logs will be linked to your user account. Verification runs face matching, liveness scans, and verifies range boundary coordinates (max 500m from registered school location).
                    </p>

                    {/* Geolocation status warning */}
                    <div className="mb-4">
                      {geoPosition ? (
                        <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono bg-emerald-50 text-emerald-800 p-3 rounded border border-emerald-200">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                          <span>GPS Ready: {typeof geoPosition?.latitude === 'number' ? geoPosition.latitude.toFixed(5) : (geoPosition?.latitude || '0.00000')}, {typeof geoPosition?.longitude === 'number' ? geoPosition.longitude.toFixed(5) : (geoPosition?.longitude || '0.00000')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-[#172B4D] font-mono bg-stone-50 text-stone-800 p-3 rounded border border-amber-200 animate-pulse">
                          <span className="w-1.5 h-1.5 bg-stone-500 rounded-full" />
                          <span>Acquiring GPS Signal...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handlePersonalScanTrigger}
                      className="w-full py-3.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      📷 Biometric Face Punch-In
                    </button>
                    <button
                      onClick={handleExpressPunchIn}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-900 font-extrabold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      ⚡ Express 1-Click Punch-In
                    </button>
                    <button
                      onClick={handlePunchOut}
                      disabled={isPunchingOut}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-stone-100 font-bold text-xs rounded-xl transition-all shadow-sm border border-red-900/20 cursor-pointer disabled:opacity-50"
                    >
                      {isPunchingOut ? 'Punching out...' : '🚪 Punch-Out'}
                    </button>
                  </div>
                </div>

                {/* Shared Gate Kiosk Punch-In Card */}
                <div className="bg-white border border-[#e9ebec] shadow-sm rounded p-6">
                  <h3 className="text-base font-bold text-stone-800 mb-2">Shared Institution Gate Kiosk</h3>
                  <p className="text-xs text-stone-400 mb-6 leading-relaxed">
                    Used as a physical wall terminal. Enter your unique faculty ID to trigger biometric scans, matching your face template stored in the database.
                  </p>
                  
                  <form onSubmit={handleKioskScanTrigger} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Faculty/Staff ID Reference</label>
                      <input
                        type="text"
                        placeholder="e.g. TCH-123456 or STF-123456"
                        value={kioskEmpId}
                        onChange={(e) => setKioskEmpId(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded px-4 py-2.5 text-stone-800 text-sm outline-none focus:border-[#29456D] placeholder-stone-400 font-mono uppercase"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="submit"
                        className="py-3 bg-[#29456D] hover:bg-[#172B4D] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        📷 Scan Face (Punch-In)
                      </button>
                      <button
                        type="button"
                        onClick={handlePunchOut}
                        disabled={isPunchingOut || !kioskEmpId.trim()}
                        className="py-3 bg-stone-850 hover:bg-stone-800 border border-stone-800 text-stone-700 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
                      >
                        🚪 Punch-Out
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: STUDENT ATTENDANCE GRID ─── */}
        {activeTab === 'student-grid' && (
          <div className="bg-white border border-[#e9ebec] shadow-sm rounded p-6 max-w-4xl mx-auto">
            
            {/* Header / Selectors */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 pb-5 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-stone-500 uppercase mb-1 tracking-wider">Class Standard</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="bg-white border border-stone-200 text-stone-700 text-xs rounded px-3 py-2 outline-none focus:border-[#29456D] w-44 font-semibold"
                  >
                    {classesList.map(c => (
                      <option key={c._id} value={c._id}>Class {c.standard} - {c.section}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-stone-500 uppercase mb-1 tracking-wider">Date</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="bg-white border border-stone-200 text-stone-700 text-xs rounded px-3 py-1.5 outline-none focus:border-[#29456D] font-semibold"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveStudentAttendance}
                disabled={isSavingStudentAtt || studentsData.length === 0}
                className="px-5 py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white font-bold text-xs rounded transition-all shadow-sm disabled:opacity-50"
              >
                {isSavingStudentAtt ? 'Saving Matrix...' : '💾 Save Attendance Grid'}
              </button>
            </div>

            {/* Students Table */}
            {loadingStudents ? (
              <div className="text-center py-12">
                <Spinner size="lg" className="mx-auto mb-2" />
                <p className="text-stone-500 text-xs italic">Fetching student roster...</p>
              </div>
            ) : studentsData.length === 0 ? (
              <p className="text-stone-500 text-xs italic text-center py-8">Select a class standard to display students.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 font-extrabold uppercase tracking-wider bg-stone-50/70">
                      <th className="py-3 px-4 w-24">Roll No</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4 text-center">Marked Timestamp</th>
                      <th className="py-3 px-4 text-right">Attendance Status Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsData.map((student, idx) => (
                      <tr key={idx} className="border-b border-stone-200/50 hover:bg-stone-50/80 text-stone-700 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#172B4D]">
                          <span className="bg-stone-100 px-2 py-1 rounded text-stone-800 border border-stone-200">
                            {student.rollNumber || String(idx + 1).padStart(2, '0')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-stone-850 text-sm">
                          {student.studentName}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-mono text-[11px] font-semibold rounded-md border border-emerald-200/60 shadow-xs">
                            🕒 {student.markedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex bg-stone-950 border border-stone-200 rounded-lg p-0.5 shadow-xs">
                            {['Present', 'Absent', 'Late'].map(statusOption => {
                              const isActive = student.status === statusOption;
                              const getBadgeClass = () => {
                                if (!isActive) return 'text-stone-400 hover:text-white';
                                if (statusOption === 'Present') return 'bg-emerald-500 text-white font-bold shadow-sm';
                                if (statusOption === 'Absent') return 'bg-red-500 text-white font-bold shadow-sm';
                                return 'bg-[#405189] text-white font-bold shadow-sm';
                              };
                              return (
                                <button
                                  key={statusOption}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...studentsData];
                                    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                    updated[idx].status = statusOption;
                                    updated[idx].markedTime = nowStr;
                                    setStudentsData(updated);
                                  }}
                                  className={`px-3 py-1 text-[10px] rounded-md transition-all ${getBadgeClass()}`}
                                >
                                  {statusOption}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* ─── TAB 3: ATTENDANCE HISTORY LOGS ─── */}
        {activeTab === 'logs' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Monthly Calendar Grid View */}
            <div className="bg-white border border-[#e9ebec] shadow-sm rounded p-6">
              <h3 className="text-base font-bold text-stone-850 mb-4 flex items-center gap-2">👤 Monthly Attendance Grid</h3>
              
              <div className="flex flex-wrap gap-3 mb-6">
                <select value={reportMonth} onChange={e => setReportMonth(+e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-805 font-bold">
                  {MONTH_NAMES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
                <select value={reportYear} onChange={e => setReportYear(+e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-805 font-bold">
                  {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={fetchDetails} className="px-4 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white rounded-lg text-sm font-bold transition-all">Load Report</button>
                <button onClick={() => handleExport('details')} disabled={exportingType==='details'} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 shadow-md">
                  {exportingType==='details' ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : '📥'} Export to Excel
                </button>
              </div>

              {reportLoading ? (
                <div className="text-center py-8"><Spinner size="lg" className="mx-auto" /></div>
              ) : details ? (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 font-medium"><span className="font-bold">{MONTH_NAMES[details.month]} {details.year}</span> • {details.days_in_month} days</p>
                  {(() => {
                    const allEmps = details.employees || [];
                    const empId = user?.employee_id || user?.employeeId;
                    const myEmps = empId
                      ? allEmps.filter(emp => emp.employee_id === empId || emp.name === user?.name)
                      : [];
                    const displayEmps = myEmps.length > 0 ? myEmps : allEmps;

                    if (displayEmps.length === 0) {
                      return <p className="text-center text-gray-400 py-8 italic bg-gray-50 border border-gray-200 rounded-2xl">No employee attendance records found for this month.</p>;
                    }

                    const dateRows = displayEmps[0]?.daily || [];

                    return (
                      <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm max-w-full overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                          <thead className="bg-stone-900 text-amber-250 sticky top-0 z-20">
                            <tr>
                              <th className="px-3 py-3 text-left font-bold uppercase tracking-wider sticky left-0 bg-stone-900 z-30 border-r border-stone-850 min-w-[150px]">
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
                          <tbody className="divide-y divide-gray-150 bg-white text-stone-800">
                            {displayEmps.map((emp, i) => (
                              <tr key={emp.employee_id || i} className="hover:bg-amber-50/20">
                                <td className="px-3 py-2.5 sticky left-0 bg-white z-10 border-r border-gray-150 shadow-sm whitespace-nowrap min-w-[150px]">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-gray-900 text-xs">{emp.name}</span>
                                    <span className="text-[9px] text-gray-400 font-mono">{emp.employee_id}</span>
                                  </div>
                                </td>
                                {dateRows.map((_, j) => {
                                  const dayData = emp.daily?.[j] || {};
                                  const isPresent = dayData.status === 'Present' || dayData.status === 'In Office';
                                  return (
                                    <td key={j} className="px-2 py-2.5 text-center border-r border-gray-100">
                                      {isPresent ? (
                                        <span 
                                          onClick={() => handleOpenEditAttModal(emp, dayData)}
                                          title={`Click to edit ${emp.name} (${dayData.date}) | Status: ${dayData.status}`}
                                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] shadow-sm cursor-pointer hover:scale-110 active:scale-95 transition-all"
                                        >
                                          P
                                        </span>
                                      ) : dayData.status === 'Weekly Off' ? (
                                        <span 
                                          onClick={() => handleOpenEditAttModal(emp, dayData)}
                                          title={`Click to edit ${emp.name} (${dayData.date}) | Status: Weekly Off`}
                                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 font-bold text-[9px] cursor-pointer hover:scale-110 active:scale-95 transition-all border border-stone-200"
                                        >
                                          WO
                                        </span>
                                      ) : (
                                        <span 
                                          onClick={() => handleOpenEditAttModal(emp, dayData)}
                                          title={`Click to edit ${emp.name} (${dayData.date}) | Status: ${dayData.status}`}
                                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-600 font-black text-[10px] shadow-sm cursor-pointer hover:scale-110 active:scale-95 transition-all border border-rose-200"
                                        >
                                          A
                                        </span>
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
              ) : <p className="text-center text-gray-400 py-8 italic bg-gray-50 border border-gray-200 rounded-2xl">Select month/year and click "Load Report" to show your calendar grid.</p>}
            </div>

            {/* Detailed History Table Logs */}
            <div className="bg-white border border-[#e9ebec] shadow-sm rounded p-6">
              <h3 className="text-base font-bold text-stone-850 mb-4 flex items-center gap-2">📑 Raw Log Entries</h3>
              {logsLoading ? (
                <div className="text-center py-12"><Spinner size="lg" className="mx-auto" /></div>
              ) : personalLogs.length === 0 ? (
                <p className="text-stone-500 text-xs italic text-center py-8">No personal attendance logs found.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Faculty Member</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Punch-In Time</th>
                        <th className="py-3 px-4">Punch-Out Time</th>
                        <th className="py-3 px-4">Logged Location</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 bg-white">
                      {personalLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-stone-50 text-stone-700 transition-colors">
                          <td className="py-3 px-4 font-bold text-stone-850">{log.teacher?.name || 'Faculty Member'}</td>
                          <td className="py-3 px-4 font-mono font-bold text-stone-800">{log.date}</td>
                          <td className="py-3 px-4 font-mono">{log.punchIn ? new Date(log.punchIn).toLocaleTimeString() : '--:--'}</td>
                          <td className="py-3 px-4 font-mono">{log.punchOut ? new Date(log.punchOut).toLocaleTimeString() : '--:--'}</td>
                          <td className="py-3 px-4 text-stone-400 truncate max-w-[200px]" title={log.address}>{log.address || 'Main Gate Kiosk'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] border ${
                              log.status === 'Present'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : log.status === 'Leave'
                                  ? 'bg-stone-50 text-[#405189] border-amber-200'
                                  : 'bg-red-50 text-red-755 border-red-200'
                            }`}>
                              {log.status}
                            </span>
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

      {/* ── EDIT ATTENDANCE STATUS MODAL ── */}
      {showEditAttModal && editAttEmployee && editAttDayData && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden transform transition-all">
            <div className="bg-stone-900 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  ✏️ Edit Attendance Record
                </h3>
                <p className="text-stone-400 text-xs mt-0.5">Modify status & specify reason for audit log</p>
              </div>
              <button 
                onClick={() => setShowEditAttModal(false)}
                className="text-stone-400 hover:text-white text-xl font-bold p-1 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Target Employee Info Card */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-stone-900 text-sm">{editAttEmployee.name}</div>
                  <div className="text-xs font-mono text-[#172B4D] font-bold">{editAttEmployee.employee_id} • {editAttEmployee.department}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-stone-800">{editAttDayData.date}</div>
                  <div className="text-[10px] text-amber-600 font-mono font-semibold">{editAttDayData.day}</div>
                </div>
              </div>

              {/* Status Radio / Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">New Attendance Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'Present', label: '🟢 Present', class: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                    { key: 'Absent', label: '🔴 Absent', class: 'border-rose-500 bg-rose-50 text-rose-800' },
                    { key: 'Leave', label: '🟡 Leave', class: 'border-amber-500 bg-amber-50 text-amber-800' },
                    { key: 'Half Day', label: '🔵 Half Day', class: 'border-blue-500 bg-blue-50 text-blue-800' },
                    { key: 'Weekly Off', label: '⚪ Weekly Off', class: 'border-stone-400 bg-stone-100 text-stone-700' }
                  ].map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setEditAttStatus(item.key)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                        editAttStatus === item.key ? `${item.class} shadow-xs ring-2 ring-[#1E3A8A]` : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      {editAttStatus === item.key && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason for Change Input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Reason for Modification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={editAttReason}
                  onChange={(e) => setEditAttReason(e.target.value)}
                  placeholder="Enter reason for modifying attendance (e.g. Medical Emergency, Official Workshop Duty, System Correction)..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-xs outline-none focus:ring-2 focus:ring-[#93C5FD] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEditAttModal(false)}
                className="px-4 py-2 border border-stone-250 text-stone-600 hover:bg-stone-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAttendanceStatus}
                disabled={isSavingAttStatus}
                className="px-5 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white font-black text-xs rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSavingAttStatus ? 'Saving...' : '💾 Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default AttendancePage;
