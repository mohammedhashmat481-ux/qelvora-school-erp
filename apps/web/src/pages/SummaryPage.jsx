import { confirmModal } from '../context/ModalContext';
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/ui/Sidebar';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';
import api from '../services/api';
import KnowledgeLibraryModal from '../components/paper/KnowledgeLibraryModal';
import {
  BookOpen,
  Sparkles,
  FileText,
  Copy,
  Printer,
  Save,
  Clock,
  History,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Edit3,
  Eye,
  Columns,
  Trash2,
  X,
  ExternalLink,
  ChevronRight,
  BookmarkPlus
} from 'lucide-react';

const SUMMARY_STYLES = [
  {
    id: 'Quick Revision',
    title: '⚡ Quick Revision',
    description: 'Key formulas, definitions & rapid recap for fast exam review'
  },
  {
    id: 'Standard Notes',
    title: '📘 Standard Notes',
    description: 'Balanced classroom notes with clear explanations & examples'
  },
  {
    id: 'Detailed Notes',
    title: '🔬 Detailed Notes',
    description: 'In-depth concepts, derivations, mechanisms & analytical depth'
  },
  {
    id: 'Exam-Oriented Notes',
    title: '🎯 Exam-Oriented Notes',
    description: 'Mark-fetching points, mnemonics, diagrams & common exam traps'
  }
];

const PROMPT_SUGGESTIONS = [
  'Focus heavily on NCERT formulas, definitions and SI units',
  'Simplify explanations for students who struggle with abstract concepts',
  'Include 3 real-world Indian applications and memory mnemonics',
  'Emphasize previous board exam high-frequency questions & traps',
  'Provide a step-by-step conceptual derivation flowchart'
];

