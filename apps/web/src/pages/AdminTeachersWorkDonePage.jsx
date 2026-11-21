import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '../components/ui/Sidebar';
import {
  getAdminWorkOverview,
  getAdminWorkReports,
  getTeacherHistoricalWork
} from '../services/teacherWorkService';
import toast from 'react-hot-toast';
import {
  BookOpenCheck,
  Calendar,
  Clock,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  School,
  FileSpreadsheet,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  History,
  TrendingUp,
  Layers,
  GraduationCap
} from 'lucide-react';

const getTodayStr = () => new Date().toISOString().split('T')[0];

export default function AdminTeachersWorkDonePage() {
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'tracking' | 'teacher_history'

  // Selected date for overview & default filtering
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  // Overview stats state
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Reports table state
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsLimit, setReportsLimit] = useState(25);

  // Filter states
  const [dateMode, setDateMode] = useState('single'); // 'single' | 'range'
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [filterTeacher, setFilterTeacher] = useState('All');
  const [filterClass, setFilterClass] = useState('All');
  const [filterSection, setFilterSection] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected report for View Modal
  const [selectedReport, setSelectedReport] = useState(null);

  // Teacher-Wise History Tab state
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherHistory, setTeacherHistory] = useState(null);
  const [teacherHistoryLoading, setTeacherHistoryLoading] = useState(false);

  // Fetch Overview Summary
  const fetchOverview = useCallback(async (date) => {
    setOverviewLoading(true);
    try {
      const res = await getAdminWorkOverview(date);
      if (res?.status) {
        setOverview(res);
      }
    } catch (err) {
      console.error('Error fetching admin overview:', err);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  // Fetch Reports Table
  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const params = {
        page: reportsPage,
        limit: reportsLimit,
        teacherId: filterTeacher !== 'All' ? filterTeacher : undefined,
        standard: filterClass !== 'All' ? filterClass : undefined,
        section: filterSection !== 'All' ? filterSection : undefined,
        subject: filterSubject !== 'All' ? filterSubject : undefined,
        search: searchQuery.trim() || undefined
      };

      if (dateMode === 'single') {
        params.date = selectedDate;
      } else {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const res = await getAdminWorkReports(params);
      if (res?.status) {
        setReports(res.data || []);
        setReportsTotal(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching admin reports:', err);
      toast.error('Failed to load teacher work reports');
    } finally {
      setReportsLoading(false);
    }
  }, [reportsPage, reportsLimit, selectedDate, dateMode, startDate, endDate, filterTeacher, filterClass, filterSection, filterSubject, searchQuery]);

  // Initial load and on date change
  useEffect(() => {
    fetchOverview(selectedDate);
  }, [fetchOverview, selectedDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Fetch specific teacher's history
  const fetchTeacherSpecificHistory = useCallback(async (teacherId) => {
    if (!teacherId) return;
    setTeacherHistoryLoading(true);
    try {
      const res = await getTeacherHistoricalWork(teacherId);
      if (res?.status) {
        setTeacherHistory(res);
      }
    } catch (err) {
      console.error('Error fetching teacher history:', err);
    } finally {
      setTeacherHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'teacher_history' && selectedTeacherId) {
      fetchTeacherSpecificHistory(selectedTeacherId);
    }
  }, [activeTab, selectedTeacherId, fetchTeacherSpecificHistory]);

  // Date controls
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
    setReportsPage(1);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
    setReportsPage(1);
  };

  // Distinct classes and subjects from tracking list / reports
  const teacherList = useMemo(() => {
    return overview?.trackingList || [];
  }, [overview]);

  const uniqueClasses = useMemo(() => {
    const set = new Set();
    reports.forEach(r => { if (r.standard) set.add(r.standard); });
    return Array.from(set).sort();
  }, [reports]);

  const uniqueSubjects = useMemo(() => {
    const set = new Set();
    reports.forEach(r => { if (r.subject) set.add(r.subject); });
    return Array.from(set).sort();
  }, [reports]);

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row bg-[var(--bg)] text-[#1F2937] font-sans lg:overflow-hidden">
      <Sidebar />

      <div className="flex-1 min-w-0 min-h-0 lg:h-screen lg:overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-8 pb-28 lg:pb-12">
        
        {/* Top Header Card */}
        <div className="mb-6 bg-white border border-[#E4E2DA] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center border border-[var(--accent)]/30 shrink-0 shadow-xs">
              <BookOpenCheck className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1F2937] tracking-tight">
                Teachers Work Done
              </h1>
              <p className="text-xs text-[#5B6676] font-medium mt-0.5">
                Central monitoring of daily academic teaching activities, topics covered, and curriculum progression
              </p>
            </div>
          </div>

          {/* Date Selector & Prev/Next Controls */}
          <div className="flex items-center gap-2 bg-[var(--surface-2)] p-1.5 rounded-xl border border-[#E4E2DA] w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg bg-white border border-[#E4E2DA] text-[#475569] hover:bg-[#F3F1EA] cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setReportsPage(1);
              }}
              className="bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1 text-xs font-bold text-[#1F2937] focus:outline-hidden"
            />

            <button
              type="button"
              onClick={handleNextDay}
              className="p-1.5 rounded-lg bg-white border border-[#E4E2DA] text-[#475569] hover:bg-[#F3F1EA] cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedDate(getTodayStr());
                setReportsPage(1);
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-[#E4E2DA] text-[#475569] hover:bg-[#F3F1EA] cursor-pointer"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => {
                fetchOverview(selectedDate);
                fetchReports();
              }}
              className="p-1.5 rounded-lg bg-white border border-[#E4E2DA] text-[#475569] hover:bg-[#F3F1EA] cursor-pointer ml-1"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${overviewLoading || reportsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* SECTION 1: DASHBOARD SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
          {/* Card 1: Total Teachers */}
          <div className="bg-white border border-[#E4E2DA] rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Total Teachers
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#1F2937]">
              {overview?.summary?.totalTeachers ?? '—'}
            </div>
            <span className="text-[10px] text-[#64748B] font-semibold mt-1 block">
              Registered academic faculty
            </span>
          </div>

          {/* Card 2: Submitted Today */}
          <div className="bg-white border border-[#E4E2DA] rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Submitted Today
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600">
              {overview?.summary?.submittedToday ?? '—'}
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
              Completed daily lesson report
            </span>
          </div>

          {/* Card 3: Yet to Submit */}
          <div className="bg-white border border-[#E4E2DA] rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Yet to Submit
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600">
              {overview?.isSunday ? '0 (Off)' : (overview?.summary?.yetToSubmit ?? '—')}
            </div>
            <span className="text-[10px] text-rose-700 font-semibold mt-1 block">
              {overview?.isSunday ? 'Sunday / Campus Holiday' : 'Pending submissions'}
            </span>
          </div>

          {/* Card 4: Total Work Entries Today */}
          <div className="bg-white border border-[#E4E2DA] rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Work Entries Today
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-700">
              {overview?.summary?.totalEntriesToday ?? '—'}
            </div>
            <span className="text-[10px] text-purple-700 font-semibold mt-1 block">
              Periods / sessions taught
            </span>
          </div>

          {/* Card 5: Classes Covered Today */}
          <div className="bg-white border border-[#E4E2DA] rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Classes Covered
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                <School className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-700">
              {overview?.summary?.totalClassesCovered ?? '—'}
            </div>
            <span className="text-[10px] text-amber-800 font-semibold mt-1 block">
              Unique sections with lessons
            </span>
          </div>
        </div>

        {/* SECTION 2: TABS NAVIGATION */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                : 'bg-white text-[#334155] border-[#E4E2DA] hover:bg-[#F3F1EA] hover:text-[#0F172A]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Teachers Work Done Table ({reportsTotal})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tracking')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer flex items-center gap-2 ${
              activeTab === 'tracking'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                : 'bg-white text-[#334155] border-[#E4E2DA] hover:bg-[#F3F1EA] hover:text-[#0F172A]'
            }`}
          >
            <Users className="w-4 h-4" />
            Submission Tracking Roster
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('teacher_history');
              if (!selectedTeacherId && teacherList.length > 0) {
                setSelectedTeacherId(teacherList[0].id);
              }
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer flex items-center gap-2 ${
              activeTab === 'teacher_history'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                : 'bg-white text-[#334155] border-[#E4E2DA] hover:bg-[#F3F1EA] hover:text-[#0F172A]'
            }`}
          >
            <History className="w-4 h-4" />
            Teacher-Wise History & Curriculum
          </button>
        </div>

        {/* TAB 1: TEACHERS WORK DONE TABLE */}
        {activeTab === 'reports' && (
          <div className="bg-white border border-[#E4E2DA] rounded-2xl p-4 sm:p-6 shadow-xs">
            {/* Filters Bar */}
            <div className="pb-4 mb-4 border-b border-[#E4E2DA] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#475569]">Date Mode:</span>
                  <button
                    type="button"
                    onClick={() => setDateMode('single')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                      dateMode === 'single'
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-white text-[#475569] border-[#E4E2DA]'
                    }`}
                  >
                    Selected Day ({selectedDate})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateMode('range')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                      dateMode === 'range'
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-white text-[#475569] border-[#E4E2DA]'
                    }`}
                  >
                    Date Range
                  </button>
                </div>

                {dateMode === 'range' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => { setStartDate(e.target.value); setReportsPage(1); }}
                      className="bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#1F2937]"
                    />
                    <span className="text-xs text-[#64748B]">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => { setEndDate(e.target.value); setReportsPage(1); }}
                      className="bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#1F2937]"
                    />
                  </div>
                )}
              </div>

              {/* Multi-dropdown filter row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {/* Teacher dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">Teacher</label>
                  <select
                    value={filterTeacher}
                    onChange={(e) => { setFilterTeacher(e.target.value); setReportsPage(1); }}
                    className="w-full bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1F2937]"
                  >
                    <option value="All">All Teachers</option>
                    {teacherList.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>
                    ))}
                  </select>
                </div>

                {/* Class dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">Class</label>
                  <select
                    value={filterClass}
                    onChange={(e) => { setFilterClass(e.target.value); setReportsPage(1); }}
                    className="w-full bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1F2937]"
                  >
                    <option value="All">All Classes</option>
                    {uniqueClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Section dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">Section</label>
                  <select
                    value={filterSection}
                    onChange={(e) => { setFilterSection(e.target.value); setReportsPage(1); }}
                    className="w-full bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1F2937]"
                  >
                    <option value="All">All Sections</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>

                {/* Subject dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">Subject</label>
                  <select
                    value={filterSubject}
                    onChange={(e) => { setFilterSubject(e.target.value); setReportsPage(1); }}
                    className="w-full bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1F2937]"
                  >
                    <option value="All">All Subjects</option>
                    {uniqueSubjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Search field */}
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">Search Details</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Teacher, topic, homework..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setReportsPage(1); }}
                      className="w-full bg-white border border-[#E4E2DA] rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-semibold text-[#1F2937]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submissions Table */}
            {reportsLoading ? (
              <div className="py-14 flex flex-col items-center justify-center text-center">
                <RefreshCw className="w-7 h-7 text-[var(--accent)] animate-spin mb-2" />
                <p className="text-xs font-semibold text-[#5B6676]">Loading daily work submissions...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="py-14 text-center bg-[#FAF9F6] border border-dashed border-[#E4E2DA] rounded-xl">
                <BookOpen className="w-9 h-9 text-[#94A3B8] mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-[#334155]">No work records found</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  No teacher submissions found for the selected date or filter criteria
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E4E2DA]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAF9F6] border-b border-[#E4E2DA] text-[#475569] font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Teacher Name</th>
                      <th className="py-3 px-3">Emp ID</th>
                      <th className="py-3 px-3">Class</th>
                      <th className="py-3 px-3">Sec</th>
                      <th className="py-3 px-3">Subject</th>
                      <th className="py-3 px-3">Period</th>
                      <th className="py-3 px-3">Topic / Chapter</th>
                      <th className="py-3 px-3">Work Completed</th>
                      <th className="py-3 px-3">Homework</th>
                      <th className="py-3 px-3">Time</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E2DA]">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-[#F8F9FA] transition-colors">
                        <td className="py-3 px-3 font-semibold text-[#1F2937] whitespace-nowrap">
                          {report.date}
                        </td>
                        <td className="py-3 px-3 font-bold text-[#1F2937] whitespace-nowrap">
                          {report.teacherName}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-[#64748B] whitespace-nowrap">
                          {report.employeeId || '—'}
                        </td>
                        <td className="py-3 px-3 font-bold text-[#1F2937] whitespace-nowrap">
                          {report.standard}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {report.section}
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#1F2937] whitespace-nowrap">
                          {report.subject}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          Period {report.period || 1}
                        </td>
                        <td className="py-3 px-3 max-w-[170px] truncate font-medium text-[#1F2937]" title={report.topicTaught}>
                          {report.topicTaught}
                        </td>
                        <td className="py-3 px-3 max-w-[200px] truncate text-[#475569]" title={report.workCompleted}>
                          {report.workCompleted}
                        </td>
                        <td className="py-3 px-3 max-w-[140px] truncate text-[#64748B]" title={report.homeworkAssigned || '—'}>
                          {report.homeworkAssigned || '—'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-[#64748B] text-[11px]">
                          {report.submissionTime || new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedReport(report)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FAF9F6] border border-[#E4E2DA] text-[var(--accent)] hover:bg-[#F3F1EA] cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {reportsTotal > reportsLimit && (
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#E4E2DA]">
                <span className="text-xs text-[#5B6676]">
                  Showing {((reportsPage - 1) * reportsLimit) + 1} to {Math.min(reportsTotal, reportsPage * reportsLimit)} of {reportsTotal} records
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={reportsPage <= 1}
                    onClick={() => setReportsPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-[#E4E2DA] text-[#475569] hover:bg-[#F3F1EA] disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={reportsPage * reportsLimit >= reportsTotal}
                    onClick={() => setReportsPage(p => p + 1)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-[#E4E2DA] text-[#475569] hover:bg-[#F3F1EA] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SUBMISSION TRACKING ROSTER */}
        {activeTab === 'tracking' && (
          <div className="bg-white border border-[#E4E2DA] rounded-2xl p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-[#E4E2DA] gap-2">
              <div>
                <h2 className="text-base font-bold text-[#1F2937] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--accent)]" />
                  Teacher Submission Tracking for {selectedDate}
                </h2>
                <p className="text-xs text-[#5B6676] mt-0.5">
                  Verify submission compliance across all academic faculty (Sundays, holidays and approved leaves are accounted for)
                </p>
              </div>

              {overview?.isSunday && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
                  Sunday — Non-working Day
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E4E2DA]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E4E2DA] text-[#475569] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Teacher Name</th>
                    <th className="py-3 px-3">Employee ID</th>
                    <th className="py-3 px-3">Assigned Class</th>
                    <th className="py-3 px-3">Submission Status</th>
                    <th className="py-3 px-3">Sessions Logged</th>
                    <th className="py-3 px-3">Last Submission Time</th>
                    <th className="py-3 px-3">Topics Covered Today</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E2DA]">
                  {teacherList.map((teacher) => {
                    const isSubmitted = teacher.submissionStatus === 'Submitted';
                    const isLeave = teacher.submissionStatus === 'On Approved Leave';
                    const isOff = teacher.submissionStatus.includes('Sunday') || teacher.submissionStatus.includes('Off');

                    return (
                      <tr key={teacher.id} className="hover:bg-[#F8F9FA] transition-colors">
                        <td className="py-3 px-3 font-bold text-[#1F2937] whitespace-nowrap">
                          {teacher.name}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-[#64748B] whitespace-nowrap">
                          {teacher.employeeId}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {teacher.assignedClass ? `${teacher.assignedClass} - ${teacher.assignedSection}` : '—'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isSubmitted ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Submitted
                            </span>
                          ) : isLeave ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              On Approved Leave
                            </span>
                          ) : isOff ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
                              Sunday / Holiday
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              Not Submitted
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#1F2937] whitespace-nowrap">
                          {teacher.entriesCount} {teacher.entriesCount === 1 ? 'entry' : 'entries'}
                        </td>
                        <td className="py-3 px-3 text-[#64748B] text-[11px] whitespace-nowrap">
                          {teacher.lastSubmissionTime || '—'}
                        </td>
                        <td className="py-3 px-3 max-w-[220px] truncate text-[#475569]" title={teacher.topicsTaught?.join(', ')}>
                          {teacher.topicsTaught?.length > 0 ? teacher.topicsTaught.join(', ') : '—'}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTeacherId(teacher.id);
                              setActiveTab('teacher_history');
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FAF9F6] border border-[#E4E2DA] text-[var(--accent)] hover:bg-[#F3F1EA] cursor-pointer inline-flex items-center gap-1"
                          >
                            <History className="w-3.5 h-3.5" />
                            History
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

        {/* TAB 3: TEACHER-WISE HISTORY & CURRICULUM */}
        {activeTab === 'teacher_history' && (
          <div className="bg-white border border-[#E4E2DA] rounded-2xl p-4 sm:p-6 shadow-xs">
            {/* Teacher Selector Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-5 border-b border-[#E4E2DA] gap-3">
              <div>
                <h2 className="text-base font-bold text-[#1F2937] flex items-center gap-2">
                  <History className="w-4 h-4 text-[var(--accent)]" />
                  Teacher-Wise Work History & Curriculum Progression
                </h2>
                <p className="text-xs text-[#5B6676] mt-0.5">
                  Inspect historical lessons and topics completed over time for any teacher
                </p>
              </div>

              {/* Select Teacher Dropdown */}
              <div className="w-full sm:w-auto">
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full sm:w-64 bg-white border border-[#E4E2DA] rounded-lg px-3 py-1.5 text-xs font-bold text-[#1F2937]"
                >
                  {teacherList.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>
                  ))}
                </select>
              </div>
            </div>

            {teacherHistoryLoading ? (
              <div className="py-14 flex flex-col items-center justify-center text-center">
                <RefreshCw className="w-7 h-7 text-[var(--accent)] animate-spin mb-2" />
                <p className="text-xs font-semibold text-[#5B6676]">Loading teacher curriculum history...</p>
              </div>
            ) : !teacherHistory || !teacherHistory.reports?.length ? (
              <div className="py-14 text-center bg-[#FAF9F6] border border-dashed border-[#E4E2DA] rounded-xl">
                <BookOpen className="w-9 h-9 text-[#94A3B8] mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-[#334155]">No historical submissions found for this teacher</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Progression Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div className="p-4 bg-[#FAF9F6] rounded-xl border border-[#E4E2DA]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">Total Reports Logged</span>
                    <span className="text-2xl font-black text-[#1F2937]">{teacherHistory.totalSubmissions}</span>
                  </div>
                  <div className="p-4 bg-[#FAF9F6] rounded-xl border border-[#E4E2DA]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">Classes / Subjects Taught</span>
                    <span className="text-2xl font-black text-[var(--accent)]">{teacherHistory.progression?.length || 0}</span>
                  </div>
                </div>

                {/* Subject & Class Breakdown */}
                {teacherHistory.progression?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-2.5">
                      Curriculum Progress by Class & Subject
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {teacherHistory.progression.map((p, idx) => (
                        <div key={idx} className="p-3.5 bg-white border border-[#E4E2DA] rounded-xl">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="font-bold text-xs text-[#1F2937]">
                              {p.standard} - {p.section} • {p.subject}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {p.topicsCount} {p.topicsCount === 1 ? 'lesson' : 'lessons'}
                            </span>
                          </div>
                          <ul className="list-disc list-inside text-[11px] text-[#475569] space-y-0.5 line-clamp-3">
                            {p.entries?.slice(0, 3).map((e, ei) => (
                              <li key={ei} className="truncate">
                                <span className="font-medium text-[#1F2937]">{e.date}:</span> {e.topicTaught}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teacher's Complete Historical Reports Table */}
                <div>
                  <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-2.5">
                    Complete Work Log
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-[#E4E2DA]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#FAF9F6] border-b border-[#E4E2DA] text-[#475569] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Class</th>
                          <th className="py-3 px-3">Sec</th>
                          <th className="py-3 px-3">Subject</th>
                          <th className="py-3 px-3">Period</th>
                          <th className="py-3 px-3">Topic / Chapter</th>
                          <th className="py-3 px-3">Work Completed</th>
                          <th className="py-3 px-3">Homework</th>
                          <th className="py-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E4E2DA]">
                        {teacherHistory.reports.map((report) => (
                          <tr key={report.id} className="hover:bg-[#F8F9FA] transition-colors">
                            <td className="py-3 px-3 font-semibold text-[#1F2937] whitespace-nowrap">
                              {report.date}
                            </td>
                            <td className="py-3 px-3 font-bold text-[#1F2937] whitespace-nowrap">
                              {report.standard}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {report.section}
                            </td>
                            <td className="py-3 px-3 font-semibold text-[#1F2937] whitespace-nowrap">
                              {report.subject}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              Period {report.period || 1}
                            </td>
                            <td className="py-3 px-3 max-w-[180px] truncate font-medium text-[#1F2937]" title={report.topicTaught}>
                              {report.topicTaught}
                            </td>
                            <td className="py-3 px-3 max-w-[220px] truncate text-[#475569]" title={report.workCompleted}>
                              {report.workCompleted}
                            </td>
                            <td className="py-3 px-3 max-w-[140px] truncate text-[#64748B]" title={report.homeworkAssigned || '—'}>
                              {report.homeworkAssigned || '—'}
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedReport(report)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FAF9F6] border border-[#E4E2DA] text-[var(--accent)] hover:bg-[#F3F1EA] cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL: VIEW COMPLETE REPORT DETAILS */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white border border-[#E4E2DA] rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#64748B] hover:bg-[#F3F1EA] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-[#E4E2DA]">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1F2937]">Lesson Report Details</h3>
                <p className="text-xs text-[#5B6676]">
                  {selectedReport.teacherName} • Employee ID: {selectedReport.employeeId}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Row 1: Date & Time */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAF9F6] rounded-xl border border-[#E4E2DA]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">Date</span>
                  <span className="font-bold text-[#1F2937]">{selectedReport.date}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">Submission Time</span>
                  <span className="font-bold text-[#1F2937]">{selectedReport.submissionTime || '—'}</span>
                </div>
              </div>

              {/* Row 2: Class, Section, Subject, Period */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-[#FAF9F6] rounded-xl border border-[#E4E2DA]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">Class & Sec</span>
                  <span className="font-bold text-[#1F2937]">{selectedReport.standard} - {selectedReport.section}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">Subject</span>
                  <span className="font-bold text-[#1F2937]">{selectedReport.subject}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">Period</span>
                  <span className="font-bold text-[#1F2937]">Period {selectedReport.period || 1}</span>
                </div>
              </div>

              {/* Topic */}
              <div>
                <span className="text-[11px] font-bold text-[#475569] block mb-1">Topic / Chapter Covered:</span>
                <p className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E4E2DA] font-semibold text-[#1F2937]">
                  {selectedReport.topicTaught}
                </p>
              </div>

              {/* Work Completed */}
              <div>
                <span className="text-[11px] font-bold text-[#475569] block mb-1">Detailed Classroom Work Completed:</span>
                <p className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E4E2DA] text-[#334155] whitespace-pre-wrap leading-relaxed">
                  {selectedReport.workCompleted}
                </p>
              </div>

              {/* Homework */}
              {selectedReport.homeworkAssigned && (
                <div>
                  <span className="text-[11px] font-bold text-[#475569] block mb-1">Homework Assigned:</span>
                  <p className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 text-blue-900 whitespace-pre-wrap leading-relaxed">
                    {selectedReport.homeworkAssigned}
                  </p>
                </div>
              )}

              {/* Remarks */}
              {selectedReport.remarks && (
                <div>
                  <span className="text-[11px] font-bold text-[#475569] block mb-1">Remarks & Observations:</span>
                  <p className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-amber-900 leading-relaxed">
                    {selectedReport.remarks}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-[#E4E2DA] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FAF9F6] border border-[#E4E2DA] text-[#1F2937] hover:bg-[#F3F1EA] cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
