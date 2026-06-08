import { useState, useEffect, useRef, useCallback } from 'react';
import { compareRecitation } from '../utils/quranUtils';

const getSpeechRecognition = () =>
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

/** Silence duration (ms) after onspeechend before auto-finish fires */
const AUTO_FINISH_DELAY = 1800;

/** Debounce for live worker comparisons (ms) — keeps worker queue light */
const LIVE_DEBOUNCE = 350;

/**
 * useRecitationCheck — Arabic speech-to-text hook for Musaffa error detection.
 *
 * @param {boolean}  isActive      - Start listening when true.
 * @param {string}   expectedText  - Canonical Arabic text for current chunk.
 * @param {Function} onAutoFinish  - Called automatically after the user goes
 *                                   silent (post-speech), so the turn can
 *                                   advance without a manual tap.
 *
 * Returns:
 *   isSupported   — false on Firefox / Safari
 *   isListening   — currently capturing
 *   transcript    — accumulated raw STT output
 *   liveResults   — word-level comparison updated live (via Web Worker)
 *   results       — final word-level comparison after stopAndCheck()
 *   startListening()
 *   stopAndCheck()  — stop recognition and run final comparison
 *   clearResults()  — reset for next turn
 */
export const useRecitationCheck = (isActive, expectedText, onAutoFinish) => {
  const SR = getSpeechRecognition();
  const isSupported = !!SR;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [liveResults, setLiveResults] = useState(null);  // updated live via worker
  const [results, setResults] = useState(null);           // set only on stopAndCheck

  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const expectedRef = useRef(expectedText);
  const silenceTimerRef = useRef(null);    // auto-finish grace timer
  const liveDebounceRef = useRef(null);    // debounce for worker dispatches
  const hasSpeechRef = useRef(false);      // guard: only auto-finish after speech started
  const onAutoFinishRef = useRef(onAutoFinish);
  const workerRef = useRef(null);          // Web Worker instance
  const pendingIdRef = useRef(0);          // track latest request to discard stale results

  // Keep refs in sync without restarting recognition
  useEffect(() => { expectedRef.current = expectedText; }, [expectedText]);
  useEffect(() => { onAutoFinishRef.current = onAutoFinish; }, [onAutoFinish]);

  // ── Web Worker lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/recitationWorker.js', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = (event) => {
      const { type, payload, id } = event.data;
      if (type === 'RESULT' && id === pendingIdRef.current) {
        setLiveResults(payload);

        // Smart finish auto-detection: when all expected words have been resolved (not pending)
        if (payload && payload.results && payload.results.length > 0) {
          const allResolved = payload.results.every(r => r.status !== 'pending');
          if (allResolved) {
            // Cancel any pending silence timer so we don't double-trigger
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
            // Auto finish immediately with a small delay for user satisfaction / smooth transition
            silenceTimerRef.current = setTimeout(() => {
              if (recognitionRef.current?._shouldRestart && onAutoFinishRef.current) {
                onAutoFinishRef.current();
              }
            }, 600);
          }
        }
      }
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // ── Dispatch live comparison to worker (debounced) ─────────────────────────
  const dispatchLiveCompare = useCallback((spoken) => {
    if (!workerRef.current || !expectedRef.current) return;
    if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
    liveDebounceRef.current = setTimeout(() => {
      const id = ++pendingIdRef.current;
      workerRef.current.postMessage({
        type: 'COMPARE',
        expected: expectedRef.current,
        spoken,
        id,
      });
    }, LIVE_DEBOUNCE);
  }, []);

  // ── Start listening ─────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!isSupported) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);

    transcriptRef.current = '';
    hasSpeechRef.current = false;
    setTranscript('');
    setLiveResults(null);
    setResults(null);

    const recognition = new SR();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += chunk + ' ';
        } else {
          interim += chunk;
        }
      }
      if (final) transcriptRef.current += final;
      const combined = (transcriptRef.current + interim).trim();
      setTranscript(combined);

      // Dispatch to worker for live word overlay — non-blocking
      if (combined) dispatchLiveCompare(combined);
    };

    // ── Silence detection ──────────────────────────────────────────────────
    recognition.onspeechstart = () => {
      hasSpeechRef.current = true;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    recognition.onspeechend = () => {
      if (!hasSpeechRef.current) return;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (recognitionRef.current?._shouldRestart && onAutoFinishRef.current) {
          onAutoFinishRef.current();
        }
      }, AUTO_FINISH_DELAY);
    };
    // ──────────────────────────────────────────────────────────────────────

    recognition.onend = () => {
      if (recognitionRef.current && recognitionRef.current._shouldRestart) {
        try { recognition.start(); } catch (_) {}
      } else {
        setIsListening(false);
      }
    };

    recognition._shouldRestart = true;
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.warn('Could not start STT:', e);
    }
  }, [isSupported, SR, dispatchLiveCompare]);

  // ── Stop & run final comparison ─────────────────────────────────────────────
  const stopAndCheck = useCallback(() => {
    if (!recognitionRef.current) return;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (liveDebounceRef.current) {
      clearTimeout(liveDebounceRef.current);
      liveDebounceRef.current = null;
    }
    recognitionRef.current._shouldRestart = false;
    try { recognitionRef.current.stop(); } catch (_) {}
    setIsListening(false);

    // Final comparison: run on main thread (one-shot, not live) via setTimeout
    // to let the UI update (mic stops) before the sync computation
    setTimeout(() => {
      const spoken = transcriptRef.current.trim();
      const expected = expectedRef.current || '';
      const comparison = compareRecitation(expected, spoken);
      setResults(comparison);
      setLiveResults(comparison); // Keep live overlay colored with final results during transition
    }, 0);
  }, []);

  // ── Clear for next turn ────────────────────────────────────────────────────
  const clearResults = useCallback(() => {
    setResults(null);
    setLiveResults(null);
    setTranscript('');
    transcriptRef.current = '';
  }, []);

  // ── Auto-start / stop based on isActive ────────────────────────────────────
  useEffect(() => {
    if (isActive) {
      startListening();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current._shouldRestart = false;
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setIsListening(false);
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
      if (recognitionRef.current) {
        recognitionRef.current._shouldRestart = false;
        try { recognitionRef.current.abort(); } catch (_) {}
      }
    };
  }, []);

  return { isSupported, isListening, transcript, liveResults, results, startListening, stopAndCheck, clearResults };
};