export default function SummaryPage() {
  const [standard, setStandard] = useState('10th');
  const [board, setBoard] = useState('CBSE');
  const [subject, setSubject] = useState('Science');
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('Standard Notes');
  const [teacherInstructions, setTeacherInstructions] = useState('');
  
  // Shared Library State
  const [availableResources, setAvailableResources] = useState([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);

  // Generation & Output State
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryTitle, setSummaryTitle] = useState('');
  const [sourcesUsed, setSourcesUsed] = useState([]);
  const [currentSummaryId, setCurrentSummaryId] = useState(null);
  const [viewMode, setViewMode] = useState('rendered'); // 'rendered' | 'edit' | 'split'

  // History Drawer State
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const standards = [
    "1st", "2nd", "3rd", "4th", "5th",
    "6th", "7th", "8th", "9th", "10th",
    "11th", "12th",
    "PUC 1st Year", "PUC 2nd Year",
    "ITI", "Diploma 1st Year", "Diploma 2nd Year", "Diploma 3rd Year",
    "Degree 1st Year", "Degree 2nd Year", "Degree 3rd Year",
    "Engineering 1st Year", "Engineering 2nd Year", "Engineering 3rd Year", "Engineering 4th Year"
  ];

  const boards = [
    "CBSE",
    "Karnataka State Board",
    "State Board",
    "ICSE",
    "Cambridge / IGCSE"
  ];

  const subjects = [
    "Science", "Physics", "Chemistry", "Biology", "Mathematics",
    "Social Science", "History", "Geography", "Civics", "Economics",
    "English", "Hindi", "Kannada", "Computer Science", "Artificial Intelligence"
  ];

  // Fetch documents from shared library matching standard and subject
  const fetchSharedResources = async () => {
    setLoadingResources(true);
    try {
      const res = await api.get(`/study-materials?standard=${encodeURIComponent(standard)}&subject=${encodeURIComponent(subject)}`);
      if (res.data?.status && Array.isArray(res.data?.data)) {
        setAvailableResources(res.data.data);
        // Default select all ready resources for this subject/class
        const readyIds = res.data.data.filter(r => r.status === 'ready').map(r => r.id);
        setSelectedResourceIds(readyIds);
      } else {
        setAvailableResources([]);
        setSelectedResourceIds([]);
      }
    } catch (err) {
      console.warn('Could not fetch shared resources:', err.message);
      setAvailableResources([]);
    } finally {
      setLoadingResources(false);
    }
  };

  useEffect(() => {
    fetchSharedResources();
  }, [standard, subject]);

  // Fetch summary history
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/summary/history');
      if (res.data?.status && Array.isArray(res.data?.data)) {
        setHistoryItems(res.data.data);
      }
    } catch (err) {
      console.warn('Could not fetch history:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      toast.error('Please enter a topic name');
      return;
    }

    setLoading(true);
    setSummary('');
    setCurrentSummaryId(null);
    setSourcesUsed([]);
    const toastId = toast.loading('Grounding topic with shared library & generating notes with Gemini AI...');

    try {
      const response = await api.post('/summary/generate', {
        standard,
        board,
        subject,
        topic: topic.trim(),
        style,
        teacherInstructions: teacherInstructions.trim(),
        selectedResourceIds
      });

      if (response.data && response.data.summary) {
        setSummary(response.data.summary);
        setSummaryTitle(response.data.title || `${topic.trim()} - ${style}`);
        setSourcesUsed(response.data.sourcesUsed || []);
        toast.success('Topic summary generated successfully!', { id: toastId });
      } else {
        toast.error('Failed to generate summary.', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.response?.data?.detail || err.message || 'Error generating summary.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Save current summary to DB history
  const handleSaveSummary = async () => {
    if (!summary) return;
    const toastId = toast.loading('Saving summary to history...');
    try {
      const payload = {
        standard,
        board,
        subject,
        topic: topic.trim() || 'Untitled Topic',
        style,
        title: summaryTitle || `${topic} - ${style}`,
        summary,
        teacherInstructions,
        sourcesUsed
      };
      const res = await api.post('/summary', payload);
      if (res.data?.status && res.data?.data?.id) {
        setCurrentSummaryId(res.data.data.id);
        toast.success('Summary saved to your library history!', { id: toastId });
      } else {
        toast.success('Summary saved!', { id: toastId });
      }
    } catch (err) {
      toast.error('Failed to save summary: ' + (err.response?.data?.message || err.message), { id: toastId });
    }
  };

  // Load an item from history
  const handleLoadFromHistory = (item) => {
    setTopic(item.topic || '');
    setStandard(item.standard || '10th');
    setBoard(item.board || 'CBSE');
    setSubject(item.subject || 'Science');
    setStyle(item.style || 'Standard Notes');
    setTeacherInstructions(item.teacherInstructions || '');
    setSummary(item.summary || '');
    setSummaryTitle(item.title || item.topic || '');
    setSourcesUsed(item.sourcesUsed || []);
    setCurrentSummaryId(item.id);
    setShowHistory(false);
    toast.success(`Loaded notes: ${item.topic}`);
  };

  // Delete an item from history
  const handleDeleteFromHistory = async (e, id) => {
    e.stopPropagation();
    if (!(await confirmModal({ title: 'Delete Lesson Summary', message: 'Are you sure you want to delete this saved lesson summary?', type: 'danger', confirmText: 'Delete Summary' }))) return;
    try {
      await api.delete(`/summary/${id}`);
      setHistoryItems(prev => prev.filter(h => h.id !== id));
      if (currentSummaryId === id) setCurrentSummaryId(null);
      toast.success('Saved summary deleted');
    } catch (err) {
      toast.error('Failed to delete summary');
    }
  };

  // Markdown parser with rich academic styles
  const parseMarkdown = (md) => {
    if (!md) return '';
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-slate-900 mt-5 mb-2.5 flex items-center gap-2"><span class="w-1.5 h-4 bg-amber-500 rounded-full inline-block"></span>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-extrabold text-slate-900 mt-6 mb-3 border-b border-slate-200 pb-2 flex items-center gap-2"><span class="w-2 h-5 bg-[#29456D] rounded-full inline-block"></span>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-black text-slate-900 mt-6 mb-4 text-[#172B4D]">$1</h1>');

    // Bold & Italics
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>');

    // Code blocks & inline code
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-900 text-amber-300 p-4 rounded-xl font-mono text-xs my-4 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-sm">$1</pre>');
    html = html.replace(/`(.*?)`/g, '<code class="bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-mono text-xs border border-amber-200 font-semibold">$1</code>');

    // Horizontal Rule
    html = html.replace(/^---$/gim, '<hr class="my-5 border-t border-slate-200" />');

    // Bullet points & numbers
    const lines = html.split('\n');
    let inList = false;
    const processedLines = [];

    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        if (!inList) {
          processedLines.push('<ul class="list-disc pl-6 space-y-2 my-3 text-slate-700 leading-relaxed text-sm">');
          inList = true;
        }
        processedLines.push(`<li class="leading-relaxed">${trimmed.replace(/^(\*|-|•)\s+/, '')}</li>`);
      } else {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        processedLines.push(line);
      }
    }
    if (inList) {
      processedLines.push('</ul>');
    }

    html = processedLines.join('\n');

    // Paragraph breaks
    html = html.replace(/\n\n/g, '</p><p class="mt-3.5 text-slate-700 leading-relaxed text-sm">');
    html = `<p class="text-slate-700 leading-relaxed text-sm">${html}</p>`;

    return html;
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    toast.success('Summary copied to clipboard!');
  };

  const handlePrint = () => {
    const printContent = document.getElementById('summary-content-box')?.innerHTML || '';
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups for printing.');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${topic} - Study Summary</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @media print {
              @page { margin: 15mm 20mm; size: A4; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 20px; }
            h1 { font-size: 1.5rem; font-weight: 800; color: #1e3a8a; margin-top: 1.25rem; margin-bottom: 0.5rem; }
            h2 { font-size: 1.2rem; font-weight: 700; color: #0f172a; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 0.25rem; margin-top: 1.25rem; margin-bottom: 0.5rem; }
            h3 { font-size: 1rem; font-weight: 700; color: #334155; margin-top: 1rem; margin-bottom: 0.25rem; }
            p { font-size: 0.9rem; line-height: 1.6; margin-top: 0.5rem; color: #334155; }
            ul { list-style-type: disc; padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
            li { font-size: 0.9rem; line-height: 1.6; color: #334155; margin-bottom: 0.25rem; }
            pre { background-color: #f1f5f9; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 0.8rem; overflow-x: auto; border: 1px solid #e2e8f0; }
            code { background-color: #fef3c7; color: #92400e; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.85rem; }
            .header-box { border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <div style="font-size:10px; font-weight:800; letter-spacing:0.1em; color:#1e3a8a; text-transform:uppercase;">QELVORA SCHOOL CRM</div>
                <div style="font-size:18px; font-weight:900; color:#0f172a; margin-top:2px;">Academic Study Summary: ${topic}</div>
              </div>
              <div style="text-align:right; font-size:11px; color:#64748b;">
                <div>Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div style="font-weight:700; color:#1e3a8a;">${style}</div>
              </div>
            </div>
            <div style="display:flex; gap:16px; margin-top:10px; font-size:12px; color:#475569; background:#f8fafc; padding:6px 12px; border-radius:6px; border:1px solid #e2e8f0;">
              <div><strong>Board:</strong> ${board}</div>
              <div><strong>Standard:</strong> ${standard}</div>
              <div><strong>Subject:</strong> ${subject}</div>
              <div><strong>Grounded Sources:</strong> ${sourcesUsed.length > 0 ? sourcesUsed.map(s => s.title || s).join(', ') : 'Curriculum Standard'}</div>
            </div>
          </div>
          <div>${printContent}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#334155] flex flex-col md:flex-row font-sans">
      <Sidebar />
      <div className="flex-1 min-w-0 bg-[#F7F9FC] p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Centralized Study Material Library Shared Banner */}
          <div className="bg-[#172B4D] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-[#29456D]">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-amber-400/10 to-transparent pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider">
                  <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                  <span>Centralized AI Knowledge Library</span>
                </div>
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
                  AI Topic Summary & Revision Notes
                </h1>
                <p className="text-blue-100/80 text-xs sm:text-sm max-w-2xl font-normal leading-relaxed">
                  Upload textbooks, chapter PDFs, and teacher notes <strong className="text-white font-semibold">once</strong>.
                  They are immediately available for grounded RAG synthesis across both the <span className="text-amber-300 font-semibold">Topic Summary Generator</span> and the <span className="text-amber-300 font-semibold">Question Paper Generator</span>.
                </p>
              </div>

              <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setShowKnowledgeModal(true)}
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl text-xs font-black shadow-lg shadow-amber-400/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Open Study Material Library</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    fetchHistory();
                    setShowHistory(true);
                  }}
                  className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-xs font-bold active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  title="View Saved Summary History"
                >
                  <History className="w-4 h-4 text-blue-200" />
                  <span>Saved Summaries</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN: Configuration Form */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white border border-slate-200 shadow-xs rounded-3xl p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#172B4D]" />
                    <span>Summary Generator Parameters</span>
                  </h2>
                </div>

                <form onSubmit={handleGenerate} className="space-y-4">
                  {/* Board and Standard in 2 columns */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-1.5">
                        Curriculum Board
                      </label>
                      <select
                        value={board}
                        onChange={(e) => setBoard(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#93C5FD] font-semibold transition-all"
                      >
                        {boards.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-1.5">
                        Standard / Grade
                      </label>
                      <select
                        value={standard}
                        onChange={(e) => setStandard(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#93C5FD] font-semibold transition-all"
                      >
                        {standards.map((std) => (
                          <option key={std} value={std}>{std}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-1.5">
                      Subject
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#93C5FD] font-semibold transition-all"
                    >
                      {subjects.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  {/* Topic Input */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-1.5">
                      Topic or Chapter Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Electricity & Ohm's Law, Life Processes, Linear Equations"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#93C5FD] font-semibold transition-all shadow-inner"
                      required
                    />
                  </div>

                  {/* Summary Style Selection Cards */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-2">
                      Summary Style & Purpose
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SUMMARY_STYLES.map((st) => {
                        const isSelected = style === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setStyle(st.id)}
                            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#29456D] text-white border-[#29456D] shadow-md shadow-blue-900/10'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-white'
                            }`}
                          >
                            <div className="font-black text-xs tracking-tight">{st.title}</div>
                            <div className={`text-[10px] mt-0.5 line-clamp-2 leading-tight ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                              {st.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Shared Library Reference Materials Checklist */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#172B4D]" />
                        <span className="text-xs font-black text-slate-800">
                          Shared Library Documents ({availableResources.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowKnowledgeModal(true)}
                        className="text-[11px] font-bold text-[#172B4D] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>+ Upload / Manage</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    {loadingResources ? (
                      <div className="py-3 flex items-center justify-center gap-2 text-xs text-slate-500">
                        <Spinner size="sm" />
                        <span>Checking shared library...</span>
                      </div>
                    ) : availableResources.length === 0 ? (
                      <div className="p-2.5 rounded-xl bg-white border border-dashed border-slate-300 text-center">
                        <p className="text-[11px] text-slate-500 font-medium">
                          No uploaded textbooks for <strong className="text-slate-800">{standard} {subject}</strong> yet.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowKnowledgeModal(true)}
                          className="mt-1.5 text-xs font-bold text-[#172B4D] hover:text-blue-700 underline cursor-pointer"
                        >
                          Upload textbook or chapter PDF
                        </button>
                      </div>
                    ) : (
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {availableResources.map((res) => {
                          const isChecked = selectedResourceIds.includes(res.id);
                          return (
                            <label
                              key={res.id}
                              className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-blue-50/70 border-blue-200 text-slate-900'
                                  : 'bg-white border-slate-200 text-slate-500 opacity-70'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedResourceIds(prev => [...prev, res.id]);
                                  } else {
                                    setSelectedResourceIds(prev => prev.filter(id => id !== res.id));
                                  }
                                }}
                                className="mt-0.5 rounded text-[#172B4D] focus:ring-[#93C5FD]"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-bold truncate text-[11px]">{res.title}</div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span className="uppercase font-semibold px-1 py-0.2 bg-slate-200 rounded text-slate-700">
                                    {res.documentType}
                                  </span>
                                  {res.pageCount > 0 && <span>{res.pageCount} pgs</span>}
                                  {res.status === 'ready' && (
                                    <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Teacher's Additional Instructions */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-1.5">
                      Teacher Instructions & Special Focus (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={teacherInstructions}
                      onChange={(e) => setTeacherInstructions(e.target.value)}
                      placeholder="e.g. Include memory mnemonics, emphasize 5-mark board questions, or keep formulas grouped together..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#93C5FD] font-medium transition-all"
                    />

                    {/* Quick Suggestions Chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {PROMPT_SUGGESTIONS.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setTeacherInstructions(prev => prev ? `${prev}. ${suggestion}` : suggestion)}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full font-medium transition-colors border border-slate-200 text-left cursor-pointer"
                        >
                          + {suggestion.slice(0, 32)}...
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-[#172B4D] via-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" />
                        <span>Synthesizing Notes with Gemini AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Generate Topic Summary</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* RIGHT COLUMN: Output Summary View */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-slate-200 shadow-xs rounded-3xl p-5 sm:p-6 flex flex-col min-h-[580px]">

                {/* Output Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-150 pb-4 mb-4">
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Grounded Topic Notes
                    </h2>
                    {summaryTitle && (
                      <div className="text-base font-black text-slate-900 mt-0.5">
                        {summaryTitle}
                      </div>
                    )}
                  </div>

                  {summary && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* View Mode Toggle */}
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 mr-1">
                        <button
                          type="button"
                          onClick={() => setViewMode('rendered')}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            viewMode === 'rendered' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
                          }`}
                          title="Formatted View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('edit')}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            viewMode === 'edit' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
                          }`}
                          title="Edit Markdown"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('split')}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            viewMode === 'split' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
                          }`}
                          title="Split Screen View"
                        >
                          <Columns className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopy}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Copy to Clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Copy</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveSummary}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Save to My Summaries"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{currentSummaryId ? 'Saved' : 'Save'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePrint}
                        className="px-2.5 py-1.5 bg-[#29456D] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                        title="Save as PDF or Print"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print / PDF</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Sources Used Pill Bar */}
                {sourcesUsed.length > 0 && (
                  <div className="mb-4 p-2.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center gap-2 text-xs text-blue-900 flex-wrap">
                    <span className="font-black text-[10px] uppercase tracking-wider text-blue-700">
                      Grounded In:
                    </span>
                    {sourcesUsed.map((src, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-white border border-blue-200 text-[11px] font-semibold text-slate-800 shadow-2xs"
                      >
                        📖 {src.title || src}
                      </span>
                    ))}
                  </div>
                )}

                {/* Output Content Body */}
                <div className="flex-1 flex flex-col">
                  {loading ? (
                    <div className="text-center py-20 my-auto">
                      <div className="relative inline-block mb-4">
                        <Spinner size="lg" className="mx-auto text-[#172B4D]" />
                      </div>
                      <p className="text-slate-800 font-bold text-sm">
                        Retrieving relevant passages from shared knowledge library...
                      </p>
                      <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                        Grounding concepts with Gemini Flash and compiling formatted {style} for {standard} {subject}.
                      </p>
                    </div>
                  ) : summary ? (
                    <div className="flex-1 flex flex-col">
                      {/* Rendered View */}
                      {viewMode === 'rendered' && (
                        <div
                          id="summary-content-box"
                          className="prose max-w-none text-slate-800 p-2"
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(summary) }}
                        />
                      )}

                      {/* Edit View */}
                      {viewMode === 'edit' && (
                        <div className="flex-1 flex flex-col">
                          <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            className="flex-1 w-full min-h-[460px] p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#93C5FD]"
                          />
                        </div>
                      )}

                      {/* Split View */}
                      {viewMode === 'split' && (
                        <div className="grid grid-cols-2 gap-4 flex-1">
                          <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            className="w-full min-h-[460px] p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#93C5FD]"
                          />
                          <div
                            id="summary-content-box"
                            className="prose max-w-none text-slate-800 overflow-y-auto max-h-[460px] p-2 border border-slate-100 rounded-2xl bg-white"
                            dangerouslySetInnerHTML={{ __html: parseMarkdown(summary) }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-20 my-auto text-slate-400">
                      <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#172B4D] flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-100">
                        <BookOpen className="w-8 h-8" />
                      </div>
                      <p className="text-base font-black text-slate-800">
                        Ready to Generate Academic Notes
                      </p>
                      <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                        Select your curriculum board, class, and topic on the left. The AI will ground the summary in textbooks from your shared library.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>

      {/* History Drawer Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-slideLeft">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#172B4D]" />
                <h3 className="font-black text-slate-900 text-sm">Saved Topic Summaries</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {loadingHistory ? (
                <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Spinner size="sm" />
                  <span>Loading history...</span>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No saved summaries found. Generate and save a summary to see it here.
                </div>
              ) : (
                historyItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadFromHistory(item)}
                    className="p-3.5 rounded-2xl border border-slate-200 hover:border-[#29456D] hover:bg-blue-50/40 transition-all cursor-pointer group flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate group-hover:text-[#172B4D]">
                        {item.topic || item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                        <span className="font-semibold text-slate-700">{item.standard} {item.subject}</span>
                        <span>•</span>
                        <span>{item.style}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteFromHistory(e, item.id)}
                      className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shared Centralized Knowledge Library Modal */}
      <KnowledgeLibraryModal
        isOpen={showKnowledgeModal}
        onClose={() => setShowKnowledgeModal(false)}
        initialClass={standard}
        initialSubject={subject}
        initialBoard={board}
        onResourceChanged={fetchSharedResources}
      />
    </div>
  );
}
