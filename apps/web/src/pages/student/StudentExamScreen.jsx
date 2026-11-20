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
  ShieldAlert,
  ShieldCheck,
  WifiOff,
  Wifi,
  Camera,
  VideoOff,
  Lock,
  AlertOctagon,
  Eye
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

  // Security & Integrity States
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [showFsOverlay, setShowFsOverlay] = useState(false);
  const [violationsCount, setViolationsCount] = useState(0);
  const [maxAllowedViolations, setMaxAllowedViolations] = useState(3);
  const [finalWarningModal, setFinalWarningModal] = useState({ open: false, message: '' });
  const [terminatedModal, setTerminatedModal] = useState({ open: false, reason: '' });

  // Network offline queue
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const offlineQueueRef = useRef([]);

  // Live Proctoring state
  const [proctoringActive, setProctoringActive] = useState(false);
  const [cameraWarning, setCameraWarning] = useState(null);
  const proctorVideoRef = useRef(null);
  const proctorStreamRef = useRef(null);
  const proctorCanvasRef = useRef(null);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef(null);
  const proctorCheckIntervalRef = useRef(null);
  const hasMountedRef = useRef(false);

  // ─── 1. Load Attempt State ──────────────────────────────────────────────
  useEffect(() => {
    loadAttemptSession();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (proctorCheckIntervalRef.current) clearInterval(proctorCheckIntervalRef.current);
      if (proctorStreamRef.current) {
        proctorStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [attemptId]);

  const loadAttemptSession = async () => {
    setIsLoading(true);
    try {
      const res = await startExamAttempt(attemptId);
      if (res?.isCompleted || res?.data?.isCompleted || res?.data?.status === 'EVALUATED' || res?.data?.status === 'SUBMITTED' || res?.data?.status === 'AUTO_SUBMITTED') {
        toast.success('Attempt already completed. Viewing results.');
        navigate(`/online-exam/result/${attemptId}`, { replace: true });
        return;
      }
      if (res?.data) {
        const d = res.data;
        const sec = d.securitySettings || {};
        const maxV = sec.maxViolations || d.maxIntegrityViolations || 3;
        const currentV = d.integrityViolationsCount || 0;

        setExamMeta({
          attemptId: d.attemptId,
          title: d.title,
          examCode: d.examCode,
          subject: d.subject,
          deadlineTime: d.deadlineTime,
          enableIntegrityShield: d.enableIntegrityShield,
          maxIntegrityViolations: maxV,
          navigationMode: sec.navigationMode || d.navigationMode || 'FREE',
          securitySettings: sec
        });
        setMaxAllowedViolations(maxV);
        setViolationsCount(currentV);
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
        const secRemaining = Math.max(0, Math.floor((new Date(d.deadlineTime).getTime() - Date.now()) / 1000));
        setRemainingSeconds(secRemaining);

        // Check if proctoring required
        if (sec.enableLiveProctoring) {
          initWebcamProctoring();
        }

        // Fullscreen enforcement check
        if (sec.requireFullscreen !== false) {
          if (!document.fullscreenElement) {
            setShowFsOverlay(true);
          }
        }
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
      hasMountedRef.current = true;
    }
  };

  // ─── 2. Webcam Proctoring Initialization & Heuristics ───────────────────
  const initWebcamProctoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 15 },
        audio: false
      });
      proctorStreamRef.current = stream;
      if (proctorVideoRef.current) {
        proctorVideoRef.current.srcObject = stream;
      }
      setProctoringActive(true);

      // Listen for track disruptions
      stream.getVideoTracks().forEach(track => {
        track.onended = () => {
          setCameraWarning('Camera feed disconnected');
          handleViolationEvent('CAMERA_DISCONNECTED', 'Proctoring video feed stopped or camera unplugged');
        };
        track.onmute = () => {
          setCameraWarning('Camera feed muted');
          handleViolationEvent('CAMERA_MUTED', 'Proctoring camera muted');
        };
      });

      // Canvas luminance check every 10 seconds (detect covered camera / dark room)
      proctorCheckIntervalRef.current = setInterval(() => {
        if (!proctorVideoRef.current || !proctorCanvasRef.current) return;
        try {
          const video = proctorVideoRef.current;
          const canvas = proctorCanvasRef.current;
          const ctx = canvas.getContext('2d');
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = 64;
            canvas.height = 48;
            ctx.drawImage(video, 0, 0, 64, 48);
            const imgData = ctx.getImageData(0, 0, 64, 48);
            let totalBrightness = 0;
            const pixels = imgData.data.length / 4;
            for (let i = 0; i < imgData.data.length; i += 4) {
              const r = imgData.data[i];
              const g = imgData.data[i + 1];
              const b = imgData.data[i + 2];
              totalBrightness += (r + g + b) / 3;
            }
            const avgBrightness = totalBrightness / pixels;
            if (avgBrightness < 12) {
              // Extremely dark or camera covered
              setCameraWarning('Camera lens appears occluded or covered');
              handleViolationEvent('CAMERA_OCCLUSION', 'Camera lens blocked or low lighting detected');
            } else {
              setCameraWarning(null);
            }
          }
        } catch (e) {
          // ignore cross-origin canvas security quirks if any
        }
      }, 12000);
    } catch (err) {
      setCameraWarning('Failed to initialize webcam proctoring');
      handleViolationEvent('CAMERA_PERMISSION_DENIED', 'Candidate declined or blocked webcam permission');
    }
  };

  // ─── 3. Unified Violation Handler with 3-Strike Auto-Submission ─────────
  const handleViolationEvent = async (eventType, details) => {
    if (!hasMountedRef.current) return;
    try {
      const res = await logIntegritySignal(attemptId, { eventType, details });
      if (res?.violationsCount !== undefined) {
        setViolationsCount(res.violationsCount);
      }
      if (res?.maxAllowed !== undefined) {
        setMaxAllowedViolations(res.maxAllowed);
      }

      // Check if threshold breached and auto-submitted
      if (res?.autoSubmitted) {
        setTerminatedModal({
          open: true,
          reason: res?.warning || res?.message || 'Exceeded maximum integrity violation limits.'
        });
        return;
      }

      // Check if final warning
      if (res?.isFinalWarning) {
        setFinalWarningModal({
          open: true,
          message: res.warning || `Final Warning: Violation ${res.violationsCount}/${res.maxAllowed}. One more violation will terminate and submit your examination immediately.`
        });
      } else {
        toast.error(res?.warning || `Security Notice: ${eventType} recorded.`, {
          icon: '🛡️',
          duration: 4000
        });
      }
    } catch (err) {
      console.warn('Integrity signal sync failed:', err.message);
    }
  };

  // ─── 4. Strict Security Listeners (Keys, Copy, Paste, Focus, Blur) ──────
  useEffect(() => {
    if (!examMeta) return;
    const sec = examMeta.securitySettings || {};
    const strictEnabled = sec.securityMode !== 'STANDARD' || examMeta.enableIntegrityShield;

    if (!strictEnabled) return;

    // 1. Keyboard Shortcut Interceptor
    const handleKeyDown = (e) => {
      const key = e.key ? e.key.toLowerCase() : '';
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Screenshot key combos
      if (e.key === 'PrintScreen' || (isCtrlOrMeta && e.key === 'PrintScreen') || (e.altKey && e.key === 'PrintScreen')) {
        e.preventDefault();
        e.stopPropagation();
        handleViolationEvent('SCREENSHOT_ATTEMPT', 'PrintScreen key pressed');
        return false;
      }

      // DevTools combinations
      if (e.key === 'F12' || (isCtrlOrMeta && e.shiftKey && ['i', 'j', 'c'].includes(key))) {
        e.preventDefault();
        e.stopPropagation();
        handleViolationEvent('DEVTOOLS_BLOCKED', `Developer tools shortcut intercepted: ${e.key}`);
        return false;
      }

      // Print, Save, View Source, Copy, Paste, Cut
      if (isCtrlOrMeta) {
        if (['p', 's', 'u'].includes(key)) {
          e.preventDefault();
          e.stopPropagation();
          handleViolationEvent('SHORTCUT_BLOCKED', `Shortcut Ctrl+${key.toUpperCase()} blocked`);
          return false;
        }

        if (sec.restrictCopyPaste !== false) {
          if (['c', 'x', 'v', 'a'].includes(key)) {
            e.preventDefault();
            e.stopPropagation();
            const action = key === 'c' ? 'Copy' : key === 'v' ? 'Paste' : key === 'x' ? 'Cut' : 'Select All';
            toast.error(`${action} is disabled during the examination.`);
            handleViolationEvent(`${action.toUpperCase().replace(' ', '_')}_ATTEMPT`, `Candidate attempted shortcut: ${action}`);
            return false;
          }
        }
      }
    };

    // 2. Right-Click Context Menu Blocking
    const handleContextMenu = (e) => {
      e.preventDefault();
      toast.error('Right-click context menu is disabled.');
      handleViolationEvent('RIGHT_CLICK_BLOCKED', 'Candidate right-clicked on exam screen');
      return false;
    };

    // 3. Selection, Drag & Clipboard DOM events
    const handleCopy = (e) => {
      e.preventDefault();
      toast.error('Copying exam content is forbidden.');
      handleViolationEvent('COPY_ATTEMPT', 'Clipboard copy event intercepted');
    };
    const handlePaste = (e) => {
      e.preventDefault();
      toast.error('Pasting external text is forbidden.');
      handleViolationEvent('PASTE_ATTEMPT', 'Clipboard paste event intercepted');
    };
    const handleSelectStart = (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };
    const handleDragStart = (e) => {
      e.preventDefault();
    };

    // 4. Tab Visibility & Window Blur Monitoring
    const handleVisibilityChange = () => {
      if (document.hidden && sec.monitorTabSwitch !== false) {
        handleViolationEvent('TAB_SWITCH', 'Switched away from examination tab');
      }
    };

    const handleWindowBlur = () => {
      if (sec.monitorTabSwitch !== false && !document.fullscreenElement) {
        handleViolationEvent('WINDOW_BLUR', 'Focus lost: Switched to external application or window');
      }
    };

    // 5. Fullscreen Change Monitor
    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
      if (!isFs && sec.requireFullscreen !== false) {
        setShowFsOverlay(true);
        handleViolationEvent('FULLSCREEN_EXIT', 'Exited fullscreen examination mode');
      } else {
        setShowFsOverlay(false);
      }
    };

    // 6. Accidental Navigation & Refresh Prevention
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'You have an active examination in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    // Attach listeners
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('selectstart', handleSelectStart);
    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('selectstart', handleSelectStart);
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [examMeta, attemptId]);

  // ─── 5. Offline & Network Interruption Sync ─────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      toast.success('Internet connection restored. Synchronizing answers...', { icon: '🟢' });
      // Flush offline queue
      if (offlineQueueRef.current.length > 0) {
        const queueToFlush = [...offlineQueueRef.current];
        offlineQueueRef.current = [];
        try {
          for (const item of queueToFlush) {
            await autosaveAnswer(attemptId, item);
          }
          setSavingStatus('saved');
          toast.success('All pending offline responses successfully saved.');
        } catch (err) {
          toast.error('Error synchronizing queued answers. Retrying...');
          offlineQueueRef.current = queueToFlush;
        }
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast.error('Network disconnected! Offline protection active: your answers will queue locally.', {
        icon: '⚠️',
        duration: 6000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [attemptId]);

  // ─── 6. Fullscreen Recovery Action ──────────────────────────────────────
  const requestFullscreenLock = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          setIsFullscreen(true);
          setShowFsOverlay(false);
        }).catch(() => {
          // If browser blocked gesture, show notice
          toast.error('Please allow fullscreen in your browser.');
        });
      } else {
        setShowFsOverlay(false);
      }
    } catch (e) {
      setShowFsOverlay(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
      setShowFsOverlay(false);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // ─── 7. Authoritative Countdown Clock ───────────────────────────────────
  useEffect(() => {
    if (remainingSeconds === null) return;

    if (remainingSeconds <= 0) {
      handleFinalSubmit(true);
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

  // ─── 8. Answer Selection & Autosave Queue ───────────────────────────────
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
    const payload = { questionId, selectedOptionKeys, isMarkedForReview };

    if (!navigator.onLine) {
      // Offline queue
      offlineQueueRef.current = offlineQueueRef.current.filter(i => i.questionId !== questionId);
      offlineQueueRef.current.push(payload);
      setSavingStatus('offline_queued');
      return;
    }

    setSavingStatus('saving');
    try {
      await autosaveAnswer(attemptId, payload);
      setSavingStatus('saved');
    } catch (err) {
      // On network failure, buffer into offline queue
      offlineQueueRef.current = offlineQueueRef.current.filter(i => i.questionId !== questionId);
      offlineQueueRef.current.push(payload);
      setSavingStatus('error');
    }
  };

  // ─── 9. Final Submission & Evaluation ───────────────────────────────────
  const handleFinalSubmit = async (isAuto = false) => {
    setIsSubmitting(true);
    try {
      const res = await submitExamAttempt(attemptId, { isAuto });
      if (res?.success) {
        toast.success(isAuto ? 'Time expired. Exam submitted!' : 'Exam submitted successfully!');
        navigate(`/online-exam/result/${attemptId}`, { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
      setIsSubmitting(false);
    }
  };

  // Forward-only navigation restriction helper
  const isForwardOnly = examMeta?.navigationMode === 'FORWARD_ONLY';

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
          <p className="font-bold text-xs tracking-wide">Initializing secure exam mode...</p>
        </div>
      </div>
    );
  }

  const isStrictShield = examMeta?.securitySettings?.securityMode !== 'STANDARD';

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans select-none text-[#1F2937] relative">
      {/* Hidden canvas for webcam luminance processing */}
      <canvas ref={proctorCanvasRef} className="hidden" />

      {/* ─── Top Offline Interruption Banner ─────────────────────────────────── */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between z-30 shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-slate-950 animate-pulse" />
            <span>Connection Interrupted: Offline Protection Active. All answers are buffered locally and will sync once internet restores.</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded bg-amber-600 text-white">
            {offlineQueueRef.current.length} Pending
          </span>
        </div>
      )}

      {/* ─── Top Distraction-Free Header Ribbon ─────────────────────────────── */}
      <header className="bg-white text-[#1F2937] px-4 sm:px-6 py-3 border-b border-[#E4E2DA] flex items-center justify-between sticky top-0 z-20 shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent)]/30 flex items-center justify-center font-black text-[var(--accent)] text-sm">
            MCQ
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black leading-tight max-w-md truncate text-[#1F2937]">
              {examMeta?.title}
            </h1>
            <span className="text-[10px] text-[#5B6676] font-mono">
              {examMeta?.examCode} · {examMeta?.subject}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Security & Violation Shield Badge */}
          {isStrictShield && (
            <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs font-black transition-all ${
              violationsCount >= (maxAllowedViolations - 1)
                ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                : violationsCount > 0
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Violations:</span>
              <span>{violationsCount} / {maxAllowedViolations}</span>
            </div>
          )}

          {/* Autosave Status */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold text-[#5B6676]">
            {savingStatus === 'saving' && (
              <span className="text-[var(--accent)] flex items-center gap-1">
                <RotateCcw className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
            {savingStatus === 'saved' && (
              <span className="text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Answers Autosaved
              </span>
            )}
            {savingStatus === 'offline_queued' && (
              <span className="text-amber-600 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Queued locally
              </span>
            )}
            {savingStatus === 'error' && (
              <span className="text-rose-600 flex items-center gap-1">
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-xl bg-indigo-900 text-white font-black text-xs">
                    Question {currentIdx + 1} of {totalCount}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-[10px]">
                    {currentQ.type === 'MULTIPLE_CHOICE' ? 'Multiple Correct' : 'Single Correct'}
                  </span>
                  {isForwardOnly && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Forward Only
                    </span>
                  )}
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
              <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed select-none">
                {currentQ.questionText}
              </div>

              {/* Question Image (if any) */}
              {currentQ.questionImage && (
                <div className="max-w-md rounded-2xl overflow-hidden border border-slate-200 pointer-events-none select-none">
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
                      className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between select-none ${
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
              {!isForwardOnly && (
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
              )}

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
                const isLockedPast = isForwardOnly && idx < currentIdx;

                let btnBg = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
                if (isReview) {
                  btnBg = 'bg-purple-600 text-white border-purple-700';
                } else if (isAnswered) {
                  btnBg = 'bg-emerald-600 text-white border-emerald-700';
                }

                if (isCurrent) {
                  btnBg += ' ring-2 ring-indigo-900 ring-offset-2 font-black';
                }

                if (isLockedPast) {
                  btnBg = 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300 opacity-60';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={isLockedPast}
                    onClick={() => {
                      if (!isLockedPast) setCurrentIdx(idx);
                    }}
                    className={`h-9 rounded-xl border text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${btnBg}`}
                    title={isLockedPast ? 'Backward navigation locked' : `Go to question ${idx + 1}`}
                  >
                    {isLockedPast ? <Lock className="w-3 h-3 text-slate-400" /> : (idx + 1)}
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

      {/* ─── LIVE WEBCAM PROCTORING FLOATING CORNER TILE ─────────────────────── */}
      {examMeta?.securitySettings?.enableLiveProctoring && (
        <div className="fixed bottom-4 right-4 z-40 bg-slate-900 rounded-2xl border-2 border-purple-500 shadow-2xl p-2 w-48 space-y-1.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-[10px] text-purple-300 font-bold px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Proctored Feed</span>
            </span>
            <Camera className="w-3.5 h-3.5 text-purple-400" />
          </div>

          <div className="w-full h-32 bg-black rounded-xl overflow-hidden relative">
            <video
              ref={proctorVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${proctoringActive ? 'block' : 'hidden'}`}
            />
            {!proctoringActive && (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-1 p-2 text-center">
                <VideoOff className="w-6 h-6 text-rose-500" />
                <span className="text-[9px]">Camera disconnected</span>
              </div>
            )}
          </div>

          {cameraWarning && (
            <div className="text-[9px] text-amber-300 font-bold truncate px-1">
              ⚠️ {cameraWarning}
            </div>
          )}
        </div>
      )}

      {/* ─── FULLSCREEN LOCKOUT OVERLAY ─────────────────────────────────────── */}
      {showFsOverlay && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-rose-300 shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-scaleUp">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Maximize2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Full-Screen Mode Required</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Examination security policy mandates that you remain in full-screen mode throughout this assessment. All exits and window blur actions are recorded in the security audit log.
            </p>
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900">
              Integrity Violations: {violationsCount} of {maxAllowedViolations} maximum allowed
            </div>
            <button
              type="button"
              onClick={requestFullscreenLock}
              className="w-full py-3.5 bg-indigo-900 hover:bg-indigo-950 text-white font-black text-xs rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4 text-amber-400" />
              <span>Return to Full-Screen Mode</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── FINAL WARNING MODAL (STRIKE 2) ─────────────────────────────────── */}
      {finalWarningModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-rose-600 shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-bounce">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-rose-700 uppercase tracking-wide">Final Warning</h3>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {finalWarningModal.message}
            </p>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs font-bold text-rose-900">
              Warning Count: {violationsCount} of {maxAllowedViolations} Strikes. One more violation will terminate the exam.
            </div>
            <button
              type="button"
              onClick={() => setFinalWarningModal({ open: false, message: '' })}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-2xl shadow-md cursor-pointer"
            >
              I Understand & Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* ─── TERMINATION MODAL (AUTO-SUBMISSION ON THRESHOLD REACHED) ───────── */}
      {terminatedModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-rose-600 shadow-2xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-rose-700">Examination Terminated</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {terminatedModal.reason}
            </p>
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-left text-[11px] text-rose-950 space-y-1">
              <div><strong>Status:</strong> Automatically Submitted</div>
              <div><strong>Audit Flag:</strong> Marked for Administrative Review</div>
              <div><strong>Violations Exceeded:</strong> {violationsCount} / {maxAllowedViolations}</div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/online-exam/result/${attemptId}`, { replace: true })}
              className="w-full py-3.5 bg-indigo-900 hover:bg-indigo-950 text-white font-black text-xs rounded-2xl shadow-lg cursor-pointer"
            >
              View Examination Record
            </button>
          </div>
        </div>
      )}

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
