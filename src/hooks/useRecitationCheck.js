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
    triggerHint: (idx) => triggerHint(idx, { current: transcript }, setLiveResults),
    checkAutoFinish,
    latestPayloadRef
  });
  
  // Connect the refs between stuck detection and worker
  useEffect(() => {
    // This is a hacky workaround to connect refs across hooks
    // but it allows the hooks to be decoupled logically
    latestPayloadRef.current = liveResults;
  }, [liveResults, latestPayloadRef]);

  const onResultCallback = useCallback((combined) => {
    if (combined) dispatchLiveCompare(combined);
    restartStuckTimer({ current: combined }, setLiveResults);
  }, [dispatchLiveCompare, restartStuckTimer, setLiveResults]);

  const onSpeechStartCallback = useCallback(() => {
    clearStuckTimer();
    clearSilenceTimer();
    if (interruptHintRef.current) interruptHintRef.current();
  }, [clearStuckTimer, clearSilenceTimer, interruptHintRef]);

  const onSpeechEndCallback = useCallback(() => {
    restartStuckTimer({ current: transcript }, setLiveResults);
    clearSilenceTimer();
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
  
  // Re-bind the restartStuckTimer's internal usage of transcriptRef since it needs to read latest
  // Actually, we pass the transcript explicitly from onResult and onSpeechEnd.

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
