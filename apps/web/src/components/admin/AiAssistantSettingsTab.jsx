import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Sparkles,
  Zap,
  Sliders,
  ShieldCheck,
  Coins,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  Activity,
  Bot,
  Volume2,
  Database,
  BarChart3,
  Calendar,
  Lock,
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { getAiSettings, updateAiSettings, getAiUsageStats } from '../../services/aiAssistantService';

export default function AiAssistantSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('settings'); // 'settings' | 'usage'

  // Form State
  const [tier, setTier] = useState('free');
  const [llmModelFree, setLlmModelFree] = useState('');
  const [llmModelPremium, setLlmModelPremium] = useState('');
  const [ttsProviderFree, setTtsProviderFree] = useState('browser');
  const [ttsProviderPremium, setTtsProviderPremium] = useState('gemini');
  const [voiceEn, setVoiceEn] = useState('');
  const [voiceHi, setVoiceHi] = useState('');
  const [voiceKn, setVoiceKn] = useState('');
  const [userDailyLimitFree, setUserDailyLimitFree] = useState(50);
  const [userDailyLimitPremium, setUserDailyLimitPremium] = useState(200);
  const [schoolDailyLimitFree, setSchoolDailyLimitFree] = useState(500);
  const [schoolDailyLimitPremium, setSchoolDailyLimitPremium] = useState(5000);
  const [cacheTtlSeconds, setCacheTtlSeconds] = useState(60);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [elevenLabsApiKeyInput, setElevenLabsApiKeyInput] = useState('');

  // Load Settings and Usage Stats
  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, usageRes] = await Promise.all([
        getAiSettings(),
        getAiUsageStats()
      ]);

      if (settingsRes.status && settingsRes.settings) {
        const s = settingsRes.settings;
        setSettings(s);
        setTier(s.tier || 'free');
        setLlmModelFree(s.llmModelFree || 'gemini-1.5-flash');
        setLlmModelPremium(s.llmModelPremium || 'gemini-3.5-flash');
        setTtsProviderFree(s.ttsProviderFree || 'browser');
        setTtsProviderPremium(s.ttsProviderPremium || 'gemini');
        setVoiceEn(s.voices?.en || 'en-US-Journey-F');
        setVoiceHi(s.voices?.hi || 'hi-IN-Neural2-D');
        setVoiceKn(s.voices?.kn || 'kn-IN-Standard-A');
        setUserDailyLimitFree(s.userDailyLimitFree || 50);
        setUserDailyLimitPremium(s.userDailyLimitPremium || 200);
        setSchoolDailyLimitFree(s.schoolDailyLimitFree || 500);
        setSchoolDailyLimitPremium(s.schoolDailyLimitPremium || 5000);
        setCacheTtlSeconds(s.cacheTtlSeconds || 60);
      }

      if (usageRes.status && usageRes.stats) {
        setUsageData(usageRes.stats);
      }
    } catch (err) {
      console.error('Failed to load AI Assistant Settings:', err);
      toast.error('Could not load AI Assistant settings. Please verify administrator permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // One-click Tier Switch
  const handleQuickTierSwitch = async (newTier) => {
    try {
      setSaving(true);
      const res = await updateAiSettings({ tier: newTier });
      if (res.status) {
        setTier(newTier);
        toast.success(`Active tier switched to ${newTier.toUpperCase()} without server restart!`);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to switch AI tier');
    } finally {
      setSaving(false);
    }
  };

  // Save all settings
  const handleSaveAll = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        tier,
        llmModelFree,
        llmModelPremium,
        ttsProviderFree,
        ttsProviderPremium,
        voices: {
          en: voiceEn,
          hi: voiceHi,
          kn: voiceKn
        },
        userDailyLimitFree: Number(userDailyLimitFree),
        userDailyLimitPremium: Number(userDailyLimitPremium),
        schoolDailyLimitFree: Number(schoolDailyLimitFree),
        schoolDailyLimitPremium: Number(schoolDailyLimitPremium),
        cacheTtlSeconds: Number(cacheTtlSeconds)
      };

      if (geminiApiKeyInput.trim()) {
        payload.geminiApiKey = geminiApiKeyInput.trim();
      }
      if (elevenLabsApiKeyInput.trim()) {
        payload.elevenLabsApiKey = elevenLabsApiKeyInput.trim();
      }

      const res = await updateAiSettings(payload);
      if (res.status) {
        toast.success('AI Assistant settings & limits saved successfully!');
        setGeminiApiKeyInput('');
        setElevenLabsApiKeyInput('');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to update AI settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading AI Assistant Configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="bg-gradient-to-r from-[#172B4D] via-[#1E3A8A] to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-blue-200 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            School-Wide Voice & Text Intelligence
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            AI Assistant Configuration & Usage
          </h2>
          <p className="text-sm text-blue-100 font-medium leading-relaxed">
            Configure dynamic tiers, Gemini models, high-fidelity TTS voices, and daily limits. Switch between Free and Premium with zero downtime.
          </p>
        </div>

        {/* Tier Status Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shrink-0 w-full md:w-auto relative z-10">
          <div className="text-[11px] uppercase tracking-wider font-extrabold text-blue-200 mb-1">Active AI Tier</div>
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${tier === 'premium' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span className="text-xl font-black text-white capitalize">
              {tier === 'premium' ? '⚡ Premium (Gemini 3.5 Flash)' : 'Free Tier'}
            </span>
          </div>
          <div className="text-xs text-blue-200 mt-1">
            {tier === 'premium' ? 'High-speed reasoning & premium voice enabled' : 'Zero-cost browser synthesis & free model'}
          </div>
        </div>
      </div>

      {/* Sub navigation: Settings vs Usage */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeSubTab === 'settings'
              ? 'bg-[#172B4D] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Tier & Voice Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('usage')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeSubTab === 'usage'
              ? 'bg-[#172B4D] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Usage, Tokens & Cost</span>
        </button>

        <button
          type="button"
          onClick={fetchData}
          className="ml-auto p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── TAB 1: TIER & VOICE CONFIGURATION ── */}
      {activeSubTab === 'settings' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          {/* Quick Tier Selector Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Free Tier Card */}
            <div
              onClick={() => handleQuickTierSwitch('free')}
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer relative ${
                tier === 'free'
                  ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-600/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Free Tier</h3>
                    <p className="text-xs text-slate-500">Zero API cost • Browser voice synthesis</p>
                  </div>
                </div>
                {tier === 'free' && (
                  <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Free Gemini Model ({llmModelFree})</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>SpeechSynthesis Web Voice (Zero bandwidth cost)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Automatic exponential backoff on HTTP 429 quota limits</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>All read-only school modules & voice/text reply modes</span>
                </div>
              </div>
            </div>

            {/* Premium Tier Card */}
            <div
              onClick={() => handleQuickTierSwitch('premium')}
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer relative ${
                tier === 'premium'
                  ? 'border-amber-500 bg-amber-50/40 shadow-md ring-2 ring-amber-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                      Premium Tier
                      <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-black">
                        PRO
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">Gemini 3.5 Flash • Ultra-low latency voice streaming</p>
                  </div>
                </div>
                {tier === 'premium' && (
                  <span className="bg-amber-500 text-slate-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs">
                    Active
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Flagship Model: {llmModelPremium}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>First-sentence streaming audio player (near-instant speech)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Natural prosody, SSML sentence pauses, & high daily quotas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Automatic browser fallback if cloud TTS encounters an error</span>
                </div>
              </div>
            </div>
          </div>

          {/* Model & Voice Settings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Cpu className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">Model & Voice Specifications</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Free Tier Model ID
                </label>
                <input
                  type="text"
                  value={llmModelFree}
                  onChange={(e) => setLlmModelFree(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="gemini-1.5-flash"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Configurable via LLM_MODEL_FREE</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Premium Tier Model ID
                </label>
                <input
                  type="text"
                  value={llmModelPremium}
                  onChange={(e) => setLlmModelPremium(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="gemini-3.5-flash"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Configurable via LLM_MODEL_PREMIUM</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Free TTS Provider
                </label>
                <select
                  value={ttsProviderFree}
                  onChange={(e) => setTtsProviderFree(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="browser">Browser SpeechSynthesis (Native Zero-Cost)</option>
                  <option value="gemini">Gemini TTS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Premium TTS Provider
                </label>
                <select
                  value={ttsProviderPremium}
                  onChange={(e) => setTtsProviderPremium(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                >
                  <option value="gemini">Gemini / Google High-Fidelity TTS</option>
                  <option value="elevenlabs">ElevenLabs MultiLingual Voice</option>
                  <option value="browser">Browser SpeechSynthesis Fallback</option>
                </select>
              </div>
            </div>

            {/* Language Voices */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Natural Voice Choices per Language
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-xs text-slate-500 font-semibold mb-1 block">English Voice</span>
                  <input
                    type="text"
                    value={voiceEn}
                    onChange={(e) => setVoiceEn(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                    placeholder="en-US-Journey-F"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold mb-1 block">Hindi Voice</span>
                  <input
                    type="text"
                    value={voiceHi}
                    onChange={(e) => setVoiceHi(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                    placeholder="hi-IN-Neural2-D"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold mb-1 block">Kannada Voice</span>
                  <input
                    type="text"
                    value={voiceKn}
                    onChange={(e) => setVoiceKn(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                    placeholder="kn-IN-Standard-A"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cost Control & Quota Limits */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-base">Cost Control & Daily Quota Limits</h3>
                <p className="text-xs text-slate-500">Prevent budget overruns with automated daily limits and tool result caching</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  User Daily Limit (Free)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1000"
                  value={userDailyLimitFree}
                  onChange={(e) => setUserDailyLimitFree(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-800 bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Queries / user / day</span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-100">
                <label className="block text-[11px] font-bold text-amber-900 uppercase mb-1">
                  User Daily Limit (Premium)
                </label>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  value={userDailyLimitPremium}
                  onChange={(e) => setUserDailyLimitPremium(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-amber-200 text-sm font-bold text-slate-800 bg-white"
                />
                <span className="text-[10px] text-amber-700 mt-1 block">Queries / user / day</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  School Daily Limit (Free)
                </label>
                <input
                  type="number"
                  min="50"
                  max="50000"
                  value={schoolDailyLimitFree}
                  onChange={(e) => setSchoolDailyLimitFree(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-800 bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Total school-wide cap</span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-100">
                <label className="block text-[11px] font-bold text-amber-900 uppercase mb-1">
                  School Daily Limit (Premium)
                </label>
                <input
                  type="number"
                  min="100"
                  max="100000"
                  value={schoolDailyLimitPremium}
                  onChange={(e) => setSchoolDailyLimitPremium(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-amber-200 text-sm font-bold text-slate-800 bg-white"
                />
                <span className="text-[10px] text-amber-700 mt-1 block">Total school-wide cap</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tool Query Cache Duration (Seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="3600"
                  value={cacheTtlSeconds}
                  onChange={(e) => setCacheTtlSeconds(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Caches attendance and timetable queries to save DB & LLM calls (Default: 60s)
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Update Gemini API Key (Optional)
                </label>
                <input
                  type="password"
                  value={geminiApiKeyInput}
                  onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                  placeholder={settings?.hasGeminiApiKey ? '•••••••••••••••• (Configured)' : 'Enter GEMINI_API_KEY'}
                />
                <p className="text-[11px] text-slate-400 mt-1">Stored securely on backend only</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={fetchData}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#172B4D] hover:bg-blue-900 text-white text-sm font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* ── TAB 2: USAGE & COST ANALYTICS ── */}
      {activeSubTab === 'usage' && (
        <div className="space-y-6 animate-fadeIn">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Today's Queries</span>
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {usageData?.today?.requests || 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Month total: {usageData?.month?.requests || 0} queries
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Tokens Processed</span>
                <Layers className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {(usageData?.today?.tokens || 0).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Month: {(usageData?.month?.tokens || 0).toLocaleString()} tokens
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">TTS Characters</span>
                <Volume2 className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {(usageData?.today?.ttsChars || 0).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Month: {(usageData?.month?.ttsChars || 0).toLocaleString()} chars
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Estimated Cost</span>
                <Coins className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700">
                ${usageData?.today?.costUsd || '0.0000'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                ₹{usageData?.today?.costInr || '0.00'} • Month: ${usageData?.month?.costUsd || '0.0000'}
              </div>
            </div>
          </div>

          {/* Recent Query Audit Logs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Recent Query & Audit Log</h3>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                Showing last {usageData?.recentLogs?.length || 0} entries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Tier</th>
                    <th className="py-3 px-4">Model</th>
                    <th className="py-3 px-4">Query Snippet</th>
                    <th className="py-3 px-4">Tokens</th>
                    <th className="py-3 px-4">TTS Chars</th>
                    <th className="py-3 px-4">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {(!usageData?.recentLogs || usageData.recentLogs.length === 0) ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400">
                        No AI assistant queries logged yet today.
                      </td>
                    </tr>
                  ) : (
                    usageData.recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{log.userName}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{log.userRole}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.tier === 'premium' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                          }`}>
                            {log.tier}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {log.model}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-800" title={log.querySnippet}>
                          "{log.querySnippet}"
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {log.totalTokens || 0}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {log.ttsChars || 0}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          ${log.estimatedCost || 0}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
