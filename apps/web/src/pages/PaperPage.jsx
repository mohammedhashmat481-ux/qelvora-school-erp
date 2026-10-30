import { confirmModal } from '../context/ModalContext';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Wand2,
  FileText,
  Printer,
  Copy,
  Download,
  RotateCcw,
  History,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Edit3,
  Search,
  BookOpen,
  HelpCircle,
  Layers,
  ChevronRight,
  Sliders,
  Check,
  X,
  FileCheck,
  Eye,
  RefreshCw,
  Sparkles,
  FileUp,
  Tag,
  Calendar,
  GraduationCap,
  Save,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { mdToHtml } from '../utils/markdown';
import Sidebar from '../components/ui/Sidebar';
import KnowledgeLibraryModal from '../components/paper/KnowledgeLibraryModal';
import InteractiveQuestionEditor from '../components/paper/InteractiveQuestionEditor';
import ExamPaperSheet from '../components/paper/ExamPaperSheet';
import {
  generateWordDocumentHtml,
  generateCleanPlainText,
  downloadFile
} from '../utils/paperExport';

// Preset exam templates
const EXAM_PRESETS = [
  {
    id: 'custom',
    name: 'Standard Custom Pattern',
    description: 'Configure your own marks, duration and question mix',
    totalMarks: 80,
    duration: 180,
    distribution: {
      mcq: { enabled: true, count: 16, marksPerQ: 1 },
      assertionReason: { enabled: true, count: 4, marksPerQ: 1 },
      fillInBlanks: { enabled: false, count: 0, marksPerQ: 1 },
      veryShort: { enabled: true, count: 6, marksPerQ: 2 },
      shortAnswer: { enabled: true, count: 7, marksPerQ: 3 },
      longAnswer: { enabled: true, count: 3, marksPerQ: 5 },
      numerical: { enabled: false, count: 0, marksPerQ: 3 },
      caseBased: { enabled: true, count: 3, marksPerQ: 4 }
    }
  },
  {
    id: 'neet',
    name: 'NEET-Style Medical Entrance (MCQ)',
    description: 'Pure objective pattern for Physics, Chemistry & Biology',
    totalMarks: 180,
    duration: 180,
    distribution: {
      mcq: { enabled: true, count: 45, marksPerQ: 4 },
      assertionReason: { enabled: false, count: 0, marksPerQ: 4 },
      fillInBlanks: { enabled: false, count: 0, marksPerQ: 1 },
      veryShort: { enabled: false, count: 0, marksPerQ: 2 },
      shortAnswer: { enabled: false, count: 0, marksPerQ: 3 },
      longAnswer: { enabled: false, count: 0, marksPerQ: 5 },
      numerical: { enabled: false, count: 0, marksPerQ: 4 },
      caseBased: { enabled: false, count: 0, marksPerQ: 4 }
    }
  },
  {
    id: 'board_mixed',
    name: 'CBSE Board-Style Comprehensive',
    description: 'Standard 70 marks theory paper with internal choice',
    totalMarks: 70,
    duration: 180,
    distribution: {
      mcq: { enabled: true, count: 16, marksPerQ: 1 },
      assertionReason: { enabled: true, count: 2, marksPerQ: 1 },
      fillInBlanks: { enabled: false, count: 0, marksPerQ: 1 },
      veryShort: { enabled: true, count: 5, marksPerQ: 2 },
      shortAnswer: { enabled: true, count: 7, marksPerQ: 3 },
      longAnswer: { enabled: true, count: 3, marksPerQ: 5 },
      numerical: { enabled: true, count: 2, marksPerQ: 3 },
      caseBased: { enabled: true, count: 2, marksPerQ: 4 }
    }
  },
  {
    id: 'unit_test',
    name: 'Class Unit Diagnostic Test',
    description: 'Short 25-mark periodic assessment for single/dual chapters',
    totalMarks: 25,
    duration: 45,
    distribution: {
      mcq: { enabled: true, count: 5, marksPerQ: 1 },
      assertionReason: { enabled: false, count: 0, marksPerQ: 1 },
      fillInBlanks: { enabled: false, count: 0, marksPerQ: 1 },
      veryShort: { enabled: true, count: 3, marksPerQ: 2 },
      shortAnswer: { enabled: true, count: 3, marksPerQ: 3 },
      longAnswer: { enabled: true, count: 1, marksPerQ: 5 },
      numerical: { enabled: false, count: 0, marksPerQ: 2 },
      caseBased: { enabled: false, count: 0, marksPerQ: 4 }
    }
  }
];

const QUESTION_TYPE_LABELS = {
  mcq: 'Multiple Choice (MCQ)',
  assertionReason: 'Assertion-Reason',
  fillInBlanks: 'Fill in the Blanks',
  veryShort: 'Very Short Answer',
  shortAnswer: 'Short Answer',
  longAnswer: 'Long Answer / HOTS',
  numerical: 'Numerical Problems',
  caseBased: 'Case-Based / Source Study'
};

const DEFAULT_SETTINGS = {
  classLevel: '10th',
  syllabus: 'CBSE',
  subjects: ['Physics', 'Chemistry'],
  chaptersBySubject: {},
  pattern: 'Standard Custom Pattern',
  totalMarks: 80,
  durationMinutes: 180,
  schoolName: 'Sri Chaitanya Techno School',
  paperTitle: 'Class 10 Mid-Term Diagnostic Assessment',
  difficultyMix: { easy: 30, medium: 50, hard: 20 },
  options: {
    includeAnswerKey: true,
    includeStepWiseSolutions: true,
    includeMarkingScheme: true,
    shuffleOptions: false
  },
  distribution: {
    mcq: { enabled: true, count: 16, marksPerQ: 1 },
    assertionReason: { enabled: true, count: 4, marksPerQ: 1 },
    fillInBlanks: { enabled: false, count: 0, marksPerQ: 1 },
    veryShort: { enabled: true, count: 6, marksPerQ: 2 },
    shortAnswer: { enabled: true, count: 7, marksPerQ: 3 },
    longAnswer: { enabled: true, count: 3, marksPerQ: 5 },
    numerical: { enabled: false, count: 0, marksPerQ: 3 },
    caseBased: { enabled: true, count: 3, marksPerQ: 4 }
  }
};

