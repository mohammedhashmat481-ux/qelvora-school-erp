import { confirmModal } from '../context/ModalContext';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/ui/Sidebar';
import {
  LayoutDashboard,
  Layers,
  BadgePercent,
  FileText,
  UsersRound,
  Sliders,
  IndianRupee,
  Receipt,
  ClipboardCheck,
  Settings as SettingsIcon,
  Search,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Download,
  Copy,
  ChevronDown,
  RefreshCw,
  LogOut,
  Calendar,
  X,
  Eye,
  Check,
  Clock,
  ArrowRight,
  ShieldAlert,
  Percent,
  Wallet,
  Building,
  UserCheck,
  Send,
  SlidersHorizontal,
  ChevronRight,
  FileSpreadsheet,
  Filter,
  School,
  Navigation,
  QrCode,
  CreditCard
} from 'lucide-react';
import {
  getFeesDashboard,
  getFeeHeads,
  createFeeHead,
  updateFeeHead,
  deleteFeeHead,
  toggleFeeHeadStatus,
  getFeeQuotas,
  createFeeQuota,
  updateFeeQuota,
  deleteFeeQuota,
  getFeeStructure,
  saveFeeStructureBulk,
  copyFeeStructureToClasses,
  copyFeeStructureFromQuota,
  copyFeeStructureFromYear,
  getStudentsForQuotaAssignment,
  bulkAssignQuota,
  getQuotaAssignmentHistory,
  getStudentFeeAdjustment,
  saveStudentFeeAdjustment,
  searchCollectionStudents,
  getCollectionStudentDetails,
  collectStudentFee,
  setStudentPreviousBalance,
  getFeeReceipts,
  getFeeReceiptById,
  cancelFeeReceipt,
  updateFeeReceiptRemarks,
  getFeesReport,
  getFeesSettings,
  updateFeesSettings
} from '../services/feesService';
import { getClasses } from '../services/authService';
import PreviousYearBalancePage from './PreviousYearBalancePage';

