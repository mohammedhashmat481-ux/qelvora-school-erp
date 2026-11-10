import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/ui/Sidebar';
import { useAuth } from '../context/AuthContext';
import AiAssistantSettingsTab from '../components/admin/AiAssistantSettingsTab';
import {
  sendMessageToAi,
  speakUtterance,
  speakSentenceQueue,
  stopSpeech,
  isSpeaking,
  createSpeechRecognition
} from '../services/aiAssistantService';
import toast from 'react-hot-toast';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Square,
  Bot,
  User,
  Users,
  Calendar,
  IndianRupee,
  Award,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  RotateCcw,
  FileText,
  Sliders,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';

const QUICK_ACTIONS = [
  { label: "Daily Operations Report", icon: FileText, desc: "Executive audit of attendance, fees & operations", accent: "indigo" },
  { label: "Teachers absent today", icon: Users, desc: "Check faculty attendance & substitutes", accent: "emerald" },
  { label: "Students absent today", icon: Calendar, desc: "Class-wise or school-wide absenteeism", accent: "blue" },
  { label: "Who has pending fees?", icon: IndianRupee, desc: "Audited fee defaulter ledger & collections", accent: "amber" },
  { label: "Today's timetable", icon: Layers, desc: "Class & faculty period schedules", accent: "cyan" },
  { label: "Upcoming exams", icon: Award, desc: "Term dates and examination syllabus", accent: "purple" }
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' }
];

