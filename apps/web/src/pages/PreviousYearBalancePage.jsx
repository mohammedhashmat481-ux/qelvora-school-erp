import React, { useState, useEffect } from 'react';
import {
  Wallet,
  IndianRupee,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  FileText,
  Printer,
  Trash2,
  Edit,
  History,
  X,
  CreditCard,
  Building,
  User,
  Calendar,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getPreviousBalances,
  getPreviousBalanceSummary,
  getEligibleStudents,
  createPreviousBalance,
  updatePreviousBalance,
  recordPreviousBalancePayment,
  deletePreviousBalance
} from '../services/previousBalanceService';

const CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
const SECTIONS = ['A', 'B', 'C', 'D'];

export default function PreviousYearBalancePage() {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    totalStudents: 0,
    totalOpening: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    countPending: 0,
    countPartial: 0,
    countPaid: 0,
    recoveryRate: 0
  });

  // Filters
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [academicYear, setAcademicYear] = useState('2026–2027');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Active student selection for modals
  const [activeRecord, setActiveRecord] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Add Modal Form State
  const [studentsList, setStudentsList] = useState([]);
  const [addForm, setAddForm] = useState({
    studentId: '',
    studentName: '',
    rollNumber: '',
    admissionNumber: '',
    standard: '10th',
    section: 'A',
    academicYear: '2026–2027',
    previousYear: '2025–2026',
    openingBalance: '',
    remarks: 'Previous year fee arrears'
  });

  // Pay Modal Form State
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentMode: 'Cash',
    transactionRef: '',
    remarks: 'Partial fee clearance'
  });

  // Edit Modal Form State
  const [editForm, setEditForm] = useState({
    openingBalance: '',
    previousYear: '',
    remarks: ''
  });

  useEffect(() => {
    loadData();
    loadSummary();
  }, [selectedClass, selectedSection, selectedStatus, searchQuery, academicYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getPreviousBalances({
        standard: selectedClass,
        section: selectedSection,
        status: selectedStatus,
        search: searchQuery,
        academicYear
      });
      if (res?.success) {
        setRecords(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load previous balances');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await getPreviousBalanceSummary({ academicYear });
      if (res?.success) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch available students when opening Add Modal
  const openAddModal = async () => {
    try {
      const res = await getEligibleStudents({ standard: addForm.standard, section: addForm.section });
      if (res?.success) {
        setStudentsList(res.data || []);
        if (res.data?.length > 0) {
          const first = res.data[0];
          setAddForm(prev => ({
            ...prev,
            studentId: first.id,
            studentName: first.name,
            rollNumber: first.rollNumber || '',
            admissionNumber: first.admissionNumber || ''
          }));
        }
      }
    } catch (err) {
      console.error(err);
    }
    setIsAddModalOpen(true);
  };

  const handleClassChangeInAdd = async (std) => {
    setAddForm(prev => ({ ...prev, standard: std }));
    try {
      const res = await getEligibleStudents({ standard: std, section: addForm.section });
      if (res?.success && res.data?.length > 0) {
        setStudentsList(res.data);
        const first = res.data[0];
        setAddForm(prev => ({
          ...prev,
          studentId: first.id,
          studentName: first.name,
          rollNumber: first.rollNumber || '',
          admissionNumber: first.admissionNumber || ''
        }));
      } else {
        setStudentsList([]);
        setAddForm(prev => ({ ...prev, studentId: '', studentName: '', rollNumber: '', admissionNumber: '' }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStudentSelect = (e) => {
    const studentId = e.target.value;
    const stdObj = studentsList.find(s => s.id === studentId);
    if (stdObj) {
      setAddForm(prev => ({
        ...prev,
        studentId: stdObj.id,
        studentName: stdObj.name,
        rollNumber: stdObj.rollNumber || '',
        admissionNumber: stdObj.admissionNumber || ''
      }));
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!addForm.openingBalance || Number(addForm.openingBalance) <= 0) {
      toast.error('Please enter a valid balance amount');
      return;
    }
    try {
      const res = await createPreviousBalance(addForm);
      if (res?.success) {
        toast.success('Previous year balance recorded successfully');
        setIsAddModalOpen(false);
        setAddForm({
          studentId: '',
          studentName: '',
          rollNumber: '',
          admissionNumber: '',
          standard: '10th',
          section: 'A',
          academicYear: '2026–2027',
          previousYear: '2025–2026',
          openingBalance: '',
          remarks: 'Previous year fee arrears'
        });
        loadData();
        loadSummary();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create record');
    }
  };

  const openPayModal = (rec) => {
    setActiveRecord(rec);
    setPayForm({
      amount: rec.outstanding > 0 ? rec.outstanding : '',
      paymentMode: 'Cash',
      transactionRef: '',
      remarks: `Previous balance clearance for ${rec.studentName}`
    });
    setIsPayModalOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payForm.amount || Number(payForm.amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (Number(payForm.amount) > Number(activeRecord.outstanding)) {
      toast.error(`Amount cannot exceed outstanding balance of ₹${activeRecord.outstanding}`);
      return;
    }
    try {
      const res = await recordPreviousBalancePayment(activeRecord.id, payForm);
      if (res?.success) {
        toast.success(res.message || 'Payment recorded successfully');
        setIsPayModalOpen(false);
        setActiveReceipt(res.data?.receipt);
        setIsReceiptModalOpen(true);
        loadData();
        loadSummary();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const openEditModal = (rec) => {
    setActiveRecord(rec);
    setEditForm({
      openingBalance: rec.openingBalance,
      previousYear: rec.previousYear,
      remarks: rec.remarks
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    try {
      const res = await updatePreviousBalance(activeRecord.id, editForm);
      if (res?.success) {
        toast.success('Record updated successfully');
        setIsEditModalOpen(false);
        loadData();
        loadSummary();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update record');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove or waive this previous balance record?')) return;
    try {
      const res = await deletePreviousBalance(id);
      if (res?.success) {
        toast.success('Record removed successfully');
        loadData();
        loadSummary();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete record');
    }
  };

  const openHistoryModal = (rec) => {
    setActiveRecord(rec);
    setIsHistoryModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
      {/* Executive Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/15">
                <Wallet className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-white">Previous Year Balance</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Dedicated Module
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1">
                  Manage carried-forward student arrears, outstanding balances, and historical fee reconciliations
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Academic Year Selector */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15">
              <Calendar className="w-4 h-4 text-indigo-300" />
              <span className="text-xs text-slate-300">Active Session:</span>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                <option value="2026–2027" className="text-slate-900">2026–2027</option>
                <option value="2025–2026" className="text-slate-900">2025–2026</option>
                <option value="all" className="text-slate-900">All Sessions</option>
              </select>
            </div>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Balance</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-sm px-4 py-2.5 rounded-xl border border-white/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Statement</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Arrears Carried</span>
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">₹{summary.totalOpening.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-slate-500 mt-1">Across {summary.totalStudents} student records</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Recovered / Cleared</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-600">₹{summary.totalCollected.toLocaleString('en-IN')}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                {summary.recoveryRate}% Recovery Rate
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Remaining Balance</span>
            <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-600">₹{summary.totalOutstanding.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-slate-500 mt-1">{summary.countPending} Pending • {summary.countPartial} Partial</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Settled Accounts</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-indigo-900">{summary.countPaid}</h3>
            <p className="text-xs text-slate-500 mt-1">Students fully settled dues</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, roll number, admission number, or remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Quick Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Classes</option>
              {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>

            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Sections</option>
              {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="partial">Partially Paid</option>
              <option value="paid">Fully Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Previous Year Arrears & Balance Registry</h3>
            <p className="text-xs text-slate-500 mt-0.5">Showing {records.length} records matching current criteria</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">Click Collect to process balance receipts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Student Details</th>
                <th className="py-3 px-3">Class & Section</th>
                <th className="py-3 px-3">Prior Session</th>
                <th className="py-3 px-3 text-right">Carried Arrears</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right">Outstanding</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
                    <p className="text-xs font-semibold mt-2">Loading previous balances...</p>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <Wallet className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-slate-600 mt-2">No previous balances found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Use "Add Balance" to register carried forward student dues</p>
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const isPaid = r.status === 'Paid';
                  const isPartial = r.status === 'Partial';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {r.studentName ? r.studentName.charAt(0) : 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer">
                              {r.studentName}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>Roll: <strong className="text-slate-700">{r.rollNumber || 'N/A'}</strong></span>
                              <span>•</span>
                              <span>Adm: {r.admissionNumber || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800">
                          {r.standard} - {r.section}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-xs font-semibold text-slate-600">
                        {r.previousYear}
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                        ₹{Number(r.openingBalance || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-emerald-600">
                        ₹{Number(r.paidAmount || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-3 text-right font-black">
                        <span className={Number(r.outstanding || 0) > 0 ? 'text-rose-600' : 'text-slate-400'}>
                          ₹{Number(r.outstanding || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPartial
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isPaid ? <CheckCircle2 className="w-3 h-3" /> : isPartial ? <Clock className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {r.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-[200px] truncate" title={r.remarks}>
                        {r.remarks || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {r.outstanding > 0 ? (
                            <button
                              onClick={() => openPayModal(r)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
                              title="Collect Payment"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Collect</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                              Cleared
                            </span>
                          )}

                          <button
                            onClick={() => openHistoryModal(r)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Payment Receipts & History"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openEditModal(r)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD PREVIOUS BALANCE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Add Previous Year Balance</h3>
                <p className="text-xs text-indigo-200 mt-0.5">Record carried forward arrears from prior academic session</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Class</label>
                  <select
                    value={addForm.standard}
                    onChange={(e) => handleClassChangeInAdd(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Section</label>
                  <select
                    value={addForm.section}
                    onChange={(e) => setAddForm(prev => ({ ...prev, section: e.target.value }))}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Student</label>
                {studentsList.length > 0 ? (
                  <select
                    value={addForm.studentId}
                    onChange={handleStudentSelect}
                    className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {studentsList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Roll: {s.rollNumber || 'N/A'}, Adm: {s.admissionNumber || 'N/A'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-medium border border-amber-200">
                    No active students enrolled in Class {addForm.standard}-{addForm.section}. You can type student name below:
                  </div>
                )}
              </div>

              {studentsList.length === 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Student Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter student name"
                    value={addForm.studentName}
                    onChange={(e) => setAddForm(prev => ({ ...prev, studentName: e.target.value }))}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Prior Session (Dues From)</label>
                  <input
                    type="text"
                    value={addForm.previousYear}
                    onChange={(e) => setAddForm(prev => ({ ...prev, previousYear: e.target.value }))}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="2025–2026"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Carried Balance Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 8500"
                    value={addForm.openingBalance}
                    onChange={(e) => setAddForm(prev => ({ ...prev, openingBalance: e.target.value }))}
                    className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Remarks / Dues Breakdown</label>
                <textarea
                  rows="2"
                  value={addForm.remarks}
                  onChange={(e) => setAddForm(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="e.g. Term 2 tuition & lab fee unpaid"
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-900 hover:bg-indigo-800 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: COLLECT PAYMENT */}
      {isPayModalOpen && activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-950 to-blue-900 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Collect Previous Balance</h3>
                <p className="text-xs text-indigo-200 mt-0.5">Generate receipt and update carried dues</p>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{activeRecord.studentName}</div>
                  <div className="text-xs text-slate-500">{activeRecord.standard}-{activeRecord.section} • Roll: {activeRecord.rollNumber || 'N/A'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Outstanding</div>
                  <div className="text-base font-black text-rose-600">₹{activeRecord.outstanding.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Paying Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={activeRecord.outstanding}
                  value={payForm.amount}
                  onChange={(e) => setPayForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full text-base font-black px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPayForm(prev => ({ ...prev, amount: activeRecord.outstanding }))}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Full Balance (₹{activeRecord.outstanding})
                  </button>
                  {activeRecord.outstanding > 2000 && (
                    <button
                      type="button"
                      onClick={() => setPayForm(prev => ({ ...prev, amount: Math.round(activeRecord.outstanding / 2) }))}
                      className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      50% Balance (₹{Math.round(activeRecord.outstanding / 2)})
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Payment Mode</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Cash', 'UPI', 'Card', 'Cheque'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayForm(prev => ({ ...prev, paymentMode: m }))}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        payForm.paymentMode === m
                          ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reference / UTR / Note</label>
                <input
                  type="text"
                  placeholder={payForm.paymentMode === 'UPI' ? 'e.g. UPI / UTR No' : 'e.g. Cash Voucher / Cheque No'}
                  value={payForm.transactionRef}
                  onChange={(e) => setPayForm(prev => ({ ...prev, transactionRef: e.target.value }))}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Receipt Remarks</label>
                <input
                  type="text"
                  value={payForm.remarks}
                  onChange={(e) => setPayForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-900 hover:bg-indigo-800 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Generate Receipt & Collect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PAYMENT RECEIPT SUCCESS */}
      {isReceiptModalOpen && activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden text-center p-6">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-black text-lg text-slate-900">Payment Collected!</h3>
            <p className="text-xs text-slate-500 mt-0.5">Official receipt has been generated successfully</p>

            <div className="my-5 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <strong className="text-slate-800">{activeReceipt.receiptNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <strong className="text-emerald-700 text-sm">₹{activeReceipt.amount?.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mode:</span>
                <span className="font-semibold text-slate-700">{activeReceipt.paymentMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="text-slate-600">{new Date(activeReceipt.paymentDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 text-xs font-bold text-white bg-indigo-900 hover:bg-indigo-800 rounded-xl transition-all cursor-pointer"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="py-2 px-4 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PAYMENT HISTORY */}
      {isHistoryModalOpen && activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Payment History</h3>
                <p className="text-xs text-indigo-200 mt-0.5">{activeRecord.studentName} ({activeRecord.standard}-{activeRecord.section})</p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-slate-50 rounded-xl text-center text-xs">
                <div>
                  <div className="text-slate-500 font-semibold">Total Arrears</div>
                  <div className="font-black text-slate-800 mt-0.5">₹{activeRecord.openingBalance?.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div className="text-slate-500 font-semibold">Total Paid</div>
                  <div className="font-black text-emerald-600 mt-0.5">₹{activeRecord.paidAmount?.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div className="text-slate-500 font-semibold">Outstanding</div>
                  <div className="font-black text-rose-600 mt-0.5">₹{activeRecord.outstanding?.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(!activeRecord.payments || activeRecord.payments.length === 0) ? (
                  <p className="text-center py-6 text-xs text-slate-400 font-medium">No payments recorded yet for this balance</p>
                ) : (
                  activeRecord.payments.map((p, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{p.receiptNumber}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {new Date(p.paymentDate).toLocaleDateString()} via <strong className="text-slate-700">{p.paymentMode}</strong>
                          {p.transactionRef && ` • Ref: ${p.transactionRef}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-emerald-600 text-sm">₹{p.amount?.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-slate-400">{p.collectedBy}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT RECORD */}
      {isEditModalOpen && activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Edit Previous Balance</h3>
                <p className="text-xs text-slate-400 mt-0.5">{activeRecord.studentName}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Carried Balance Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editForm.openingBalance}
                  onChange={(e) => setEditForm(prev => ({ ...prev, openingBalance: e.target.value }))}
                  className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Prior Session</label>
                <input
                  type="text"
                  value={editForm.previousYear}
                  onChange={(e) => setEditForm(prev => ({ ...prev, previousYear: e.target.value }))}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Remarks</label>
                <textarea
                  rows="2"
                  value={editForm.remarks}
                  onChange={(e) => setEditForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-900 hover:bg-indigo-800 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
