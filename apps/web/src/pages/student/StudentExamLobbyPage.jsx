import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  MonitorPlay,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle2,
  Play,
  ArrowLeft,
  ShieldAlert,
  Info,
  Check
} from 'lucide-react';
import { getExamLobby, startExamAttempt } from '../../services/onlineExamService';

const StudentExamLobbyPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [examData, setExamData] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    loadLobby();
  }, [examId]);

  const loadLobby = async () => {
    setIsLoading(true);
    try {
      const res = await getExamLobby(examId);
      if (res?.data) {
        setExamData(res.data);
        if (res.data.isCompleted && res.data.completedAttemptId) {
          toast.success('You have completed this examination. Viewing results.');
          navigate(`/online-exam/result/${res.data.completedAttemptId}`, { replace: true });
          return;
        }
        if (res.data.hasActiveAttempt && res.data.activeAttemptId) {
          // If active attempt already exists, direct prompt to resume
          toast.success('Resuming your active examination attempt...');
          navigate(`/online-exam/take/${res.data.activeAttemptId}`);
          return;
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load examination lobby');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartExam = async () => {
    if (!acknowledged) {
      return toast.error('Please read and acknowledge the examination rules and instructions.');
    }
    setIsStarting(true);
    try {
      const res = await startExamAttempt(examId);
      if (res?.isCompleted || res?.data?.isCompleted) {
        const attId = res?.attemptId || res?.data?.attemptId || res?.data?.completedAttemptId;
        toast.success('Examination already completed. Viewing results.');
        navigate(`/online-exam/result/${attId}`, { replace: true });
        return;
      }
      if (res?.data?.attemptId) {
        toast.success('Examination started! Timer is now active.');
        navigate(`/online-exam/take/${res.data.attemptId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!examData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Examination Not Available</h2>
          <p className="text-xs text-slate-500">This examination is either closed, unassigned, or cannot be accessed right now.</p>
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
    <div className="min-h-screen bg-slate-100/70 font-sans py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/student/online-exam')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Examinations</span>
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 p-6 text-white space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                {examData.subject}
              </span>
              <span className="text-[11px] font-mono text-indigo-200 font-semibold">
                {examData.examCode}
              </span>
            </div>
            <h1 className="text-xl font-black">{examData.title}</h1>
            <p className="text-xs text-indigo-200">
              Candidate: <strong className="text-white">{examData.student?.name}</strong> (Standard: {examData.student?.standard}-{examData.student?.section})
            </p>
          </div>

          <div className="p-6 space-y-6 text-xs">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Duration</span>
                <div className="text-base font-black text-slate-900 mt-0.5">{examData.durationMinutes} mins</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Marks</span>
                <div className="text-base font-black text-slate-900 mt-0.5">{examData.totalMarks}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Passing Marks</span>
                <div className="text-base font-black text-emerald-600 mt-0.5">{examData.passingMarks}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Questions</span>
                <div className="text-base font-black text-indigo-600 mt-0.5">{examData.questionsCount}</div>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
              <div className="flex items-center gap-2 font-black text-indigo-950 text-sm">
                <Info className="w-4 h-4 text-indigo-700" />
                <span>Examination Instructions</span>
              </div>
              <div className="text-[11px] text-indigo-950 whitespace-pre-line leading-relaxed font-medium">
                {examData.instructions}
              </div>
            </div>

            {/* Proctoring Rules */}
            <div className="space-y-2.5">
              <span className="font-bold text-slate-900 block text-sm">Rules & Integrity Shield Guidelines</span>
              <ul className="space-y-2 text-slate-600 text-[11px] list-disc list-inside">
                <li>The server clock is authoritative. Once started, the timer cannot be paused.</li>
                {examData.negativeMarking ? (
                  <li className="text-rose-700 font-bold">
                    Negative marking is active: Each incorrect answer will deduct {examData.negativeMarkValue} marks. Unanswered questions carry 0 penalty.
                  </li>
                ) : (
                  <li>No negative marking is active for this examination.</li>
                )}
                <li>Each response is autosaved immediately upon selection.</li>
                <li>You can mark questions for review and jump to any question using the Question Palette.</li>
                <li>Do not switch tabs, minimize the browser, or exit fullscreen. All signals are recorded.</li>
                <li>When the remaining time reaches 00:00, your answers will be automatically submitted and evaluated.</li>
              </ul>
            </div>

            {/* Acknowledgment Checkbox */}
            <label className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-indigo-900 border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-700 font-medium leading-relaxed">
                I have read all instructions and agree to abide by the institution's examination code of conduct. I confirm that I am ready to start my timer now.
              </span>
            </label>

            {/* Start Button */}
            <div className="pt-2">
              <button
                onClick={handleStartExam}
                disabled={!acknowledged || isStarting}
                className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                  acknowledged && !isStarting
                    ? 'bg-indigo-900 hover:bg-indigo-950 active:scale-[0.99] text-white shadow-indigo-200'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4 text-amber-400" />
                <span>{isStarting ? 'Starting Attempt...' : 'Start Examination Now'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentExamLobbyPage;
