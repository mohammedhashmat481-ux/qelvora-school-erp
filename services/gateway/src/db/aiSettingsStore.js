import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'aiSettingsData.json');

// Default pricing rates for cost estimation (USD)
const PRICING = {
  free: { inputPerK: 0, outputPerK: 0, ttsPerKChars: 0 },
  premium: {
    'gemini-3.5-flash': { inputPerK: 0.00015, outputPerK: 0.0006 },
    defaultModel: { inputPerK: 0.00015, outputPerK: 0.0006 },
    ttsPerKChars: 0.016 // ~16 per million chars
  }
};

class AiSettingsStore {
  constructor() {
    this.settings = this.loadInitialSettings();
    this.usageCounters = {}; // { [dateStr]: { users: { [userId]: count }, schoolTotal: count } }
    this.toolCache = new Map(); // key -> { data, expiresAt }
    this.usageLogs = [];
    this.loadPersistedData();
  }

  loadInitialSettings() {
    return {
      tier: (process.env.AI_TIER || 'free').toLowerCase(), // 'free' | 'premium'
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
      elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
      
      // Models (never hardcoded, resolved from env or dynamic config)
      llmModelFree: process.env.LLM_MODEL_FREE || 'gemini-1.5-flash',
      llmModelPremium: process.env.LLM_MODEL_PREMIUM || 'gemini-3.5-flash',

      // TTS Providers
      ttsProviderFree: process.env.TTS_PROVIDER_FREE || 'browser',
      ttsProviderPremium: process.env.TTS_PROVIDER_PREMIUM || 'gemini', // 'gemini' | 'google' | 'elevenlabs' | 'browser'

      // Best natural voice configurations per language
      voices: {
        en: process.env.AI_VOICE_EN || 'en-US-Journey-F',
        hi: process.env.AI_VOICE_HI || 'hi-IN-Neural2-D',
        kn: process.env.AI_VOICE_KN || 'kn-IN-Standard-A'
      },

      // Daily Quota & Cost Control limits
      userDailyLimitFree: parseInt(process.env.AI_USER_LIMIT_FREE || '50', 10),
      userDailyLimitPremium: parseInt(process.env.AI_USER_LIMIT_PREMIUM || '200', 10),
      schoolDailyLimitFree: parseInt(process.env.AI_SCHOOL_LIMIT_FREE || '500', 10),
      schoolDailyLimitPremium: parseInt(process.env.AI_SCHOOL_LIMIT_PREMIUM || '5000', 10),

      cacheTtlSeconds: parseInt(process.env.AI_CACHE_TTL_SEC || '60', 10),
      maxHistoryTurns: 6, // 3 exchanges
      updatedAt: new Date().toISOString()
    };
  }

