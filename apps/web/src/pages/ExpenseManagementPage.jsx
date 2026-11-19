import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Sidebar from '../components/ui/Sidebar';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  FileBarChart,
  Tag,
  IndianRupee,
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  Trash2,
  Edit,
  Eye,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Clock,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Building,
  Upload,
  X,
  History,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Wallet
} from 'lucide-react';
import {
  getExpenseDashboard,
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  getDailyExpenseReport,
  getWeeklyExpenseReport,
  getMonthlyExpenseReport,
  getCustomExpenseReport,
  getExcelExportUrl,
  getPdfExportUrl
} from '../services/expenseService';

// Helper to convert number to Indian words
function numberToIndianWords(num) {
  if (!num || isNaN(num) || num <= 0) return '';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + Math.floor(num)).substr(-9);
  const crore = parseInt(n.substr(0, 2), 10);
  const lakh = parseInt(n.substr(2, 2), 10);
  const thousand = parseInt(n.substr(4, 2), 10);
  const hundred = parseInt(n.substr(6, 1), 10);
  const rest = parseInt(n.substr(7, 2), 10);

  let str = '';
  if (crore > 0) str += (crore < 20 ? a[crore] : b[Math.floor(crore / 10)] + ' ' + a[crore % 10]) + 'Crore ';
  if (lakh > 0) str += (lakh < 20 ? a[lakh] : b[Math.floor(lakh / 10)] + ' ' + a[lakh % 10]) + 'Lakh ';
  if (thousand > 0) str += (thousand < 20 ? a[thousand] : b[Math.floor(thousand / 10)] + ' ' + a[thousand % 10]) + 'Thousand ';
  if (hundred > 0) str += a[hundred] + 'Hundred ';
  if (rest > 0) str += (rest < 20 ? a[rest] : b[Math.floor(rest / 10)] + ' ' + a[rest % 10]);

  return (str.trim() || 'Zero') + ' Rupees Only';
}

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'];

