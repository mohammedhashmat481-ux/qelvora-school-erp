import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/ui/Sidebar';
import { useAuth } from '../context/AuthContext';
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
  RotateCcw
} from 'lucide-react';

const QUICK_ACTIONS = [
  { label: "Teachers absent today", icon: Users, desc: "Check faculty attendance & substitutes" },
  { label: "Students absent today", icon: Calendar, desc: "Class-wise or school-wide absenteeism" },
  { label: "Who has pending fees?", icon: IndianRupee, desc: "Audited fee defaulter ledger" },
  { label: "Today's timetable", icon: Layers, desc: "Class & faculty period schedules" },
  { label: "Upcoming exams", icon: Award, desc: "Term dates and examination syllabus" }
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' }
];

export default function AiAssistPage() {
  const { user } = useAuth();

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
      text: "Welcome to the Qelvora School AI Assistant. I can check student and faculty attendance, fee defaulters, period timetables, and exam schedules. You can speak or type your inquiry below.",
      spokenText: "Welcome to the Qelvora School AI Assistant. I can check attendance, fee defaulters, timetables, and exams.",
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
      onError: (err) => {
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
    <div className="min-h-screen bg-[#F7F9FC] text-[#334155] flex flex-col md:flex-row font-sans">
      <Sidebar />

      <div className="flex-1 bg-[#F7F9FC] p-4 sm:p-6 lg:p-8 overflow-y-auto flex flex-col">
        {/* Top Header */}
        <header className="mb-6 pb-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#172B4D] text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#172B4D] tracking-tight">AI Assistant</h1>
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                  activeTier === 'premium' ? 'bg-amber-400 text-slate-900 border-amber-500 shadow-xs' : 'bg-blue-100 text-[#172B4D] border-blue-200'
                }`}>
                  {activeTier === 'premium' ? '⚡ Gemini 3.5 Flash (Premium)' : 'Free Tier'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                School-wide conversational intelligence connected to live attendance, fees, schedules, and operations
              </p>
            </div>
          </div>

          {/* Controls: Mode, Language, Mute */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Selector */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => { setReplyMode('voice_only'); stopAllSpeech(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  replyMode === 'voice_only' ? 'bg-[#172B4D] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Voice Only
              </button>
              <button
                type="button"
                onClick={() => { setReplyMode('text_only'); stopAllSpeech(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  replyMode === 'text_only' ? 'bg-[#172B4D] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Text Only
              </button>
              <button
                type="button"
                onClick={() => setReplyMode('voice_and_text')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                isMuted ? 'bg-rose-50 text-rose-600' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Quick Action Suggestion Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {QUICK_ACTIONS.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendQuery(action.label, 'card_click')}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#172B4D] group-hover:bg-[#172B4D] group-hover:text-white flex items-center justify-center mb-2 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-700 leading-tight">
                  {action.label}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {action.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Main Conversation Canvas */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden max-w-4xl w-full mx-auto">
          {/* Chat Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isSpeakingThis = currentlySpeakingId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-9 h-9 rounded-2xl bg-[#172B4D] text-white flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed shadow-2xs ${
                      isUser
                        ? 'bg-[#172B4D] text-white rounded-br-xs'
                        : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-bl-xs'
                    } ${isSpeakingThis ? 'ring-2 ring-emerald-500' : ''}`}
                  >
                    <p className="font-medium text-sm leading-relaxed">{msg.text}</p>

                    {/* Data Pills */}
                    {msg.data && msg.data.absentNames && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap gap-1.5">
                        {msg.data.absentNames.map((name, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            ❌ {name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between text-[11px] opacity-75">
                      <span>{msg.timestamp}</span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => replayAudio(msg)}
                          className="hover:opacity-100 flex items-center gap-1 text-blue-600 font-bold"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Replay Audio</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-9 h-9 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {orbState === 'thinking' && (
              <div className="flex gap-2 items-center text-xs text-slate-500 font-semibold p-3 bg-slate-50 rounded-2xl w-fit">
                <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                <span>Accessing institution records...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Bottom Dock */}
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery(inputText, 'text_input');
              }}
              className="flex items-center gap-3"
            >
              <button
                type="button"
                onClick={toggleListening}
                className={`p-3.5 rounded-2xl transition-all shadow-xs flex items-center justify-center ${
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
                placeholder={isListening ? "Listening... Speak now" : "Ask any school question (e.g. 'How many teachers are absent today?')..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#172B4D]"
              />

              {orbState === 'speaking' ? (
                <button
                  type="button"
                  onClick={stopAllSpeech}
                  className="px-5 py-3.5 bg-rose-600 text-white rounded-2xl font-bold text-xs flex items-center gap-2 hover:bg-rose-700 shadow-xs"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="px-5 py-3.5 bg-[#172B4D] hover:bg-[#29456D] disabled:opacity-40 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xs"
                >
                  <span>Send</span>
                  <Send className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