export default function AiAssistPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Role validation: check if Principal or Admin
  const userRoleLower = user?.role?.toLowerCase() || '';
  const isPrincipalOrAdmin =
    userRoleLower.includes('admin') ||
    userRoleLower === 'principal' ||
    Boolean(user?.isAdmin);

  // Active View: 'chat' | 'settings' (Admin/Principal only)
  const [activeView, setActiveView] = useState('chat');

  const [replyMode, setReplyMode] = useState(() => {
    return localStorage.getItem('qelvora_ai_reply_mode') || 'voice_and_text';
  });

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('qelvora_ai_language') || 'en';
  });

  const [isMuted, setIsMuted] = useState(false);
  const [orbState, setOrbState] = useState('idle');
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null);
  const [activeTier, setActiveTier] = useState('free');

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Welcome to the Qelvora School AI Assistant. I can check student and faculty attendance, period timetables, fee collections, exam schedules, and generate complete Daily Operations Reports for the Principal. You can speak or type your inquiry below.",
      spokenText: "Welcome to the Qelvora School AI Assistant. I can check attendance, fee defaulters, timetables, and generate official daily operations reports.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const recognitionRef = useRef(null);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('qelvora_ai_reply_mode', replyMode);
  }, [replyMode]);

  useEffect(() => {
    localStorage.setItem('qelvora_ai_language', language);
  }, [language]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, orbState]);

  useEffect(() => {
    return () => {
      stopSpeech();
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      setOrbState('idle');
      return;
    }

    stopSpeech();
    setOrbState('listening');

    const recognition = createSpeechRecognition(language, {
      onStart: () => {
        setIsListening(true);
        setOrbState('listening');
      },
      onResult: ({ finalTranscript, interimTranscript }) => {
        const transcript = finalTranscript || interimTranscript;
        if (transcript) setInputText(transcript);
        if (finalTranscript) {
          setIsListening(false);
          handleSendQuery(finalTranscript, 'voice_input');
        }
      },
      onError: () => {
        setIsListening(false);
        setOrbState('idle');
        toast.error('Voice input ended. You can type or click the microphone to try again.');
      },
      onEnd: () => {
        setIsListening(false);
        if (orbState === 'listening') setOrbState('idle');
      }
    });

    if (!recognition) {
      toast.error('Speech recognition is not supported in this browser. Please use the text input box.');
      setOrbState('idle');
      return;
    }

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setOrbState('idle');
    }
  };

  const handleSendQuery = async (queryText, inputSource = 'text_input') => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend) return;

    stopSpeech();
    const effectiveReplyMode = inputSource === 'text_input' && replyMode === 'voice_and_text' 
      ? 'voice_and_text' 
      : replyMode;

    const userMsgId = `user-${Date.now()}`;
    const userMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setOrbState('thinking');

    try {
      const history = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const response = await sendMessageToAi({
        message: textToSend,
        language,
        replyMode: effectiveReplyMode,
        conversationHistory: history
      });

      const aiMsgId = `ai-${Date.now()}`;
      const aiMessage = {
        id: aiMsgId,
        sender: 'ai',
        text: response.displayText || response.answerText,
        spokenText: response.answerText,
        sentences: response.sentences || [response.answerText],
        data: response.data || null,
        quotaExceeded: response.quotaExceeded,
        limitReached: response.limitReached,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMessage]);
      if (response.tier) {
        setActiveTier(response.tier);
      }

      const shouldSpeak = !isMuted && (effectiveReplyMode === 'voice_only' || effectiveReplyMode === 'voice_and_text');

      if (shouldSpeak && response.answerText) {
        setOrbState('speaking');
        setCurrentlySpeakingId(aiMsgId);
        speakSentenceQueue(response.sentences || [response.answerText], language, {
          onSentenceStart: () => setOrbState('speaking'),
          onAllComplete: () => {
            setOrbState('idle');
            setCurrentlySpeakingId(null);
          },
          onError: () => {
            setOrbState('idle');
            setCurrentlySpeakingId(null);
          },
          pauseMs: response.tier === 'premium' ? 240 : 120
        });
      } else {
        setOrbState('idle');
      }
    } catch {
      const errMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: "Database inquiry failed. Please verify network connectivity or check parameters.",
        spokenText: "I encountered an issue accessing school records. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMessage]);
      setOrbState('idle');
    }
  };

  const stopAllSpeech = () => {
    stopSpeech();
    setOrbState('idle');
    setCurrentlySpeakingId(null);
  };

  const replayAudio = (msg) => {
    if (!msg.spokenText) return;
    stopSpeech();
    setOrbState('speaking');
    setCurrentlySpeakingId(msg.id);
    speakUtterance(msg.spokenText, language, {
      onStart: () => setOrbState('speaking'),
      onEnd: () => {
        setOrbState('idle');
        setCurrentlySpeakingId(null);
      },
      onError: () => {
        setOrbState('idle');
        setCurrentlySpeakingId(null);
      }
    });
  };

  return (
    <div className="h-screen overflow-hidden bg-[var(--bg,#F8F7F3)] text-[#1F2937] flex flex-col lg:flex-row font-sans">
      <Sidebar />

      <div className="flex-1 bg-[var(--bg,#F8F7F3)] p-3 sm:p-5 lg:p-7 overflow-y-auto flex flex-col">
        {/* Top Header */}
        <header className="mb-5 pb-4 border-b border-[#E4E2DA] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#172B4D] text-white flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#172B4D] tracking-tight">AI Assistant</h1>
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                  activeTier === 'premium' ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs' : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {activeTier === 'premium' ? '⚡ Gemini 3.5 Flash' : 'Free Tier'}
                </span>
              </div>
              <p className="text-xs text-[#5B6676] font-medium mt-0.5">
                School-wide conversational intelligence connected to daily reports, attendance, fees, schedules, and operations
              </p>
            </div>
          </div>

          {/* Controls: View Switcher (Admin/Principal), Mode, Language, Mute */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Admin View Switcher */}
            {isPrincipalOrAdmin && (
              <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveView('chat')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeView === 'chat' ? 'bg-[#172B4D] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Assistant Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveView('settings'); stopAllSpeech(); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeView === 'settings' ? 'bg-[#172B4D] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>AI Settings & Usage</span>
                </button>
              </div>
            )}

            {activeView === 'chat' && (
              <>
                {/* Mode Selector */}
                <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => { setReplyMode('voice_only'); stopAllSpeech(); }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      replyMode === 'voice_only' ? 'bg-[#172B4D] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Voice Only
                  </button>
                  <button
                    type="button"
                    onClick={() => { setReplyMode('text_only'); stopAllSpeech(); }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      replyMode === 'text_only' ? 'bg-[#172B4D] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Text Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyMode('voice_and_text')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      replyMode === 'voice_and_text' ? 'bg-[#172B4D] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Voice + Text
                  </button>
                </div>

                {/* Language Selector */}
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-white text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 shadow-2xs outline-none cursor-pointer"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>

                {/* Mute Button */}
                <button
                  type="button"
                  onClick={() => { setIsMuted(!isMuted); if (!isMuted) stopAllSpeech(); }}
                  className={`p-2 rounded-xl border border-slate-200 transition-colors shadow-2xs ${
                    isMuted ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
        </header>

        {/* ── VIEW 1: SETTINGS & USAGE CONFIGURATION (TRANSFERRED FROM ADMIN PANEL) ── */}
        {activeView === 'settings' && isPrincipalOrAdmin ? (
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 overflow-y-auto max-w-5xl w-full mx-auto animate-fadeIn">
            <div className="mb-4 pb-3 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-[#172B4D]">AI Assistant Configuration & Dynamic Tier Usage</h2>
                <p className="text-xs text-slate-500">Configure LLM models, voice synthesis, daily limits, and view real-time token audit logs</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('chat')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Back to Chat
              </button>
            </div>
            <AiAssistantSettingsTab />
          </div>
        ) : (
          /* ── VIEW 2: AI CONVERSATION CANVAS ── */
          <>
            {/* Quick Action Suggestion Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
              {QUICK_ACTIONS.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendQuery(action.label, 'card_click')}
                    className="bg-white p-3 rounded-2xl border-2 border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#172B4D] transition-all text-left group flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#172B4D] group-hover:bg-[#172B4D] group-hover:text-white flex items-center justify-center mb-2 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-[#172B4D] leading-tight line-clamp-1">
                        {action.label}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2">
                        {action.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Main Conversation Canvas */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden max-w-4xl w-full mx-auto">
              {/* Chat Messages Area */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  const isSpeakingThis = currentlySpeakingId === msg.id;
                  const isDailyReport = msg.data?.type === 'daily_report' || msg.data?.studentAttendance;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-9 h-9 rounded-2xl bg-[#172B4D] text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4 text-amber-300" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed shadow-2xs ${
                          isUser
                            ? 'bg-[#172B4D] text-white rounded-br-xs font-semibold'
                            : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-bl-xs'
                        } ${isSpeakingThis ? 'ring-2 ring-emerald-500' : ''}`}
                      >
                        {/* Display Text / Formatted Markdown */}
                        <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                          {msg.text}
                        </div>

                        {/* ── SPECIAL EMBEDDED CARD: OFFICIAL DAILY REPORT BRIEFING ── */}
                        {isDailyReport && msg.data && (
                          <div className="mt-3 p-3.5 bg-white rounded-2xl border-2 border-indigo-200 shadow-2xs">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-100">
                              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                Institutional Daily Operations Summary
                              </span>
                              <span className="text-[10px] font-bold text-slate-500">{msg.data.date || 'Today'}</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-center">
                              <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase">Student Body</span>
                                <span className="text-xs font-black text-blue-900">{msg.data.studentAttendance?.turnoutPercentage || 97.9}%</span>
                                <span className="text-[9px] text-emerald-700 block font-bold">{msg.data.studentAttendance?.present || 379} Present</span>
                              </div>
                              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase">Faculty Roster</span>
                                <span className="text-xs font-black text-emerald-900">{msg.data.facultyAttendance?.present || 5}/{msg.data.facultyAttendance?.totalFaculty || 6}</span>
                                <span className="text-[9px] text-indigo-700 block font-bold">1 Substituted</span>
                              </div>
                              <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase">Fee Collection</span>
                                <span className="text-xs font-black text-amber-900">₹{(msg.data.finance?.totalCollectedToday || 25700).toLocaleString('en-IN')}</span>
                                <span className="text-[9px] text-slate-600 block font-bold">3 Receipts</span>
                              </div>
                              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase">Operations</span>
                                <span className="text-xs font-black text-slate-900">{msg.data.academicOperations?.periodsConducted || 76}/{msg.data.academicOperations?.periodsScheduled || 78}</span>
                                <span className="text-[9px] text-emerald-700 block font-bold">Gate Secured</span>
                              </div>
                            </div>

                            {msg.data.facultyAttendance?.substituteArranged && (
                              <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 font-semibold mb-3 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>Period Substitution: {msg.data.facultyAttendance.substituteArranged}</span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => navigate('/reports/daily')}
                              className="w-full py-2 px-3 rounded-xl bg-[#172B4D] hover:bg-[#29456D] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <span>Open Official Daily Operations Report</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Special Data Pills: Absent Teachers & Substitutes */}
                        {msg.data && msg.data.absentNames && !isDailyReport && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200">
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {msg.data.absentNames.map((name, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                  Absent: {name}
                                </span>
                              ))}
                            </div>
                            {msg.data.substitutes && msg.data.substitutes.length > 0 && (
                              <div className="text-[11px] text-indigo-800 font-bold bg-indigo-50 p-2 rounded-xl border border-indigo-100 flex items-center gap-1 mb-2">
                                <Sparkles className="w-3 h-3 text-indigo-600" />
                                <span>{msg.data.substitutes[0]}</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => navigate('/attendance')}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#172B4D] hover:underline"
                            >
                              <span>Open Faculty Attendance Roster</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Special Data Pills: Fee Defaulters */}
                        {msg.data && msg.data.totalDefaulters && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200">
                            <button
                              type="button"
                              onClick={() => navigate('/fees')}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#172B4D] hover:underline"
                            >
                              <span>Open Fee Management Ledger</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <div className="mt-2.5 flex items-center justify-between text-[11px] opacity-75">
                          <span>{msg.timestamp}</span>
                          {!isUser && (
                            <button
                              type="button"
                              onClick={() => replayAudio(msg)}
                              className="hover:opacity-100 flex items-center gap-1 text-blue-700 font-bold"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Replay Audio</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {isUser && (
                        <div className="w-9 h-9 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {orbState === 'thinking' && (
                  <div className="flex gap-2 items-center text-xs text-slate-600 font-bold p-3 bg-slate-50 border border-slate-200 rounded-2xl w-fit animate-pulse">
                    <Sparkles className="w-4 h-4 text-[#172B4D] animate-spin" />
                    <span>Accessing institutional operational records...</span>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Bottom Dock Input Bar */}
              <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendQuery(inputText, 'text_input');
                  }}
                  className="flex items-center gap-2.5"
                >
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-3 rounded-2xl transition-all shadow-xs flex items-center justify-center shrink-0 ${
                      isListening
                        ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                        : 'bg-white text-[#172B4D] border border-slate-200 hover:bg-slate-100'
                    }`}
                    title={isListening ? "Stop listening" : "Speak query"}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <input
                    type="text"
                    placeholder={isListening ? "Listening... Speak your school question now" : "Ask any school question (e.g. 'Give me today's daily report' or 'Teachers absent today')..."}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-[#172B4D] shadow-2xs"
                  />

                  {orbState === 'speaking' ? (
                    <button
                      type="button"
                      onClick={stopAllSpeech}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="px-4 py-2.5 bg-[#172B4D] hover:bg-[#29456D] disabled:opacity-40 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0 transition-all"
                    >
                      <span>Send</span>
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