export default function PaperPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Load persisted configuration from localStorage if present
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('school_crm_paper_generator_config');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (_) {}
    return DEFAULT_SETTINGS;
  });

  // Options & Curriculum catalogues from gateway
  const [curriculumOpts, setCurriculumOpts] = useState({
    standards: ['6th', '7th', '8th', '9th', '10th', '11th', '12th'],
    subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Science', 'Social Science', 'English'],
    syllabuses: ['CBSE', 'State Board', 'ICSE', 'NEET', 'JEE']
  });
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [curriculumError, setCurriculumError] = useState(false);

  // Chapters cache: { [subject]: string[] }
  const [chaptersCatalog, setChaptersCatalog] = useState({});
  const [chapterSearchQuery, setChapterSearchQuery] = useState({});
  const [loadingChapters, setLoadingChapters] = useState({});

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [activeTab, setActiveTab] = useState('paper'); // 'paper' | 'answer' | 'marking'
  const [previewMode, setPreviewMode] = useState('document'); // 'document' | 'editor'
  const [paperResult, setPaperResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Knowledge Library & RAG state
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryCount, setLibraryCount] = useState(0);
  const [matchingResources, setMatchingResources] = useState([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState([]);
  const [teacherInstructions, setTeacherInstructions] = useState('');

  // Blueprint Plan & Optional Distribution state
  const [distributionMode, setDistributionMode] = useState('ai_auto'); // 'ai_auto' | 'custom'
  const [showBlueprintModal, setShowBlueprintModal] = useState(false);
  const [blueprintPlan, setBlueprintPlan] = useState(null);
  const [planningBlueprint, setPlanningBlueprint] = useState(false);

  // History Drawer state
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Inline editing state for paper content
  const [isEditing, setIsEditing] = useState(false);
  const [editableMarkdown, setEditableMarkdown] = useState('');

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('school_crm_paper_generator_config', JSON.stringify(settings));
    } catch (_) {}
  }, [settings]);

  // Fetch options from server
  const fetchOptions = async () => {
    setCurriculumLoading(true);
    setCurriculumError(false);
    try {
      const res = await api.get('/options');
      if (res?.data?.standards) {
        setCurriculumOpts(res.data);
      }
    } catch (err) {
      console.warn('Using standard fallback curriculum options');
    } finally {
      setCurriculumLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  // Fetch matching library resources for RAG grounding
  const fetchLibraryResources = async () => {
    try {
      const res = await api.get('/paper/resources');
      if (res.data?.status && Array.isArray(res.data?.data)) {
        setLibraryCount(res.data.data.length);
        const matching = res.data.data.filter(r => 
          (r.standard === settings.classLevel || r.standard === 'all') &&
          (settings.subjects.includes(r.subject) || r.subject === 'all')
        );
        setMatchingResources(matching);
        setSelectedResourceIds(matching.map(m => m.id));
      }
    } catch (err) {
      console.warn('Could not load library resources:', err.message);
    }
  };

  useEffect(() => {
    fetchLibraryResources();
  }, [settings.classLevel, settings.syllabus, settings.subjects]);

  // Fetch chapters whenever classLevel or selected subjects change
  useEffect(() => {
    const fetchChaptersForSubject = async (subj) => {
      setLoadingChapters(prev => ({ ...prev, [subj]: true }));
      try {
        const res = await api.get(`/lessons?standard=${settings.classLevel}&subject=${subj}`);
        if (res?.data?.lessons) {
          setChaptersCatalog(prev => ({ ...prev, [subj]: res.data.lessons }));
        }
      } catch (err) {
        console.error(`Failed to load chapters for ${subj}`, err);
      } finally {
        setLoadingChapters(prev => ({ ...prev, [subj]: false }));
      }
    };

    settings.subjects.forEach(subj => {
      fetchChaptersForSubject(subj);
    });
  }, [settings.classLevel, settings.subjects]);

  // Load history
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/paper/history');
      if (res?.data?.data) {
        setHistoryList(res.data.data);
      }
    } catch (err) {
      // Fallback to local storage history
      try {
        const local = JSON.parse(localStorage.getItem('school_crm_paper_history') || '[]');
        setHistoryList(local);
      } catch (_) {}
    } finally {
      setHistoryLoading(false);
    }
  };

  // Delete paper from history
  const handleDeletePaper = async (id) => {
    if (!(await confirmModal({ title: 'Delete Question Paper', message: 'Are you sure you want to delete this saved question paper?', type: 'danger', confirmText: 'Delete Paper' }))) return;
    try {
      await api.delete(`/paper/${id}`);
      setHistoryList(prev => prev.filter(p => p.id !== id));
      if (paperResult?.id === id) {
        setPaperResult(null);
      }
      toast.success('Paper deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete paper');
    }
  };

  // Back button handler with history check
  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  // Calculate live total allocated marks
  const allocatedMarks = useMemo(() => {
    let total = 0;
    Object.keys(settings.distribution).forEach(key => {
      const row = settings.distribution[key];
      if (row.enabled && row.count > 0) {
        total += Number(row.count) * Number(row.marksPerQ);
      }
    });
    return total;
  }, [settings.distribution]);

  const marksMatch = allocatedMarks === Number(settings.totalMarks);
  const isDistributionReady = distributionMode === 'ai_auto' || marksMatch;

  // Auto balance button: Mathematically balances question distribution to match target marks exactly
  const handleAutoBalance = () => {
    const total = Number(settings.totalMarks);
    if (total <= 0) return;

    if (total <= 30) {
      const mcq = Math.max(1, Math.min(10, Math.floor(total * 0.3)));
      const vs = Math.max(1, Math.floor((total - mcq) * 0.4 / 2));
      const sa = Math.max(0, Math.floor((total - mcq - vs * 2) / 3));
      const current = mcq * 1 + vs * 2 + sa * 3;
      const diff = total - current;
      const finalMcq = Math.max(1, mcq + diff);

      setSettings(prev => ({
        ...prev,
        distribution: {
          mcq: { enabled: true, count: finalMcq, marksPerQ: 1 },
          assertionReason: { enabled: false, count: 0, marksPerQ: 1 },
          fillInBlanks: { enabled: false, count: 0, marksPerQ: 1 },
          veryShort: { enabled: true, count: vs, marksPerQ: 2 },
          shortAnswer: { enabled: sa > 0, count: sa, marksPerQ: 3 },
          longAnswer: { enabled: false, count: 0, marksPerQ: 5 },
          numerical: { enabled: false, count: 0, marksPerQ: 3 },
          caseBased: { enabled: false, count: 0, marksPerQ: 4 }
        }
      }));
    } else {
      let mcq = Math.max(5, Math.floor((total * 0.20) / 1));
      let ar = Math.max(2, Math.floor((total * 0.05) / 1));
      let vs = Math.max(2, Math.floor((total * 0.20) / 2));
      let sa = Math.max(3, Math.floor((total * 0.30) / 3));
      let la = Math.max(1, Math.floor((total * 0.25) / 5));

      let current = mcq * 1 + ar * 1 + vs * 2 + sa * 3 + la * 5;
      let diff = total - current;
      mcq += diff;

      setSettings(prev => ({
        ...prev,
        distribution: {
          mcq: { enabled: true, count: mcq, marksPerQ: 1 },
          assertionReason: { enabled: true, count: ar, marksPerQ: 1 },
          fillInBlanks: { enabled: false, count: 0, marksPerQ: 1 },
          veryShort: { enabled: true, count: vs, marksPerQ: 2 },
          shortAnswer: { enabled: true, count: sa, marksPerQ: 3 },
          longAnswer: { enabled: true, count: la, marksPerQ: 5 },
          numerical: { enabled: false, count: 0, marksPerQ: 3 },
          caseBased: { enabled: false, count: 0, marksPerQ: 4 }
        }
      }));
    }
    toast.success('Question distribution auto-balanced to match target marks!');
  };

  // Chapter selection toggle
  const toggleChapter = (subject, chapter) => {
    setSettings(prev => {
      const current = prev.chaptersBySubject[subject] || [];
      const updated = current.includes(chapter)
        ? current.filter(c => c !== chapter)
        : [...current, chapter];
      return {
        ...prev,
        chaptersBySubject: {
          ...prev.chaptersBySubject,
          [subject]: updated
        }
      };
    });
  };

  // Select all chapters for a subject
  const selectAllChapters = (subject) => {
    const all = chaptersCatalog[subject] || [];
    setSettings(prev => ({
      ...prev,
      chaptersBySubject: {
        ...prev.chaptersBySubject,
        [subject]: all
      }
    }));
  };

  // Clear all chapters for a subject
  const clearChapters = (subject) => {
    setSettings(prev => ({
      ...prev,
      chaptersBySubject: {
        ...prev.chaptersBySubject,
        [subject]: []
      }
    }));
  };

  // Toggle subject
  const toggleSubject = (subject) => {
    setSettings(prev => {
      const isSelected = prev.subjects.includes(subject);
      if (isSelected && prev.subjects.length === 1) {
        toast.error('At least one subject must be selected');
        return prev;
      }
      const updated = isSelected
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject];

      // Remove chapters for unselected subject
      const newChapters = { ...prev.chaptersBySubject };
      if (isSelected) {
        delete newChapters[subject];
      }

      return {
        ...prev,
        subjects: updated,
        chaptersBySubject: newChapters
      };
    });
  };

  // Apply exam preset
  const applyPreset = (presetId) => {
    const preset = EXAM_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setSettings(prev => ({
      ...prev,
      pattern: preset.name,
      totalMarks: preset.totalMarks,
      durationMinutes: preset.duration,
      distribution: JSON.parse(JSON.stringify(preset.distribution))
    }));
    toast.success(`Applied ${preset.name} pattern preset`);
  };

  // Generate Paper
  const handleGenerate = async () => {
    if (distributionMode === 'custom' && !marksMatch) {
      toast.error(`Allocated marks (${allocatedMarks}) must equal total marks (${settings.totalMarks})`);
      return;
    }
    if (settings.subjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    setGenerating(true);
    setErrorMessage(null);
    setGenerationStep(`Initializing curriculum blueprint for ${settings.classLevel}...`);

    try {
      // Step feedback progress
      const timer1 = setTimeout(() => {
        if (settings.subjects.length > 1) {
          setGenerationStep(`Formulating questions for ${settings.subjects[0]} & aligning Bloom's taxonomy...`);
        } else {
          setGenerationStep(`Formulating structured questions & calculating mark weights...`);
        }
      }, 1200);

      const timer2 = setTimeout(() => {
        setGenerationStep(`Synthesizing official answer key & step-by-step marking schemes...`);
      }, 2800);

      const payload = {
        classLevel: settings.classLevel,
        subjects: settings.subjects,
        chaptersBySubject: settings.chaptersBySubject,
        pattern: settings.pattern,
        syllabus: settings.syllabus,
        totalMarks: Number(settings.totalMarks),
        durationMinutes: Number(settings.durationMinutes),
        questionDistribution: distributionMode === 'custom' ? settings.distribution : null,
        distributionMode,
        difficultyMix: settings.difficultyMix,
        options: settings.options,
        schoolName: settings.schoolName,
        paperTitle: settings.paperTitle,
        teacherInstructions,
        selectedResourceIds
      };

      const res = await api.post('/qelvora-ai/generate', payload, { timeout: 120000 });
      clearTimeout(timer1);
      clearTimeout(timer2);

      if (res.data?.success || res.data?.status) {
        setPaperResult(res.data);
        setEditableMarkdown(res.data.paper);
        setActiveTab('paper');
        setPreviewMode('document');
        toast.success('Exam paper, solutions & marking scheme generated successfully!');

        // Update local history cache
        try {
          const currentHist = JSON.parse(localStorage.getItem('school_crm_paper_history') || '[]');
          const newEntry = {
            id: res.data.id,
            title: res.data.title,
            createdAt: res.data.createdAt || res.data.created_at || new Date().toISOString(),
            paper: res.data.paper,
            answerKey: res.data.answer_key || res.data.answerKey,
            markingScheme: res.data.marking_scheme || res.data.markingScheme,
            structuredData: res.data.structuredData
          };
          localStorage.setItem('school_crm_paper_history', JSON.stringify([newEntry, ...currentHist.slice(0, 19)]));
        } catch (_) {}
      } else {
        throw new Error(res.data?.message || 'Failed to generate paper');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Generation failed. Please try again.';
      setPaperResult(null);
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
      setGenerationStep('');
    }
  };

  // Formulate AI Blueprint Plan
  const handlePlanBlueprint = async () => {
    if (settings.subjects.length === 0) {
      toast.error('Please select at least one subject first');
      return;
    }
    setPlanningBlueprint(true);
    try {
      const payload = {
        classLevel: settings.classLevel,
        subjects: settings.subjects,
        chaptersBySubject: settings.chaptersBySubject,
        pattern: settings.pattern,
        syllabus: settings.syllabus,
        totalMarks: Number(settings.totalMarks),
        durationMinutes: Number(settings.durationMinutes),
        difficultyMix: settings.difficultyMix,
        teacherInstructions,
        questionDistribution: distributionMode === 'custom' ? settings.distribution : null,
        distributionMode
      };
      const res = await api.post('/paper/plan-blueprint', payload);
      if (res.data?.status && res.data?.data) {
        setBlueprintPlan(res.data.data);
        setShowBlueprintModal(true);
      } else {
        toast.error('Failed to formulate blueprint plan');
      }
    } catch (err) {
      console.error('Blueprint planning error:', err);
      toast.error(err.response?.data?.message || 'Failed to formulate implementation plan');
    } finally {
      setPlanningBlueprint(false);
    }
  };

  // Proceed with Generation from Blueprint Modal
  const handleProceedWithPlan = () => {
    setShowBlueprintModal(false);
    handleGenerate();
  };

  // Adopt Plan into Custom Matrix
  const handleAdoptPlanToMatrix = (dist) => {
    if (dist) {
      setSettings(prev => ({
        ...prev,
        distribution: { ...prev.distribution, ...dist }
      }));
      setDistributionMode('custom');
      setShowBlueprintModal(false);
      toast.success('Adopted AI blueprint into custom distribution matrix');
    }
  };

  // Handle in-place question updates from InteractiveQuestionEditor
  const handleQuestionsUpdated = (updatedQuestions) => {
    if (!paperResult) return;

    const school = settings.schoolName || 'QELVORA SCHOOL CRM';
    const title = paperResult.title || `${settings.classLevel} Comprehensive Examination (${settings.syllabus})`;
    const uniqueId = paperResult.id;

    // Reconstruct clean synchronized Markdown
    let paperMd = `# ${school.toUpperCase()}\n## ${title.toUpperCase()}\n\n`;
    paperMd += `**Standard / Class:** ${settings.classLevel} | **Subject(s):** ${settings.subjects.join(', ')} | **Board:** ${settings.syllabus}\n`;
    paperMd += `**Time Allowed:** ${settings.durationMinutes} Minutes | **Maximum Marks:** ${settings.totalMarks} Marks | **Exam Code:** ${uniqueId}\n\n---\n\n`;
    paperMd += `### GENERAL INSTRUCTIONS:\n`;
    paperMd += `1. This question paper comprises five Sections – **A, B, C, D and E**. There are **${updatedQuestions.length}** questions in total.\n`;
    paperMd += `2. **Section A** consists of objective multiple choice questions carrying **1 mark** each.\n`;
    paperMd += `3. **Section B** consists of very short answer questions carrying **2 marks** each.\n`;
    paperMd += `4. **Section C** consists of short answer questions carrying **3 marks** each.\n`;
    paperMd += `5. **Section D** consists of long answer questions carrying **5 marks** each.\n`;
    paperMd += `6. **Section E** consists of case-based evaluation units carrying **4 marks** each with sub-questions.\n`;
    paperMd += `7. All questions are compulsory. However, an internal choice in some questions has been provided.\n`;
    paperMd += `8. Use of calculators or electronic devices is strictly prohibited.\n\n---\n\n`;

    let answerKeyMd = `# ${school.toUpperCase()}\n## OFFICIAL ANSWER KEY & STEP-BY-STEP SOLUTIONS\n\n`;
    answerKeyMd += `**Examination:** ${title.toUpperCase()} | **Code:** ${uniqueId}\n\n---\n\n`;

    let markingSchemeMd = `# ${school.toUpperCase()}\n## OFFICIAL EVALUATION RUBRIC & STEP-WISE MARKING SCHEME\n\n`;
    markingSchemeMd += `**Examination:** ${title.toUpperCase()} | **Code:** ${uniqueId}\n\n---\n\n`;

    const secHeadings = {
      'A': { title: 'SECTION – A (1 mark each)', sub: 'MULTIPLE CHOICE QUESTIONS' },
      'B': { title: 'SECTION – B (2 marks each)', sub: 'VERY SHORT ANSWER TYPE QUESTIONS' },
      'C': { title: 'SECTION – C (3 marks each)', sub: 'SHORT ANSWER TYPE QUESTIONS' },
      'D': { title: 'SECTION – D (5 marks each)', sub: 'LONG ANSWER TYPE QUESTIONS' },
      'E': { title: 'SECTION – E (4 marks each)', sub: 'CASE-BASED / SOURCE-INTEGRATED ASSESSMENT' }
    };

    ['A', 'B', 'C', 'D', 'E'].forEach(secKey => {
      const secQs = updatedQuestions.filter(q => q.section === secKey);
      if (secQs.length === 0) return;
      const secInfo = secHeadings[secKey];
      const secTotalMarks = secQs.reduce((sum, q) => sum + (parseInt(q.marks, 10) || 1), 0);

      paperMd += `\n### ${secInfo.title}\n#### ${secInfo.sub} (${secTotalMarks} Marks)\n\n`;
      answerKeyMd += `\n### ${secInfo.title} – SOLUTIONS\n\n`;
      markingSchemeMd += `\n### ${secInfo.title} – STEP-WISE MARKING RUBRIC\n\n`;

      secQs.forEach(q => {
        paperMd += `**${q.qNumber}.** ${q.question}   *[${q.marks} Mark${q.marks > 1 ? 's' : ''}]*\n\n`;
        if (q.options && Array.isArray(q.options) && q.options.length > 0) {
          const letters = ['(a)', '(b)', '(c)', '(d)', '(e)'];
          q.options.forEach((opt, idx) => {
            paperMd += `    **${letters[idx] || '•'}** ${opt}\n`;
          });
          paperMd += `\n`;
        }

        if (q.orQuestion) {
          paperMd += `\n<div align="center"><strong>OR</strong></div>\n\n`;
          paperMd += `    ${q.orQuestion}   *[${q.marks} Mark${q.marks > 1 ? 's' : ''}]*\n\n`;
        }

        answerKeyMd += `**Q${q.qNumber}** *(${q.type} - ${q.chapter || settings.classLevel})*:\n`;
        if (q.correctAnswer) answerKeyMd += `- **Correct Answer / Option:** **${q.correctAnswer}**\n`;
        if (q.explanation) answerKeyMd += `- **Step-by-Step Solution:** ${q.explanation}\n`;
        answerKeyMd += `\n`;

        markingSchemeMd += `**Q${q.qNumber}** *[Max Marks: ${q.marks}]*:\n`;
        markingSchemeMd += `- **Topic / Concept:** ${q.chapter || settings.classLevel}\n`;
        markingSchemeMd += `- **Step-by-Step Breakdown:** ${q.markingCriteria || 'Full marks for accurate scientific deduction.'}\n\n`;
      });
    });

    setPaperResult(prev => ({
      ...prev,
      paper: paperMd,
      answerKey: answerKeyMd,
      answer_key: answerKeyMd,
      markingScheme: markingSchemeMd,
      marking_scheme: markingSchemeMd,
      structuredData: {
        ...(prev.structuredData || {}),
        allQuestions: updatedQuestions
      }
    }));

    if (activeTab === 'paper') setEditableMarkdown(paperMd);
    else if (activeTab === 'answer') setEditableMarkdown(answerKeyMd);
    else setEditableMarkdown(markingSchemeMd);
  };

  // Handle Save Paper changes to backend
  const handleSavePaper = async () => {
    if (!paperResult?.id) return;
    try {
      toast.loading('Saving question paper...', { id: 'save-paper' });
      const res = await api.put(`/paper/${paperResult.id}`, {
        title: paperResult.title,
        allQuestions: paperResult.structuredData?.allQuestions,
        targetMarks: settings.totalMarks,
        paperMd: paperResult.paper,
        answerKeyMd: paperResult.answer_key || paperResult.answerKey,
        markingSchemeMd: paperResult.marking_scheme || paperResult.markingScheme
      });

      if (res.data?.status) {
        toast.success('Question paper & evaluation scheme saved successfully!', { id: 'save-paper' });
      }
    } catch (err) {
      toast.error('Failed to save paper: ' + (err.response?.data?.message || err.message), { id: 'save-paper' });
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Copy as Text
  const handleCopy = () => {
    let content = '';
    if (activeTab === 'paper') content = paperResult?.paper || '';
    else if (activeTab === 'answer') content = paperResult?.answer_key || paperResult?.answerKey || '';
    else if (activeTab === 'marking') content = paperResult?.marking_scheme || paperResult?.markingScheme || '';
    navigator.clipboard.writeText(content);
    toast.success('Copied document to clipboard!');
  };

  // Download formatted Microsoft Word (.doc) document matching CBSE publication standards
  const handleDownloadWord = () => {
    if (!paperResult) return;
    const tabLabel = activeTab === 'paper' ? 'Question_Paper' : (activeTab === 'answer' ? 'Answer_Key' : 'Marking_Scheme');
    const filename = `${paperResult?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Examination'}_${tabLabel}.doc`;
    const docHtml = generateWordDocumentHtml(paperResult, activeTab);
    downloadFile(docHtml, filename, 'application/msword;charset=utf-8');
    toast.success('Downloaded Microsoft Word (.doc) question paper!');
  };

  // Download clean plain-text (.txt) without raw markdown (#, **, &nbsp;)
  const handleDownloadText = () => {
    if (!paperResult) return;
    const tabLabel = activeTab === 'paper' ? 'Question_Paper' : (activeTab === 'answer' ? 'Answer_Key' : 'Marking_Scheme');
    const filename = `${paperResult?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Examination'}_${tabLabel}.txt`;
    const cleanText = generateCleanPlainText(paperResult, activeTab);
    downloadFile(cleanText, filename, 'text/plain;charset=utf-8');
    toast.success('Downloaded clean plain-text document!');
  };

  const handleDownload = () => {
    handleDownloadWord();
  };

  // Reset form
  const handleReset = async () => {
    if (await confirmModal({ title: 'Reset Options', message: 'Reset all question paper generator options back to school defaults?', type: 'warning', confirmText: 'Reset Defaults' })) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem('school_crm_paper_generator_config');
      toast.success('Configuration reset to defaults.');
    }
  };

  // Total selected chapters count across all subjects
  const totalChaptersSelected = useMemo(() => {
    let sum = 0;
    Object.values(settings.chaptersBySubject).forEach(arr => {
      if (Array.isArray(arr)) sum += arr.length;
    });
    return sum;
  }, [settings.chaptersBySubject]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#334155] flex flex-col md:flex-row font-sans">
      {/* Platform Sidebar */}
      <div className="no-print">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <header className="bg-[#172B4D] border-b border-[#29456D] text-white px-6 py-4 sticky top-0 z-30 shadow-xs no-print">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Back Button & Breadcrumb */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                aria-label="Navigate back"
                className="p-2 bg-[#29456D] hover:bg-[#172B4D] rounded-xl text-white hover:text-[#DBEAFE] border border-[#29456D] transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#F3F6FC]" />
                <span>Back</span>
              </button>

              <nav aria-label="Breadcrumb" className="hidden sm:flex items-center text-xs font-semibold text-[#CBD5E1]">
                <span className="hover:text-white cursor-pointer" onClick={() => navigate('/dashboard')}>Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5 mx-1 text-slate-400" />
                <span>Qelvora AI</span>
                <ChevronRight className="w-3.5 h-3.5 mx-1 text-slate-400" />
                <span className="text-white font-bold">Question Paper Generator</span>
              </nav>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowLibraryModal(true)}
                className="px-3.5 py-1.5 rounded-xl border border-[#29456D] bg-[#29456D] hover:bg-[#172B4D] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#F3F6FC]" />
                <span>Study Material Library</span>
                {libraryCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#172B4D] text-[#DBEAFE] text-[9px] flex items-center justify-center font-bold">
                    {libraryCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowHistory(true);
                  loadHistory();
                }}
                className="px-3.5 py-1.5 rounded-xl border border-[#29456D] bg-[#29456D] hover:bg-[#172B4D] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-[#F3F6FC]" />
                <span>Paper History</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                title="Reset all settings to default"
                className="p-2 rounded-xl border border-[#29456D] bg-[#29456D] hover:bg-[#172B4D] text-[#F3F6FC] hover:text-[#DBEAFE] text-xs transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#F3F6FC]" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Workspace */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-[1700px] w-full mx-auto">
          {/* Page Title & Status Strip */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
            <div>
              <span className="text-[10px] font-bold text-[#172B4D] uppercase tracking-widest block mb-0.5">
                Qelvora AI &bull; INTELLIGENT EXAM STUDIO
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Question Paper Generator
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Curriculum-matched, multi-subject examination builder with official marking schemes.
              </p>
            </div>

            {/* Progress summary chip bar */}
            <div className="flex flex-wrap items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs font-medium text-slate-600">
              <span className="font-bold text-[#172B4D] bg-blue-50 px-2 py-0.5 rounded-md">Class {settings.classLevel}</span>
              <span>&bull;</span>
              <span className="font-semibold text-slate-800">{settings.subjects.join(', ')}</span>
              <span>&bull;</span>
              <span className="text-slate-500">{totalChaptersSelected} chapters</span>
              <span>&bull;</span>
              <span className="font-mono font-bold text-indigo-900">{settings.totalMarks} Marks</span>
              <span>&bull;</span>
              <span className="text-slate-500">{settings.durationMinutes} min</span>
            </div>
          </div>

          {/* TWO-PANE LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ──────────────────────────────────────────────────────────
                LEFT PANE: CONFIGURATION & STEPS (~420px width)
            ────────────────────────────────────────────────────────── */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4 no-print">
              
              {/* STEP 1: CLASS & BOARD */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center gap-2.5 mb-3.5">
                  <span className="w-6 h-6 rounded-full bg-[#29456D] text-white flex items-center justify-center font-bold text-xs">1</span>
                  <h2 className="text-sm font-bold text-slate-900">Class & Curriculum Board</h2>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Class / Standard</label>
                    <select
                      value={settings.classLevel}
                      onChange={(e) => {
                        const newClass = e.target.value;
                        setSettings(prev => ({
                          ...prev,
                          classLevel: newClass,
                          chaptersBySubject: {} // Clear stale chapter selections
                        }));
                        toast.success(`Switched to Class ${newClass}. Chapters refreshed.`);
                      }}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white font-bold text-slate-800 outline-none focus:border-[#29456D]"
                    >
                      {curriculumOpts.standards.map(std => (
                        <option key={std} value={std}>Class {std}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Curriculum Board</label>
                    <select
                      value={settings.syllabus}
                      onChange={(e) => setSettings(prev => ({ ...prev, syllabus: e.target.value }))}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white font-bold text-slate-800 outline-none focus:border-[#29456D]"
                    >
                      {curriculumOpts.syllabuses.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* STEP 2: MULTI-SUBJECT SELECTION */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#29456D] text-white flex items-center justify-center font-bold text-xs">2</span>
                    <h2 className="text-sm font-bold text-slate-900">Select Subject(s)</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const all = curriculumOpts.subjects;
                      setSettings(prev => ({
                        ...prev,
                        subjects: prev.subjects.length === all.length ? ['Physics'] : all
                      }));
                    }}
                    className="text-[11px] font-bold text-[#172B4D] hover:underline"
                  >
                    {settings.subjects.length === curriculumOpts.subjects.length ? 'Clear Selection' : 'Select All'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {curriculumOpts.subjects.map(subj => {
                    const isSelected = settings.subjects.includes(subj);
                    return (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => toggleSubject(subj)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-[#29456D] text-white border-[#29456D] shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>{subj}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: SEARCHABLE CHAPTERS CHECKLIST */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#29456D] text-white flex items-center justify-center font-bold text-xs">3</span>
                    <h2 className="text-sm font-bold text-slate-900">Select Chapters</h2>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {totalChaptersSelected} total selected
                  </span>
                </div>

                {settings.subjects.map(subj => {
                  const chapters = chaptersCatalog[subj] || [];
                  const selectedForSubj = settings.chaptersBySubject[subj] || [];
                  const search = (chapterSearchQuery[subj] || '').toLowerCase().trim();
                  const filtered = chapters.filter(c => c.toLowerCase().includes(search));
                  const isLoading = loadingChapters[subj];

                  return (
                    <div key={subj} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-800">{subj}</span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold px-1.5 py-0.2 rounded-full">
                            {selectedForSubj.length}/{chapters.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#172B4D]">
                          <button type="button" onClick={() => selectAllChapters(subj)} className="hover:underline">All</button>
                          <span>&bull;</span>
                          <button type="button" onClick={() => clearChapters(subj)} className="text-slate-500 hover:underline">Clear</button>
                        </div>
                      </div>

                      {/* Chapter search box */}
                      <div className="relative">
                        <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder={`Search ${subj} chapters...`}
                          value={chapterSearchQuery[subj] || ''}
                          onChange={(e) => setChapterSearchQuery(prev => ({ ...prev, [subj]: e.target.value }))}
                          className="w-full pl-7 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-[#29456D]"
                        />
                      </div>

                      {/* Chapters checkbox scroll list */}
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 nav-scroll">
                        {isLoading ? (
                          <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading chapters...
                          </div>
                        ) : filtered.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2 text-center">No matching chapters found.</p>
                        ) : (
                          filtered.map((chap, idx) => {
                            const isChecked = selectedForSubj.includes(chap);
                            return (
                              <label
                                key={idx}
                                className={`flex items-start gap-2 p-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                                  isChecked ? 'bg-indigo-50/70 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleChapter(subj, chap)}
                                  className="mt-0.5 rounded text-[#172B4D] focus:ring-0"
                                />
                                <span className="line-clamp-1 leading-snug">{chap}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* STEP 4: AI REFERENCE MATERIALS & PREVIOUS-YEAR PAPERS (PYQS) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#29456D] text-white flex items-center justify-center font-bold text-xs">4</span>
                    <h2 className="text-sm font-bold text-slate-900">Shared Study Material Library & PYQs</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLibraryModal(true)}
                    className="text-[11px] font-bold text-[#172B4D] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload to Shared Library</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                  Select textbook chapters, notes, and 5-year question papers from the shared library (also available in Topic Summary Generator):
                </p>

                {matchingResources.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1.5">
                    <p className="text-xs font-bold text-slate-700">Standard CBSE / NCERT Grounding Active</p>
                    <p className="text-[11px] text-slate-500">
                      No custom textbooks uploaded for Class {settings.classLevel} {settings.subjects.join('/')}. The AI will use certified standard board syllabus.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowLibraryModal(true)}
                      className="mt-1 px-3 py-1 bg-white border border-[#29456D] text-[#172B4D] hover:bg-blue-50 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                    >
                      <FileUp className="w-3.5 h-3.5" />
                      <span>Upload Textbook PDF or PYQ</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {matchingResources.map(res => {
                      const isChecked = selectedResourceIds.includes(res.id);
                      const isPyq = res.documentType === 'previous_year_paper';

                      return (
                        <label
                          key={res.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-blue-50/70 border-[#29456D]/50 text-slate-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedResourceIds(prev => 
                                isChecked ? prev.filter(id => id !== res.id) : [...prev, res.id]
                              );
                            }}
                            className="mt-0.5 rounded text-[#172B4D] focus:ring-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate font-bold text-xs">{res.title}</span>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase shrink-0 ${
                                isPyq ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {isPyq ? 'PYQ' : res.documentType}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-normal">
                              {res.subject} &bull; {res.academicYear || res.board}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STEP 5: EXAM PATTERN PRESETS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center gap-2.5 mb-3.5">
                  <span className="w-6 h-6 rounded-full bg-[#29456D] text-white flex items-center justify-center font-bold text-xs">5</span>
                  <h2 className="text-sm font-bold text-slate-900">Exam Pattern Preset</h2>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {EXAM_PRESETS.map(preset => {
                    const isSelected = settings.pattern === preset.name;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset.id)}
                        className={`text-left p-2.5 rounded-xl border transition-all text-xs flex justify-between items-center ${
                          isSelected
                            ? 'bg-blue-50/80 border-[#29456D] text-slate-900 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="font-extrabold text-slate-900">{preset.name}</p>
                          <p className="text-[10px] text-slate-500 font-normal">{preset.description}</p>
                        </div>
                        <span className="font-mono font-bold text-[11px] text-indigo-900 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                          {preset.totalMarks}M &bull; {preset.duration}m
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 6: MARKS & DURATION */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center gap-2.5 mb-3.5">
                  <span className="w-6 h-6 rounded-full bg-[#29456D] text-white flex items-center justify-center font-bold text-xs">6</span>
                  <h2 className="text-sm font-bold text-slate-900">Marks & Duration</h2>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Total Marks</label>
                    <input
                      type="number"
                      min={10}
                      max={360}
                      value={settings.totalMarks}
                      onChange={(e) => setSettings(prev => ({ ...prev, totalMarks: parseInt(e.target.value || '0', 10) }))}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 font-bold text-slate-800 text-sm outline-none focus:border-[#29456D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Duration (Minutes)</label>
                    <input
                      type="number"
                      min={15}
                      max={360}
                      value={settings.durationMinutes}
                      onChange={(e) => setSettings(prev => ({ ...prev, durationMinutes: parseInt(e.target.value || '0', 10) }))}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 font-bold text-slate-800 text-sm outline-none focus:border-[#29456D]"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 7: QUESTION DISTRIBUTION (OPTIONAL WITH AI AUTO-MODE) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#29456D] text-white flex items-center justify-center font-bold text-xs">7</span>
                    <h2 className="text-sm font-bold text-slate-900">Question Distribution</h2>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Optional
                    </span>
                  </div>

                  {/* Mode switcher tabs */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setDistributionMode('ai_auto')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        distributionMode === 'ai_auto'
                          ? 'bg-[#29456D] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto (AI)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDistributionMode('custom')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        distributionMode === 'custom'
                          ? 'bg-[#29456D] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Custom Matrix</span>
                    </button>
                  </div>
                </div>

                {distributionMode === 'ai_auto' ? (
                  <div className="p-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#29456D] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-bold text-slate-900">AI Intelligent Question Balancing Active</h3>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                          You don't need to configure questions manually. The AI will formulate standard sections (A to E: MCQs, Short, Long, Case-based) aligned with <span className="font-semibold text-slate-800">{settings.syllabus}</span> guidelines and balanced to exactly <span className="font-bold text-[#172B4D]">{settings.totalMarks} Marks</span>.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-100 text-[11px]">
                      <span className="text-slate-500 font-medium">Want to see the section & marks blueprint first?</span>
                      <button
                        type="button"
                        onClick={handlePlanBlueprint}
                        disabled={planningBlueprint}
                        className="px-3 py-1.5 bg-white text-[#172B4D] border border-blue-300 hover:border-[#29456D] hover:bg-blue-50/50 rounded-lg font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {planningBlueprint ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{planningBlueprint ? 'Planning Blueprint...' : 'Preview Blueprint Plan'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Live Allocation Indicator Bar */}
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleAutoBalance}
                        className="text-[11px] font-bold text-[#172B4D] hover:bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 transition-colors ml-auto cursor-pointer"
                      >
                        Auto-balance Marks
                      </button>
                    </div>

                    <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                      marksMatch
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {marksMatch ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                        <span>Allocated: {allocatedMarks} / {settings.totalMarks} Marks</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold">
                        {marksMatch ? 'Ready' : `Diff: ${allocatedMarks - Number(settings.totalMarks)}M`}
                      </span>
                    </div>

                    {/* Rows per question type */}
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1 nav-scroll text-xs">
                      {Object.keys(QUESTION_TYPE_LABELS).map(key => {
                        const row = settings.distribution[key] || { enabled: false, count: 0, marksPerQ: 1 };
                        const label = QUESTION_TYPE_LABELS[key];
                        return (
                          <div key={key} className="flex items-center justify-between p-2 rounded-lg border border-slate-150 bg-slate-50/50 gap-2">
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={row.enabled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSettings(prev => ({
                                    ...prev,
                                    distribution: {
                                      ...prev.distribution,
                                      [key]: {
                                        ...row,
                                        enabled: checked,
                                        count: checked && row.count === 0 ? 2 : row.count
                                      }
                                    }
                                  }));
                                }}
                                className="rounded text-[#172B4D] focus:ring-0"
                              />
                              <span className="truncate font-semibold text-slate-800">{label}</span>
                            </label>

                            {row.enabled && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <input
                                  type="number"
                                  min={0}
                                  max={60}
                                  value={row.count}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value || '0', 10);
                                    setSettings(prev => ({
                                      ...prev,
                                      distribution: {
                                        ...prev.distribution,
                                        [key]: { ...row, count: val }
                                      }
                                    }));
                                  }}
                                  className="w-12 h-7 px-1 text-center font-mono font-bold bg-white border border-slate-300 rounded text-xs"
                                />
                                <span className="text-slate-400 font-bold">&times;</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={row.marksPerQ}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value || '1', 10);
                                    setSettings(prev => ({
                                      ...prev,
                                      distribution: {
                                        ...prev.distribution,
                                        [key]: { ...row, marksPerQ: val }
                                      }
                                    }));
                                  }}
                                  className="w-10 h-7 px-1 text-center font-mono font-bold bg-white border border-slate-300 rounded text-xs"
                                />
                                <span className="text-[10px] text-slate-400 font-bold w-4">M</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* STEP 8: ADDITIONAL INSTRUCTIONS FOR AI (ESSENTIAL FEATURE) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-6 h-6 rounded-full bg-[#29456D] text-white flex items-center justify-center font-bold text-xs">8</span>
                  <h2 className="text-sm font-bold text-slate-900">Additional Instructions for AI</h2>
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5 leading-relaxed">
                  Tell the AI how you want your question paper prepared. Specify focus chapters, question styles, previous paper patterns, or school formats. The AI strictly respects your guidelines.
                </p>
                <textarea
                  rows="3"
                  value={teacherInstructions}
                  onChange={(e) => setTeacherInstructions(e.target.value)}
                  placeholder="Tell the AI how you want your question paper to be prepared. For example: Refer to the previous five years' question papers, follow the official CBSE pattern, give more weightage to Electricity, include application-based questions, and avoid repeating questions."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#29456D] focus:ring-1 focus:ring-[#93C5FD]/30 leading-relaxed bg-slate-50/50"
                />

                {/* Prompt Quick Chips */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {[
                    "Focus 50% on numericals",
                    "Include real-world application questions",
                    "Prioritize Chapter 1 & 2 concepts",
                    "Follow official 2026 Board sample paper style",
                    "Avoid overly theoretical questions"
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTeacherInstructions(prev => prev ? `${prev}. ${chip}` : chip)}
                      className="text-[10px] bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#172B4D] px-2 py-0.5 rounded-full border border-slate-200 transition-colors cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* STEP 9: DIFFICULTY & FORMATTING OPTIONS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#29456D] text-white flex items-center justify-center font-bold text-xs">9</span>
                  <h2 className="text-sm font-bold text-slate-900">Difficulty Mix & Options</h2>
                </div>

                {/* Difficulty Mix */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Difficulty Mix</span>
                    <span>Easy: {settings.difficultyMix.easy}% &bull; Med: {settings.difficultyMix.medium}% &bull; Hard: {settings.difficultyMix.hard}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={10}
                      max={70}
                      value={settings.difficultyMix.easy}
                      onChange={(e) => {
                        const easy = parseInt(e.target.value, 10);
                        const rem = 100 - easy;
                        const medium = Math.round(rem * 0.7);
                        const hard = rem - medium;
                        setSettings(prev => ({ ...prev, difficultyMix: { easy, medium, hard } }));
                      }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1E3A8A]"
                    />
                  </div>
                </div>

                {/* Header Titles */}
                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">School / Institute Header</label>
                    <input
                      type="text"
                      value={settings.schoolName}
                      onChange={(e) => setSettings(prev => ({ ...prev, schoolName: e.target.value }))}
                      className="w-full h-8 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold outline-none focus:border-[#29456D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Paper Title</label>
                    <input
                      type="text"
                      value={settings.paperTitle}
                      onChange={(e) => setSettings(prev => ({ ...prev, paperTitle: e.target.value }))}
                      className="w-full h-8 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold outline-none focus:border-[#29456D]"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.options.includeAnswerKey}
                      onChange={(e) => setSettings(prev => ({ ...prev, options: { ...prev.options, includeAnswerKey: e.target.checked } }))}
                      className="rounded text-[#172B4D] focus:ring-0"
                    />
                    <span className="font-semibold text-slate-700">Include Official Answer Key</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.options.includeStepWiseSolutions}
                      onChange={(e) => setSettings(prev => ({ ...prev, options: { ...prev.options, includeStepWiseSolutions: e.target.checked } }))}
                      className="rounded text-[#172B4D] focus:ring-0"
                    />
                    <span className="font-semibold text-slate-700">Include Step-by-Step Marking Steps</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.options.includeMarkingScheme}
                      onChange={(e) => setSettings(prev => ({ ...prev, options: { ...prev.options, includeMarkingScheme: e.target.checked } }))}
                      className="rounded text-[#172B4D] focus:ring-0"
                    />
                    <span className="font-semibold text-slate-700">Include Criteria Points Breakdown</span>
                  </label>
                </div>
              </div>

              {/* ACTION BUTTONS: DIRECT GENERATE & BLUEPRINT PLAN */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || !isDistributionReady}
                  className="w-full py-3.5 px-4 bg-[#29456D] hover:bg-[#172B4D] text-white rounded-2xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Examination Paper...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>Generate Question Paper</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePlanBlueprint}
                  disabled={planningBlueprint || generating}
                  className="w-full py-2.5 px-4 bg-slate-50 hover:bg-blue-50/60 text-[#172B4D] border border-blue-200 hover:border-blue-400 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {planningBlueprint ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Formulating Blueprint Plan...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Formulate AI Implementation Plan</span>
                    </>
                  )}
                </button>
              </div>

              {distributionMode === 'custom' && !marksMatch && (
                <p className="text-[11px] text-amber-600 text-center font-bold">
                  ⚠️ Adjust question rows or click "Auto-balance" until allocated marks equal {settings.totalMarks}M.
                </p>
              )}
            </div>

            {/* ──────────────────────────────────────────────────────────
                RIGHT PANE: LIVE PREVIEW & PRINT READY WORKSPACE
            ────────────────────────────────────────────────────────── */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-[650px] bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
              
              {/* Top toolbar */}
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 no-print">
                {/* 3 Tabs: Question Paper, Answer Key, Marking Scheme */}
                <div className="flex bg-slate-200/80 p-0.5 rounded-xl border border-slate-300">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('paper'); setPreviewMode('document'); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === 'paper' && previewMode === 'document' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📄 Question Paper
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('answer'); setPreviewMode('document'); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === 'answer' && previewMode === 'document' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🔑 Answer Key & Solutions
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('marking'); setPreviewMode('document'); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === 'marking' && previewMode === 'document' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📋 Marking Scheme
                  </button>
                </div>

                {/* Question Editor View Mode Switcher */}
                {paperResult?.structuredData?.allQuestions && paperResult.structuredData.allQuestions.length > 0 && (
                  <div className="flex bg-slate-200/80 p-0.5 rounded-xl border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('document')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        previewMode === 'document' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5 inline mr-1" />
                      Document
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('editor')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        previewMode === 'editor' ? 'bg-white text-[#172B4D] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Question Editor
                    </button>
                  </div>
                )}

                {/* Actions */}
                {paperResult && (
                  <div className="flex items-center gap-2">
                    {previewMode === 'editor' && (
                      <button
                        type="button"
                        onClick={handleSavePaper}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Paper</span>
                      </button>
                    )}

                    {previewMode === 'document' && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(!isEditing)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isEditing
                            ? 'bg-amber-100 border-amber-300 text-amber-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isEditing ? 'Done Editing' : 'Edit Inline'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Copy Text</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadWord}
                      className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#172B4D] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Download formatted Microsoft Word document (.doc) with authentic CBSE tables and layout"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#172B4D]" />
                      <span>Word (.doc)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadText}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Download clean plain text (.txt) without markdown markup or code"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Text (.txt)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrint}
                      className="px-4 py-1.5 rounded-lg bg-[#29456D] hover:bg-[#172B4D] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print / PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Empty state */}
              {!paperResult && !generating && !errorMessage && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto no-print">
                  <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#172B4D] mb-4 shadow-inner">
                    <FileText className="w-8 h-8" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-lg mb-2">No Generated Paper</h3>
                  <p className="text-sm text-slate-500 max-w-md leading-relaxed">
                    Select your grade, subjects, and chapter specifications on the left, then click Generate to create an AI-powered curriculum-matched paper.
                  </p>
                </div>
              )}

              {/* Skeleton / Progress Loading state */}
              {generating && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto space-y-4 no-print">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#172B4D] animate-pulse">
                    <Loader2 className="w-7 h-7 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">Designing Examination Paper</h3>
                    <p className="text-xs text-indigo-700 font-bold mt-1 max-w-sm animate-pulse">
                      {generationStep || 'Aligning questions to NCERT/CBSE curriculum standards...'}
                    </p>
                  </div>

                  {/* Subject progress indicator */}
                  <div className="flex flex-wrap gap-2 pt-4 justify-center">
                    {settings.subjects.map((subj) => (
                      <span key={subj} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        {subj}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Error State with Retry */}
              {errorMessage && !generating && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto space-y-4 no-print">
                  <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Generation Notice</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md">{errorMessage}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="px-4 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Retry Generation
                  </button>
                </div>
              )}

              {/* Active Paper Document View vs Question Editor */}
              {!errorMessage && paperResult && !generating && (
                <div className="flex-1 flex flex-col">
                  {/* Mock Warning Banner if Mock Provider was used */}
                  {paperResult.isMock && (
                    <div className="bg-red-50 border-2 border-red-500 text-red-700 px-4 py-2.5 mx-6 mt-4 rounded-xl font-black text-center text-xs tracking-wider uppercase shadow-xs">
                      ⚠️ SAMPLE DATA – NOT AI GENERATED
                    </div>
                  )}

                  {/* Review Notice */}
                  <div className="bg-amber-50/70 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-800 no-print">
                    <span className="font-semibold flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-amber-600" />
                      {paperResult.isMock ? 'Sample Mock Data • Review before use' : 'AI-generated • Please review questions prior to final printing.'}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-amber-100 px-2 py-0.5 rounded text-amber-900">
                      ID: {paperResult.id}
                    </span>
                  </div>

                  {/* Render Interactive Question Editor vs Markdown Article */}
                  {previewMode === 'editor' && paperResult?.structuredData?.allQuestions ? (
                    <InteractiveQuestionEditor
                      paperId={paperResult.id}
                      questions={paperResult.structuredData.allQuestions}
                      targetMarks={settings.totalMarks}
                      standard={settings.classLevel}
                      syllabus={settings.syllabus}
                      subject={settings.subjects[0]}
                      teacherInstructions={teacherInstructions}
                      onQuestionsUpdated={handleQuestionsUpdated}
                      onSavePaper={handleSavePaper}
                    />
                  ) : isEditing ? (
                    <div className="p-6 flex-1 flex flex-col no-print">
                      <label className="text-xs font-bold text-slate-500 mb-2">Edit Document Markdown Directly:</label>
                      <textarea
                        value={editableMarkdown}
                        onChange={(e) => {
                          setEditableMarkdown(e.target.value);
                          if (activeTab === 'paper') {
                            setPaperResult(prev => ({ ...prev, paper: e.target.value }));
                          } else if (activeTab === 'answer') {
                            setPaperResult(prev => ({ ...prev, answer_key: e.target.value }));
                          } else {
                            setPaperResult(prev => ({ ...prev, marking_scheme: e.target.value }));
                          }
                        }}
                        className="w-full flex-1 min-h-[500px] p-4 font-mono text-xs border border-slate-300 rounded-xl outline-none focus:border-[#29456D] leading-relaxed bg-slate-50"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 bg-slate-100/60 p-4 sm:p-8 overflow-y-auto print:p-0 print:m-0 print:bg-white">
                      {paperResult?.structuredData?.allQuestions && paperResult.structuredData.allQuestions.length > 0 ? (
                        <div id="printable-paper-sheet">
                          <ExamPaperSheet
                            paperData={paperResult}
                            activeTab={activeTab}
                            schoolName={settings.schoolName || 'QELVORA SCHOOL CRM'}
                          />
                        </div>
                      ) : (
                        <article className="p-8 sm:p-12 max-w-4xl mx-auto bg-white rounded-xl shadow-xs border border-slate-200">
                          <div
                            id="printable-paper-sheet"
                            dangerouslySetInnerHTML={{
                              __html: mdToHtml(
                                activeTab === 'paper'
                                  ? paperResult.paper
                                  : (activeTab === 'answer'
                                    ? (paperResult.answer_key || paperResult.answerKey || '_Answer key not generated._')
                                    : (paperResult.marking_scheme || paperResult.markingScheme || '_Marking scheme not generated._'))
                              )
                            }}
                          />
                        </article>
                      )}

                      {/* Source attribution footer */}
                      <div className="max-w-4xl mx-auto mt-6 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-medium no-print">
                        {paperResult.isMock ? (
                          <span className="text-red-600 font-bold">⚠️ SAMPLE DATA – NOT AI GENERATED</span>
                        ) : (
                          <span>Generated by {paperResult.provider ? (paperResult.provider === 'gemini' ? 'Gemini 1.5 Flash' : (paperResult.provider === 'groq' ? 'Groq Llama 3.3' : paperResult.provider)) : 'Gemini'} ({paperResult.model || ''}) – review before use</span>
                        )}
                        <span>Qelvora School CRM Examination Engine</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Mobile Sticky Generate Bar (Requirement 8j) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 shadow-xl no-print flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-bold uppercase">
              {distributionMode === 'ai_auto' ? 'AI Auto-Distribution' : `Marks: ${allocatedMarks}/${settings.totalMarks}M`}
            </span>
            <span className={`text-[11px] font-extrabold ${isDistributionReady ? 'text-emerald-600' : 'text-amber-600'}`}>
              {distributionMode === 'ai_auto' ? '✓ Auto-Balanced' : (marksMatch ? '✓ Balanced' : `⚠️ Need ${Number(settings.totalMarks) - allocatedMarks}M`)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {distributionMode === 'custom' && !marksMatch && (
              <button
                type="button"
                onClick={handleAutoBalance}
                className="px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-xs font-bold border border-amber-200 transition-colors cursor-pointer"
              >
                Auto-balance
              </button>
            )}
            <button
              type="button"
              onClick={handlePlanBlueprint}
              disabled={planningBlueprint || generating}
              className="py-2.5 px-3 bg-slate-100 hover:bg-blue-50 text-[#172B4D] rounded-xl font-bold text-xs border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {planningBlueprint ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
              <span>Plan</span>
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !isDistributionReady}
              className="py-2.5 px-4 bg-[#29456D] hover:bg-[#172B4D] text-white rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              <span>{generating ? 'Generating...' : 'Generate Paper'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          AI BLUEPRINT IMPLEMENTATION PLAN MODAL
      ────────────────────────────────────────────────────────── */}
      {showBlueprintModal && blueprintPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-fadeIn">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#172B4D] via-[#1D4ED8] to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">AI Implementation Plan & Examination Blueprint</h3>
                  <p className="text-xs text-blue-100 font-medium">Review question distribution & syllabus alignment before generating</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBlueprintModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 nav-scroll">
              {/* Summary Banner */}
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-blue-900 text-sm">Curriculum Interpretation Summary</h4>
                  <p className="text-blue-800 leading-relaxed">{blueprintPlan.summary}</p>
                  <div className="flex flex-wrap gap-2 pt-1 font-mono font-bold text-[11px] text-blue-900">
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-blue-200">Total Marks: {blueprintPlan.totalMarks}M</span>
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-blue-200">Duration: {blueprintPlan.durationMinutes} Mins</span>
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-blue-200">Total Questions: {blueprintPlan.totalQuestions}</span>
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-blue-200">Mode: {blueprintPlan.distributionMode === 'ai_auto' ? 'AI Automatic' : 'Custom Manual'}</span>
                  </div>
                </div>
              </div>

              {/* Section Breakdown Table */}
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#172B4D]" />
                  <span>Proposed Sections & Question Breakdown</span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Section</th>
                        <th className="py-2.5 px-3">Question Type & Scope</th>
                        <th className="py-2.5 px-2 text-center">Count</th>
                        <th className="py-2.5 px-2 text-center">Marks/Q</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {blueprintPlan.sections.map((sec, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-[#172B4D]">
                            Sec {sec.section}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-800">{sec.title}</div>
                            <div className="text-[10px] text-slate-500 leading-snug">{sec.description}</div>
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-800">
                            {sec.count}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-600">
                            {sec.marksPerQuestion}M
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900">
                            {sec.subTotalMarks}M
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t border-slate-200">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3 text-xs">Total Examination Structure</td>
                        <td className="py-2.5 px-2 text-center font-mono">{blueprintPlan.totalQuestions} Qs</td>
                        <td className="py-2.5 px-2 text-center">-</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 text-sm">{blueprintPlan.totalMarks} Marks</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Instructions Alignment & Chapter Weightage Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Instruction Alignment */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                  <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Instructions & Board Alignment</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {blueprintPlan.instructionAlignment.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-700 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Chapter Weightage Focus */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                  <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>Chapter Weightage Breakdown</span>
                  </h4>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1 nav-scroll">
                    {blueprintPlan.chapterWeightage.map((ch, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-[11px]">
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-slate-800 truncate">{ch.chapter}</div>
                          <div className="text-[10px] text-slate-500">{ch.focus}</div>
                        </div>
                        <span className="font-mono font-extrabold text-[#172B4D] shrink-0 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          ~{ch.marks}M ({ch.weightage})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bloom's Taxonomy Cognitive Balance */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-700 text-[11px]">
                  <span>Bloom's Taxonomy Cognitive Distribution:</span>
                  <span className="text-slate-500 font-mono">
                    Recall 25% • Comprehension 35% • Application 25% • Analysis 15%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden flex bg-slate-100">
                  <div style={{ width: '25%' }} className="bg-emerald-400" title="Remembering: 25%" />
                  <div style={{ width: '35%' }} className="bg-blue-400" title="Understanding: 35%" />
                  <div style={{ width: '25%' }} className="bg-indigo-500" title="Applying: 25%" />
                  <div style={{ width: '15%' }} className="bg-purple-500" title="Analyzing: 15%" />
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBlueprintModal(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Adjust Instructions
                </button>
                {blueprintPlan.distribution && (
                  <button
                    type="button"
                    onClick={() => handleAdoptPlanToMatrix(blueprintPlan.distribution)}
                    className="px-3 py-2 text-xs font-bold text-[#172B4D] hover:bg-blue-50 rounded-xl border border-blue-200 transition-colors cursor-pointer"
                  >
                    Adopt into Custom Matrix
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleProceedWithPlan}
                disabled={generating}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Paper...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Proceed & Generate Paper</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          HISTORY DRAWER MODAL
      ────────────────────────────────────────────────────────── */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-end no-print animate-fadeIn">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 animate-slideLeft">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#172B4D]" />
                <h3 className="font-extrabold text-base text-slate-900">Examination Papers History</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {historyLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading past papers...
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">No past papers saved yet.</div>
              ) : (
                historyList.map(item => (
                  <div key={item.id} className="p-4 rounded-xl border border-slate-200 hover:border-[#29456D]/50 bg-slate-50/50 transition-all space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="font-extrabold text-xs text-slate-800 line-clamp-1">{item.title}</p>
                      <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">{item.id}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{new Date(item.createdAt || item.created_at).toLocaleString()}</p>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setPaperResult({
                            id: item.id,
                            title: item.title,
                            paper: item.paper,
                            answer_key: item.answerKey || item.answer_key,
                            marking_scheme: item.markingScheme || item.marking_scheme,
                            structuredData: item.structuredData,
                            isMock: item.request?.isMock || item.paper?.includes('SAMPLE DATA')
                          });
                          setEditableMarkdown(item.paper);
                          setActiveTab('paper');
                          setPreviewMode('document');
                          setShowHistory(false);
                          toast.success('Loaded saved paper!');
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-[#29456D] hover:text-white border border-slate-200 rounded text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
                      >
                        Open Paper
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePaper(item.id)}
                        className="px-2 py-1 bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded text-[11px] font-bold text-slate-400 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Delete saved paper"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          KNOWLEDGE LIBRARY MODAL (STUDY MATERIALS & PYQS)
      ────────────────────────────────────────────────────────── */}
      <KnowledgeLibraryModal
        isOpen={showLibraryModal}
        onClose={() => setShowLibraryModal(false)}
        initialClass={settings.classLevel}
        initialSubject={settings.subjects[0]}
        initialBoard={settings.syllabus}
        onResourceChanged={fetchLibraryResources}
      />

      {/* PRINT STYLESHEET (Clean A4 without platform sidebars or headers) */}
      <style>{`
        @media print {
          body, html {
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          aside, header, nav, button {
            display: none !important;
          }
          #printable-paper-sheet {
            padding: 1.5cm !important;
            max-width: 100% !important;
            font-size: 11pt !important;
            line-height: 1.6 !important;
          }
          #printable-paper-sheet h1 {
            font-size: 16pt !important;
            text-align: center !important;
            margin-bottom: 4px !important;
          }
          #printable-paper-sheet h2 {
            font-size: 13pt !important;
            text-align: center !important;
            margin-top: 4px !important;
            margin-bottom: 8px !important;
          }
          #printable-paper-sheet hr {
            border: 1px solid #444 !important;
            margin: 12px 0 !important;
          }
          .mock-warning-banner {
            display: block !important;
            color: #991b1b !important;
            border: 2px solid #ef4444 !important;
            background-color: #fee2e2 !important;
            font-weight: bold !important;
            text-align: center !important;
            padding: 10px 14px !important;
            margin-bottom: 20px !important;
            font-size: 13pt !important;
          }
        }
      `}</style>
    </div>
  );
}
