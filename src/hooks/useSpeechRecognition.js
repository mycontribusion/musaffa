import { useState, useRef, useCallback, useEffect } from 'react';

const DEBUG = true;
const log = (...args) => { if (DEBUG) console.log('[SpeechRecognition]', ...args); };

const getSpeechRecognition = () =>
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const mergeTranscripts = (oldText, newText) => {
  const oldWords = oldText.trim().split(/\s+/).filter(Boolean);
  const newWords = newText.trim().split(/\s+/).filter(Boolean);
  
  if (oldWords.length === 0) return newText;
  if (newWords.length === 0) return oldText;
  
  let maxOverlap = 0;
  const maxPossible = Math.min(oldWords.length, newWords.length);
  
  for (let i = 1; i <= maxPossible; i++) {
    let match = true;
    for (let j = 0; j < i; j++) {
      if (oldWords[oldWords.length - i + j] !== newWords[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      maxOverlap = i;
    }
  }
  
  const mergedWords = [...oldWords, ...newWords.slice(maxOverlap)];
  return mergedWords.join(' ') + ' ';
};

// ── STT Status enum ─────────────────────────────────────────────────────────
// 'idle'     — not started / stopped normally
// 'starting' — startListening() called, awaiting recognition.onstart
// 'listening'— recognition.onstart fired; actively listening
// 'paused'   — pauseRecognition() called (e.g. hint audio playing)
// 'failed'   — recognition died unexpectedly with no recovery

const STARTUP_TIMEOUT_MS = 5000; // Safety: 'starting' → 'failed' if onstart never fires
const RETRY_DELAY_MS     = 500;  // One auto-retry before surfacing 'failed'

export const useSpeechRecognition = ({
  onResult,
  onSpeechStart,
  onSpeechEnd,
  onEnd,
}) => {
  const SR = getSpeechRecognition();
  const isSupported = !!SR;

  const [sttStatus, setSttStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef       = useRef(null);
  const transcriptRef        = useRef('');
  const hasSpeechRef         = useRef(false);
  const startupTimerRef      = useRef(null);
  const retryTimerRef        = useRef(null);
  const onResultRef          = useRef(onResult);
  const onSpeechStartRef     = useRef(onSpeechStart);
  const onSpeechEndRef       = useRef(onSpeechEnd);
  const onEndRef             = useRef(onEnd);

  // Keep callback refs fresh without recreating the recognition instance
  useEffect(() => { onResultRef.current    = onResult;     }, [onResult]);
  useEffect(() => { onSpeechStartRef.current = onSpeechStart; }, [onSpeechStart]);
  useEffect(() => { onSpeechEndRef.current = onSpeechEnd;  }, [onSpeechEnd]);
  useEffect(() => { onEndRef.current       = onEnd;        }, [onEnd]);

  // ── Derived bool for any caller that only needs "is actively listening" ──
  const isListening = sttStatus === 'listening';

  const _clearStartupTimer = () => {
    if (startupTimerRef.current) {
      clearTimeout(startupTimerRef.current);
      startupTimerRef.current = null;
    }
  };

  const _clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  // ── Core: build and wire a fresh SpeechRecognition instance ─────────────
  const _createAndStart = useCallback((statusOnSuccess = 'starting') => {
    if (!isSupported) return;

    _clearStartupTimer();
    _clearRetryTimer();

    // Abort any previous instance cleanly
    if (recognitionRef.current) {
      try { recognitionRef.current._shouldRestart = false; recognitionRef.current.abort(); } catch (_) {}
    }

    const recognition = new SR();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition._shouldRestart = true;

    // ── onstart: first sign of life → transition to 'listening' ──────────
    recognition.onstart = () => {
      _clearStartupTimer();
      setSttStatus('listening');
    };

    recognition.onresult = (event) => {
      let currentFinal = '';
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          currentFinal += chunk + ' ';
        } else {
          currentInterim += chunk + ' ';
        }
      }
      if (currentFinal) {
        transcriptRef.current = mergeTranscripts(transcriptRef.current, currentFinal);
      }
      const combined = mergeTranscripts(transcriptRef.current, currentInterim).trim();
      setTranscript(combined);
      if (onResultRef.current) onResultRef.current(combined);
    };

    recognition.onspeechstart = () => {
      hasSpeechRef.current = true;
      if (onSpeechStartRef.current) onSpeechStartRef.current();
    };

    recognition.onspeechend = () => {
      hasSpeechRef.current = true;
      if (onSpeechEndRef.current) onSpeechEndRef.current();
    };

    recognition.onend = () => {
      log('onend fired, _shouldRestart:', recognition._shouldRestart, 'current status:', sttStatus);
      _clearStartupTimer();

      if (recognition._shouldRestart) {
        // Keep-alive: try to restart immediately
        try {
          recognition.start();
          // Don't change status — still 'listening' from onstart
        } catch (_) {
          // start() failed — schedule one retry after RETRY_DELAY_MS
          retryTimerRef.current = setTimeout(() => {
            try {
              recognition.start();
            } catch (_2) {
              // Both attempts failed → surface 'failed'
              setSttStatus('failed');
              if (onEndRef.current) onEndRef.current();
            }
          }, RETRY_DELAY_MS);
        }
      } else {
        // Intentional stop — check current status via ref so we don't clobber 'paused'
        setSttStatus(prev => {
          if (prev === 'paused') {
            log('onend: status was paused, keeping paused');
            return 'paused'; // Hint is playing; don't change
          }
          log('onend: setting status to idle');
          return 'idle';
        });
        if (onEndRef.current) onEndRef.current();
      }
    };

    recognition.onerror = (e) => {
      // 'no-speech' is not a real error — let onend handle restart
      if (e.error === 'no-speech') return;
      // 'aborted' is intentional (from abort()/stop()) — don't mark as failed
      if (e.error === 'aborted') return;
      // Anything else (network, not-allowed, service-not-allowed, …) → failed
      _clearStartupTimer();
      _clearRetryTimer();
      recognition._shouldRestart = false;
      setSttStatus('failed');
      if (onEndRef.current) onEndRef.current();
    };

    recognitionRef.current = recognition;

    // Set 'starting' now; onstart will move it to 'listening'
    setSttStatus(statusOnSuccess);

    // 5-second safety: if onstart never fires (Android WebView bug) → 'failed'
    startupTimerRef.current = setTimeout(() => {
      setSttStatus(prev => {
        if (prev === 'starting') {
          recognition._shouldRestart = false;
          try { recognition.abort(); } catch (_) {}
          return 'failed';
        }
        return prev;
      });
    }, STARTUP_TIMEOUT_MS);

    try {
      recognition.start();
    } catch (e) {
      _clearStartupTimer();
      console.warn('Could not start STT:', e);
      setSttStatus('failed');
    }
  }, [isSupported, SR]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public API ───────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    transcriptRef.current = '';
    hasSpeechRef.current  = false;
    setTranscript('');
    _createAndStart('starting');
  }, [_createAndStart]);

  const stopRecognition = useCallback(() => {
    _clearStartupTimer();
    _clearRetryTimer();
    if (recognitionRef.current) {
      recognitionRef.current._shouldRestart = false;
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setSttStatus('idle');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pauseRecognition = useCallback(() => {
    log('pauseRecognition');
    _clearStartupTimer();
    _clearRetryTimer();
    if (recognitionRef.current) {
      recognitionRef.current._shouldRestart = false;
      setSttStatus('paused'); // Set BEFORE stop() so onend sees 'paused' and doesn't clobber
      try { recognitionRef.current.stop(); } catch (_) {}
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resumeRecognition = useCallback((isActive) => {
    log('resumeRecognition called, isActive:', isActive);
    if (!isActive) {
      console.warn('[SpeechRecognition] resumeRecognition called without isActive — recognition will NOT resume!');
      return;
    }
    // Recreate the instance — reusing a stopped instance is the Web Speech dead-state bug
    _createAndStart('starting');
  }, [_createAndStart]);

  const abortRecognition = useCallback(() => {
    _clearStartupTimer();
    _clearRetryTimer();
    if (recognitionRef.current) {
      recognitionRef.current._shouldRestart = false;
      try { recognitionRef.current.abort(); } catch (_) {}
    }
    setSttStatus('idle');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isSupported,
    sttStatus,
    isListening,            // derived: sttStatus === 'listening'
    transcript,
    transcriptRef,
    hasSpeechRef,
    startListening,
    stopRecognition,
    pauseRecognition,
    resumeRecognition,
    abortRecognition,
    setSttStatus,
    setTranscript,
  };
};
