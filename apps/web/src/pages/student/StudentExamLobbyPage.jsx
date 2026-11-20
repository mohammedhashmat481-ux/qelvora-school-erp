import React, { useState, useEffect, useRef } from 'react';
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
  ShieldCheck,
  Camera,
  VideoOff,
  Info,
  Check,
  Lock,
  Eye,
  Maximize2
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

  // Live Proctoring Pre-flight camera test
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    loadLobby();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
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

  const handleTestCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      toast.success('Camera device verified successfully!');
    } catch (err) {
      setCameraError('Unable to access webcam. Please verify camera permissions in your browser.');
      toast.error('Camera access failed. Check browser permissions.');
    }
  };

  const handleStartExam = async () => {
    if (!acknowledged) {
      return toast.error('Please read and acknowledge the examination rules and instructions.');
    }

    const secSettings = examData?.securitySettings || {};
    if (secSettings.enableLiveProctoring && !cameraActive) {
      return toast.error('Please verify your webcam before starting this proctored examination.');
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
        toast.success('Examination started! Fullscreen security shield active.');
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

  const sec = examData.securitySettings || {};
  const isStrict = sec.securityMode === 'STRICT' || examData.enableIntegrityShield;
  const isProctored = sec.securityMode === 'PROCTORED' || sec.enableLiveProctoring;

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                  {examData.subject}
                </span>
                <span className="text-[11px] font-mono text-indigo-200 font-semibold">
                  {examData.examCode}
                </span>
              </div>

              {/* Security Shield Badge */}
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                isProctored
                  ? 'bg-purple-500 text-white shadow-sm'
                  : isStrict
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-emerald-600 text-white'
              }`}>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{isProctored ? 'Proctored Mode' : isStrict ? 'Strict Mode Active' : 'Standard Mode'}</span>
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

            {/* STRICT ANTI-CHEATING SECURITY PROTOCOL CARD */}
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3">
              <div className="flex items-center gap-2 font-black text-rose-950 text-sm">
                <ShieldAlert className="w-4.5 h-4.5 text-rose-600" />
                <span>Anti-Cheating & Security Shield Protocol</span>
              </div>
              <div className="space-y-2 text-rose-950 text-[11px] font-medium leading-relaxed">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-rose-100">
                    <Maximize2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span><strong>Fullscreen Mode:</strong> Mandatory. Exiting fullscreen triggers immediate integrity logging.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-rose-100">
                    <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span><strong>Restrictions:</strong> Copy, paste, right-click, text selection & print shortcuts are strictly blocked.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-rose-100">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span><strong>Tab Switching Policy:</strong> Switching tabs or windows triggers warnings. Exceeding <strong>{sec.maxViolations || examData.maxIntegrityViolations || 3} violations</strong> automatically submits the exam!</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-rose-100">
                    <Clock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span><strong>Server Clock:</strong> Authoritative timer. The countdown will not stop if you reload or lose connection.</span>
                  </div>
                </div>

                {sec.navigationMode === 'FORWARD_ONLY' && (
                  <div className="p-2.5 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-950 font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Notice: Forward-only navigation is enforced. You cannot revisit previous questions once answered or skipped.</span>
                  </div>
                )}
              </div>
            </div>

            {/* LIVE WEBCAM PROCTORING DEVICE TEST (IF ENABLED) */}
            {isProctored && (
              <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-purple-950 text-sm">
                    <Camera className="w-4 h-4 text-purple-700" />
                    <span>Webcam Proctoring Device Check</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    cameraActive ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {cameraActive ? 'Camera Verified' : 'Camera Required'}
                  </span>
                </div>

                <p className="text-[11px] text-purple-900 leading-relaxed font-medium">
                  This examination requires active camera proctoring. Your video stream will be analyzed on-device to confirm candidate presence. No video recordings are stored without institutional policy disclosure.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                  <div className="w-36 h-28 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-purple-300 relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                    />
                    {!cameraActive && (
                      <div className="text-center p-2 text-slate-400">
                        <VideoOff className="w-6 h-6 mx-auto mb-1 text-slate-500" />
                        <span className="text-[10px]">Preview Inactive</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <button
                      type="button"
                      onClick={handleTestCamera}
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 mx-auto sm:mx-0"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{cameraActive ? 'Re-test Webcam' : 'Allow & Test Webcam'}</span>
                    </button>
                    {cameraError && (
                      <p className="text-[10px] text-rose-600 font-bold">{cameraError}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Acknowledgment Checkbox */}
            <label className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-indigo-900 border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-700 font-medium leading-relaxed">
                I have read and agree to comply with all examination rules, instructions, and anti-cheating protocols. I confirm that I will remain in fullscreen, will not switch tabs or use external resources, and am ready to start my timer.
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
                <span>{isStarting ? 'Entering Secure Exam Mode...' : 'Start Examination Now'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentExamLobbyPage;