  loadPersistedData() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.settings) {
          this.settings = { ...this.settings, ...parsed.settings };
        }
        if (parsed.usageCounters) {
          this.usageCounters = parsed.usageCounters;
        }
        if (Array.isArray(parsed.usageLogs)) {
          this.usageLogs = parsed.usageLogs.slice(-500); // keep last 500 logs
        }
      }
    } catch (err) {
      console.warn('AiSettingsStore: Could not load persisted data, using defaults:', err.message);
    }
  }

  save() {
    try {
      const payload = {
        settings: this.settings,
        usageCounters: this.usageCounters,
        usageLogs: this.usageLogs.slice(-500)
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('AiSettingsStore: Failed to persist settings:', err.message);
    }
  }

  getSettings() {
    return { ...this.settings };
  }

  updateSettings(updates = {}) {
    const allowedKeys = [
      'tier', 'llmModelFree', 'llmModelPremium',
      'ttsProviderFree', 'ttsProviderPremium',
      'elevenLabsVoiceId', 'voices',
      'userDailyLimitFree', 'userDailyLimitPremium',
      'schoolDailyLimitFree', 'schoolDailyLimitPremium',
      'cacheTtlSeconds', 'maxHistoryTurns'
    ];

    for (const key of allowedKeys) {
      if (updates[key] !== undefined) {
        if (key === 'voices') {
          this.settings.voices = { ...this.settings.voices, ...updates.voices };
        } else {
          this.settings[key] = updates[key];
        }
      }
    }

    if (updates.geminiApiKey) {
      this.settings.geminiApiKey = updates.geminiApiKey;
    }
    if (updates.elevenLabsApiKey) {
      this.settings.elevenLabsApiKey = updates.elevenLabsApiKey;
    }

    this.settings.updatedAt = new Date().toISOString();
    this.save();
    return this.getSettings();
  }

  // ---------------------------------------------------------------------------
  // DAILY LIMIT CHECKS & QUOTA MANAGEMENT
  // ---------------------------------------------------------------------------
  getTodayKey() {
    return new Date().toISOString().split('T')[0];
  }

  checkDailyLimit(userId = 'anonymous') {
    const today = this.getTodayKey();
    if (!this.usageCounters[today]) {
      this.usageCounters[today] = { users: {}, schoolTotal: 0 };
    }

    const todayData = this.usageCounters[today];
    const userCount = todayData.users[userId] || 0;
    const schoolCount = todayData.schoolTotal || 0;

    const isPremium = this.settings.tier === 'premium';
    const userLimit = isPremium ? this.settings.userDailyLimitPremium : this.settings.userDailyLimitFree;
    const schoolLimit = isPremium ? this.settings.schoolDailyLimitPremium : this.settings.schoolDailyLimitFree;

    if (userCount >= userLimit) {
      return {
        allowed: false,
        reason: 'user_limit',
        limit: userLimit,
        current: userCount,
        message: `You have reached your daily question limit of ${userLimit} queries. Please try again tomorrow or contact your administrator.`
      };
    }

    if (schoolCount >= schoolLimit) {
      return {
        allowed: false,
        reason: 'school_limit',
        limit: schoolLimit,
        current: schoolCount,
        message: `The school-wide AI assistant daily quota of ${schoolLimit} queries has been reached for today. Normal capacity will reset tomorrow.`
      };
    }

    return { allowed: true, userCount, schoolCount, userLimit, schoolLimit };
  }

  incrementDailyLimit(userId = 'anonymous') {
    const today = this.getTodayKey();
    if (!this.usageCounters[today]) {
      this.usageCounters[today] = { users: {}, schoolTotal: 0 };
    }
    const todayData = this.usageCounters[today];
    todayData.users[userId] = (todayData.users[userId] || 0) + 1;
    todayData.schoolTotal = (todayData.schoolTotal || 0) + 1;
    this.save();
  }

  // ---------------------------------------------------------------------------
  // 60-SECOND READ-ONLY TOOL CACHING
  // ---------------------------------------------------------------------------
  getCachedTool(key) {
    const cached = this.toolCache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.toolCache.delete(key);
      return null;
    }
    return cached.data;
  }

  setCachedTool(key, data, ttlSeconds = null) {
    const ttl = (ttlSeconds || this.settings.cacheTtlSeconds || 60) * 1000;
    this.toolCache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  // ---------------------------------------------------------------------------
  // USAGE LOGGING & ESTIMATED COST TRACKING
  // ---------------------------------------------------------------------------
  calculateCost(tier, model, promptTokens = 0, completionTokens = 0, ttsChars = 0) {
    if (tier === 'free') return 0;
    const rates = PRICING.premium['gemini-3.5-flash'] || PRICING.premium.defaultModel;
    const llmCost = ((promptTokens / 1000) * rates.inputPerK) + ((completionTokens / 1000) * rates.outputPerK);
    const ttsCost = (ttsChars / 1000) * PRICING.premium.ttsPerKChars;
    return Number((llmCost + ttsCost).toFixed(5));
  }

  logUsage({
    userId = 'anonymous',
    userName = 'User',
    userRole = 'teacher',
    tier,
    model,
    promptTokens = 0,
    completionTokens = 0,
    ttsChars = 0,
    status = 'success',
    querySnippet = ''
  }) {
    const activeTier = tier || this.settings.tier;
    const activeModel = model || (activeTier === 'premium' ? this.settings.llmModelPremium : this.settings.llmModelFree);
    const estimatedCost = this.calculateCost(activeTier, activeModel, promptTokens, completionTokens, ttsChars);

    const logEntry = {
      id: `ai-log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      userRole,
      tier: activeTier,
      model: activeModel,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      ttsChars,
      estimatedCost,
      status,
      querySnippet: (querySnippet || '').substring(0, 120)
    };

    this.usageLogs.unshift(logEntry);
    if (this.usageLogs.length > 500) {
      this.usageLogs = this.usageLogs.slice(0, 500);
    }
    this.save();
    return logEntry;
  }

  getUsageStats() {
    const today = this.getTodayKey();
    const currentMonth = today.substring(0, 7); // 'YYYY-MM'

    let todayRequests = 0;
    let todayTokens = 0;
    let todayTtsChars = 0;
    let todayCost = 0;

    let monthlyRequests = 0;
    let monthlyTokens = 0;
    let monthlyTtsChars = 0;
    let monthlyCost = 0;

    const tierBreakdown = { free: 0, premium: 0 };
    const roleBreakdown = {};

    for (const log of this.usageLogs) {
      const logDate = log.timestamp.split('T')[0];
      const logMonth = logDate.substring(0, 7);

      if (logMonth === currentMonth) {
        monthlyRequests += 1;
        monthlyTokens += (log.totalTokens || 0);
        monthlyTtsChars += (log.ttsChars || 0);
        monthlyCost += (log.estimatedCost || 0);
      }

      if (logDate === today) {
        todayRequests += 1;
        todayTokens += (log.totalTokens || 0);
        todayTtsChars += (log.ttsChars || 0);
        todayCost += (log.estimatedCost || 0);
        tierBreakdown[log.tier] = (tierBreakdown[log.tier] || 0) + 1;
        roleBreakdown[log.userRole] = (roleBreakdown[log.userRole] || 0) + 1;
      }
    }

    return {
      today: {
        date: today,
        requests: todayRequests,
        tokens: todayTokens,
        ttsChars: todayTtsChars,
        costUsd: Number(todayCost.toFixed(4)),
        costInr: Number((todayCost * 86.5).toFixed(2))
      },
      month: {
        month: currentMonth,
        requests: monthlyRequests,
        tokens: monthlyTokens,
        ttsChars: monthlyTtsChars,
        costUsd: Number(monthlyCost.toFixed(4)),
        costInr: Number((monthlyCost * 86.5).toFixed(2))
      },
      tierBreakdown,
      roleBreakdown,
      recentLogs: this.usageLogs.slice(0, 50)
    };
  }
}

export const aiSettingsStore = new AiSettingsStore();
