import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  getProfile, updateTeacherProfile, getTimetables, getAttendanceLogs, 
  getMyLeaveRequests, requestLeave, getTeacherDashboard, classLogin, 
  classLogout, getTeacherFeedbackAnalytics, getDetailsReport, 
  exportAttendanceExcel, getStudentsList, getMyTeacherAllocations,
  getMyNotices, markNoticeRead, getHomeworkList, assignHomework,
  gradeHomeworkSubmission, deleteHomework, getExamNames, getExamMarks,
  saveBulkExamMarks, togglePublishExam
} from '../services/authService';
import Sidebar from '../components/ui/Sidebar';
import Spinner from '../components/ui/Spinner';
import { 
  Award, BookOpen, Bell, Send, CheckCircle2, AlertCircle, Plus, 
  Eye, Check, X, FileText, ChevronDown, Calendar, Users, Star, 
  Sparkles, CheckCheck, Clock, Download, RefreshCw, Trash2, Printer
} from 'lucide-react';


const TeacherSectionPage = () => {
  const { user, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const activeTab = params.get('tab') || 'profile';

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [timetable, setTimetable] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [activeTimetableTab, setActiveTimetableTab] = useState('today'); // 'today' | 'weekly'
  
  // Month-view Grid State
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [details, setDetails] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [exportingType, setExportingType] = useState(null);

  const MONTH_NAMES = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
  // Modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showQualModal, setShowQualModal] = useState(false);
  const [showExpModal, setShowExpModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedIndex, setSelectedIndex] = useState(null);

  // Form states
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [qualForm, setQualForm] = useState({ degree: '', institution: '', year: '' });
  const [expForm, setExpForm] = useState({ role: '', institution: '', duration: '' });

  // Leave Form & History State
  const [myLeaves, setMyLeaves] = useState([]);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Feedback Analytics State
  const [feedbackAnalytics, setFeedbackAnalytics] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // Teacher Allocations & Mappings State
  const [teacherAllocations, setTeacherAllocations] = useState({ classes: [], mappings: [] });

  // Marks Entry State
  const [examList, setExamList] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedMarksClass, setSelectedMarksClass] = useState('');
  const [selectedMarksSubject, setSelectedMarksSubject] = useState('');
  const [marksRoster, setMarksRoster] = useState([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);
  const [isExamPublished, setIsExamPublished] = useState(false);
  const [publishingExam, setPublishingExam] = useState(false);

  // Homework State
  const [homeworkList, setHomeworkList] = useState([]);
  const [loadingHomework, setLoadingHomework] = useState(false);
  const [showAddHwModal, setShowAddHwModal] = useState(false);
  const [newHwForm, setNewHwForm] = useState({ title: '', description: '', standard: '', section: 'A', subject: '', dueDate: 'Tomorrow (09:00 AM)' });
  const [selectedHwForSubmissions, setSelectedHwForSubmissions] = useState(null);
  const [gradeModal, setGradeModal] = useState({ show: false, submissionId: null, studentName: '', grade: 'A+', feedback: '' });

  // Notices State
  const [noticesList, setNoticesList] = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(false);

  // Load dashboard/tab details
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const prof = await getProfile();
      if (prof?.status && prof.data) {
        setProfileData(prof.data);
        setProfileForm({
          name: prof.data.name || '',
          email: prof.data.email || '',
          phone: prof.data.phone || ''
        });

        const tId = prof.data.teacherId || prof.data._id;

        // Load timetable, attendance, leaves, dashboard, allocations, and exams safely
        const [timeRes, attRes, leavesRes, dashRes, allocRes, examRes] = await Promise.all([
          getTimetables({ teacherId: tId }).catch(() => ({ status: false, data: [] })),
          getAttendanceLogs().catch(() => ({ status: false, data: [] })),
          getMyLeaveRequests().catch(() => ({ status: false, data: [] })),
          getTeacherDashboard().catch(() => null),
          getMyTeacherAllocations().catch(() => ({ status: false, data: { classes: [], mappings: [] } })),
          getExamNames().catch(() => ({ status: false, data: [] }))
        ]);

        if (allocRes?.status && allocRes.data) {
          setTeacherAllocations(allocRes.data);
        }

        if (examRes?.status && Array.isArray(examRes.data)) {
          setExamList(examRes.data);
          if (examRes.data.length > 0 && !selectedExamId) {
            setSelectedExamId(examRes.data[0].id);
          }
        }

        if (timeRes?.status && Array.isArray(timeRes.data)) {
          setTimetable(timeRes.data);
        }

        if (attRes?.status && Array.isArray(attRes.data)) {
          // Filter logs for this teacher
          const myEmp = (prof.data.employeeId || '').toLowerCase();
          const myName = (prof.data.name || '').toLowerCase();
          let myLogs = attRes.data.filter(log => {
            if (!log.teacher) return false;
            const tEmp = (log.teacher.employeeId || '').toLowerCase();
            const tName = (log.teacher.name || '').toLowerCase();
            return (myEmp && (tEmp === myEmp || tEmp.replace('tch','emp') === myEmp.replace('tch','emp'))) ||
                   (myName && tName === myName);
          });
          if (myLogs.length === 0 && attRes.data.length > 0) {
            myLogs = attRes.data;
          }
          setAttendance(myLogs);
        }

        if (leavesRes?.status && Array.isArray(leavesRes.data)) {
          setMyLeaves(leavesRes.data);
        }

        if (dashRes?.status && dashRes.data) {
          setTodaySchedule(dashRes.data.schedule || []);
          setCurrentPeriod(dashRes.data.currentPeriod || null);
        }

        if (activeTab === 'attendance') {
          fetchDetails(prof.data.employeeId || prof.data.employee_id || "EMP002");
        }

        if (activeTab === 'feedback') {
          setLoadingFeedback(true);
          try {
            const feedRes = await getTeacherFeedbackAnalytics();
            if (feedRes?.status) {
              setFeedbackAnalytics(feedRes.data);
            }
          } catch (feedErr) {
            console.error('Failed to load teacher feedback analytics:', feedErr);
          } finally {
            setLoadingFeedback(false);
          }
        }

        if (activeTab === 'homework') {
          setLoadingHomework(true);
          try {
            const hwRes = await getHomeworkList();
            if (hwRes?.status && Array.isArray(hwRes.data)) {
              setHomeworkList(hwRes.data);
            }
          } catch (_) {}
          setLoadingHomework(false);
        }

        if (activeTab === 'notices') {
          setLoadingNotices(true);
          try {
            const notRes = await getMyNotices();
            if (notRes?.status && Array.isArray(notRes.data)) {
              setNoticesList(notRes.data);
            }
          } catch (_) {}
          setLoadingNotices(false);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load profile details.');
      setLoading(false);
    }
  }, [activeTab, reportMonth, reportYear, selectedExamId]);

  const fetchDetails = useCallback(async (empId) => {
    if (!empId) return;
    setReportLoading(true);
    try {
      const res = await getDetailsReport(reportMonth, reportYear, empId);
      if (res?.data) {
        setDetails(res.data);
      }
    } catch (err) {
      toast.error('Failed to load attendance grid');
    } finally {
      setReportLoading(false);
    }
  }, [reportMonth, reportYear]);

  const handleExport = async (type) => {
    const empId = profileData?.employeeId || user?.employee_id || user?.employeeId;
    if (!empId) return;
    setExportingType(type);
    try {
      await exportAttendanceExcel('details', reportMonth, reportYear, '', empId);
      toast.success('Excel file downloaded!');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExportingType(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData, activeTab]);

  useEffect(() => {
    if (activeTab === 'attendance' && profileData?.employeeId) {
      fetchDetails(profileData.employeeId);
    }
  }, [reportMonth, reportYear, activeTab, profileData?.employeeId, fetchDetails]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      const res = await updateTeacherProfile(profileForm);
      if (res.status) {
        toast.success('Profile updated successfully!');
        setShowProfileModal(false);
        refreshProfile();
        fetchData();
      } else {
        toast.error(res.message || 'Failed to update profile');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving profile');
    }
  };

  const handleQualSave = async (e) => {
    e.preventDefault();
    if (!qualForm.degree.trim() || !qualForm.institution.trim() || !qualForm.year.trim()) {
      toast.error('All fields are required');
      return;
    }

    const currentList = [...(profileData.qualificationsList || [])];
    if (modalMode === 'add') {
      currentList.push(qualForm);
    } else {
      currentList[selectedIndex] = qualForm;
    }

    try {
      const res = await updateTeacherProfile({ qualificationsList: currentList });
      if (res.status) {
        toast.success(modalMode === 'add' ? 'Qualification added!' : 'Qualification updated!');
        setShowQualModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error('Error saving qualification');
    }
  };

  const handleQualDelete = async (index) => {
    if (!window.confirm('Are you sure you want to delete this qualification?')) return;
    const currentList = [...(profileData.qualificationsList || [])];
    currentList.splice(index, 1);

    try {
      const res = await updateTeacherProfile({ qualificationsList: currentList });
      if (res.status) {
        toast.success('Qualification deleted!');
        fetchData();
      }
    } catch (err) {
      toast.error('Error deleting qualification');
    }
  };

  const handleExpSave = async (e) => {
    e.preventDefault();
    if (!expForm.role.trim() || !expForm.institution.trim() || !expForm.duration.trim()) {
      toast.error('All fields are required');
      return;
    }

    const currentList = [...(profileData.experienceList || [])];
    if (modalMode === 'add') {
      currentList.push(expForm);
    } else {
      currentList[selectedIndex] = expForm;
    }

    try {
      const res = await updateTeacherProfile({ experienceList: currentList });
      if (res.status) {
        toast.success(modalMode === 'add' ? 'Experience added!' : 'Experience updated!');
        setShowExpModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error('Error saving experience details');
    }
  };

  const handleExpDelete = async (index) => {
    if (!window.confirm('Are you sure you want to delete this experience record?')) return;
    const currentList = [...(profileData.experienceList || [])];
    currentList.splice(index, 1);

    try {
      const res = await updateTeacherProfile({ experienceList: currentList });
      if (res.status) {
        toast.success('Experience record deleted!');
        fetchData();
      }
    } catch (err) {
      toast.error('Error deleting experience');
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!leaveDate) {
      toast.error('Please select a leave date');
      return;
    }
    if (!leaveReason.trim()) {
      toast.error('Please specify a reason for leave');
      return;
    }

    try {
      setIsSubmittingLeave(true);
      const res = await requestLeave(leaveDate, leaveReason.trim());
      if (res.status) {
        toast.success('Leave request submitted successfully!');
        setLeaveDate('');
        setLeaveReason('');
        // Reload leave history
        const leavesRes = await getMyLeaveRequests();
        if (leavesRes?.status && Array.isArray(leavesRes.data)) {
          setMyLeaves(leavesRes.data);
        }
      } else {
        toast.error(res.message || 'Failed to submit leave request');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting leave request');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handlePrintLeaveCopy = (leave) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Leave Approval Copy - Qelvora School CRM</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1c1917; background-color: #fff; }
            .slip-card { border: 2px solid #e7e5e4; border-radius: 16px; padding: 30px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { text-align: center; border-bottom: 2px solid #f5f5f4; padding-bottom: 20px; margin-bottom: 25px; }
            .header h2 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { margin: 5px 0 0 0; font-size: 12px; color: #a8a29e; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            .field-group { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .field { background: #fafaf9; border: 1px solid #f5f5f4; padding: 12px 15px; border-radius: 12px; }
            .field label { font-size: 9px; text-transform: uppercase; font-weight: bold; color: #78716c; display: block; margin-bottom: 4px; }
            .field span { font-size: 14px; font-weight: 700; color: #1c1917; }
            .reason-box { background: #fafaf9; border: 1px solid #f5f5f4; padding: 15px; border-radius: 12px; margin-bottom: 25px; }
            .reason-box label { font-size: 9px; text-transform: uppercase; font-weight: bold; color: #78716c; display: block; margin-bottom: 6px; }
            .reason-box p { margin: 0; font-size: 13px; font-style: italic; color: #44403c; line-height: 1.5; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; border: 1px solid #bbf7d0; background: #f0fdf4; color: #166534; }
            .footer-sig { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; border-top: 1px solid #f5f5f4; padding-top: 20px; }
            .signature { text-align: center; }
            .signature .line { border-bottom: 1px solid #78716c; width: 150px; margin-bottom: 5px; height: 30px; }
            .signature span { font-size: 10px; font-weight: bold; color: #78716c; text-transform: uppercase; }
            @media print {
              body { padding: 0; }
              .slip-card { border: none; box-shadow: none; padding: 0; }
              .no-print { display: none; }
            }
            .print-btn-container { text-align: center; margin-top: 25px; }
            .print-btn { background: #1c1917; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-size: 12px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
            .print-btn:hover { background: #2e2a24; }
          </style>
        </head>
        <body>
          <div class="slip-card">
            <div class="header">
              <h2>QELVORA SCHOOL CRM</h2>
              <p>Official Approved Leave Copy</p>
            </div>
            <div class="field-group">
              <div class="field">
                <label>Faculty Name</label>
                <span>${profileData?.name}</span>
              </div>
              <div class="field">
                <label>Faculty ID</label>
                <span>${profileData?.employeeId}</span>
              </div>
            </div>
            <div class="field-group">
              <div class="field">
                <label>Leave Date</label>
                <span>${leave.leaveDate}</span>
              </div>
              <div class="field">
                <label>Approval Status</label>
                <div style="margin-top: 4px;"><span class="status-badge">Approved</span></div>
              </div>
            </div>
            <div class="reason-box">
              <label>Reason for Leave</label>
              <p>" ${leave.reason} "</p>
            </div>
            <div class="footer-sig">
              <div>
                <span style="font-size: 10px; font-weight: bold; color: #a8a29e; font-family: monospace;">Verification Code: ${leave._id?.substring(0, 8).toUpperCase()}</span>
              </div>
              <div class="signature">
                <div class="line"></div>
                <span>Principal Approval Signature</span>
              </div>
            </div>
            <div class="print-btn-container no-print">
              <button class="print-btn" onclick="window.print()">Print Leave Copy</button>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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
              fetchData();
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
              fetchData();
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

  // Group timetable by weekdays
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Extract unique classes mapped to this teacher (prioritize TeacherClassSubjectMapping from API)
  const uniqueClasses = useMemo(() => {
    const list = [];
    if (teacherAllocations?.classes && teacherAllocations.classes.length > 0) {
      teacherAllocations.classes.forEach(c => {
        const idKey = c.classId || `${c.standard}-${c.section || 'A'}`;
        list.push({
          _id: idKey,
          id: idKey,
          name: c.name || `Class ${c.standard} - Section ${c.section || 'A'}`,
          standard: c.standard,
          section: c.section || 'A',
          board: c.board || 'CBSE',
          subjects: c.subjects && c.subjects.length > 0 ? c.subjects : ['Mathematics', 'Science'],
          isClassTeacher: c.isClassTeacher || false
        });
      });
    }

    timetable.forEach(t => {
      const clsKey = `${t.standard}-${t.section || 'A'}`;
      if (!list.find(c => c._id === clsKey || (c.standard === t.standard && c.section === (t.section || 'A')))) {
        list.push({
          _id: t.classId || clsKey,
          id: t.classId || clsKey,
          name: `Class ${t.standard} - Section ${t.section || 'A'}`,
          standard: t.standard,
          section: t.section || 'A',
          board: 'CBSE',
          subjects: t.subject ? [t.subject] : ['Mathematics', 'Science']
        });
      }
    });

    if (profileData?.assignedClass) {
      const std = profileData.assignedClass;
      const sec = profileData.assignedSection || 'A';
      const classKey = `${std}-${sec}`;
      if (!list.find(c => (c.standard === std && c.section === sec) || c._id === classKey)) {
        list.push({
          _id: classKey,
          id: classKey,
          name: `Class ${std} - Section ${sec}`,
          standard: std,
          section: sec,
          board: 'CBSE',
          subjects: ['General Science', 'Mathematics']
        });
      }
    }

    return list;
  }, [teacherAllocations, timetable, profileData]);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [classStudents, setClassStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (uniqueClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(uniqueClasses[0]._id);
    }
    if (uniqueClasses.length > 0 && !selectedMarksClass) {
      setSelectedMarksClass(uniqueClasses[0]._id);
    }
  }, [uniqueClasses, selectedClassId, selectedMarksClass]);

  // Load real student roster when activeTab === 'students'
  useEffect(() => {
    if (activeTab === 'students' && selectedClassId) {
      const targetClass = uniqueClasses.find(c => c._id === selectedClassId);
      const std = targetClass?.standard || '';
      const sec = targetClass?.section || '';

      setLoadingStudents(true);
      getStudentsList({ standard: std, section: sec })
        .then(res => {
          if (res?.status && Array.isArray(res.data)) {
            setClassStudents(res.data);
          } else {
            setClassStudents([]);
          }
        })
        .catch(() => {
          setClassStudents([]);
        })
        .finally(() => setLoadingStudents(false));
    }
  }, [activeTab, selectedClassId, uniqueClasses]);

  // Sync subjects for Marks Entry
  const marksClassObj = uniqueClasses.find(c => c._id === selectedMarksClass);
  const availableMarksSubjects = marksClassObj?.subjects && marksClassObj.subjects.length > 0
    ? marksClassObj.subjects
    : ['Mathematics', 'Science'];

  useEffect(() => {
    if (availableMarksSubjects.length > 0 && (!selectedMarksSubject || !availableMarksSubjects.includes(selectedMarksSubject))) {
      setSelectedMarksSubject(availableMarksSubjects[0]);
    }
  }, [availableMarksSubjects, selectedMarksSubject]);

  // Dynamic Grade Calculator
  const calculateGradeBadge = (marks, isAbsent) => {
    if (isAbsent) return { grade: 'AB', status: 'ABSENT', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
    if (marks === '' || marks === null || marks === undefined) return { grade: '-', status: 'PENDING', bg: 'bg-gray-100 text-gray-500 border-gray-200' };
    const m = Number(marks);
    if (isNaN(m)) return { grade: '-', status: 'PENDING', bg: 'bg-gray-100 text-gray-500 border-gray-200' };
    if (m >= 90) return { grade: 'A+', status: 'PASS', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (m >= 80) return { grade: 'A', status: 'PASS', bg: 'bg-emerald-50 text-emerald-700 border-emerald-250' };
    if (m >= 70) return { grade: 'B+', status: 'PASS', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (m >= 60) return { grade: 'B', status: 'PASS', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (m >= 50) return { grade: 'C', status: 'PASS', bg: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    if (m >= 35) return { grade: 'D', status: 'PASS', bg: 'bg-orange-100 text-orange-800 border-orange-300' };
    return { grade: 'F', status: 'FAIL', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  // Load Marks Roster
  const loadMarksRoster = useCallback(async () => {
    if (!selectedExamId || !selectedMarksClass || !selectedMarksSubject) return;
    const targetClass = uniqueClasses.find(c => c._id === selectedMarksClass);
    if (!targetClass) return;

    setLoadingMarks(true);
    try {
      const [studentsRes, marksRes] = await Promise.all([
        getStudentsList({ standard: targetClass.standard, section: targetClass.section }),
        getExamMarks({
          examNameId: selectedExamId,
          standard: targetClass.standard,
          section: targetClass.section,
          subjectName: selectedMarksSubject
        }).catch(() => ({ status: false, data: [] }))
      ]);

      const stuList = studentsRes?.status && Array.isArray(studentsRes.data) ? studentsRes.data : [];
      const marksList = marksRes?.status && Array.isArray(marksRes.data) ? marksRes.data : [];

      const currentExamObj = examList.find(e => e.id === selectedExamId);
      setIsExamPublished(!!currentExamObj?.isPublished);

      const merged = stuList.map(stu => {
        const found = marksList.find(m => m.studentId === stu.id);
        const marksObtained = found ? found.marksObtained : '';
        const isAbsent = found ? found.isAbsent : false;
        const remarks = found ? (found.remarks || '') : '';
        const gradeBadge = calculateGradeBadge(marksObtained, isAbsent);

        return {
          studentId: stu.id,
          studentName: stu.name,
          rollNumber: stu.rollNumber || stu.studentId,
          marksObtained,
          isAbsent,
          remarks,
          grade: gradeBadge.grade,
          status: gradeBadge.status,
          maxMarks: 100
        };
      });

      setMarksRoster(merged);
    } catch (err) {
      console.error('Error loading marks roster:', err);
      toast.error('Failed to load marks roster');
    } finally {
      setLoadingMarks(false);
    }
  }, [selectedExamId, selectedMarksClass, selectedMarksSubject, uniqueClasses, examList]);

  useEffect(() => {
    if (activeTab === 'marks') {
      loadMarksRoster();
    }
  }, [activeTab, loadMarksRoster]);

  // Handle Marks input change
  const handleMarkChange = (studentId, field, value) => {
    setMarksRoster(prev => prev.map(item => {
      if (item.studentId !== studentId) return item;
      const updated = { ...item, [field]: value };
      if (field === 'isAbsent' && value === true) {
        updated.marksObtained = 0;
      }
      const badge = calculateGradeBadge(updated.marksObtained, updated.isAbsent);
      updated.grade = badge.grade;
      updated.status = badge.status;
      return updated;
    }));
  };

  // Save Bulk Marks
  const handleSaveMarks = async () => {
    if (!selectedExamId || !selectedMarksClass || !selectedMarksSubject) {
      toast.error('Please select Exam, Class, and Subject');
      return;
    }
    const targetClass = uniqueClasses.find(c => c._id === selectedMarksClass);
    if (!targetClass) return;

    setSavingMarks(true);
    const toastId = toast.loading('Saving and linking marks to student records...');
    try {
      const payload = {
        examNameId: selectedExamId,
        standard: targetClass.standard,
        section: targetClass.section,
        subjectName: selectedMarksSubject,
        marksList: marksRoster.map(s => ({
          studentId: s.studentId,
          studentName: s.studentName,
          marksObtained: s.isAbsent ? 0 : Number(s.marksObtained || 0),
          isAbsent: !!s.isAbsent,
          remarks: s.remarks || '',
          maxMarks: 100
        }))
      };

      const res = await saveBulkExamMarks(payload);
      if (res?.status || res?.success) {
        toast.success('Marks saved successfully! Student report cards updated.', { id: toastId });
        loadMarksRoster();
      } else {
        toast.error(res?.message || 'Failed to save marks.', { id: toastId });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error saving marks', { id: toastId });
    } finally {
      setSavingMarks(false);
    }
  };

  // Toggle Exam Publish
  const handleTogglePublish = async () => {
    if (!selectedExamId) return;
    setPublishingExam(true);
    const toastId = toast.loading('Updating report card publication status...');
    try {
      const res = await togglePublishExam(selectedExamId);
      if (res?.status || res?.success) {
        const newStatus = res?.data?.isPublished;
        setIsExamPublished(newStatus);
        setExamList(prev => prev.map(e => e.id === selectedExamId ? { ...e, isPublished: newStatus } : e));
        toast.success(newStatus ? 'Report Cards Published! Parents & Students can now view results.' : 'Report Cards Unpublished.', { id: toastId });
      } else {
        toast.error(res?.message || 'Failed to toggle publication', { id: toastId });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error toggling publish', { id: toastId });
    } finally {
      setPublishingExam(false);
    }
  };

  // Handle Create Homework
  const handleCreateHomework = async (e) => {
    e.preventDefault();
    if (!newHwForm.title || !newHwForm.standard || !newHwForm.subject) {
      toast.error('Title, Class, and Subject are required');
      return;
    }
    const toastId = toast.loading('Publishing homework to class...');
    try {
      const res = await assignHomework(newHwForm);
      if (res?.status) {
        toast.success('Homework published successfully!', { id: toastId });
        setShowAddHwModal(false);
        setNewHwForm({ title: '', description: '', standard: '', section: 'A', subject: '', dueDate: 'Tomorrow (09:00 AM)' });
        const hwRes = await getHomeworkList();
        if (hwRes?.status && Array.isArray(hwRes.data)) setHomeworkList(hwRes.data);
      } else {
        toast.error(res?.message || 'Failed to publish homework', { id: toastId });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error creating homework', { id: toastId });
    }
  };

  // Handle Delete Homework
  const handleDeleteHomework = async (id) => {
    if (!window.confirm('Are you sure you want to delete this homework?')) return;
    try {
      const res = await deleteHomework(id);
      if (res?.status) {
        toast.success('Homework deleted');
        setHomeworkList(prev => prev.filter(h => h.id !== id));
      }
    } catch (err) {
      toast.error('Failed to delete homework');
    }
  };

  // Handle Grade Submission
  const handleGradeSubmission = async (e) => {
    e.preventDefault();
    if (!gradeModal.submissionId) return;
    const toastId = toast.loading('Saving grade and feedback...');
    try {
      const res = await gradeHomeworkSubmission(gradeModal.submissionId, {
        grade: gradeModal.grade,
        feedback: gradeModal.feedback
      });
      if (res?.status) {
        toast.success('Submission graded successfully!', { id: toastId });
        setGradeModal({ show: false, submissionId: null, studentName: '', grade: 'A+', feedback: '' });
        const hwRes = await getHomeworkList();
        if (hwRes?.status && Array.isArray(hwRes.data)) setHomeworkList(hwRes.data);
        if (selectedHwForSubmissions) {
          const updatedSelected = hwRes.data.find(h => h.id === selectedHwForSubmissions.id);
          if (updatedSelected) setSelectedHwForSubmissions(updatedSelected);
        }
      }
    } catch (err) {
      toast.error('Failed to grade submission', { id: toastId });
    }
  };

  // Handle Mark Notice Read
  const handleMarkNotice = async (id) => {
    try {
      await markNoticeRead(id);
      setNoticesList(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (_) {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#334155] flex flex-col md:flex-row font-sans">
      <Sidebar />

      <div className="flex-1 bg-[#F7F9FC] p-6 sm:p-8 overflow-y-auto">
        <header className="mb-6 flex justify-between items-center bg-[#172B4D] border border-[#29456D] shadow-sm rounded-2xl p-6 text-white">
          <div>
            <span className="text-[10px] font-bold text-[#DBEAFE] uppercase tracking-widest block mb-1">
              Faculty Section &bull; {profileData?.name || 'Academic Portal'}
            </span>
            <h1 className="text-2xl font-black text-white capitalize">
              {activeTab === 'marks' ? 'Examination Marks Entry' : activeTab === 'homework' ? 'Homework & Assignments' : activeTab === 'notices' ? 'Administrative Notices & Circulars' : activeTab === 'students' ? 'My Classes & Student Roster' : activeTab.replace('-', ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-mono border border-white/20">
              Faculty ID: {profileData?.employeeId || 'FAC'}
            </span>
          </div>
        </header>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-thin">
          {[
            { id: 'profile', label: 'Faculty Profile', icon: Users },
            { id: 'students', label: 'My Classes & Students', icon: Users },
            { id: 'marks', label: 'Marks Entry & Exams', icon: Award },
            { id: 'homework', label: 'Homework & Tasks', icon: BookOpen },
            { id: 'timetable', label: 'My Timetable', icon: Calendar },
            { id: 'notices', label: 'Notices & Circulars', icon: Bell },
            { id: 'attendance', label: 'Attendance Grid', icon: CheckCircle2 },
            { id: 'leaves', label: 'Leave Requests', icon: FileText },
            { id: 'feedback', label: 'Parent Reviews', icon: Star },
          ].map(tabItem => {
            const Icon = tabItem.icon;
            const isActive = activeTab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                onClick={() => navigate(`/teacher-section?tab=${tabItem.id}`)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all shadow-sm ${
                  isActive
                    ? 'bg-[#172B4D] text-white shadow-md'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-300' : 'text-stone-400'}`} />
                <span>{tabItem.label}</span>
              </button>
            );
          })}
        </div>


        {/* PROFILE TAB */}
        {activeTab === 'profile' && profileData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white border border-[#e9ebec] shadow-sm rounded p-6 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-24 h-24 bg-stone-100 rounded-full border border-stone-200 flex items-center justify-center text-4xl mx-auto shadow-inner">
                  👨‍🏫
                </div>
                <h3 className="text-lg font-black text-stone-850">{profileData.name}</h3>
                <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">{profileData.employeeId}</p>
              </div>

              <div className="border-t border-stone-100 pt-4 space-y-3.5 text-sm">
                <div>
                  <span className="text-xs text-stone-400 font-bold uppercase block">Email Address</span>
                  <span className="text-stone-800 font-semibold">{profileData.email}</span>
                </div>
                <div>
                  <span className="text-xs text-stone-400 font-bold uppercase block">Phone Number</span>
                  <span className="text-stone-800 font-semibold">{profileData.phone || 'Not Configured'}</span>
                </div>
                <div>
                  <span className="text-xs text-stone-400 font-bold uppercase block">System Status</span>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-250 mt-1">
                    {profileData.status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setProfileForm({
                    name: profileData.name || '',
                    email: profileData.email || '',
                    phone: profileData.phone || ''
                  });
                  setShowProfileModal(true);
                }}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 transition-all flex items-center justify-center gap-2"
              >
                ✏️ Edit Profile Info
              </button>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {/* Qualifications */}
              <div className="bg-white border border-[#e9ebec] shadow-sm rounded p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-black text-stone-850">Academic Qualifications</h3>
                  <button
                    onClick={() => {
                      setQualForm({ degree: '', institution: '', year: '' });
                      setModalMode('add');
                      setShowQualModal(true);
                    }}
                    className="px-3 py-1.5 bg-[#29456D] hover:bg-[#172B4D] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    ➕ Add Qualification
                  </button>
                </div>

                {(!profileData.qualificationsList || profileData.qualificationsList.length === 0) ? (
                  <p className="text-xs text-stone-450 italic py-6">No qualifications configured. Please add one.</p>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {profileData.qualificationsList.map((qual, idx) => (
                      <div key={idx} className="py-3.5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-extrabold text-stone-850 text-sm">{qual.degree}</p>
                          <p className="text-stone-500 mt-0.5">{qual.institution} &bull; Class of {qual.year}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setQualForm(qual);
                              setSelectedIndex(idx);
                              setModalMode('edit');
                              setShowQualModal(true);
                            }}
                            className="p-1.5 bg-stone-50 hover:bg-stone-100 rounded-lg text-stone-500"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleQualDelete(idx)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Experience */}
              <div className="bg-white border border-[#e9ebec] shadow-sm rounded p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-black text-stone-850">Teaching Experience</h3>
                  <button
                    onClick={() => {
                      setExpForm({ role: '', institution: '', duration: '' });
                      setModalMode('add');
                      setShowExpModal(true);
                    }}
                    className="px-3 py-1.5 bg-[#29456D] hover:bg-[#172B4D] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    ➕ Add Experience Record
                  </button>
                </div>

                {(!profileData.experienceList || profileData.experienceList.length === 0) ? (
                  <p className="text-xs text-stone-450 italic py-6">No teaching experience configured. Please add one.</p>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {profileData.experienceList.map((exp, idx) => (
                      <div key={idx} className="py-3.5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-extrabold text-stone-850 text-sm">{exp.role}</p>
                          <p className="text-stone-500 mt-0.5">{exp.institution} &bull; {exp.duration}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setExpForm(exp);
                              setSelectedIndex(idx);
                              setModalMode('edit');
                              setShowExpModal(true);
                            }}
                            className="p-1.5 bg-stone-50 hover:bg-stone-100 rounded-lg text-stone-500"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleExpDelete(idx)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TIMETABLE TAB */}
        {activeTab === 'timetable' && (
          <div className="bg-white border border-[#e9ebec] shadow-sm rounded overflow-hidden">
            {/* Sub Tabs Selector */}
            <div className="flex border-b border-stone-200 bg-stone-50/50">
              <button
                onClick={() => setActiveTimetableTab('today')}
                className={`flex-1 py-3.5 text-xs font-bold transition-all border-b-2 text-center ${
                  activeTimetableTab === 'today'
                    ? 'border-[#29456D] text-[#172B4D] bg-white border-b-2 shadow-sm'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50/50'
                }`}
              >
                📆 Today's Timetable
              </button>
              <button
                onClick={() => setActiveTimetableTab('weekly')}
                className={`flex-1 py-3.5 text-xs font-bold transition-all border-b-2 text-center ${
                  activeTimetableTab === 'weekly'
                    ? 'border-[#29456D] text-[#172B4D] bg-white border-b-2 shadow-sm'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50/50'
                }`}
              >
                📅 Weekly Timetable
              </button>
            </div>

            <div className="p-6">
              {activeTimetableTab === 'today' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-base font-black text-stone-850">Today's Timetable</h3>
                      <p className="text-stone-400 text-[11px] mt-0.5">Your teaching schedule for today. Start and end classes directly from here.</p>
                    </div>
                    <span className="text-xs text-stone-550 bg-stone-50 border border-stone-200 px-3 py-1 rounded-full font-bold">
                      Total: {todaySchedule.length} Periods
                    </span>
                  </div>

                  {todaySchedule.length === 0 ? (
                    <div className="text-center py-12 text-stone-450 italic text-sm">
                      No classes assigned to you today.
                    </div>
                  ) : (
                    <div className="space-y-6">
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
                            {todaySchedule.sort((a, b) => a.period - b.period).map((slot, idx) => (
                              <tr key={idx} className="border-b border-stone-150 hover:bg-stone-50/50 text-stone-750">
                                <td className="py-3.5 px-4 font-mono font-bold text-stone-800">P{slot.period}</td>
                                <td className="py-3.5 px-4 font-mono text-stone-550">{slot.timeSlot}</td>
                                <td className="py-3.5 px-4 font-bold text-stone-800">
                                  Class {slot.standard} - {slot.section} <span className="text-[10px] text-stone-400 font-normal">({slot.board})</span>
                                </td>
                                <td className="py-3.5 px-4 font-semibold text-stone-700">
                                  {slot.subject}
                                  {slot.type === 'substitute' && (
                                    <span className="inline-block ml-2 text-[8px] bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold border border-stone-200">
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
                                      disabled={Number(slot.period) !== Number(currentPeriod?.period)}
                                      onClick={() => handleClassLogin(slot.classId, slot.period, slot.subjectId)}
                                      className={`px-3.5 py-1.5 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all ${
                                        Number(slot.period) === Number(currentPeriod?.period)
                                          ? "bg-green-800 hover:bg-green-950 cursor-pointer"
                                          : "bg-stone-300 text-stone-500 cursor-not-allowed opacity-60"
                                      }`}
                                      title={Number(slot.period) !== Number(currentPeriod?.period) ? `Can only Check In during Period ${slot.period}` : ""}
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

              {activeTimetableTab === 'weekly' && (
                <div>
                  {/* Sri Chaitanya Style Header Banner */}
                  <div className="bg-[#1e2229] text-white p-6 rounded-t-xl border-b-2 border-[#29456D] mb-6 shadow-sm">
                    <h2 className="text-center font-black text-lg tracking-wider uppercase mb-3 text-white">
                      QELVORA SENIOR SECONDARY SCHOOL
                    </h2>
                    <div className="flex flex-col sm:flex-row justify-between text-xs font-bold px-4 text-stone-300">
                      <div>
                        CLASS TEACHER: <span className="text-[#172B4D] uppercase font-black">{profileData?.name || 'N/A'}</span>
                      </div>
                      <div className="mt-1 sm:mt-0">
                        CLASS: <span className="text-[#172B4D] uppercase font-black">
                          {profileData?.classTeacherOf 
                            ? `${profileData.classTeacherOf.standard} ${profileData.classTeacherOf.section}` 
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-stone-250 rounded-xl bg-white shadow-sm">
                    <table className="min-w-full border-collapse text-center text-xs">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-250 text-stone-600 font-extrabold uppercase text-[10px]">
                          <th className="py-3.5 px-3 border-r border-stone-250 bg-stone-50">Day</th>
                          {[
                            { period: 1, timeSlot: '8:20 - 9:00' },
                            { period: 2, timeSlot: '9:00 - 9:40' },
                            { period: 'break1', label: 'SHORT BREAK-1', timeSlot: '9:40 - 9:50', isBreak: true },
                            { period: 3, timeSlot: '9:50 - 10:30' },
                            { period: 4, timeSlot: '10:30 - 11:10' },
                            { period: 5, timeSlot: '11:10 - 11:50' },
                            { period: 6, timeSlot: '11:50 - 12:30' },
                            { period: 'lunch', label: 'LUNCH BREAK', timeSlot: '12:30 - 13:00', isBreak: true },
                            { period: 7, timeSlot: '13:00 - 13:40' },
                            { period: 8, timeSlot: '13:40 - 14:20' },
                            { period: 9, timeSlot: '14:20 - 15:00' },
                            { period: 'break2', label: 'SHORT BREAK-2', timeSlot: '15:00 - 15:10', isBreak: true },
                            { period: 10, timeSlot: '15:10 - 15:40' },
                            { period: 11, timeSlot: '15:40 - 18:00' }
                          ].map((col, idx) => (
                            <th key={idx} className="py-2.5 px-2 border-r border-stone-250 min-w-[100px]">
                              {col.isBreak ? (
                                <div className="flex flex-col items-center">
                                  <span className="font-extrabold text-[9px] text-[#405189]">{col.label}</span>
                                  <span className="text-[8px] text-stone-400 font-mono mt-0.5">{col.timeSlot}</span>
                                </div>
                              ) : (
                                <>
                                  <div className="font-black text-stone-850 text-[11px]">{col.period}</div>
                                  <div className="text-[8px] text-stone-400 font-mono mt-0.5">{col.timeSlot}</div>
                                </>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, dayIdx) => (
                          <tr key={day} className="border-b border-stone-200 hover:bg-stone-50/30">
                            {/* Day Header Column */}
                            <td className="py-4 px-3 font-black text-stone-700 bg-stone-50 border-r border-stone-250 text-left sticky left-0 z-10">
                              {day}
                            </td>

                            {/* Periods and Break Mapping */}
                            {[
                              { period: 1, isBreak: false },
                              { period: 2, isBreak: false },
                              { period: 'break1', label: 'SHORT BREAK-1', isBreak: true },
                              { period: 3, isBreak: false },
                              { period: 4, isBreak: false },
                              { period: 5, isBreak: false },
                              { period: 6, isBreak: false },
                              { period: 'lunch', label: 'LUNCH BREAK', isBreak: true },
                              { period: 7, isBreak: false },
                              { period: 8, isBreak: false },
                              { period: 9, isBreak: false },
                              { period: 'break2', label: 'SHORT BREAK-2', isBreak: true },
                              { period: 10, isBreak: false },
                              { period: 11, isBreak: false }
                            ].map((col, colIdx) => {
                              if (col.isBreak) {
                                // Break columns span vertically (rowSpan=6) on the first day (Monday)
                                if (dayIdx === 0) {
                                  return (
                                    <td
                                      key={colIdx}
                                      rowSpan={6}
                                      className="bg-stone-100 text-stone-500 font-black text-[9px] tracking-widest border-r border-stone-250 select-none py-6 align-middle uppercase"
                                    >
                                      <div
                                        className="inline-block"
                                        style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
                                      >
                                        {col.label}
                                      </div>
                                    </td>
                                  );
                                }
                                return null; // Spanned by rowSpan={6}
                              }

                              // Regular period column
                              const slot = timetable.find(
                                (s) => s.day === day && Number(s.period) === Number(col.period)
                              );

                              return (
                                <td key={colIdx} className="py-4 px-2 border-r border-stone-200 last:border-r-0 min-h-[50px] align-middle">
                                  {slot ? (
                                    <div className="animate-fadeIn">
                                      <div className="font-extrabold text-[11px] text-stone-850 uppercase">
                                        {slot.subject?.name}
                                      </div>
                                      <div className="text-[9px] text-[#172B4D] font-black mt-0.5 uppercase font-mono">
                                        {slot.class ? `${slot.class.standard} ${slot.class.section}` : ''}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-stone-300 font-medium">—</span>
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
          </div>
        )}

        {/* STUDENT DETAILS TAB */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            {uniqueClasses.length === 0 ? (
              <div className="bg-white border border-[#e9ebec] shadow-sm rounded p-8 text-center text-stone-450 italic">
                You are not currently teaching any classes according to the timetable.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left side: Class selection */}
                <div className="lg:col-span-1 bg-white border border-[#e9ebec] shadow-sm rounded p-6 space-y-4">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Taught Classes</h4>
                  <div className="space-y-1.5">
                    {uniqueClasses.map(cls => (
                      <button
                        key={cls._id}
                        onClick={() => setSelectedClassId(cls._id)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold border transition-all flex justify-between items-center ${
                          selectedClassId === cls._id
                            ? 'bg-[#29456D]/10 border-[#29456D] text-[#405189] shadow-sm'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <span>Class {cls.standard} - {cls.section}</span>
                        <span className="text-[10px] bg-white border border-stone-200/80 px-2 py-0.5 rounded-full font-mono text-stone-500">
                          {cls.board}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right side: Student grid */}
                <div className="lg:col-span-3 bg-white border border-[#e9ebec] shadow-sm rounded p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-black text-stone-850">Student Roster</h3>
                      <p className="text-stone-400 text-xs mt-0.5">Showing list of registered students in this standard.</p>
                    </div>
                    <span className="text-xs text-stone-500 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                      Total: {classStudents.length} Students
                    </span>
                  </div>

                  {loadingStudents ? (
                    <div className="text-center py-12"><Spinner size="md" className="mx-auto" /></div>
                  ) : classStudents.length === 0 ? (
                    <div className="text-center py-12 text-stone-400 italic text-xs">No registered students found in this class.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {classStudents.map((student, idx) => {
                        const sName = student.name || student;
                        const sRoll = student.rollNumber || (1000 + idx);
                        const sId = student.studentId || student.admissionNumber || `ADM-${1000 + idx}`;
                        return (
                          <div key={student.id || idx} className="bg-stone-50/50 border border-stone-200 rounded-xl p-4 flex items-center gap-3 hover:border-[#29456D]/40 transition-all">
                            <div className="w-10 h-10 bg-[#29456D]/10 text-[#172B4D] rounded-full flex items-center justify-center font-bold text-sm">
                              {sName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-extrabold text-stone-800 text-xs">{sName}</p>
                              <p className="text-[10px] text-stone-400 font-mono mt-0.5">Roll No: #{sRoll} &bull; {sId}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MARKS ENTRY TAB */}
        {activeTab === 'marks' && (
          <div className="space-y-6">
            {/* Top Config Card */}
            <div className="bg-white border border-[#e9ebec] shadow-sm rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200">
                <div>
                  <h3 className="text-lg font-black text-stone-850 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>Academic Examination Marks Entry</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Select the examination session, your allocated class, and subject to enter or modify student marks.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleTogglePublish}
                    disabled={publishingExam || !selectedExamId}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border shadow-sm ${
                      isExamPublished
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isExamPublished ? '✓ Published to Parents & Students' : '🔒 Unpublished (Draft Mode)'}</span>
                  </button>

                  <button
                    onClick={handleSaveMarks}
                    disabled={savingMarks || marksRoster.length === 0}
                    className="px-5 py-2.5 bg-[#172B4D] hover:bg-[#29456D] text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>{savingMarks ? 'Saving...' : 'Save & Sync Marks'}</span>
                  </button>
                </div>
              </div>

              {/* Selector Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    1. Examination Session
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 outline-none focus:border-[#29456D]"
                  >
                    {examList.length === 0 ? (
                      <option value="">No Examinations Found</option>
                    ) : (
                      examList.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.name} {e.isPublished ? '✓ (Published)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    2. Allocated Class & Section
                  </label>
                  <select
                    value={selectedMarksClass}
                    onChange={(e) => setSelectedMarksClass(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 outline-none focus:border-[#29456D]"
                  >
                    {uniqueClasses.length === 0 ? (
                      <option value="">No Classes Allocated</option>
                    ) : (
                      uniqueClasses.map(cls => (
                        <option key={cls._id} value={cls._id}>
                          Class {cls.standard} - Section {cls.section} ({cls.board})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    3. Teaching Subject
                  </label>
                  <select
                    value={selectedMarksSubject}
                    onChange={(e) => setSelectedMarksSubject(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 outline-none focus:border-[#29456D]"
                  >
                    {availableMarksSubjects.map(sub => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Marks Roster Table */}
            <div className="bg-white border border-[#e9ebec] shadow-sm rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-stone-50/50">
                <div>
                  <h4 className="text-sm font-black text-stone-850">
                    Student Marks Roster &bull; {selectedMarksSubject}
                  </h4>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Enrolled students in Class {marksClassObj?.standard || ''}-{marksClassObj?.section || ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold bg-white border border-stone-200 px-3 py-1 rounded-full text-stone-600">
                    Total Students: {marksRoster.length}
                  </span>
                  <button
                    onClick={loadMarksRoster}
                    className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100"
                    title="Reload Roster"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {loadingMarks ? (
                <div className="p-12 text-center"><Spinner size="lg" className="mx-auto" /></div>
              ) : marksRoster.length === 0 ? (
                <div className="p-12 text-center text-stone-400 italic text-xs">
                  No students found enrolled in this class section. Please register students in Academic Management.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs divide-y divide-stone-200">
                    <thead className="bg-stone-50 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4 w-28">Roll No</th>
                        <th className="py-3 px-4 min-w-[160px]">Student Name</th>
                        <th className="py-3 px-4 w-24 text-center">Max Marks</th>
                        <th className="py-3 px-4 w-36 text-center">Marks Obtained</th>
                        <th className="py-3 px-4 w-28 text-center">Absent?</th>
                        <th className="py-3 px-4 w-24 text-center">Grade</th>
                        <th className="py-3 px-4 w-24 text-center">Result</th>
                        <th className="py-3 px-4 min-w-[200px]">Teacher Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {marksRoster.map((item, idx) => {
                        const gradeInfo = calculateGradeBadge(item.marksObtained, item.isAbsent);
                        return (
                          <tr key={item.studentId} className="hover:bg-blue-50/20 transition-all">
                            <td className="py-3.5 px-4 text-center font-mono text-stone-400">{idx + 1}</td>
                            <td className="py-3.5 px-4 font-mono font-bold text-stone-700">#{item.rollNumber}</td>
                            <td className="py-3.5 px-4 font-extrabold text-stone-900">{item.studentName}</td>
                            <td className="py-3.5 px-4 text-center font-mono text-stone-500 font-bold">100</td>
                            <td className="py-3.5 px-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                disabled={item.isAbsent}
                                placeholder="0 - 100"
                                value={item.marksObtained}
                                onChange={(e) => handleMarkChange(item.studentId, 'marksObtained', e.target.value)}
                                className={`w-24 text-center py-1.5 px-2 border rounded-lg font-black text-xs outline-none transition-all ${
                                  item.isAbsent
                                    ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                                    : 'bg-stone-50 border-stone-300 focus:border-[#29456D] text-stone-850'
                                }`}
                              />
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!item.isAbsent}
                                  onChange={(e) => handleMarkChange(item.studentId, 'isAbsent', e.target.checked)}
                                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                                />
                                <span className={`text-[11px] font-bold ${item.isAbsent ? 'text-amber-700' : 'text-stone-400'}`}>
                                  {item.isAbsent ? 'ABSENT' : 'Present'}
                                </span>
                              </label>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black border ${gradeInfo.bg}`}>
                                {gradeInfo.grade}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                gradeInfo.status === 'PASS'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : gradeInfo.status === 'ABSENT'
                                    ? 'bg-amber-50 text-amber-700'
                                    : gradeInfo.status === 'FAIL'
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'bg-stone-50 text-stone-400'
                              }`}>
                                {gradeInfo.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <input
                                type="text"
                                placeholder="Add remark..."
                                value={item.remarks}
                                onChange={(e) => handleMarkChange(item.studentId, 'remarks', e.target.value)}
                                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-700 outline-none focus:border-[#29456D]"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Roster Footer Action */}
              <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 text-xs font-bold text-stone-600">
                  <span>Present: {marksRoster.filter(s => !s.isAbsent && s.marksObtained !== '').length}</span>
                  <span>Absent: {marksRoster.filter(s => s.isAbsent).length}</span>
                  <span>Pending: {marksRoster.filter(s => !s.isAbsent && s.marksObtained === '').length}</span>
                </div>
                <button
                  onClick={handleSaveMarks}
                  disabled={savingMarks || marksRoster.length === 0}
                  className="px-6 py-2.5 bg-[#172B4D] hover:bg-[#29456D] text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>{savingMarks ? 'Saving...' : 'Save & Sync Marks'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HOMEWORK TAB */}
        {activeTab === 'homework' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#e9ebec] shadow-sm rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-stone-850 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <span>Homework & Tasks Management</span>
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Assign homework to your allocated classes, track student submissions, and grade completed tasks.
                </p>
              </div>

              <button
                onClick={() => {
                  setNewHwForm({
                    title: '',
                    description: '',
                    standard: uniqueClasses[0]?.standard || '8th',
                    section: uniqueClasses[0]?.section || 'A',
                    subject: availableMarksSubjects[0] || 'Mathematics',
                    dueDate: 'Tomorrow (09:00 AM)'
                  });
                  setShowAddHwModal(true);
                }}
                className="px-4 py-2.5 bg-[#172B4D] hover:bg-[#29456D] text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Assign New Homework</span>
              </button>
            </div>

            {/* Homework List */}
            {loadingHomework ? (
              <div className="text-center py-12"><Spinner size="lg" className="mx-auto" /></div>
            ) : homeworkList.length === 0 ? (
              <div className="bg-white border border-[#e9ebec] shadow-sm rounded-2xl p-12 text-center text-stone-400 italic text-xs">
                No homework assignments created yet. Click "Assign New Homework" to create one for your class.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {homeworkList.map((hw) => (
                  <div key={hw.id} className="bg-white border border-[#e9ebec] shadow-sm rounded-2xl p-6 space-y-4 hover:border-blue-300 transition-all">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                            Class {hw.standard}-{hw.section}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                            {hw.subject}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-stone-850 mt-2">{hw.title}</h4>
                      </div>

                      <button
                        onClick={() => handleDeleteHomework(hw.id)}
                        className="text-stone-400 hover:text-rose-600 p-1 rounded transition-all"
                        title="Delete Homework"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                      {hw.description || 'No detailed instructions provided.'}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-100">
                      <div className="flex items-center gap-1.5 text-stone-500 font-medium text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>Due: {hw.dueDate}</span>
                      </div>

                      <button
                        onClick={() => setSelectedHwForSubmissions(hw)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Submissions ({hw.totalSubmissions || 0})</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NOTICES & CIRCULARS TAB */}
        {activeTab === 'notices' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#e9ebec] shadow-sm rounded-2xl p-6">
              <h3 className="text-lg font-black text-stone-850 flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-500" />
                <span>Administrative Notices & Circulars</span>
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Official notices, timetabling changes, and circulars issued by School Administration for academic faculty.
              </p>
            </div>

            {loadingNotices ? (
              <div className="text-center py-12"><Spinner size="lg" className="mx-auto" /></div>
            ) : noticesList.length === 0 ? (
              <div className="bg-white border border-[#e9ebec] shadow-sm rounded-2xl p-12 text-center text-stone-400 italic text-xs">
                No active notices or circulars issued for your department.
              </div>
            ) : (
              <div className="space-y-3">
                {noticesList.map((notif) => (
                  <div
                    key={notif.id}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                      notif.isRead ? 'border-[#e9ebec] opacity-90' : 'border-blue-400 bg-blue-50/10'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          notif.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                          {notif.priority || 'CIRCULAR'}
                        </span>
                        <span className="text-[11px] font-bold text-stone-400">
                          {new Date(notif.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[11px] font-mono text-stone-500">&bull; From: {notif.senderName || 'School Administration'}</span>
                      </div>
                      <h4 className="text-sm font-black text-stone-850">{notif.title}</h4>
                      <p className="text-xs text-stone-600 leading-relaxed">{notif.message}</p>
                    </div>

                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkNotice(notif.id)}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition-all shrink-0"
                      >
                        ✓ Mark as Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-8">
            {/* Monthly Calendar Grid View */}
            <div className="bg-white border border-[#e9ebec] shadow-sm rounded p-6">
              <h3 className="text-base font-bold text-stone-850 mb-4 flex items-center gap-2">👤 Monthly Attendance Grid</h3>
              
              <div className="flex flex-wrap gap-3 mb-6">
                <select value={reportMonth} onChange={e => setReportMonth(+e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-805 font-bold">
                  {MONTH_NAMES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
                <select value={reportYear} onChange={e => setReportYear(+e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-855 font-bold">
                  {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={() => fetchDetails(profileData?.employeeId)} className="px-4 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white rounded-lg text-sm font-bold transition-all">Load Report</button>
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
                    const myEmps = allEmps.filter(emp => emp.employee_id === profileData?.employeeId || emp.name === profileData?.name);

                    if (myEmps.length === 0) {
                      return <p className="text-center text-gray-400 py-8 italic bg-gray-50 border border-gray-205 rounded-2xl">Your employee record was not found in the monthly data.</p>;
                    }

                    const dateRows = myEmps[0]?.daily || [];

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
                            {myEmps.map((emp, i) => (
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
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-800 text-white font-black text-[10px] shadow-sm ring-1 ring-green-900">P</span>
                                      ) : (
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50 text-red-500 font-black text-[10px] shadow-sm ring-1 ring-red-500/10">A</span>
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

            {/* Raw Punch Logs */}
            <div className="bg-white border border-[#e9ebec] shadow-sm rounded p-6">
              <h3 className="text-base font-bold text-stone-850 mb-4 flex items-center gap-2">
                <span>📋</span> Biometric Attendance Punch Logs
              </h3>
              {attendance.length === 0 ? (
                <p className="text-stone-400 italic text-sm text-center py-12">No attendance logs found for you in the system.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Punch In</th>
                        <th className="py-3 px-4">Punch Out</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 bg-white">
                      {attendance.map((log, idx) => (
                        <tr key={idx} className="hover:bg-stone-50 text-stone-750 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-stone-800">{log.date}</td>
                          <td className="py-3 px-4 font-mono">{log.punchIn ? new Date(log.punchIn).toLocaleTimeString() : 'N/A'}</td>
                          <td className="py-3 px-4 font-mono">{log.punchOut ? new Date(log.punchOut).toLocaleTimeString() : 'In Office'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] border ${
                              log.status === 'Present'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-red-50 text-red-800 border-red-200'
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

        {/* LEAVE APPLICATION TAB */}
        {activeTab === 'leaves' && profileData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Request Leave Form Card */}
            <div className="lg:col-span-1 bg-white border border-[#e9ebec] shadow-sm rounded p-6 h-fit space-y-6">
              <div>
                <span className="text-[10px] font-bold text-[#172B4D] uppercase tracking-widest block mb-1">
                  Leave Management
                </span>
                <h3 className="text-base font-black text-stone-850 flex items-center gap-2">
                  <span>✍️</span> Request New Leave
                </h3>
              </div>

              <form onSubmit={handleLeaveSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Leave Date</label>
                  <input
                    type="date"
                    required
                    value={leaveDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#29456D] text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Reason for Leave</label>
                  <textarea
                    rows="4"
                    required
                    value={leaveReason}
                    placeholder="Provide details about family emergency, medical leave, personal leave, etc."
                    onChange={(e) => setLeaveReason(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#29456D] text-stone-800 placeholder-stone-400 resize-none"
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

            {/* Leave History List Card */}
            <div className="lg:col-span-2 bg-white border border-[#e9ebec] shadow-sm rounded p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-black text-stone-850">Leave Applications History</h3>
                  <p className="text-stone-400 text-[11px] mt-0.5">Track your pending, approved, and rejected leave requests.</p>
                </div>
                <span className="text-xs text-stone-500 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                  Total: {myLeaves.length} Filed
                </span>
              </div>

              {myLeaves.length === 0 ? (
                <div className="text-center py-12 text-stone-400 italic text-xs">
                  No leaves filed yet. You can request a leave using the form on the left.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-400 font-extrabold uppercase tracking-wider">
                        <th className="py-3 px-4">Leave Date</th>
                        <th className="py-3 px-4">Reason</th>
                        <th className="py-3 px-4">Applied Date</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myLeaves.map((leave, idx) => (
                        <tr key={idx} className="border-b border-stone-150 hover:bg-stone-50 text-stone-750">
                          <td className="py-3 px-4 font-mono font-bold text-stone-800">{leave.leaveDate}</td>
                          <td className="py-3 px-4 italic text-stone-650 max-w-[200px] truncate" title={leave.reason}>
                            "{leave.reason}"
                          </td>
                          <td className="py-3 px-4 font-mono text-stone-400">
                            {leave.createdAt ? new Date(leave.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] border ${
                              leave.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : leave.status === 'Rejected'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-stone-50 text-stone-800 border-stone-200'
                            }`}>
                              {leave.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {leave.status === 'Approved' ? (
                              <button
                                onClick={() => handlePrintLeaveCopy(leave)}
                                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg text-[10px] font-bold text-stone-700 transition-all"
                              >
                                🖨️ Download Copy
                              </button>
                            ) : (
                              <span className="text-stone-300 text-[10px]">—</span>
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

        {/* FEEDBACK TAB */}
        {activeTab === 'feedback' && (
          <div className="space-y-6">
            {loadingFeedback ? (
              <div className="flex items-center justify-center py-20">
                <Spinner size="lg" />
              </div>
            ) : !feedbackAnalytics ? (
              <div className="bg-white border border-[#e9ebec] rounded-2xl p-12 text-center shadow-sm">
                <p className="text-sm text-stone-400 italic">No feedback data available.</p>
              </div>
            ) : (
              <div className="space-y-6 max-w-5xl animate-fadeIn">
                {/* Metrics row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-[#e9ebec] shadow-sm rounded-2xl p-6 text-center space-y-2">
                    <span className="text-3xl">⭐</span>
                    <h4 className="text-xs font-bold text-stone-450 uppercase tracking-widest">Average Rating</h4>
                    <p className="text-4xl font-black text-stone-850">{feedbackAnalytics.averageRating || '0.0'}</p>
                  </div>

                  <div className="bg-white border border-[#e9ebec] shadow-sm rounded-2xl p-6 text-center space-y-2">
                    <span className="text-3xl">💬</span>
                    <h4 className="text-xs font-bold text-stone-450 uppercase tracking-widest">Total Reviews</h4>
                    <p className="text-4xl font-black text-stone-850">{feedbackAnalytics.totalReviews || 0}</p>
                  </div>

                  <div className="bg-white border border-[#e9ebec] shadow-sm rounded-2xl p-6 text-center space-y-2">
                    <span className="text-3xl">📈</span>
                    <h4 className="text-xs font-bold text-stone-450 uppercase tracking-widest">Satisfaction Rate</h4>
                    <p className="text-4xl font-black text-[#172B4D]">
                      {feedbackAnalytics.totalReviews > 0
                        ? `${Math.round((((feedbackAnalytics.distribution?.[5] || feedbackAnalytics.ratingDistribution?.[5] || 0) + (feedbackAnalytics.distribution?.[4] || feedbackAnalytics.ratingDistribution?.[4] || 0)) / feedbackAnalytics.totalReviews) * 100)}%`
                        : '0%'}
                    </p>
                  </div>
                </div>

                {/* Rating Distribution & Latest Suggestions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Distribution Card */}
                  <div className="bg-white border border-[#e9ebec] shadow-sm rounded-2xl p-6 space-y-4">
                    <h3 className="text-base font-black text-stone-850">Rating Distribution</h3>
                    <div className="space-y-3.5 pt-2">
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const count = feedbackAnalytics.distribution?.[stars] || feedbackAnalytics.ratingDistribution?.[stars] || 0;
                        const pct = feedbackAnalytics.totalReviews > 0 ? (count / feedbackAnalytics.totalReviews) * 100 : 0;
                        return (
                          <div key={stars} className="flex items-center gap-3 text-xs font-bold text-stone-700">
                            <span className="w-12 text-left">{stars} Stars</span>
                            <div className="flex-1 h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200/60 shadow-inner">
                              <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-10 text-right font-mono text-stone-450">{count} reviews</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Positive Feedback List */}
                  <div className="bg-white border border-[#e9ebec] shadow-sm rounded-2xl p-6 space-y-4">
                    <h3 className="text-base font-black text-stone-850">Positive Parent Comments</h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 nav-scroll">
                      {(feedbackAnalytics.positiveFeedback || []).length === 0 ? (
                        <p className="text-xs text-stone-400 italic py-4 text-center">No positive comments submitted yet.</p>
                      ) : (
                        (feedbackAnalytics.positiveFeedback || []).map((item, idx) => (
                          <div key={idx} className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-4 text-xs space-y-1.5 shadow-sm">
                            <div className="flex justify-between items-center font-bold text-stone-750">
                              <span>👤 {item.studentName}</span>
                              <span className="text-amber-500 font-mono text-[10px]">{"★".repeat(item.rating || 5)}</span>
                            </div>
                            <p className="text-stone-655 leading-relaxed font-semibold italic">"{item.text || item.comment || ''}"</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Suggestions for Improvement & Recent Reviews */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Suggestions List */}
                  <div className="bg-white border border-[#e9ebec] shadow-sm rounded-2xl p-6 space-y-4">
                    <h3 className="text-base font-black text-stone-850">Constructive Suggestions</h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 nav-scroll">
                      {(feedbackAnalytics.suggestionsForImprovement || []).length === 0 ? (
                        <p className="text-xs text-stone-400 italic py-4 text-center">No constructive suggestions submitted yet.</p>
                      ) : (
                        (feedbackAnalytics.suggestionsForImprovement || []).map((item, idx) => (
                          <div key={idx} className="bg-amber-50/20 border border-amber-100 rounded-xl p-4 text-xs space-y-1.5 shadow-sm">
                            <div className="flex justify-between items-center font-bold text-stone-750">
                              <span>👤 {item.studentName}</span>
                              <span className="text-amber-500 font-mono text-[10px]">{"★".repeat(item.rating || 3)}</span>
                            </div>
                            <p className="text-stone-655 leading-relaxed font-semibold italic">"{item.text || item.comment || ''}"</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Recent Reviews Table */}
                  <div className="bg-white border border-[#e9ebec] shadow-sm rounded-2xl p-6 space-y-4">
                    <h3 className="text-base font-black text-stone-850">Recent Parent Reviews</h3>
                    <div className="overflow-x-auto border border-stone-200 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-extrabold uppercase tracking-wider">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Student</th>
                            <th className="py-2.5 px-3 text-center">Rating</th>
                            <th className="py-2.5 px-3">Comment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(feedbackAnalytics.recentReviews || []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-stone-400 italic text-xs">No reviews submitted yet.</td>
                            </tr>
                          ) : (
                            (feedbackAnalytics.recentReviews || []).map((item, idx) => (
                              <tr key={idx} className="border-b border-stone-150 text-stone-700 text-xs hover:bg-stone-50/30">
                                <td className="py-2.5 px-3 font-mono font-bold text-stone-500">
                                  {item.date ? new Date(item.date).toLocaleDateString() : ''}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-stone-850">{item.studentName}</td>
                                <td className="py-2.5 px-3 text-center font-bold text-amber-500">
                                  {"★".repeat(item.rating || 5)}
                                </td>
                                <td className="py-2.5 px-3 truncate max-w-[180px] font-medium italic" title={item.comment || item.suggestion || ''}>
                                  {item.comment || item.suggestion || '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* EDIT PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-base font-bold text-stone-850">Edit Profile Info</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-stone-400 hover:text-stone-600 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleProfileSave}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#29456D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#29456D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#29456D]"
                  />
                </div>
              </div>
              <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-end gap-2">
                <button type="button" onClick={() => setShowProfileModal(false)} className="px-4 py-2 border border-stone-200 text-stone-500 rounded-xl text-xs font-bold hover:bg-stone-100">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white font-black text-xs rounded-xl shadow-md">Save Details</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD/EDIT QUALIFICATION MODAL */}
      {showQualModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-base font-bold text-stone-850">{modalMode === 'add' ? 'Add Qualification' : 'Edit Qualification'}</h3>
              <button onClick={() => setShowQualModal(false)} className="text-stone-400 hover:text-stone-600 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleQualSave}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Degree / Certification</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B.Ed, M.Sc Mathematics"
                    value={qualForm.degree}
                    onChange={(e) => setQualForm({ ...qualForm, degree: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#29456D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">University / Institute</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. University of Delhi"
                    value={qualForm.institution}
                    onChange={(e) => setQualForm({ ...qualForm, institution: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#29456D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Year of Passing</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2018"
                    value={qualForm.year}
                    onChange={(e) => setQualForm({ ...qualForm, year: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#29456D]"
                  />
                </div>
              </div>
              <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-end gap-2">
                <button type="button" onClick={() => setShowQualModal(false)} className="px-4 py-2 border border-stone-200 text-stone-500 rounded-xl text-xs font-bold hover:bg-stone-100">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white font-black text-xs rounded-xl shadow-md">{modalMode === 'add' ? 'Add' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD/EDIT EXPERIENCE MODAL */}
      {showExpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-base font-bold text-stone-850">{modalMode === 'add' ? 'Add Experience Record' : 'Edit Experience Record'}</h3>
              <button onClick={() => setShowExpModal(false)} className="text-stone-400 hover:text-stone-600 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleExpSave}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Role / Designation</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Math Teacher"
                    value={expForm.role}
                    onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#29456D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">School / Institution</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DAV Public School"
                    value={expForm.institution}
                    onChange={(e) => setExpForm({ ...expForm, institution: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#29456D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Duration / Tenor</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 3 Years, 5 Years"
                    value={expForm.duration}
                    onChange={(e) => setExpForm({ ...expForm, duration: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#29456D]"
                  />
                </div>
              </div>
              <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-end gap-2">
                <button type="button" onClick={() => setShowExpModal(false)} className="px-4 py-2 border border-stone-200 text-stone-500 rounded-xl text-xs font-bold hover:bg-stone-100">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white font-black text-xs rounded-xl shadow-md">{modalMode === 'add' ? 'Add' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN HOMEWORK */}
      {showAddHwModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#172B4D] px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-sm font-black flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-300" />
                <span>Assign New Homework & Task</span>
              </h3>
              <button onClick={() => setShowAddHwModal(false)} className="text-white/60 hover:text-white text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleCreateHomework}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Homework Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quadratic Equations Exercise 4.2"
                    value={newHwForm.title}
                    onChange={(e) => setNewHwForm({ ...newHwForm, title: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-bold text-stone-800 outline-none focus:border-[#29456D]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Class Standard *</label>
                    <select
                      value={newHwForm.standard}
                      onChange={(e) => setNewHwForm({ ...newHwForm, standard: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-[#29456D]"
                    >
                      {uniqueClasses.map(cls => (
                        <option key={cls._id} value={cls.standard}>
                          Class {cls.standard}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Section *</label>
                    <select
                      value={newHwForm.section}
                      onChange={(e) => setNewHwForm({ ...newHwForm, section: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-[#29456D]"
                    >
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Subject *</label>
                    <select
                      value={newHwForm.subject}
                      onChange={(e) => setNewHwForm({ ...newHwForm, subject: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-[#29456D]"
                    >
                      {availableMarksSubjects.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Due Date *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tomorrow (09:00 AM)"
                      value={newHwForm.dueDate}
                      onChange={(e) => setNewHwForm({ ...newHwForm, dueDate: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-[#29456D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Detailed Instructions</label>
                  <textarea
                    rows={3}
                    placeholder="Provide step-by-step problem details, page numbers, or submission requirements..."
                    value={newHwForm.description}
                    onChange={(e) => setNewHwForm({ ...newHwForm, description: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-700 outline-none focus:border-[#29456D]"
                  />
                </div>
              </div>

              <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddHwModal(false)}
                  className="px-4 py-2 border border-stone-200 text-stone-500 rounded-xl text-xs font-bold hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#172B4D] hover:bg-[#29456D] text-white font-black text-xs rounded-xl shadow-md"
                >
                  Publish Homework to Students
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW HOMEWORK SUBMISSIONS */}
      {selectedHwForSubmissions && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="bg-[#172B4D] px-6 py-4 flex justify-between items-center text-white shrink-0">
              <div>
                <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider block">Student Submissions</span>
                <h3 className="text-sm font-black">{selectedHwForSubmissions.title} &bull; Class {selectedHwForSubmissions.standard}-{selectedHwForSubmissions.section}</h3>
              </div>
              <button onClick={() => setSelectedHwForSubmissions(null)} className="text-white/60 hover:text-white text-xl font-bold">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {!selectedHwForSubmissions.submissions || selectedHwForSubmissions.submissions.length === 0 ? (
                <div className="text-center py-12 text-stone-400 text-xs italic">
                  No students have submitted solutions for this homework yet.
                </div>
              ) : (
                selectedHwForSubmissions.submissions.map((sub) => (
                  <div key={sub.id} className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-stone-850 text-xs">{sub.studentName}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sub.status === 'REVIEWED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                      {sub.grade && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                          Grade: {sub.grade}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stone-700 bg-white p-3 rounded-lg border border-stone-200">
                      {sub.submissionText || 'Completed assignment as per instructions.'}
                    </p>

                    {sub.feedback && (
                      <p className="text-[11px] text-emerald-700 font-medium italic">
                        Teacher Feedback: {sub.feedback}
                      </p>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => setGradeModal({
                          show: true,
                          submissionId: sub.id,
                          studentName: sub.studentName,
                          grade: sub.grade || 'A+',
                          feedback: sub.feedback || ''
                        })}
                        className="px-3 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg text-xs font-bold text-stone-700"
                      >
                        ✏️ {sub.grade ? 'Update Grade' : 'Grade & Feedback'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-stone-50 px-6 py-3 border-t border-stone-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedHwForSubmissions(null)}
                className="px-4 py-1.5 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GRADE SUBMISSION */}
      {gradeModal.show && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#172B4D] px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-sm font-black">Grade Homework &bull; {gradeModal.studentName}</h3>
              <button onClick={() => setGradeModal({ show: false, submissionId: null, studentName: '', grade: 'A+', feedback: '' })} className="text-white/60 hover:text-white text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleGradeSubmission}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Award Grade *</label>
                  <select
                    value={gradeModal.grade}
                    onChange={(e) => setGradeModal({ ...gradeModal, grade: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-black text-stone-850 outline-none focus:border-[#29456D]"
                  >
                    <option value="A+ (98%)">A+ (Outstanding)</option>
                    <option value="A (90%)">A (Excellent)</option>
                    <option value="B+ (80%)">B+ (Very Good)</option>
                    <option value="B (70%)">B (Good)</option>
                    <option value="C (55%)">C (Satisfactory)</option>
                    <option value="D (40%)">D (Pass)</option>
                    <option value="Need Improvement">Needs Improvement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Teacher Feedback / Notes</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Excellent conceptual clarity and well-labeled diagrams..."
                    value={gradeModal.feedback}
                    onChange={(e) => setGradeModal({ ...gradeModal, feedback: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-700 outline-none focus:border-[#29456D]"
                  />
                </div>
              </div>

              <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGradeModal({ show: false, submissionId: null, studentName: '', grade: 'A+', feedback: '' })}
                  className="px-4 py-2 border border-stone-200 text-stone-500 rounded-xl text-xs font-bold hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#172B4D] hover:bg-[#29456D] text-white font-black text-xs rounded-xl shadow-md"
                >
                  Save Grade & Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>

  );
};

export default TeacherSectionPage;
