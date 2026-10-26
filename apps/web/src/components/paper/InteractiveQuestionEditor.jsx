import React, { useState } from 'react';
import {
  RotateCcw,
  Sparkles,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Save,
  Check,
  Edit2,
  Layers,
  HelpCircle,
  Loader2,
  SplitSquareVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function InteractiveQuestionEditor({
  paperId,
  questions = [],
  targetMarks = 80,
  standard = '10th',
  syllabus = 'CBSE',
  subject = 'Physics',
  teacherInstructions = '',
  onQuestionsUpdated,
  onSavePaper
}) {
  const [regeneratingId, setRegeneratingId] = useState(null);

  // Calculate current marks sum
  const currentTotalMarks = questions.reduce((sum, q) => sum + (parseInt(q.marks, 10) || 1), 0);
  const isMarksBalanced = currentTotalMarks === parseInt(targetMarks, 10);

  // Handle Question Field Change
  const handleFieldChange = (id, field, value) => {
    const updated = questions.map(q => {
      if (q.id === id) {
        return { ...q, [field]: value };
      }
      return q;
    });
    onQuestionsUpdated(updated);
  };

  // Handle Option Change
  const handleOptionChange = (id, optIndex, value) => {
    const updated = questions.map(q => {
      if (q.id === id) {
        const newOpts = [...(q.options || [])];
        newOpts[optIndex] = value;
        return { ...q, options: newOpts };
      }
      return q;
    });
    onQuestionsUpdated(updated);
  };

  // Toggle or Set Internal Choice (OR Question)
  const handleToggleOrQuestion = (id) => {
    const updated = questions.map(q => {
      if (q.id === id) {
        if (q.orQuestion) {
          const { orQuestion, ...rest } = q;
          return rest;
        } else {
          return {
            ...q,
            orQuestion: 'Alternative choice question: State the secondary formulation or alternative approach...'
          };
        }
      }
      return q;
    });
    onQuestionsUpdated(updated);
  };

  // Auto-Balance Marks across questions
  const handleAutoBalance = () => {
    const target = parseInt(targetMarks, 10);
    let diff = target - currentTotalMarks;
    const updated = questions.map(q => ({ ...q }));

    if (diff > 0) {
      for (let i = updated.length - 1; i >= 0 && diff > 0; i--) {
        if (['Long Answer', 'Short Answer', 'Case-Based', 'Numerical'].includes(updated[i].type)) {
          updated[i].marks = (parseInt(updated[i].marks, 10) || 1) + 1;
          diff--;
        }
      }
      for (let i = 0; i < updated.length && diff > 0; i++) {
        updated[i].marks = (parseInt(updated[i].marks, 10) || 1) + 1;
        diff--;
      }
    } else if (diff < 0) {
      let excess = Math.abs(diff);
      for (let i = updated.length - 1; i >= 0 && excess > 0; i--) {
        const cur = parseInt(updated[i].marks, 10) || 1;
        if (cur > 1) {
          const dec = Math.min(excess, cur - 1);
          updated[i].marks = cur - dec;
          excess -= dec;
        }
      }
    }

    onQuestionsUpdated(updated);
    toast.success('Marks auto-balanced to match target examination total!');
  };

  // Regenerate a single question using AI
  const handleRegenerateQuestion = async (q) => {
    setRegeneratingId(q.id);
    try {
      const res = await api.post('/paper/regenerate-question', {
        classLevel: standard,
        syllabus,
        subject,
        chapter: q.chapter || '',
        type: q.type || 'Short Answer',
        marks: q.marks || 3,
        difficulty: q.difficulty || 'Medium',
        teacherInstructions
      });

      if (res.data?.status && res.data?.question) {
        const newQ = res.data.question;
        const updated = questions.map(item => {
          if (item.id === q.id) {
            return {
              ...item,
              question: newQ.question || item.question,
              options: newQ.options || item.options,
              correctAnswer: newQ.correctAnswer || item.correctAnswer,
              explanation: newQ.explanation || item.explanation,
              markingCriteria: newQ.markingCriteria || item.markingCriteria,
              difficulty: newQ.difficulty || item.difficulty
            };
          }
          return item;
        });
        onQuestionsUpdated(updated);
        toast.success(`Question Q${q.qNumber} regenerated successfully!`);
      }
    } catch (err) {
      toast.error('Failed to regenerate question: ' + (err.response?.data?.message || err.message));
    } finally {
      setRegeneratingId(null);
    }
  };

  // Delete Question
  const handleDeleteQuestion = (id) => {
    if (questions.length <= 1) {
      toast.error('A question paper must have at least one question.');
      return;
    }
    const filtered = questions.filter(q => q.id !== id).map((q, idx) => ({ ...q, qNumber: idx + 1 }));
    onQuestionsUpdated(filtered);
    toast.success('Question removed.');
  };

  // Add Question to specific section
  const handleAddQuestion = (secKey = 'C') => {
    const nextNum = questions.length + 1;
    const defaultType = secKey === 'A' ? 'MCQ' : (secKey === 'B' ? 'Very Short Answer' : (secKey === 'D' ? 'Long Answer' : (secKey === 'E' ? 'Case-Based' : 'Short Answer')));
    const defaultMarks = secKey === 'A' ? 1 : (secKey === 'B' ? 2 : (secKey === 'D' ? 5 : (secKey === 'E' ? 4 : 3)));

    const newQ = {
      id: `q_new_${Date.now()}`,
      qNumber: nextNum,
      section: secKey,
      type: defaultType,
      marks: defaultMarks,
      chapter: questions[0]?.chapter || 'Core Concepts',
      question: 'Enter the new curriculum examination question statement here...',
      options: secKey === 'A' ? ['Option A', 'Option B', 'Option C', 'Option D'] : [],
      correctAnswer: secKey === 'A' ? 'A' : 'Standard conceptual solution.',
      explanation: 'Detailed step-by-step solution and derivation.',
      markingCriteria: `Point-wise marking breakdown for ${defaultMarks} Marks.`,
      difficulty: 'Medium'
    };
    onQuestionsUpdated([...questions, newQ]);
    toast.success(`Added new question to Section ${secKey}.`);
  };

  // Group questions by section for structured editing
  const sections = [
    { key: 'A', name: 'SECTION – A (1 mark each)', sub: 'Multiple Choice & Objective Questions', defaultMarks: 1 },
    { key: 'B', name: 'SECTION – B (2 marks each)', sub: 'Very Short Answer Type Questions', defaultMarks: 2 },
    { key: 'C', name: 'SECTION – C (3 marks each)', sub: 'Short Answer Type Questions', defaultMarks: 3 },
    { key: 'D', name: 'SECTION – D (5 marks each)', sub: 'Long Answer Type Questions', defaultMarks: 5 },
    { key: 'E', name: 'SECTION – E (4 marks each)', sub: 'Case-Based Assessment Units', defaultMarks: 4 }
  ];

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-6 bg-slate-50/70 overflow-y-auto">
      {/* Top Banner Toolbar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border ${
            isMarksBalanced
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-amber-50 text-amber-700 border-amber-300'
          }`}>
            {isMarksBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>Total Marks: {currentTotalMarks} / {targetMarks} Marks</span>
          </div>

          {!isMarksBalanced && (
            <button
              type="button"
              onClick={handleAutoBalance}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Auto-Balance Marks to {targetMarks}M
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onSavePaper && (
            <button
              type="button"
              onClick={onSavePaper}
              className="px-4 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          )}
        </div>
      </div>

      {/* Structured Sections Container (matching Image 1 & Image 2) */}
      <div className="space-y-8">
        {sections.map(sec => {
          const secQuestions = questions.filter(q => q.section === sec.key);
          const secMarks = secQuestions.reduce((sum, q) => sum + (parseInt(q.marks, 10) || sec.defaultMarks), 0);

          return (
            <div key={sec.key} className="space-y-3">
              {/* Section Header Banner */}
              <div className="bg-slate-100/90 border border-slate-200 px-5 py-3 rounded-xl flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider underline underline-offset-4 decoration-1">
                    {sec.name}
                  </h3>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    {sec.sub} • {secQuestions.length} Questions ({secMarks} Marks)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddQuestion(sec.key)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add to Section {sec.key}</span>
                </button>
              </div>

              {/* Section Questions */}
              {secQuestions.length === 0 ? (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 italic">
                  No questions in Section {sec.key}. Click "+ Add to Section {sec.key}" to insert a question.
                </div>
              ) : (
                <div className="space-y-4">
                  {secQuestions.map((q) => {
                    const isRegen = regeneratingId === q.id;
                    const hasOr = Boolean(q.orQuestion);

                    return (
                      <div
                        key={q.id || q.qNumber}
                        className="p-5 bg-white border border-slate-200 hover:border-[#29456D]/50 rounded-2xl shadow-xs transition-all space-y-3 font-sans"
                      >
                        {/* Question Card Top Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-[#29456D] text-white flex items-center justify-center font-black text-xs font-serif">
                              {q.qNumber}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              Section {q.section}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {q.type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {q.chapter}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Marks Input aligned on right like Board Papers */}
                            <div className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                              <span>Marks:</span>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={q.marks}
                                onChange={(e) => handleFieldChange(q.id, 'marks', Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className="w-8 text-center font-black text-[#172B4D] bg-transparent outline-none"
                              />
                            </div>

                            {/* Internal Choice Toggle (OR) */}
                            {['C', 'D', 'E'].includes(q.section) && (
                              <button
                                type="button"
                                onClick={() => handleToggleOrQuestion(q.id)}
                                className={`px-2 py-1 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                                  hasOr
                                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                                title="Toggle internal choice (OR question)"
                              >
                                <SplitSquareVertical className="w-3.5 h-3.5" />
                                <span>{hasOr ? 'Has OR Choice' : '+ Add OR Choice'}</span>
                              </button>
                            )}

                            {/* Regenerate Question with AI */}
                            <button
                              type="button"
                              onClick={() => handleRegenerateQuestion(q)}
                              disabled={isRegen}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer disabled:opacity-50"
                              title="Regenerate this question with AI"
                            >
                              {isRegen ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                              <span className="hidden sm:inline">Regenerate</span>
                            </button>

                            {/* Delete Question */}
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Main Question Statement */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            {hasOr ? 'Primary Question Statement (a)' : 'Question Statement'}
                          </label>
                          <textarea
                            rows="2"
                            value={q.question}
                            onChange={(e) => handleFieldChange(q.id, 'question', e.target.value)}
                            className="w-full p-2.5 text-xs text-slate-900 font-medium border border-slate-200 rounded-xl outline-none focus:border-[#29456D] focus:bg-slate-50/50 leading-relaxed font-serif"
                          />
                        </div>

                        {/* MCQ Options Grid (if MCQ / Assertion) */}
                        {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Multiple Choice Options (a, b, c, d)
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-500 w-6 font-serif">
                                    {String.fromCharCode(97 + optIdx)}.
                                  </span>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleOptionChange(q.id, optIdx, e.target.value)}
                                    className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-[#29456D] font-serif"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Internal Choice (OR Question Statement) */}
                        {hasOr && (
                          <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
                            <div className="text-center font-black text-xs text-slate-900 uppercase tracking-widest">
                              OR
                            </div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900">
                              Alternative Choice Question Statement (b)
                            </label>
                            <textarea
                              rows="2"
                              value={q.orQuestion}
                              onChange={(e) => handleFieldChange(q.id, 'orQuestion', e.target.value)}
                              className="w-full p-2.5 text-xs text-slate-900 font-medium bg-white border border-amber-300 rounded-lg outline-none focus:border-amber-600 leading-relaxed font-serif"
                            />
                          </div>
                        )}

                        {/* Solution & Marking Scheme Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                              Correct Answer & Step-by-Step Solution
                            </label>
                            <textarea
                              rows="2"
                              value={q.correctAnswer ? `${q.correctAnswer}\n${q.explanation || ''}` : (q.explanation || '')}
                              onChange={(e) => handleFieldChange(q.id, 'explanation', e.target.value)}
                              className="w-full p-2 text-xs text-slate-700 bg-emerald-50/30 border border-emerald-200 rounded-xl outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">
                              Step-by-Step Marking Criteria
                            </label>
                            <textarea
                              rows="2"
                              value={q.markingCriteria || ''}
                              onChange={(e) => handleFieldChange(q.id, 'markingCriteria', e.target.value)}
                              placeholder="e.g. Formula: 1M; Substitution: 1M; Final result with unit: 1M."
                              className="w-full p-2 text-xs text-slate-700 bg-blue-50/30 border border-blue-200 rounded-xl outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
