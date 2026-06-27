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
 *
 * Optional hint playback controls:
 *   isHintPlayingRef  — external ref set while a hint audio is playing
 *   onUserSpeechAfterHint — called when the user speaks after a hint finishes
 */
export const useRecitationCheck = (
  isActive,
  expectedText,
  onAutoFinish,
  accuracyThreshold = 100,
  ayahWordCounts = [],
  onStuck = null,
  hintAudioRef = null,    // external ref to the playing hint Audio object; paused on speech start
  onUserSpeechAfterHint = null,
) => {
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

  // Stuck detection refs
  const stuckTimerRef = useRef(null);
  const latestVerseStatsRef = useRef(null);
  const onStuckRef = useRef(onStuck);
  const onUserSpeechAfterHintRef = useRef(onUserSpeechAfterHint);

  // Hint tracking refs — for resetting accuracy of a specific verse
  const hintedVerseIndexRef = useRef(null);
  const hintTranscriptSnapshotRef = useRef('');
  const lastPlowedVerseIndexRef = useRef(-1);

  // Keep refs in sync without restarting recognition
  useEffect(() => { expectedRef.current = expectedText; }, [expectedText]);
  useEffect(() => { onAutoFinishRef.current = onAutoFinish; }, [onAutoFinish]);
  useEffect(() => { onStuckRef.current = onStuck; }, [onStuck]);
  useEffect(() => { onUserSpeechAfterHintRef.current = onUserSpeechAfterHint; }, [onUserSpeechAfterHint]);
  useEffect(() => { thresholdRef.current = accuracyThreshold; }, [accuracyThreshold]);
  const ayahWordCountsRef = useRef(ayahWordCounts);
  useEffect(() => { ayahWordCountsRef.current = ayahWordCounts; }, [ayahWordCounts]);

  const clearStuckTimer = useCallback(() => {
    if (stuckTimerRef.current) {
      clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
    }
  }, []);

  const restartStuckTimer = useCallback(() => {
    clearStuckTimer();
    stuckTimerRef.current = setTimeout(() => {
      const stats = latestVerseStatsRef.current;
      if (stats && stats.length > 0 && onStuckRef.current) {
        // Find the active verse index using strict sequential progression,
        // mirroring the logic in MudarasaView.jsx to prevent desyncs.
        let activeVerseIndex = 0;
        for (let i = 0; i < stats.length; i++) {
          const stat = stats[i];
          const hasStarted = stat.hasStarted !== undefined
             ? stat.hasStarted
             : !stat.hasPending; // fallback if worker hasn't reloaded yet
             
          if (hasStarted && !stat.hasPending && stat.accuracy >= thresholdRef.current) {
            activeVerseIndex = i + 1;
          } else {
            activeVerseIndex = i;
            break;
          }
        }
        if (activeVerseIndex >= stats.length) {
          activeVerseIndex = stats.length - 1;
        }

        // Find the highest-index verse with accuracy below threshold.
        // This covers both cases:
        //   1. User is stuck on the active verse (activeVerseIndex has low accuracy)
        //   2. User has moved to a later verse while a previous verse has low accuracy
        let stuckIndex = -1;
        for (let i = activeVerseIndex; i >= 0; i--) {
          if (stats[i].accuracy < thresholdRef.current) {
            stuckIndex = i;
            break;
          }
        }

        if (stuckIndex !== -1) {
          // Track the hinted verse so its accuracy can be reset when user re-recites
          hintedVerseIndexRef.current = stuckIndex;
          hintTranscriptSnapshotRef.current = transcriptRef.current;
          onStuckRef.current(stuckIndex);
        }
      }
    }, 2500); // 2.5 seconds of silence before playing hint
  }, [clearStuckTimer]);

  // Helper: reset a specific verse's stats so its accuracy restarts from zero
  const resetVerseInPayload = useCallback((payload, hintedVerseIndex, ayahWordCounts) => {
    if (!payload || !payload.results || !ayahWordCounts || ayahWordCounts.length === 0) return payload;
    
    const newResults = [...payload.results];
    
    // Find word offset for the hinted verse
    let wordOffset = 0;
    for (let i = 0; i < hintedVerseIndex; i++) {
      wordOffset += ayahWordCounts[i] || 0;
    }
    const verseWordCount = ayahWordCounts[hintedVerseIndex] || 0;
    
    // Set words in the hinted verse to 'pending' (restart from zero)
    for (let i = wordOffset; i < wordOffset + verseWordCount && i < newResults.length; i++) {
      newResults[i] = { ...newResults[i], status: 'pending', spokenWord: null };
    }
    
    // Recalculate verseStats
    let wordIdx = 0;
    const newVerseStats = [];
    for (let idx = 0; idx < ayahWordCounts.length; idx++) {
      const count = ayahWordCounts[idx];
      if (count === 0) {
        newVerseStats.push({ index: idx, accuracy: 0, hasPending: false, hasStarted: false });
        wordIdx += count;
        continue;
      }
      const verseSlice = newResults.slice(wordIdx, wordIdx + count);
      const verseCorrect = verseSlice.filter(r => r.status === 'correct').length;
      const verseAccuracy = Math.round((verseCorrect / count) * 100);
      const hasPending = verseSlice.some(r => r.status === 'pending');
      const hasStarted = verseSlice.some(r => r.status !== 'pending');
      
      newVerseStats.push({
        index: idx,
        accuracy: verseAccuracy,
        hasPending,
        hasStarted
      });
      wordIdx += count;
    }
    
    // Recalculate overall accuracy
    const correct = newResults.filter(r => r.status === 'correct').length;
    const total = newResults.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;
    
    return {
      ...payload,
      results: newResults,
      verseStats: newVerseStats,
      accuracy,
    };
  }, []);

  // ── Web Worker lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/recitationWorker.js', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = (event) => {
      const { type, payload, id } = event.data;
      if (type === 'RESULT' && id === pendingIdRef.current) {
        let processedPayload = payload;
        
        // If a hint was recently played for a verse, reset that verse's accuracy
        if (hintedVerseIndexRef.current !== null && payload && payload.results) {
          // Only reset if transcript has changed since hint was played
          if (transcriptRef.current !== hintTranscriptSnapshotRef.current) {
            processedPayload = resetVerseInPayload(
              payload, 
              hintedVerseIndexRef.current, 
              ayahWordCountsRef.current
            );
            hintedVerseIndexRef.current = null;
            hintTranscriptSnapshotRef.current = '';
          }
        }
        
        setLiveResults(processedPayload);

        // Plow-ahead detection: If the user starts reciting a future verse 
        // without passing the active verse, immediately trigger the hint for the active verse.
        let plowedAhead = false;
        const verseStats = processedPayload?.verseStats || [];
        
        let activeVerseIndex = 0;
        for (let i = 0; i < verseStats.length; i++) {
          const stat = verseStats[i];
          const hasStarted = stat.hasStarted !== undefined ? stat.hasStarted : !stat.hasPending;
          if (hasStarted && !stat.hasPending && stat.accuracy >= thresholdRef.current) {
            activeVerseIndex = i + 1;
          } else {
            activeVerseIndex = i;
            break;
          }
        }
        if (activeVerseIndex >= verseStats.length) activeVerseIndex = verseStats.length - 1;

        if (activeVerseIndex < verseStats.length) {
          for (let i = activeVerseIndex + 1; i < verseStats.length; i++) {
            const stat = verseStats[i];
            const hasStarted = stat.hasStarted !== undefined ? stat.hasStarted : !stat.hasPending;
            if (hasStarted) {
              plowedAhead = true;
              break;
            }
          }
        }

        if (plowedAhead && onStuckRef.current && lastPlowedVerseIndexRef.current !== activeVerseIndex) {
          clearStuckTimer();
          lastPlowedVerseIndexRef.current = activeVerseIndex;
          hintedVerseIndexRef.current = activeVerseIndex;
          hintTranscriptSnapshotRef.current = transcriptRef.current;
          onStuckRef.current(activeVerseIndex);
        }

        // Smart auto-finish: evaluate if the user has completed the turn.
        // Requirements (Smart Musaffa mode):
        //   1. All words must be read  — no 'pending' words remain
        //   2. The configured accuracy threshold must be met (slider min is 50%, so
        //      a 50% floor is already enforced by the UI — no separate check needed)
        //   3. The last word of the chunk must be correct (smart anchor)
        if (processedPayload && processedPayload.results && processedPayload.results.length > 0) {
          const { verseStats } = processedPayload;
          latestVerseStatsRef.current = verseStats;
          
          const allPassed = verseStats && verseStats.length > 0 && verseStats.every(stat => 
            stat.accuracy >= thresholdRef.current && !stat.hasPending
          );

          if (allPassed) {
            clearStuckTimer();
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

      restartStuckTimer();
    };

    // ── Silence detection ─────────────────────────────────────────────────────
    recognition.onspeechstart = () => {
      hasSpeechRef.current = true;
      clearStuckTimer();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      // ✔ Interrupt hint audio the instant the user begins speaking
      if (hintAudioRef && hintAudioRef.current) {
        try {
          hintAudioRef.current.pause();
          hintAudioRef.current.currentTime = 0;
        } catch (_) {}
        hintAudioRef.current = null;
      }
    };

    recognition.onspeechend = () => {
      hasSpeechRef.current = true;
      restartStuckTimer();
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
  }, [isSupported, SR, dispatchLiveCompare, restartStuckTimer, clearStuckTimer]);

  // ── Stop & run final comparison ─────────────────────────────────────────────
  const stopAndCheck = useCallback(() => {
    if (!recognitionRef.current) return;
    clearStuckTimer();
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
  }, [clearStuckTimer]);

  // ── Clear for next turn ────────────────────────────────────────────────────
  const clearResults = useCallback(() => {
    pendingIdRef.current++; // Discard any pending worker messages
    setResults(null);
    setLiveResults(null);
    clearStuckTimer();
    // Clear hint tracking refs so a previous hint doesn't accidentally reset
    // a verse on the next turn
    hintedVerseIndexRef.current = null;
    hintTranscriptSnapshotRef.current = '';
    // NOTE: transcript is intentionally NOT cleared here — it persists across
    // retries and mark-satisfied actions so the user can see what they've recited.
  }, [clearStuckTimer]);

  // ── Auto-start / stop based on isActive ────────────────────────────────────
  useEffect(() => {
    if (isActive) {
      startListening();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current._shouldRestart = false;
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      clearStuckTimer();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setIsListening(false);
      // Clear live results when turn switches away from user (prevents lingering state)
      setLiveResults(null);
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearStuckTimer();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
      if (recognitionRef.current) {
        recognitionRef.current._shouldRestart = false;
        try { recognitionRef.current.abort(); } catch (_) {}
      }
    };
  }, []);

  return { 
    isSupported, 
    isListening, 
    transcript, 
    liveResults, 
    results, 
    startListening, 
    stopAndCheck, 
    clearResults 
  };
};