export default function ExpenseManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Active tab: 'dashboard' | 'add' | 'all' | 'reports' | 'categories'
  const activeTab = searchParams.get('tab') || 'dashboard';

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // ── Dashboard State ──
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // ── Categories State ──
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: '#3B82F6' });

  // ── All Expenses State ──
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [filters, setFilters] = useState({
    search: '',
    category: 'All',
    paymentMethod: 'All',
    startDate: '',
    endDate: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [filteredSummary, setFilteredSummary] = useState({ filteredTotal: 0, count: 0 });

  // ── Add / Edit Form State ──
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: '',
    amount: '',
    paidTo: '',
    paymentMethod: 'Cash',
    description: '',
    referenceNumber: '',
    receipt: null
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editReason, setEditReason] = useState('');
  const fileInputRef = useRef(null);

  // ── View / Audit Modal State ──
  const [viewExpense, setViewExpense] = useState(null);
  const [deleteModalExpense, setDeleteModalExpense] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Reports State ──
  const [reportType, setReportType] = useState('daily'); // 'daily' | 'weekly' | 'monthly' | 'custom'
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportWeekStart, setReportWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    return mon.toISOString().slice(0, 10);
  });
  const [reportWeekEnd, setReportWeekEnd] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const sun = new Date(d);
    sun.setDate(d.getDate() + diff + 6);
    return sun.toISOString().slice(0, 10);
  });
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0, 10));
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // ── Fetch Initial Data ──
  const fetchDashboard = async () => {
    try {
      setLoadingDashboard(true);
      const res = await getExpenseDashboard();
      if (res.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load expense dashboard');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const fetchCategoriesList = async () => {
    try {
      setLoadingCategories(true);
      const res = await getExpenseCategories(true);
      if (res.success) {
        setCategories(res.data);
        if (!formData.category && res.data.length > 0) {
          const firstActive = res.data.find(c => c.isActive) || res.data[0];
          setFormData(prev => ({ ...prev, category: firstActive.name }));
        }
      }
    } catch (err) {
      console.warn('Error fetching categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchExpensesList = async (page = 1) => {
    try {
      setLoadingExpenses(true);
      const params = {
        page,
        limit: pagination.limit,
        search: filters.search,
        category: filters.category,
        paymentMethod: filters.paymentMethod,
        startDate: filters.startDate,
        endDate: filters.endDate,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };
      const res = await getExpenses(params);
      if (res.success) {
        setExpenses(res.data.expenses);
        setPagination(res.data.pagination);
        setFilteredSummary(res.data.summary);
      }
    } catch (err) {
      toast.error('Failed to load expenses');
    } finally {
      setLoadingExpenses(false);
    }
  };

  const fetchReport = async () => {
    try {
      setLoadingReport(true);
      let res;
      if (reportType === 'daily') {
        res = await getDailyExpenseReport(reportDate);
      } else if (reportType === 'weekly') {
        res = await getWeeklyExpenseReport(reportWeekStart, reportWeekEnd);
      } else if (reportType === 'monthly') {
        res = await getMonthlyExpenseReport(reportMonth, reportYear);
      } else {
        res = await getCustomExpenseReport({
          startDate: customStart,
          endDate: customEnd
        });
      }
      if (res?.success) {
        setReportData(res.data);
      }
    } catch (err) {
      toast.error('Failed to generate report');
    } finally {
      setLoadingReport(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDashboard();
    fetchCategoriesList();
  }, []);

  // Tab switch effect
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
    } else if (activeTab === 'all') {
      fetchExpensesList(1);
    } else if (activeTab === 'categories') {
      fetchCategoriesList();
    } else if (activeTab === 'reports') {
      fetchReport();
    }
  }, [activeTab]);

  // Debounced filter search for expenses list
  useEffect(() => {
    if (activeTab === 'all') {
      const timer = setTimeout(() => {
        fetchExpensesList(1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [filters]);

  // ── Form Handlers ──
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!formData.category) {
      toast.error('Please select an expense category');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }
    if (!formData.paidTo.trim()) {
      toast.error('Please enter Vendor / Person Name');
      return;
    }

    try {
      setSubmittingExpense(true);
      const postData = new FormData();
      postData.append('date', formData.date);
      postData.append('category', formData.category);
      postData.append('amount', formData.amount);
      postData.append('paidTo', formData.paidTo);
      postData.append('paymentMethod', formData.paymentMethod);
      postData.append('description', formData.description);
      postData.append('referenceNumber', formData.referenceNumber);
      if (formData.receipt) {
        postData.append('receipt', formData.receipt);
      }

      if (editingExpense) {
        postData.append('editReason', editReason || 'Expense updated');
        const res = await updateExpense(editingExpense._id, postData);
        if (res.success) {
          toast.success('Expense updated successfully');
          setEditingExpense(null);
          setEditReason('');
          fetchExpensesList(pagination.page);
          fetchDashboard();
          setActiveTab('all');
        }
      } else {
        const res = await createExpense(postData);
        if (res.success) {
          toast.success(res.message || 'Expense recorded successfully!');
          // Reset form
          setFormData({
            date: new Date().toISOString().slice(0, 10),
            category: categories.length > 0 ? categories[0].name : '',
            amount: '',
            paidTo: '',
            paymentMethod: 'Cash',
            description: '',
            referenceNumber: '',
            receipt: null
          });
          if (fileInputRef.current) fileInputRef.current.value = '';
          fetchDashboard();
          fetchExpensesList(1);
          setActiveTab('all');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setEditReason('');
    setFormData({
      date: expense.dateString || expense.date?.slice(0, 10),
      category: expense.category,
      amount: expense.amount,
      paidTo: expense.paidTo,
      paymentMethod: expense.paymentMethod,
      description: expense.description || '',
      referenceNumber: expense.referenceNumber || '',
      receipt: null
    });
    setActiveTab('add');
  };

  const handleDeleteExpense = async () => {
    if (!deleteModalExpense) return;
    try {
      setIsDeleting(true);
      const res = await deleteExpense(deleteModalExpense._id, deleteReason);
      if (res.success) {
        toast.success(res.message || 'Expense deleted successfully');
        setDeleteModalExpense(null);
        setDeleteReason('');
        fetchExpensesList(pagination.page);
        fetchDashboard();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Category Handlers ──
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      if (editingCategory) {
        const res = await updateExpenseCategory(editingCategory._id, categoryForm);
        if (res.success) {
          toast.success('Category updated successfully');
          setShowCategoryModal(false);
          setEditingCategory(null);
          fetchCategoriesList();
        }
      } else {
        const res = await createExpenseCategory(categoryForm);
        if (res.success) {
          toast.success('Category created successfully');
          setShowCategoryModal(false);
          setCategoryForm({ name: '', description: '', color: '#3B82F6' });
          fetchCategoriesList();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    try {
      const res = await deleteExpenseCategory(cat._id);
      if (res.success) {
        toast.success('Category removed successfully');
        fetchCategoriesList();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete category');
    }
  };

  const handleToggleCategoryActive = async (cat) => {
    try {
      const res = await updateExpenseCategory(cat._id, { isActive: !cat.isActive });
      if (res.success) {
        toast.success(`Category ${!cat.isActive ? 'activated' : 'deactivated'}`);
        fetchCategoriesList();
      }
    } catch (err) {
      toast.error('Failed to update category status');
    }
  };

  // Print helper for reports
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row bg-[#F8FAFC] font-sans lg:overflow-hidden">
      {/* ERP Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 min-h-0 lg:h-screen lg:overflow-y-auto overflow-x-hidden flex flex-col pb-28 lg:pb-12">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-[#E2E8F0] px-4 md:px-8 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-rose-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold text-[#0F172A] tracking-tight">
                  Expense Management
                </h1>
                <span className="text-[11px] font-semibold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-200">
                  Accounts
                </span>
              </div>
              <p className="text-xs text-[#64748B] hidden sm:block">
                Simple daily expense recording, instant automated totals & audit-ready reports
              </p>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-2">
            {activeTab !== 'add' && (
              <button
                type="button"
                onClick={() => {
                  setEditingExpense(null);
                  setActiveTab('add');
                }}
                className="flex items-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs md:text-sm font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm shadow-slate-900/10 active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Record Expense</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'dashboard') fetchDashboard();
                if (activeTab === 'all') fetchExpensesList(pagination.page);
                if (activeTab === 'reports') fetchReport();
                if (activeTab === 'categories') fetchCategoriesList();
                toast.success('Refreshed data');
              }}
              title="Refresh"
              className="p-2 text-[#64748B] hover:text-[#0F172A] bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Navigation Tabs (Submenu) */}
        <div className="bg-white border-b border-[#E2E8F0] px-4 md:px-8">
          <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2 scrollbar-none">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Expense Dashboard</span>
            </button>

            <button
              onClick={() => {
                setEditingExpense(null);
                setActiveTab('add');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === 'add'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{editingExpense ? 'Edit Expense' : 'Add Expense'}</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === 'all'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>All Expenses</span>
              {dashboardData?.totalTransactions > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {dashboardData.totalTransactions}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === 'reports'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100'
              }`}
            >
              <FileBarChart className="w-4 h-4" />
              <span>Expense Reports</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === 'categories'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Expense Categories</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'categories' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {categories.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Tab Body */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {/* ============================================================== */}
          {/* 1. EXPENSE DASHBOARD TAB */}
          {/* ============================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today's Expense */}
                <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Today's Total</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-[#0F172A]">
                      ₹ {dashboardData ? dashboardData.todayTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1 flex items-center gap-1">
                      <span>{dashboardData?.todayCount || 0} transactions recorded today</span>
                    </p>
                  </div>
                </div>

                {/* This Week's Total */}
                <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">This Week</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-[#0F172A]">
                      ₹ {dashboardData ? dashboardData.weekTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      <span>{dashboardData?.weekCount || 0} transactions this week</span>
                    </p>
                  </div>
                </div>

                {/* This Month's Total */}
                <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">This Month</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-[#0F172A]">
                      ₹ {dashboardData ? dashboardData.monthTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      <span>{dashboardData?.monthCount || 0} transactions this month</span>
                    </p>
                  </div>
                </div>

                {/* Financial Year Total */}
                <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      {dashboardData?.fyLabel || 'Financial Year'}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-[#0F172A]">
                      ₹ {dashboardData ? dashboardData.fyTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      <span>{dashboardData?.totalTransactions || 0} total transactions in FY</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Middle Section: Highest Category Banner & Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Highest Category & Trend Summary */}
                <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                        Top Expense Driver
                      </h2>
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-semibold">
                        Annual Highlight
                      </span>
                    </div>

                    {dashboardData?.highestCategory ? (
                      <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/40 border border-indigo-100 p-4 rounded-xl">
                        <span className="text-xs text-indigo-600 font-semibold">Highest Category</span>
                        <div className="text-xl font-bold text-[#0F172A] mt-1">
                          {dashboardData.highestCategory.category}
                        </div>
                        <div className="text-2xl font-extrabold text-indigo-700 mt-2">
                          ₹ {dashboardData.highestCategory.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-[#64748B]">
                          <span className="font-semibold text-emerald-600">
                            {dashboardData.highestCategory.percentage}%
                          </span>
                          <span>of total school expenditure</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-[#94A3B8] border border-dashed rounded-xl">
                        No expenses recorded for this financial year yet.
                      </div>
                    )}

                    {/* Quick Stat Pill list */}
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between text-xs py-2 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Active Categories</span>
                        <span className="font-bold text-[#0F172A]">{categories.filter(c => c.isActive).length} Categories</span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-2 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Total Transactions</span>
                        <span className="font-bold text-[#0F172A]">{dashboardData?.totalTransactions || 0} Records</span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-2">
                        <span className="text-[#64748B]">Audit Logging</span>
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> 100% Enabled
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('add')}
                    className="mt-6 w-full py-2.5 bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Quick Add New Expense</span>
                  </button>
                </div>

                {/* Category-wise Breakdown Bar List */}
                <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                        Category-wise Breakdown
                      </h2>
                      <p className="text-xs text-[#64748B]">Share of expenditure across school operations</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('all')}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <span>View All</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {dashboardData?.categoryBreakdown && dashboardData.categoryBreakdown.length > 0 ? (
                    <div className="space-y-3.5 mt-4 max-h-[340px] overflow-y-auto pr-1">
                      {dashboardData.categoryBreakdown.slice(0, 7).map((cat, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#0F172A] flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                              {cat.category}
                              <span className="text-[10px] text-[#94A3B8] font-normal">
                                ({cat.count} txns)
                              </span>
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-[#0F172A]">
                                ₹ {cat.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="w-10 text-right text-[11px] font-semibold text-[#64748B]">
                                {cat.percentage}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-rose-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-xs text-[#94A3B8]">
                      No category expense records found.
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly Trend Chart / Representation */}
              {dashboardData?.trendData && dashboardData.trendData.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                        Recent Monthly Trend
                      </h2>
                      <p className="text-xs text-[#64748B]">Total expenditure trend across recent months</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-4">
                    {dashboardData.trendData.map((item, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl text-center">
                        <span className="text-xs font-semibold text-[#64748B] uppercase">{item.label}</span>
                        <div className="text-base font-bold text-[#0F172A] mt-1.5">
                          ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {item.count} record{item.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Transactions Table Preview */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                    Recent Transactions
                  </h2>
                  <button
                    onClick={() => setActiveTab('all')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <span>View all transactions</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">
                        <th className="py-3 px-5">Expense # / Date</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Paid To / Vendor</th>
                        <th className="py-3 px-4">Payment Method</th>
                        <th className="py-3 px-5 text-right">Amount (₹)</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] text-xs">
                      {dashboardData?.recentExpenses && dashboardData.recentExpenses.length > 0 ? (
                        dashboardData.recentExpenses.map((exp) => (
                          <tr key={exp._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="font-semibold text-[#0F172A]">{exp.expenseNumber}</div>
                              <div className="text-[11px] text-[#64748B]">{exp.dateString}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {exp.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-[#1E293B]">
                              {exp.paidTo}
                              {exp.description && (
                                <div className="text-[11px] text-[#64748B] truncate max-w-xs">{exp.description}</div>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-[#334155]">
                                {exp.paymentMethod}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-right font-bold text-[#0F172A]">
                              ₹ {exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => setViewExpense(exp)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-xs text-[#94A3B8]">
                            No expenses recorded yet. Click "Record Expense" to get started!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. ADD / EDIT EXPENSE TAB */}
          {/* ============================================================== */}
          {activeTab === 'add' && (
            <div className="max-w-3xl mx-auto animate-fadeIn">
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <div className="px-6 py-5 border-b border-[#E2E8F0] bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#0F172A]">
                      {editingExpense ? `Edit Expense Record: ${editingExpense.expenseNumber}` : 'Record New Daily Expense'}
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      {editingExpense
                        ? 'Update transaction details. An audit log entry will be created automatically.'
                        : 'Enter the bill or voucher details. Amounts will immediately update reports.'}
                    </p>
                  </div>
                  {editingExpense && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingExpense(null);
                        setFormData({
                          date: new Date().toISOString().slice(0, 10),
                          category: categories.length > 0 ? categories[0].name : '',
                          amount: '',
                          paidTo: '',
                          paymentMethod: 'Cash',
                          description: '',
                          referenceNumber: '',
                          receipt: null
                        });
                      }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveExpense} className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Expense Date */}
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Expense Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all outline-hidden"
                      />
                    </div>

                    {/* Expense Category */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-[#334155]">
                          Expense Category <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(null);
                            setCategoryForm({ name: '', description: '', color: '#3B82F6' });
                            setShowCategoryModal(true);
                          }}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          + New Category
                        </button>
                      </div>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all outline-hidden bg-white"
                      >
                        <option value="">Select Category...</option>
                        {categories
                          .filter((c) => c.isActive || c.name === formData.category)
                          .map((cat) => (
                            <option key={cat._id} value={cat.name}>
                              {cat.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Amount with In-Words display */}
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      Expense Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                        <IndianRupee className="w-4 h-4 text-slate-500" />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full text-sm font-bold pl-9 pr-3.5 py-2.5 rounded-xl border border-[#CBD5E1] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all outline-hidden text-[#0F172A]"
                      />
                    </div>
                    {formData.amount && parseFloat(formData.amount) > 0 && (
                      <p className="text-[11px] font-semibold text-indigo-600 mt-1 italic">
                        ₹ {numberToIndianWords(parseFloat(formData.amount))}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Paid To / Vendor Name */}
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Paid To / Vendor Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bescom, Reliance Fresh, Local Store"
                        value={formData.paidTo}
                        onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                        className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all outline-hidden"
                      />
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Payment Method <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all outline-hidden bg-white"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Reference Number */}
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      Reference / Bill / Voucher Number <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INVOICE-4938, Cheque #004928, UPI/Ref ID"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all outline-hidden"
                    />
                  </div>

                  {/* Description / Purpose */}
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      Description / Purpose of Expense <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      rows="2"
                      placeholder="Brief note on what this expense was for (e.g. Answer papers for Term 1 examination)..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all outline-hidden"
                    />
                  </div>

                  {/* Bill / Receipt Attachment */}
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      Bill or Receipt Attachment <span className="text-slate-400 font-normal">(optional, PDF or Image up to 10MB)</span>
                    </label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error('File size must be under 10MB');
                              e.target.value = '';
                              return;
                            }
                            setFormData({ ...formData, receipt: file });
                          }
                        }}
                        className="hidden"
                        id="receipt-file-input"
                      />
                      <label htmlFor="receipt-file-input" className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-7 h-7 text-indigo-500 mb-1" />
                        <span className="text-xs font-bold text-[#0F172A]">
                          {formData.receipt ? formData.receipt.name : 'Click to select bill image or PDF'}
                        </span>
                        <span className="text-[10px] text-[#64748B] mt-0.5">
                          {formData.receipt
                            ? `${(formData.receipt.size / 1024).toFixed(1)} KB selected`
                            : 'Supports PNG, JPG, JPEG, WebP, PDF'}
                        </span>
                      </label>
                      {formData.receipt && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, receipt: null });
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="mt-2 text-[10px] font-semibold text-rose-600 hover:underline"
                        >
                          Remove attached file
                        </button>
                      )}
                    </div>
                  </div>

                  {/* If editing, ask for edit reason for audit history */}
                  {editingExpense && (
                    <div>
                      <label className="block text-xs font-bold text-amber-700 mb-1">
                        Reason for Modification <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Corrected vendor name / amount typo"
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-amber-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all outline-hidden bg-amber-50/30"
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('all')}
                      className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-[#334155] text-xs font-semibold rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingExpense}
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{submittingExpense ? 'Saving Expense...' : editingExpense ? 'Save Changes' : 'Save Expense'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 3. ALL EXPENSES TABLE TAB */}
          {/* ============================================================== */}
          {activeTab === 'all' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Filter & Search Bar */}
              <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Search */}
                  <div className="relative lg:col-span-2">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search vendor, description, voucher #..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                    />
                  </div>

                  {/* Category Filter */}
                  <div>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-white"
                    >
                      <option value="All">All Categories</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Method Filter */}
                  <div>
                    <select
                      value={filters.paymentMethod}
                      onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-white"
                    >
                      <option value="All">All Payment Methods</option>
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <select
                      value={`${filters.sortBy}-${filters.sortOrder}`}
                      onChange={(e) => {
                        const [sortBy, sortOrder] = e.target.value.split('-');
                        setFilters({ ...filters, sortBy, sortOrder });
                      }}
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-white"
                    >
                      <option value="date-desc">Newest First</option>
                      <option value="date-asc">Oldest First</option>
                      <option value="amount-desc">Highest Amount</option>
                      <option value="amount-asc">Lowest Amount</option>
                    </select>
                  </div>
                </div>

                {/* Date Range Sub-filter */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[#64748B] font-medium">Date Range:</span>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs"
                    />
                    {(filters.startDate || filters.endDate || filters.category !== 'All' || filters.paymentMethod !== 'All' || filters.search) && (
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            search: '',
                            category: 'All',
                            paymentMethod: 'All',
                            startDate: '',
                            endDate: '',
                            sortBy: 'date',
                            sortOrder: 'desc'
                          })
                        }
                        className="text-[11px] font-semibold text-rose-600 hover:underline ml-2"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={getExcelExportUrl({
                        startDate: filters.startDate,
                        endDate: filters.endDate,
                        category: filters.category,
                        paymentMethod: filters.paymentMethod
                      })}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-lg text-xs transition-colors border border-emerald-200"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Export Excel</span>
                    </a>
                    <a
                      href={getPdfExportUrl({
                        startDate: filters.startDate,
                        endDate: filters.endDate,
                        category: filters.category,
                        paymentMethod: filters.paymentMethod
                      })}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold rounded-lg text-xs transition-colors border border-rose-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export PDF</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Filtered Total Bar */}
              <div className="flex items-center justify-between px-2 text-xs text-[#64748B]">
                <div>
                  Showing <span className="font-bold text-[#0F172A]">{expenses.length}</span> of{' '}
                  <span className="font-bold text-[#0F172A]">{pagination.total}</span> records
                </div>
                <div>
                  Filtered Subtotal:{' '}
                  <span className="font-extrabold text-indigo-700 text-sm">
                    ₹ {filteredSummary.filteredTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">
                        <th className="py-3 px-4">Date / Voucher #</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Paid To / Vendor</th>
                        <th className="py-3 px-3">Method</th>
                        <th className="py-3 px-4 text-right">Amount (₹)</th>
                        <th className="py-3 px-3 text-center">Receipt</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] text-xs">
                      {loadingExpenses ? (
                        <tr>
                          <td colSpan="7" className="py-12 text-center text-xs text-[#64748B]">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                            Loading expenses...
                          </td>
                        </tr>
                      ) : expenses.length > 0 ? (
                        expenses.map((exp) => (
                          <tr key={exp._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-[#0F172A]">{exp.expenseNumber}</div>
                              <div className="text-[11px] text-[#64748B]">{exp.dateString}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {exp.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-[#1E293B]">
                              <div>{exp.paidTo}</div>
                              {exp.description && (
                                <div className="text-[11px] text-[#64748B] truncate max-w-xs">{exp.description}</div>
                              )}
                              {exp.referenceNumber && (
                                <div className="text-[10px] text-slate-400">Ref: {exp.referenceNumber}</div>
                              )}
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-[#334155]">
                                {exp.paymentMethod}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-extrabold text-[#0F172A]">
                              ₹ {exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              {exp.receiptUrl ? (
                                <a
                                  href={exp.receiptUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-semibold text-indigo-600 hover:underline"
                                  title={exp.receiptFileName || 'View Bill'}
                                >
                                  View Bill
                                </a>
                              ) : (
                                <span className="text-slate-300 text-[10px]">None</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setViewExpense(exp)}
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="View Details & Audit History"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(exp)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit Expense"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteModalExpense(exp)}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Expense"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="py-12 text-center text-xs text-[#94A3B8]">
                            No matching expenses found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="px-5 py-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                    <span>
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={pagination.page <= 1}
                        onClick={() => fetchExpensesList(pagination.page - 1)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        disabled={pagination.page >= pagination.pages}
                        onClick={() => fetchExpensesList(pagination.page + 1)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 4. EXPENSE REPORTS TAB */}
          {/* ============================================================== */}
          {activeTab === 'reports' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Report Controls Card */}
              <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4 print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Report Type Selector */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setReportType('daily')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        reportType === 'daily' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      Daily Report
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportType('weekly')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        reportType === 'weekly' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      Weekly Report
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportType('monthly')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        reportType === 'monthly' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      Monthly Report
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportType('custom')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        reportType === 'custom' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      Custom Range
                    </button>
                  </div>

                  {/* Actions: Print & Downloads */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-semibold rounded-xl text-xs transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Report</span>
                    </button>
                    <a
                      href={getExcelExportUrl(
                        reportType === 'daily'
                          ? { date: reportDate }
                          : reportType === 'weekly'
                          ? { startDate: reportWeekStart, endDate: reportWeekEnd }
                          : reportType === 'monthly'
                          ? { month: reportMonth, year: reportYear }
                          : { startDate: customStart, endDate: customEnd }
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Excel Export</span>
                    </a>
                    <a
                      href={getPdfExportUrl(
                        reportType === 'daily'
                          ? { date: reportDate }
                          : reportType === 'weekly'
                          ? { startDate: reportWeekStart, endDate: reportWeekEnd }
                          : reportType === 'monthly'
                          ? { month: reportMonth, year: reportYear }
                          : { startDate: customStart, endDate: customEnd }
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>PDF Download</span>
                    </a>
                  </div>
                </div>

                {/* Sub-filters for Period */}
                <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100">
                  {reportType === 'daily' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-[#334155]">Select Date:</label>
                      <input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                  )}

                  {reportType === 'weekly' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-[#334155]">Week Period:</label>
                      <input
                        type="date"
                        value={reportWeekStart}
                        onChange={(e) => setReportWeekStart(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                      <span className="text-slate-400">to</span>
                      <input
                        type="date"
                        value={reportWeekEnd}
                        onChange={(e) => setReportWeekEnd(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                  )}

                  {reportType === 'monthly' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-[#334155]">Month & Year:</label>
                      <select
                        value={reportMonth}
                        onChange={(e) => setReportMonth(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                      >
                        {[
                          'January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'
                        ].map((m, idx) => (
                          <option key={idx} value={idx + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        value={reportYear}
                        onChange={(e) => setReportYear(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                      >
                        {[2024, 2025, 2026, 2027, 2028].map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {reportType === 'custom' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-[#334155]">Date Range:</label>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                      <span className="text-slate-400">to</span>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={fetchReport}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    Generate Report
                  </button>
                </div>
              </div>

              {/* Printable Report Paper Layout */}
              <div className="bg-white p-6 md:p-10 rounded-2xl border border-[#E2E8F0] shadow-sm print:border-none print:shadow-none print:p-0">
                {/* School Header Branding */}
                <div className="text-center pb-6 border-b border-[#E2E8F0]">
                  <h1 className="text-xl md:text-2xl font-extrabold text-[#0F172A] tracking-tight">
                    {reportData?.school?.schoolName || 'Qelvora School CRM'}
                  </h1>
                  {reportData?.school?.logoSubtext && (
                    <p className="text-xs text-[#64748B] mt-0.5">{reportData.school.logoSubtext}</p>
                  )}
                  <div className="inline-block mt-3 px-4 py-1 bg-slate-100 rounded-full text-xs font-bold text-[#334155] uppercase tracking-wider">
                    {reportData?.reportType || 'Expense Report'} — {reportData?.periodLabel}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Report Generation Date: {new Date().toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Grand Summary Stat Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="text-xs font-semibold text-[#64748B] uppercase">Total Period Expense</span>
                    <div className="text-2xl font-extrabold text-[#0F172A] mt-1">
                      ₹ {reportData ? reportData.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="text-xs font-semibold text-[#64748B] uppercase">Total Transactions</span>
                    <div className="text-2xl font-extrabold text-[#0F172A] mt-1">
                      {reportData?.totalCount || 0}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="text-xs font-semibold text-[#64748B] uppercase">Categories Active</span>
                    <div className="text-2xl font-extrabold text-[#0F172A] mt-1">
                      {reportData?.categories?.length || 0}
                    </div>
                  </div>
                </div>

                {/* Day-by-Day breakdown if weekly or monthly */}
                {reportData?.dailyBreakdown && reportData.dailyBreakdown.length > 0 && (
                  <div className="my-6">
                    <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">
                      Day-by-Day Expenditure
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                      {reportData.dailyBreakdown.map((day, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg text-center">
                          <span className="text-[10px] font-semibold text-[#64748B] block">
                            {day.date} {day.dayName ? `(${day.dayName})` : ''}
                          </span>
                          <span className="text-xs font-bold text-[#0F172A] block mt-0.5">
                            ₹ {day.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                          </span>
                          <span className="text-[9px] text-slate-400 block">{day.count} txns</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category & Payment Method Side-by-Side Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                  {/* Category Breakdown */}
                  <div className="border border-[#E2E8F0] rounded-xl p-4">
                    <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">
                      Category-wise Totals
                    </h3>
                    <div className="space-y-2">
                      {reportData?.categories && reportData.categories.length > 0 ? (
                        reportData.categories.map((c, i) => (
                          <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                            <span className="font-medium text-[#334155]">
                              {c.category} <span className="text-[10px] text-slate-400">({c.count})</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#0F172A]">
                                ₹ {c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-500 w-8 text-right">
                                {c.percentage}%
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 py-3 text-center">No categories recorded</div>
                      )}
                    </div>
                  </div>

                  {/* Payment Method Breakdown */}
                  <div className="border border-[#E2E8F0] rounded-xl p-4">
                    <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">
                      Payment Method Breakdown
                    </h3>
                    <div className="space-y-2">
                      {reportData?.paymentMethods && reportData.paymentMethods.length > 0 ? (
                        reportData.paymentMethods.map((p, i) => (
                          <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                            <span className="font-medium text-[#334155]">
                              {p.method} <span className="text-[10px] text-slate-400">({p.count})</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#0F172A]">
                                ₹ {p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-500 w-8 text-right">
                                {p.percentage}%
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 py-3 text-center">No payments recorded</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detailed Expense Transactions Table */}
                <div className="mt-8">
                  <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">
                    Detailed Transaction Records
                  </h3>
                  <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-[#475569] font-bold text-[11px] uppercase border-b border-[#E2E8F0]">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Expense #</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Paid To / Vendor</th>
                          <th className="py-2.5 px-3">Method</th>
                          <th className="py-2.5 px-3">Ref No</th>
                          <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData?.expenses && reportData.expenses.length > 0 ? (
                          reportData.expenses.map((exp, idx) => (
                            <tr key={exp._id} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                              <td className="py-2 px-3">{exp.dateString}</td>
                              <td className="py-2 px-3 font-semibold text-[#0F172A]">{exp.expenseNumber}</td>
                              <td className="py-2 px-3">{exp.category}</td>
                              <td className="py-2 px-3 font-medium">{exp.paidTo}</td>
                              <td className="py-2 px-3">{exp.paymentMethod}</td>
                              <td className="py-2 px-3 text-slate-500">{exp.referenceNumber || '-'}</td>
                              <td className="py-2 px-4 text-right font-bold text-[#0F172A]">
                                ₹ {exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="py-8 text-center text-slate-400">
                              No expense transactions in this report period.
                            </td>
                          </tr>
                        )}
                        {/* Summary Total Row */}
                        <tr className="bg-slate-100 font-extrabold text-[#0F172A] border-t-2 border-slate-300">
                          <td colSpan="6" className="py-2.5 px-3 text-right uppercase">
                            Grand Total:
                          </td>
                          <td className="py-2.5 px-4 text-right text-sm">
                            ₹ {reportData ? reportData.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signatures / Footer */}
                <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 text-center text-xs">
                  <div>
                    <div className="w-40 border-b border-slate-400 mx-auto mb-1"></div>
                    <span className="font-semibold text-slate-600">Prepared by (Accountant)</span>
                  </div>
                  <div>
                    <div className="w-40 border-b border-slate-400 mx-auto mb-1"></div>
                    <span className="font-semibold text-slate-600">Verified by (Principal / Director)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 5. EXPENSE CATEGORIES TAB */}
          {/* ============================================================== */}
          {activeTab === 'categories' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                    School Expense Categories
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Manage standard school categories. Deactivated categories will be hidden from new records.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({ name: '', description: '', color: '#3B82F6' });
                    setShowCategoryModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-400" />
                  <span>Add New Category</span>
                </button>
              </div>

              {/* Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => (
                  <div
                    key={cat._id}
                    className={`bg-white p-5 rounded-2xl border transition-all ${
                      cat.isActive
                        ? 'border-[#E2E8F0] hover:shadow-md'
                        : 'border-slate-200 bg-slate-50/70 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: cat.color || '#3B82F6' }}
                        />
                        <div>
                          <h3 className="text-sm font-bold text-[#0F172A] leading-tight">{cat.name}</h3>
                          <span className="text-[10px] text-slate-400">
                            {cat.isDefault ? 'Standard Default' : 'Custom Category'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          cat.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {cat.description && (
                      <p className="text-xs text-[#64748B] mt-2.5 line-clamp-2">{cat.description}</p>
                    )}

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#64748B] block text-[10px]">Total Recorded</span>
                        <span className="font-bold text-[#0F172A]">
                          ₹ {(cat.totalSpent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block text-[10px] text-right">Transactions</span>
                        <span className="font-semibold text-slate-700 block text-right">
                          {cat.expenseCount || 0}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleCategoryActive(cat)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                          cat.isActive
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {cat.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(cat);
                          setCategoryForm({
                            name: cat.name,
                            description: cat.description || '',
                            color: cat.color || '#3B82F6'
                          });
                          setShowCategoryModal(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Category"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ================================================================ */}
      {/* MODAL: VIEW DETAILS & AUDIT HISTORY */}
      {/* ================================================================ */}
      {viewExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">{viewExpense.expenseNumber}</h3>
                  <span className="text-[11px] text-[#64748B]">{viewExpense.dateString}</span>
                </div>
              </div>
              <button
                onClick={() => setViewExpense(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Financial Box */}
              <div className="bg-gradient-to-br from-indigo-50 to-slate-50 p-4 rounded-xl border border-indigo-100 text-center">
                <span className="text-[11px] font-semibold text-indigo-600 uppercase">Amount Paid</span>
                <div className="text-2xl font-extrabold text-[#0F172A] mt-1">
                  ₹ {viewExpense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-indigo-700 italic mt-0.5">
                  {numberToIndianWords(viewExpense.amount)}
                </p>
              </div>

              {/* Core Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
                  <span className="font-bold text-[#0F172A] text-xs">{viewExpense.category}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Payment Method</span>
                  <span className="font-bold text-[#0F172A] text-xs">{viewExpense.paymentMethod}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Paid To / Vendor</span>
                  <span className="font-bold text-[#0F172A] text-xs">{viewExpense.paidTo}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Ref / Voucher #</span>
                  <span className="font-bold text-[#0F172A] text-xs">{viewExpense.referenceNumber || 'N/A'}</span>
                </div>
              </div>

              {viewExpense.description && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Description</span>
                  <p className="text-slate-700 font-medium">{viewExpense.description}</p>
                </div>
              )}

              {viewExpense.receiptUrl && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-700 font-bold uppercase block">Attached Bill</span>
                    <span className="font-semibold text-emerald-900 text-xs">
                      {viewExpense.receiptFileName || 'Bill Attachment'}
                    </span>
                  </div>
                  <a
                    href={viewExpense.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
                  >
                    View
                  </a>
                </div>
              )}

              {/* Audit History Timeline */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 font-bold text-[#0F172A] mb-3">
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>Audit History</span>
                </div>
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {viewExpense.auditHistory && viewExpense.auditHistory.length > 0 ? (
                    viewExpense.auditHistory.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                              item.action === 'CREATE'
                                ? 'bg-emerald-100 text-emerald-700'
                                : item.action === 'UPDATE'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {item.action}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(item.timestamp).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="mt-1 text-slate-600">
                          By: <span className="font-semibold text-[#0F172A]">{item.performedBy?.name || 'User'}</span>
                          {item.notes && <div className="italic text-slate-500 mt-0.5">"{item.notes}"</div>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 text-[11px]">Recorded by {viewExpense.createdBy?.name || 'System'}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewExpense(null)}
                className="px-4 py-1.5 bg-[#0F172A] text-white font-semibold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ================================================================ */}
      {deleteModalExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-[#0F172A]">Delete Expense Record</h3>
              <p className="text-xs text-[#64748B] mt-1">
                Are you sure you want to delete <span className="font-bold text-slate-900">{deleteModalExpense.expenseNumber}</span> (₹{deleteModalExpense.amount})? An audit record will be preserved.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Deletion <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Duplicate voucher entry / Cancelled payment"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalExpense(null);
                  setDeleteReason('');
                }}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-xs font-semibold rounded-xl text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || !deleteReason.trim()}
                onClick={handleDeleteExpense}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: ADD / EDIT CATEGORY */}
      {/* ================================================================ */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-[#0F172A]">
                {editingCategory ? 'Rename / Update Category' : 'Create New Expense Category'}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Lab Equipment, Annual Function"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows="2"
                  placeholder="What expenses fall under this category..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Badge Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border-none"
                  />
                  <span className="text-xs text-slate-500 font-mono">{categoryForm.color}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-xs font-semibold rounded-xl text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
