import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
  Maximize2,
  Minimize2,
  XCircle,
  HelpCircle,
  Check,
  ShieldAlert
} from 'lucide-react';
import {
  startExamAttempt,
  autosaveAnswer,
  logIntegritySignal,
  submitExamAttempt
} from '../../services/onlineExamService';

const StudentExamScreen = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [examMeta, setExamMeta] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Map of questionId -> { selectedOptionKeys: [], isMarkedForReview: false, isAnswered: false }
  const [answersState, setAnswersState] = useState({});
  const [savingStatus, setSavingStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [remainingSeconds, setRemainingSeconds] = useState(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [integrityWarnings, setIntegrityWarnings] = useState(0);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef(null);

  // ─── 1. Load Attempt State ──────────────────────────────────────────────
  useEffect(() => {
    loadAttemptSession();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [attemptId]);

  const loadAttemptSession = async () => {
    setIsLoading(true);
    try {
      // Re-trigger start/resume with attemptId as context or fetch exam details
      const res = await startExamAttempt(attemptId); // If passing attemptId, backend returns attempt
      if (res?.isCompleted || res?.data?.isCompleted || res?.data?.status === 'EVALUATED' || res?.data?.status === 'SUBMITTED') {
        toast.success('Attempt already completed. Viewing results.');
        navigate(`/online-exam/result/${attemptId}`, { replace: true });
        return;
      }
      if (res?.data) {
        const d = res.data;
        setExamMeta({
          attemptId: d.attemptId,
          title: d.title,
          examCode: d.examCode,
          subject: d.subject,
          deadlineTime: d.deadlineTime,
          enableIntegrityShield: d.enableIntegrityShield,
          maxIntegrityViolations: d.maxIntegrityViolations,
          navigationMode: d.navigationMode || 'FREE'
        });
        setQuestions(d.questions || []);

        // Populate initial answer states
        const initialAnswers = {};
        (d.questions || []).forEach(q => {
          initialAnswers[q.id] = {
            selectedOptionKeys: q.savedAnswer?.selectedOptionKeys || [],
            isMarkedForReview: Boolean(q.savedAnswer?.isMarkedForReview),
            isAnswered: Boolean(q.savedAnswer?.isAnswered)
          };
        });
        setAnswersState(initialAnswers);

        // Server authoritative countdown
        const sec = Math.max(0, Math.floor((new Date(d.deadlineTime).getTime() - Date.now()) / 1000));
        setRemainingSeconds(sec);
      }
    } catch (err) {
      if (err.response?.data?.isExpired) {
        toast.error('This examination has expired and was auto-submitted.');
        navigate(`/online-exam/result/${attemptId}`);
        return;
      }
      toast.error(err.response?.data?.message || 'Failed to initialize exam session');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── 2. Authoritative Timer & Auto-Submit ────────────────────────────────
  useEffect(() => {
    if (remainingSeconds === null) return;

    if (remainingSeconds <= 0) {
      handleFinalSubmit(true); // Auto submit
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinalSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [remainingSeconds]);

  // ─── 3. Integrity Monitoring (Fullscreen & Tab Switch) ──────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && examMeta?.enableIntegrityShield) {
        setIntegrityWarnings(prev => prev + 1);
        toast.error('Integrity Warning: Tab switch detected and recorded.', { icon: '⚠️' });
        logIntegritySignal(attemptId, { eventType: 'TAB_SWITCH', details: 'Candidate switched away from exam browser tab' });
      }
    };

    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
      if (!isFs && examMeta?.enableIntegrityShield) {
        toast('Full-screen exited. Please remain in full screen.', { icon: 'ℹ️' });
        logIntegritySignal(attemptId, { eventType: 'FULLSCREEN_EXIT', details: 'Candidate exited fullscreen mode' });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [attemptId, examMeta]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // ─── 4. Answer Selection & Autosave ─────────────────────────────────────
  const currentQ = questions[currentIdx] || null;
  const currentAnswer = currentQ ? (answersState[currentQ.id] || { selectedOptionKeys: [], isMarkedForReview: false }) : null;

  const handleSelectOption = async (optionKey) => {
    if (!currentQ) return;
    const qId = currentQ.id;
    let updatedKeys = [];

    if (currentQ.type === 'MULTIPLE_CHOICE') {
      const prev = currentAnswer.selectedOptionKeys || [];
      if (prev.includes(optionKey)) {
        updatedKeys = prev.filter(k => k !== optionKey);
      } else {
        updatedKeys = [...prev, optionKey];
      }
    } else {
      // Single choice
      updatedKeys = [optionKey];
    }

    const newAns = {
      ...currentAnswer,
      selectedOptionKeys: updatedKeys,
      isAnswered: updatedKeys.length > 0
    };

    setAnswersState(prev => ({ ...prev, [qId]: newAns }));
    triggerAutosave(qId, updatedKeys, newAns.isMarkedForReview);
  };

  const handleClearResponse = () => {
    if (!currentQ) return;
    const qId = currentQ.id;
    const newAns = {
      ...currentAnswer,
      selectedOptionKeys: [],
      isAnswered: false
    };
    setAnswersState(prev => ({ ...prev, [qId]: newAns }));
    triggerAutosave(qId, [], newAns.isMarkedForReview);
  };

  const handleToggleReview = () => {
    if (!currentQ) return;
    const qId = currentQ.id;
    const newAns = {
      ...currentAnswer,
      isMarkedForReview: !currentAnswer.isMarkedForReview
    };
    setAnswersState(prev => ({ ...prev, [qId]: newAns }));
    triggerAutosave(qId, newAns.selectedOptionKeys, newAns.isMarkedForReview);
  };

  const triggerAutosave = async (questionId, selectedOptionKeys, isMarkedForReview) => {
    setSavingStatus('saving');
    try {
      await autosaveAnswer(attemptId, {
        questionId,
        selectedOptionKeys,
        isMarkedForReview
      });
      setSavingStatus('saved');
    } catch (err) {
      setSavingStatus('error');
    }
  };

  // ─── 5. Final Submission & Evaluation ───────────────────────────────────
  const handleFinalSubmit = async (isAuto = false) => {
    setIsSubmitting(true);
    try {
      const res = await submitExamAttempt(attemptId, { isAuto });
      if (res?.success) {
        toast.success(isAuto ? 'Time expired. Exam submitted!' : 'Exam submitted successfully!');
        navigate(`/online-exam/result/${attemptId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
      setIsSubmitting(false);
    }
  };

  // Counts
  const totalCount = questions.length;
  const answeredCount = Object.values(answersState).filter(a => a.isAnswered).length;
  const markedReviewCount = Object.values(answersState).filter(a => a.isMarkedForReview).length;
  const unansweredCount = totalCount - answeredCount;

  // Format time (MM:SS or HH:MM:SS)
  const formatTime = (secs) => {
    if (secs === null) return '--:--';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-xs">Loading secure exam session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none">
      {/* ─── Top Distraction-Free Header Ribbon ─────────────────────────────── */}
      <header className="bg-[#172B4D] text-white px-4 sm:px-6 py-3 border-b border-[#29456D] flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#29456D] border border-[#29456D] flex items-center justify-center font-black text-white text-sm">
            MCQ
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black leading-tight max-w-md truncate">
              {examMeta?.title}
            </h1>
            <span className="text-[10px] text-[#CBD5E1] font-mono">
              {examMeta?.examCode} · {examMeta?.subject}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Autosave Status */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-[#CBD5E1]">
            {savingStatus === 'saving' && (
              <span className="text-[#DBEAFE] flex items-center gap-1">
                <RotateCcw className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
            {savingStatus === 'saved' && (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Answers Autosaved
              </span>
            )}
            {savingStatus === 'error' && (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Save pending
              </span>
            )}
          </div>

          {/* Countdown Clock */}
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-mono text-sm font-black tracking-wider ${
            remainingSeconds !== null && remainingSeconds <= 300
              ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
              : 'bg-[#29456D] border-[#29456D] text-white'
          }`}>
            <Clock className="w-4 h-4 text-[#DBEAFE]" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-[#29456D] hover:bg-[#172B4D] text-[#F3F6FC] hover:text-[#DBEAFE] border border-[#29456D] cursor-pointer transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Submit Button */}
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Exam</span>
          </button>
        </div>
      </header>

      {/* ─── Main Examination Area ──────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Question Card & Controls */}
        <div className="lg:col-span-3 flex flex-col justify-between bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          {currentQ ? (
            <div className="space-y-6">
              {/* Question Header & Points */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-indigo-900 text-white font-black text-xs">
                    Question {currentIdx + 1} of {totalCount}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-[10px]">
                    {currentQ.type === 'MULTIPLE_CHOICE' ? 'Multiple Correct' : 'Single Correct'}
                  </span>
                  {currentAnswer?.isMarkedForReview && (
                    <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                      Marked for Review
                    </span>
                  )}
                </div>

                <div className="text-right text-xs font-bold text-slate-500">
                  <span className="text-emerald-700 font-black">+{currentQ.marks} Marks</span>
                  {currentQ.negativeMarks > 0 && (
                    <span className="text-rose-600 ml-1.5 font-semibold">(-{currentQ.negativeMarks})</span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                {currentQ.questionText}
              </div>

              {/* Question Image (if any) */}
              {currentQ.questionImage && (
                <div className="max-w-md rounded-2xl overflow-hidden border border-slate-200">
                  <img src={currentQ.questionImage} alt="Question Diagram" className="w-full object-contain" />
                </div>
              )}

              {/* Options List */}
              <div className="space-y-3 pt-2">
                {currentQ.options?.map((opt) => {
                  const isSelected = currentAnswer?.selectedOptionKeys?.includes(opt.optionKey);
                  return (
                    <button
                      key={opt.optionKey}
                      type="button"
                      onClick={() => handleSelectOption(opt.optionKey)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 font-bold shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-indigo-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {opt.optionKey}
                        </span>
                        <span className="text-sm leading-normal">{opt.optionText}</span>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-indigo-700 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="font-bold text-slate-700">No questions found for this examination.</p>
              <p className="text-xs text-slate-500">Please contact your exam coordinator or return to the student portal.</p>
              <button
                type="button"
                onClick={() => navigate('/student/online-exam')}
                className="px-4 py-2 bg-indigo-900 text-white text-xs font-bold rounded-xl"
              >
                Back to Exams
              </button>
            </div>
          )}

          {/* Bottom Controls Bar */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleReview}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentAnswer?.isMarkedForReview
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 text-purple-600" />
                <span>{currentAnswer?.isMarkedForReview ? 'Unmark Review' : 'Mark for Review'}</span>
              </button>

              {currentAnswer?.isAnswered && (
                <button
                  type="button"
                  onClick={handleClearResponse}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                  currentIdx === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                disabled={currentIdx === totalCount - 1}
                onClick={() => setCurrentIdx(prev => Math.min(totalCount - 1, prev + 1))}
                className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                  currentIdx === totalCount - 1
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-900 hover:bg-indigo-950 text-white cursor-pointer shadow-xs'
                }`}
              >
                <span>Save & Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Question Palette & Status */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <h3 className="font-black text-sm text-slate-900">Question Palette</h3>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-500"></span>
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-slate-200"></span>
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-purple-600"></span>
                <span>Review ({markedReviewCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-indigo-900"></span>
                <span>Current Question</span>
              </div>
            </div>

            {/* Jump Palette Grid */}
            <div className="grid grid-cols-5 gap-2 pt-2 max-h-72 overflow-y-auto">
              {questions.map((q, idx) => {
                const ans = answersState[q.id];
                const isCurrent = idx === currentIdx;
                const isAnswered = ans?.isAnswered;
                const isReview = ans?.isMarkedForReview;

                let btnBg = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
                if (isReview) {
                  btnBg = 'bg-purple-600 text-white border-purple-700';
                } else if (isAnswered) {
                  btnBg = 'bg-emerald-600 text-white border-emerald-700';
                }

                if (isCurrent) {
                  btnBg += ' ring-2 ring-indigo-900 ring-offset-2 font-black';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 rounded-xl border text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${btnBg}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2 text-center">
            <span className="text-[11px] text-slate-400 block font-medium">Ready to complete?</span>
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Finish & Submit Exam</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── CONFIRMATION MODAL BEFORE SUBMIT ───────────────────────────────── */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-5 animate-scaleUp">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Confirm Final Submission</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to finalize your examination? Once submitted, answers cannot be modified.
              </p>
            </div>

            {/* Summary Box */}
            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Answered</span>
                <div className="text-lg font-black text-emerald-900">{answeredCount}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Unanswered</span>
                <div className="text-lg font-black text-slate-900">{unansweredCount}</div>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
                <span className="text-[10px] font-bold text-purple-700 uppercase">In Review</span>
                <div className="text-lg font-black text-purple-900">{markedReviewCount}</div>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  You still have <strong>{unansweredCount} unanswered questions</strong>. You can return to answer them or proceed with submission.
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Return to Exam
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleFinalSubmit(false)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Yes, Submit Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentExamScreen;
