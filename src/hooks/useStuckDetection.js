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




  const triggerHint = useCallback((verseIndex) => {
    if (!onStuckRef.current || isHintPlayingRef.current || hintedVerseIndexRef.current === verseIndex) return;

    clearStuckTimer();
    isHintPlayingRef.current = true;
    hintPassedRef.current = false;
    hintedVerseIndexRef.current = verseIndex;

    onStuckRef.current(verseIndex);
  }, [clearStuckTimer]);

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
    isHintPlayingRef
  };
};
