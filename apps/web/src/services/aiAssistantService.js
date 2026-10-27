import api from './api';

/**
 * AI Assistant Service — Unified Voice & Text API Client & Voice Orchestration
 */

export const sendMessageToAi = async ({ message, language = 'en', replyMode = 'voice_and_text', conversationHistory = [] }) => {
  const res = await api.post('/ai-assistant/chat', {
    message,
    language,
    replyMode,
    conversationHistory
  });
  return res.data;
};

export const getTtsVoiceConfig = async ({ text, language = 'en', replyMode = 'voice_and_text' }) => {
  const res = await api.post('/ai-assistant/tts', { text, language, replyMode });
  return res.data;
};

// Admin Tier Management & Usage Endpoints
export const getAiSettings = async () => {
  const res = await api.get('/ai-assistant/settings');
  return res.data;
};

export const updateAiSettings = async (updates) => {
  const res = await api.put('/ai-assistant/settings', updates);
  return res.data;
};

export const getAiUsageStats = async () => {
  const res = await api.get('/ai-assistant/usage');
  return res.data;
};

// -----------------------------------------------------------------------------
// BROWSER SPEECH SYNTHESIS ENGINE (WITH HIGHLIGHTING & MULTI-LANGUAGE VOICES)
// -----------------------------------------------------------------------------
let currentUtterance = null;
let currentSentenceQueue = [];
let isQueuePlaying = false;
let currentAudioElement = null;

export const stopSpeech = () => {
  currentSentenceQueue = [];
  isQueuePlaying = false;

  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
};

export const isSpeaking = () => {
  if (currentAudioElement && !currentAudioElement.paused) return true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
};

/**
 * Single utterance speaker with boundary detection
 */
export const speakUtterance = (text, language = 'en', { onStart, onEnd, onBoundary, onError, pauseMs = 120 } = {}) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onError) onError(new Error('Speech Synthesis not supported by this browser.'));
    return;
  }

  stopSpeech();

  if (!text || !text.trim()) return;

  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;

  const langCode = language === 'hi' ? 'hi-IN' : language === 'kn' ? 'kn-IN' : 'en-IN';
  utterance.lang = langCode;
  utterance.rate = 0.98;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices() || [];
  const matchedVoice = voices.find(v => v.lang.startsWith(langCode.slice(0, 2)) || v.lang === langCode);
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = () => {
    currentUtterance = null;
    onEnd();
  };
  if (onError) utterance.onerror = (e) => {
    currentUtterance = null;
    if (onError) onError(e);
  };
  if (onBoundary) {
    utterance.onboundary = onBoundary;
  }

  window.speechSynthesis.speak(utterance);
};

/**
 * Premium Sentence Queue Streaming Player:
 * Starts speaking the first sentence immediately while queueing subsequent sentences.
 * Ensures natural pauses between sentences with zero awkward gaps.
 */
export const speakSentenceQueue = (sentences = [], language = 'en', { onSentenceStart, onSentenceEnd, onAllComplete, onError, pauseMs = 240 } = {}) => {
  if (!sentences || sentences.length === 0) {
    if (onAllComplete) onAllComplete();
    return;
  }

  stopSpeech();
  currentSentenceQueue = [...sentences];
  isQueuePlaying = true;

  let currentIndex = 0;

  const playNext = () => {
    if (!isQueuePlaying || currentIndex >= currentSentenceQueue.length) {
      isQueuePlaying = false;
      if (onAllComplete) onAllComplete();
      return;
    }

    const sentence = currentSentenceQueue[currentIndex];
    const index = currentIndex;

    speakUtterance(sentence, language, {
      onStart: () => {
        if (onSentenceStart) onSentenceStart(sentence, index);
      },
      onEnd: () => {
        if (onSentenceEnd) onSentenceEnd(sentence, index);
        currentIndex += 1;
        if (isQueuePlaying && currentIndex < currentSentenceQueue.length) {
          setTimeout(() => {
            if (isQueuePlaying) playNext();
          }, pauseMs);
        } else {
          isQueuePlaying = false;
          if (onAllComplete) onAllComplete();
        }
      },
      onError: (err) => {
        console.warn('Sentence speech error, attempting fallback:', err);
        // Fallback: try next sentence without crashing
        currentIndex += 1;
        if (currentIndex < currentSentenceQueue.length) {
          playNext();
        } else {
          isQueuePlaying = false;
          if (onError) onError(err);
        }
      }
    });
  };

  playNext();
};

// -----------------------------------------------------------------------------
// BROWSER SPEECH-TO-TEXT (WEB SPEECH API WITH GRACEFUL ERROR HANDLING)
// -----------------------------------------------------------------------------
export const createSpeechRecognition = ({ language = 'en', onResult, onError, onEnd, onStart }) => {
  const SpeechRecognition = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

  if (!SpeechRecognition) {
    return {
      supported: false,
      start: () => {
        if (onError) onError(new Error('Speech recognition is not supported in this browser. Please type your message.'));
      },
      stop: () => {}
    };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = language === 'hi' ? 'hi-IN' : language === 'kn' ? 'kn-IN' : 'en-IN';

  recognition.onstart = () => {
    if (onStart) onStart();
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (onResult) {
      onResult({
        final: finalTranscript,
        interim: interimTranscript,
        transcript: finalTranscript || interimTranscript
      });
    }
  };

  recognition.onerror = (event) => {
    let errorMsg = 'Microphone error occurred.';
    if (event.error === 'not-allowed') {
      errorMsg = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
    } else if (event.error === 'no-speech') {
      errorMsg = 'No speech was detected. Please try speaking again.';
    } else if (event.error === 'network') {
      errorMsg = 'Network error during speech recognition.';
    }
    if (onError) onError(new Error(errorMsg), event.error);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  return {
    supported: true,
    start: () => {
      try {
        recognition.start();
      } catch (err) {
        // already started or aborted
      }
    },
    stop: () => {
      try {
        recognition.stop();
      } catch (err) {}
    }
  };
};
