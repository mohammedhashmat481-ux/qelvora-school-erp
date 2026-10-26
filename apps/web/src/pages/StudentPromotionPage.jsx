import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/ui/Sidebar';
import {
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  UsersRound,
  History,
  Printer,
  Search,
  Filter,
  Check,
  X,
  Clock,
  Sparkles,
  ShieldAlert,
  FileText,
  UserCheck,
  ChevronRight,
  Eye,
  RefreshCw,
  Building,
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';
import {
  getPromotionSettings,
  getPromotionClassSummary,
  getStudentsForPromotion,
  previewPromotion,
  executePromotion,
  getPromotionHistory,
  getPromotionHistoryById,
  getStudentPromotionHistory,
  getAlumniRecords,
  updateAlumniRecord
} from '../services/promotionService';

const DEFAULT_STANDARDS = [
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

const StudentPromotionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Tab management: 'promote', 'alumni', 'history'
  const params = new URLSearchParams(location.search);
  const activeTabFromUrl = params.get('tab') || 'promote';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  useEffect(() => {
    const tabParam = params.get('tab');
    if (tabParam && ['promote', 'alumni', 'history'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  const setTab = (tabName) => {
    setActiveTab(tabName);
    navigate(`/student-promotion?tab=${tabName}`, { replace: true });
  };

  // Global Settings
  const [currentAcademicYear, setCurrentAcademicYear] = useState('2026-2027');
  const [nextAcademicYear, setNextAcademicYear] = useState('2027-2028');
  const [academicYears, setAcademicYears] = useState(['2025-2026', '2026-2027', '2027-2028', '2028-2029']);
  const [terminalStandard, setTerminalStandard] = useState('12th');

  // Filter States
  const [selectedStandard, setSelectedStandard] = useState('10th');
  const [selectedSection, setSelectedSection] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Batch Section Promotion Controls
  const [batchTargetStandard, setBatchTargetStandard] = useState('');
  const [batchTargetSection, setBatchTargetSection] = useState('A');
  const [batchAction, setBatchAction] = useState('promote');

  // Data States
  const [classSummaryList, setClassSummaryList] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentDestinations, setStudentDestinations] = useState({}); // studentId -> { targetStandard, targetSection, targetRollNumber, action }

  // Preview & Execution States
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [successReport, setSuccessReport] = useState(null);

  // History & Student Profile History States
  const [historyBatches, setHistoryBatches] = useState([]);
  const [viewingBatch, setViewingBatch] = useState(null);
  const [studentHistoryModal, setStudentHistoryModal] = useState(null);

  // Alumni States
  const [alumniRecords, setAlumniRecords] = useState([]);
  const [alumniSearch, setAlumniSearch] = useState('');
  const [alumniYearFilter, setAlumniYearFilter] = useState('');
  const [viewingAlumniStudent, setViewingAlumniStudent] = useState(null);

  // Load initial settings
  useEffect(() => {
    getPromotionSettings().then(res => {
      if (res?.data) {
        if (res.data.currentAcademicYear) setCurrentAcademicYear(res.data.currentAcademicYear);
        if (res.data.nextAcademicYear) setNextAcademicYear(res.data.nextAcademicYear);
        if (res.data.academicYears) setAcademicYears(res.data.academicYears);
        if (res.data.terminalStandard) setTerminalStandard(res.data.terminalStandard);
      }
    }).catch(() => {});
  }, []);

  // Load class summary cards
  const loadClassSummary = () => {
    getPromotionClassSummary({
      fromAcademicYear: currentAcademicYear,
      toAcademicYear: nextAcademicYear
    }).then(res => {
      if (res?.data?.classes) {
        setClassSummaryList(res.data.classes);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadClassSummary();
  }, [currentAcademicYear, nextAcademicYear]);

  // Load students for active standard and section
  const loadStudents = () => {
    setIsLoading(true);
    getStudentsForPromotion({
      academicYear: currentAcademicYear,
      nextAcademicYear,
      standard: selectedStandard,
      section: selectedSection === 'All' ? '' : selectedSection,
      status: statusFilter,
      search: searchQuery
    }).then(res => {
      if (res?.data) {
        setStudents(res.data);
        // Pre-fill destination defaults
        const defaults = {};
        res.data.forEach(s => {
          defaults[s.id] = {
            targetStandard: s.destinationClass === 'Alumni / Graduated' || s.destinationClass === 'Graduated' ? 'Graduated' : s.destinationClass,
            targetSection: s.destinationSection || s.section || 'A',
            targetRollNumber: s.destinationRollNumber || s.rollNumber || '',
            action: s.isTerminal ? 'graduate' : 'promote'
          };
        });
        setStudentDestinations(defaults);
        // Auto-select eligible students
        const eligibleIds = res.data
          .filter(s => s.promotionStatus.startsWith('Eligible'))
          .map(s => s.id);
        setSelectedStudentIds(eligibleIds);
      }
    }).catch(err => {
      toast.error(err.message);
    }).finally(() => {
      setIsLoading(false);
    });
  };

  useEffect(() => {
    if (activeTab === 'promote') {
      loadStudents();
    } else if (activeTab === 'alumni') {
      loadAlumni();
    } else if (activeTab === 'history') {
      loadHistory();
    }
  }, [selectedStandard, selectedSection, statusFilter, currentAcademicYear, nextAcademicYear, activeTab]);

  const loadAlumni = () => {
    setIsLoading(true);
    getAlumniRecords({
      search: alumniSearch,
      academicYearCompleted: alumniYearFilter
    }).then(res => {
      if (res?.data) setAlumniRecords(res.data);
    }).catch(() => {}).finally(() => setIsLoading(false));
  };

  const loadHistory = () => {
    setIsLoading(true);
    getPromotionHistory().then(res => {
      if (res?.data) setHistoryBatches(res.data);
    }).catch(() => {}).finally(() => setIsLoading(false));
  };

  // Helper calculations for current view
  const currentClassStats = useMemo(() => {
    const total = students.length;
    const eligible = students.filter(s => s.promotionStatus.startsWith('Eligible')).length;
    const promoted = students.filter(s => s.promotionStatus === 'Already Promoted').length;
    const graduated = students.filter(s => s.promotionStatus === 'Graduated').length;
    const review = students.filter(s => s.promotionStatus === 'Under Review').length;
    const pending = total - promoted - graduated;
    return { total, eligible, promoted, graduated, review, pending };
  }, [students]);

  // Handle student destination edits
  const handleDestinationChange = (studentId, field, value) => {
    setStudentDestinations(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: value
      }
    }));
  };

  // Toggle selection
  const handleToggleSelectStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(s => s.id));
    }
  };

  // Sync batch promotion targets when selected standard or section changes
  useEffect(() => {
    const idx = DEFAULT_STANDARDS.indexOf(selectedStandard);
    const nextStd = idx === -1 || idx === DEFAULT_STANDARDS.length - 1 ? 'Graduated' : DEFAULT_STANDARDS[idx + 1];
    setBatchTargetStandard(nextStd);
    setBatchTargetSection(selectedSection === 'All' ? 'A' : selectedSection);
    setBatchAction(nextStd === 'Graduated' ? 'graduate' : 'promote');
  }, [selectedStandard, selectedSection]);

  // Batch apply destination to all selected students
  const handleApplyBatchPromotion = () => {
    if (selectedStudentIds.length === 0) {
      return toast.error('Please select at least one student to apply batch settings.');
    }
    setStudentDestinations(prev => {
      const next = { ...prev };
      selectedStudentIds.forEach(id => {
        next[id] = {
          ...(next[id] || {}),
          targetStandard: batchTargetStandard,
          targetSection: batchTargetSection,
          action: batchAction
        };
      });
      return next;
    });
    toast.success(`Set destination to Class ${batchTargetStandard} • Sec ${batchTargetSection} for ${selectedStudentIds.length} student(s)`);
  };

  // Promotion Preview Trigger
  const handleTriggerPreview = async () => {
    if (selectedStudentIds.length === 0) {
      return toast.error('Please select at least one student to promote or graduate.');
    }

    const payload = {
      fromAcademicYear: currentAcademicYear,
      toAcademicYear: nextAcademicYear,
      promotions: selectedStudentIds.map(id => {
        const dest = studentDestinations[id] || {};
        const s = students.find(x => x.id === id);
        const idx = DEFAULT_STANDARDS.indexOf(s?.standard);
        const defaultNext = idx === -1 || idx === DEFAULT_STANDARDS.length - 1 ? 'Graduated' : DEFAULT_STANDARDS[idx + 1];
        return {
          studentId: id,
          action: dest.action || (s?.isTerminal ? 'graduate' : 'promote'),
          targetStandard: dest.targetStandard || (s?.isTerminal ? 'Graduated' : defaultNext),
          targetSection: dest.targetSection || s?.section || 'A',
          targetRollNumber: dest.targetRollNumber || s?.rollNumber || '',
          remarks: dest.action === 'graduate' ? 'Class 12th Completion (Alumni)' : `Promoted to Class ${dest.targetStandard || defaultNext}-${dest.targetSection || s?.section || 'A'}`
        };
      })
    };

    try {
      setIsLoading(true);
      const res = await previewPromotion(payload);
      if (res?.data) {
        setPreviewData(res.data);
        setConfirmCheckbox(false);
        setIsPreviewOpen(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute Promotion Confirmation
  const handleConfirmExecute = async () => {
    if (!confirmCheckbox) {
      return toast.error('Please check the confirmation box before proceeding.');
    }

    const payload = {
      fromAcademicYear: previewData.fromAcademicYear,
      toAcademicYear: previewData.toAcademicYear,
      promotions: previewData.previewItems.map(p => ({
        studentId: p.studentId,
        action: p.action,
        targetStandard: p.targetStandard,
        targetSection: p.targetSection,
        targetRollNumber: p.targetRollNumber,
        remarks: p.remarks
      }))
    };

    try {
      setIsExecuting(true);
      const res = await executePromotion(payload);
      if (res.success) {
        toast.success(res.message);
        setIsPreviewOpen(false);
        setSuccessReport(res);
        loadStudents();
        loadClassSummary();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  // View Student Academic History
  const handleViewStudentHistory = async (studentId) => {
    try {
      const res = await getStudentPromotionHistory(studentId);
      if (res?.data) {
        setStudentHistoryModal(res.data);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePrintPromotionReport = () => {
    window.print();
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F7F9FC] font-sans text-[#334155] antialiased">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-[#172B4D] border-b border-[#29456D] text-white px-6 flex items-center justify-between shrink-0 shadow-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#29456D] text-[#F3F6FC] border border-[#29456D] flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>Student Promotion & Academic Year Management</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#DBEAFE] text-[#172B4D] border border-[#93C5FD]">
                  Annual Rollover
                </span>
              </h1>
              <p className="text-xs text-[#CBD5E1]">
                Bulk promote students across standards and safeguard graduating final-year cohorts into Alumni records.
              </p>
            </div>
          </div>

          {/* Academic Year Selector Pills */}
          <div className="flex items-center gap-2 bg-[#29456D] p-1 rounded-xl border border-[#29456D]">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-[#29456D] text-xs font-black text-[#172B4D] shadow-2xs">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Current:</span>
              <span>{currentAcademicYear}</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#DBEAFE] font-black" />
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#DBEAFE] rounded-lg border border-[#93C5FD] text-xs font-black text-[#172B4D] shadow-2xs">
              <span className="text-[10px] uppercase text-[#172B4D] font-bold">Next:</span>
              <span>{nextAcademicYear}</span>
            </div>
          </div>
        </header>

        {/* Tab Navigation Ribbon */}
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('promote')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'promote'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Promote Students</span>
            </button>

            <button
              onClick={() => setTab('alumni')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'alumni'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UsersRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Graduated Students / Alumni</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-black">
                12th Final
              </span>
            </button>

            <button
              onClick={() => setTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>Promotion History & Reports</span>
            </button>
          </div>

          {activeTab === 'promote' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadStudents}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                title="Refresh student list"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleTriggerPreview}
                disabled={selectedStudentIds.length === 0}
                className="px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-black rounded-xl shadow-xs disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Preview Promotion</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                  {selectedStudentIds.length}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ========================================================= */}
          {/* TAB 1: PROMOTE STUDENTS                                   */}
          {/* ========================================================= */}
          {activeTab === 'promote' && (
            <div className="space-y-6">
              {/* Important 12th Standard Terminal Class & 11th Banners */}
              {selectedStandard === '12th' ? (
                <div className="p-4 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-purple-400/30 shadow-md flex items-start gap-4">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 shrink-0 mt-0.5 border border-purple-400/30">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-purple-200 uppercase tracking-wider flex items-center gap-2">
                      <span>12th Standard Terminal Class — Alumni Archival Mode</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-400 text-purple-950 font-black">
                        Safe Graduation
                      </span>
                    </h3>
                    <p className="text-xs text-purple-100/90 mt-1 leading-relaxed">
                      12th Standard is the final class of the school. When graduating students from 12th Standard, existing 12th Standard students are <strong>safely moved to the Graduated Students / Alumni section</strong>. Their permanent student identity, fee history, and academic transcripts remain completely preserved in the database without overwriting or mixing with new students.
                    </p>
                  </div>
                </div>
              ) : selectedStandard === '11th' ? (
                <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>
                      <strong>Promoting 11th Standard:</strong> Students promoted from 11th will become the incoming 12th Standard cohort for {nextAcademicYear}. Ensure previous 12th students are graduated to Alumni first.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedStandard('12th');
                      setSelectedSection('All');
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Check 12th Cohort
                  </button>
                </div>
              ) : null}

              {/* Class Selection Grid Chips & Section-Wise Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Select Class Standard to Promote:
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Nursery through 12th Standard
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {DEFAULT_STANDARDS.map(std => {
                    const isSelected = selectedStandard === std;
                    const summary = classSummaryList.find(c => c.standard === std);
                    const count = summary?.totalStudents || 0;
                    const isTerminal = std === terminalStandard;

                    return (
                      <button
                        key={std}
                        type="button"
                        onClick={() => {
                          setSelectedStandard(std);
                          setSelectedSection('All');
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-2 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-102'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span>Class {std}</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {count}
                        </span>
                        {isTerminal && (
                          <span className="text-[9px] font-black uppercase text-amber-400">
                            ★ Final
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Section-Wise Selector Bar */}
                {(() => {
                  const currentClassSummary = classSummaryList.find(c => c.standard === selectedStandard);
                  const sections = currentClassSummary?.sectionsDetail?.length > 0
                    ? currentClassSummary.sectionsDetail
                    : (currentClassSummary?.sections || ['A']).map(s => ({ section: s, totalStudents: currentClassSummary?.totalStudents || 0, classTeacher: '' }));

                  return (
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider mr-1">
                        Sections in Class {selectedStandard}:
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedSection('All')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-2 ${
                          selectedSection === 'All'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>All Sections</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                          selectedSection === 'All' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {currentClassSummary?.totalStudents || 0}
                        </span>
                      </button>

                      {sections.map(secInfo => {
                        const isSecSelected = selectedSection === secInfo.section;
                        return (
                          <button
                            key={secInfo.section}
                            type="button"
                            onClick={() => setSelectedSection(secInfo.section)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-2 ${
                              isSecSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <span>Section {secInfo.section}</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                              isSecSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {secInfo.totalStudents}
                            </span>
                            {secInfo.classTeacher && (
                              <span className={`text-[10px] font-medium hidden sm:inline ${
                                isSecSelected ? 'text-indigo-200' : 'text-slate-400'
                              }`}>
                                • {secInfo.classTeacher}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Batch Section Promotion Quick Action Toolbar */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl text-white shadow-xs border border-indigo-900/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-indigo-200">
                      Batch Promote: Class {selectedStandard} {selectedSection !== 'All' ? `• Section ${selectedSection}` : '(All Sections)'}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      One-click promote section cohort to destination class & section
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-bold text-slate-300">Target Standard:</span>
                    <select
                      value={batchTargetStandard}
                      onChange={(e) => setBatchTargetStandard(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer"
                    >
                      {DEFAULT_STANDARDS.map(s => (
                        <option key={s} value={s}>Class {s}</option>
                      ))}
                      <option value="Graduated">Graduated / Alumni</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-bold text-slate-300">Target Section:</span>
                    <select
                      value={batchTargetSection}
                      onChange={(e) => setBatchTargetSection(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer"
                    >
                      {['A', 'B', 'C', 'D'].map(sec => (
                        <option key={sec} value={sec}>Section {sec}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-bold text-slate-300">Action:</span>
                    <select
                      value={batchAction}
                      onChange={(e) => setBatchAction(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer"
                    >
                      <option value="promote">Promote to Next</option>
                      <option value="repeat">Repeat Class (Detain)</option>
                      <option value="graduate">Graduate (Alumni)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyBatchPromotion}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
                  >
                    Apply to Selected ({selectedStudentIds.length})
                  </button>
                </div>
              </div>

              {/* Class KPI Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-black text-slate-400 uppercase">Enrolled Students</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{currentClassStats.total}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Class {selectedStandard} {selectedSection !== 'All' ? `(${selectedSection})` : ''} ({currentAcademicYear})</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-black text-emerald-600 uppercase">Eligible to Advance</div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">{currentClassStats.eligible}</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Ready for next standard</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-black text-blue-600 uppercase">Already Processed</div>
                  <div className="text-2xl font-black text-blue-700 mt-1">{currentClassStats.promoted + currentClassStats.graduated}</div>
                  <div className="text-[10px] text-blue-600 mt-0.5">Recorded for {nextAcademicYear}</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-black text-amber-600 uppercase">Pending Promotion</div>
                  <div className="text-2xl font-black text-amber-700 mt-1">{currentClassStats.pending}</div>
                  <div className="text-[10px] text-amber-600 mt-0.5">Awaiting admin review</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-black text-indigo-600 uppercase">Target Destination</div>
                  <div className="text-lg font-black text-indigo-900 mt-1 truncate">
                    {selectedStandard === '12th' ? 'Graduated / Alumni' : `Class ${DEFAULT_STANDARDS[DEFAULT_STANDARDS.indexOf(selectedStandard) + 1] || 'Graduate'}`}
                  </div>
                  <div className="text-[10px] text-indigo-600 mt-0.5">For {nextAcademicYear}</div>
                </div>
              </div>

              {/* Filters & Actions Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Section Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500">Section:</span>
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-black cursor-pointer"
                    >
                      <option value="All">All Sections</option>
                      {['A', 'B', 'C', 'D'].map(sec => (
                        <option key={sec} value={sec}>Section {sec}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-black cursor-pointer"
                    >
                      <option value="all">All Students</option>
                      <option value="eligible">Eligible Only</option>
                      <option value="promoted">Already Promoted</option>
                      <option value="graduated">Graduated Only</option>
                    </select>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search student or roll no..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs w-48 sm:w-60 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Selection Counter & Select All */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    {selectedStudentIds.length === students.length ? 'Deselect All' : 'Select All Eligible'}
                  </button>
                  <span className="text-xs font-black text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200">
                    {selectedStudentIds.length} of {students.length} Selected
                  </span>
                </div>
              </div>

              {/* Student Promotion Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-black border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={students.length > 0 && selectedStudentIds.length === students.length}
                            onChange={handleSelectAll}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-3">Student / Admission No</th>
                        <th className="py-3 px-3">Current Class</th>
                        <th className="py-3 px-3">Roll No</th>
                        <th className="py-3 px-3">Promotion Status</th>
                        <th className="py-3 px-3">Destination Class</th>
                        <th className="py-3 px-3">Destination Section</th>
                        <th className="py-3 px-3">Action Type</th>
                        <th className="py-3 px-3 text-center">History</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        <tr>
                          <td colSpan="9" className="py-8 text-center text-slate-400">
                            Loading students for promotion...
                          </td>
                        </tr>
                      ) : students.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="py-8 text-center text-slate-400 font-semibold">
                            No students found for Class {selectedStandard} ({selectedSection}).
                          </td>
                        </tr>
                      ) : (
                        students.map(student => {
                          const isSelected = selectedStudentIds.includes(student.id);
                          const dest = studentDestinations[student.id] || {};
                          const isTerminal = student.isTerminal;

                          return (
                            <tr
                              key={student.id}
                              className={`transition-colors ${
                                isSelected ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-3 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectStudent(student.id)}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>

                              <td className="py-3 px-3">
                                <div className="font-extrabold text-slate-900">{student.name}</div>
                                <div className="text-[11px] font-mono text-slate-500">
                                  Adm: {student.studentId}
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-slate-100 text-slate-800">
                                  {student.standard}-{student.section}
                                </span>
                              </td>

                              <td className="py-3 px-3 font-mono font-bold text-slate-600">
                                {student.rollNumber || '-'}
                              </td>

                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    student.promotionStatus.startsWith('Eligible')
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : student.promotionStatus === 'Already Promoted'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : student.promotionStatus === 'Graduated'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  {student.promotionStatus}
                                </span>
                              </td>

                              <td className="py-3 px-3">
                                {isTerminal ? (
                                  <span className="font-extrabold text-purple-900 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200 text-[11px] flex items-center gap-1">
                                    <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                                    <span>Alumni (Completed 12th)</span>
                                  </span>
                                ) : (
                                  <select
                                    value={dest.targetStandard || ''}
                                    onChange={(e) => handleDestinationChange(student.id, 'targetStandard', e.target.value)}
                                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black cursor-pointer"
                                  >
                                    {DEFAULT_STANDARDS.map(s => (
                                      <option key={s} value={s}>Class {s}</option>
                                    ))}
                                    <option value="Graduated">Graduated / Alumni</option>
                                  </select>
                                )}
                              </td>

                              <td className="py-3 px-3">
                                {isTerminal ? (
                                  <span className="text-slate-400 font-semibold text-[11px]">N/A</span>
                                ) : (
                                  <select
                                    value={dest.targetSection || 'A'}
                                    onChange={(e) => handleDestinationChange(student.id, 'targetSection', e.target.value)}
                                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold cursor-pointer"
                                  >
                                    {['A', 'B', 'C', 'D'].map(sec => (
                                      <option key={sec} value={sec}>Sec {sec}</option>
                                    ))}
                                  </select>
                                )}
                              </td>

                              <td className="py-3 px-3">
                                <select
                                  value={dest.action || (isTerminal ? 'graduate' : 'promote')}
                                  onChange={(e) => handleDestinationChange(student.id, 'action', e.target.value)}
                                  className={`rounded-lg px-2 py-1 text-[11px] font-black cursor-pointer border ${
                                    dest.action === 'graduate'
                                      ? 'bg-purple-50 text-purple-900 border-purple-300'
                                      : dest.action === 'repeat'
                                      ? 'bg-rose-50 text-rose-900 border-rose-300'
                                      : 'bg-blue-50 text-blue-900 border-blue-300'
                                  }`}
                                >
                                  {isTerminal ? (
                                    <>
                                      <option value="graduate">Graduate to Alumni</option>
                                      <option value="repeat">Repeat 12th Class</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="promote">Promote to Next Class</option>
                                      <option value="repeat">Repeat Current Class (Detain)</option>
                                      <option value="graduate">Graduate to Alumni</option>
                                    </>
                                  )}
                                </select>
                              </td>

                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleViewStudentHistory(student.id)}
                                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-700 cursor-pointer transition-colors"
                                  title="View Multi-Year Enrollment History"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: GRADUATED STUDENTS / ALUMNI RECORDS                */}
          {/* ========================================================= */}
          {activeTab === 'alumni' && (
            <div className="space-y-6">
              {/* Alumni Header Strip */}
              <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-md flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center font-black text-xl border border-white/20">
                    <GraduationCap className="w-6 h-6 text-purple-300" />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight text-white">
                      Graduated Students & Alumni Directory
                    </h2>
                    <p className="text-xs text-purple-200/90 mt-0.5">
                      Permanent school repository of students who completed 12th Standard or graduated from the academy.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <div className="text-[10px] text-purple-300 uppercase font-black">Total Alumni</div>
                    <div className="text-2xl font-black">{alumniRecords.length}</div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handlePrintPromotionReport}
                      className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl border border-white/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Directory</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Alumni Filters */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search alumni by name or admission no..."
                      value={alumniSearch}
                      onChange={(e) => setAlumniSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs w-64 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500">Year Completed:</span>
                    <select
                      value={alumniYearFilter}
                      onChange={(e) => setAlumniYearFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-black cursor-pointer"
                    >
                      <option value="">All Completion Years</option>
                      {academicYears.map(yr => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={loadAlumni}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Alumni Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-black border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Admission No</th>
                        <th className="py-3 px-3">Student Name</th>
                        <th className="py-3 px-3">Last Studied Class</th>
                        <th className="py-3 px-3">Academic Year Completed</th>
                        <th className="py-3 px-3">Graduation Date</th>
                        <th className="py-3 px-3">TC Certificate No</th>
                        <th className="py-3 px-3">Guardian Contact</th>
                        <th className="py-3 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {alumniRecords.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-12 text-center text-slate-400">
                            <GraduationCap className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            <p className="font-semibold">No graduated alumni records found yet.</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              When 12th Standard students are graduated during annual promotion, they will automatically appear here.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        alumniRecords.map(alumni => (
                          <tr key={alumni.id || alumni.studentId} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-purple-900">
                              {alumni.admissionNumber}
                            </td>
                            <td className="py-3 px-3 font-extrabold text-slate-900">
                              {alumni.name}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-purple-100 text-purple-900">
                                Class {alumni.lastStudiedClass}-{alumni.lastStudiedSection}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-700">
                              {alumni.academicYearCompleted}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-500">
                              {alumni.graduationDate || '-'}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-600">
                              {alumni.certificateNumber || '-'}
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              <div>{alumni.contactDetails?.parentName || '-'}</div>
                              <div className="text-[11px] text-slate-400">{alumni.contactDetails?.parentPhone || ''}</div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleViewStudentHistory(alumni.studentId)}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs cursor-pointer"
                              >
                                View Record
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: PROMOTION HISTORY & AUDIT REPORTS                   */}
          {/* ========================================================= */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    Annual Student Promotion Audit Logs
                  </h2>
                  <p className="text-xs text-slate-500">
                    Full immutable audit ledger tracking annual promotion rollover batches, dates, and student movements.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePrintPromotionReport}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Promotion Ledger</span>
                </button>
              </div>

              {historyBatches.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
                  <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold">No promotion rollover operations recorded yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Execute a promotion batch from the "Promote Students" tab to generate official ledger records.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyBatches.map(batch => (
                    <div
                      key={batch.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all shadow-2xs space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 text-blue-800 rounded-xl font-mono text-xs font-black">
                            {batch.id}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                              <span>Rollover: {batch.fromAcademicYear} → {batch.toAcademicYear}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                Completed
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                              <span>Executed By: <strong>{batch.adminUser || 'Admin'}</strong></span>
                              <span>Date: <strong>{new Date(batch.timestamp).toLocaleString()}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <div className="text-[10px] uppercase text-slate-400 font-bold">Total Processed</div>
                            <div className="text-base font-black text-slate-900">{batch.summary?.totalProcessed || 0}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-emerald-600 font-bold">Promoted</div>
                            <div className="text-base font-black text-emerald-700">{batch.summary?.promotedCount || 0}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-purple-600 font-bold">Graduated</div>
                            <div className="text-base font-black text-purple-700">{batch.summary?.graduatedCount || 0}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewingBatch(viewingBatch?.id === batch.id ? null : batch)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                          >
                            {viewingBatch?.id === batch.id ? 'Hide Details' : 'View Students'}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Batch Students Table */}
                      {viewingBatch?.id === batch.id && batch.students && (
                        <div className="overflow-x-auto pt-2 animate-fadeIn">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 uppercase text-[9px] font-black border-y border-slate-200">
                              <tr>
                                <th className="py-2 px-2.5">Admission No</th>
                                <th className="py-2 px-2.5">Student Name</th>
                                <th className="py-2 px-2.5">From Class</th>
                                <th className="py-2 px-2.5">To Class</th>
                                <th className="py-2 px-2.5">Action Executed</th>
                                <th className="py-2 px-2.5 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {batch.students.map((st, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="py-2 px-2.5 font-mono font-bold text-slate-700">{st.admissionNumber}</td>
                                  <td className="py-2 px-2.5 font-extrabold text-slate-900">{st.name}</td>
                                  <td className="py-2 px-2.5 font-medium">{st.fromStandard}-{st.fromSection}</td>
                                  <td className="py-2 px-2.5 font-black text-blue-900">{st.toStandard}-{st.toSection}</td>
                                  <td className="py-2 px-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                      st.action === 'graduate' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {st.action.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2.5 text-center text-emerald-700 font-bold">✓ Success</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: PROMOTION PREVIEW & CONFIRMATION                   */}
      {/* ========================================================= */}
      {isPreviewOpen && previewData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Verify & Confirm Student Promotion Rollover
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review academic transition from <strong>{previewData.fromAcademicYear}</strong> to <strong>{previewData.toAcademicYear}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Notices if any */}
            {previewData.warnings && previewData.warnings.length > 0 && (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                {previewData.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Impact Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-black text-slate-500">Total Processed</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{previewData.totalSelected}</div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-[10px] uppercase font-black text-emerald-700">Advancing / Promoted</div>
                <div className="text-xl font-black text-emerald-800 mt-0.5">{previewData.toPromoteCount}</div>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                <div className="text-[10px] uppercase font-black text-purple-700">12th Final Alumni</div>
                <div className="text-xl font-black text-purple-800 mt-0.5">{previewData.toGraduateCount}</div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="text-[10px] uppercase font-black text-amber-700">Repeating / Review</div>
                <div className="text-xl font-black text-amber-800 mt-0.5">{previewData.toRepeatCount + previewData.reviewCount}</div>
              </div>
            </div>

            {/* Verification Table */}
            <div className="border border-slate-200 rounded-xl max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[9px] font-black sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Current Class</th>
                    <th className="py-2.5 px-3">Transition Action</th>
                    <th className="py-2.5 px-3">Target Standard</th>
                    <th className="py-2.5 px-3">Target Section</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.previewItems.map(item => (
                    <tr key={item.studentId} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-extrabold text-slate-900">
                        {item.name} <span className="font-mono text-slate-400 font-normal">({item.admissionNumber})</span>
                      </td>
                      <td className="py-2 px-3">{item.currentStandard}-{item.currentSection}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          item.action === 'graduate'
                            ? 'bg-purple-100 text-purple-800'
                            : item.action === 'repeat'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.action === 'graduate' ? 'Alumni Graduation' : item.action === 'repeat' ? 'Repeat Class' : 'Promotion'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-black text-blue-900">{item.targetStandard}</td>
                      <td className="py-2 px-3 font-bold">{item.targetSection}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Confirmation Checkbox */}
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 flex items-start gap-3">
              <input
                type="checkbox"
                id="promo-confirm"
                checked={confirmCheckbox}
                onChange={(e) => setConfirmCheckbox(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5"
              />
              <label htmlFor="promo-confirm" className="text-xs text-blue-950 font-bold cursor-pointer">
                I confirm that I have reviewed the student promotion list. The promoted students will advance to the next class for academic year {previewData.toAcademicYear}, and final-year 12th Standard students will be archived into the permanent Alumni records.
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!confirmCheckbox || isExecuting}
                onClick={handleConfirmExecute}
                className="px-6 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 disabled:opacity-40 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
              >
                {isExecuting ? 'Executing Promotion...' : 'Execute Promotion Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SUCCESS REPORT & SUMMARY                           */}
      {/* ========================================================= */}
      {successReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-base font-black text-slate-900">
              Promotion Rollover Completed!
            </h3>
            <p className="text-xs text-slate-600">
              {successReport.message}
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Processed</div>
                <div className="text-base font-black text-slate-800">{successReport.summary?.totalProcessed}</div>
              </div>
              <div>
                <div className="text-[10px] text-emerald-600 uppercase font-bold">Promoted</div>
                <div className="text-base font-black text-emerald-700">{successReport.summary?.promotedCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-purple-600 uppercase font-bold">Graduated</div>
                <div className="text-base font-black text-purple-700">{successReport.summary?.graduatedCount}</div>
              </div>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setSuccessReport(null)}
                className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Done
              </button>
              <button
                onClick={() => {
                  setSuccessReport(null);
                  setTab('history');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                View Audit Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: MULTI-YEAR STUDENT ACADEMIC HISTORY                */}
      {/* ========================================================= */}
      {studentHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black">
                  {studentHistoryModal.student?.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {studentHistoryModal.student?.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Admission ID: {studentHistoryModal.student?.studentId}
                  </p>
                </div>
              </div>
              <button onClick={() => setStudentHistoryModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Academic Year Enrollment Journey
            </h4>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {studentHistoryModal.enrollmentHistory?.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No historical rollover records logged yet.</p>
              ) : (
                studentHistoryModal.enrollmentHistory.map((item, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        Academic Year: {item.academicYear}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Class {item.standard}-{item.section} | Roll: {item.rollNumber || '-'}
                      </div>
                      {item.remarks && (
                        <div className="text-[10px] text-slate-400 italic mt-0.5">{item.remarks}</div>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      item.status === 'Graduated' ? 'bg-purple-100 text-purple-800' :
                      item.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setStudentHistoryModal(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPromotionPage;
