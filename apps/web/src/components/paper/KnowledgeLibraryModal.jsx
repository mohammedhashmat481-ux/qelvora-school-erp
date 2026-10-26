import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  BookOpen,
  FileText,
  Search,
  Trash2,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileUp,
  Tag,
  Calendar,
  Layers,
  GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const DOCUMENT_CATEGORIES = [
  { id: 'all', label: 'All Document Types' },
  { id: 'textbook', label: 'Textbook / Core Curriculum' },
  { id: 'chapter_pdf', label: 'Chapter PDF' },
  { id: 'syllabus', label: 'Syllabus & Objectives' },
  { id: 'previous_year_paper', label: 'Previous-Year Paper (PYQ)' },
  { id: 'sample_paper', label: 'Sample Question Paper' },
  { id: 'marking_scheme', label: 'Official Marking Scheme' },
  { id: 'notes', label: 'Teacher Study Notes' }
];

export default function KnowledgeLibraryModal({
  isOpen,
  onClose,
  initialClass = '10th',
  initialSubject = 'Physics',
  initialBoard = 'CBSE',
  onResourceChanged
}) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBoard, setFilterBoard] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterDocType, setFilterDocType] = useState('all');

  // Upload dialog state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFormData, setUploadFormData] = useState({
    title: '',
    board: initialBoard || 'CBSE',
    standard: initialClass || '10th',
    subject: initialSubject || 'Physics',
    documentType: 'textbook',
    academicYear: '2024-2025',
    chapters: ''
  });

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterBoard !== 'all') params.append('board', filterBoard);
      if (filterClass !== 'all') params.append('standard', filterClass);
      if (filterSubject !== 'all') params.append('subject', filterSubject);
      if (filterDocType !== 'all') params.append('documentType', filterDocType);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get(`/paper/resources?${params.toString()}`);
      if (res.data?.status && Array.isArray(res.data?.data)) {
        setResources(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load resources:', err);
      toast.error('Failed to fetch library resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchResources();
    }
  }, [isOpen, filterBoard, filterClass, filterSubject, filterDocType, searchQuery]);

  // Handle PDF Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a PDF document to upload');
      return;
    }

    if (!uploadFormData.title.trim()) {
      toast.error('Please provide a title for the document');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', uploadFormData.title.trim());
    formData.append('board', uploadFormData.board);
    formData.append('standard', uploadFormData.standard);
    formData.append('subject', uploadFormData.subject);
    formData.append('documentType', uploadFormData.documentType);
    formData.append('academicYear', uploadFormData.academicYear);
    
    // Parse chapters string into array
    const chaptersList = uploadFormData.chapters
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);
    formData.append('chapters', JSON.stringify(chaptersList));

    setUploading(true);
    try {
      const res = await api.post('/paper/resources/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000 // 5 minutes timeout for large PDFs up to 150MB
      });

      if (res.data?.status) {
        toast.success(res.data.message || 'Educational PDF processed successfully!');
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadFormData(prev => ({ ...prev, title: '', chapters: '' }));
        fetchResources();
        if (onResourceChanged) onResourceChanged();
      } else {
        throw new Error(res.data?.message || 'Upload failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}" from the Knowledge Library?`)) return;
    try {
      await api.delete(`/paper/resources/${id}`);
      setResources(prev => prev.filter(r => r.id !== id));
      toast.success('Resource deleted from library');
      if (onResourceChanged) onResourceChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete resource');
    }
  };

  // Handle Reprocess
  const handleReprocess = async (id) => {
    try {
      toast.loading('Reprocessing PDF text & chunks...', { id: 'reprocess' });
      const res = await api.post(`/paper/resources/${id}/reprocess`);
      if (res.data?.status) {
        toast.success('Document reprocessed successfully!', { id: 'reprocess' });
        fetchResources();
      }
    } catch (err) {
      toast.error('Reprocess failed: ' + (err.response?.data?.message || err.message), { id: 'reprocess' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#29456D] text-white flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Centralized Study Material Library</h2>
              <p className="text-xs text-slate-500 font-medium">
                Upload once, use everywhere: Shared reference documents for AI Question Papers and Topic Summaries.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
              <span>Upload PDF Document</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#29456D] focus:bg-white"
            />
          </div>

          <select
            value={filterBoard}
            onChange={(e) => setFilterBoard(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#29456D]"
          >
            <option value="all">All Boards</option>
            <option value="CBSE">CBSE</option>
            <option value="State Board">State Board</option>
            <option value="ICSE">ICSE</option>
          </select>

          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#29456D]"
          >
            <option value="all">All Classes</option>
            {['6th', '7th', '8th', '9th', '10th', '11th', '12th'].map(c => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>

          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#29456D]"
          >
            <option value="all">All Subjects</option>
            {['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Science', 'Social Science', 'English'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={filterDocType}
            onChange={(e) => setFilterDocType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#29456D]"
          >
            {DOCUMENT_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchResources}
            className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            title="Refresh library"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Resources Grid / List */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#172B4D]" />
              Loading educational library documents...
            </div>
          ) : resources.length === 0 ? (
            <div className="py-16 text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 text-[#172B4D] flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-sm mb-1">No Study Materials Uploaded Yet</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Upload official textbooks, chapter summaries, or previous 5-year question papers so the AI can ground examination papers in your exact curriculum.
              </p>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white rounded-xl text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload First PDF</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((item) => {
                const totalChunks = item.metadata?.totalChunks || (Array.isArray(item.chunks) ? item.chunks.length : 0);
                const isPyq = item.documentType === 'previous_year_paper';

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-white border border-slate-200 hover:border-[#29456D]/50 rounded-2xl shadow-xs transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          isPyq ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {item.documentType?.replace(/_/g, ' ')}
                        </span>
                        
                        {item.status === 'processed' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            {totalChunks} Chunks
                          </span>
                        ) : item.status === 'warning' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md" title={item.errorMessage}>
                            <AlertCircle className="w-3 h-3" />
                            Scanned PDF
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md" title={item.errorMessage}>
                            <AlertCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-extrabold text-xs text-slate-800 line-clamp-2 mb-2 group-hover:text-[#172B4D] transition-colors">
                        {item.title}
                      </h4>

                      {/* Meta Pills */}
                      <div className="flex flex-wrap gap-1.5 mb-3 text-[11px] text-slate-500 font-medium">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md">
                          <GraduationCap className="w-3 h-3 text-slate-400" />
                          Class {item.standard} • {item.subject}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {item.board}
                        </span>
                        {item.academicYear && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {item.academicYear}
                          </span>
                        )}
                      </div>

                      {/* Chapters Covered */}
                      {item.chapters && item.chapters.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.chapters.slice(0, 3).map((ch, idx) => (
                            <span key={idx} className="text-[10px] font-semibold bg-blue-50/70 text-blue-700 px-1.5 py-0.5 rounded">
                              {ch}
                            </span>
                          ))}
                          {item.chapters.length > 3 && (
                            <span className="text-[10px] font-semibold text-slate-400 self-center">
                              +{item.chapters.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {Math.round((item.fileSize || 0) / 1024)} KB
                      </span>

                      <div className="flex items-center gap-1.5">
                        {item.status !== 'processed' && (
                          <button
                            type="button"
                            onClick={() => handleReprocess(item.id)}
                            className="p-1.5 text-slate-500 hover:text-[#172B4D] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Reprocess text extraction"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <a
                          href={`/api/paper/resources/${item.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-500 hover:text-[#172B4D] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.title)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete PDF"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          UPLOAD PDF MODAL
      ────────────────────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">Upload Reference PDF to Library</h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 pt-4">
              {/* File Dropzone */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">PDF File (Max 150MB) *</label>
                  {uploadFile && (
                    <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (f.size > 150 * 1024 * 1024) {
                        toast.error(`File size (${(f.size / (1024 * 1024)).toFixed(1)}MB) exceeds 150MB limit. Please choose a file under 150MB.`);
                        e.target.value = '';
                        setUploadFile(null);
                        return;
                      }
                      setUploadFile(f);
                      if (!uploadFormData.title) {
                        setUploadFormData(prev => ({ ...prev, title: f.name.replace(/\.pdf$/i, '') }));
                      }
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#29456D] file:text-white hover:file:bg-[#172B4D] cursor-pointer border border-slate-200 rounded-xl p-2 bg-slate-50"
                  required
                />
              </div>

              {/* Document Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  placeholder="e.g. NCERT Class 10 Physics - Chapter 12 Electricity"
                  value={uploadFormData.title}
                  onChange={(e) => setUploadFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#29456D]"
                  required
                />
              </div>

              {/* Document Type & Academic Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Document Category</label>
                  <select
                    value={uploadFormData.documentType}
                    onChange={(e) => setUploadFormData(prev => ({ ...prev, documentType: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#29456D]"
                  >
                    <option value="textbook">Textbook / Official Book</option>
                    <option value="chapter_pdf">Chapter PDF</option>
                    <option value="previous_year_paper">Previous-Year Paper (PYQ)</option>
                    <option value="sample_paper">Sample Question Paper</option>
                    <option value="marking_scheme">Official Marking Scheme</option>
                    <option value="syllabus">Syllabus & Objectives</option>
                    <option value="notes">Teacher Notes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
                  <select
                    value={uploadFormData.academicYear}
                    onChange={(e) => setUploadFormData(prev => ({ ...prev, academicYear: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#29456D]"
                  >
                    <option value="2024-2025">2024-2025</option>
                    <option value="2023-2024">2023-2024</option>
                    <option value="2022-2023">2022-2023</option>
                    <option value="2021-2022">2021-2022</option>
                    <option value="2020-2021">2020-2021</option>
                    <option value="Standard">Standard / Timeless</option>
                  </select>
                </div>
              </div>

              {/* Board, Class, Subject */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Board</label>
                  <select
                    value={uploadFormData.board}
                    onChange={(e) => setUploadFormData(prev => ({ ...prev, board: e.target.value }))}
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#29456D]"
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="State Board">State Board</option>
                    <option value="ICSE">ICSE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class</label>
                  <select
                    value={uploadFormData.standard}
                    onChange={(e) => setUploadFormData(prev => ({ ...prev, standard: e.target.value }))}
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#29456D]"
                  >
                    {['6th', '7th', '8th', '9th', '10th', '11th', '12th'].map(c => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                  <select
                    value={uploadFormData.subject}
                    onChange={(e) => setUploadFormData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#29456D]"
                  >
                    {['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Science', 'Social Science', 'English'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chapters covered */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chapters Covered (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Electricity, Light – Reflection and Refraction"
                  value={uploadFormData.chapters}
                  onChange={(e) => setUploadFormData(prev => ({ ...prev, chapters: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#29456D]"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Tagging specific chapters helps the AI retrieve exact paragraphs for relevant questions.
                </span>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting & Chunking Text...</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-3.5 h-3.5" />
                      <span>Upload & Index PDF</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
