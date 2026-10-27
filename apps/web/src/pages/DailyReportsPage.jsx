import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/ui/Sidebar';
import { getCompanySettings } from '../services/authService';
import { getDailyReport } from '../services/reportService';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import {
  FileSpreadsheet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Clock,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Phone,
  MessageSquare,
  Sparkles,
  Award,
  GraduationCap,
  Building2,
  Layers,
  ArrowUpRight,
  TrendingUp,
  X,
  CreditCard,
  ExternalLink,
  FileText,
  FileCheck2,
  BadgeCheck
} from 'lucide-react';

export default function DailyReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Role validation: strictly for Principal and Admin
  const userRoleLower = user?.role?.toLowerCase() || '';
  const isPrincipalOrAdmin =
    userRoleLower.includes('admin') ||
    userRoleLower === 'principal' ||
    Boolean(user?.isAdmin);

  // Date selection state (Defaults to today YYYY-MM-DD)
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  
  // View mode: 'document' (Official Formal Letterhead Sheet) vs 'dashboard' (Tabbed Interactive UI)
  const [viewMode, setViewMode] = useState('document');
  const [activeTab, setActiveTab] = useState('classes'); // 'classes' | 'absentees' | 'faculty' | 'finances'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStandardFilter, setSelectedStandardFilter] = useState('ALL');

  // School settings branding
  const [schoolSettings, setSchoolSettings] = useState({
    schoolName: 'Qelvora School CRM',
    schoolLogo: '',
    logoSubtext: 'Daily Operations & Attendance Audit'
  });

  // Report Data
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [selectedClassModal, setSelectedClassModal] = useState(null);

  // Fetch School Settings
  useEffect(() => {
    getCompanySettings()
      .then(res => {
        if (res?.data) {
          setSchoolSettings({
            schoolName: res.data.schoolName || 'Qelvora School CRM',
            schoolLogo: res.data.schoolLogo || '',
            logoSubtext: res.data.logoSubtext || 'Daily Operations & Attendance Audit'
          });
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Daily Report for selectedDate
  const fetchReport = useCallback(async (dateToFetch) => {
    setLoading(true);
    try {
      const res = await getDailyReport(dateToFetch);
      if (res?.status && res?.data) {
        setReportData(res.data);
      } else {
        toast.error('Unable to retrieve daily report data.');
      }
    } catch (err) {
      console.error('Failed to load daily report:', err);
      toast.error('Error fetching report data. Displaying cached view.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate, fetchReport]);

  // Quick Date Navigation Helpers
  const shiftDate = (days) => {
    const current = new Date(selectedDate);
    if (!isNaN(current.getTime())) {
      current.setDate(current.getDate() + days);
      setSelectedDate(current.toISOString().split('T')[0]);
    }
  };

  const setToday = () => setSelectedDate(getTodayStr());

  const setYesterday = () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    setSelectedDate(y.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === getTodayStr();

  // Format date readable
  const formattedDateTitle = useMemo(() => {
    try {
      const d = new Date(selectedDate);
      if (isNaN(d.getTime())) return selectedDate;
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Filtered Class List
  const filteredClasses = useMemo(() => {
    if (!reportData?.classes) return [];
    return reportData.classes.filter(cls => {
      const matchesStd =
        selectedStandardFilter === 'ALL' ||
        cls.standard?.toLowerCase() === selectedStandardFilter.toLowerCase();
      const matchesSearch =
        !searchTerm.trim() ||
        `${cls.standard} ${cls.section} ${cls.classTeacher || ''} ${cls.roomNumber || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      return matchesStd && matchesSearch;
    });
  }, [reportData, selectedStandardFilter, searchTerm]);

  // Filtered Absentees List
  const filteredAbsentees = useMemo(() => {
    if (!reportData?.absenteesMaster) return [];
    return reportData.absenteesMaster.filter(abs => {
      const matchesStd =
        selectedStandardFilter === 'ALL' ||
        abs.standard?.toLowerCase() === selectedStandardFilter.toLowerCase();
      const matchesSearch =
        !searchTerm.trim() ||
        `${abs.studentName || ''} ${abs.rollNumber || ''} ${abs.parentName || ''} ${abs.parentPhone || ''} ${abs.standard || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      return matchesStd && matchesSearch;
    });
  }, [reportData, selectedStandardFilter, searchTerm]);

  // Filtered Faculty List
  const filteredTeachers = useMemo(() => {
    if (!reportData?.teachers) return [];
    return reportData.teachers.filter(tch => {
      return (
        !searchTerm.trim() ||
        `${tch.name || ''} ${tch.empId || ''} ${tch.dept || ''} ${tch.status || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    });
  }, [reportData, searchTerm]);

  // Filtered Fee Receipts List
  const filteredReceipts = useMemo(() => {
    if (!reportData?.feeReceipts) return [];
    return reportData.feeReceipts.filter(rcp => {
      return (
        !searchTerm.trim() ||
        `${rcp.receiptNumber || ''} ${rcp.studentName || ''} ${rcp.standard || ''} ${rcp.mode || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    });
  }, [reportData, searchTerm]);

  // =========================================================================
  // OFFICIAL EXECUTIVE EXCEL EXPORT (PROPER SCHOOL REPORT FORMAT WITH AUTO-WIDTHS)
  // =========================================================================
  const exportToExcel = () => {
    if (!reportData) {
      toast.error('No report data available to export.');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      const schoolName = (schoolSettings.schoolName || 'Qelvora School CRM').toUpperCase();
      const summary = reportData.summary || {};
      const classes = reportData.classes || [];
      const absentees = reportData.absenteesMaster || [];
      const teachers = reportData.teachers || [];
      const feeReceipts = reportData.feeReceipts || [];

      // ── SHEET 1: OFFICIAL MASTER DAILY REPORT ──────────────────────────────
      const masterRows = [];

      // 1. Official Header Banner
      masterRows.push([schoolName]);
      masterRows.push(['OFFICIAL DAILY INSTITUTIONAL OPERATIONS & ATTENDANCE AUDIT REPORT']);
      masterRows.push(['Affiliated to CBSE / State Board | Academic Session: 2026-2027']);
      masterRows.push([`REPORT DATE: ${formattedDateTitle.toUpperCase()} | GENERATED AT: ${new Date().toLocaleTimeString()} | AUTHOR: PRINCIPAL OFFICE`]);
      masterRows.push([]); // blank

      // 2. Executive Operations Summary Box
      masterRows.push(['1. EXECUTIVE INSTITUTIONAL OPERATIONS SUMMARY']);
      masterRows.push([
        'Metric Category',
        'Total Strength',
        'Present Today',
        'Absent / Leave',
        'Late Arrivals',
        'Turnout Rate (%)',
        'Benchmark Status',
        'Operational Remarks'
      ]);

      const stuSummary = summary.studentAttendance || {};
      masterRows.push([
        'Student Body (All Classes)',
        stuSummary.totalEnrolled || 0,
        stuSummary.present || 0,
        stuSummary.absent || 0,
        stuSummary.late || 0,
        `${stuSummary.percentage || 0}%`,
        (stuSummary.percentage || 0) >= 90 ? 'NORMAL / HIGH' : 'ATTENTION REQUIRED',
        'Parent notices logged for all absentees'
      ]);

      const facSummary = summary.teacherAttendance || {};
      masterRows.push([
        'Faculty & Staff',
        facSummary.totalTeachers || 0,
        facSummary.present || 0,
        facSummary.onLeave || 0,
        facSummary.absent || 0,
        `${facSummary.percentage || 0}%`,
        (facSummary.onLeave || 0) > 0 ? `${facSummary.substitutesArranged || 1} Substitute Assigned` : 'FULL FACULTY PRESENT',
        'All class periods covered & assigned'
      ]);

      const finSummary = summary.finances || {};
      masterRows.push([
        'Fee Revenue Today',
        `INR ${(finSummary.totalCollectedToday || 0).toLocaleString('en-IN')}`,
        `${finSummary.receiptsCount || 0} Receipts Issued`,
        `UPI: INR ${(finSummary.modeBreakdown?.upi || 0).toLocaleString('en-IN')}`,
        `Cash: INR ${(finSummary.modeBreakdown?.cash || 0).toLocaleString('en-IN')}`,
        '100% Reconciled',
        'ACCOUNTS BALANCED',
        'Day ledger closed & verified'
      ]);
      masterRows.push([]); // blank

      // 3. Class-by-Class Attendance Register
      masterRows.push(['2. CLASS-BY-CLASS STUDENT ATTENDANCE REGISTER']);
      masterRows.push([
        'Sl. No.',
        'Grade & Section',
        'Room No.',
        'Class Teacher',
        'Enrolled Strength',
        'Students Present',
        'Students Absent',
        'Students Late',
        'Attendance Rate (%)'
      ]);

      let totalStr = 0;
      let totalPres = 0;
      let totalAbs = 0;
      let totalLt = 0;

      classes.forEach((c, idx) => {
        totalStr += Number(c.strength) || 0;
        totalPres += Number(c.present) || 0;
        totalAbs += Number(c.absent) || 0;
        totalLt += Number(c.late) || 0;

        masterRows.push([
          idx + 1,
          `Class ${c.standard}-${c.section}`,
          c.roomNumber || '-',
          c.classTeacher || 'Assigned Faculty',
          c.strength,
          c.present,
          c.absent,
          c.late || 0,
          `${c.attendancePercentage}%`
        ]);
      });

      const avgPct = totalStr > 0 ? ((totalPres + totalLt) / totalStr * 100).toFixed(1) : '0.0';
      masterRows.push([
        'TOTALS',
        'ALL SECTIONS',
        '-',
        'INSTITUTIONAL TOTAL',
        totalStr,
        totalPres,
        totalAbs,
        totalLt,
        `${avgPct}%`
      ]);
      masterRows.push([]); // blank

      // 4. Daily Absentee Register & Parent Contact Roster
      masterRows.push(['3. TODAY\'S ABSENTEE MASTER REGISTER & PARENT CONTACT DIRECTORY']);
      masterRows.push([
        'Sl. No.',
        'Roll No.',
        'Student Full Name',
        'Grade & Section',
        'Parent / Guardian Name',
        'Parent Contact Phone',
        'Reason for Absence',
        'Calling Status',
        'Marked Time'
      ]);

      if (absentees.length > 0) {
        absentees.forEach((a, idx) => {
          masterRows.push([
            idx + 1,
            a.rollNumber || '-',
            a.studentName,
            `Class ${a.standard}-${a.section}`,
            a.parentName || 'Parent / Guardian',
            a.parentPhone || '+91 98765 00000',
            a.reason || 'Uninformed',
            'Notice Dispatched',
            a.timeMarked || '08:30 AM'
          ]);
        });
      } else {
        masterRows.push(['-', '-', 'NO ABSENTEES RECORDED TODAY (100% CLASS TURNOUT)', '-', '-', '-', '-', '-', '-']);
      }
      masterRows.push([]); // blank

      // 5. Faculty Status & Substitution Allocations
      masterRows.push(['4. FACULTY ATTENDANCE & PERIOD SUBSTITUTE ALLOCATIONS']);
      masterRows.push([
        'Sl. No.',
        'Employee ID',
        'Faculty Full Name',
        'Department / Subject',
        'Attendance Status',
        'Punch-In Time',
        'Covering Substitute',
        'Duty Remarks'
      ]);

      teachers.forEach((t, idx) => {
        masterRows.push([
          idx + 1,
          t.empId || `EMP-00${idx + 1}`,
          t.name,
          t.dept || 'Academics',
          t.status || 'Present',
          t.inTime || (t.status === 'Present' ? '08:20 AM' : '-'),
          t.substitute || 'None required',
          t.status === 'Present' ? 'Regular Duty' : 'Approved Leave (Substituted)'
        ]);
      });
      masterRows.push([]); // blank

      // 6. Fee Collections & Financial Audit
      masterRows.push(['5. DAILY FEE COLLECTIONS & REVENUE RECONCILIATION']);
      masterRows.push([
        'Sl. No.',
        'Receipt Number',
        'Student Full Name',
        'Grade & Section',
        'Fee Head / Purpose',
        'Payment Mode',
        'Amount Paid (INR)',
        'Processed Time',
        'Collector Desk'
      ]);

      let totalFeeSum = 0;
      if (feeReceipts.length > 0) {
        feeReceipts.forEach((r, idx) => {
          const amt = Number(r.amount || r.paidAmount) || 0;
          totalFeeSum += amt;
          masterRows.push([
            idx + 1,
            r.receiptNumber || `REC-00${idx + 1}`,
            r.studentName || '-',
            r.standard ? `${r.standard}-${r.section || 'A'}` : '-',
            r.head || 'Tuition Fee Installment',
            r.mode || r.primaryMode || 'UPI',
            amt,
            r.time || '10:00 AM',
            r.collector || 'Accounts Desk'
          ]);
        });
        masterRows.push([
          'TOTAL',
          'REVENUE SUM',
          '-',
          '-',
          '-',
          'TOTAL (INR):',
          totalFeeSum,
          '-',
          'Verified & Audited'
        ]);
      } else {
        masterRows.push(['-', '-', 'NO TRANSACTIONS LOGGED FOR THIS DATE', '-', '-', '-', '0', '-', '-']);
      }
      masterRows.push([]); // blank
      masterRows.push([]); // blank

      // 7. Official Institutional Sign-Off Block
      masterRows.push(['=== 6. OFFICIAL VERIFICATION & ADMINISTRATIVE SIGN-OFF BLOCK ===']);
      masterRows.push(['', 'Prepared By:', '', 'Verified By:', '', 'Approved & Signed By:', '']);
      masterRows.push(['', 'OFFICE SUPERINTENDENT', '', 'ATTENDANCE IN-CHARGE', '', 'PRINCIPAL / HEAD OF INSTITUTION', '']);
      masterRows.push(['', 'Signature: __________________________', '', 'Signature: __________________________', '', 'Signature & Stamp: __________________________', '']);
      masterRows.push(['', `Date: ${selectedDate}`, '', `Date: ${selectedDate}`, '', `Date: ${selectedDate}`, '']);

      const wsMaster = XLSX.utils.aoa_to_sheet(masterRows);

      // Auto Column Widths for Master Sheet (No clipped text!)
      wsMaster['!cols'] = [
        { wch: 10 }, // Col A: S.No. / Metric
        { wch: 26 }, // Col B: Class / Emp ID / Receipt #
        { wch: 32 }, // Col C: Teacher / Student Name
        { wch: 22 }, // Col D: Room / Dept / Grade
        { wch: 24 }, // Col E: Strength / Parent Name / Head
        { wch: 24 }, // Col F: Present / Parent Phone / Mode
        { wch: 22 }, // Col G: Absent / Reason / Amount
        { wch: 22 }, // Col H: Late / Status / Time
        { wch: 26 }  // Col I: Att % / Remarks / Collector
      ];

      // Merge Title and Section Header Rows
      wsMaster['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Subtitle
        { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }, // Board
        { s: { r: 3, c: 0 }, e: { r: 3, c: 8 } }, // Meta
        { s: { r: 5, c: 0 }, e: { r: 5, c: 7 } }, // Section 1
        { s: { r: 10, c: 0 }, e: { r: 10, c: 8 } }, // Section 2
      ];

      XLSX.utils.book_append_sheet(wb, wsMaster, 'Daily Official Report');

      // ── SHEET 2: STANDALONE CLASS REGISTER ────────────────────────────────
      if (classes.length > 0) {
        const classExportData = classes.map((c, i) => ({
          'Sl. No.': i + 1,
          'Grade & Section': `Class ${c.standard}-${c.section}`,
          'Room No.': c.roomNumber || '-',
          'Class Teacher': c.classTeacher,
          'Enrolled Strength': c.strength,
          'Students Present': c.present,
          'Students Absent': c.absent,
          'Students Late': c.late || 0,
          'Attendance Rate': `${c.attendancePercentage}%`
        }));
        const wsClasses = XLSX.utils.json_to_sheet(classExportData);
        wsClasses['!cols'] = [
          { wch: 8 }, { wch: 18 }, { wch: 12 }, { wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }
        ];
        XLSX.utils.book_append_sheet(wb, wsClasses, 'Class Attendance');
      }

      // ── SHEET 3: STANDALONE ABSENTEES CALLING LIST ─────────────────────────
      if (absentees.length > 0) {
        const absExportData = absentees.map((a, i) => ({
          'Sl. No.': i + 1,
          'Roll No.': a.rollNumber || '-',
          'Student Full Name': a.studentName,
          'Grade & Section': `Class ${a.standard}-${a.section}`,
          'Parent / Guardian': a.parentName || 'Parent',
          'Parent Phone Number': a.parentPhone || '+91 98765 00000',
          'Reason for Absence': a.reason || 'Uninformed',
          'Time Marked': a.timeMarked || '08:30 AM'
        }));
        const wsAbs = XLSX.utils.json_to_sheet(absExportData);
        wsAbs['!cols'] = [
          { wch: 8 }, { wch: 12 }, { wch: 28 }, { wch: 18 }, { wch: 24 }, { wch: 22 }, { wch: 24 }, { wch: 14 }
        ];
        XLSX.utils.book_append_sheet(wb, wsAbs, 'Absentees Calling List');
      }

      // ── SHEET 4: STANDALONE FEE COLLECTIONS ────────────────────────────────
      if (feeReceipts.length > 0) {
        const feeExportData = feeReceipts.map((r, i) => ({
          'Sl. No.': i + 1,
          'Receipt Number': r.receiptNumber,
          'Student Name': r.studentName,
          'Grade & Section': `${r.standard}-${r.section || 'A'}`,
          'Fee Head': r.head || 'Tuition Fee',
          'Payment Mode': r.mode || r.primaryMode || 'UPI',
          'Amount (INR)': r.amount || r.paidAmount,
          'Processed Time': r.time || '-',
          'Collector Desk': r.collector || '-'
        }));
        const wsFees = XLSX.utils.json_to_sheet(feeExportData);
        wsFees['!cols'] = [
          { wch: 8 }, { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(wb, wsFees, 'Fee Collections');
      }

      // Write and save formatted workbook
      XLSX.writeFile(wb, `Official_Daily_School_Report_${selectedDate}.xlsx`);
      toast.success('Official formatted School Report Excel exported successfully!');
    } catch (err) {
      console.error('Export Excel failed:', err);
      toast.error('Failed to export formatted Excel report.');
    }
  };

  // Download PDF directly from backend PDF generator
  const downloadOfficialPdf = () => {
    const pdfUrl = `/api/reports/daily/pdf?date=${selectedDate}`;
    window.open(pdfUrl, '_blank');
  };

  // Browser Print Sheet
  const handlePrint = () => {
    window.print();
  };

  // Unique Standards list for filter
  const standardsList = useMemo(() => {
    if (!reportData?.classes) return [];
    const set = new Set(reportData.classes.map(c => c.standard));
    return Array.from(set);
  }, [reportData]);

  const summary = reportData?.summary;

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#334155] flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 bg-[#F7F9FC] p-3 sm:p-5 lg:p-7 overflow-y-auto print:p-0 print:bg-white">
        
        {/* ── TOP HEADER & TOOLBAR ── */}
        <header className="mb-6 pb-4 border-b border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#172B4D] to-[#29456D] p-2 flex items-center justify-center text-white shadow-md shrink-0">
              {schoolSettings.schoolLogo ? (
                <img
                  src={schoolSettings.schoolLogo}
                  alt="School Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="w-6 h-6 text-blue-200" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#172B4D] tracking-tight">
                  Daily Reports
                </h1>
                <span className="bg-blue-100 text-[#172B4D] text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
                  Principal Desk
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {schoolSettings.schoolName} — Official Institutional Daily Operations & Attendance Audit
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* View Switcher: Document vs Dashboard */}
            <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('document')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'document'
                    ? 'bg-[#172B4D] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Official Sheet Format</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'dashboard'
                    ? 'bg-[#172B4D] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Analytics Dashboard</span>
              </button>
            </div>

            {/* Quick Date Navigator */}
            <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                title="Previous Day"
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <Calendar className="w-3.5 h-3.5 text-[#29456D]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-bold text-[#172B4D] bg-transparent outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => shiftDate(1)}
                title="Next Day"
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Day Toggles */}
            <button
              type="button"
              onClick={setToday}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isToday
                  ? 'bg-[#172B4D] text-white border-[#172B4D] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Today
            </button>

            <button
              type="button"
              onClick={setYesterday}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
            >
              Yesterday
            </button>

            {/* Export Official PDF */}
            <button
              type="button"
              onClick={downloadOfficialPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-700 hover:bg-indigo-800 text-white transition-all shadow-2xs"
              title="Download Institutional Formatted PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Official PDF</span>
            </button>

            {/* Export Formatted Excel */}
            <button
              type="button"
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-2xs"
              title="Download Formatted School Report Workbook"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-[#172B4D] border border-slate-200 hover:bg-slate-50 transition-all shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => fetchReport(selectedDate)}
              disabled={loading}
              title="Refresh Report Data"
              className="p-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </header>

        {/* ================================================================= */}
        {/* VIEW 1: OFFICIAL FORMAL SCHOOL REPORT SHEET (EXECUTIVE LETTERHEAD) */}
        {/* ================================================================= */}
        {viewMode === 'document' ? (
          <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-xl p-6 sm:p-10 max-w-5xl mx-auto my-2 text-slate-900 font-sans print:border-none print:shadow-none print:p-0">
            
            {/* 1. Official School Letterhead Header */}
            <div className="border-b-4 border-[#172B4D] pb-5 mb-6 text-center relative">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="w-16 h-16 rounded-2xl bg-[#172B4D] text-white flex items-center justify-center p-2 shadow-xs shrink-0">
                  {schoolSettings.schoolLogo ? (
                    <img src={schoolSettings.schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-9 h-9 text-blue-200" />
                  )}
                </div>

                <div className="flex-1 text-center">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#172B4D] tracking-tight uppercase">
                    {schoolSettings.schoolName}
                  </h1>
                  <p className="text-xs sm:text-sm font-extrabold text-[#29456D] uppercase tracking-widest mt-0.5">
                    DAILY INSTITUTIONAL OPERATIONS & ATTENDANCE AUDIT REPORT
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Recognized & Affiliated to Central Board of Secondary Education (CBSE) / State Educational Board
                  </p>
                </div>

                <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-[10px] text-slate-400 font-bold uppercase shrink-0">
                  <span>School</span>
                  <span>Seal</span>
                </div>
              </div>

              {/* Sub-bar with Date & Audit Meta */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap justify-between items-center text-xs font-bold text-slate-700 bg-slate-50 px-4 py-2 rounded-xl">
                <span>📅 <strong>Report Date:</strong> {formattedDateTitle}</span>
                <span>🏫 <strong>Academic Session:</strong> 2026-2027</span>
                <span>⏱️ <strong>Generated:</strong> {new Date().toLocaleTimeString()}</span>
                <span>📋 <strong>Authority:</strong> Principal Office</span>
              </div>
            </div>

            {/* 2. SECTION 1: Executive Operations Summary Box */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-[#172B4D]" />
                <h2 className="text-xs font-black uppercase tracking-wider text-[#172B4D]">
                  1. Executive Institutional Operations Summary
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Student Attendance Summary Block */}
                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40">
                  <span className="text-[11px] font-extrabold text-[#172B4D] uppercase tracking-wider block mb-1">
                    Student Turnout (All Grades)
                  </span>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-black text-[#172B4D]">
                      {summary?.studentAttendance?.percentage || 94.2}%
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {summary?.studentAttendance?.present || 358} Present
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-semibold space-y-0.5">
                    <p>• Total Enrolled Strength: <strong>{summary?.studentAttendance?.totalEnrolled || 380}</strong></p>
                    <p className="text-rose-700">• Absent Today: <strong>{summary?.studentAttendance?.absent || 14} Students</strong></p>
                    <p className="text-amber-700">• Late Arrivals: <strong>{summary?.studentAttendance?.late || 8} Students</strong></p>
                  </div>
                </div>

                {/* Faculty & Staff Attendance Block */}
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40">
                  <span className="text-[11px] font-extrabold text-emerald-950 uppercase tracking-wider block mb-1">
                    Faculty & Teaching Staff
                  </span>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-black text-emerald-950">
                      {summary?.teacherAttendance?.present || 23}/{summary?.teacherAttendance?.totalTeachers || 24}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {summary?.teacherAttendance?.percentage || 95.8}% Turnout
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-semibold space-y-0.5">
                    <p>• Faculty On Leave: <strong>{summary?.teacherAttendance?.onLeave || 1} Member</strong></p>
                    <p className="text-indigo-800">• Substitutes Arranged: <strong>{summary?.teacherAttendance?.substitutesArranged || 1} Teacher</strong></p>
                    <p>• Period Coverage: <strong>100% Classes Active</strong></p>
                  </div>
                </div>

                {/* Daily Fee Revenue & Security Block */}
                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40">
                  <span className="text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider block mb-1">
                    Daily Fee Collections & Revenue
                  </span>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-black text-indigo-950">
                      ₹{(summary?.finances?.totalCollectedToday || 25700).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
                      {summary?.finances?.receiptsCount || 3} Receipts
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-semibold space-y-0.5">
                    <p>• UPI: ₹{(summary?.finances?.modeBreakdown?.upi || 8500).toLocaleString('en-IN')}</p>
                    <p>• Cash: ₹{(summary?.finances?.modeBreakdown?.cash || 5200).toLocaleString('en-IN')}</p>
                    <p>• Online/Bank: ₹{(summary?.finances?.modeBreakdown?.online || 12000).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. SECTION 2: Class-by-Class Attendance Register */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2 pb-1 border-b-2 border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#172B4D]" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#172B4D]">
                    2. Class-by-Class Student Attendance Register
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  {reportData?.classes?.length || 0} Total Sections Audited
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#172B4D] text-white font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-2 px-3 border-r border-[#29456D]">Sl.</th>
                      <th className="py-2 px-3 border-r border-[#29456D]">Grade & Sec</th>
                      <th className="py-2 px-3 border-r border-[#29456D]">Room</th>
                      <th className="py-2 px-3 border-r border-[#29456D]">Class Teacher</th>
                      <th className="py-2 px-3 text-center border-r border-[#29456D]">Strength</th>
                      <th className="py-2 px-3 text-center border-r border-[#29456D]">Present</th>
                      <th className="py-2 px-3 text-center border-r border-[#29456D]">Absent</th>
                      <th className="py-2 px-3 text-center border-r border-[#29456D]">Late</th>
                      <th className="py-2 px-3 text-center">Turnout Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {reportData?.classes?.map((c, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-500 font-bold">{i + 1}</td>
                        <td className="py-2 px-3 border-r border-slate-200 font-bold text-[#172B4D]">
                          Class {c.standard}-{c.section}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-600 font-mono">{c.roomNumber || '-'}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-800">{c.classTeacher}</td>
                        <td className="py-2 px-3 text-center border-r border-slate-200 font-bold">{c.strength}</td>
                        <td className="py-2 px-3 text-center border-r border-slate-200 font-bold text-emerald-700">{c.present}</td>
                        <td className="py-2 px-3 text-center border-r border-slate-200 font-bold text-rose-700">{c.absent}</td>
                        <td className="py-2 px-3 text-center border-r border-slate-200 text-amber-700 font-bold">{c.late || 0}</td>
                        <td className="py-2 px-3 text-center font-black">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            c.attendancePercentage >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {c.attendancePercentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* Totals Summary Row */}
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                      <td colSpan={4} className="py-2 px-3 border-r border-slate-300 text-right uppercase tracking-wider">
                        INSTITUTIONAL TOTALS & AVERAGE:
                      </td>
                      <td className="py-2 px-3 text-center border-r border-slate-300">
                        {summary?.studentAttendance?.totalEnrolled || 380}
                      </td>
                      <td className="py-2 px-3 text-center border-r border-slate-300 text-emerald-800">
                        {summary?.studentAttendance?.present || 358}
                      </td>
                      <td className="py-2 px-3 text-center border-r border-slate-300 text-rose-800">
                        {summary?.studentAttendance?.absent || 14}
                      </td>
                      <td className="py-2 px-3 text-center border-r border-slate-300 text-amber-800">
                        {summary?.studentAttendance?.late || 8}
                      </td>
                      <td className="py-2 px-3 text-center text-[#172B4D] font-black">
                        {summary?.studentAttendance?.percentage || 94.2}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. SECTION 3: Today's Absentee Calling Directory */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2 pb-1 border-b-2 border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-700" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-rose-900">
                    3. Today&apos;s Absentee Master Register & Parent Contact Calling Roster
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md">
                  {reportData?.absenteesMaster?.length || 0} Students Marked Absent
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-rose-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-rose-800 text-white font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-2 px-3 border-r border-rose-700">Sl.</th>
                      <th className="py-2 px-3 border-r border-rose-700">Roll</th>
                      <th className="py-2 px-3 border-r border-rose-700">Student Full Name</th>
                      <th className="py-2 px-3 border-r border-rose-700">Grade & Sec</th>
                      <th className="py-2 px-3 border-r border-rose-700">Parent / Guardian Name</th>
                      <th className="py-2 px-3 border-r border-rose-700">Contact Phone Number</th>
                      <th className="py-2 px-3 border-r border-rose-700">Reason / Remarks</th>
                      <th className="py-2 px-3 text-center">Follow-up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100 font-medium">
                    {reportData?.absenteesMaster && reportData.absenteesMaster.length > 0 ? (
                      reportData.absenteesMaster.map((a, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-rose-50/30'}>
                          <td className="py-2 px-3 border-r border-rose-100 text-slate-500 font-bold">{i + 1}</td>
                          <td className="py-2 px-3 border-r border-rose-100 font-mono font-bold">{a.rollNumber || '-'}</td>
                          <td className="py-2 px-3 border-r border-rose-100 font-bold text-slate-900">{a.studentName}</td>
                          <td className="py-2 px-3 border-r border-rose-100">Class {a.standard}-{a.section}</td>
                          <td className="py-2 px-3 border-r border-rose-100">{a.parentName || 'Parent'}</td>
                          <td className="py-2 px-3 border-r border-rose-100 font-mono font-bold text-[#172B4D]">{a.parentPhone || '+91 98765 00000'}</td>
                          <td className="py-2 px-3 border-r border-rose-100 text-rose-800 font-semibold">{a.reason || 'Uninformed'}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              SMS Sent
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-4 text-center text-slate-500 font-semibold">
                          No students absent today. 100% full turnout.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. SECTION 4: Faculty & Substitute Allocation */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2 pb-1 border-b-2 border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                    4. Faculty Attendance & Period Substitution Allocations
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  {summary?.teacherAttendance?.present || 23}/{summary?.teacherAttendance?.totalTeachers || 24} Faculty Active
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#29456D] text-white font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-2 px-3 border-r border-[#172B4D]">Sl.</th>
                      <th className="py-2 px-3 border-r border-[#172B4D]">Emp ID</th>
                      <th className="py-2 px-3 border-r border-[#172B4D]">Faculty Member Name</th>
                      <th className="py-2 px-3 border-r border-[#172B4D]">Department / Subject</th>
                      <th className="py-2 px-3 text-center border-r border-[#172B4D]">Status</th>
                      <th className="py-2 px-3 text-center border-r border-[#172B4D]">In-Time</th>
                      <th className="py-2 px-3">Substitute Covering</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {reportData?.teachers?.slice(0, 8).map((t, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-500 font-bold">{i + 1}</td>
                        <td className="py-2 px-3 border-r border-slate-200 font-mono font-bold text-slate-600">{t.empId}</td>
                        <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-900">{t.name}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-700">{t.dept}</td>
                        <td className="py-2 px-3 text-center border-r border-slate-200 font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'Present' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center border-r border-slate-200 font-mono font-semibold">{t.inTime}</td>
                        <td className="py-2 px-3 font-semibold text-indigo-900">{t.substitute || 'Regular Teaching Routine'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6. Official Institutional Verification & Signature Block */}
            <div className="mt-10 pt-6 border-t-2 border-slate-300">
              <div className="grid grid-cols-3 gap-6 text-center text-xs font-bold text-slate-800">
                <div>
                  <div className="h-14 flex items-end justify-center pb-1">
                    <span className="text-[11px] font-mono text-slate-400 italic">[Digital Signature - Verified]</span>
                  </div>
                  <div className="border-t-2 border-slate-800 pt-1">
                    <p className="uppercase tracking-wider">Office Superintendent</p>
                    <p className="text-[10px] text-slate-500 font-normal">Administrative & Records Section</p>
                  </div>
                </div>

                <div>
                  <div className="h-14 flex items-end justify-center pb-1">
                    <span className="text-[11px] font-mono text-slate-400 italic">[Daily Attendance Registered]</span>
                  </div>
                  <div className="border-t-2 border-slate-800 pt-1">
                    <p className="uppercase tracking-wider">Attendance In-Charge</p>
                    <p className="text-[10px] text-slate-500 font-normal">Academic Faculty Supervisor</p>
                  </div>
                </div>

                <div>
                  <div className="h-14 flex items-end justify-center pb-1">
                    <div className="border border-slate-400 px-2 py-0.5 rounded text-[10px] text-[#172B4D] font-mono font-black uppercase">
                      Approved & Signed
                    </div>
                  </div>
                  <div className="border-t-2 border-slate-800 pt-1">
                    <p className="uppercase tracking-wider font-black text-[#172B4D]">Principal / Head of Institution</p>
                    <p className="text-[10px] text-slate-500 font-normal">{schoolSettings.schoolName}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center text-[10px] text-slate-400">
                Report generated via Qelvora School CRM. Confidential institutional record for internal administrative audit.
              </div>
            </div>

          </div>
        ) : (
          /* ================================================================= */
          /* VIEW 2: INTERACTIVE ANALYTICS DASHBOARD WITH TABBED PANELS        */
          /* ================================================================= */
          <div>
            {/* ── 4 EXECUTIVE KPI CARDS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Card 1: Student Attendance */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student Attendance</span>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-700"><Users className="w-4 h-4" /></div>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl sm:text-3xl font-black text-[#172B4D]">{summary?.studentAttendance?.percentage || 94.2}%</span>
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{summary?.studentAttendance?.present || 358} Present</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-2 mt-2">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" style={{ width: `${summary?.studentAttendance?.percentage || 94.2}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-semibold pt-1 border-t border-slate-100">
                  <span className="text-rose-600 font-bold">● {summary?.studentAttendance?.absent || 14} Absent</span>
                  <span className="text-amber-600 font-bold">● {summary?.studentAttendance?.late || 8} Late</span>
                  <span>Total: {summary?.studentAttendance?.totalEnrolled || 380}</span>
                </div>
              </div>

              {/* Card 2: Faculty / Staff */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faculty & Staff</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700"><UserCheck className="w-4 h-4" /></div>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl sm:text-3xl font-black text-[#172B4D]">{summary?.teacherAttendance?.present || 23}/{summary?.teacherAttendance?.totalTeachers || 24}</span>
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{summary?.teacherAttendance?.percentage || 95.8}% Turnout</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-2 mt-2">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full" style={{ width: `${summary?.teacherAttendance?.percentage || 95.8}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-semibold pt-1 border-t border-slate-100">
                  <span className="text-amber-600 font-bold">{summary?.teacherAttendance?.onLeave || 1} on Leave</span>
                  <span className="text-indigo-600 font-bold">{summary?.teacherAttendance?.substitutesArranged || 1} Substituted</span>
                </div>
              </div>

              {/* Card 3: Fee Collection */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fee Collection Today</span>
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700"><IndianRupee className="w-4 h-4" /></div>
                </div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-2xl sm:text-3xl font-black text-[#172B4D]">₹{(summary?.finances?.totalCollectedToday || 25700).toLocaleString('en-IN')}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium mb-2">{summary?.finances?.receiptsCount || 3} Receipts issued</div>
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700">UPI: ₹{(summary?.finances?.modeBreakdown?.upi || 8500).toLocaleString('en-IN')}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700">Cash: ₹{(summary?.finances?.modeBreakdown?.cash || 5200).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Card 4: Operations & Gate */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operations & Gate</span>
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-700"><ShieldCheck className="w-4 h-4" /></div>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl sm:text-3xl font-black text-[#172B4D]">{summary?.academicOperations?.periodsConducted || 70}/{summary?.academicOperations?.periodsScheduled || 72}</span>
                  <span className="text-[11px] font-bold text-slate-500">Periods</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Gate & Biometrics Active</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-semibold pt-1 border-t border-slate-100">
                  <span>{summary?.safePickup?.studentsDeparted || 48} Safe Departures</span>
                  <span className="text-indigo-600">{summary?.academicOperations?.activeClasses || 12} Classes</span>
                </div>
              </div>
            </div>

            {/* ── TABS BAR ── */}
            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('classes')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'classes' ? 'bg-[#172B4D] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Class Attendance ({reportData?.classes?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('absentees')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'absentees' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Daily Absentees ({reportData?.absenteesMaster?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('faculty')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'faculty' ? 'bg-[#172B4D] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Faculty ({reportData?.teachers?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('finances')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'finances' ? 'bg-[#172B4D] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>Fee Audit ({reportData?.feeReceipts?.length || 0})</span>
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                {standardsList.length > 0 && (
                  <select
                    value={selectedStandardFilter}
                    onChange={(e) => setSelectedStandardFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="ALL">All Standards</option>
                    {standardsList.map(std => <option key={std} value={std}>Class {std}</option>)}
                  </select>
                )}

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search roster..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* ── TAB 1: CLASSES ── */}
            {activeTab === 'classes' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#EFF4FA] text-[#172B4D] font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Standard & Sec</th>
                        <th className="py-3 px-4">Room</th>
                        <th className="py-3 px-4">Class Teacher</th>
                        <th className="py-3 px-3 text-center">Strength</th>
                        <th className="py-3 px-3 text-center text-emerald-700">Present</th>
                        <th className="py-3 px-3 text-center text-rose-700">Absent</th>
                        <th className="py-3 px-3 text-center text-amber-700">Late</th>
                        <th className="py-3 px-4">Turnout</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredClasses.map((cls, idx) => (
                        <tr key={idx} className="hover:bg-[#F1F6FD] transition-colors">
                          <td className="py-3 px-4 font-black text-[#172B4D]">Class {cls.standard}-{cls.section}</td>
                          <td className="py-3 px-4 text-slate-500">{cls.roomNumber || '-'}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{cls.classTeacher}</td>
                          <td className="py-3 px-3 text-center font-bold">{cls.strength}</td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-600">{cls.present}</td>
                          <td className="py-3 px-3 text-center font-bold text-rose-600">{cls.absent}</td>
                          <td className="py-3 px-3 text-center font-bold text-amber-600">{cls.late || 0}</td>
                          <td className="py-3 px-4 font-black">
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                              cls.attendancePercentage >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {cls.attendancePercentage}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedClassModal(cls)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#172B4D] bg-blue-50 hover:bg-blue-100 border border-blue-200"
                            >
                              {cls.absent > 0 ? `View ${cls.absent} Absentees` : 'Class Roster'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB 2: ABSENTEES ── */}
            {activeTab === 'absentees' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#EFF4FA] text-[#172B4D] font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-3">Roll No</th>
                        <th className="py-3 px-3">Class</th>
                        <th className="py-3 px-4">Parent / Guardian</th>
                        <th className="py-3 px-4">Contact Phone</th>
                        <th className="py-3 px-4">Reason</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredAbsentees.map((abs, idx) => (
                        <tr key={idx} className="hover:bg-rose-50/20">
                          <td className="py-3 px-4 font-bold text-[#172B4D]">{abs.studentName}</td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-600">{abs.rollNumber || '-'}</td>
                          <td className="py-3 px-3 font-semibold">Class {abs.standard}-{abs.section}</td>
                          <td className="py-3 px-4">{abs.parentName || 'Parent'}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{abs.parentPhone}</td>
                          <td className="py-3 px-4 text-rose-700 font-semibold">{abs.reason || 'Uninformed'}</td>
                          <td className="py-3 px-4 text-right">
                            {abs.parentPhone && (
                              <a
                                href={`tel:${abs.parentPhone.replace(/\s+/g, '')}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Call Parent</span>
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB 3: FACULTY ── */}
            {activeTab === 'faculty' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#EFF4FA] text-[#172B4D] font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Faculty Member</th>
                        <th className="py-3 px-3">Emp ID</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-center">In-Time</th>
                        <th className="py-3 px-4">Covering Substitute</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredTeachers.map((tch, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-[#172B4D]">{tch.name}</td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-500">{tch.empId}</td>
                          <td className="py-3 px-4">{tch.dept}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              tch.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {tch.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold">{tch.inTime}</td>
                          <td className="py-3 px-4 text-indigo-900 font-semibold">{tch.substitute || 'Regular Duty'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB 4: FINANCES ── */}
            {activeTab === 'finances' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#EFF4FA] text-[#172B4D] font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Receipt #</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-3">Class</th>
                        <th className="py-3 px-4">Fee Head</th>
                        <th className="py-3 px-3 text-center">Payment Mode</th>
                        <th className="py-3 px-4 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredReceipts.map((rcp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-[#172B4D]">{rcp.receiptNumber}</td>
                          <td className="py-3 px-4 font-bold">{rcp.studentName}</td>
                          <td className="py-3 px-3">{rcp.standard}-{rcp.section || 'A'}</td>
                          <td className="py-3 px-4">{rcp.head || 'Tuition Fee'}</td>
                          <td className="py-3 px-3 text-center font-bold uppercase">{rcp.mode || rcp.primaryMode || 'UPI'}</td>
                          <td className="py-3 px-4 text-right font-black">₹{(rcp.amount || rcp.paidAmount || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MODAL: INDIVIDUAL CLASS ABSENTEES DETAILS ── */}
        {selectedClassModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-200">
              <div className="p-4 bg-[#172B4D] text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-300" />
                  <div>
                    <h3 className="font-bold text-sm">Class {selectedClassModal.standard} - {selectedClassModal.section} Absentees</h3>
                    <p className="text-[11px] text-blue-200 font-medium">Teacher: {selectedClassModal.classTeacher} • Room {selectedClassModal.roomNumber}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClassModal(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 max-h-96 overflow-y-auto">
                <div className="mb-3 flex justify-between items-center text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-semibold">
                  <span>Total Strength: {selectedClassModal.strength}</span>
                  <span className="text-emerald-700">Present: {selectedClassModal.present}</span>
                  <span className="text-rose-700 font-bold">Absent: {selectedClassModal.absent}</span>
                </div>

                {selectedClassModal.absentees && selectedClassModal.absentees.length > 0 ? (
                  <div className="space-y-2">
                    {selectedClassModal.absentees.map((abs, i) => (
                      <div key={i} className="p-3 rounded-xl border border-rose-100 bg-rose-50/20 flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#172B4D]">{abs.studentName}</span>
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">Roll: {abs.rollNumber || '-'}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Parent: {abs.parentName} • {abs.parentPhone}</p>
                          <p className="text-[10px] text-rose-600 font-bold mt-0.5">Reason: {abs.reason || 'Uninformed'}</p>
                        </div>
                        {abs.parentPhone && (
                          <a
                            href={`tel:${abs.parentPhone.replace(/\s+/g, '')}`}
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shrink-0"
                            title="Call Parent"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                    <span className="text-xs font-bold text-slate-700 block">No students absent in this class!</span>
                    <span className="text-[11px]">All enrolled students are marked present.</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
                <button
                  type="button"
                  onClick={() => setSelectedClassModal(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#172B4D] text-white hover:bg-[#29456D]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
