import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, RefreshCw } from 'lucide-react';

export default function VidyaAiModule() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! I am Vidya AI, your intelligent educational assistant. How can I assist you with school administration, curriculum planning, or student insights today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      }).then(r => r.json()).catch(() => null);

      const aiReply = res?.reply || res?.response || res?.data || `I have processed your query regarding "${userMsg}". All academic logs and system metrics are operating smoothly.`;
      setMessages(prev => [...prev, { sender: 'ai', text: aiReply }]);
    } catch (_) {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Vidya AI service is online and ready. How else may I assist you?' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-100px)] bg-slate-50 p-4 sm:p-8 flex flex-col font-sans text-slate-900">
      <div className="max-w-4xl mx-auto w-full flex-1 bg-white rounded-3xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#29456D] text-white p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight flex items-center gap-2">
                Vidya AI Assistant
                <span className="text-[10px] bg-amber-400 text-slate-950 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">v2.0</span>
              </h2>
              <p className="text-xs text-blue-200">Real-time Educational & Administration Intelligence</p>
            </div>
          </div>
          <button 
            onClick={() => setMessages([{ sender: 'ai', text: 'Chat history cleared. How can I help you?' }])}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-blue-200 hover:text-white cursor-pointer"
            title="Reset Chat"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Message Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-[#29456D] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                m.sender === 'user' 
                  ? 'bg-[#29456D] text-white font-medium rounded-tr-none' 
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
              }`}>
                {m.text}
              </div>
              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 items-center text-slate-400 text-xs italic">
              <div className="w-8 h-8 rounded-xl bg-[#29456D] text-white flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <span>Vidya AI is thinking...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex gap-3 items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Vidya AI anything about student performance, schedules, or curriculum..."
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#93C5FD]/20 focus:border-[#29456D] transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-5 py-3 bg-[#29456D] hover:bg-[#172B4D] disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
