import { useState, useEffect, useRef, useCallback } from 'react';

const getSpeechRecognition = () =>
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

// Helper to cleanly merge Android's cumulative STT chunks
const mergeTranscripts = (oldText, newText) => {
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
export const useRecitationCheck = (isActive, expectedText, onAutoFinish, accuracyThreshold = 100, ayahWordCounts = []) => {
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
  const thresholdRef = useRef(accuracyThreshold);
  const workerRef = useRef(null);          // Web Worker instance
  const pendingIdRef = useRef(0);          // track latest request to discard stale results

  // Keep refs in sync without restarting recognition
  useEffect(() => { expectedRef.current = expectedText; }, [expectedText]);
  useEffect(() => { onAutoFinishRef.current = onAutoFinish; }, [onAutoFinish]);
  useEffect(() => { thresholdRef.current = accuracyThreshold; }, [accuracyThreshold]);
  const ayahWordCountsRef = useRef(ayahWordCounts);
  useEffect(() => { ayahWordCountsRef.current = ayahWordCounts; }, [ayahWordCounts]);

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

        // Smart auto-finish: evaluate if the user has completed the turn.
        // Requirements (Smart Musaffa mode):
        //   1. All words must be read  — no 'pending' words remain
        //   2. The configured accuracy threshold must be met (slider min is 50%, so
        //      a 50% floor is already enforced by the UI — no separate check needed)
        //   3. The last word of the chunk must be correct (smart anchor)
        if (payload && payload.results && payload.results.length > 0) {
          const { smartAnchorHit, preBlockAccuracy, preBlockHasPending, perVerseMinMet } = payload;
          
          const allWordsRead   = !preBlockHasPending;                       // every word attempted
          const meetsThreshold = preBlockAccuracy >= thresholdRef.current;  // user's chosen %
          const verseFloorMet  = perVerseMinMet !== false;                  // each ayah ≥50% correct

          if (allWordsRead && meetsThreshold && smartAnchorHit && verseFloorMet) {
            if (silenceTimerRef.current) {
               clearTimeout(silenceTimerRef.current);
               silenceTimerRef.current = null;
            }
            // Short celebratory delay (300ms) so user sees the full green before turn switches
            silenceTimerRef.current = setTimeout(() => {
              if (onAutoFinishRef.current) {
                onAutoFinishRef.current();
              }
            }, 300);
          }
        }
      } else if (type === 'RESULT_FINAL' && id === pendingIdRef.current) {
        setResults(payload);
        setLiveResults(payload);
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
        ayahWordCounts: ayahWordCountsRef.current,
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
      hasSpeechRef.current = true;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
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

    // Final comparison: offloaded to the worker to ensure it uses the exact
    // same DP math and threshold checks as the live overlay.
    if (workerRef.current && expectedRef.current) {
      const id = ++pendingIdRef.current;
      workerRef.current.postMessage({
        type: 'COMPARE_FINAL',
        expected: expectedRef.current,
        spoken: transcriptRef.current.trim(),
        id,
        ayahWordCounts: ayahWordCountsRef.current,
      });
    }
  }, []);

  // ── Clear for next turn ────────────────────────────────────────────────────
  const clearResults = useCallback(() => {
    pendingIdRef.current++; // Discard any pending worker messages
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
      // Clear live results when turn switches away from user (prevents lingering state)
      setLiveResults(null);
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
