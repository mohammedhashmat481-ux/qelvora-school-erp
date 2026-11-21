import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/ui/Sidebar';
import {
  getTeacherWorkMeta,
  submitDailyWork,
  getMyWorkHistory,
  updateDailyWork,
  deleteDailyWork
} from '../services/teacherWorkService';
import toast from 'react-hot-toast';
import {
  BookOpenCheck,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Send,
  History,
  Search,
  Filter,
  Eye,
  Edit3,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Sparkles,
  RefreshCw,
  X,
  FileText,
  AlertCircle,
  HelpCircle,
  School
} from 'lucide-react';

const PERIOD_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

const getTodayStr = () => new Date().toISOString().split('T')[0];

export default function TeacherDailyWorkPage() {
  const { user } = useAuth();

  // Teacher metadata
  const [meta, setMeta] = useState(null);
  const [metaLoading, setMetaLoading] = useState(true);

  // Selected date for submission (default today)
  const [submissionDate, setSubmissionDate] = useState(getTodayStr());

  // Form entries list (supports multiple entries per day)
  const createEmptyEntry = useCallback(() => ({
    standard: '',
    section: '',
    subject: '',
    period: 1,
    timeSlot: '',
    topicTaught: '',
    workCompleted: '',
    homeworkAssigned: '',
    remarks: ''
  }), []);

  const [entries, setEntries] = useState([createEmptyEntry()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History state
  const [historyReports, setHistoryReports] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(25);

  // History filters
  const [filterDate, setFilterDate] = useState('');
  const [filterStandard, setFilterStandard] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedReport, setSelectedReport] = useState(null); // For View modal
  const [editingReport, setEditingReport] = useState(null); // For Edit modal
  const [isUpdating, setIsUpdating] = useState(false);

  // Load Meta on mount
  useEffect(() => {
    let isMounted = true;
    setMetaLoading(true);
    getTeacherWorkMeta()
      .then(res => {
        if (isMounted && res?.status) {
          setMeta(res);
          // If teacher has assigned class/subject, set sensible default for first entry
          if (res.assignedClasses?.length > 0) {
            setEntries([{
              ...createEmptyEntry(),
              standard: res.assignedClasses[0].standard || '',
              section: res.assignedClasses[0].section || '',
              subject: res.assignedSubjects?.[0] || ''
            }]);
          }
        }
      })
      .catch(err => {
        console.error('Failed to load metadata:', err);
      })
      .finally(() => {
        if (isMounted) setMetaLoading(false);
      });
    return () => { isMounted = false; };
  }, [createEmptyEntry]);

  // Load History
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await getMyWorkHistory({
        date: filterDate || undefined,
        standard: filterStandard !== 'All' ? filterStandard : undefined,
        subject: filterSubject !== 'All' ? filterSubject : undefined,
        search: searchQuery.trim() || undefined,
        page: historyPage,
        limit: historyLimit
      });
      if (res?.status) {
        setHistoryReports(res.data || []);
        setHistoryTotal(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching work history:', err);
      toast.error('Failed to load work history');
    } finally {
      setHistoryLoading(false);
    }
  }, [filterDate, filterStandard, filterSubject, searchQuery, historyPage, historyLimit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Entry change handlers
  const handleEntryChange = (index, field, value) => {
    setEntries(prev => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };

      // If standard changed, auto-adjust section if current section is invalid
      if (field === 'standard') {
        const availableSections = meta?.classSectionsMap?.[value] || ['A'];
        if (!availableSections.includes(updated.section)) {
          updated.section = availableSections[0] || 'A';
        }
      }
      next[index] = updated;
      return next;
    });
  };

  const handleAddEntry = () => {
    const lastEntry = entries[entries.length - 1];
    setEntries(prev => [
      ...prev,
      {
        standard: lastEntry?.standard || '',
        section: lastEntry?.section || '',
        subject: lastEntry?.subject || '',
        period: Math.min(8, (lastEntry?.period || 1) + 1),
        timeSlot: '',
        topicTaught: '',
        workCompleted: '',
        homeworkAssigned: '',
        remarks: ''
      }
    ]);
  };

  const handleRemoveEntry = (index) => {
    if (entries.length <= 1) {
      toast.error('At least one teaching entry is required');
      return;
    }
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  // Form Submission
  const handleSubmitDailyWork = async (e) => {
    e.preventDefault();

    // Validation
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.standard) {
        toast.error(`Entry #${i + 1}: Please select a Class`);
        return;
      }
      if (!e.section) {
        toast.error(`Entry #${i + 1}: Please select a Section`);
        return;
      }
      if (!e.subject) {
        toast.error(`Entry #${i + 1}: Please select a Subject`);
        return;
      }
      if (!e.topicTaught.trim()) {
        toast.error(`Entry #${i + 1}: Please enter the Topic / Chapter taught`);
        return;
      }
      if (!e.workCompleted.trim()) {
        toast.error(`Entry #${i + 1}: Please enter the Work Completed description`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await submitDailyWork({
        date: submissionDate,
        entries: entries.map(e => ({
          ...e,
          date: submissionDate
        }))
      });

      if (res?.status) {
        toast.success(res.message || 'Daily work submitted successfully!');
        // Reset entries to 1 empty entry keeping class/section for convenience
        const first = entries[0];
        setEntries([{
          ...createEmptyEntry(),
          standard: first.standard,
          section: first.section,
          subject: first.subject
        }]);
        fetchHistory();
      } else {
        toast.error(res?.message || 'Failed to submit daily work');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Entry
  const handleDeleteReport = async (id) => {
    if (!window.confirm('Are you sure you want to delete this work entry?')) return;
    try {
      const res = await deleteDailyWork(id);
      if (res?.status) {
        toast.success('Work report deleted');
        fetchHistory();
      } else {
        toast.error(res?.message || 'Failed to delete');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete error');
    }
  };

  // Edit Submission Handler
  const handleUpdateReport = async (e) => {
    e.preventDefault();
    if (!editingReport) return;
    setIsUpdating(true);
    try {
      const res = await updateDailyWork(editingReport.id, editingReport);
      if (res?.status) {
        toast.success('Work report updated successfully');
        setEditingReport(null);
        fetchHistory();
      } else {
        toast.error(res?.message || 'Update failed');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update error');
    } finally {
      setIsUpdating(false);
    }
  };

  const teacherName = meta?.teacher?.name || user?.name || 'Faculty Member';
  const employeeId = meta?.teacher?.employeeId || user?.employeeId || 'EMP001';

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
                Daily Work Done & History
              </h1>
              <p className="text-xs text-[#5B6676] font-medium mt-0.5">
                Record classroom lessons, topics covered, completed curriculum and assigned homework
              </p>
            </div>
          </div>

          {/* Teacher Profile & Date Selector */}
          <div className="flex flex-wrap items-center gap-3 bg-[var(--surface-2)] p-2 rounded-xl border border-[#E4E2DA] w-full sm:w-auto">
            <div className="flex items-center gap-2 px-2">
              <GraduationCap className="w-4 h-4 text-[#8A6228]" />
              <div className="text-left">
                <span className="text-xs font-bold text-[#1F2937] block leading-tight">
                  {teacherName}
                </span>
                <span className="text-[10px] font-mono text-[#5B6676] block">
                  ID: {employeeId}
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-[#E4E2DA] hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
                className="bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#1F2937] focus:outline-hidden focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => setSubmissionDate(getTodayStr())}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-[#E4E2DA] text-[#475569] hover:bg-[#F3F1EA] hover:text-[#0F172A] cursor-pointer"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 1: DAILY WORK SUBMISSION FORM */}
        <div className="mb-8 bg-white border border-[#E4E2DA] rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-5 border-b border-[#E4E2DA] gap-2">
            <div>
              <h2 className="text-base font-bold text-[#1F2937] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--accent)]" />
                Submit Daily Work Report
              </h2>
              <p className="text-xs text-[#5B6676] mt-0.5">
                Report for: <span className="font-bold text-[#1F2937]">{new Date(submissionDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </p>
            </div>

            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              {entries.length} teaching {entries.length === 1 ? 'session' : 'sessions'}
            </span>
          </div>

          <form onSubmit={handleSubmitDailyWork} className="space-y-6">
            {entries.map((entry, idx) => {
              const availableSections = meta?.classSectionsMap?.[entry.standard] || ['A', 'B', 'C'];

              return (
                <div
                  key={idx}
                  className="bg-[#FAF9F6] border border-[#E4E2DA] rounded-xl p-4 sm:p-5 relative transition-all"
                >
                  {/* Entry Header */}
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#E4E2DA]/70">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8A6228] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#8A6228] text-white flex items-center justify-center text-[10px] font-black">
                        {idx + 1}
                      </span>
                      Teaching Session / Class #{idx + 1}
                    </span>

                    {entries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEntry(idx)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded-md hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove Session
                      </button>
                    )}
                  </div>

                  {/* Row 1: Class, Section, Subject, Period, TimeSlot */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 mb-4">
                    {/* Class */}
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Class <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={entry.standard}
                        onChange={(e) => handleEntryChange(idx, 'standard', e.target.value)}
                        required
                        className="w-full bg-white border border-[#E4E2DA] rounded-lg px-3 py-2 text-xs font-semibold text-[#1F2937] focus:outline-hidden focus:border-[var(--accent)]"
                      >
                        <option value="">Select Class</option>
                        {meta?.standards?.map((std) => (
                          <option key={std} value={std}>
                            {std}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Section */}
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Section <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={entry.section}
                        onChange={(e) => handleEntryChange(idx, 'section', e.target.value)}
                        required
                        className="w-full bg-white border border-[#E4E2DA] rounded-lg px-3 py-2 text-xs font-semibold text-[#1F2937] focus:outline-hidden focus:border-[var(--accent)]"
                      >
                        <option value="">Select Section</option>
                        {availableSections.map((sec) => (
                          <option key={sec} value={sec}>
                            Section {sec}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Subject <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={entry.subject}
                        onChange={(e) => handleEntryChange(idx, 'subject', e.target.value)}
                        required
                        className="w-full bg-white border border-[#E4E2DA] rounded-lg px-3 py-2 text-xs font-semibold text-[#1F2937] focus:outline-hidden focus:border-[var(--accent)]"
                      >
                        <option value="">Select Subject</option>
                        {meta?.allSubjects?.map((sub) => (
                          <option key={sub.id} value={sub.name}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Period */}
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Period
                      </label>
                      <select
                        value={entry.period}
                        onChange={(e) => handleEntryChange(idx, 'period', e.target.value)}
                        className="w-full bg-white border border-[#E4E2DA] rounded-lg px-3 py-2 text-xs font-semibold text-[#1F2937] focus:outline-hidden focus:border-[var(--accent)]"
                      >
                        {PERIOD_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            Period {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Time Slot (Optional) */}
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Time Slot (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 09:15 - 10:00"
                        value={entry.timeSlot}
                        onChange={(e) => handleEntryChange(idx, 'timeSlot', e.target.value)}
                        className="w-full bg-white border border-[#E4E2DA] rounded-lg px-3 py-2 text-xs font-semibold text-[#1F2937] focus:outline-hidden focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>

                  {/* Row 2: Topic / Chapter Taught */}
                  <div className="mb-3.5">
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      Topic / Chapter Taught <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Chapter 4: Electromagnetic Induction & Faraday's Laws"
                      value={entry.topicTaught}
                      onChange={(e) => handleEntryChange(idx, 'topicTaught', e.target.value)}
                      required
                      className="w-full bg-white border border-[#E4E2DA] rounded-lg px-3 py-2 text-xs font-semibold text-[#1F2937] focus:outline-hidden focus:border-[var(--accent)]"
                    />
                  </div>

                  {/* Row 3: Work Completed (Textarea) */}
                  <div className="mb-3.5">
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      Work Completed (Classroom Activity & Curriculum Delivered) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Explain in detail what was taught, solved numericals, discussed concepts, or practical lab demonstrations conducted..."
                      value={entry.workCompleted}
                      onChange={(e) => handleEntryChange(idx, 'workCompleted', e.target.value)}
                      required
                      className="w-full bg-white border border-[#E4E2DA] rounded-lg px-3 py-2 text-xs font-semibold text-[#1F2937] focus:outline-hidden focus:border-[var(--accent)]"
                    />
                  </div>

                  {/* Row 4: Homework Assigned & Remarks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Homework Assigned (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Solve exercise questions 1 to 5 on page 78"
                        value={entry.homeworkAssigned}
                        onChange={(e) => handleEntryChange(idx, 'homeworkAssigned', e.target.value)}
                        className="w-full bg-white border border-[#E4E2DA] rounded-lg px-3 py-2 text-xs font-semibold text-[#1F2937] focus:outline-hidden focus:border-[var(--accent)]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Remarks / Special Observations (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Active participation, need review session next week"
                        value={entry.remarks}
                        onChange={(e) => handleEntryChange(idx, 'remarks', e.target.value)}
                        className="w-full bg-white border border-[#E4E2DA] rounded-lg px-3 py-2 text-xs font-semibold text-[#1F2937] focus:outline-hidden focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Action Buttons: Add Another Entry & Submit Daily Work */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddEntry}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-[#FAF9F6] border border-[#E4E2DA] text-[#1F2937] hover:bg-[#F3F1EA] flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 text-[#8A6228]" />
                Add Another Teaching Session / Period
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Submitting Daily Work...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Daily Work ({entries.length} {entries.length === 1 ? 'Entry' : 'Entries'})
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 2: MY WORK HISTORY */}
        <div className="bg-white border border-[#E4E2DA] rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-[#E4E2DA] gap-3">
            <div>
              <h2 className="text-base font-bold text-[#1F2937] flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--accent)]" />
                My Work History & Previous Reports
              </h2>
              <p className="text-xs text-[#5B6676] mt-0.5">
                Review and audit your submitted daily lesson records
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchHistory}
                disabled={historyLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FAF9F6] border border-[#E4E2DA] text-[#475569] hover:bg-[#F3F1EA] flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {/* Filter Date */}
            <div>
              <label className="block text-[11px] font-bold text-[#475569] mb-1">
                Filter by Date
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setHistoryPage(1); }}
                className="w-full bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1F2937]"
              />
            </div>

            {/* Filter Class */}
            <div>
              <label className="block text-[11px] font-bold text-[#475569] mb-1">
                Filter by Class
              </label>
              <select
                value={filterStandard}
                onChange={(e) => { setFilterStandard(e.target.value); setHistoryPage(1); }}
                className="w-full bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1F2937]"
              >
                <option value="All">All Classes</option>
                {meta?.standards?.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Filter Subject */}
            <div>
              <label className="block text-[11px] font-bold text-[#475569] mb-1">
                Filter by Subject
              </label>
              <select
                value={filterSubject}
                onChange={(e) => { setFilterSubject(e.target.value); setHistoryPage(1); }}
                className="w-full bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1F2937]"
              >
                <option value="All">All Subjects</option>
                {meta?.allSubjects?.map((sub) => (
                  <option key={sub.id} value={sub.name}>{sub.name}</option>
                ))}
              </select>
            </div>

            {/* Search Query */}
            <div>
              <label className="block text-[11px] font-bold text-[#475569] mb-1">
                Search Topics / Work
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search keywords..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setHistoryPage(1); }}
                  className="w-full bg-white border border-[#E4E2DA] rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-semibold text-[#1F2937]"
                />
              </div>
            </div>
          </div>

          {/* Reports Table */}
          {historyLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-6 h-6 text-[var(--accent)] animate-spin mb-2" />
              <p className="text-xs font-semibold text-[#5B6676]">Loading work history...</p>
            </div>
          ) : historyReports.length === 0 ? (
            <div className="py-12 text-center bg-[#FAF9F6] border border-dashed border-[#E4E2DA] rounded-xl">
              <BookOpen className="w-8 h-8 text-[#94A3B8] mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold text-[#334155]">No work records found</p>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                {filterDate || filterStandard !== 'All' || filterSubject !== 'All' || searchQuery
                  ? 'No entries match your search filters'
                  : 'Submit your first daily work report using the form above'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E4E2DA]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E4E2DA] text-[#475569] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Class & Sec</th>
                    <th className="py-3 px-3">Subject & Period</th>
                    <th className="py-3 px-3">Topic / Chapter</th>
                    <th className="py-3 px-3">Work Completed</th>
                    <th className="py-3 px-3">Homework</th>
                    <th className="py-3 px-3">Time</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E2DA]">
                  {historyReports.map((report) => (
                    <tr key={report.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="py-3 px-3 font-semibold text-[#1F2937] whitespace-nowrap">
                        {report.date}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#1F2937] whitespace-nowrap">
                        {report.standard} - {report.section}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-[#1F2937] block">{report.subject}</span>
                        <span className="text-[10px] text-[#64748B]">Period {report.period || 1} {report.timeSlot ? `(${report.timeSlot})` : ''}</span>
                      </td>
                      <td className="py-3 px-3 max-w-[180px] truncate font-medium text-[#1F2937]" title={report.topicTaught}>
                        {report.topicTaught}
                      </td>
                      <td className="py-3 px-3 max-w-[220px] truncate text-[#475569]" title={report.workCompleted}>
                        {report.workCompleted}
                      </td>
                      <td className="py-3 px-3 max-w-[150px] truncate text-[#64748B]" title={report.homeworkAssigned || '—'}>
                        {report.homeworkAssigned || '—'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-[#64748B] text-[11px]">
                        {report.submissionTime || new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {report.status || 'Submitted'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedReport(report)}
                            className="p-1 rounded-md text-[#475569] hover:bg-[#F3F1EA] hover:text-[#0F172A] cursor-pointer"
                            title="View Full Report"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingReport({ ...report })}
                            className="p-1 rounded-md text-blue-600 hover:bg-blue-50 cursor-pointer"
                            title="Edit Report"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReport(report.id)}
                            className="p-1 rounded-md text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Delete Report"
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
          )}

          {/* Pagination */}
          {historyTotal > historyLimit && (
            <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#E4E2DA]">
              <span className="text-xs text-[#5B6676]">
                Showing {((historyPage - 1) * historyLimit) + 1} to {Math.min(historyTotal, historyPage * historyLimit)} of {historyTotal} records
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-[#E4E2DA] text-[#475569] hover:bg-[#F3F1EA] disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={historyPage * historyLimit >= historyTotal}
                  onClick={() => setHistoryPage(p => p + 1)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-[#E4E2DA] text-[#475569] hover:bg-[#F3F1EA] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* MODAL 1: VIEW FULL REPORT DETAILS */}
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
                  {selectedReport.teacherName} • ID: {selectedReport.employeeId}
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
                <span className="text-[11px] font-bold text-[#475569] block mb-1">Topic / Chapter Taught:</span>
                <p className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E4E2DA] font-semibold text-[#1F2937]">
                  {selectedReport.topicTaught}
                </p>
              </div>

              {/* Work Completed */}
              <div>
                <span className="text-[11px] font-bold text-[#475569] block mb-1">Classroom Work Completed:</span>
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

      {/* MODAL 2: EDIT WORK REPORT */}
      {editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white border border-[#E4E2DA] rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingReport(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#64748B] hover:bg-[#F3F1EA] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-[#E4E2DA]">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1F2937]">Edit Daily Work Report</h3>
                <p className="text-xs text-[#5B6676]">
                  {editingReport.date} • {editingReport.standard} - {editingReport.section} ({editingReport.subject})
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateReport} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">Class</label>
                  <input
                    type="text"
                    value={editingReport.standard || ''}
                    onChange={(e) => setEditingReport({ ...editingReport, standard: e.target.value })}
                    className="w-full bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1.5 font-semibold text-[#1F2937]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">Section</label>
                  <input
                    type="text"
                    value={editingReport.section || ''}
                    onChange={(e) => setEditingReport({ ...editingReport, section: e.target.value })}
                    className="w-full bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1.5 font-semibold text-[#1F2937]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">Subject</label>
                  <input
                    type="text"
                    value={editingReport.subject || ''}
                    onChange={(e) => setEditingReport({ ...editingReport, subject: e.target.value })}
                    className="w-full bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1.5 font-semibold text-[#1F2937]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">Period</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={editingReport.period || 1}
                    onChange={(e) => setEditingReport({ ...editingReport, period: parseInt(e.target.value, 10) })}
                    className="w-full bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1.5 font-semibold text-[#1F2937]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Topic / Chapter Taught</label>
                <input
                  type="text"
                  value={editingReport.topicTaught || ''}
                  onChange={(e) => setEditingReport({ ...editingReport, topicTaught: e.target.value })}
                  className="w-full bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1.5 font-semibold text-[#1F2937]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Work Completed</label>
                <textarea
                  rows={3}
                  value={editingReport.workCompleted || ''}
                  onChange={(e) => setEditingReport({ ...editingReport, workCompleted: e.target.value })}
                  className="w-full bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1.5 font-semibold text-[#1F2937]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Homework Assigned</label>
                <input
                  type="text"
                  value={editingReport.homeworkAssigned || ''}
                  onChange={(e) => setEditingReport({ ...editingReport, homeworkAssigned: e.target.value })}
                  className="w-full bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1.5 font-semibold text-[#1F2937]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Remarks</label>
                <input
                  type="text"
                  value={editingReport.remarks || ''}
                  onChange={(e) => setEditingReport({ ...editingReport, remarks: e.target.value })}
                  className="w-full bg-white border border-[#E4E2DA] rounded-lg px-2.5 py-1.5 font-semibold text-[#1F2937]"
                />
              </div>

              <div className="pt-3 border-t border-[#E4E2DA] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="px-4 py-2 rounded-xl font-bold bg-[#FAF9F6] border border-[#E4E2DA] text-[#1F2937] hover:bg-[#F3F1EA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-xl font-bold bg-[var(--accent)] text-white hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
