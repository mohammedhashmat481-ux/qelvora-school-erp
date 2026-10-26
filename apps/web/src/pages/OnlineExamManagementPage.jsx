import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Sidebar from '../components/ui/Sidebar';
import * as XLSX from 'xlsx';
import {
  MonitorPlay,
  Layers,
  BookOpen,
  Award,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  Copy,
  Archive,
  Trash2,
  Eye,
  Play,
  Send,
  UsersRound,
  TrendingUp,
  Percent,
  Check,
  ChevronRight,
  ShieldCheck,
  FileText,
  Sliders,
  Sparkles,
  Info,
  LayoutDashboard
} from 'lucide-react';
import {
  getOnlineExamDashboardStats,
  getExams,
  getExamById,
  createExam,
  updateExam,
  duplicateExam,
  publishExam,
  archiveExam,
  deleteExam,
  randomizeExamPool,
  getQuestions,
  getQuestionBankMetadata,
  createQuestion,
  updateQuestion,
  duplicateQuestion,
  deleteQuestion,
  importQuestionsFile,
  uploadQuestionPaperFile,
  downloadQuestionTemplateUrl,
  exportQuestionsUrl,
  getExamAnalytics,
  exportExamResultsUrl,
  reEvaluateAttempt,
  invalidateAttempt
} from '../services/onlineExamService';
import { getClasses } from '../services/authService';

const OnlineExamManagementPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'dashboard';

  const setTab = (newTab) => {
    navigate(`/online-exam?tab=${newTab}`);
  };

  const userRole = (user?.role || '').toLowerCase();
  const isAdminOrTeacher = userRole === 'admin' || userRole === 'teacher' || userRole === 'principal' || userRole === 'super admin';

  // ─── Loading & Metadata State ──────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [classesList, setClassesList] = useState([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    activeExams: 0,
    totalQuestions: 0,
    totalSubmissions: 0,
    avgScorePercent: 0,
    passRate: 0
  });

  // ─── Tab 1: Exam Management State ──────────────────────────────────────
  const [exams, setExams] = useState([]);
  const [examPagination, setExamPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [examSearch, setExamSearch] = useState('');
  const [examStatusFilter, setExamStatusFilter] = useState('ALL');
  const [examStdFilter, setExamStdFilter] = useState('ALL');

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [examForm, setExamForm] = useState({
    title: '',
    examCode: '',
    subject: 'Science',
    standard: '10th',
    section: 'All',
    durationMinutes: 60,
    totalMarks: 50,
    passingMarks: 20,
    negativeMarking: false,
    negativeMarkValue: 0.25,
    allowPartialCredit: false,
    maxAttempts: 1,
    shuffleQuestions: true,
    shuffleOptions: true,
    navigationMode: 'FREE',
    layoutMode: 'PAGINATED',
    resultReleaseMode: 'IMMEDIATE',
    answerKeyReleaseMode: 'WITH_RESULTS',
    enableIntegrityShield: true,
    startDateTime: '',
    endDateTime: '',
    description: '',
    instructions: '',
    assignedClasses: [{ standard: '10th', section: 'All' }]
  });

  const [examQuestionPaperFile, setExamQuestionPaperFile] = useState(null);
  const [autoLinkBankQuestions, setAutoLinkBankQuestions] = useState(true);
  const [autoLinkQuestionCount, setAutoLinkQuestionCount] = useState(5);
  const [isExamSaving, setIsExamSaving] = useState(false);

  // ─── Tab 2: Question Bank State ─────────────────────────────────────────
  const [questions, setQuestions] = useState([]);
  const [qPagination, setQPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [qSearch, setQSearch] = useState('');
  const [qSubjectFilter, setQSubjectFilter] = useState('ALL');
  const [qDiffFilter, setQDiffFilter] = useState('ALL');
  const [qMetadata, setQMetadata] = useState({ subjects: [], difficulties: ['EASY', 'MEDIUM', 'HARD'] });

  const [isQModalOpen, setIsQModalOpen] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [qForm, setQForm] = useState({
    subject: 'Science',
    chapter: '',
    topic: '',
    difficulty: 'MEDIUM',
    type: 'SINGLE_CHOICE',
    questionText: '',
    marks: 1.0,
    negativeMarks: 0.25,
    explanation: '',
    options: [
      { optionKey: 'A', optionText: '', isCorrect: true },
      { optionKey: 'B', optionText: '', isCorrect: false },
      { optionKey: 'C', optionText: '', isCorrect: false },
      { optionKey: 'D', optionText: '', isCorrect: false }
    ]
  });

  // Bulk Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // ─── Tab 3: Candidate Results & Analytics ──────────────────────────────
  const [selectedExamId, setSelectedExamId] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [auditModal, setAuditModal] = useState({ open: false, type: 're-evaluate', attempt: null, reason: '' });

  // ─── Initial Load ───────────────────────────────────────────────────────
  useEffect(() => {
    loadClasses();
    loadDashboardStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardStats();
    } else if (activeTab === 'exams') {
      loadExams();
    } else if (activeTab === 'questions') {
      loadQuestions();
      loadQMetadata();
    } else if (activeTab === 'results') {
      loadExamsForAnalytics();
    }
  }, [activeTab]);

  const loadClasses = async () => {
    try {
      const res = await getClasses();
      if (res?.classes) setClassesList(res.classes);
      else if (Array.isArray(res)) setClassesList(res);
    } catch {}
  };

  const loadDashboardStats = async () => {
    try {
      const res = await getOnlineExamDashboardStats();
      if (res?.data) setStats(res.data);
    } catch {}
  };

  // ─── Exam Management Methods ────────────────────────────────────────────
  const loadExams = async () => {
    setIsLoading(true);
    try {
      const res = await getExams({
        page: examPagination.page,
        limit: examPagination.limit,
        search: examSearch,
        status: examStatusFilter,
        standard: examStdFilter
      });
      if (res?.data) {
        setExams(res.data);
        if (res.pagination) setExamPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Failed to load exams');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddExam = () => {
    setEditingExam(null);
    setExamQuestionPaperFile(null);
    setAutoLinkBankQuestions(true);
    setAutoLinkQuestionCount(5);
    const now = new Date();
    const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setExamForm({
      title: '',
      examCode: '',
      subject: 'Science',
      standard: '10th',
      section: 'All',
      durationMinutes: 45,
      totalMarks: 20,
      passingMarks: 8,
      negativeMarking: true,
      negativeMarkValue: 0.5,
      allowPartialCredit: false,
      maxAttempts: 1,
      shuffleQuestions: true,
      shuffleOptions: true,
      navigationMode: 'FREE',
      layoutMode: 'PAGINATED',
      resultReleaseMode: 'IMMEDIATE',
      answerKeyReleaseMode: 'WITH_RESULTS',
      enableIntegrityShield: true,
      startDateTime: now.toISOString().slice(0, 16),
      endDateTime: defaultEnd.toISOString().slice(0, 16),
      description: '',
      instructions: '1. Please read questions carefully before marking.\n2. Negative marks apply on incorrect responses.\n3. Do not switch tabs during exam.',
      assignedClasses: [{ standard: '10th', section: 'All' }]
    });
    setIsExamModalOpen(true);
  };

  // ─── Download Sample Question Paper Template ───────────────────────────
  const downloadSampleTemplate = (format = 'xlsx') => {
    try {
      const sampleQuestions = [
        {
          'Subject': 'Science',
          'Chapter': 'Electricity',
          'Topic': 'Ohm Law',
          'Difficulty': 'MEDIUM',
          'Type': 'SINGLE_CHOICE',
          'Question Text': 'What is the SI unit of electrical resistance?',
          'Option A': 'Volt',
          'Option B': 'Ohm',
          'Option C': 'Ampere',
          'Option D': 'Coulomb',
          'Correct Option': 'B',
          'Marks': 1.0,
          'Negative Marks': 0.25,
          'Explanation': 'Resistance is measured in Ohms (symbol: Ω).',
          'Tags': 'physics, electricity, cbse10'
        },
        {
          'Subject': 'Science',
          'Chapter': 'Light - Reflection and Refraction',
          'Topic': 'Refractive Index',
          'Difficulty': 'EASY',
          'Type': 'SINGLE_CHOICE',
          'Question Text': 'Which of the following optical media has the highest refractive index?',
          'Option A': 'Water (1.33)',
          'Option B': 'Crown Glass (1.52)',
          'Option C': 'Diamond (2.42)',
          'Option D': 'Air (1.0003)',
          'Correct Option': 'C',
          'Marks': 1.0,
          'Negative Marks': 0,
          'Explanation': 'Diamond has an optical refractive index of 2.42, which is higher than water, glass, and air.',
          'Tags': 'physics, optics, cbse10'
        },
        {
          'Subject': 'Mathematics',
          'Chapter': 'Quadratic Equations',
          'Topic': 'Roots of Equation',
          'Difficulty': 'HARD',
          'Type': 'SINGLE_CHOICE',
          'Question Text': 'If discriminant D = b² - 4ac > 0 and is not a perfect square, what is the nature of the roots?',
          'Option A': 'Real, unequal and irrational',
          'Option B': 'Real and equal',
          'Option C': 'Imaginary / No real roots',
          'Option D': 'Real, unequal and rational',
          'Correct Option': 'A',
          'Marks': 2.0,
          'Negative Marks': 0.5,
          'Explanation': 'When D > 0 and not a square, the roots are irrational conjugate pairs.',
          'Tags': 'maths, algebra, cbse10'
        },
        {
          'Subject': 'Social Science',
          'Chapter': 'Nationalism in India',
          'Topic': 'Non-Cooperation Movement',
          'Difficulty': 'EASY',
          'Type': 'SINGLE_CHOICE',
          'Question Text': 'In which year was the Non-Cooperation Movement launched in India under Mahatma Gandhi?',
          'Option A': '1918',
          'Option B': '1920',
          'Option C': '1922',
          'Option D': '1930',
          'Correct Option': 'B',
          'Marks': 1.0,
          'Negative Marks': 0,
          'Explanation': 'The Non-Cooperation Movement was launched on 1 August 1920 by Mahatma Gandhi.',
          'Tags': 'history, nationalism, cbse10'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sampleQuestions);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Questions_Template');

      if (format === 'csv') {
        XLSX.writeFile(wb, 'online_exam_question_template.csv', { bookType: 'csv' });
      } else {
        XLSX.writeFile(wb, 'online_exam_question_template.xlsx', { bookType: 'xlsx' });
      }
      toast.success(`Downloaded sample ${format.toUpperCase()} question paper template!`);
    } catch (err) {
      console.warn('Fallback to server template download:', err);
      window.open(downloadQuestionTemplateUrl(format), '_blank');
    }
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    setIsExamSaving(true);
    try {
      if (editingExam) {
        await updateExam(editingExam.id, examForm);
        toast.success('Exam configuration updated');
      } else {
        let questionIdsToLink = [];

        let paperUrl = null;
        let paperName = null;
        let paperSize = null;

        // 1. If a Question Paper file (PDF, Word, or Excel/CSV) is attached
        if (examQuestionPaperFile) {
          const isPdfOrDoc = Boolean(examQuestionPaperFile.name.match(/\.(pdf|docx|doc|txt)$/i));
          const formData = new FormData();
          formData.append('file', examQuestionPaperFile);

          if (isPdfOrDoc) {
            toast.loading(`Uploading question paper (${(examQuestionPaperFile.size / 1024).toFixed(1)} KB)...`, { id: 'qp-upload' });
            try {
              const uploadRes = await uploadQuestionPaperFile(formData);
              toast.dismiss('qp-upload');
              if (uploadRes?.data?.url) {
                paperUrl = uploadRes.data.url;
                paperName = uploadRes.data.name;
                paperSize = uploadRes.data.size;
                toast.success(`Attached "${paperName}" to examination!`);
              }
            } catch (uploadErr) {
              toast.dismiss('qp-upload');
              console.warn('Paper upload fallback to questions/import:', uploadErr);
              try {
                const importRes = await importQuestionsFile(formData);
                if (importRes?.paperUrl) {
                  paperUrl = importRes.paperUrl;
                  paperName = importRes.paperName;
                  paperSize = importRes.paperSize;
                  toast.success(importRes.message || 'Question paper attached!');
                }
              } catch (_) {}
            }
          } else {
            // Excel or CSV spreadsheet import
            toast.loading('Importing questions from spreadsheet...', { id: 'qp-upload' });
            try {
              const importRes = await importQuestionsFile(formData);
              toast.dismiss('qp-upload');
              if (importRes?.questionIds && importRes.questionIds.length > 0) {
                questionIdsToLink = [...importRes.questionIds];
                toast.success(`Attached ${importRes.questionIds.length} questions from uploaded paper!`);
              } else if (importRes?.paperUrl) {
                paperUrl = importRes.paperUrl;
                paperName = importRes.paperName;
                paperSize = importRes.paperSize;
                toast.success(importRes.message || 'Question paper attached!');
              }
            } catch (importErr) {
              toast.dismiss('qp-upload');
              console.error('Import error:', importErr);
              toast.error(importErr.response?.data?.message || 'Could not parse questions from spreadsheet');
            }
          }
        }

        // 2. Fallback: auto-link active questions from Question Bank for this subject
        if (questionIdsToLink.length === 0 && autoLinkBankQuestions) {
          try {
            const bankRes = await getQuestions({
              subject: examForm.subject,
              status: 'ACTIVE',
              limit: autoLinkQuestionCount || 5
            });
            if (bankRes?.data && bankRes.data.length > 0) {
              questionIdsToLink = bankRes.data.map(q => q.id);
            }
          } catch (bankErr) {
            console.error('Error fetching questions for auto-linking:', bankErr);
          }
        }

        const payload = {
          ...examForm,
          questionPaperUrl: paperUrl,
          questionPaperName: paperName,
          questionPaperSize: paperSize,
          questionIds: questionIdsToLink
        };

        await createExam(payload);
        toast.success(
          questionIdsToLink.length > 0
            ? `New Exam created with ${questionIdsToLink.length} questions ready!`
            : 'New Exam created successfully'
        );
      }
      setIsExamModalOpen(false);
      setExamQuestionPaperFile(null);
      loadExams();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setIsExamSaving(false);
    }
  };

  const handlePublishExam = async (examId) => {
    if (!window.confirm('Are you sure you want to publish this examination? The question snapshot will be locked and students will be able to attempt within the scheduled window.')) {
      return;
    }
    try {
      const res = await publishExam(examId);
      toast.success(res.message || 'Exam published!');
      loadExams();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleArchiveExam = async (examId) => {
    if (!window.confirm('Archive this examination?')) return;
    try {
      await archiveExam(examId);
      toast.success('Exam archived');
      loadExams();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Permanently delete this exam draft?')) return;
    try {
      await deleteExam(examId);
      toast.success('Exam deleted');
      loadExams();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDuplicateExam = async (examId) => {
    try {
      await duplicateExam(examId);
      toast.success('Exam duplicated as draft');
      loadExams();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRandomizeBlueprint = async (examId, subject) => {
    const count = parseInt(window.prompt('Enter number of questions to pick from Question Bank:', '5'), 10);
    if (!count || isNaN(count)) return;
    try {
      const res = await randomizeExamPool(examId, { subject, count });
      toast.success(res.message);
      loadExams();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // ─── Question Bank Methods ──────────────────────────────────────────────
  const loadQMetadata = async () => {
    try {
      const res = await getQuestionBankMetadata();
      if (res?.data) setQMetadata(res.data);
    } catch {}
  };

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const res = await getQuestions({
        page: qPagination.page,
        limit: qPagination.limit,
        search: qSearch,
        subject: qSubjectFilter,
        difficulty: qDiffFilter
      });
      if (res?.data) {
        setQuestions(res.data);
        if (res.pagination) setQPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddQ = () => {
    setEditingQ(null);
    setQForm({
      subject: 'Science',
      chapter: '',
      topic: '',
      difficulty: 'MEDIUM',
      type: 'SINGLE_CHOICE',
      questionText: '',
      marks: 2.0,
      negativeMarks: 0.5,
      explanation: '',
      options: [
        { optionKey: 'A', optionText: '', isCorrect: true },
        { optionKey: 'B', optionText: '', isCorrect: false },
        { optionKey: 'C', optionText: '', isCorrect: false },
        { optionKey: 'D', optionText: '', isCorrect: false }
      ]
    });
    setIsQModalOpen(true);
  };

  const handleOpenEditQ = (q) => {
    setEditingQ(q);
    setQForm({
      subject: q.subject,
      chapter: q.chapter || '',
      topic: q.topic || '',
      difficulty: q.difficulty,
      type: q.type,
      questionText: q.questionText,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      explanation: q.explanation || '',
      options: q.options.map(o => ({
        optionKey: o.optionKey,
        optionText: o.optionText,
        isCorrect: o.isCorrect
      }))
    });
    setIsQModalOpen(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    try {
      if (editingQ) {
        await updateQuestion(editingQ.id, qForm);
        toast.success('Question updated in Question Bank');
      } else {
        await createQuestion(qForm);
        toast.success('Question created in Question Bank');
      }
      setIsQModalOpen(false);
      loadQuestions();
      loadQMetadata();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDuplicateQ = async (id) => {
    try {
      await duplicateQuestion(id);
      toast.success('Question duplicated');
      loadQuestions();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteQ = async (id) => {
    if (!window.confirm('Delete or archive this question?')) return;
    try {
      await deleteQuestion(id);
      toast.success('Question removed');
      loadQuestions();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return toast.error('Please select an Excel or CSV file');
    const fd = new FormData();
    fd.append('file', importFile);
    setIsLoading(true);
    try {
      const res = await importQuestionsFile(fd);
      setImportResult(res);
      toast.success(res.message);
      loadQuestions();
      loadQMetadata();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
      if (err.response?.data?.errors) {
        setImportResult(err.response.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Analytics & Results Methods ────────────────────────────────────────
  const loadExamsForAnalytics = async () => {
    try {
      const res = await getExams({ limit: 50 });
      if (res?.data && res.data.length > 0) {
        setExams(res.data);
        const firstWithAttempts = res.data.find(e => e._count?.attempts > 0) || res.data[0];
        if (firstWithAttempts) {
          setSelectedExamId(firstWithAttempts.id);
          fetchExamAnalytics(firstWithAttempts.id);
        }
      }
    } catch {}
  };

  const fetchExamAnalytics = async (examId) => {
    if (!examId) return;
    setIsLoading(true);
    try {
      const res = await getExamAnalytics(examId);
      if (res?.data) setAnalyticsData(res.data);
    } catch (err) {
      toast.error('Failed to load candidate analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReEvaluate = async () => {
    if (!auditModal.attempt) return;
    try {
      const res = await reEvaluateAttempt(auditModal.attempt.attemptId, { reason: auditModal.reason });
      toast.success('Attempt re-evaluated successfully');
      setAuditModal({ open: false, type: 're-evaluate', attempt: null, reason: '' });
      fetchExamAnalytics(selectedExamId);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleInvalidate = async () => {
    if (!auditModal.attempt) return;
    if (!auditModal.reason.trim()) return toast.error('Reason is required');
    try {
      await invalidateAttempt(auditModal.attempt.attemptId, { reason: auditModal.reason });
      toast.success('Attempt invalidated');
      setAuditModal({ open: false, type: 'invalidate', attempt: null, reason: '' });
      fetchExamAnalytics(selectedExamId);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] font-sans text-[#334155] flex flex-col md:flex-row">
      {/* ─── Platform Main Sidebar ─── */}
      <Sidebar />

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 pb-16">
      {/* ─── Top Header Ribbon ──────────────────────────────────────────────── */}
      <div className="bg-[#172B4D] border-b border-[#29456D] text-white sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#29456D] border border-[#29456D] flex items-center justify-center text-[#F3F6FC] shadow-md">
              <MonitorPlay className="w-6 h-6 text-[#F3F6FC]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Online Exam System</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#DBEAFE] text-[#172B4D] text-[10px] font-black uppercase tracking-wider border border-[#93C5FD]">
                  MCQ Engine Active
                </span>
              </div>
              <p className="text-xs text-[#CBD5E1] font-medium">
                Production-ready assessment engine with reusable question banks, automated evaluation & live proctoring signals.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3.5 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white hover:text-[#DBEAFE] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-[#29456D]"
              title="Return to Main Menu / Dashboard"
            >
              <LayoutDashboard className="w-4 h-4 text-[#F3F6FC]" />
              <span>Main Menu</span>
            </button>
            <button
              onClick={() => navigate('/student/online-exam')}
              className="px-3.5 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white hover:text-[#DBEAFE] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-[#29456D]"
            >
              <Eye className="w-4 h-4 text-[#F3F6FC]" />
              <span>Student View Portal</span>
            </button>
            <button
              onClick={handleOpenAddExam}
              className="px-4 py-2 bg-[#29456D] hover:bg-[#172B4D] active:scale-95 text-white hover:text-[#DBEAFE] text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-[#29456D]"
            >
              <Plus className="w-4 h-4 text-[#F3F6FC]" />
              <span>Create Online Exam</span>
            </button>
          </div>
        </div>

        {/* ─── Modern Tabs Bar ─────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto scrollbar-none border-t border-[#29456D]">
          {[
            { id: 'dashboard', label: 'Overview & Analytics', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'exams', label: 'Exam Management', icon: <Layers className="w-4 h-4" /> },
            { id: 'questions', label: 'Question Bank', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'results', label: 'Candidate Results & Audit', icon: <Award className="w-4 h-4" /> },
            { id: 'conduct', label: 'Conduct & Preview', icon: <Play className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-indigo-900 text-indigo-950 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* ─── LIVE STATS SUMMARY RIBBON ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Exams</span>
            <div className="text-xl font-black text-slate-900 mt-1">{stats.totalExams}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5">Created on platform</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Exams</span>
            <div className="text-xl font-black text-emerald-600 mt-1 flex items-center gap-1.5">
              <span>{stats.activeExams}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5">Currently open</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Question Bank</span>
            <div className="text-xl font-black text-indigo-600 mt-1">{stats.totalQuestions}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5">Reusable MCQs</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Submissions</span>
            <div className="text-xl font-black text-blue-600 mt-1">{stats.totalSubmissions}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5">Evaluated attempts</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Score</span>
            <div className="text-xl font-black text-amber-600 mt-1">{stats.avgScorePercent}%</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5">Across all subjects</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pass Rate</span>
            <div className="text-xl font-black text-emerald-700 mt-1">{stats.passRate}%</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5">Qualified threshold</div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: OVERVIEW & ANALYTICS DASHBOARD                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Feature Highlights */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-slate-900">Module Capabilities & Architecture</h2>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-200">
                    Enterprise Grade
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Immutable Question Snapshots</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Publishing an exam locks an immutable snapshot of all questions and scoring rules. Historical results can never be corrupted by subsequent question edits.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span>Server-Authoritative Timers</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Deadlines are calculated on the server and verified on every autosave request. Client browser clock tampering is completely impossible.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                      <Sliders className="w-4 h-4 text-blue-500" />
                      <span>Negative Marking & Partial Credit</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Supports configured negative penalties only on incorrect answers (never unattempted) and partial credit algorithms for multi-choice questions.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <span>Automated Instant Evaluation</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Server executes mathematical evaluation immediately upon submission or timer expiration with strict idempotency and zero score duplication.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">Ready to conduct online examinations?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTab('questions')}
                      className="text-indigo-600 hover:text-indigo-950 font-bold flex items-center gap-1"
                    >
                      <span>Manage Question Bank</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setTab('exams')}
                      className="text-indigo-600 hover:text-indigo-950 font-bold flex items-center gap-1 ml-4"
                    >
                      <span>Manage Exams</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                <h2 className="text-base font-black text-slate-900">Quick Actions</h2>
                <div className="space-y-2.5">
                  <button
                    onClick={handleOpenAddExam}
                    className="w-full p-3 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-xs"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-amber-400" />
                      <span>Create New Online Exam</span>
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleOpenAddQ}
                    className="w-full p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-indigo-600" />
                      <span>Add MCQ to Question Bank</span>
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setTab('questions');
                      setIsImportModalOpen(true);
                    }}
                    className="w-full p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>Bulk Excel / CSV Question Import</span>
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTab('results')}
                    className="w-full p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>View Live Candidate Rank Lists</span>
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: EXAM MANAGEMENT                                             */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'exams' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={examSearch}
                    onChange={(e) => setExamSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadExams()}
                    placeholder="Search by exam title or code..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <select
                  value={examStatusFilter}
                  onChange={(e) => {
                    setExamStatusFilter(e.target.value);
                  }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active (Live)</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <select
                  value={examStdFilter}
                  onChange={(e) => setExamStdFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Classes</option>
                  {['6th', '7th', '8th', '9th', '10th', '11th', '12th'].map(s => (
                    <option key={s} value={s}>Class {s}</option>
                  ))}
                </select>
                <button
                  onClick={loadExams}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <button
                onClick={handleOpenAddExam}
                className="px-4 py-2 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Create Exam</span>
              </button>
            </div>

            {/* Exams Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Exam Info & Code</th>
                      <th className="py-3.5 px-3">Class & Subject</th>
                      <th className="py-3.5 px-3">Questions & Marks</th>
                      <th className="py-3.5 px-3">Schedule Window</th>
                      <th className="py-3.5 px-3">Submissions</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {exams.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold text-sm">No online examinations found</p>
                          <p className="text-[11px] mt-0.5">Click "Create Exam" to schedule a new examination</p>
                        </td>
                      </tr>
                    ) : (
                      exams.map(exam => {
                        const statusBadge = {
                          ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black',
                          PUBLISHED: 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
                          DRAFT: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
                          COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200 font-semibold',
                          ARCHIVED: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                        }[exam.status] || 'bg-slate-100 text-slate-600 border-slate-200';

                        return (
                          <tr key={exam.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 text-sm leading-tight">{exam.title}</div>
                              <div className="text-[10px] font-mono text-indigo-700 font-semibold mt-0.5">
                                {exam.examCode} · v{exam.version || 1} {exam.isVersionLocked ? '🔒 Snapshot Locked' : ''}
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px]">
                                {exam.standard} - {exam.section || 'All'}
                              </span>
                              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{exam.subject}</div>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-slate-900">
                                {exam._count?.questions || exam.questions?.length || 0} Qs · {exam.totalMarks} Marks
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {exam.durationMinutes} mins · Pass: {exam.passingMarks}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-[11px]">
                              <div>{new Date(exam.startDateTime).toLocaleDateString()} {new Date(exam.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              <div className="text-slate-400 text-[10px]">to {new Date(exam.endDateTime).toLocaleDateString()} {new Date(exam.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="font-black text-slate-900 text-sm">
                                {exam._count?.attempts || 0}
                              </span>
                              <span className="text-[10px] text-slate-400 block">attempts</span>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] border uppercase tracking-wider inline-flex items-center gap-1 ${statusBadge}`}>
                                {exam.status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>}
                                {exam.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {exam.status === 'DRAFT' && (
                                  <>
                                    <button
                                      onClick={() => handlePublishExam(exam.id)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                      title="Publish & freeze snapshot"
                                    >
                                      <Send className="w-3 h-3" />
                                      <span>Publish</span>
                                    </button>
                                    <button
                                      onClick={() => handleRandomizeBlueprint(exam.id, exam.subject)}
                                      className="p-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer"
                                      title="Randomize questions from Question Bank pool"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleDuplicateExam(exam.id)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                                  title="Duplicate exam"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                {exam.status !== 'ARCHIVED' && (
                                  <button
                                    onClick={() => handleArchiveExam(exam.id)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                                    title="Archive exam"
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {exam.status === 'DRAFT' && exam._count?.attempts === 0 && (
                                  <button
                                    onClick={() => handleDeleteExam(exam.id)}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                                    title="Delete draft exam"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
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
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: QUESTION BANK MANAGEMENT                                    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'questions' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Filter & Action Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={qSearch}
                    onChange={(e) => setQSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadQuestions()}
                    placeholder="Search questions by text or topic..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                  />
                </div>
                <select
                  value={qSubjectFilter}
                  onChange={(e) => setQSubjectFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Subjects</option>
                  {qMetadata.subjects?.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={qDiffFilter}
                  onChange={(e) => setQDiffFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Difficulties</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
                <button
                  onClick={loadQuestions}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={exportQuestionsUrl({ subject: qSubjectFilter, difficulty: qDiffFilter })}
                  download
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Export</span>
                </a>
                <button
                  onClick={() => {
                    setImportResult(null);
                    setImportFile(null);
                    setIsImportModalOpen(true);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Import Excel/CSV</span>
                </button>
                <button
                  onClick={handleOpenAddQ}
                  className="px-4 py-2 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-3">
              {questions.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
                  <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-sm">No questions found</p>
                  <p className="text-[11px] mt-0.5">Add questions individually or use the Bulk Excel Import</p>
                </div>
              ) : (
                questions.map((q, idx) => {
                  const diffColor = {
                    EASY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
                    HARD: 'bg-rose-50 text-rose-700 border-rose-200'
                  }[q.difficulty] || 'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <div key={q.id} className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 hover:border-indigo-300 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                              {q.subject}
                            </span>
                            {q.chapter && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                {q.chapter}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${diffColor}`}>
                              {q.difficulty}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Marks: +{q.marks} / -{q.negativeMarks}
                            </span>
                          </div>
                          <p className="font-bold text-sm text-slate-900 leading-snug">
                            {idx + 1}. {q.questionText}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditQ(q)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                            title="Edit question"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicateQ(q.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                            title="Duplicate question"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteQ(q.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                            title="Delete / Archive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options?.map(opt => (
                          <div
                            key={opt.id || opt.optionKey}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                              opt.isCorrect
                                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold'
                                : 'bg-slate-50 border-slate-200/80 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                                opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {opt.optionKey}
                              </span>
                              <span>{opt.optionText}</span>
                            </div>
                            {opt.isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>

                      {q.explanation && (
                        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Explanation: </span>
                            {q.explanation}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: CANDIDATE RESULTS & AUDIT                                    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'results' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Exam Selector Ribbon */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <label className="text-xs font-bold text-slate-700">Select Examination:</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => {
                    setSelectedExamId(e.target.value);
                    fetchExamAnalytics(e.target.value);
                  }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none flex-1 max-w-md"
                >
                  {exams.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({e.examCode}) - {e._count?.attempts || 0} Attempts
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => fetchExamAnalytics(selectedExamId)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {selectedExamId && (
                <a
                  href={exportExamResultsUrl(selectedExamId, 'xlsx')}
                  download
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Rank List (.xlsx)</span>
                </a>
              )}
            </div>

            {analyticsData && (
              <div className="space-y-6">
                {/* Score Distribution Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {Object.entries(analyticsData.distribution || {}).map(([range, count]) => (
                    <div key={range} className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{range}</span>
                      <div className="text-lg font-black text-slate-900 mt-1">{count}</div>
                      <span className="text-[10px] text-slate-500">students</span>
                    </div>
                  ))}
                </div>

                {/* Candidate Rank List Table */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-sm text-slate-900">Official Candidate Rank List & Score Ledger</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Rank calculated by score obtained with time-spent tie breaker</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                      {analyticsData.rankList?.length || 0} Evaluated Candidates
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Rank</th>
                          <th className="py-3 px-3">Student Name</th>
                          <th className="py-3 px-3">Class & Roll</th>
                          <th className="py-3 px-3">Score / Max</th>
                          <th className="py-3 px-3">Percentage</th>
                          <th className="py-3 px-3">Time Spent</th>
                          <th className="py-3 px-3">Integrity Flags</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-4 text-right">Audit & Controls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {analyticsData.rankList?.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-slate-400">
                              No submissions evaluated for this exam yet.
                            </td>
                          </tr>
                        ) : (
                          analyticsData.rankList.map(cand => (
                            <tr key={cand.attemptId} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-4">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                                  cand.rank === 1 ? 'bg-amber-400 text-slate-950 font-black' :
                                  cand.rank === 2 ? 'bg-slate-300 text-slate-900' :
                                  cand.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {cand.rank}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-bold text-slate-900 text-sm">
                                {cand.studentName}
                              </td>
                              <td className="py-3 px-3">
                                {cand.standard} - {cand.section} (Roll: {cand.rollNumber})
                              </td>
                              <td className="py-3 px-3 font-black text-slate-900 text-sm">
                                {cand.scoreObtained} <span className="text-slate-400 text-xs">/ {cand.totalPossibleScore}</span>
                              </td>
                              <td className="py-3 px-3 font-bold text-indigo-700">
                                {cand.percentage}%
                              </td>
                              <td className="py-3 px-3 text-slate-500">
                                {Math.floor(cand.timeSpentSeconds / 60)}m {cand.timeSpentSeconds % 60}s
                              </td>
                              <td className="py-3 px-3">
                                {cand.integrityViolationsCount > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] flex items-center gap-1 w-max">
                                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                                    <span>{cand.integrityViolationsCount} warnings</span>
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 font-semibold text-[10px]">Clean ✓</span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  cand.isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {cand.isPassed ? 'Passed' : 'Failed'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setAuditModal({ open: true, type: 're-evaluate', attempt: cand, reason: '' })}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer"
                                    title="Re-run evaluation algorithm"
                                  >
                                    Re-Evaluate
                                  </button>
                                  <button
                                    onClick={() => setAuditModal({ open: true, type: 'invalidate', attempt: cand, reason: '' })}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold cursor-pointer"
                                    title="Invalidate attempt for misconduct"
                                  >
                                    Invalidate
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Question-wise Accuracy Chart */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                  <h3 className="font-black text-sm text-slate-900">Question-Wise Accuracy & Item Analysis</h3>
                  <div className="space-y-3">
                    {analyticsData.questionAccuracy?.map((qa, i) => (
                      <div key={qa.questionId} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">
                            Q{i + 1}: {qa.questionText}
                          </span>
                          <span className="font-black text-indigo-700">{qa.accuracyPercent}% Accuracy</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              qa.accuracyPercent >= 70 ? 'bg-emerald-500' :
                              qa.accuracyPercent >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${qa.accuracyPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Difficulty: {qa.difficulty}</span>
                          <span>{qa.correctAnswers} of {qa.totalAnswered} candidates answered correctly</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: CONDUCT & PREVIEW                                            */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'conduct' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 text-center max-w-2xl mx-auto animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center justify-center mx-auto">
              <Play className="w-8 h-8 text-amber-500 ml-1" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Conduct Examination & Live Preview</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Experience the examination exactly as your students will. Test fullscreen integrity checks, question navigation, countdown timers, autosave responsiveness, and automated evaluation.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/student/online-exam')}
                className="px-6 py-3 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md cursor-pointer"
              >
                <MonitorPlay className="w-4 h-4 text-amber-400" />
                <span>Launch Student Examination Simulator</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: CREATE / EDIT EXAM ───────────────────────────────────────── */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Pinned Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <MonitorPlay className="w-5 h-5 text-indigo-900" />
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {editingExam ? 'Edit Examination Blueprint' : 'Create New Online Examination'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsExamModalOpen(false)} 
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body with Scrollbar */}
            <form id="create-exam-form" onSubmit={handleSaveExam} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-300">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Exam Title *</label>
                <input
                  type="text"
                  required
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  placeholder="e.g. CBSE Class 10 Mid-Term Science Online MCQ Exam 2026"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Subject *</label>
                  <input
                    type="text"
                    required
                    value={examForm.subject}
                    onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Target Standard *</label>
                  <select
                    value={examForm.standard}
                    onChange={(e) => setExamForm({ ...examForm, standard: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                  >
                    {['6th', '7th', '8th', '9th', '10th', '11th', '12th', 'All'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Duration (Minutes) *</label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    required
                    value={examForm.durationMinutes}
                    onChange={(e) => setExamForm({ ...examForm, durationMinutes: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Total Marks</label>
                  <input
                    type="number"
                    value={examForm.totalMarks}
                    onChange={(e) => setExamForm({ ...examForm, totalMarks: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Passing Marks</label>
                  <input
                    type="number"
                    value={examForm.passingMarks}
                    onChange={(e) => setExamForm({ ...examForm, passingMarks: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Max Attempts</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={examForm.maxAttempts}
                    onChange={(e) => setExamForm({ ...examForm, maxAttempts: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={examForm.startDateTime}
                    onChange={(e) => setExamForm({ ...examForm, startDateTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={examForm.endDateTime}
                    onChange={(e) => setExamForm({ ...examForm, endDateTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Scoring & Proctoring Options</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={examForm.negativeMarking}
                      onChange={(e) => setExamForm({ ...examForm, negativeMarking: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Negative Marking (-{examForm.negativeMarkValue})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={examForm.shuffleQuestions}
                      onChange={(e) => setExamForm({ ...examForm, shuffleQuestions: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Shuffle Questions Order</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={examForm.shuffleOptions}
                      onChange={(e) => setExamForm({ ...examForm, shuffleOptions: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Shuffle Answer Options</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={examForm.enableIntegrityShield}
                      onChange={(e) => setExamForm({ ...examForm, enableIntegrityShield: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Fullscreen & Tab-Switch Proctoring</span>
                  </label>
                </div>
              </div>

              {/* ─── Question Paper & Questions Source (Only for New Exam) ─── */}
              {!editingExam && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-700" />
                      <span className="font-black text-slate-900 text-xs uppercase tracking-wider">
                        Question Paper & Questions Source
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadSampleTemplate('xlsx')}
                      className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Sample Excel</span>
                    </button>
                  </div>

                  {/* Upload Box */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Upload Question Paper (.pdf, .docx, .xlsx, .xls, .csv) — up to 150MB
                    </label>
                    <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white rounded-2xl p-3.5 transition-all">
                      {examQuestionPaperFile ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                              examQuestionPaperFile.name.toLowerCase().endsWith('.pdf')
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}>
                              {examQuestionPaperFile.name.toLowerCase().endsWith('.pdf') ? (
                                <FileText className="w-5 h-5" />
                              ) : (
                                <FileSpreadsheet className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-xs text-slate-800 truncate max-w-sm">{examQuestionPaperFile.name}</p>
                              <p className="text-[10px] text-emerald-600 font-semibold">
                                {(examQuestionPaperFile.size / 1024).toFixed(1)} KB • Attached & ready ${examQuestionPaperFile.name.toLowerCase().endsWith('.pdf') ? 'to attach to exam' : 'to import'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExamQuestionPaperFile(null)}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center cursor-pointer py-1.5">
                          <Upload className="w-5 h-5 text-indigo-600 mb-1" />
                          <span className="text-xs font-bold text-indigo-900">
                            Click to upload Question Paper (PDF, Word, or Excel)
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Attach official PDF question papers (up to 150MB) or import questions from Excel/CSV
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setExamQuestionPaperFile(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Auto-link from Question Bank fallback */}
                  {!examQuestionPaperFile && (
                    <div className="pt-2 border-t border-indigo-100/70 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                          <input
                            type="checkbox"
                            checked={autoLinkBankQuestions}
                            onChange={(e) => setAutoLinkBankQuestions(e.target.checked)}
                            className="rounded text-indigo-600"
                          />
                          <span>Auto-link active questions from Question Bank ({examForm.subject})</span>
                        </label>
                        {autoLinkBankQuestions && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 text-[10px]">Count:</span>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={autoLinkQuestionCount}
                              onChange={(e) => setAutoLinkQuestionCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                              className="w-14 px-2 py-0.5 text-center font-bold bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 italic">
                        {autoLinkBankQuestions
                          ? `Will automatically attach up to ${autoLinkQuestionCount} questions from Question Bank matching ${examForm.subject}.`
                          : 'You can link questions later via Question Bank or Blueprint Randomizer.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Instructions for Candidates</label>
                <textarea
                  rows={2}
                  value={examForm.instructions}
                  onChange={(e) => setExamForm({ ...examForm, instructions: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                />
              </div>

            </form>

            {/* Pinned Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setIsExamModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-exam-form"
                disabled={isExamSaving}
                className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 disabled:bg-indigo-400 text-white font-bold rounded-xl cursor-pointer shadow-xs flex items-center gap-2 text-xs"
              >
                {isExamSaving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{isExamSaving ? 'Saving Examination...' : (editingExam ? 'Save Changes' : 'Create Examination')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT QUESTION ──────────────────────────────────── */}
      {isQModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Pinned Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-indigo-900" />
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {editingQ ? 'Edit Question in Bank' : 'Add MCQ to Question Bank'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsQModalOpen(false)} 
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body with Scrollbar */}
            <form id="create-q-form" onSubmit={handleSaveQuestion} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Subject *</label>
                  <input
                    type="text"
                    required
                    value={qForm.subject}
                    onChange={(e) => setQForm({ ...qForm, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Chapter</label>
                  <input
                    type="text"
                    value={qForm.chapter}
                    onChange={(e) => setQForm({ ...qForm, chapter: e.target.value })}
                    placeholder="e.g. Electricity"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Difficulty</label>
                  <select
                    value={qForm.difficulty}
                    onChange={(e) => setQForm({ ...qForm, difficulty: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Question Text *</label>
                <textarea
                  rows={3}
                  required
                  value={qForm.questionText}
                  onChange={(e) => setQForm({ ...qForm, questionText: e.target.value })}
                  placeholder="Enter the question text clearly..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none text-sm"
                />
              </div>

              {/* Options Config */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700">Answer Options & Correct Answer *</label>
                <div className="space-y-2">
                  {qForm.options.map((opt, idx) => (
                    <div key={opt.optionKey} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = qForm.options.map((o, i) => ({
                            ...o,
                            isCorrect: i === idx
                          }));
                          setQForm({ ...qForm, options: updated });
                        }}
                        className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center cursor-pointer transition-all ${
                          opt.isCorrect
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                        title="Click to mark as correct answer"
                      >
                        {opt.isCorrect ? <Check className="w-4 h-4" /> : opt.optionKey}
                      </button>
                      <input
                        type="text"
                        required
                        value={opt.optionText}
                        onChange={(e) => {
                          const updated = [...qForm.options];
                          updated[idx].optionText = e.target.value;
                          setQForm({ ...qForm, options: updated });
                        }}
                        placeholder={`Option ${opt.optionKey} text...`}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400">
                  Click the green button on the left to designate which option is correct.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Marks Awarded</label>
                  <input
                    type="number"
                    step="0.5"
                    value={qForm.marks}
                    onChange={(e) => setQForm({ ...qForm, marks: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Negative Penalty</label>
                  <input
                    type="number"
                    step="0.25"
                    value={qForm.negativeMarks}
                    onChange={(e) => setQForm({ ...qForm, negativeMarks: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Explanation for Solution (Optional)</label>
                <textarea
                  rows={2}
                  value={qForm.explanation}
                  onChange={(e) => setQForm({ ...qForm, explanation: e.target.value })}
                  placeholder="Provide step-by-step reasoning shown to students when answer keys are released..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                />
              </div>

            </form>

            {/* Pinned Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setIsQModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-q-form"
                className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-xl cursor-pointer shadow-xs text-xs"
              >
                {editingQ ? 'Save Changes' : 'Add to Question Bank'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: BULK EXCEL IMPORT ────────────────────────────────────────── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Pinned Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm sm:text-base font-black text-slate-900">Bulk Import Questions from Excel</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsImportModalOpen(false)} 
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body with Scrollbar */}
            <form id="bulk-import-form" onSubmit={handleImportSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-300">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Download Clean Template:</span>
                  <div className="flex gap-2">
                    <a
                      href={downloadQuestionTemplateUrl('xlsx')}
                      download
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[10px] flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Excel (.xlsx)</span>
                    </a>
                    <a
                      href={downloadQuestionTemplateUrl('csv')}
                      download
                      className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[10px] flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>CSV</span>
                    </a>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  The template includes sample questions with Subject, Options A-D, Correct Option, Marks, Negative Marks, and Explanation.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Select File (.xlsx or .csv)</label>
                <input
                  type="file"
                  required
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-indigo-900 file:text-white"
                />
              </div>

              {/* Import Results / Row Validation Errors */}
              {importResult && (
                <div className={`p-3.5 rounded-xl border text-[11px] space-y-1.5 ${
                  importResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}>
                  <div className="font-bold flex items-center gap-1.5">
                    {importResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                    <span>{importResult.message}</span>
                  </div>
                  {importResult.errors && (
                    <div className="max-h-36 overflow-y-auto space-y-1 pt-1 border-t border-rose-200 font-mono text-[10px]">
                      {importResult.errors.map((err, i) => (
                        <div key={i} className="text-rose-800">
                          Row {err.row}: {err.errors.join('; ')} ({err.questionSnippet}...)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </form>

            <div className="p-3.5 sm:p-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 cursor-pointer text-xs"
              >
                Close
              </button>
              <button
                type="submit"
                form="bulk-import-form"
                disabled={isLoading}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5 text-xs"
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>Upload & Validate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: RE-EVALUATION & AUDIT ────────────────────────────────────── */}
      {auditModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-black text-slate-900">
                {auditModal.type === 're-evaluate' ? 'Supervisor Re-Evaluation' : 'Invalidate Attempt'}
              </h3>
              <button onClick={() => setAuditModal({ ...auditModal, open: false })} className="text-slate-400 hover:text-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{auditModal.attempt?.studentName}</div>
                <div className="text-slate-500 text-[11px]">
                  Current Score: {auditModal.attempt?.scoreObtained} / {auditModal.attempt?.totalPossibleScore} ({auditModal.attempt?.percentage}%)
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mandatory Supervisor Reason *</label>
                <textarea
                  rows={3}
                  required
                  value={auditModal.reason}
                  onChange={(e) => setAuditModal({ ...auditModal, reason: e.target.value })}
                  placeholder={
                    auditModal.type === 're-evaluate'
                      ? 'e.g. Question 3 answer key corrected by academic board'
                      : 'e.g. Severe integrity warning / external assistance detected'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAuditModal({ ...auditModal, open: false })}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                {auditModal.type === 're-evaluate' ? (
                  <button
                    onClick={handleReEvaluate}
                    className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Confirm Re-Evaluation
                  </button>
                ) : (
                  <button
                    onClick={handleInvalidate}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Confirm Invalidation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default OnlineExamManagementPage;
