import { useEffect, useCallback } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useRecitationWorker } from './useRecitationWorker';
import { useStuckDetection } from './useStuckDetection';

export const useRecitationCheck = (
  isActive,
  expectedText,
  onAutoFinish,
  accuracyThreshold = 100,
  ayahWordCounts = [],
  onStuck = null,
  interruptHint = null,
  onUserSpeechAfterHint = null,
) => {
  const {
    clearStuckTimer,
    clearSilenceTimer,
    restartStuckTimer,
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
  } = useStuckDetection({
    onStuck,
    interruptHint,
    onAutoFinish,
    threshold: accuracyThreshold,
    ayahWordCounts,
  });

  // ── useSpeechRecognition MUST come before useRecitationWorker ─────────────
  // transcriptRef is passed into the worker's triggerHint closure, so it must
  // exist before the worker effect captures it. Callbacks are defined after
  // both hooks; they read transcriptRef.current (always fresh, no stale closure).
  const onResultCallback = useCallback((combined) => {
    if (combined) dispatchLiveCompare(combined);
    restartStuckTimer(transcriptRef, setLiveResults);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatchLiveCompare, restartStuckTimer]);

  const onSpeechStartCallback = useCallback(() => {
    clearStuckTimer();
    clearSilenceTimer();
    if (interruptHintRef.current) interruptHintRef.current();
  }, [clearStuckTimer, clearSilenceTimer, interruptHintRef]);

  const onSpeechEndCallback = useCallback(() => {
    // Use transcriptRef.current — always the latest value, no stale closure risk.
    restartStuckTimer(transcriptRef, setLiveResults);
    clearSilenceTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartStuckTimer, clearSilenceTimer]);

  const {
    isSupported,
    isListening,
    transcript,
    transcriptRef,
    startListening: startSTT,
    stopRecognition,
    pauseRecognition,
    resumeRecognition,
    setIsListening,
    setTranscript
  } = useSpeechRecognition({
    onResult: onResultCallback,
    onSpeechStart: onSpeechStartCallback,
    onSpeechEnd: onSpeechEndCallback,
  });

  const {
    liveResults,
    setLiveResults,
    results,
    dispatchLiveCompare,
    dispatchFinalCompare,
    clearWorkerResults,
    pendingIdRef,
    workerCompletedIdRef,
    liveDebounceRef
  } = useRecitationWorker({
    expectedText,
    ayahWordCounts,
    threshold: accuracyThreshold,
    hintedVerseIndexRef,
    hintTranscriptSnapshotRef,
    hintPayloadSnapshotRef,
    hintPassedRef,
    // Pass transcriptRef (stable ref object) so the worker closure always reads
    // the current transcript without creating a stale-closure dependency.
    triggerHint: (idx) => triggerHint(idx, transcriptRef, setLiveResults),
    checkAutoFinish,
    latestPayloadRef
  });

  const startListening = useCallback(() => {
    clearStuckState();
    clearWorkerResults();
    if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
    startSTT();
  }, [clearStuckState, clearWorkerResults, liveDebounceRef, startSTT]);

  const stopAndCheck = useCallback(() => {
    clearStuckState();
    if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
    stopRecognition();
    dispatchFinalCompare(transcriptRef.current);
  }, [clearStuckState, liveDebounceRef, stopRecognition, dispatchFinalCompare, transcriptRef]);

  const clearResults = useCallback(() => {
    clearStuckState();
    clearWorkerResults();
  }, [clearStuckState, clearWorkerResults]);

  useEffect(() => {
    if (isActive) {
      startListening();
    } else {
      stopRecognition();
      clearStuckState();
      if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
      clearWorkerResults();
      setLiveResults(null);
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  return { 
    isSupported, 
    isListening, 
    transcript, 
    liveResults, 
    results, 
    startListening, 
    stopAndCheck, 
    clearResults,
    pauseRecognition,
    resumeRecognition,
    notifyHintEnded,
  };
};