// Format Indian Currency Helper
const formatINR = (val) => {
  const num = Number(val || 0);
  return '₹ ' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

// Available classes
const DEFAULT_STANDARDS = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const MONTHS_LIST = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const FeesManagementPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Active tab from URL query or default to 'overview'
  const params = new URLSearchParams(location.search);
  const activeTab = params.get('tab') || 'overview';

  const setTab = (newTab) => {
    navigate(`/fees?tab=${newTab}`);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Failed to log out');
    }
  };

  // Academic year state
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [academicYears, setAcademicYears] = useState(['2026-2027', '2025-2026', '2024-2025']);
  const isYearClosed = academicYear !== '2026-2027';

  // Global settings
  const [settings, setSettings] = useState(null);
  const [classesList, setClassesList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Dashboard State
  const [dashboardData, setDashboardData] = useState(null);

  // 2. Fee Heads State
  const [heads, setHeads] = useState([]);
  const [isHeadModalOpen, setIsHeadModalOpen] = useState(false);
  const [editingHead, setEditingHead] = useState(null);
  const [headForm, setHeadForm] = useState({
    name: '',
    shortCode: '',
    frequency: 'Monthly',
    mandatory: true,
    appliesTo: 'All',
    reissuable: false,
    refundable: false,
    description: '',
    status: 'Active'
  });

  // 3. Quota Master State
  const [quotas, setQuotas] = useState([]);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState(null);
  const [quotaForm, setQuotaForm] = useState({
    name: '',
    description: '',
    concessionType: 'none',
    concessionValue: 0,
    status: 'Active'
  });

  // 4. Fee Structure State
  const [selectedStandard, setSelectedStandard] = useState('10th');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedStudentId, setSelectedStudentId] = useState('all');
  const [structureStudents, setStructureStudents] = useState([]);
  const [travellingDistance, setTravellingDistance] = useState('');
  const [selectedQuotaId, setSelectedQuotaId] = useState('q-general');
  const [feeStructure, setFeeStructure] = useState(null);
  const [isCopyClassModalOpen, setIsCopyClassModalOpen] = useState(false);
  const [targetCopyClasses, setTargetCopyClasses] = useState([]);
  const [isCopyYearModalOpen, setIsCopyYearModalOpen] = useState(false);
  const [copyYearFrom, setCopyYearFrom] = useState('2025-2026');
  const [isSavingStructure, setIsSavingStructure] = useState(false);

  // 5. Assign Quota State
  const [assignStd, setAssignStd] = useState('10th');
  const [assignSec, setAssignSec] = useState('A');
  const [assignStudents, setAssignStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [bulkTargetQuotaId, setBulkTargetQuotaId] = useState('q-general');
  const [bulkAssignNotes, setBulkAssignNotes] = useState('');
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [quotaHistory, setQuotaHistory] = useState([]);

  // 6. Student Fee Adjustment State
  const [adjClassFilter, setAdjClassFilter] = useState('');
  const [adjSectionFilter, setAdjSectionFilter] = useState('');
  const [adjSearchQuery, setAdjSearchQuery] = useState('');
  const [adjSearchResults, setAdjSearchResults] = useState([]);
  const [isAdjSearching, setIsAdjSearching] = useState(false);
  const [selectedAdjStudent, setSelectedAdjStudent] = useState(null);
  const [studentAdjData, setStudentAdjData] = useState(null);
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [adjForm, setAdjForm] = useState({
    adjustmentType: 'discount_fixed',
    headName: 'Tuition Fee',
    amountOrValue: '',
    reasonType: 'Merit Concession',
    reasonText: '',
    approverName: user?.name || 'Principal',
    newQuotaId: ''
  });

  // 7. Fee Collection State
  const [collClassFilter, setCollClassFilter] = useState('');
  const [collSectionFilter, setCollSectionFilter] = useState('');
  const [collSearch, setCollSearch] = useState('');
  const [collStudentList, setCollStudentList] = useState([]);
  const [collFeeStatusFilter, setCollFeeStatusFilter] = useState('all'); // 'all' | 'pending' | 'paid'

  const collPendingCount = useMemo(() => {
    return collStudentList.filter(st => Number(st.totalDue || 0) > 0).length;
  }, [collStudentList]);

  const collPaidCount = useMemo(() => {
    return collStudentList.filter(st => Number(st.totalDue || 0) <= 0).length;
  }, [collStudentList]);

  const filteredCollStudentList = useMemo(() => {
    if (collFeeStatusFilter === 'pending') {
      return collStudentList.filter(st => Number(st.totalDue || 0) > 0);
    }
    if (collFeeStatusFilter === 'paid') {
      return collStudentList.filter(st => Number(st.totalDue || 0) <= 0);
    }
    return collStudentList;
  }, [collStudentList, collFeeStatusFilter]);

  const [isCollSearching, setIsCollSearching] = useState(false);
  const [collStudent, setCollStudent] = useState(null);
  const [collDetails, setCollDetails] = useState(null);
  const [collPayNowMap, setCollPayNowMap] = useState({});
  const [collSelectedMonths, setCollSelectedMonths] = useState({});
  const [collPaymentModes, setCollPaymentModes] = useState([
    { mode: 'cash', amount: '', reference: '' }
  ]);
  const [collPaymentType, setCollPaymentType] = useState('cash'); // 'cash' | 'upi' | 'card' | 'cheque' | 'split'
  const [collUpiUtr, setCollUpiUtr] = useState('');
  const [collCardRef, setCollCardRef] = useState('');
  const [collChequeRef, setCollChequeRef] = useState('');
  const [customPayAmount, setCustomPayAmount] = useState('');
  const [showPaymentHistory, setShowPaymentHistory] = useState(true);

  // Extract set of months already paid for a specific fee head (or all heads)
  const getPaidMonthsForHead = (headId, receipts = []) => {
    const paidMonths = new Set();
    if (!receipts || !Array.isArray(receipts)) return paidMonths;
    receipts.forEach(r => {
      if (r.status !== 'Cancelled' && r.items) {
        r.items.forEach(it => {
          if (!headId || it.headId === headId || !it.headId) {
            if (it.period) {
              MONTHS_LIST.forEach(m => {
                const regex = new RegExp(`\\b${m}\\b`, 'i');
                if (regex.test(it.period)) {
                  paidMonths.add(m);
                }
              });
            }
          }
        });
      }
    });
    return paidMonths;
  };

  // Extract total paid and collection status for any fee head across past receipts
  const getPaidStatsForHead = (head, receipts = []) => {
    let totalPaid = 0;
    const paidReceiptDetails = [];

    if (!head) {
      return { totalPaid: 0, standardDemand: 0, balanceDue: 0, isPaid: false, isPartial: false, paidReceiptDetails };
    }

    const headId = head.headId;
    const headNameLower = (head.headName || '').trim().toLowerCase();

    if (receipts && Array.isArray(receipts)) {
      receipts.forEach(r => {
        if (r.status !== 'Cancelled' && r.items && Array.isArray(r.items)) {
          r.items.forEach(it => {
            const itNameLower = (it.headName || '').trim().toLowerCase();
            const itId = it.headId;
            const match = (headId && itId && itId === headId) ||
                          (itNameLower && headNameLower && (itNameLower === headNameLower || itNameLower.includes(headNameLower) || headNameLower.includes(itNameLower)));
            if (match) {
              const amt = Number(it.amount || 0);
              totalPaid += amt;
              paidReceiptDetails.push({
                receiptNumber: r.receiptNumber,
                date: r.paymentDate,
                amount: amt,
                period: it.period || 'Full Term'
              });
            }
          });
        }
      });
    }

    let standardDemand = Number(head.amount || 0);
    let isPaid = false;
    let isPartial = false;
    let balanceDue = 0;

    if (head.frequency === 'Monthly') {
      const billedMonths = head.billedMonths || MONTHS_LIST;
      const billedCount = billedMonths.length || 12;
      standardDemand = Number(head.amount || 0) * billedCount;
      const paidMonths = getPaidMonthsForHead(head.headId, receipts);
      isPaid = paidMonths.size >= billedCount && billedCount > 0;
      isPartial = paidMonths.size > 0 && !isPaid;
      balanceDue = Math.max(0, (billedCount - paidMonths.size) * Number(head.amount || 0));
    } else if (head.frequency === 'Term-wise') {
      standardDemand = Number(head.amount || 0) * 3;
      isPaid = totalPaid >= standardDemand && standardDemand > 0;
      isPartial = totalPaid > 0 && !isPaid;
      balanceDue = Math.max(0, standardDemand - totalPaid);
    } else {
      // One-time or Annual
      standardDemand = Number(head.amount || 0);
      isPaid = totalPaid >= standardDemand && standardDemand > 0;
      isPartial = totalPaid > 0 && !isPaid;
      balanceDue = Math.max(0, standardDemand - totalPaid);
    }

    return {
      totalPaid,
      standardDemand,
      balanceDue,
      isPaid,
      isPartial,
      paidReceiptDetails
    };
  };

  // Overall list of paid months for the selected student
  const allPaidMonths = useMemo(() => {
    if (!collDetails?.studentReceipts) return [];
    const set = new Set();
    collDetails.studentReceipts.forEach(r => {
      if (r.status !== 'Cancelled' && r.items) {
        r.items.forEach(it => {
          if (it.period) {
            MONTHS_LIST.forEach(m => {
              const regex = new RegExp(`\\b${m}\\b`, 'i');
              if (regex.test(it.period)) set.add(m);
            });
          }
        });
      }
    });
    return Array.from(set);
  }, [collDetails]);

  // Overall list of fully or partially paid fee heads for the selected student
  const allPaidFeeHeads = useMemo(() => {
    if (!collDetails?.baseStructure?.items || !collDetails?.studentReceipts) return [];
    return collDetails.baseStructure.items
      .filter(it => it.enabled)
      .map(it => {
        const stats = getPaidStatsForHead(it, collDetails.studentReceipts);
        return {
          ...it,
          ...stats
        };
      })
      .filter(item => item.totalPaid > 0);
  }, [collDetails]);

  const [collTendered, setCollTendered] = useState('');
  const [collRemarks, setCollRemarks] = useState('');
  const [waiveFine, setWaiveFine] = useState(false);
  const [waiveFineReason, setWaiveFineReason] = useState('');
  const [isCollecting, setIsCollecting] = useState(false);
  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [extraChargeForm, setExtraChargeForm] = useState({ headName: 'Duplicate Smart ID Card', amount: 250 });
  const [isPrevBalModalOpen, setIsPrevBalModalOpen] = useState(false);
  const [prevBalAmount, setPrevBalAmount] = useState('');
  const [prevBalRemarks, setPrevBalRemarks] = useState('');

  // 8. Receipts Ledger State
  const [receiptClassFilter, setReceiptClassFilter] = useState('');
  const [receiptSectionFilter, setReceiptSectionFilter] = useState('');
  const [receipts, setReceipts] = useState([]);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [receiptStatusFilter, setReceiptStatusFilter] = useState('');
  const [receiptModeFilter, setReceiptModeFilter] = useState('');
  const [receiptFromDate, setReceiptFromDate] = useState('');
  const [receiptToDate, setReceiptToDate] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [printFormat, setPrintFormat] = useState('a4'); // 'a4', 'half', 'thermal'
  const [isCancelReceiptOpen, setIsCancelReceiptOpen] = useState(false);
  const [cancellingReceiptId, setCancellingReceiptId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSupervisor, setCancelSupervisor] = useState(user?.name || 'Principal');

  // 9. Reports State
  const [activeReportType, setActiveReportType] = useState('daily-collection');
  const [reportData, setReportData] = useState(null);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportStdFilter, setReportStdFilter] = useState('');
  const [reportQuotaFilter, setReportQuotaFilter] = useState('');
  const [reportModeFilter, setReportModeFilter] = useState('');

  // 10. Fee Settings State
  const [settingsForm, setSettingsForm] = useState(null);

  // Load initial settings and classes
  useEffect(() => {
    getFeesSettings().then(res => {
      if (res?.data) {
        setSettings(res.data);
        setSettingsForm(res.data);
        if (res.data.activeAcademicYear) setAcademicYear(res.data.activeAcademicYear);
        if (res.data.academicYears) setAcademicYears(res.data.academicYears);
      }
    }).catch(() => {});

    getClasses().then(res => {
      if (res?.classes) setClassesList(res.classes);
      else if (res?.data && Array.isArray(res.data)) setClassesList(res.data);
      else if (Array.isArray(res)) setClassesList(res);
    }).catch(() => {});
  }, []);

  // Always load live KPI summary stats whenever academicYear changes (independent of active tab)
  const refreshKpiSummary = (year = academicYear) => {
    getFeesDashboard(year).then(res => {
      if (res?.data) setDashboardData(res.data);
    }).catch(err => {
      console.error('Failed to load KPI summary:', err);
    });
  };

  useEffect(() => {
    refreshKpiSummary(academicYear);
  }, [academicYear]);

  // Tab Loaders
  useEffect(() => {
    if (activeTab === 'overview') {
      setIsLoading(true);
      getFeesDashboard(academicYear).then(res => {
        if (res?.data) setDashboardData(res.data);
      }).finally(() => setIsLoading(false));
    } else if (activeTab === 'heads') {
      setIsLoading(true);
      getFeeHeads().then(res => {
        if (res?.data) setHeads(res.data);
      }).finally(() => setIsLoading(false));
    } else if (activeTab === 'quotas') {
      setIsLoading(true);
      getFeeQuotas().then(res => {
        if (res?.data) setQuotas(res.data);
      }).finally(() => setIsLoading(false));
    } else if (activeTab === 'structure') {
      getFeeHeads().then(r => { if (r?.data) setHeads(r.data); }).catch(() => {});
      loadStructure();
      if (quotas.length === 0) {
        getFeeQuotas().then(res => { if (res?.data) setQuotas(res.data); }).catch(() => {});
      }
    } else if (activeTab === 'assign-quota') {
      loadAssignStudents();
      getFeeQuotas().then(res => { if (res?.data) setQuotas(res.data); }).catch(() => {});
      getQuotaAssignmentHistory().then(res => { if (res?.data) setQuotaHistory(res.data); }).catch(() => {});
    } else if (activeTab === 'adjustments') {
      fetchAdjStudents(adjClassFilter, adjSectionFilter, adjSearchQuery);
      if (quotas.length === 0) {
        getFeeQuotas().then(res => { if (res?.data) setQuotas(res.data); }).catch(() => {});
      }
    } else if (activeTab === 'collection') {
      fetchCollStudents(collClassFilter, collSectionFilter, collSearch);
      if (quotas.length === 0) {
        getFeeQuotas().then(res => { if (res?.data) setQuotas(res.data); }).catch(() => {});
      }
    } else if (activeTab === 'receipts') {
      loadReceipts();
    } else if (activeTab === 'reports') {
      loadReport(activeReportType);
      if (quotas.length === 0) {
        getFeeQuotas().then(res => { if (res?.data) setQuotas(res.data); }).catch(() => {});
      }
    } else if (activeTab === 'settings') {
      getFeesSettings().then(res => {
        if (res?.data) {
          setSettings(res.data);
          setSettingsForm(res.data);
        }
      }).catch(() => {});
    }
  }, [activeTab, academicYear]);

  // Load fee structure
  const loadStructure = () => {
    setIsLoading(true);
    Promise.all([
      getFeeStructure({
        academicYear,
        standard: selectedStandard,
        section: selectedSection === 'All' ? '' : selectedSection,
        studentId: selectedStudentId !== 'all' ? selectedStudentId : '',
        quotaId: selectedQuotaId
      }),
      getFeeHeads()
    ]).then(([structRes, headsRes]) => {
      const activeHeads = headsRes?.data || heads || [];
      if (headsRes?.data) setHeads(headsRes.data);

      if (structRes?.data) {
        const structureData = structRes.data;
        if (structureData.items && activeHeads.length > 0) {
          structureData.items = structureData.items.map(it => {
            const h = activeHeads.find(head => head.id === it.headId || head.name?.trim().toLowerCase() === it.headName?.trim().toLowerCase());
            if (h) {
              const freq = h.frequency || it.frequency;
              return {
                ...it,
                headId: h.id,
                headName: h.name,
                frequency: freq,
                billedMonths: freq === 'Monthly' ? (it.billedMonths || MONTHS_LIST) : null,
                dueDate: freq !== 'Monthly' && !it.dueDate ? '2026-05-15' : it.dueDate
              };
            }
            return it;
          });
        }
        setFeeStructure(structureData);
        if (structureData.travellingDistance) {
          setTravellingDistance(structureData.travellingDistance);
        } else if (selectedStudentId === 'all') {
          setTravellingDistance('');
        }
      }
    }).catch(err => {
      console.error('Failed to load structure:', err);
    }).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'structure') {
      loadStructure();
    }
  }, [selectedStandard, selectedSection, selectedStudentId, selectedQuotaId, academicYear, activeTab]);

  useEffect(() => {
    if (activeTab === 'structure') {
      searchCollectionStudents({
        standard: selectedStandard,
        section: selectedSection === 'All' ? '' : selectedSection
      }).then(res => {
        if (res?.data) {
          setStructureStudents(res.data);
        }
      }).catch(() => setStructureStudents([]));
    }
  }, [activeTab, selectedStandard, selectedSection]);

  // Load assign students
  const loadAssignStudents = () => {
    setIsLoading(true);
    getStudentsForQuotaAssignment({ standard: assignStd, section: assignSec, academicYear }).then(res => {
      if (res?.data) {
        setAssignStudents(res.data);
        setSelectedStudentIds([]);
      }
    }).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'assign-quota') {
      loadAssignStudents();
    }
  }, [assignStd, assignSec, academicYear]);

  // Load receipts
  const loadReceipts = () => {
    setIsLoading(true);
    getFeeReceipts({
      academicYear,
      search: receiptSearch,
      standard: receiptClassFilter,
      section: receiptSectionFilter,
      status: receiptStatusFilter,
      paymentMode: receiptModeFilter,
      fromDate: receiptFromDate,
      toDate: receiptToDate
    }).then(res => {
      if (res?.data) setReceipts(res.data);
    }).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'receipts') {
      loadReceipts();
    }
  }, [receiptClassFilter, receiptSectionFilter, receiptStatusFilter, receiptModeFilter, receiptFromDate, receiptToDate]);

  const handleClearReceiptFilters = () => {
    setReceiptClassFilter('');
    setReceiptSectionFilter('');
    setReceiptSearch('');
    setReceiptStatusFilter('');
    setReceiptModeFilter('');
    setReceiptFromDate('');
    setReceiptToDate('');
    setIsLoading(true);
    getFeeReceipts({
      academicYear,
      search: '',
      standard: '',
      section: '',
      status: '',
      paymentMode: '',
      fromDate: '',
      toDate: ''
    }).then(res => {
      if (res?.data) setReceipts(res.data);
    }).finally(() => setIsLoading(false));
  };

  // Load report
  const loadReport = (type) => {
    setIsLoading(true);
    getFeesReport(type, {
      academicYear,
      startDate: reportStartDate,
      endDate: reportEndDate,
      standard: reportStdFilter,
      quotaId: reportQuotaFilter,
      paymentMode: reportModeFilter
    }).then(res => {
      if (res?.data) setReportData(res.data);
    }).finally(() => setIsLoading(false));
  };

  // -------------------------------------------------------------
  // HANDLERS: FEE HEADS
  // -------------------------------------------------------------
  const handleOpenAddHead = () => {
    setEditingHead(null);
    setHeadForm({
      name: '',
      shortCode: '',
      frequency: 'One-time',
      mandatory: true,
      appliesTo: 'All',
      reissuable: false,
      refundable: false,
      description: '',
      status: 'Active'
    });
    setIsHeadModalOpen(true);
  };

  const handleOpenEditHead = (h) => {
    setEditingHead(h);
    setHeadForm({
      name: h.name,
      shortCode: h.shortCode || '',
      frequency: h.frequency || 'One-time',
      mandatory: Boolean(h.mandatory),
      appliesTo: h.appliesTo || 'All',
      reissuable: Boolean(h.reissuable),
      refundable: Boolean(h.refundable),
      description: h.description || '',
      status: h.status || 'Active'
    });
    setIsHeadModalOpen(true);
  };

  const handleSaveHead = async (e) => {
    e.preventDefault();
    if (!headForm.name.trim()) return toast.error('Fee head name is required');
    try {
      if (editingHead) {
        const res = await updateFeeHead(editingHead.id, headForm);
        if (res.success) {
          toast.success(res.message || 'Fee head updated');
          setIsHeadModalOpen(false);
          getFeeHeads().then(r => {
            if (r?.data) {
              setHeads(r.data);
              setFeeStructure(prev => {
                if (!prev || !prev.items) return prev;
                const updatedItems = prev.items.map(it => {
                  const matched = r.data.find(h => h.id === it.headId || h.name?.trim().toLowerCase() === it.headName?.trim().toLowerCase());
                  if (matched) {
                    const freq = matched.frequency || it.frequency;
                    return {
                      ...it,
                      headId: matched.id,
                      headName: matched.name,
                      frequency: freq,
                      billedMonths: freq === 'Monthly' ? (it.billedMonths || MONTHS_LIST) : null,
                      dueDate: freq !== 'Monthly' && !it.dueDate ? '2026-05-15' : it.dueDate
                    };
                  }
                  return it;
                });
                return { ...prev, items: updatedItems };
              });
            }
          });
        } else {
          toast.error(res.message);
        }
      } else {
        const res = await createFeeHead(headForm);
        if (res.success) {
          toast.success(res.message || 'Fee head created');
          setIsHeadModalOpen(false);
          getFeeHeads().then(r => {
            if (r?.data) {
              setHeads(r.data);
              loadStructure();
            }
          });
        } else {
          toast.error(res.message);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteHead = async (h) => {
    if (!(await confirmModal({ title: 'Delete Fee Head', message: `Are you sure you want to delete fee head "${h.name}"?`, type: 'danger', confirmText: 'Delete Fee Head' }))) return;
    try {
      const res = await deleteFeeHead(h.id);
      if (res.success) {
        toast.success(res.message);
        getFeeHeads().then(r => {
          if (r?.data) {
            setHeads(r.data);
            setFeeStructure(prev => {
              if (!prev || !prev.items) return prev;
              const filtered = prev.items.filter(it => it.headId !== h.id && it.headName?.trim().toLowerCase() !== h.name?.trim().toLowerCase());
              return { ...prev, items: filtered };
            });
          }
        });
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message, { duration: 5000 });
    }
  };

  const handleToggleHeadStatus = async (h) => {
    try {
      const res = await toggleFeeHeadStatus(h.id);
      if (res.success) {
        toast.success(res.message);
        getFeeHeads().then(r => setHeads(r.data));
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: QUOTA MASTER
  // -------------------------------------------------------------
  const handleOpenAddQuota = () => {
    setEditingQuota(null);
    setQuotaForm({
      name: '',
      description: '',
      concessionType: 'none',
      concessionValue: 0,
      status: 'Active'
    });
    setIsQuotaModalOpen(true);
  };

  const handleOpenEditQuota = (q) => {
    setEditingQuota(q);
    setQuotaForm({
      name: q.name,
      description: q.description || '',
      concessionType: q.concessionType || 'none',
      concessionValue: q.concessionValue || 0,
      status: q.status || 'Active'
    });
    setIsQuotaModalOpen(true);
  };

  const handleSaveQuota = async (e) => {
    e.preventDefault();
    if (!quotaForm.name.trim()) return toast.error('Quota name is required');
    try {
      if (editingQuota) {
        const res = await updateFeeQuota(editingQuota.id, quotaForm);
        if (res.success) {
          toast.success('Quota updated');
          setIsQuotaModalOpen(false);
          getFeeQuotas().then(r => setQuotas(r.data));
        } else {
          toast.error(res.message);
        }
      } else {
        const res = await createFeeQuota(quotaForm);
        if (res.success) {
          toast.success('Quota created');
          setIsQuotaModalOpen(false);
          getFeeQuotas().then(r => setQuotas(r.data));
        } else {
          toast.error(res.message);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteQuota = async (q) => {
    if (!(await confirmModal({ title: 'Delete Fee Quota', message: `Are you sure you want to delete quota "${q.name}"?`, type: 'danger', confirmText: 'Delete Quota' }))) return;
    try {
      const res = await deleteFeeQuota(q.id);
      if (res.success) {
        toast.success(res.message);
        getFeeQuotas().then(r => setQuotas(r.data));
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: FEE STRUCTURE
  // -------------------------------------------------------------
  const handleStructureItemChange = (index, field, value) => {
    if (!feeStructure || isYearClosed) return;
    const updatedItems = [...feeStructure.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFeeStructure({ ...feeStructure, items: updatedItems });
  };

  const handleToggleMonthChip = (itemIndex, month) => {
    if (!feeStructure || isYearClosed) return;
    const updatedItems = [...feeStructure.items];
    const currMonths = updatedItems[itemIndex].billedMonths || [];
    let nextMonths = [];
    if (currMonths.includes(month)) {
      nextMonths = currMonths.filter(m => m !== month);
    } else {
      nextMonths = [...currMonths, month];
    }
    updatedItems[itemIndex].billedMonths = nextMonths;
    setFeeStructure({ ...feeStructure, items: updatedItems });
  };

  const calculateStructureTotal = useMemo(() => {
    if (!feeStructure || !feeStructure.items) return 0;
    return feeStructure.items.reduce((total, it) => {
      if (!it.enabled) return total;
      const amt = Number(it.amount || 0);
      if (it.frequency === 'Monthly') {
        const count = it.billedMonths ? it.billedMonths.length : 12;
        return total + (amt * count);
      }
      if (it.frequency === 'Quarterly') return total + (amt * 4);
      if (it.frequency === 'Half-Yearly' || it.frequency === 'Half Years') return total + (amt * 2);
      if (it.frequency === 'Annually') return total + amt;
      if (it.frequency === 'One-time' || it.frequency === 'One-Time') return total + amt;
      if (it.frequency === 'Term-wise') return total + (amt * 3);
      return total + amt;
    }, 0);
  }, [feeStructure]);

  const DISTANCE_SLABS = [
    { label: '0 - 3 km', amount: 1000 },
    { label: '3 - 6 km', amount: 1800 },
    { label: '6 - 10 km', amount: 2500 },
    { label: '10 - 15 km', amount: 3500 },
    { label: '15+ km', amount: 4500 }
  ];

  const handleDistanceSlabChange = (slab) => {
    setTravellingDistance(slab.label);
    if (!feeStructure || !feeStructure.items) return;
    let foundTransport = false;
    const updatedItems = feeStructure.items.map(it => {
      const isTransport = it.headName.toLowerCase().includes('transport') || 
                          it.headName.toLowerCase().includes('bus') || 
                          it.headName.toLowerCase().includes('travel') || 
                          (it.shortCode && it.shortCode.toLowerCase().includes('bus'));
      if (isTransport) {
        foundTransport = true;
        return { ...it, amount: slab.amount, enabled: true };
      }
      return it;
    });

    if (foundTransport) {
      setFeeStructure({ ...feeStructure, items: updatedItems });
      toast.success(`Transport fee updated to ₹${slab.amount} for ${slab.label}`);
    } else {
      toast.info(`Distance set to ${slab.label}. You can enter fee in the grid below.`);
    }
  };

  const handleSaveFeeStructure = async () => {
    if (!feeStructure || isYearClosed || isSavingStructure) return;
    setIsSavingStructure(true);
    try {
      const selectedStudentObj = structureStudents.find(s => s.id === selectedStudentId);
      const payload = {
        ...feeStructure,
        academicYear,
        standard: selectedStandard,
        section: selectedSection === 'All' ? '' : selectedSection,
        studentId: selectedStudentId !== 'all' ? selectedStudentId : null,
        studentName: selectedStudentObj?.name || null,
        travellingDistance: travellingDistance || null,
        quotaId: selectedQuotaId
      };
      const res = await saveFeeStructureBulk(payload);
      if (res.success) {
        toast.success(selectedStudentId !== 'all' 
          ? `Fee structure saved for student ${selectedStudentObj?.name || ''}` 
          : 'Fee structure saved successfully');
      } else {
        toast.error(res.message || 'Failed to save fee structure');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error saving fee structure');
    } finally {
      setIsSavingStructure(false);
    }
  };

  const handleCopyClassStructure = async () => {
    if (targetCopyClasses.length === 0) return toast.error('Please select at least one class');
    try {
      const res = await copyFeeStructureToClasses({
        academicYear,
        sourceStandard: selectedStandard,
        targetStandards: targetCopyClasses,
        quotaId: selectedQuotaId
      });
      if (res.success) {
        toast.success(res.message);
        setIsCopyClassModalOpen(false);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCopyFromYear = async () => {
    if (!copyYearFrom) return;
    try {
      const res = await copyFeeStructureFromYear({
        fromYear: copyYearFrom,
        toYear: academicYear
      });
      if (res.success) {
        toast.success(res.message);
        setIsCopyYearModalOpen(false);
        loadStructure();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: ASSIGN QUOTA
  // -------------------------------------------------------------
  const handleSelectAllStudents = (e) => {
    if (e.target.checked) {
      setSelectedStudentIds(assignStudents.map(s => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleStudentSelection = (sId) => {
    if (selectedStudentIds.includes(sId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== sId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, sId]);
    }
  };

  const handleBulkAssignConfirm = async () => {
    try {
      const res = await bulkAssignQuota({
        studentIds: selectedStudentIds,
        targetQuotaId: bulkTargetQuotaId,
        notes: bulkAssignNotes,
        academicYear
      });
      if (res.success) {
        toast.success(res.message);
        setIsBulkConfirmOpen(false);
        loadAssignStudents();
        getQuotaAssignmentHistory().then(r => setQuotaHistory(r.data));
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: STUDENT ADJUSTMENTS
  // -------------------------------------------------------------
  const fetchAdjStudents = async (cls = adjClassFilter, sec = adjSectionFilter, query = adjSearchQuery) => {
    setIsAdjSearching(true);
    try {
      const params = {};
      if (cls) params.standard = cls;
      if (sec) params.section = sec;
      if (query && query.trim()) params.query = query.trim();

      const res = await searchCollectionStudents(params);
      if (res.data) {
        setAdjSearchResults(res.data);
      }
    } catch (_) {
    } finally {
      setIsAdjSearching(false);
    }
  };

  const handleSearchAdjStudents = (val) => {
    setAdjSearchQuery(val);
    fetchAdjStudents(adjClassFilter, adjSectionFilter, val);
  };

  const handleClassFilterChange = (cls) => {
    setAdjClassFilter(cls);
    fetchAdjStudents(cls, adjSectionFilter, adjSearchQuery);
  };

  const handleSectionFilterChange = (sec) => {
    setAdjSectionFilter(sec);
    fetchAdjStudents(adjClassFilter, sec, adjSearchQuery);
  };

  const handleClearAdjFilters = () => {
    setAdjClassFilter('');
    setAdjSectionFilter('');
    setAdjSearchQuery('');
    fetchAdjStudents('', '', '');
  };

  const handleSelectAdjStudent = async (student) => {
    setSelectedAdjStudent(student);
    setAdjSearchResults([]);
    setAdjSearchQuery('');
    try {
      const res = await getStudentFeeAdjustment(student.id, academicYear);
      if (res.data) setStudentAdjData(res.data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveStudentAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedAdjStudent) return;
    if (!adjForm.amountOrValue && adjForm.adjustmentType !== 'full_waiver') {
      return toast.error('Please enter an adjustment amount or value');
    }
    try {
      const res = await saveStudentFeeAdjustment(selectedAdjStudent.id, {
        ...adjForm,
        academicYear
      });
      if (res.success) {
        toast.success(res.message);
        setIsAdjModalOpen(false);
        if (res.student) {
          setSelectedAdjStudent(res.student);
        }
        // Reload student data
        const refreshed = await getStudentFeeAdjustment(selectedAdjStudent.id, academicYear);
        if (refreshed?.data) {
          setStudentAdjData(refreshed.data);
          if (refreshed.data.student) {
            setSelectedAdjStudent(refreshed.data.student);
          }
        }
        // Also refresh collection student list & dashboard if open
        fetchCollStudents();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: COLLECTION
  // -------------------------------------------------------------
  const fetchCollStudents = async (cls = collClassFilter, sec = collSectionFilter, query = collSearch) => {
    setIsCollSearching(true);
    try {
      const params = {};
      if (cls) params.standard = cls;
      if (sec) params.section = sec;
      if (query && query.trim()) params.query = query.trim();

      const res = await searchCollectionStudents(params);
      if (res.data) {
        setCollStudentList(res.data);
      }
    } catch (_) {
    } finally {
      setIsCollSearching(false);
    }
  };

  const handleSearchCollStudent = (val) => {
    setCollSearch(val);
    fetchCollStudents(collClassFilter, collSectionFilter, val);
  };

  const handleCollClassChange = (cls) => {
    setCollClassFilter(cls);
    fetchCollStudents(cls, collSectionFilter, collSearch);
  };

  const handleCollSectionChange = (sec) => {
    setCollSectionFilter(sec);
    fetchCollStudents(collClassFilter, sec, collSearch);
  };

  const handleClearCollFilters = () => {
    setCollClassFilter('');
    setCollSectionFilter('');
    setCollSearch('');
    setCollFeeStatusFilter('all');
    fetchCollStudents('', '', '');
  };

  const handleSelectCollStudent = async (student) => {
    setCollStudent(student);
    setCollSearch('');
    setIsLoading(true);
    try {
      const res = await getCollectionStudentDetails(student.id, academicYear);
      if (res.data) {
        setCollDetails(res.data);
        if (res.data.student) {
          setCollStudent(res.data.student);
        }
        // Clear default selection - User request: "default selection i dont want"
        setCollPayNowMap({});
        setCollSelectedMonths({});
        setCustomPayAmount('');
        setCollTendered('');
        setCollUpiUtr('');
        setCollCardRef('');
        setCollChequeRef('');
        setCollPaymentType('cash');
        setWaiveFine(false);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAllFeeHeads = () => {
    if (!collDetails?.baseStructure?.items) return;
    const payMap = {};
    const monthsMap = {};
    const pastReceipts = collDetails.studentReceipts || [];
    let hasUnpaid = false;

    collDetails.baseStructure.items.forEach(it => {
      if (it.enabled) {
        const stats = getPaidStatsForHead(it, pastReceipts);
        if (stats.isPaid) return; // Skip already paid heads

        if (it.frequency === 'Monthly') {
          const paidMonths = getPaidMonthsForHead(it.headId, pastReceipts);
          const unpaid = MONTHS_LIST.filter(m => !paidMonths.has(m));
          if (unpaid.length > 0) {
            monthsMap[it.headId] = unpaid;
            payMap[it.headId] = unpaid.length * it.amount;
            hasUnpaid = true;
          }
        } else {
          if (stats.balanceDue > 0) {
            payMap[it.headId] = stats.balanceDue;
            hasUnpaid = true;
          }
        }
      }
    });

    setCollPayNowMap(payMap);
    setCollSelectedMonths(monthsMap);
    if (hasUnpaid) {
      toast.success('All pending fee heads selected');
    } else {
      toast.success('All fee heads are already settled in full!');
    }
  };

  const handleClearAllFeeHeads = () => {
    setCollPayNowMap({});
    setCollSelectedMonths({});
    setCustomPayAmount('');
    toast.success('Fee selections cleared');
  };

  const handleToggleHeadSelection = (head) => {
    const stats = getPaidStatsForHead(head, collDetails?.studentReceipts || []);
    if (stats.isPaid) {
      toast.info(`"${head.headName}" has already been paid in full.`);
      return;
    }
    const isSelected = Number(collPayNowMap[head.headId] || 0) > 0;
    if (isSelected) {
      const nextMap = { ...collPayNowMap };
      delete nextMap[head.headId];
      setCollPayNowMap(nextMap);
      const nextMonths = { ...collSelectedMonths };
      delete nextMonths[head.headId];
      setCollSelectedMonths(nextMonths);
    } else {
      if (head.frequency === 'Monthly') {
        const paidMonths = getPaidMonthsForHead(head.headId, collDetails?.studentReceipts || []);
        const unpaid = MONTHS_LIST.filter(m => !paidMonths.has(m));
        const targetMonths = unpaid.length > 0 ? [unpaid[0]] : ['Apr'];
        setCollSelectedMonths({ ...collSelectedMonths, [head.headId]: targetMonths });
        setCollPayNowMap({ ...collPayNowMap, [head.headId]: targetMonths.length * head.amount });
      } else {
        setCollPayNowMap({ ...collPayNowMap, [head.headId]: stats.balanceDue });
      }
    }
  };

  const handleApplyCustomAmount = (customAmt) => {
    const amt = Number(customAmt !== undefined ? customAmt : customPayAmount);
    if (!amt || amt <= 0) return toast.error('Please enter a valid amount parent is paying');
    if (!collDetails?.baseStructure?.items) return;

    let remaining = amt;
    const payMap = {};
    const monthsMap = {};
    const pastReceipts = collDetails.studentReceipts || [];

    const items = [...collDetails.baseStructure.items].filter(it => it.enabled);
    items.sort((a, b) => (b.mandatory ? 1 : 0) - (a.mandatory ? 1 : 0));

    items.forEach(it => {
      if (remaining <= 0) return;
      const stats = getPaidStatsForHead(it, pastReceipts);
      if (stats.isPaid) return; // Skip already paid heads

      if (it.frequency === 'Monthly') {
        const paidMonths = getPaidMonthsForHead(it.headId, pastReceipts);
        const unpaid = MONTHS_LIST.filter(m => !paidMonths.has(m));
        const totalHeadDue = unpaid.length * it.amount;
        if (totalHeadDue > 0) {
          const alloc = Math.min(remaining, totalHeadDue);
          payMap[it.headId] = alloc;
          const numMonths = Math.floor(alloc / it.amount);
          monthsMap[it.headId] = unpaid.slice(0, Math.max(1, numMonths));
          remaining -= alloc;
        }
      } else {
        const headDue = stats.balanceDue;
        if (headDue > 0) {
          const alloc = Math.min(remaining, headDue);
          payMap[it.headId] = alloc;
          remaining -= alloc;
        }
      }
    });

    if (remaining > 0 && items.length > 0) {
      const unpaidItem = items.find(it => !getPaidStatsForHead(it, pastReceipts).isPaid);
      if (unpaidItem) {
        payMap[unpaidItem.headId] = (payMap[unpaidItem.headId] || 0) + remaining;
      }
    }

    setCollPayNowMap(payMap);
    setCollSelectedMonths(monthsMap);
    toast.success(`Allocated ₹ ${amt.toLocaleString('en-IN')} across unpaid fee heads`);
  };

  // Calculated collection figures
  const collectionCalculations = useMemo(() => {
    let subTotal = 0;
    Object.values(collPayNowMap).forEach(v => {
      subTotal += Number(v || 0);
    });

    const lateFine = waiveFine ? 0 : Number(collDetails?.calculatedLateFine || 0);
    const grandTotal = subTotal + lateFine;

    let totalModes = 0;
    collPaymentModes.forEach(m => {
      totalModes += Number(m.amount || 0);
    });

    const tendered = Number(collTendered || 0);
    const changeToReturn = tendered > grandTotal ? tendered - grandTotal : 0;

    return {
      subTotal,
      lateFine,
      grandTotal,
      totalModes,
      changeToReturn,
      isValid: grandTotal > 0 && Math.abs(totalModes - grandTotal) < 1
    };
  }, [collPayNowMap, collDetails, waiveFine, collPaymentModes, collTendered]);

  const activeCollStudent = collDetails?.student || collStudent;

  const liveTotalPaid = useMemo(() => {
    if (collDetails?.studentReceipts && collDetails.studentReceipts.length > 0) {
      return collDetails.studentReceipts.reduce((sum, r) => r.status !== 'Cancelled' ? sum + Number(r.paidAmount || 0) : sum, 0);
    }
    return Number(activeCollStudent?.totalPaid || 0);
  }, [collDetails, activeCollStudent]);

  const liveAnnualPayable = Number(activeCollStudent?.annualPayable || 0);
  const liveNetDue = Math.max(0, liveAnnualPayable - liveTotalPaid);

  const handleSelectPaymentType = (type) => {
    setCollPaymentType(type);
    if (type === 'cash') {
      setCollPaymentModes([{ mode: 'cash', amount: collectionCalculations.grandTotal, reference: 'Cash Counter' }]);
    } else if (type === 'upi') {
      setCollPaymentModes([{ mode: 'upi', amount: collectionCalculations.grandTotal, reference: collUpiUtr ? `UTR: ${collUpiUtr}` : 'UPI Digital' }]);
    } else if (type === 'card') {
      setCollPaymentModes([{ mode: 'card', amount: collectionCalculations.grandTotal, reference: collCardRef ? `Card Ref: ${collCardRef}` : 'POS Swipe' }]);
    } else if (type === 'cheque') {
      setCollPaymentModes([{ mode: 'cheque', amount: collectionCalculations.grandTotal, reference: collChequeRef ? `Cheque: ${collChequeRef}` : 'Bank Cheque' }]);
    } else if (type === 'split') {
      if (collPaymentModes.length <= 1) {
        setCollPaymentModes([
          { mode: 'cash', amount: Math.floor(collectionCalculations.grandTotal / 2), reference: 'Cash Counter' },
          { mode: 'upi', amount: Math.ceil(collectionCalculations.grandTotal / 2), reference: 'UPI' }
        ]);
      }
    }
  };

  useEffect(() => {
    if (collPaymentType === 'cash') {
      setCollPaymentModes([{ mode: 'cash', amount: collectionCalculations.grandTotal, reference: 'Cash Counter' }]);
    } else if (collPaymentType === 'upi') {
      setCollPaymentModes([{ mode: 'upi', amount: collectionCalculations.grandTotal, reference: collUpiUtr ? `UTR: ${collUpiUtr}` : 'UPI Digital' }]);
    } else if (collPaymentType === 'card') {
      setCollPaymentModes([{ mode: 'card', amount: collectionCalculations.grandTotal, reference: collCardRef ? `Card Ref: ${collCardRef}` : 'POS Swipe' }]);
    } else if (collPaymentType === 'cheque') {
      setCollPaymentModes([{ mode: 'cheque', amount: collectionCalculations.grandTotal, reference: collChequeRef ? `Cheque: ${collChequeRef}` : 'Bank Cheque' }]);
    }
  }, [collectionCalculations.grandTotal, collPaymentType, collUpiUtr, collCardRef, collChequeRef]);

  const handleAutoFillPayment = () => {
    if (collPaymentType === 'cash') {
      setCollTendered(collectionCalculations.grandTotal);
    }
    setCollPaymentModes([
      { mode: collPaymentType === 'split' ? 'cash' : collPaymentType, amount: collectionCalculations.grandTotal, reference: collPaymentType === 'upi' ? (collUpiUtr || 'UPI') : 'Settled' }
    ]);
  };

  const handleAddPaymentMode = () => {
    setCollPaymentModes([...collPaymentModes, { mode: 'upi', amount: '', reference: '' }]);
  };

  const handleRemovePaymentMode = (idx) => {
    const list = collPaymentModes.filter((_, i) => i !== idx);
    setCollPaymentModes(list.length > 0 ? list : [{ mode: 'cash', amount: '', reference: '' }]);
  };

  const handlePaymentModeChange = (idx, field, value) => {
    const list = [...collPaymentModes];
    list[idx] = { ...list[idx], [field]: value };
    setCollPaymentModes(list);
  };

  const handleCollectPayment = async () => {
    if (!collStudent || !collectionCalculations.isValid || isCollecting) return;
    setIsCollecting(true);
    try {
      // Build receipt items list
      const items = [];
      if (collDetails && collDetails.baseStructure) {
        collDetails.baseStructure.items.forEach(it => {
          const paying = Number(collPayNowMap[it.headId] || 0);
          if (paying > 0) {
            let period = 'Academic Term';
            if (it.frequency === 'Monthly') {
              period = (collSelectedMonths[it.headId] || []).join(', ') + ' 2026';
            }
            items.push({
              headId: it.headId,
              headName: it.headName,
              amount: paying,
              period
            });
          }
        });
      }

      const payload = {
        studentId: collStudent.id,
        academicYear,
        paymentDate: new Date().toISOString(),
        paymentModes: collPaymentModes,
        items,
        subTotal: collectionCalculations.subTotal,
        discount: 0,
        lateFine: collectionCalculations.lateFine,
        waiveLateFineReason: waiveFine ? waiveFineReason : null,
        paidAmount: collectionCalculations.grandTotal,
        tenderedAmount: Number(collTendered || collectionCalculations.grandTotal),
        changeToReturn: collectionCalculations.changeToReturn,
        remarks: collRemarks
      };

      const res = await collectStudentFee(payload);
      if (res.success && res.receipt) {
        toast.success(`Fee collected! Receipt: ${res.receipt.receiptNumber}`);
        setViewingReceipt(res.receipt);
        // Refresh student table and active student details
        fetchCollStudents(collClassFilter, collSectionFilter, collSearch);
        handleSelectCollStudent(res.student || collStudent);
        refreshKpiSummary(academicYear);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setIsCollecting(false);
    }
  };

  const handleSavePreviousBalance = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!activeCollStudent) return;
    try {
      const res = await setStudentPreviousBalance(activeCollStudent.id, {
        academicYear,
        amount: Number(prevBalAmount || 0),
        remarks: prevBalRemarks
      });
      if (res.success) {
        toast.success(res.message);
        setIsPrevBalModalOpen(false);
        fetchCollStudents(collClassFilter, collSectionFilter, collSearch);
        handleSelectCollStudent(res.student || activeCollStudent);
        refreshKpiSummary(academicYear);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: RECEIPTS & PRINTING
  // -------------------------------------------------------------
  const handleViewReceipt = async (r) => {
    try {
      const res = await getFeeReceiptById(r.id);
      if (res.data) setViewingReceipt(res.data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCancelReceipt = async () => {
    if (!cancelReason.trim()) return toast.error('Please specify a cancellation reason');
    try {
      const res = await cancelFeeReceipt(cancellingReceiptId, {
        cancelReason,
        supervisorApproval: cancelSupervisor
      });
      if (res.success) {
        toast.success(res.message);
        setIsCancelReceiptOpen(false);
        loadReceipts();
        refreshKpiSummary(academicYear);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  // -------------------------------------------------------------
  // HANDLERS: SETTINGS
  // -------------------------------------------------------------
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await updateFeesSettings(settingsForm);
      if (res.success) {
        toast.success('Fees settings saved successfully');
        setSettings(res.data);
        if (res.data.activeAcademicYear) setAcademicYear(res.data.activeAcademicYear);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // -------------------------------------------------------------
  // EXPORT REPORT HELPER
  // -------------------------------------------------------------
  const handleExportReportCSV = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      return toast.error('No rows to export');
    }
    const headers = Object.keys(reportData.rows[0]);
    const csvContent = [
      headers.join(','),
      ...reportData.rows.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeReportType}_${academicYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported successfully');
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#334155] flex flex-col md:flex-row animate-fadeIn font-sans">
      <Sidebar />

      <div className="flex-1 bg-[#F7F9FC] flex flex-col min-w-0">
        <div className="min-h-[calc(100vh-4rem)] bg-[#F7F9FC] p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="w-full mx-auto space-y-6">

            {/* TOP HEADER BAR */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#172B4D] p-4 rounded-2xl border border-[#29456D] shadow-sm text-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#29456D] border border-[#29456D] flex items-center justify-center text-[#F3F6FC] shadow-md">
                  <Receipt className="w-6 h-6 text-[#F3F6FC]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Fees Management
                    </h1>
                    <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#DBEAFE] text-[#172B4D] border border-[#93C5FD]">
                      Module
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[#CBD5E1]">
                    Comprehensive fee structures, collections, receipting & financial auditing
                  </p>
                </div>
              </div>

              {/* Header Controls: Academic Year Selector + User Badge + Logout */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                {/* Academic Year Switcher */}
                <div className="flex items-center gap-2 bg-[#29456D] px-3 py-1.5 rounded-xl border border-[#29456D]">
                  <Calendar className="w-4 h-4 text-[#F3F6FC]" />
                  <span className="text-xs font-bold text-[#CBD5E1]">Year:</span>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="bg-white text-xs font-bold text-[#172B4D] px-2 py-0.5 rounded outline-none cursor-pointer hover:bg-[#DBEAFE]"
                  >
                    {academicYears.map(yr => (
                      <option key={yr} value={yr} className="bg-white text-[#172B4D]">
                        {yr} {yr === '2026-2027' ? '(Active)' : '(Closed)'}
                      </option>
                    ))}
                  </select>
                  {isYearClosed && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                      Read-only
                    </span>
                  )}
                </div>

                {/* User Role Badge */}
                <div className="hidden sm:inline-flex items-center gap-2 bg-[#29456D] px-3 py-1.5 rounded-xl border border-[#29456D]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-bold text-white">{user?.name || 'Administrator'}</span>
                  <span className="bg-[#172B4D] text-[#DBEAFE] text-[10px] font-black px-2 py-0.5 rounded-md uppercase border border-[#29456D]">
                    {user?.role || 'Admin'}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-800 border border-rose-800/80 active:scale-95 text-rose-200 hover:text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-300" />
                  <span>Logout</span>
                </button>
              </div>
            </header>

            {/* LIVE KPI SUMMARY RIBBON (5 Key Indicators) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* Collected Today */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Collected Today</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                </div>
                <div className="text-lg sm:text-xl font-black text-emerald-700">
                  {formatINR(dashboardData?.collectedToday || 0)}
                </div>
                <div className="text-[10px] font-medium text-slate-500 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" /> Live counter
                </div>
              </div>

              {/* Collected This Month */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Collected This Month</span>
                  <IndianRupee className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-lg sm:text-xl font-black text-slate-900">
                  {formatINR(dashboardData?.collectedThisMonth || 0)}
                </div>
                <div className="text-[10px] font-medium text-slate-500 mt-1">
                  Active academic period
                </div>
              </div>

              {/* Total Pending Dues */}
              <div
                onClick={() => {
                  setTab('collection');
                  setCollFeeStatusFilter('pending');
                }}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all cursor-pointer group"
                title="Click to view all students with pending dues"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Pending Dues</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-lg sm:text-xl font-black text-amber-600">
                  {formatINR(dashboardData?.totalPending || 0)}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 mt-1 flex items-center justify-between">
                  <span>Across all classes & quotas</span>
                  <span className="text-indigo-600 group-hover:underline font-bold text-[9px]">View →</span>
                </div>
              </div>

              {/* Students with Dues */}
              <div
                onClick={() => {
                  setTab('collection');
                  setCollFeeStatusFilter('pending');
                }}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-rose-300 transition-all cursor-pointer group"
                title="Click to filter and collect from students with pending dues"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Students with Dues</span>
                  <UsersRound className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-lg sm:text-xl font-black text-rose-600">
                  {dashboardData?.studentsWithDues || 0}
                  <span className="text-xs font-medium text-slate-500 ml-1">/ {dashboardData?.totalStudentsCount || 0}</span>
                </div>
                <div className="text-[10px] font-semibold text-rose-700 mt-1 flex items-center justify-between">
                  <span>{dashboardData?.totalStudentsCount ? (dashboardData?.studentsWithDuesRate ?? 0) : 0}% of enrolled accounts</span>
                  <span className="text-indigo-600 group-hover:underline font-bold text-[9px]">Collect →</span>
                </div>
              </div>

              {/* Pending Percentage */}
              {(() => {
                const totalStudents = Number(dashboardData?.totalStudentsCount || 0);
                const totalDemand = Number(dashboardData?.totalDemand || 0);
                const hasData = Boolean(dashboardData && (totalStudents > 0 || totalDemand > 0));
                const safeCollectionRate = Math.min(100, Math.max(0, Number(dashboardData?.collectionRate || 0)));
                const safePendingRate = hasData
                  ? Math.min(100, Math.max(0, dashboardData?.pendingRate !== undefined ? Number(dashboardData.pendingRate) : (100 - safeCollectionRate)))
                  : 0;
                return (
                  <div
                    onClick={() => {
                      setTab('collection');
                      setCollFeeStatusFilter('pending');
                    }}
                    className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all col-span-2 md:col-span-1 cursor-pointer group"
                    title="Click to view pending fee accounts"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Percentage</span>
                      <Percent className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-lg sm:text-xl font-black text-amber-600">
                        {safePendingRate}%
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">
                        of Total Demand
                      </div>
                    </div>
                    {/* Progress bar showing pending percentage */}
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden flex" title={`${safePendingRate}% of fee demand remains pending`}>
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${safePendingRate}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 mt-1.5 flex items-center justify-between">
                      <span>Uncollected balance</span>
                      <span className="text-indigo-600 group-hover:underline font-bold text-[9px]">View Dues →</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* HORIZONTAL INTERNAL NAVIGATION (Matches Qelvora School CRM Modern Navbar style) */}
            <div className="w-full bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1.5 min-w-max">
                {[
                  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
                  { id: 'heads', label: 'Fee Heads', icon: <Layers className="w-4 h-4" /> },
                  { id: 'quotas', label: 'Quota Master', icon: <BadgePercent className="w-4 h-4" /> },
                  { id: 'structure', label: 'Fee Structure', icon: <FileText className="w-4 h-4" /> },
                  { id: 'assign-quota', label: 'Assign Quota', icon: <UsersRound className="w-4 h-4" /> },
                  { id: 'adjustments', label: 'Student Adjustment', icon: <Sliders className="w-4 h-4" /> },
                  { id: 'collection', label: 'Fee Collection', icon: <IndianRupee className="w-4 h-4" /> },
                  { id: 'receipts', label: 'Receipts Ledger', icon: <Receipt className="w-4 h-4" /> },
                  { id: 'previous-balance', label: 'Previous Balance', icon: <Wallet className="w-4 h-4" /> },
                  { id: 'reports', label: 'Reports (11)', icon: <ClipboardCheck className="w-4 h-4" /> },
                  { id: 'settings', label: 'Fee Settings', icon: <SettingsIcon className="w-4 h-4" /> }
                ].map(tabItem => {
                  const isActive = activeTab === tabItem.id;
                  return (
                    <button
                      key={tabItem.id}
                      onClick={() => setTab(tabItem.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-slate-900 to-indigo-900 text-white shadow-sm border-l-3 border-blue-400'
                          : 'text-slate-600 hover:text-indigo-950 hover:bg-slate-100'
                      }`}
                    >
                      {tabItem.icon}
                      <span>{tabItem.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* TAB 1: OVERVIEW / DASHBOARD                                   */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* 2-Column Section: Recent Receipts & Class-Wise Arrears */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Receipts Table */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          Recent Collections
                        </h3>
                        <p className="text-xs text-slate-500">Live stream of latest issued receipts</p>
                      </div>
                      <button
                        onClick={() => setTab('receipts')}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>View All</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black border-y border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Receipt No</th>
                            <th className="py-2.5 px-3">Student</th>
                            <th className="py-2.5 px-3">Class</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dashboardData?.recentReceipts && dashboardData.recentReceipts.length > 0 ? (
                            dashboardData.recentReceipts.map(rec => (
                              <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-indigo-900">
                                  {rec.receiptNumber}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                  {rec.studentName}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 font-medium">
                                  {rec.standard}-{rec.section}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                    {rec.primaryMode}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-black text-emerald-700 text-right">
                                  {formatINR(rec.paidAmount)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    onClick={() => handleViewReceipt(rec)}
                                    className="p-1 hover:bg-indigo-100 rounded-md text-indigo-700 transition-colors cursor-pointer"
                                    title="View / Print Receipt"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="py-6 text-center text-slate-400">
                                No receipts recorded yet for {academicYear}.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Class-wise Arrears Status */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          Class-Wise Pending Dues
                        </h3>
                        <p className="text-xs text-slate-500">Uncollected fees ranked by overdue balance</p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveReportType('class-wise');
                          setTab('reports');
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Full Report</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {dashboardData?.classBreakdown && dashboardData.classBreakdown.length > 0 ? (
                        dashboardData.classBreakdown.slice(0, 6).map(cls => {
                          const total = (cls.totalPaid + cls.totalDue) || 1;
                          const paidPct = Math.round((cls.totalPaid / total) * 100);
                          return (
                            <div key={`${cls.standard}-${cls.section}`} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-extrabold text-slate-900">
                                  Class {cls.standard} - {cls.section}
                                </span>
                                <span className="font-mono font-bold text-amber-700">
                                  Due: {formatINR(cls.totalDue)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                                <span>{cls.studentsWithDue} students overdue</span>
                                <span className="font-bold text-emerald-700">{paidPct}% collected</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-1.5 rounded-full"
                                  style={{ width: `${paidPct}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-6 text-center text-slate-400 text-xs">
                          All class structures up to date.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 2: FEE HEADS MASTER                                       */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'heads' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Fee Heads Master
                    </h2>
                    <p className="text-xs text-slate-500">
                      Standard fee categories charged by the school (Tuition, Annual, Lab, Transport)
                    </p>
                  </div>
                  <button
                    onClick={handleOpenAddHead}
                    className="px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Fee Head</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-black border-y border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Fee Name</th>
                        <th className="py-3 px-3">Code</th>
                        <th className="py-3 px-3">Frequency</th>
                        <th className="py-3 px-3">Mandatory</th>
                        <th className="py-3 px-3">Applies To</th>
                        <th className="py-3 px-3">Re-issuable</th>
                        <th className="py-3 px-3">Refundable</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {heads.map(head => (
                        <tr key={head.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-extrabold text-slate-900">{head.name}</div>
                            {head.description && (
                              <div className="text-[11px] text-slate-500 line-clamp-1">{head.description}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-600">
                            {head.shortCode || '-'}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              head.frequency === 'Monthly' ? 'bg-blue-100 text-blue-800' :
                              head.frequency === 'Quarterly' ? 'bg-amber-100 text-amber-800' :
                              head.frequency === 'Half-Yearly' ? 'bg-indigo-100 text-indigo-800' :
                              head.frequency === 'Annually' ? 'bg-emerald-100 text-emerald-800' :
                              head.frequency === 'One-time' ? 'bg-slate-100 text-slate-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {head.frequency}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {head.mandatory ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600" /> Yes
                              </span>
                            ) : (
                              <span className="text-slate-500 font-medium">Optional</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-700">
                            {head.appliesTo}
                          </td>
                          <td className="py-3 px-3">
                            {head.reissuable ? (
                              <span className="text-indigo-600 font-semibold">Yes</span>
                            ) : (
                              <span className="text-slate-500">No</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {head.refundable ? (
                              <span className="text-emerald-600 font-semibold">Refundable</span>
                            ) : (
                              <span className="text-slate-500">No</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => handleToggleHeadStatus(head)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black cursor-pointer ${
                                head.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                              title="Click to toggle status"
                            >
                              {head.status}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditHead(head)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-indigo-900 cursor-pointer"
                                title="Edit Head"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteHead(head)}
                                className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Delete Head"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 3: QUOTA MASTER (Student Categories)                       */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'quotas' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Quota (Student Category) Master
                    </h2>
                    <p className="text-xs text-slate-500">
                      Admission classifications (General, RTE, Staff Ward, Sibling)
                    </p>
                  </div>
                  <button
                    onClick={handleOpenAddQuota}
                    className="px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Quota</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quotas.map(quota => (
                    <div
                      key={quota.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all bg-slate-50/50 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-sm text-slate-900">{quota.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            quota.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {quota.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-3 min-h-[32px]">
                          {quota.description || 'No description provided.'}
                        </p>
                        <div className="flex items-center justify-between text-xs py-2 border-t border-slate-200/80">
                          <span className="text-slate-500 font-medium">Enrolled Students:</span>
                          <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {quota.studentCount || 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-slate-200">
                        <button
                          onClick={() => handleOpenEditQuota(quota)}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuota(quota)}
                          className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 4: FEE STRUCTURE (Class + Quota Matrix Grid)                */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'structure' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Fee Structure Master
                    </h2>
                    <p className="text-xs text-slate-500">
                      Multi-row matrix grid for each Class & Quota combination. Edit multiple rows and save once.
                    </p>
                  </div>

                  {/* Actions: Copy to other classes, copy from quota, copy from year */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setIsCopyClassModalOpen(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Copy to Other Classes</span>
                    </button>

                    <button
                      onClick={() => setIsCopyYearModalOpen(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                      <span>Copy from Previous Year</span>
                    </button>

                    <button
                      onClick={handleTriggerPrint}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Print Structure</span>
                    </button>

                    {!isYearClosed && (
                      <button
                        onClick={handleSaveFeeStructure}
                        disabled={isSavingStructure}
                        className={`px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${isSavingStructure ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isSavingStructure ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>{isSavingStructure ? 'Saving...' : 'Save Structure'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Top Filters: Class, Section, Student-wise Filter & Quota */}
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Select Class */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Select Class:</span>
                      <select
                        value={selectedStandard}
                        onChange={(e) => {
                          setSelectedStandard(e.target.value);
                          setSelectedStudentId('all');
                        }}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        {DEFAULT_STANDARDS.map(std => (
                          <option key={std} value={std}>Class {std}</option>
                        ))}
                      </select>
                    </div>

                    {/* Select Section */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Select Section:</span>
                      <select
                        value={selectedSection}
                        onChange={(e) => {
                          setSelectedSection(e.target.value);
                          setSelectedStudentId('all');
                        }}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="All">All Sections</option>
                        {['A', 'B', 'C', 'D'].map(sec => (
                          <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Select Student (Student-wise Filter for Travelling Distance & Charges) */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Select Student:</span>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className={`border rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                          selectedStudentId !== 'all' ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-black' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="all">👥 All Students (Class Default)</option>
                        {structureStudents.map(st => (
                          <option key={st.id} value={st.id}>
                            👤 {st.name} {st.rollNumber ? `(${st.rollNumber})` : ''} {st.address ? `- ${st.address}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select Quota */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Select Quota:</span>
                      <select
                        value={selectedQuotaId}
                        onChange={(e) => setSelectedQuotaId(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        {quotas.map(q => (
                          <option key={q.id} value={q.id}>
                            {q.name} ({q.concessionType !== 'none' ? `${q.concessionValue}% concession` : 'Standard'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="ml-auto text-xs font-bold text-slate-500">
                      Last updated by: <span className="text-slate-900">{feeStructure?.updatedBy || 'Administrator'}</span>
                    </div>
                  </div>

                  {/* Travelling Distance Banner (Distance Matters for Transport Fee) */}
                  {selectedStudentId !== 'all' && (
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-2xs">
                          <Navigation className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                            <span>Student: {structureStudents.find(s => s.id === selectedStudentId)?.name || 'Selected Student'}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              Distance: {travellingDistance || 'Select slab'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-medium">
                            Charges vary by travelling distance. Select a distance slab to auto-apply to Transport/Bus Fee:
                          </p>
                        </div>
                      </div>

                      {/* Distance Slabs */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-700 mr-1">Travel Distance Slab:</span>
                        {DISTANCE_SLABS.map(slab => {
                          const isSelected = travellingDistance === slab.label;
                          return (
                            <button
                              key={slab.label}
                              type="button"
                              onClick={() => handleDistanceSlabChange(slab)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-blue-700 text-white border-blue-700 shadow-2xs scale-105'
                                  : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
                              }`}
                            >
                              {slab.label} (₹{slab.amount})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Editable Fee Heads Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-black border-y border-slate-200">
                      <tr>
                        <th className="py-3 px-3 w-12 text-center">Enable</th>
                        <th className="py-3 px-3">Fee Head</th>
                        <th className="py-3 px-3">Frequency</th>
                        <th className="py-3 px-3 w-36">Amount (₹)</th>
                        <th className="py-3 px-3">Due Date / Months Billed</th>
                        <th className="py-3 px-3 text-right">Annual Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {feeStructure?.items && feeStructure.items.map((item, idx) => {
                        const count = item.frequency === 'Monthly'
                          ? (item.billedMonths ? item.billedMonths.length : 12)
                          : item.frequency === 'Quarterly'
                          ? 4
                          : (item.frequency === 'Half-Yearly' || item.frequency === 'Half Years')
                          ? 2
                          : item.frequency === 'Term-wise'
                          ? 3
                          : 1;
                        const subtotal = item.enabled ? Number(item.amount || 0) * count : 0;

                        return (
                          <tr key={item.headId} className={`transition-colors ${item.enabled ? 'hover:bg-slate-50/80' : 'bg-slate-50/40 opacity-60'}`}>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={item.enabled}
                                disabled={isYearClosed}
                                onChange={(e) => handleStructureItemChange(idx, 'enabled', e.target.checked)}
                                className="w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3 font-extrabold text-slate-900">
                              {item.headName}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                {item.frequency}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-slate-400 font-bold">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  disabled={!item.enabled || isYearClosed}
                                  value={item.amount}
                                  onChange={(e) => handleStructureItemChange(idx, 'amount', Number(e.target.value))}
                                  className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              {item.frequency === 'Monthly' ? (
                                <div className="flex flex-wrap gap-1">
                                  {MONTHS_LIST.map(m => {
                                    const isBilled = item.billedMonths?.includes(m);
                                    return (
                                      <button
                                        type="button"
                                        key={m}
                                        disabled={!item.enabled || isYearClosed}
                                        onClick={() => handleToggleMonthChip(idx, m)}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                          isBilled
                                            ? 'bg-blue-600 text-white shadow-2xs'
                                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                        }`}
                                      >
                                        {m}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <input
                                  type="date"
                                  disabled={!item.enabled || isYearClosed}
                                  value={item.dueDate || ''}
                                  onChange={(e) => handleStructureItemChange(idx, 'dueDate', e.target.value)}
                                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                                />
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-black text-slate-900">
                              {formatINR(subtotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                      <tr>
                        <td colSpan="5" className="py-3 px-3 text-right font-black uppercase text-xs text-slate-800">
                          Total Annual Payable ({selectedStandard} - {feeStructure?.quotaName}):
                        </td>
                        <td className="py-3 px-3 text-right font-black text-sm text-emerald-800">
                          {formatINR(calculateStructureTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Installment Plan Breakdown */}
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                      Suggested Term Installment Schedule
                    </span>
                    <span className="text-[11px] font-bold text-indigo-700">3 Term Split</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {feeStructure?.installments?.map((inst, i) => {
                      const instAmt = Math.round((calculateStructureTotal * inst.percentage) / 100);
                      return (
                        <div key={i} className="bg-white p-3 rounded-lg border border-indigo-200/70 shadow-2xs">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                            <span>{inst.name}</span>
                            <span className="text-indigo-600">{inst.percentage}%</span>
                          </div>
                          <div className="text-base font-black text-indigo-950 mt-1">
                            {formatINR(instAmt)}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Due by: {inst.dueDate}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 5: ASSIGN QUOTA                                            */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'assign-quota' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Assign Student Quota
                    </h2>
                    <p className="text-xs text-slate-500">
                      Group students into fee categories (General, Management, RTE, Staff Ward, Sibling).
                    </p>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Class:</span>
                      <select
                        value={assignStd}
                        onChange={(e) => setAssignStd(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black text-slate-900 cursor-pointer"
                      >
                        {DEFAULT_STANDARDS.map(std => (
                          <option key={std} value={std}>Class {std}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Section:</span>
                      <select
                        value={assignSec}
                        onChange={(e) => setAssignSec(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black text-slate-900 cursor-pointer"
                      >
                        {['A', 'B', 'C', 'D'].map(sec => (
                          <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bulk Action Controls */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Assign To Quota:</span>
                    <select
                      value={bulkTargetQuotaId}
                      onChange={(e) => setBulkTargetQuotaId(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black text-slate-900 cursor-pointer"
                    >
                      {quotas.map(q => (
                        <option key={q.id} value={q.id}>{q.name}</option>
                      ))}
                    </select>

                    <button
                      disabled={selectedStudentIds.length === 0}
                      onClick={() => setIsBulkConfirmOpen(true)}
                      className="px-4 py-1.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      Apply to Selected ({selectedStudentIds.length})
                    </button>
                  </div>
                </div>

                {/* Student Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-black border-y border-slate-200">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={assignStudents.length > 0 && selectedStudentIds.length === assignStudents.length}
                            onChange={handleSelectAllStudents}
                            className="w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-3">Roll No</th>
                        <th className="py-3 px-3">Admission No</th>
                        <th className="py-3 px-3">Student Name</th>
                        <th className="py-3 px-3">Parent Name</th>
                        <th className="py-3 px-3">Current Quota</th>
                        <th className="py-3 px-3">Annual Demand</th>
                        <th className="py-3 px-3">Paid Receipts</th>
                        <th className="py-3 px-3">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assignStudents.map(student => {
                        const isSelected = selectedStudentIds.includes(student.id);
                        return (
                          <tr key={student.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleStudentSelection(student.id)}
                                className="w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-700">
                              {student.rollNumber || '-'}
                            </td>
                            <td className="py-3 px-3 font-mono font-medium text-slate-500">
                              {student.studentId}
                            </td>
                            <td className="py-3 px-3 font-extrabold text-slate-900">
                              {student.name}
                            </td>
                            <td className="py-3 px-3 text-slate-600 font-medium">
                              {student.parentName || '-'}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                                {student.quotaName}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900">
                              {formatINR(student.annualPayable)}
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-700">
                              {formatINR(student.totalPaid)}
                              {student.hasReceipts && (
                                <span className="ml-1 text-[10px] text-emerald-600">({student.receiptsCount} rec)</span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-black text-amber-700">
                              {formatINR(student.totalDue)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 6: STUDENT FEE ADJUSTMENT                                  */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'adjustments' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    Student Fee Adjustment
                  </h2>
                  <p className="text-xs text-slate-500">
                    Apply one-off student discounts, merit waivers, or custom adjustments without altering class fee structure.
                  </p>
                </div>

                {/* Filters Toolbar: Class Filter, Section Filter, and Search Box */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Class Filter */}
                    <div className="flex items-center gap-2">
                      <School className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Class:</span>
                      <select
                        value={adjClassFilter}
                        onChange={(e) => handleClassFilterChange(e.target.value)}
                        className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                      >
                        <option value="">All Classes</option>
                        {DEFAULT_STANDARDS.map(std => (
                          <option key={std} value={std}>Class {std}</option>
                        ))}
                      </select>
                    </div>

                    {/* Section Filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Section:</span>
                      <select
                        value={adjSectionFilter}
                        onChange={(e) => handleSectionFilterChange(e.target.value)}
                        className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                      >
                        <option value="">All Sections</option>
                        {['A', 'B', 'C', 'D'].map(sec => (
                          <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Search Input Box */}
                    <div className="relative flex-1 min-w-[240px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search student by name, roll no, or admission number..."
                        value={adjSearchQuery}
                        onChange={(e) => handleSearchAdjStudents(e.target.value)}
                        className="w-full pl-10 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                      {adjSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setAdjSearchQuery('');
                            fetchAdjStudents(adjClassFilter, adjSectionFilter, '');
                          }}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Reset Filters Button */}
                    {(adjClassFilter || adjSectionFilter || adjSearchQuery) && (
                      <button
                        type="button"
                        onClick={handleClearAdjFilters}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>

                  {/* Active Filter Info Strip */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Filtered by: <strong>{adjClassFilter ? `Class ${adjClassFilter}` : 'All Classes'}</strong>
                        {adjSectionFilter ? ` - Section ${adjSectionFilter}` : ''}
                        {adjSearchQuery ? ` matching "${adjSearchQuery}"` : ''}
                      </span>
                    </div>
                    <span className="font-bold text-indigo-900">
                      {adjSearchResults.length} student(s) found
                    </span>
                  </div>
                </div>

                {/* Selected Student Adjustment Workspace */}
                {selectedAdjStudent && studentAdjData ? (
                  <div className="space-y-4 pt-2">
                    {/* Student Info Strip */}
                    <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black">{selectedAdjStudent.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500/30 text-blue-200 border border-blue-400/30">
                            {selectedAdjStudent.quotaName}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">
                          Class {selectedAdjStudent.standard}-{selectedAdjStudent.section} | Roll: {selectedAdjStudent.rollNumber} | Adm No: {selectedAdjStudent.studentId}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Guardian: {selectedAdjStudent.parentName} ({selectedAdjStudent.parentPhone})
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        {(() => {
                          // Compute dynamic demand and due from latest studentAdjData if loaded
                          let dynAnnualPayable = selectedAdjStudent.annualPayable;
                          if (studentAdjData?.baseStructure?.items) {
                            let baseTot = 0;
                            studentAdjData.baseStructure.items.forEach(it => {
                              if (!it.enabled) return;
                              const multiplier = it.frequency === 'Monthly' ? (it.billedMonths?.length || 12) : it.frequency === 'Term-wise' ? 3 : 1;
                              baseTot += (it.amount * multiplier);
                            });

                            let netAdj = 0;
                            (studentAdjData.adjustments || []).forEach(adj => {
                              if (adj.type === 'discount_fixed') netAdj -= Number(adj.value || 0);
                              else if (adj.type === 'discount_percentage') netAdj -= Math.round((baseTot * Number(adj.value || 0)) / 100);
                              else if (adj.type === 'extra_fee' || adj.type === 'previous_balance') netAdj += Number(adj.value || 0);
                              else if (adj.type === 'full_waiver') netAdj -= baseTot;
                            });
                            dynAnnualPayable = Math.max(0, baseTot + netAdj);
                          }

                          const paidAmt = Number(selectedAdjStudent.totalPaid || 0);
                          const dynDue = Math.max(0, dynAnnualPayable - paidAmt);

                          return (
                            <>
                              <div>
                                <div className="text-[10px] text-slate-400 uppercase font-semibold">Net Annual Demand</div>
                                <div className="text-sm font-bold text-white">{formatINR(dynAnnualPayable)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-400 uppercase font-semibold">Paid Amount</div>
                                <div className="text-sm font-bold text-emerald-400">{formatINR(paidAmt)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-400 uppercase font-semibold">Balance Due</div>
                                <div className="text-base font-black text-amber-400">{formatINR(dynDue)}</div>
                              </div>
                            </>
                          );
                        })()}
                        <div className="flex flex-col gap-1.5 ml-2">
                          <button
                            onClick={() => setIsAdjModalOpen(true)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer whitespace-nowrap"
                          >
                            + Add Adjustment
                          </button>
                          <button
                            onClick={() => setSelectedAdjStudent(null)}
                            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap"
                          >
                            ← Choose Different Student
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Side-by-Side Fee Heads Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 flex items-center justify-between">
                        <span>Side-by-Side Fee Structure & Adjustment Breakdown</span>
                        <span className="text-[11px] text-slate-500">Student: {selectedAdjStudent.name}</span>
                      </div>
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black border-y border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Fee Head</th>
                            <th className="py-2.5 px-3">Frequency & Calculation</th>
                            <th className="py-2.5 px-3">Base Unit Rate</th>
                            <th className="py-2.5 px-3">Annualized Standard Demand</th>
                            <th className="py-2.5 px-3">Adjustment / Concession</th>
                            <th className="py-2.5 px-3 text-right">Net Annual Payable</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            let totalBaseAnnualDemand = 0;
                            let totalNetAnnualDemand = 0;
                            let totalConcessionValue = 0;

                            const rows = studentAdjData.baseStructure?.items?.map(it => {
                              if (!it.enabled) return null;
                              
                              // Frequency multiplier
                              // Monthly = 12 months, Term-wise = 3 terms, One-time / Annual = 1
                              const multiplier = it.frequency === 'Monthly' 
                                ? (it.billedMonths?.length || 12) 
                                : it.frequency === 'Term-wise' 
                                  ? 3 
                                  : 1;

                              const annualBaseForHead = it.amount * multiplier;
                              totalBaseAnnualDemand += annualBaseForHead;

                              const headAdjustments = (studentAdjData.adjustments || []).filter(a =>
                                a.headName.toLowerCase().includes(it.headName.toLowerCase()) || a.headName.includes('All')
                              );

                              // Calculate net annual payable for this head
                              let netAnnualForHead = annualBaseForHead;
                              headAdjustments.forEach(a => {
                                if (a.type === 'discount_fixed') {
                                  netAnnualForHead = Math.max(0, netAnnualForHead - a.value);
                                } else if (a.type === 'discount_percentage') {
                                  netAnnualForHead = Math.max(0, Math.round(netAnnualForHead * (1 - a.value / 100)));
                                } else if (a.type === 'full_waiver') {
                                  netAnnualForHead = 0;
                                } else if (a.type === 'extra_fee') {
                                  netAnnualForHead += a.value;
                                }
                              });

                              totalNetAnnualDemand += netAnnualForHead;
                              totalConcessionValue += Math.max(0, annualBaseForHead - netAnnualForHead);

                              const stats = getPaidStatsForHead(it, studentAdjData.studentReceipts || []);

                              return (
                                <tr key={it.headId} className={`transition-colors ${stats.isPaid ? 'bg-emerald-50/25 hover:bg-emerald-50/40' : stats.isPartial ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-slate-50'}`}>
                                  <td className="py-3 px-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="font-extrabold text-slate-900">{it.headName}</div>
                                      {stats.isPaid && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          PAID
                                        </span>
                                      )}
                                      {stats.isPartial && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                          PARTIAL (Paid ₹{stats.totalPaid.toLocaleString('en-IN')})
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        it.frequency === 'Monthly'
                                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                          : it.frequency === 'Term-wise'
                                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      }`}>
                                        {it.frequency}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-medium">
                                        {it.frequency === 'Monthly' ? '(× 12 Months)' : it.frequency === 'Term-wise' ? '(× 3 Terms)' : '(Annual)'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 font-semibold text-slate-700">{formatINR(it.amount)}</td>
                                  <td className="py-3 px-3 font-bold text-slate-900">
                                    {formatINR(annualBaseForHead)}
                                  </td>
                                  <td className="py-3 px-3">
                                    {headAdjustments.length > 0 ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                        {headAdjustments.map(a => `${a.reasonType} (${a.type === 'full_waiver' ? '100% Waiver' : a.type === 'discount_percentage' ? `${a.value}%` : `₹${a.value}`})`).join(', ')}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">No adjustment</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    <div className="font-black text-slate-900">{formatINR(netAnnualForHead)}</div>
                                    {stats.isPaid ? (
                                      <span className="text-[10px] font-bold text-emerald-700 flex items-center justify-end gap-1 mt-0.5">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>Fully Paid (₹0 Due)</span>
                                      </span>
                                    ) : stats.isPartial ? (
                                      <span className="text-[10px] font-bold text-amber-700 block mt-0.5">
                                        Paid: {formatINR(stats.totalPaid)} | Due: {formatINR(Math.max(0, netAnnualForHead - stats.totalPaid))}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 block mt-0.5">Unpaid</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      onClick={() => {
                                        setAdjForm({ ...adjForm, headName: it.headName });
                                        setIsAdjModalOpen(true);
                                      }}
                                      className="px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer"
                                    >
                                      Adjust
                                    </button>
                                  </td>
                                </tr>
                              );
                            });

                            const paidAmt = Number(selectedAdjStudent.totalPaid || 0);
                            // Live due amount after adjustment
                            const liveNetDue = Math.max(0, totalNetAnnualDemand - paidAmt);

                            return (
                              <>
                                {rows}
                                {/* Grand Total Summary Footer */}
                                <tr className="bg-slate-100/90 font-extrabold border-t-2 border-slate-300 text-slate-900 text-xs">
                                  <td className="py-3.5 px-3 uppercase tracking-wider font-black" colSpan={3}>
                                    Total Annual Standard Demand
                                  </td>
                                  <td className="py-3.5 px-3 font-black text-slate-800">
                                    {formatINR(totalBaseAnnualDemand)}
                                  </td>
                                  <td className="py-3.5 px-3 text-emerald-700 font-bold">
                                    {totalConcessionValue > 0 ? `- ${formatINR(totalConcessionValue)}` : '—'}
                                  </td>
                                  <td className="py-3.5 px-3 text-right font-black text-indigo-950 text-sm">
                                    {formatINR(totalNetAnnualDemand)}
                                  </td>
                                  <td></td>
                                </tr>
                                <tr className="bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border-t border-slate-200 text-xs">
                                  <td colSpan={5} className="py-3 px-3 text-right font-bold text-slate-700">
                                    <div className="flex items-center justify-end gap-6 text-xs">
                                      <span>Total Paid: <strong className="text-emerald-700">{formatINR(paidAmt)}</strong></span>
                                      <span className="text-sm font-black text-slate-900">Net Balance Due After Adjustments:</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-right font-black text-base text-amber-600">
                                    {formatINR(liveNetDue)}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                      liveNetDue === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                                    }`}>
                                      {liveNetDue === 0 ? 'Fully Settled' : 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* Applied Adjustments Ledger */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 flex items-center justify-between">
                        <span>Active Fee Adjustments & Concessions History</span>
                        <span className="text-[11px] text-slate-500">{studentAdjData.adjustments?.length || 0} Records</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {studentAdjData.adjustments && studentAdjData.adjustments.length > 0 ? (
                          studentAdjData.adjustments.map(adj => (
                            <div key={adj.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                              <div>
                                <span className="font-extrabold text-slate-900">{adj.reasonType}</span>
                                <span className="text-slate-500 ml-2">({adj.headName})</span>
                                {adj.reasonText && (
                                  <p className="text-[11px] text-slate-500 mt-0.5">{adj.reasonText}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-black text-emerald-700 text-sm">
                                  {adj.type === 'full_waiver' ? '100% Full Waiver' :
                                   adj.type === 'discount_percentage' ? `${adj.value}% Concession` :
                                   `₹ ${adj.value} Discount`}
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  Approved by: {adj.approverName} | Date: {adj.appliedAt?.slice(0, 10)}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-6 text-center text-slate-400 text-xs">
                            No special adjustments recorded for this student. Standard class structure applies.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Student Browser Table when no student is selected yet */
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 flex items-center justify-between">
                      <span>Click Any Student Below to Modify Fees & Apply Adjustments</span>
                      <span className="text-[11px] font-bold text-slate-600">{adjSearchResults.length} Students</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black border-y border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Roll No</th>
                            <th className="py-2.5 px-3">Admission No</th>
                            <th className="py-2.5 px-3">Student Name</th>
                            <th className="py-2.5 px-3">Class & Section</th>
                            <th className="py-2.5 px-3">Quota</th>
                            <th className="py-2.5 px-3">Annual Demand</th>
                            <th className="py-2.5 px-3">Total Paid</th>
                            <th className="py-2.5 px-3">Balance Due</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {adjSearchResults.length > 0 ? (
                            adjSearchResults.map(st => (
                              <tr key={st.id} className="hover:bg-indigo-50/50 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{st.rollNumber || '-'}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-500">{st.studentId}</td>
                                <td className="py-2.5 px-3 font-extrabold text-slate-900">{st.name}</td>
                                <td className="py-2.5 px-3 text-slate-700 font-semibold">{st.standard}-{st.section}</td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                                    {st.quotaName}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">{formatINR(st.annualPayable)}</td>
                                <td className="py-2.5 px-3 font-bold text-emerald-700">{formatINR(st.totalPaid)}</td>
                                <td className="py-2.5 px-3 font-black text-amber-700">{formatINR(st.totalDue)}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    onClick={() => handleSelectAdjStudent(st)}
                                    className="px-3 py-1 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1 mx-auto"
                                  >
                                    <span>Adjust Fees</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="9" className="p-8 text-center text-slate-400 text-xs">
                                {isAdjSearching ? 'Searching students...' : 'No students matching the selected Class, Section, or Search query.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 7: COLLECTION (Fast, Keyboard-Friendly)                    */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'collection' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Fee Collection Desk
                    </h2>
                    <p className="text-xs text-slate-500">
                      Fast keyboard-friendly checkout, itemized head selection, partial/advance payment & split modes.
                    </p>
                  </div>
                </div>

                {/* Filters Toolbar: Class Filter, Section Filter, Status Filter, and Search Box */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Class Filter */}
                    <div className="flex items-center gap-2">
                      <School className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Class:</span>
                      <select
                        value={collClassFilter}
                        onChange={(e) => handleCollClassChange(e.target.value)}
                        className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                      >
                        <option value="">All Classes</option>
                        {DEFAULT_STANDARDS.map(std => (
                          <option key={std} value={std}>Class {std}</option>
                        ))}
                      </select>
                    </div>

                    {/* Section Filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Section:</span>
                      <select
                        value={collSectionFilter}
                        onChange={(e) => handleCollSectionChange(e.target.value)}
                        className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                      >
                        <option value="">All Sections</option>
                        {['A', 'B', 'C', 'D'].map(sec => (
                          <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Fee Status Filter: All, Pending, Paid */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Status:</span>
                      <div className="inline-flex items-center bg-white p-1 rounded-xl border border-slate-300 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setCollFeeStatusFilter('all')}
                          className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                            collFeeStatusFilter === 'all'
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <span>All</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                            collFeeStatusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {collStudentList.length}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCollFeeStatusFilter('pending')}
                          className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                            collFeeStatusFilter === 'pending'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'text-amber-800 hover:bg-amber-50'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${collFeeStatusFilter === 'pending' ? 'bg-white' : 'bg-amber-500'}`}></span>
                          <span>Pending</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                            collFeeStatusFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {collPendingCount}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCollFeeStatusFilter('paid')}
                          className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                            collFeeStatusFilter === 'paid'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-emerald-800 hover:bg-emerald-50'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${collFeeStatusFilter === 'paid' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                          <span>Paid</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                            collFeeStatusFilter === 'paid' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {collPaidCount}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Search Input Box */}
                    <div className="relative flex-1 min-w-[240px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Type student name, roll number, or admission number to collect..."
                        value={collSearch}
                        onChange={(e) => handleSearchCollStudent(e.target.value)}
                        className="w-full pl-10 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                      {collSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setCollSearch('');
                            fetchCollStudents(collClassFilter, collSectionFilter, '');
                          }}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Reset Filters Button */}
                    {(collClassFilter || collSectionFilter || collSearch || collFeeStatusFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={handleClearCollFilters}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>

                  {/* Active Filter Info Strip */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Filtered by: <strong>{collClassFilter ? `Class ${collClassFilter}` : 'All Classes'}</strong>
                        {collSectionFilter ? ` - Section ${collSectionFilter}` : ''}
                        {collFeeStatusFilter !== 'all' ? ` - Status: ${collFeeStatusFilter === 'pending' ? 'Pending Due' : 'Fully Paid'}` : ''}
                        {collSearch ? ` matching "${collSearch}"` : ''}
                      </span>
                    </div>
                    <span className="font-bold text-indigo-900">
                      {filteredCollStudentList.length} student(s) found
                    </span>
                  </div>
                </div>

                {/* Main Collection Screen */}
                {collStudent && collDetails ? (
                  <div className="space-y-6 pt-2">
                    {/* Student Profile Strip */}
                    <div className="p-4 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-black text-lg border border-white/20">
                          {(activeCollStudent?.name || collStudent.name).charAt(0)}
                        </div>
                        <div>
                          <div className="text-base font-black">{activeCollStudent?.name || collStudent.name}</div>
                          <div className="text-xs text-slate-300">
                            Class {activeCollStudent?.standard || collStudent.standard}-{activeCollStudent?.section || collStudent.section} | Roll: {activeCollStudent?.rollNumber || collStudent.rollNumber} | Adm: {activeCollStudent?.studentId || collStudent.studentId}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Guardian: {activeCollStudent?.parentName || collStudent.parentName} ({activeCollStudent?.parentPhone || collStudent.parentPhone})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6 text-right">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Quota</div>
                          <div className="text-xs font-bold text-blue-300">{activeCollStudent?.quotaName || collStudent.quotaName}</div>
                        </div>
                        {Number(activeCollStudent?.previousYearBalance || 0) > 0 && (
                          <div className="bg-amber-400/20 px-2.5 py-1 rounded-lg border border-amber-300/40 text-left">
                            <div className="text-[9px] text-amber-300 uppercase font-black">Prev. Year Balance</div>
                            <div className="text-xs font-black text-amber-200">{formatINR(activeCollStudent.previousYearBalance)}</div>
                          </div>
                        )}
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Payable</div>
                          <div className="text-sm font-bold">{formatINR(liveAnnualPayable)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Already Paid</div>
                          <div className="text-sm font-bold text-emerald-400">{formatINR(liveTotalPaid)}</div>
                        </div>
                        <div className="bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/20">
                          <div className="text-[10px] text-slate-300 uppercase font-black">Net Due</div>
                          <div className="text-lg font-black text-amber-300">{formatINR(liveNetDue)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCollStudent(null);
                            setCollDetails(null);
                          }}
                          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg border border-white/30 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <span>Change Student</span>
                        </button>
                      </div>
                    </div>

                    {/* Siblings Alert Strip */}
                    {collDetails.siblings && collDetails.siblings.length > 0 && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-900">
                          <UsersRound className="w-4 h-4 text-amber-600" />
                          <span>
                            <strong>Sibling Detected:</strong> {collDetails.siblings.map(sib => `${sib.name} (Class ${sib.standard}-${sib.section})`).join(', ')}
                          </span>
                        </div>
                        <button
                          onClick={() => handleSelectCollStudent(collDetails.siblings[0])}
                          className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg cursor-pointer"
                        >
                          Collect for Sibling
                        </button>
                      </div>
                    )}

                    {/* PREVIOUS PAYMENT & CLEARED MONTHS HISTORY CARD */}
                    <div className="bg-white p-4 rounded-xl border border-indigo-200/80 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">Payment & Month Clearance History</h4>
                            <span className="text-[11px] text-slate-500">
                              Tracking previous receipts and cleared months for this student
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                            {collDetails.studentReceipts?.length || 0} Receipts Issued
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                          >
                            {showPaymentHistory ? 'Hide Details' : 'Show Details'}
                          </button>
                        </div>
                      </div>

                      {/* Cleared Months & Cleared Heads Visual Tracker */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        {/* Monthly Installments Cleared */}
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              <span>Monthly Installments Cleared:</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">{allPaidMonths.length}/12 Months</span>
                          </div>
                          {allPaidMonths.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {allPaidMonths.map(m => (
                                <span
                                  key={m}
                                  className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs"
                                >
                                  <span>{m}</span>
                                  <span>✓ Paid</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-700 font-semibold italic">
                              No monthly fee installments cleared yet.
                            </span>
                          )}
                        </div>

                        {/* One-Time & Term-Wise Heads Cleared */}
                        <div className="space-y-1.5 md:border-l md:border-slate-200 md:pl-3">
                          <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Collected / Paid Fee Heads:</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">{allPaidFeeHeads.length} Heads</span>
                          </div>
                          {allPaidFeeHeads.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {allPaidFeeHeads.map(h => (
                                <span
                                  key={h.headId}
                                  className={`px-2 py-0.5 rounded text-[10px] font-black border flex items-center gap-1 shadow-2xs ${
                                    h.isPaid
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : 'bg-amber-100 text-amber-900 border-amber-300'
                                  }`}
                                  title={`${h.headName}: Paid ₹${h.totalPaid.toLocaleString('en-IN')}`}
                                >
                                  <span>{h.headName}</span>
                                  <span>{h.isPaid ? '✓ Paid' : `Part (${formatINR(h.totalPaid)})`}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-700 font-semibold italic">
                              No annual or term fee heads collected yet.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Past Receipts Mini Ledger */}
                      {showPaymentHistory && collDetails.studentReceipts && collDetails.studentReceipts.length > 0 && (
                        <div className="overflow-x-auto pt-1">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 uppercase text-[9px] font-black border-y border-slate-200">
                              <tr>
                                <th className="py-2 px-2.5">Receipt No</th>
                                <th className="py-2 px-2.5">Payment Date</th>
                                <th className="py-2 px-2.5">Fee Heads / Months Covered</th>
                                <th className="py-2 px-2.5">Payment Mode</th>
                                <th className="py-2 px-2.5 text-right">Amount Paid</th>
                                <th className="py-2 px-2.5 text-center">Receipt</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {collDetails.studentReceipts.map(rec => (
                                <tr key={rec.id} className="hover:bg-slate-50">
                                  <td className="py-2 px-2.5 font-mono font-black text-indigo-950">
                                    {rec.receiptNumber}
                                  </td>
                                  <td className="py-2 px-2.5 text-slate-600 font-medium">
                                    {rec.paymentDate ? rec.paymentDate.slice(0, 10) : '-'}
                                  </td>
                                  <td className="py-2 px-2.5 font-semibold text-slate-800">
                                    {rec.items && rec.items.length > 0 ? (
                                      rec.items.map(it => `${it.headName || 'Fee'}${it.period ? ` (${it.period})` : ''}`).join('; ')
                                    ) : (
                                      'Fee Settlement'
                                    )}
                                  </td>
                                  <td className="py-2 px-2.5">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                      {rec.primaryMode}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2.5 text-right font-black text-emerald-700">
                                    {formatINR(rec.paidAmount)}
                                  </td>
                                  <td className="py-2 px-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleViewReceipt(rec)}
                                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded cursor-pointer"
                                      title="View / Print Receipt"
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Quick Custom Amount from Parent & Multi-Selection Bar */}
                    <div className="bg-slate-100/90 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      {/* Custom Amount Parent is Paying */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 whitespace-nowrap">
                          <IndianRupee className="w-4 h-4 text-emerald-600" />
                          <span>Custom Amount Parent is Paying:</span>
                        </div>
                        <div className="relative w-36">
                          <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold text-xs">₹</span>
                          <input
                            type="number"
                            min="1"
                            placeholder="e.g. 5000"
                            value={customPayAmount}
                            onChange={(e) => setCustomPayAmount(e.target.value)}
                            className="w-full pl-6 pr-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyCustomAmount()}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <span>Allocate Amount</span>
                        </button>
                        <div className="flex items-center gap-1">
                          {[1000, 2000, 5000, 10000].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => {
                                setCustomPayAmount(String(amt));
                                handleApplyCustomAmount(amt);
                              }}
                              className="px-2 py-1 bg-white hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded border border-slate-200 cursor-pointer"
                            >
                              ₹{amt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Select All / Clear Selection Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSelectAllFeeHeads}
                          className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Select All Dues
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAllFeeHeads}
                          className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Clear Selection
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPrevBalAmount(activeCollStudent?.previousYearBalance || '');
                            setPrevBalRemarks('Unpaid fee arrears from previous academic year');
                            setIsPrevBalModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Add or update Previous Year Balance for this student"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>+ Previous Year Balance</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddChargeOpen(true)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>One-Time Charge</span>
                        </button>
                      </div>
                    </div>

                    {/* Fee Selection Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 flex items-center justify-between">
                        <span>Select Fee Heads to Collect (No Default Selection - Accountant Can Pick Any Heads or Custom Amount)</span>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          {Object.values(collPayNowMap).filter(v => Number(v) > 0).length} head(s) selected
                        </span>
                      </div>

                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black border-y border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 w-12 text-center">Select</th>
                            <th className="py-2.5 px-3">Fee Head</th>
                            <th className="py-2.5 px-3">Frequency</th>
                            <th className="py-2.5 px-3">Standard Demand & Status</th>
                            <th className="py-2.5 px-3">Month / Term / Collection Status</th>
                            <th className="py-2.5 px-3 w-44 text-right">Pay Now (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {collDetails.baseStructure?.items?.map(it => {
                            if (!it.enabled) return null;
                            const payVal = collPayNowMap[it.headId] ?? '';
                            const isHeadSelected = Number(collPayNowMap[it.headId] || 0) > 0;
                            const headPaidMonths = getPaidMonthsForHead(it.headId, collDetails?.studentReceipts || []);
                            const paidStats = getPaidStatsForHead(it, collDetails?.studentReceipts || []);
                            const { isPaid, isPartial, totalPaid, balanceDue, standardDemand, paidReceiptDetails } = paidStats;

                            return (
                              <tr
                                key={it.headId}
                                className={`transition-colors ${
                                  isPaid
                                    ? 'bg-emerald-50/25 hover:bg-emerald-50/40'
                                    : isPartial
                                      ? 'bg-amber-50/20 hover:bg-amber-50/40'
                                      : isHeadSelected
                                        ? 'bg-indigo-50/30'
                                        : 'hover:bg-slate-50'
                                }`}
                              >
                                <td className="py-3 px-3 text-center">
                                  {isPaid ? (
                                    <div className="flex items-center justify-center" title={`Collected & Paid in Full (Receipt: ${paidReceiptDetails[0]?.receiptNumber || 'Active'})`}>
                                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    </div>
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={isHeadSelected}
                                      onChange={() => handleToggleHeadSelection(it)}
                                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`font-extrabold ${isPaid ? 'text-slate-700 cursor-default' : 'text-slate-900 cursor-pointer'}`}
                                      onClick={() => !isPaid && handleToggleHeadSelection(it)}
                                    >
                                      {it.headName}
                                    </span>
                                    {isPaid && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        PAID
                                      </span>
                                    )}
                                    {isPartial && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                        PARTIAL (Paid ₹{totalPaid.toLocaleString('en-IN')})
                                      </span>
                                    )}
                                    {it.mandatory && (
                                      <span className="text-[10px] text-rose-600 font-bold">*Mandatory</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    it.frequency === 'Monthly'
                                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                      : it.frequency === 'Term-wise'
                                        ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                        : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {it.frequency}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  {isPaid ? (
                                    <div>
                                      <div className="text-xs font-bold text-slate-400 line-through">
                                        {formatINR(standardDemand)}
                                      </div>
                                      <div className="text-[11px] font-black text-emerald-700 flex items-center gap-1 mt-0.5">
                                        <span>✓ Paid {formatINR(totalPaid)}</span>
                                        <span className="text-[10px] text-emerald-600 font-bold">(Balance: ₹0)</span>
                                      </div>
                                    </div>
                                  ) : isPartial ? (
                                    <div>
                                      <div className="text-xs font-bold text-slate-800">
                                        {formatINR(standardDemand)}
                                      </div>
                                      <div className="text-[10px] font-bold text-amber-700 mt-0.5">
                                        Paid: {formatINR(totalPaid)} | <strong className="text-rose-600">Due: {formatINR(balanceDue)}</strong>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="text-xs font-semibold text-slate-700">
                                        {formatINR(it.amount)} {it.frequency === 'Monthly' ? '/mo' : ''}
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-medium">
                                        {it.frequency === 'Monthly' ? `Annual: ${formatINR(standardDemand)}` : 'Full Term Due'}
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  {it.frequency === 'Monthly' ? (
                                    <div className="flex flex-wrap gap-1 items-center">
                                      {MONTHS_LIST.map(m => {
                                        const isAlreadyPaid = headPaidMonths.has(m);
                                        const selected = collSelectedMonths[it.headId]?.includes(m);

                                        if (isAlreadyPaid) {
                                          return (
                                            <span
                                              key={m}
                                              className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5 cursor-default shadow-2xs"
                                              title="Already paid in previous receipt"
                                            >
                                              <span>{m}</span>
                                              <span className="text-[9px]">✓ Paid</span>
                                            </span>
                                          );
                                        }

                                        return (
                                          <button
                                            type="button"
                                            key={m}
                                            onClick={() => {
                                              const curr = collSelectedMonths[it.headId] || [];
                                              const next = curr.includes(m) ? curr.filter(x => x !== m) : [...curr, m];
                                              setCollSelectedMonths({ ...collSelectedMonths, [it.headId]: next });
                                              setCollPayNowMap({ ...collPayNowMap, [it.headId]: next.length * it.amount });
                                            }}
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                              selected ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                            }`}
                                          >
                                            {m}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : isPaid ? (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-800 shadow-2xs">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span className="text-xs font-black">Full Fee Collected & Paid</span>
                                      {paidReceiptDetails.length > 0 && (
                                        <span className="text-[10px] font-mono font-bold text-emerald-800 bg-white/90 px-1.5 py-0.5 rounded border border-emerald-200 ml-1">
                                          {paidReceiptDetails[0].receiptNumber}
                                        </span>
                                      )}
                                    </div>
                                  ) : isPartial ? (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                                      <span className="text-xs font-bold">Partially Collected</span>
                                      <span className="text-[10px] font-mono font-bold bg-white/90 px-1.5 py-0.5 rounded border border-amber-300">
                                        Due: {formatINR(balanceDue)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 font-medium text-xs">
                                      {it.frequency === 'Term-wise' ? 'Full Term Fee (3 Terms)' : 'Full Term Fee'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  {isPaid ? (
                                    <div className="flex items-center justify-end gap-2">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        PAID
                                      </span>
                                      <div className="relative inline-block w-20">
                                        <span className="absolute left-2.5 top-2 text-slate-300 font-bold">₹</span>
                                        <input
                                          type="text"
                                          disabled
                                          value="0"
                                          className="w-full pl-6 pr-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-400 text-right cursor-not-allowed"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="relative inline-block w-32">
                                      <span className="absolute left-2.5 top-2 text-slate-400 font-bold">₹</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max={balanceDue}
                                        placeholder={isPartial ? String(balanceDue) : "0"}
                                        value={payVal}
                                        onChange={(e) => setCollPayNowMap({
                                          ...collPayNowMap,
                                          [it.headId]: Number(e.target.value)
                                        })}
                                        className={`w-full pl-6 pr-2 py-1.5 bg-white border ${isPartial ? 'border-amber-300' : 'border-slate-300'} rounded-lg text-xs font-black text-slate-900 text-right focus:ring-2 focus:ring-indigo-500`}
                                      />
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Overdue Late Fine Line */}
                          {collDetails.calculatedLateFine > 0 && (
                            <tr className="bg-amber-50/50">
                              <td colSpan="3" className="py-3 px-3">
                                <div className="font-extrabold text-amber-900 flex items-center gap-1.5">
                                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                                  <span>Automated Overdue Late Fine</span>
                                </div>
                                <div className="text-[10px] text-amber-700">
                                  Rule: ₹{collDetails.fineRule?.amount}/day after {collDetails.fineRule?.gracePeriodDays} days grace period.
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={waiveFine}
                                    onChange={(e) => setWaiveFine(e.target.checked)}
                                    className="w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <span>Waive Late Fine</span>
                                </label>
                                {waiveFine && (
                                  <input
                                    type="text"
                                    placeholder="Enter waiver authorization reason..."
                                    value={waiveFineReason}
                                    onChange={(e) => setWaiveFineReason(e.target.value)}
                                    className="mt-1 w-full p-1 bg-white border border-slate-300 rounded text-[11px]"
                                  />
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-black text-amber-900">
                                {waiveFine ? '₹ 0.00 (Waived)' : formatINR(collDetails.calculatedLateFine)}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* PAYMENT MODES & CHECKOUT SECTION */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                      {/* Payment Method Selector Tabs */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                        <div>
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                            Select Payment Method
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Choose how the parent is settling this fee payment
                          </span>
                        </div>

                        {/* Mode Pills */}
                        <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleSelectPaymentType('cash')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                              collPaymentType === 'cash'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            <span>Cash</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectPaymentType('upi')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                              collPaymentType === 'upi'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>UPI / QR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectPaymentType('card')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                              collPaymentType === 'card'
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Card</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectPaymentType('cheque')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                              collPaymentType === 'cheque'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                          >
                            <Building className="w-3.5 h-3.5" />
                            <span>Cheque/DD</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectPaymentType('split')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                              collPaymentType === 'split'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Split Mode</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left: Mode-Specific Workspace (7 cols) */}
                        <div className="lg:col-span-7 space-y-4">
                          {/* 1. CASH DESK */}
                          {collPaymentType === 'cash' && (
                            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-2xs space-y-4">
                              <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                                    <Wallet className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-slate-900">Cash Payment Counter</h4>
                                    <span className="text-[11px] text-slate-500">Collect currency notes and calculate exact return change</span>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full">
                                  Instant Settlement
                                </span>
                              </div>

                              {/* Amount Payable Highlight */}
                              <div className="flex items-center justify-between bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                                <div>
                                  <span className="text-[11px] font-bold text-emerald-800 block">Total Cash to Collect</span>
                                  <span className="text-xl font-black text-emerald-950">
                                    {formatINR(collectionCalculations.grandTotal)}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setCollTendered(String(collectionCalculations.grandTotal))}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-2xs cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Exact Amount Given</span>
                                </button>
                              </div>

                              {/* Cash Tendered Input & Quick Denominations */}
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 block">
                                  Cash Received from Parent (₹)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-2.5 text-slate-400 font-black text-sm">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Enter cash given by parent..."
                                    value={collTendered}
                                    onChange={(e) => setCollTendered(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                                  />
                                </div>

                                {/* Quick Count Helper Buttons */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  <span className="text-[10px] font-bold text-slate-400 mr-1">Quick Add:</span>
                                  {[500, 1000, 2000, 5000].map(amt => (
                                    <button
                                      key={amt}
                                      type="button"
                                      onClick={() => setCollTendered(String((Number(collTendered) || 0) + amt))}
                                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-extrabold rounded-lg border border-slate-200 cursor-pointer"
                                    >
                                      +₹{amt}
                                    </button>
                                  ))}
                                  {collTendered && (
                                    <button
                                      type="button"
                                      onClick={() => setCollTendered('')}
                                      className="px-2 py-1 text-rose-600 hover:bg-rose-50 text-[11px] font-bold rounded-lg cursor-pointer"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Change to Return Highlight Card */}
                              {collTendered && Number(collTendered) >= collectionCalculations.grandTotal ? (
                                <div className="bg-emerald-600 text-white p-3.5 rounded-xl shadow-xs flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black">
                                      ↩
                                    </div>
                                    <div>
                                      <span className="text-[11px] font-medium text-emerald-100 block">
                                        Change to Return to Parent
                                      </span>
                                      <span className="text-xl font-black tracking-tight">
                                        {formatINR(collectionCalculations.changeToReturn)}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[11px] bg-white/20 px-2.5 py-1 rounded-full font-bold">
                                    Cash Matched ✓
                                  </span>
                                </div>
                              ) : collTendered && Number(collTendered) < collectionCalculations.grandTotal ? (
                                <div className="bg-amber-500 text-white p-3 rounded-xl shadow-xs flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-100" />
                                    <div>
                                      <span className="text-[11px] font-medium text-amber-100 block">Short of Total</span>
                                      <span className="text-sm font-black">
                                        Needs ₹ {formatINR(collectionCalculations.grandTotal - Number(collTendered))} more
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-slate-100 p-2.5 rounded-xl text-center text-slate-500 text-xs font-semibold">
                                  Type the amount given or click &apos;Exact Amount Given&apos; to calculate change.
                                </div>
                              )}
                            </div>
                          )}

                          {/* 2. UPI / QR CODE DESK */}
                          {collPaymentType === 'upi' && (
                            <div className="bg-white p-4 rounded-xl border border-indigo-200/80 shadow-2xs space-y-4">
                              <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                                    <QrCode className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-slate-900">Instant UPI & QR Code Desk</h4>
                                    <span className="text-[11px] text-slate-500">Scan QR via GPay, PhonePe, Paytm or enter UPI UTR</span>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-full">
                                  Zero Friction
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                                {/* Dynamic QR Box */}
                                <div className="sm:col-span-5 bg-gradient-to-b from-indigo-50 to-slate-50 p-3 rounded-xl border border-indigo-100 text-center flex flex-col items-center">
                                  <div className="bg-white p-2 rounded-lg shadow-2xs border border-slate-200 inline-block mb-2">
                                    <img
                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                                        `upi://pay?pa=schoolfees@icici&pn=InkSchool&am=${collectionCalculations.grandTotal}&cu=INR`
                                      )}`}
                                      alt="UPI Payment QR Code"
                                      className="w-28 h-28 object-contain"
                                    />
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-500">
                                    Scan to Pay <strong className="text-indigo-950 font-black">{formatINR(collectionCalculations.grandTotal)}</strong>
                                  </div>
                                  <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-700 font-mono font-bold bg-indigo-100/60 px-2 py-0.5 rounded">
                                    <span>schoolfees@icici</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard?.writeText('schoolfees@icici');
                                        toast.success('School UPI ID copied!');
                                      }}
                                      className="text-indigo-900 hover:text-indigo-600 cursor-pointer ml-1"
                                      title="Copy UPI ID"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* UTR / Transaction Details */}
                                <div className="sm:col-span-7 space-y-3">
                                  <div>
                                    <span className="text-[11px] font-bold text-slate-500 block">Payable via UPI</span>
                                    <span className="text-xl font-black text-indigo-950">
                                      {formatINR(collectionCalculations.grandTotal)}
                                    </span>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 block">
                                      UPI Transaction ID / 12-Digit UTR
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. 403819283741 or UPI Ref ID"
                                      value={collUpiUtr}
                                      onChange={(e) => setCollUpiUtr(e.target.value)}
                                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <span className="text-[10px] text-slate-400 block">
                                      Parent can find the 12-digit UTR on their phone screen.
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!collUpiUtr) setCollUpiUtr('UPI-' + Date.now().toString().slice(-8));
                                      }}
                                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg border border-indigo-200 cursor-pointer"
                                    >
                                      Auto-Generate Counter UTR
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 3. CARD / POS DESK */}
                          {collPaymentType === 'card' && (
                            <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-sky-100">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
                                    <CreditCard className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-slate-900">Card Swiping Machine (POS)</h4>
                                    <span className="text-[11px] text-slate-500">Debit / Credit card swipe or tap settlement</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between bg-sky-50 p-3 rounded-xl border border-sky-100">
                                <div>
                                  <span className="text-[11px] font-bold text-sky-800 block">Swipe Amount</span>
                                  <span className="text-xl font-black text-sky-950">
                                    {formatINR(collectionCalculations.grandTotal)}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 block">
                                  Card Approval Code / Last 4 Digits / POS Slip Ref
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. AUTH-9283 / Card ending 4402"
                                  value={collCardRef}
                                  onChange={(e) => setCollCardRef(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                                />
                              </div>
                            </div>
                          )}

                          {/* 4. CHEQUE / DD DESK */}
                          {collPaymentType === 'cheque' && (
                            <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                                    <Building className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-slate-900">Cheque / Demand Draft</h4>
                                    <span className="text-[11px] text-slate-500">Record bank instrument details</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between bg-amber-50 p-3 rounded-xl border border-amber-100">
                                <div>
                                  <span className="text-[11px] font-bold text-amber-800 block">Instrument Amount</span>
                                  <span className="text-xl font-black text-amber-950">
                                    {formatINR(collectionCalculations.grandTotal)}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 block">
                                  Cheque No, Bank & Branch Name
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Cheque #492019 - SBI Indiranagar"
                                  value={collChequeRef}
                                  onChange={(e) => setCollChequeRef(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                                />
                              </div>
                            </div>
                          )}

                          {/* 5. SPLIT PAYMENT DESK */}
                          {collPaymentType === 'split' && (
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <div>
                                  <h4 className="text-xs font-black text-slate-900">Split / Multi-Mode Payment</h4>
                                  <span className="text-[11px] text-slate-500">Distribute settlement across Cash, UPI, and other modes</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleAddPaymentMode}
                                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add Row</span>
                                </button>
                              </div>

                              {collPaymentModes.map((pm, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                  <select
                                    value={pm.mode}
                                    onChange={(e) => handlePaymentModeChange(idx, 'mode', e.target.value)}
                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
                                  >
                                    <option value="cash">Cash</option>
                                    <option value="upi">UPI / QR</option>
                                    <option value="card">Card (POS)</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="bank_transfer">Net Banking</option>
                                  </select>

                                  <div className="relative flex-1">
                                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">₹</span>
                                    <input
                                      type="number"
                                      placeholder="Amount"
                                      value={pm.amount}
                                      onChange={(e) => handlePaymentModeChange(idx, 'amount', e.target.value)}
                                      className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900"
                                    />
                                  </div>

                                  <input
                                    type="text"
                                    placeholder={
                                      pm.mode === 'upi' ? 'UPI UTR / Ref' :
                                      pm.mode === 'cheque' ? 'Cheque No & Bank' :
                                      pm.mode === 'card' ? 'Last 4 / Auth' :
                                      'Ref note'
                                    }
                                    value={pm.reference}
                                    onChange={(e) => handlePaymentModeChange(idx, 'reference', e.target.value)}
                                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                                  />

                                  {collPaymentModes.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePaymentMode(idx)}
                                      className="p-1 hover:bg-rose-100 rounded text-rose-600 cursor-pointer"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Common: Remarks / Receipt Notes */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              Receipt Remarks / Counter Notes (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Paid by father, Term 1 cleared in full..."
                              value={collRemarks}
                              onChange={(e) => setCollRemarks(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Right: Summary Figures & Final Action (5 cols) */}
                        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4 shadow-2xs">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                Payment Breakdown
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700">
                                Mode: {collPaymentType}
                              </span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between text-slate-600">
                                <span>Fee Heads Subtotal:</span>
                                <span className="font-bold text-slate-900">{formatINR(collectionCalculations.subTotal)}</span>
                              </div>
                              <div className="flex items-center justify-between text-slate-600">
                                <span>Late Fine:</span>
                                <span className={`font-bold ${collectionCalculations.lateFine > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                                  {collectionCalculations.lateFine > 0 ? formatINR(collectionCalculations.lateFine) : '₹ 0.00'}
                                </span>
                              </div>
                              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                                <span className="text-xs font-black text-slate-900">Total Payable:</span>
                                <span className="text-xl font-black text-emerald-700">
                                  {formatINR(collectionCalculations.grandTotal)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] pt-1">
                                <span className="text-slate-500">Settlement Reconciled:</span>
                                <span className={`font-black ${collectionCalculations.isValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {formatINR(collectionCalculations.totalModes)} {collectionCalculations.isValid ? '✓' : '(Mismatch)'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            {collPaymentType === 'split' && (
                              <button
                                type="button"
                                onClick={handleAutoFillPayment}
                                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 cursor-pointer"
                              >
                                Auto-Fill Balance to Total
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={!collectionCalculations.isValid || isCollecting}
                              onClick={handleCollectPayment}
                              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Receipt className="w-4 h-4" />
                              <span>
                                {isCollecting
                                  ? 'Generating Receipt...'
                                  : `Collect ${formatINR(collectionCalculations.grandTotal)} & Issue Receipt`}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Student Browser Table when no student is selected yet */
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 flex items-center justify-between">
                      <span>Click Any Student Below to Open Collection Desk & Issue Receipt</span>
                      <span className="text-[11px] font-bold text-slate-600">
                        {filteredCollStudentList.length} Students {collFeeStatusFilter !== 'all' ? `(${collFeeStatusFilter})` : ''}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black border-y border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Roll No</th>
                            <th className="py-2.5 px-3">Admission No</th>
                            <th className="py-2.5 px-3">Student Name</th>
                            <th className="py-2.5 px-3">Class & Section</th>
                            <th className="py-2.5 px-3">Quota</th>
                            <th className="py-2.5 px-3">Annual Payable</th>
                            <th className="py-2.5 px-3">Total Paid</th>
                            <th className="py-2.5 px-3">Balance Due</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredCollStudentList.length > 0 ? (
                            filteredCollStudentList.map(st => (
                              <tr key={st.id} className="hover:bg-emerald-50/50 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{st.rollNumber || '-'}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-500">{st.studentId}</td>
                                <td className="py-2.5 px-3 font-extrabold text-slate-900">{st.name}</td>
                                <td className="py-2.5 px-3 text-slate-700 font-semibold">{st.standard}-{st.section}</td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                                    {st.quotaName}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">{formatINR(st.annualPayable)}</td>
                                <td className="py-2.5 px-3 font-bold text-emerald-700">{formatINR(st.totalPaid)}</td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`font-black ${Number(st.totalDue || 0) > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                      {formatINR(st.totalDue)}
                                    </span>
                                    {Number(st.totalDue || 0) > 0 ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800">
                                        Pending
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800">
                                        Paid ✓
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    onClick={() => handleSelectCollStudent(st)}
                                    className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1 mx-auto"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                    <span>Collect Fees</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="9" className="p-8 text-center text-slate-400 text-xs">
                                {isCollSearching
                                  ? 'Searching students...'
                                  : `No students found matching the selected Class, Section, or Search criteria${collFeeStatusFilter !== 'all' ? ` (Status: ${collFeeStatusFilter.toUpperCase()})` : ''}.`}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 8: RECEIPTS LEDGER & REPRINT / CANCEL                     */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'receipts' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Receipts Register & Audit Ledger
                    </h2>
                    <p className="text-xs text-slate-500">
                      Sequential gap-free receipt ledger with instant A4 / thermal print preview and cancellation audit.
                    </p>
                  </div>
                </div>

                {/* Filters Toolbar: Class, Section, Search, Status, Mode, Date Range */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Class Filter */}
                    <div className="flex items-center gap-2">
                      <School className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Class:</span>
                      <select
                        value={receiptClassFilter}
                        onChange={(e) => setReceiptClassFilter(e.target.value)}
                        className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                      >
                        <option value="">All Classes</option>
                        {DEFAULT_STANDARDS.map(std => (
                          <option key={std} value={std}>Class {std}</option>
                        ))}
                      </select>
                    </div>

                    {/* Section Filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Section:</span>
                      <select
                        value={receiptSectionFilter}
                        onChange={(e) => setReceiptSectionFilter(e.target.value)}
                        className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                      >
                        <option value="">All Sections</option>
                        {['A', 'B', 'C', 'D'].map(sec => (
                          <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Search Input Box */}
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search receipt no, student name, roll..."
                        value={receiptSearch}
                        onChange={(e) => setReceiptSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                      {receiptSearch && (
                        <button
                          type="button"
                          onClick={() => setReceiptSearch('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Status Filter */}
                    <select
                      value={receiptStatusFilter}
                      onChange={(e) => setReceiptStatusFilter(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer shadow-2xs"
                    >
                      <option value="">All Statuses</option>
                      <option value="Active">Active Only</option>
                      <option value="Cancelled">Cancelled Only</option>
                    </select>

                    {/* Mode Filter */}
                    <select
                      value={receiptModeFilter}
                      onChange={(e) => setReceiptModeFilter(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer shadow-2xs"
                    >
                      <option value="">All Modes</option>
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>

                  {/* Date Filter Bar with Presets */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/70">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span>Date Range:</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-500">From:</label>
                        <input
                          type="date"
                          value={receiptFromDate}
                          onChange={(e) => setReceiptFromDate(e.target.value)}
                          className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-500">To:</label>
                        <input
                          type="date"
                          value={receiptToDate}
                          onChange={(e) => setReceiptToDate(e.target.value)}
                          className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                        />
                      </div>

                      {/* Quick Date Presets */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date().toISOString().slice(0, 10);
                            setReceiptFromDate(today);
                            setReceiptToDate(today);
                          }}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer transition-colors ${
                            receiptFromDate === new Date().toISOString().slice(0, 10) && receiptToDate === new Date().toISOString().slice(0, 10)
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          Today
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const now = new Date();
                            const y = now.getFullYear();
                            const m = String(now.getMonth() + 1).padStart(2, '0');
                            setReceiptFromDate(`${y}-${m}-01`);
                            setReceiptToDate(now.toISOString().slice(0, 10));
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 cursor-pointer transition-colors"
                        >
                          This Month
                        </button>

                        {(receiptFromDate || receiptToDate) && (
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptFromDate('');
                              setReceiptToDate('');
                            }}
                            className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 text-[11px] font-bold rounded-lg cursor-pointer"
                          >
                            Clear Dates
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={loadReceipts}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Filter Ledger</span>
                      </button>

                      {/* Reset Filters */}
                      {(receiptClassFilter || receiptSectionFilter || receiptSearch || receiptStatusFilter || receiptModeFilter || receiptFromDate || receiptToDate) && (
                        <button
                          type="button"
                          onClick={handleClearReceiptFilters}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          Reset All
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Filter Info Strip */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Filtered by: <strong>{receiptClassFilter ? `Class ${receiptClassFilter}` : 'All Classes'}</strong>
                        {receiptSectionFilter ? ` - Section ${receiptSectionFilter}` : ''}
                        {receiptStatusFilter ? ` - Status: ${receiptStatusFilter}` : ''}
                        {receiptModeFilter ? ` - Mode: ${receiptModeFilter}` : ''}
                        {receiptFromDate || receiptToDate ? ` - Date: ${receiptFromDate || 'Start'} to ${receiptToDate || 'End'}` : ''}
                        {receiptSearch ? ` matching "${receiptSearch}"` : ''}
                      </span>
                    </div>
                    <span className="font-bold text-indigo-900 whitespace-nowrap">
                      {receipts.length} receipt(s) found
                    </span>
                  </div>
                </div>

                {/* Receipts Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-black border-y border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Receipt No</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Student Name</th>
                        <th className="py-3 px-3">Class & Roll</th>
                        <th className="py-3 px-3">Payment Mode</th>
                        <th className="py-3 px-3">Cashier</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Amount (₹)</th>
                        <th className="py-3 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receipts.map(rec => (
                        <tr key={rec.id} className={`hover:bg-slate-50 transition-colors ${rec.status === 'Cancelled' ? 'bg-rose-50/40 opacity-70' : ''}`}>
                          <td className="py-3 px-3 font-mono font-black text-indigo-950">
                            {rec.receiptNumber}
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-medium">
                            {rec.paymentDate ? rec.paymentDate.slice(0, 10) : '-'}
                          </td>
                          <td className="py-3 px-3 font-extrabold text-slate-900">
                            {rec.studentName}
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-medium">
                            Class {rec.standard}-{rec.section} ({rec.rollNumber})
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {rec.primaryMode}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {rec.collectedBy}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              rec.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {rec.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                            {formatINR(rec.paidAmount)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleViewReceipt(rec)}
                                className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-700 cursor-pointer"
                                title="View & Print"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {rec.status === 'Active' && !isYearClosed && (
                                <button
                                  onClick={() => {
                                    setCancellingReceiptId(rec.id);
                                    setCancelReason('');
                                    setIsCancelReceiptOpen(true);
                                  }}
                                  className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-600 cursor-pointer"
                                  title="Cancel Receipt"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB: PREVIOUS YEAR BALANCE                                    */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'previous-balance' && (
              <div className="space-y-5 animate-fadeIn">
                <PreviousYearBalancePage />
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 9: REPORTS (11 Distinct Reports)                           */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'reports' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Financial Reports & Audit Registers
                    </h2>
                    <p className="text-xs text-slate-500">
                      11 comprehensive administrative reports with instant filter, Excel export & printable views.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportReportCSV}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Export to Excel (CSV)</span>
                    </button>
                    <button
                      onClick={handleTriggerPrint}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Report</span>
                    </button>
                  </div>
                </div>

                {/* 11 Reports Dropdown Switcher */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Select Report Type</label>
                    <select
                      value={activeReportType}
                      onChange={(e) => {
                        setActiveReportType(e.target.value);
                        loadReport(e.target.value);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-black text-slate-900 cursor-pointer focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="daily-collection">1. Daily Collection Report</option>
                      <option value="receipt-wise">2. Receipt-Wise Collection Register</option>
                      <option value="fee-head-wise">3. Fee Head-Wise Collection Summary</option>
                      <option value="payment-mode">4. Payment Mode Summary (Cash vs UPI vs Card vs Cheque)</option>
                      <option value="class-wise">5. Class-Wise Collection & Pending Summary</option>
                      <option value="defaulters">6. Defaulters / Overdue Dues Report</option>
                      <option value="student-ledger">7. Student Fee Ledger Statement</option>
                      <option value="concessions">8. Concessions & Scholarship Beneficiaries Audit</option>
                      <option value="consolidated-annual">9. Consolidated Annual Financial Performance</option>
                      <option value="cancelled-receipts">10. Cancelled Receipts Register</option>
                      <option value="collector-wise">11. Collector / Cashier Reconciliation Register</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Date Range (Start)</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Date Range (End)</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                      />
                      <button
                        onClick={() => loadReport(activeReportType)}
                        className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Report View Container */}
                <div className="border border-slate-200 rounded-xl overflow-hidden p-4 bg-white">
                  <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        {reportData?.title || 'Report Results'}
                      </h3>
                      <p className="text-xs text-slate-500">Academic Year: {academicYear}</p>
                    </div>
                    {reportData?.grandTotal !== undefined && (
                      <div className="text-right">
                        <span className="text-xs text-slate-500 font-bold">Grand Total:</span>
                        <div className="text-base font-black text-emerald-800">{formatINR(reportData.grandTotal)}</div>
                      </div>
                    )}
                  </div>

                  {/* Render Table rows */}
                  <div className="overflow-x-auto">
                    {reportData?.rows && reportData.rows.length > 0 ? (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-black border-y border-slate-200">
                          <tr>
                            {Object.keys(reportData.rows[0]).map(colKey => (
                              <th key={colKey} className="py-2.5 px-3">
                                {colKey.replace(/([A-Z])/g, ' $1').toUpperCase()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportData.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              {Object.keys(row).map(cKey => {
                                const val = row[cKey];
                                const isMoney = typeof val === 'number' && (cKey.toLowerCase().includes('amount') || cKey.toLowerCase().includes('total') || cKey.toLowerCase().includes('pending') || cKey.toLowerCase().includes('collected') || cKey.toLowerCase().includes('demand') || cKey.toLowerCase().includes('cash') || cKey.toLowerCase().includes('upi') || cKey.toLowerCase().includes('card') || cKey.toLowerCase().includes('cheque') || cKey.toLowerCase().includes('net') || cKey.toLowerCase().includes('due'));
                                return (
                                  <td key={cKey} className="py-2.5 px-3 font-medium text-slate-800">
                                    {isMoney ? formatINR(val) : String(val ?? '-')}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        No report records matching criteria.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 10: SETTINGS                                              */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'settings' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    Fee Configuration & Rules
                  </h2>
                  <p className="text-xs text-slate-500">
                    Receipt numbering rules, late fine parameters, and receipt print template configuration.
                  </p>
                </div>

                {settingsForm && (
                  <form onSubmit={handleSaveSettings} className="space-y-6 max-w-3xl">
                    {/* Receipt Numbering */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Receipt Numbering Rule
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Receipt Prefix</label>
                          <input
                            type="text"
                            value={settingsForm.receiptPrefix || ''}
                            onChange={(e) => setSettingsForm({ ...settingsForm, receiptPrefix: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                          />
                          <p className="text-[10px] text-slate-500 mt-0.5">Example: FEE/2026-27/</p>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Next Starting Number</label>
                          <input
                            type="number"
                            value={settingsForm.nextReceiptNumber || 1001}
                            onChange={(e) => setSettingsForm({ ...settingsForm, nextReceiptNumber: Number(e.target.value) })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Late Fine Rules */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Late Fine Rules
                        </h3>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold">
                          <input
                            type="checkbox"
                            checked={settingsForm.lateFineRule?.enabled}
                            onChange={(e) => setSettingsForm({
                              ...settingsForm,
                              lateFineRule: { ...settingsForm.lateFineRule, enabled: e.target.checked }
                            })}
                            className="w-4 h-4 rounded text-indigo-600"
                          />
                          <span>Enable Late Fine</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Fine Type</label>
                          <select
                            value={settingsForm.lateFineRule?.type || 'per_day'}
                            onChange={(e) => setSettingsForm({
                              ...settingsForm,
                              lateFineRule: { ...settingsForm.lateFineRule, type: e.target.value }
                            })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          >
                            <option value="per_day">Per Day Overdue</option>
                            <option value="flat">Flat Charge</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Amount (₹)</label>
                          <input
                            type="number"
                            value={settingsForm.lateFineRule?.amount || 25}
                            onChange={(e) => setSettingsForm({
                              ...settingsForm,
                              lateFineRule: { ...settingsForm.lateFineRule, amount: Number(e.target.value) }
                            })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Grace Period (Days)</label>
                          <input
                            type="number"
                            value={settingsForm.lateFineRule?.gracePeriodDays || 5}
                            onChange={(e) => setSettingsForm({
                              ...settingsForm,
                              lateFineRule: { ...settingsForm.lateFineRule, gracePeriodDays: Number(e.target.value) }
                            })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Receipt Header & Terms */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Receipt Customization & Legal Terms
                      </h3>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Affiliation & Accreditation Line</label>
                        <input
                          type="text"
                          value={settingsForm.schoolDetails?.affiliationNo || ''}
                          onChange={(e) => setSettingsForm({
                            ...settingsForm,
                            schoolDetails: { ...settingsForm.schoolDetails, affiliationNo: e.target.value }
                          })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Official Address for Receipts</label>
                        <input
                          type="text"
                          value={settingsForm.schoolDetails?.address || ''}
                          onChange={(e) => setSettingsForm({
                            ...settingsForm,
                            schoolDetails: { ...settingsForm.schoolDetails, address: e.target.value }
                          })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Receipt Footer Terms & Policy</label>
                        <textarea
                          rows={3}
                          value={settingsForm.schoolDetails?.receiptTerms || ''}
                          onChange={(e) => setSettingsForm({
                            ...settingsForm,
                            schoolDetails: { ...settingsForm.schoolDetails, receiptTerms: e.target.value }
                          })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Save Fee Settings
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODAL: ADD / EDIT FEE HEAD                                     */}
            {/* ------------------------------------------------------------- */}
            {isHeadModalOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h3 className="text-base font-black text-slate-900">
                      {editingHead ? 'Edit Fee Head' : 'Add New Fee Head'}
                    </h3>
                    <button onClick={() => setIsHeadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveHead} className="space-y-4 pt-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Fee Head Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Tuition Fee, Sports Fee, Bus Transport"
                        value={headForm.name}
                        onChange={(e) => setHeadForm({ ...headForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Short Code</label>
                        <input
                          type="text"
                          placeholder="e.g. TUIT, BUS"
                          value={headForm.shortCode}
                          onChange={(e) => setHeadForm({ ...headForm, shortCode: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold uppercase"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Frequency</label>
                        <select
                          value={headForm.frequency}
                          onChange={(e) => setHeadForm({ ...headForm, frequency: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Half-Yearly">Half-Yearly (Half Years)</option>
                          <option value="Annually">Annually</option>
                          <option value="One-time">One-Time</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Applies To</label>
                        <select
                          value={headForm.appliesTo}
                          onChange={(e) => setHeadForm({ ...headForm, appliesTo: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          <option value="All">All Students</option>
                          <option value="Boys only">Boys only</option>
                          <option value="Girls only">Girls only</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Status</label>
                        <select
                          value={headForm.status}
                          onChange={(e) => setHeadForm({ ...headForm, status: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 pt-1">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={headForm.mandatory}
                          onChange={(e) => setHeadForm({ ...headForm, mandatory: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                        <span>Mandatory Fee</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={headForm.reissuable}
                          onChange={(e) => setHeadForm({ ...headForm, reissuable: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                        <span>Re-issuable</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={headForm.refundable}
                          onChange={(e) => setHeadForm({ ...headForm, refundable: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                        <span>Refundable</span>
                      </label>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Description / Details</label>
                      <textarea
                        rows={2}
                        placeholder="Details of what this head covers..."
                        value={headForm.description}
                        onChange={(e) => setHeadForm({ ...headForm, description: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsHeadModalOpen(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        {editingHead ? 'Update Fee Head' : 'Create Fee Head'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODAL: ADD / EDIT QUOTA                                        */}
            {/* ------------------------------------------------------------- */}
            {isQuotaModalOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h3 className="text-base font-black text-slate-900">
                      {editingQuota ? 'Edit Quota Category' : 'Create Quota Category'}
                    </h3>
                    <button onClick={() => setIsQuotaModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveQuota} className="space-y-4 pt-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Quota Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. General, Management, RTE, Sibling"
                        value={quotaForm.name}
                        onChange={(e) => setQuotaForm({ ...quotaForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Concession Type</label>
                        <select
                          value={quotaForm.concessionType}
                          onChange={(e) => setQuotaForm({ ...quotaForm, concessionType: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          <option value="none">None (0%)</option>
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount (₹)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Concession Value</label>
                        <input
                          type="number"
                          min="0"
                          disabled={quotaForm.concessionType === 'none'}
                          value={quotaForm.concessionValue}
                          onChange={(e) => setQuotaForm({ ...quotaForm, concessionValue: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black disabled:opacity-40"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                      <textarea
                        rows={2}
                        placeholder="Category guidelines and criteria..."
                        value={quotaForm.description}
                        onChange={(e) => setQuotaForm({ ...quotaForm, description: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsQuotaModalOpen(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        {editingQuota ? 'Update Quota' : 'Save Quota'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODAL: BULK ASSIGN CONFIRMATION                                */}
            {/* ------------------------------------------------------------- */}
            {isBulkConfirmOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn space-y-4">
                  <div className="flex items-center gap-3 text-indigo-900">
                    <ShieldAlert className="w-6 h-6 text-indigo-600" />
                    <h3 className="text-base font-black text-slate-900">Confirm Bulk Quota Assignment</h3>
                  </div>

                  <p className="text-xs text-slate-600">
                    You are about to reassign <strong>{selectedStudentIds.length} student(s)</strong> of Class {assignStd}-{assignSec} to the{' '}
                    <strong>{quotas.find(q => q.id === bulkTargetQuotaId)?.name}</strong> quota.
                  </p>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Important Notice:</strong> Changing a student's quota recalculates pending dues for future collections only. Existing issued receipts are strictly protected and will never be altered.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Administrative Reason / Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Sibling verification or RTE government list"
                      value={bulkAssignNotes}
                      onChange={(e) => setBulkAssignNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsBulkConfirmOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkAssignConfirm}
                      className="px-5 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Confirm Assignment
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODAL: STUDENT ADJUSTMENT ADD                                  */}
            {/* ------------------------------------------------------------- */}
            {isAdjModalOpen && selectedAdjStudent && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h3 className="text-base font-black text-slate-900">
                      Add Fee Adjustment for {selectedAdjStudent.name}
                    </h3>
                    <button onClick={() => setIsAdjModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveStudentAdjustment} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Adjustment Action</label>
                        <select
                          value={adjForm.adjustmentType}
                          onChange={(e) => setAdjForm({ ...adjForm, adjustmentType: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          <option value="discount_fixed">Fixed Discount (₹)</option>
                          <option value="discount_percentage">Percentage Discount (%)</option>
                          <option value="full_waiver">Full 100% Fee Waiver</option>
                          <option value="extra_fee">Add Extra One-Time Fee (₹)</option>
                          <option value="previous_balance">Previous Year Balance (Arrears) (₹)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Amount / Value</label>
                        <input
                          type="number"
                          min="0"
                          disabled={adjForm.adjustmentType === 'full_waiver'}
                          placeholder="e.g. 5000 or 25"
                          value={adjForm.amountOrValue}
                          onChange={(e) => setAdjForm({ ...adjForm, amountOrValue: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black disabled:opacity-40"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Reason Category</label>
                        <select
                          value={adjForm.reasonType}
                          onChange={(e) => setAdjForm({ ...adjForm, reasonType: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          <option value="Previous Year Balance Carried Forward">Previous Year Balance Carried Forward</option>
                          <option value="Merit Concession">Merit Concession</option>
                          <option value="Economic Hardship">Economic Hardship</option>
                          <option value="Trustee Discretion">Trustee Discretion</option>
                          <option value="Staff Ward Benefit">Staff Ward Benefit</option>
                          <option value="Sports Excellence">Sports Excellence</option>
                          <option value="Other Special Waiver">Other Special Waiver</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Approver Name</label>
                        <input
                          type="text"
                          required
                          value={adjForm.approverName}
                          onChange={(e) => setAdjForm({ ...adjForm, approverName: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Detailed Justification Notes</label>
                      <textarea
                        rows={2}
                        placeholder="State reason, reference letter or management approval..."
                        value={adjForm.reasonText}
                        onChange={(e) => setAdjForm({ ...adjForm, reasonText: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsAdjModalOpen(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Apply Adjustment
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODAL: VIEW & PRINT RECEIPT (A4, Half-Page, Thermal 80mm)      */}
            {/* ------------------------------------------------------------- */}
            {viewingReceipt && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn space-y-4 my-8">
                  {/* Modal Header & Format Switcher */}
                  <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-indigo-700" />
                      <span className="font-mono font-black text-sm text-slate-900">
                        {viewingReceipt.receiptNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        viewingReceipt.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {viewingReceipt.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="bg-slate-100 p-0.5 rounded-lg flex gap-1 text-[11px] font-bold">
                        <button
                          onClick={() => setPrintFormat('a4')}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${printFormat === 'a4' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600'}`}
                        >
                          A4 Full
                        </button>
                        <button
                          onClick={() => setPrintFormat('half')}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${printFormat === 'half' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600'}`}
                        >
                          Half Page
                        </button>
                        <button
                          onClick={() => setPrintFormat('thermal')}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${printFormat === 'thermal' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600'}`}
                        >
                          Thermal 80mm
                        </button>
                      </div>

                      <button
                        onClick={handleTriggerPrint}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print</span>
                      </button>

                      <button onClick={() => setViewingReceipt(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* PRINTABLE RECEIPT CANVAS */}
                  <div id="printable-receipt" className={`bg-white border border-slate-300 rounded-xl p-6 ${
                    printFormat === 'thermal' ? 'max-w-[320px] mx-auto text-[11px]' : ''
                  }`}>
                    {/* Header */}
                    <div className="text-center pb-4 border-b border-slate-300">
                      <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                        {settings?.schoolDetails?.institutionName || 'Qelvora School CRM'}
                      </h2>
                      <p className="text-[11px] font-semibold text-slate-600">
                        {settings?.schoolDetails?.affiliationNo || 'Affiliated to CBSE, New Delhi'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {settings?.schoolDetails?.address || 'Outer Ring Road, Bengaluru - 560103'} | Tel: +91 80 2345 6789
                      </p>
                      <div className="inline-block mt-2 px-3 py-0.5 bg-slate-900 text-white rounded text-[11px] font-black uppercase tracking-wider">
                        Official Fee Receipt
                      </div>
                    </div>

                    {/* Receipt Metadata */}
                    <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
                      <div>
                        <div><strong>Receipt No:</strong> <span className="font-mono font-bold text-indigo-900">{viewingReceipt.receiptNumber}</span></div>
                        <div><strong>Date:</strong> {viewingReceipt.paymentDate ? viewingReceipt.paymentDate.slice(0, 10) : '-'}</div>
                        <div><strong>Academic Year:</strong> {viewingReceipt.academicYear}</div>
                      </div>
                      <div className="text-right">
                        <div><strong>Student:</strong> <span className="font-extrabold">{viewingReceipt.studentName}</span></div>
                        <div><strong>Class & Sec:</strong> {viewingReceipt.standard}-{viewingReceipt.section} (Roll: {viewingReceipt.rollNumber})</div>
                        <div><strong>Adm ID:</strong> {viewingReceipt.studentIdCode} | <strong>Quota:</strong> {viewingReceipt.quotaName}</div>
                      </div>
                    </div>

                    {/* Items Breakdown Table */}
                    <table className="w-full text-left text-xs my-4 border border-slate-200">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">Particulars / Head</th>
                          <th className="p-2">Period</th>
                          <th className="p-2 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingReceipt.items?.map((it, idx) => (
                          <tr key={idx}>
                            <td className="p-2 text-slate-500">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-900">{it.headName}</td>
                            <td className="p-2 text-slate-600">{it.period || '-'}</td>
                            <td className="p-2 text-right font-black">{formatINR(it.amount)}</td>
                          </tr>
                        ))}
                        {viewingReceipt.lateFine > 0 && (
                          <tr>
                            <td className="p-2 text-slate-500">*</td>
                            <td className="p-2 font-bold text-amber-900">Late Fine</td>
                            <td className="p-2 text-slate-500">Overdue Charge</td>
                            <td className="p-2 text-right font-black text-amber-900">{formatINR(viewingReceipt.lateFine)}</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                        <tr>
                          <td colSpan="3" className="p-2 text-right uppercase text-[11px]">Total Paid:</td>
                          <td className="p-2 text-right font-black text-sm text-emerald-900">
                            {formatINR(viewingReceipt.paidAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Amount in words & Mode details */}
                    <div className="py-2 text-xs space-y-1">
                      <div><strong>Amount in Words:</strong> <span className="italic">{viewingReceipt.amountInWords}</span></div>
                      <div><strong>Payment Mode:</strong> <span className="font-semibold">{viewingReceipt.primaryMode}</span></div>
                      {viewingReceipt.paymentModes?.map((m, i) => (
                        <div key={i} className="text-[11px] text-slate-600 ml-2">
                          • {m.mode.toUpperCase()}: {formatINR(m.amount)} {m.reference ? `(Ref: ${m.reference})` : ''}
                        </div>
                      ))}
                    </div>

                    {/* Signatures & Terms */}
                    <div className="pt-6 mt-4 border-t border-slate-300 flex items-end justify-between text-xs">
                      <div>
                        <p className="text-[9.5px] text-slate-500 whitespace-pre-line max-w-sm">
                          {settings?.schoolDetails?.receiptTerms || '1. Fees once paid are non-refundable.\n2. Please retain this receipt for tax claims.'}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="w-32 border-b border-slate-400 mb-1"></div>
                        <span className="text-[10px] font-bold text-slate-600">Authorized Signature</span>
                        <div className="text-[9px] text-slate-400">Cashier: {viewingReceipt.collectedBy}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODAL: CANCEL RECEIPT                                         */}
            {/* ------------------------------------------------------------- */}
            {isCancelReceiptOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn space-y-4">
                  <div className="flex items-center gap-2 text-rose-600">
                    <Trash2 className="w-5 h-5" />
                    <h3 className="text-base font-black text-slate-900">Cancel & Void Receipt</h3>
                  </div>

                  <p className="text-xs text-slate-600">
                    Voiding a receipt removes its collected balance from student accounts and marks it as Cancelled in the audit ledger.
                  </p>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Cancellation Reason *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g. Cheque bounced, entered incorrect student account..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Supervisor Approval Name *</label>
                    <input
                      type="text"
                      required
                      value={cancelSupervisor}
                      onChange={(e) => setCancelSupervisor(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsCancelReceiptOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Exit
                    </button>
                    <button
                      onClick={handleCancelReceipt}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Confirm Cancellation
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODAL: COPY STRUCTURE TO OTHER CLASSES                        */}
            {/* ------------------------------------------------------------- */}
            {isCopyClassModalOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h3 className="text-base font-black text-slate-900">
                      Copy Structure from Class {selectedStandard}
                    </h3>
                    <button onClick={() => setIsCopyClassModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    Select target classes that should inherit the exact amounts, due dates, and fee heads of Class {selectedStandard} ({feeStructure?.quotaName}):
                  </p>

                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {DEFAULT_STANDARDS.filter(s => s !== selectedStandard).map(std => {
                      const isChecked = targetCopyClasses.includes(std);
                      return (
                        <label
                          key={std}
                          className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                            isChecked ? 'bg-indigo-50 border-indigo-500 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setTargetCopyClasses([...targetCopyClasses, std]);
                              else setTargetCopyClasses(targetCopyClasses.filter(x => x !== std));
                            }}
                            className="w-3.5 h-3.5 text-indigo-600 rounded"
                          />
                          <span>Class {std}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => setIsCopyClassModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCopyClassStructure}
                      className="px-5 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Copy to Selected ({targetCopyClasses.length})
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODAL: COPY FROM PREVIOUS YEAR                                */}
            {/* ------------------------------------------------------------- */}
            {isCopyYearModalOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h3 className="text-base font-black text-slate-900">
                      Copy Structure from Previous Academic Year
                    </h3>
                    <button onClick={() => setIsCopyYearModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    Clones all class and quota fee structures from a previous year into {academicYear}.
                  </p>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Source Academic Year</label>
                    <select
                      value={copyYearFrom}
                      onChange={(e) => setCopyYearFrom(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black cursor-pointer"
                    >
                      {academicYears.filter(y => y !== academicYear).map(yr => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => setIsCopyYearModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCopyFromYear}
                      className="px-5 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Execute Clone
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODAL: ADD ONE-TIME RE-ISSUABLE CHARGE                        */}
            {/* ------------------------------------------------------------- */}
            {isAddChargeOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-fadeIn space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h3 className="text-sm font-black text-slate-900">Add One-Time Extra Charge</h3>
                    <button onClick={() => setIsAddChargeOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Charge Name</label>
                    <select
                      value={extraChargeForm.headName}
                      onChange={(e) => setExtraChargeForm({ ...extraChargeForm, headName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold"
                    >
                      <option value="Previous Year Balance">Previous Year Balance (1-Time Dues)</option>
                      <option value="Duplicate Smart ID Card">Duplicate Smart ID Card</option>
                      <option value="Library Lost Book Penalty">Library Lost Book Penalty</option>
                      <option value="Uniform / Badge Replacement">Uniform / Badge Replacement</option>
                      <option value="Transfer Certificate Fee">Transfer Certificate Fee</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      value={extraChargeForm.amount}
                      onChange={(e) => setExtraChargeForm({ ...extraChargeForm, amount: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-black"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => setIsAddChargeOpen(false)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const chargeKey = extraChargeForm.headName === 'Previous Year Balance' ? 'fh-prev-balance' : ('charge-' + Date.now());
                        setCollPayNowMap({ ...collPayNowMap, [chargeKey]: extraChargeForm.amount });
                        if (collDetails && collDetails.baseStructure) {
                          const existing = collDetails.baseStructure.items.find(it => it.headId === chargeKey || it.headName === extraChargeForm.headName);
                          if (existing) {
                            existing.amount = extraChargeForm.amount;
                            existing.enabled = true;
                          } else {
                            collDetails.baseStructure.items.unshift({
                              headId: chargeKey,
                              headName: extraChargeForm.headName,
                              frequency: 'One-time',
                              amount: extraChargeForm.amount,
                              enabled: true
                            });
                          }
                        }
                        setIsAddChargeOpen(false);
                        toast.success(`${extraChargeForm.headName} added to collection`);
                      }}
                      className="px-4 py-1.5 bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Add Charge
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODAL: SET / UPDATE PREVIOUS YEAR BALANCE                      */}
            {/* ------------------------------------------------------------- */}
            {isPrevBalModalOpen && activeCollStudent && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-fadeIn space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-black text-slate-900">Previous Year Balance</h3>
                    </div>
                    <button onClick={() => setIsPrevBalModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    Add or update carried forward dues for <strong>{activeCollStudent.name}</strong> ({activeCollStudent.studentId}).
                    This will appear as a 1-time fee head in the collection breakdown.
                  </p>

                  <form onSubmit={handleSavePreviousBalance} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Previous Dues Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        placeholder="e.g. 5000"
                        value={prevBalAmount}
                        onChange={(e) => setPrevBalAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-black"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Reason / Notes</label>
                      <input
                        type="text"
                        placeholder="e.g. Dues carried forward from 2025-26"
                        value={prevBalRemarks}
                        onChange={(e) => setPrevBalRemarks(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsPrevBalModalOpen(false)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
                      >
                        Apply Balance
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default FeesManagementPage;
