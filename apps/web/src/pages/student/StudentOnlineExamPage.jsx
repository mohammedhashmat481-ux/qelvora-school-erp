import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  MonitorPlay,
  Clock,
  Calendar,
  Award,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Eye,
  ShieldCheck,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  LayoutDashboard
} from 'lucide-react';
import { getMyExams } from '../../services/onlineExamService';

const StudentOnlineExamPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState(null);
  const [exams, setExams] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, AVAILABLE, UPCOMING, COMPLETED

  useEffect(() => {
    loadStudentExams();
  }, []);

  const loadStudentExams = async () => {
    setIsLoading(true);
    try {
      const res = await getMyExams();
      if (res?.data) {
        setExams(res.data);
        if (res.student) setStudentInfo(res.student);
      }
    } catch (err) {
      toast.error('Failed to load your examinations');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredExams = exams.filter(e => {
    if (activeFilter === 'AVAILABLE') return e.isLive && e.studentStatus !== 'COMPLETED';
    if (activeFilter === 'UPCOMING') return e.isFuture;
    if (activeFilter === 'COMPLETED') return e.studentStatus === 'COMPLETED' || e.attemptsCount > 0;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      {/* ─── Hero Header ────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-800/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
                <MonitorPlay className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight">Online MCQ Examination Portal</h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
                    Live
                  </span>
                </div>
                <p className="text-xs text-indigo-200 mt-1">
                  Candidate: <strong className="text-white">{studentInfo?.name || user?.name}</strong> · Standard: <span className="font-bold text-amber-300">{studentInfo?.standard || '10th'} ({studentInfo?.section || 'A'})</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate(user?.role === 'student' ? '/student/profile' : '/dashboard')}
                className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Return to Main Menu / Dashboard"
              >
                <LayoutDashboard className="w-4 h-4 text-amber-300" />
                <span>Main Menu</span>
              </button>
              <button
                onClick={() => navigate('/examination')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/10 transition-all flex items-center gap-1.5 w-max cursor-pointer"
              >
                <span>Offline Term Marks Cards</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-4 space-y-6">
        {/* ─── Filter Pills Bar ───────────────────────────────────────────────── */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'ALL', label: 'All Exams', count: exams.length },
            { id: 'AVAILABLE', label: 'Active & Available Now', count: exams.filter(e => e.isLive && e.studentStatus !== 'COMPLETED').length },
            { id: 'UPCOMING', label: 'Upcoming Scheduled', count: exams.filter(e => e.isFuture).length },
            { id: 'COMPLETED', label: 'Completed & Evaluated', count: exams.filter(e => e.studentStatus === 'COMPLETED' || e.attemptsCount > 0).length }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-indigo-900 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{f.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeFilter === f.id ? 'bg-white/20 text-white font-black' : 'bg-slate-200 text-slate-700'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* ─── Exams List ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="font-bold text-xs">Loading assigned examinations...</p>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
              <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-sm">No examinations found in this view</p>
              <p className="text-[11px] mt-0.5">Check back later or view All Exams</p>
            </div>
          ) : (
            filteredExams.map(exam => {
              const isAvailable = exam.isLive && exam.studentStatus !== 'COMPLETED';
              const isFinished = exam.studentStatus === 'COMPLETED' || (exam.latestAttemptStatus === 'EVALUATED');
              const isInProgress = exam.studentStatus === 'IN_PROGRESS';

              return (
                <div
                  key={exam.id}
                  className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-indigo-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-black text-[10px] border border-indigo-200 uppercase">
                        {exam.subject}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 font-semibold">
                        {exam.examCode}
                      </span>
                      {isAvailable && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          <span>Active Now</span>
                        </span>
                      )}
                      {exam.isFuture && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                          Upcoming
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-black text-slate-900 leading-snug">
                      {exam.title}
                    </h2>

                    {exam.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {exam.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 pt-1">
                      <span className="flex items-center gap-1 text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{exam.durationMinutes} Minutes</span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-700">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        <span>{exam.questionsCount} Questions · {exam.totalMarks} Marks</span>
                      </span>
                      {exam.negativeMarking && (
                        <span className="text-rose-600 font-bold text-[11px]">
                          Negative Marking (-{exam.negativeMarkValue})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left md:text-right text-[11px] text-slate-400">
                      <div>Deadline: {new Date(exam.endDateTime).toLocaleDateString()} {new Date(exam.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-slate-500 font-medium">Attempts Taken: {exam.attemptsCount} / {exam.maxAttempts}</div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {isInProgress && (
                        <button
                          onClick={() => navigate(`/online-exam/take/${exam.latestAttemptId}`)}
                          className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm animate-pulse cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Resume Attempt</span>
                        </button>
                      )}

                      {isAvailable && !isInProgress && (
                        <button
                          onClick={() => navigate(`/online-exam/lobby/${exam.id}`)}
                          className="w-full sm:w-auto px-5 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95 transition-all"
                        >
                          <Play className="w-4 h-4 text-amber-400" />
                          <span>Enter Exam Lobby</span>
                        </button>
                      )}

                      {exam.latestAttemptId && (isFinished || exam.latestAttemptStatus === 'EVALUATED') && (
                        <button
                          onClick={() => navigate(`/online-exam/result/${exam.latestAttemptId}`)}
                          className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                          <Eye className="w-4 h-4 text-indigo-700" />
                          <span>View Evaluation & Score</span>
                        </button>
                      )}

                      {exam.isFuture && (
                        <span className="px-4 py-2 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs">
                          Opens Soon
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentOnlineExamPage;
