import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Info,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Printer,
  ChevronRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { getAttemptResult } from '../../services/onlineExamService';

const StudentExamResultPage = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    loadResult();
  }, [attemptId]);

  const loadResult = async () => {
    setIsLoading(true);
    try {
      const res = await getAttemptResult(attemptId);
      if (res) setResultData(res);
    } catch (err) {
      toast.error('Failed to load examination result');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Embargo / Scheduled release notice
  if (resultData?.isPendingRelease) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Submission Confirmed ✓</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {resultData.message}
          </p>
          {resultData.releaseTime && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700">
              Release Date: {new Date(resultData.releaseTime).toLocaleString()}
            </div>
          )}
          <button
            onClick={() => navigate('/student/online-exam')}
            className="w-full py-2.5 bg-indigo-900 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Return to My Exams
          </button>
        </div>
      </div>
    );
  }

  const res = resultData?.data;
  if (!res) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Result Not Found</h2>
          <button
            onClick={() => navigate('/student/online-exam')}
            className="px-4 py-2 bg-indigo-900 text-white font-bold text-xs rounded-xl"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      {/* ─── Top Header Ribbon ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/student/online-exam')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Examinations</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Official Result Card</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* ─── Official Score Card ────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                {res.subject}
              </span>
              <h1 className="text-xl sm:text-2xl font-black">{res.examTitle}</h1>
              <p className="text-xs text-indigo-200 font-mono">
                Code: {res.examCode} · Attempt #{res.attemptNumber}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-4xl font-black text-amber-300">
                {res.scoreObtained}
                <span className="text-lg text-indigo-200 font-bold"> / {res.totalPossibleScore}</span>
              </div>
              <div className="flex items-center sm:justify-end gap-2 mt-1">
                <span className="text-xs font-bold text-indigo-200">{res.percentage}%</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  res.isPassed ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                }`}>
                  {res.isPassed ? 'PASSED ✓' : 'FAILED'}
                </span>
              </div>
            </div>
          </div>

          {/* Metrics Ribbon */}
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-100 text-center text-xs">
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Correct Answers</span>
              <div className="text-xl font-black text-emerald-900 mt-1">{res.correctCount}</div>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100">
              <span className="text-[10px] font-bold text-rose-700 uppercase">Incorrect</span>
              <div className="text-xl font-black text-rose-900 mt-1">{res.incorrectCount}</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Unanswered</span>
              <div className="text-xl font-black text-slate-900 mt-1">{res.unansweredCount}</div>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100">
              <span className="text-[10px] font-bold text-indigo-700 uppercase">Time Spent</span>
              <div className="text-xl font-black text-indigo-950 mt-1">
                {Math.floor(res.timeSpentSeconds / 60)}m {res.timeSpentSeconds % 60}s
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Class Standing: <strong>Rank #{res.rank}</strong> of {res.totalCandidates} candidates</span>
            <span>Passing Mark Threshold: {res.passingMarks}</span>
          </div>
        </div>

        {/* ─── Question Breakdown & Answer Key ─────────────────────────────────── */}
        {resultData.isAnswerKeyReleased ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">Question-by-Question Detailed Review</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                Answer Key & Explanations Released
              </span>
            </div>

            <div className="space-y-4">
              {res.questions?.map((q, idx) => {
                const isStudentCorrect = q.isCorrect;
                return (
                  <div
                    key={q.questionId}
                    className={`bg-white p-5 rounded-2xl border shadow-2xs space-y-3.5 ${
                      isStudentCorrect ? 'border-emerald-200' : q.isAnswered ? 'border-rose-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-slate-400">Q{idx + 1}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            isStudentCorrect ? 'bg-emerald-100 text-emerald-800' : q.isAnswered ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isStudentCorrect ? 'Correct ✓' : q.isAnswered ? 'Incorrect ✗' : 'Unattempted'}
                          </span>
                        </div>
                        <p className="font-bold text-sm text-slate-900 leading-snug">
                          {q.questionText}
                        </p>
                      </div>

                      <div className="text-right text-xs font-black">
                        <span className={q.marksAwarded > 0 ? 'text-emerald-700' : q.marksAwarded < 0 ? 'text-rose-600' : 'text-slate-400'}>
                          {q.marksAwarded > 0 ? `+${q.marksAwarded}` : q.marksAwarded} Marks
                        </span>
                      </div>
                    </div>

                    {/* Options Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options?.map((opt) => {
                        const isChosen = q.studentSelectedKeys?.includes(opt.optionKey);
                        const isCorrectOpt = q.correctKeys?.includes(opt.optionKey);

                        let optCardClass = 'bg-slate-50 border-slate-200 text-slate-700';
                        if (isCorrectOpt) {
                          optCardClass = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
                        } else if (isChosen && !isCorrectOpt) {
                          optCardClass = 'bg-rose-50 border-rose-300 text-rose-950 font-semibold';
                        }

                        return (
                          <div
                            key={opt.optionKey}
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${optCardClass}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                                isCorrectOpt
                                  ? 'bg-emerald-600 text-white'
                                  : isChosen
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}>
                                {opt.optionKey}
                              </span>
                              <span>{opt.optionText}</span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px] font-black">
                              {isChosen && <span className="text-slate-500">(Your choice)</span>}
                              {isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-1">
                        <span className="font-black text-[11px] text-amber-800 uppercase tracking-wider block">
                          Step-by-Step Explanation
                        </span>
                        <p className="leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 space-y-2">
            <Info className="w-5 h-5 text-indigo-700 mx-auto" />
            <p className="font-bold text-slate-800">Answer Key Under Embargo</p>
            <p className="max-w-md mx-auto text-slate-500">
              The detailed question-by-question answer keys and explanations will be released according to the institution's examination schedule.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentExamResultPage;
