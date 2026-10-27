import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  sendMessageToAi,
  speakUtterance,
  speakSentenceQueue,
  stopSpeech,
  isSpeaking,
  createSpeechRecognition
} from '../../services/aiAssistantService';
import toast from 'react-hot-toast';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  X,
  Volume2,
  VolumeX,
  Square,
  RotateCcw,
  Languages,
  ChevronDown,
  Minimize2,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Bot,
  User,
  Radio,
  FileText,
  Volume
} from 'lucide-react';

const QUICK_CHIPS = [
  "Teachers absent today",
  "Students absent today",
  "Fee defaulters",
  "Today's timetable",
  "Upcoming exams"
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' }
];

export default function GlobalAiAssistant() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Do not show on auth pages or when already on dedicated /ai-assist page
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/profile-selection';
  if (isAuthPage || !isAuthenticated || location.pathname === '/ai-assist') {
    return null;
  }

  // Panel Open State
  const [isOpen, setIsOpen] = useState(false);

  // Reply Mode: 'voice_only' | 'text_only' | 'voice_and_text'
  const [replyMode, setReplyMode] = useState(() => {
    return localStorage.getItem('qelvora_ai_reply_mode') || 'voice_and_text';
  });

  // Selected Language
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('qelvora_ai_language') || 'en';
  });

  // Mute Audio Setting
  const [isMuted, setIsMuted] = useState(false);

  // Visual Orb State: 'idle' | 'listening' | 'thinking' | 'speaking'
  const [orbState, setOrbState] = useState('idle');

  // Chat conversation
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: "Hello! I am your Qelvora School AI Assistant. You can speak or type to ask about attendance, fee defaulters, timetables, or exams.",
      spokenText: "Hello! I am your Qelvora School AI Assistant. You can speak or type to ask about attendance, fee defaulters, timetables, or exams.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null);
  const [spokenCharIndex, setSpokenCharIndex] = useState(0);
  const [activeTier, setActiveTier] = useState('free');
  const [activeSpokenSentence, setActiveSpokenSentence] = useState('');

  const recognitionRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('qelvora_ai_reply_mode', replyMode);
  }, [replyMode]);

  useEffect(() => {
    localStorage.setItem('qelvora_ai_language', language);
  }, [language]);

  // Scroll to bottom on message update
  useEffect(() => {
    if (isOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, orbState]);

  // Stop speech when component unmounts or closes
  useEffect(() => {
    return () => {
      stopSpeech();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // SPEECH-TO-TEXT (MIC INPUT)
  // ---------------------------------------------------------------------------
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
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
        if (transcript) {
          setInputText(transcript);
        }
        if (finalTranscript) {
          setIsListening(false);
          handleSendQuery(finalTranscript, 'voice_input');
        }
      },
      onError: (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
        setOrbState('idle');
        if (err.error === 'not-allowed') {
          toast.error('Microphone permission was denied. Please allow microphone access or type your query.');
        } else {
          toast.error('Voice input ended. You can try speaking again or type in the box.');
        }
      },
      onEnd: () => {
        setIsListening(false);
        if (orbState === 'listening') {
          setOrbState('idle');
        }
      }
    });

    if (!recognition) {
      toast.error('Voice input is not supported in this browser. Please type your message in the box.');
      setOrbState('idle');
      return;
    }

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.warn('Recognition start error:', e);
      setIsListening(false);
      setOrbState('idle');
    }
  };

  // ---------------------------------------------------------------------------
  // SEND QUERY TO AI ASSISTANT
  // ---------------------------------------------------------------------------
  const handleSendQuery = async (queryText, inputSource = 'text_input') => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend) return;

    // Interrupt any ongoing speech
    stopSpeech();

    // Determine target mode for this query
    // Rule: If user typed, default to text unless replyMode is set to voice_only
    // If user spoke, respect active replyMode
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
      // Build conversation history payload
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

      // Handle Spoken Reply
      const shouldSpeak = !isMuted && (effectiveReplyMode === 'voice_only' || effectiveReplyMode === 'voice_and_text');

      if (shouldSpeak && response.answerText) {
        setOrbState('speaking');
        setCurrentlySpeakingId(aiMsgId);

        // Stream audio using sentence queue (first sentence starts speaking immediately)
        speakSentenceQueue(response.sentences || [response.answerText], language, {
          onSentenceStart: (sentence, index) => {
            setOrbState('speaking');
            setActiveSpokenSentence(sentence);
          },
          onSentenceEnd: () => {
            // next sentence will trigger onSentenceStart
          },
          onAllComplete: () => {
            setOrbState('idle');
            setCurrentlySpeakingId(null);
            setActiveSpokenSentence('');
            setSpokenCharIndex(0);
          },
          onError: () => {
            setOrbState('idle');
            setCurrentlySpeakingId(null);
            setActiveSpokenSentence('');
          },
          pauseMs: response.tier === 'premium' ? 240 : 120
        });
      } else {
        setOrbState('idle');
      }
    } catch (err) {
      console.error('AI query error:', err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: "I am having trouble reaching the database right now. Please check your network or try again.",
        spokenText: "I am having trouble reaching the database right now. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
      setOrbState('idle');

      if (!isMuted && (effectiveReplyMode === 'voice_only' || effectiveReplyMode === 'voice_and_text')) {
        speakUtterance(errorMsg.spokenText, language);
      }
    }
  };

  const stopAllSpeech = () => {
    stopSpeech();
    setOrbState('idle');
    setCurrentlySpeakingId(null);
    setSpokenCharIndex(0);
  };

  const replayMessageAudio = (msg) => {
    if (!msg.spokenText) return;
    stopSpeech();
    setOrbState('speaking');
    setCurrentlySpeakingId(msg.id);

    speakUtterance(msg.spokenText, language, {
      onStart: () => setOrbState('speaking'),
      onBoundary: (e) => {
        if (e.charIndex !== undefined) setSpokenCharIndex(e.charIndex);
      },
      onEnd: () => {
        setOrbState('idle');
        setCurrentlySpeakingId(null);
        setSpokenCharIndex(0);
      },
      onError: () => {
        setOrbState('idle');
        setCurrentlySpeakingId(null);
      }
    });
  };

  return (
    <>
      {/* ── FLOATING LAUNCHER BUTTON (ALWAYS VISIBLE AT BOTTOM-RIGHT) ── */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-[#172B4D] via-[#1E3A8A] to-[#2563EB] text-white rounded-full shadow-2xl hover:shadow-blue-500/25 hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white/20 group"
          title="Open Qelvora AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-[#172B4D] animate-ping" />
          </div>
          <span className="font-extrabold text-sm tracking-wide">AI Assist</span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-blue-100">
            Voice & Text
          </span>
        </button>
      )}

      {/* ── EXPANDED AI ASSISTANT PANEL / DRAWER ── */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-[420px] sm:w-[420px] h-[640px] max-h-[92vh] bg-white rounded-3xl shadow-2xl border-2 border-[#172B4D]/20 flex flex-col overflow-hidden animate-slideUp font-sans">
          
          {/* Header Bar */}
          <div className="bg-[#172B4D] text-white px-4 py-3 flex items-center justify-between border-b border-[#29456D]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black tracking-tight leading-tight">Qelvora AI Assistant</h3>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    activeTier === 'premium' ? 'bg-amber-400 text-slate-900 shadow-xs' : 'bg-blue-400/20 text-blue-200'
                  }`}>
                    {activeTier === 'premium' ? '⚡ Gemini 3.5' : 'Free'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-blue-200 font-medium">
                  <span className={`w-1.5 h-1.5 rounded-full ${orbState === 'idle' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
                  <span className="capitalize">{orbState} Mode</span>
                </div>
              </div>
            </div>

            {/* Header Controls: Mute, Language, Close */}
            <div className="flex items-center gap-1.5">
              {/* Mute Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (!isMuted) stopAllSpeech();
                }}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  isMuted ? 'bg-rose-500/20 text-rose-300' : 'hover:bg-white/10 text-blue-200'
                }`}
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-[#29456D] text-white text-[11px] font-bold px-2 py-1 rounded-lg border border-white/10 outline-none cursor-pointer"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>

              {/* Close Panel */}
              <button
                type="button"
                onClick={() => {
                  stopAllSpeech();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Minimize Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reply Mode Toggle Segmented Control */}
          <div className="bg-[#EFF4FA] px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Reply Mode:
            </span>
            <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setReplyMode('voice_only');
                  stopAllSpeech();
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                  replyMode === 'voice_only'
                    ? 'bg-[#172B4D] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Audio spoken aloud, no text shown"
              >
                Voice Only
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplyMode('text_only');
                  stopAllSpeech();
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                  replyMode === 'text_only'
                    ? 'bg-[#172B4D] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Chat text messages only, no audio"
              >
                Text Only
              </button>
              <button
                type="button"
                onClick={() => setReplyMode('voice_and_text')}
                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                  replyMode === 'voice_and_text'
                    ? 'bg-[#172B4D] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Both spoken voice and text displayed"
              >
                Voice + Text
              </button>
            </div>
          </div>

          {/* ── CENTRAL VISUAL AREA: ORB (Voice-Only Mode) OR CHAT FEED (Text/Voice+Text) ── */}
          <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-50/50 to-white flex flex-col justify-between">
            
            {replyMode === 'voice_only' ? (
              /* VOICE-ONLY INTERACTIVE ORB & WAVEFORM */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                {/* Visual Orb Container */}
                <div
                  onClick={() => {
                    if (orbState === 'speaking') stopAllSpeech();
                    else toggleListening();
                  }}
                  className={`w-36 h-36 rounded-full flex items-center justify-center cursor-pointer transition-all duration-500 shadow-2xl relative ${
                    orbState === 'listening'
                      ? 'bg-gradient-to-tr from-rose-500 via-pink-600 to-amber-400 animate-pulse scale-110 shadow-rose-500/40'
                      : orbState === 'thinking'
                      ? 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-500 animate-spin shadow-purple-500/40'
                      : orbState === 'speaking'
                      ? 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 animate-bounce scale-105 shadow-emerald-500/40'
                      : 'bg-gradient-to-tr from-[#172B4D] to-[#2563EB] hover:scale-105 shadow-blue-500/20'
                  }`}
                  title={orbState === 'speaking' ? 'Click to Stop Speech' : 'Click to Speak'}
                >
                  <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-md flex flex-col items-center justify-center text-white">
                    {orbState === 'listening' && <Mic className="w-10 h-10 animate-bounce" />}
                    {orbState === 'thinking' && <Sparkles className="w-10 h-10 animate-spin" />}
                    {orbState === 'speaking' && <Volume2 className="w-10 h-10 animate-pulse" />}
                    {orbState === 'idle' && <Mic className="w-10 h-10 opacity-90" />}
                  </div>

                  {/* Pulsing Aura Rings */}
                  {orbState === 'listening' && (
                    <span className="absolute inset-0 rounded-full border-4 border-rose-400 animate-ping opacity-75" />
                  )}
                  {orbState === 'speaking' && (
                    <span className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping opacity-75" />
                  )}
                </div>

                {/* State Label */}
                <h4 className="mt-6 text-sm font-black text-[#172B4D] uppercase tracking-wider">
                  {orbState === 'listening' && "Listening to you..."}
                  {orbState === 'thinking' && "Querying school database..."}
                  {orbState === 'speaking' && "Speaking answer..."}
                  {orbState === 'idle' && "Tap the Orb or Mic to Speak"}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  {orbState === 'listening' ? "Speak your school administration query naturally." : "Voice-only mode active. Answers will be spoken aloud."}
                </p>

                {/* Stop Speech Button */}
                {orbState === 'speaking' && (
                  <button
                    type="button"
                    onClick={stopAllSpeech}
                    className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold shadow-md transition-all animate-bounce"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop Speaking</span>
                  </button>
                )}
              </div>
            ) : (
              /* CHAT MESSAGES FEED (Text & Voice+Text Modes) */
              <div className="space-y-3.5 flex-1">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  const isCurrentlySpeakingThis = currentlySpeakingId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-xl bg-[#172B4D] text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-4 h-4 text-blue-300" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                          isUser
                            ? 'bg-[#172B4D] text-white rounded-br-xs'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                        } ${isCurrentlySpeakingThis ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
                      >
                        {/* Message Text with Sentence Highlighting if Speaking */}
                        <div className="font-medium whitespace-pre-wrap">
                          {msg.text}
                        </div>

                        {/* Structured Data Preview Pills if Available */}
                        {msg.data && msg.data.absentNames && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                            {msg.data.absentNames.map((name, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                ❌ {name}
                              </span>
                            ))}
                          </div>
                        )}

                        {msg.data && msg.data.absentees && (
                          <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                            {msg.data.absentees.slice(0, 3).map((stu, i) => (
                              <div key={i} className="text-[10px] font-semibold text-slate-600 flex justify-between">
                                <span>• {stu.name} (Roll {stu.rollNumber})</span>
                                <span className="text-rose-600">{stu.reason || 'Absent'}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Message Footer: Timestamp and Replay Audio Button */}
                        <div className="mt-1.5 flex items-center justify-between text-[10px] opacity-75 gap-3">
                          <span>{msg.timestamp}</span>
                          {!isUser && (
                            <button
                              type="button"
                              onClick={() => replayMessageAudio(msg)}
                              className="hover:opacity-100 flex items-center gap-1 text-blue-600 font-bold"
                              title="Replay Voice Answer"
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>Listen</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Thinking Indicator */}
                {orbState === 'thinking' && (
                  <div className="flex gap-2 items-center text-xs text-slate-500 font-semibold p-2">
                    <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                    <span>Analyzing school database...</span>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>
            )}

            {/* Quick-Question Chips */}
            <div className="mt-3 pt-2 border-t border-slate-200 overflow-x-auto pb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Suggested Questions:
              </span>
              <div className="flex gap-1.5">
                {QUICK_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendQuery(chip, 'chip_click')}
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 hover:bg-blue-50 hover:text-[#172B4D] hover:border-blue-200 text-slate-600 border border-slate-200 transition-all whitespace-nowrap shadow-2xs"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── BOTTOM INPUT DOCK (MIC + TEXT BOX ALWAYS AVAILABLE) ── */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery(inputText, 'text_input');
              }}
              className="flex items-center gap-2"
            >
              {/* Mic Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-2xl transition-all duration-200 shadow-xs flex items-center justify-center shrink-0 ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title={isListening ? "Listening... (Click to stop)" : "Speak your question"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#172B4D]" />}
              </button>

              {/* Text Input Box */}
              <input
                type="text"
                placeholder={isListening ? "Listening... Speak now" : "Ask about attendance, fees, timetable..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#29456D] focus:bg-white transition-all"
              />

              {/* Stop Button (When speaking) or Send Button */}
              {orbState === 'speaking' ? (
                <button
                  type="button"
                  onClick={stopAllSpeech}
                  className="p-2.5 bg-rose-600 text-white rounded-2xl hover:bg-rose-700 transition-all shrink-0 shadow-xs"
                  title="Stop audio speech"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 bg-[#172B4D] hover:bg-[#29456D] disabled:opacity-40 text-white rounded-2xl transition-all shrink-0 shadow-xs"
                  title="Send Question"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>

        </div>
      )}
    </>
  );
}
