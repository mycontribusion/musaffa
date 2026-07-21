import { useRef, useCallback, useEffect } from 'react';

const DEBUG = true;
const log = (...args) => { if (DEBUG) console.log('[StuckDetection]', ...args); };

export const useStuckDetection = ({
  onStuck,
  interruptHint,
  onAutoFinish,
  threshold,
  ayahWordCounts,
}) => {
  const stuckTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const latestVerseStatsRef = useRef(null);
  const latestPayloadRef = useRef(null);
  const onStuckRef = useRef(onStuck);
  const interruptHintRef = useRef(interruptHint);
  const onAutoFinishRef = useRef(onAutoFinish);
  
  const hintedVerseIndexRef = useRef(null);
  const hintTranscriptSnapshotRef = useRef('');
  const hintPayloadSnapshotRef = useRef(null);
  const isHintPlayingRef = useRef(false);
  const hintPassedRef = useRef(false);

  useEffect(() => { onStuckRef.current = onStuck; }, [onStuck]);
  useEffect(() => { interruptHintRef.current = interruptHint; }, [interruptHint]);
  useEffect(() => { onAutoFinishRef.current = onAutoFinish; }, [onAutoFinish]);

  const clearStuckTimer = useCallback(() => {
    if (stuckTimerRef.current) {
      clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
    }
  }, []);
  
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const resetVerseInPayload = useCallback((payload, hintedVerseIndex, counts) => {
    if (!payload || !payload.results || !counts || counts.length === 0) return payload;
    
    const newResults = [...payload.results];
    let wordOffset = 0;
    for (let i = 0; i < hintedVerseIndex; i++) wordOffset += counts[i] || 0;
    const verseWordCount = counts[hintedVerseIndex] || 0;
    
    for (let i = wordOffset; i < wordOffset + verseWordCount && i < newResults.length; i++) {
      newResults[i] = { ...newResults[i], status: 'pending', spokenWord: null };
    }
    
    let wordIdx = 0;
    const newVerseStats = [];
    for (let idx = 0; idx < counts.length; idx++) {
      const count = counts[idx];
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
      
      newVerseStats.push({ index: idx, accuracy: verseAccuracy, hasPending, hasStarted });
      wordIdx += count;
    }
    
    const correct = newResults.filter(r => r.status === 'correct').length;
    const total = newResults.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;
    
    return { ...payload, results: newResults, verseStats: newVerseStats, accuracy };
  }, []);

  const restartStuckTimer = useCallback((transcriptRef, setLiveResults) => {
    clearStuckTimer();

    // ── Adaptive silence threshold ─────────────────────────────────────────
    // Short verses (e.g. Al-Fatiha 1) need only 4.5s; dense multi-verse
    // chunks (e.g. Al-Baqarah page) should allow up to 9s before firing.
    const totalWords = ayahWordCounts.reduce((sum, n) => sum + n, 0);
    const STUCK_MS = Math.min(9000, Math.max(4500, totalWords * 500));

    stuckTimerRef.current = setTimeout(() => {
      const payload = latestPayloadRef.current;
      if (!payload || !onStuckRef.current) {
        log('Stuck timer fired but no payload or onStuck');
        return;
      }

      // ── Frontier-based stuck verse detection ───────────────────────────
      // Use the DP's lastMatchedExpIdx (word-level) rather than inferring
      // the stuck verse from per-verse booleans. This is immune to
      // shared-word ambiguity (e.g. "الله", "كلا", mutashabihat) where the
      // DP can credit verse N+1's slots with words spoken in verse N.
      const frontier = payload.lastMatchedExpIdx ?? -1;
      const totalExpected = payload.results?.length ?? 0;

      // Nothing pending after the frontier → user has finished
      if (totalExpected === 0 || frontier >= totalExpected - 1) {
        log('Stuck timer fired but user has finished');
        return;
      }

      // Find which verse contains the first unmatched word (frontier + 1)
      const firstPendingWordIdx = frontier + 1;
      let stuckVerseIndex = -1;
      let wordOffset = 0;
      for (let i = 0; i < ayahWordCounts.length; i++) {
        wordOffset += ayahWordCounts[i];
        if (firstPendingWordIdx < wordOffset) {
          stuckVerseIndex = i;
          break;
        }
      }
      if (stuckVerseIndex === -1) {
        log('Stuck timer fired but no stuck verse found');
        return;
      }

      // Only fire if the stuck verse is actually below threshold
      const verseStat = latestVerseStatsRef.current?.[stuckVerseIndex];
      if (!verseStat || verseStat.accuracy >= threshold) {
        log('Stuck timer fired but verse accuracy is above threshold:', verseStat?.accuracy);
        return;
      }

      // Standard guards: no duplicate hints for same verse, none already playing
      if (isHintPlayingRef.current) {
        log('Stuck timer fired but hint is already playing');
        return;
      }
      if (hintedVerseIndexRef.current === stuckVerseIndex) {
        log('Stuck timer fired but already hinted this verse');
        return;
      }

      log('Stuck timer firing hint for verse:', stuckVerseIndex);
      isHintPlayingRef.current = true;
      hintPassedRef.current = false;

      const resetPayload = resetVerseInPayload(payload, stuckVerseIndex, ayahWordCounts);
      setLiveResults(resetPayload);

      hintedVerseIndexRef.current = stuckVerseIndex;
      hintTranscriptSnapshotRef.current = transcriptRef.current;
      onStuckRef.current(stuckVerseIndex);
    }, STUCK_MS);
  }, [clearStuckTimer, threshold, ayahWordCounts, resetVerseInPayload]);

  const triggerHint = useCallback((verseIndex, transcriptRef, setLiveResults) => {
    if (!onStuckRef.current) {
      log('triggerHint called but no onStuck');
      return;
    }
    if (isHintPlayingRef.current) {
      log('triggerHint called but hint already playing, verse:', verseIndex);
      return;
    }
    if (hintedVerseIndexRef.current === verseIndex) {
      log('triggerHint called but already hinted this verse:', verseIndex);
      return;
    }

    log('triggerHint firing for verse:', verseIndex, 'transcriptRef is null:', transcriptRef === null);
    clearStuckTimer();
    isHintPlayingRef.current = true;
    hintPassedRef.current = false;

    const resetPayload = resetVerseInPayload(latestPayloadRef.current, verseIndex, ayahWordCounts);
    setLiveResults(resetPayload);

    hintedVerseIndexRef.current = verseIndex;
    hintTranscriptSnapshotRef.current = transcriptRef?.current ?? '';
    hintPayloadSnapshotRef.current = latestPayloadRef.current;

    onStuckRef.current(verseIndex);
  }, [clearStuckTimer, ayahWordCounts, resetVerseInPayload]);

  const notifyHintEnded = useCallback(() => {
    log('notifyHintEnded called, hintedVerseIndex:', hintedVerseIndexRef.current);
    isHintPlayingRef.current = false;
  }, []);

  // Expose a restart function so the parent hook can restart the stuck timer
  // when a hint ends (so the user gets another hint if still stuck).
  const restartStuckTimerExported = useCallback((transcriptRef, setLiveResults) => {
    restartStuckTimer(transcriptRef, setLiveResults);
  }, [restartStuckTimer]);
  
  const clearStuckState = useCallback(() => {
    log('clearStuckState called');
    clearStuckTimer();
    clearSilenceTimer();
    hintedVerseIndexRef.current = null;
    hintTranscriptSnapshotRef.current = '';
    hintPayloadSnapshotRef.current = null;
    hintPassedRef.current = false;
    isHintPlayingRef.current = false;
  }, [clearStuckTimer, clearSilenceTimer]);

  const checkAutoFinish = useCallback((processedPayload) => {
    if (processedPayload && processedPayload.results && processedPayload.results.length > 0) {
      const { verseStats } = processedPayload;
      latestVerseStatsRef.current = verseStats;
      
      const allPassed = verseStats && verseStats.length > 0 && verseStats.every(stat =>
        stat.accuracy >= threshold && !stat.hasPending
      );

      if (allPassed) {
        log('checkAutoFinish: all verses passed');
        clearStuckTimer();
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          if (onAutoFinishRef.current) onAutoFinishRef.current();
        }, 300);
      }
    }
  }, [threshold, clearStuckTimer, clearSilenceTimer]);

  return {
    clearStuckTimer,
    clearSilenceTimer,
    restartStuckTimer,
    restartStuckTimerExported,
    triggerHint,
    notifyHintEnded,
    clearStuckState,
    checkAutoFinish,
    latestPayloadRef,
    latestVerseStatsRef,
    silenceTimerRef,
    interruptHintRef,
    hintedVerseIndexRef,
    hintTranscriptSnapshotRef,
    hintPayloadSnapshotRef,
    hintPassedRef,
    isHintPlayingRef,
    resetVerseInPayload
  };
};
