import { useRef, useCallback, useEffect } from 'react';

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


  const triggerHint = useCallback((verseIndex, transcriptRef, setLiveResults) => {
    if (!onStuckRef.current || isHintPlayingRef.current || hintedVerseIndexRef.current === verseIndex) return;

    clearStuckTimer();
    isHintPlayingRef.current = true;
    hintPassedRef.current = false;

    const resetPayload = resetVerseInPayload(latestPayloadRef.current, verseIndex, ayahWordCounts);
    setLiveResults(resetPayload);

    hintedVerseIndexRef.current = verseIndex;
    hintTranscriptSnapshotRef.current = transcriptRef.current;
    hintPayloadSnapshotRef.current = latestPayloadRef.current;

    onStuckRef.current(verseIndex);
  }, [clearStuckTimer, ayahWordCounts, resetVerseInPayload]);

  const notifyHintEnded = useCallback(() => {
    isHintPlayingRef.current = false;
  }, []);
  
  const clearStuckState = useCallback(() => {
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
