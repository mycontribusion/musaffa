import { useEffect, useCallback, useRef } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useRecitationWorker } from './useRecitationWorker';
import { useStuckDetection } from './useStuckDetection';

const DEBUG = true;
const log = (...args) => { if (DEBUG) console.log('[RecitationCheck]', ...args); };

export const useRecitationCheck = (
  isActive,
  expectedText,
  onAutoFinish,
  accuracyThreshold = 100,
  ayahWordCounts = [],
  onStuck = null,
  interruptHint = null,
  turn = 'user',
) => {
  const {
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
  } = useStuckDetection({
    onStuck,
    interruptHint,
    onAutoFinish,
    threshold: accuracyThreshold,
    ayahWordCounts,
    turn,
  });

  // ── useSpeechRecognition MUST come before useRecitationWorker ─────────────
  // transcriptRef is passed into the worker's triggerHint closure, so it must
  // exist before the worker effect captures it. Callbacks are defined after
  // both hooks; they read transcriptRef.current (always fresh, no stale closure).
  const dispatchLiveCompareRef = useRef(null);

  // Track previous frontier (lastMatchedExpIdx) to detect verse boundary crossings
  const prevLastMatchedExpIdxRef = useRef(-1);

  const onResultCallback = useCallback((combined) => {
    log('onResult, length:', combined?.length);
    if (combined) dispatchLiveCompareRef.current?.(combined);
    restartStuckTimer(transcriptRef, setLiveResults);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartStuckTimer]);

  const onSpeechStartCallback = useCallback(() => {
    log('onSpeechStart');
    clearStuckTimer();
    clearSilenceTimer();
    // NOTE: Do NOT interrupt the hint here. The hint should keep playing for
    // the full 3 seconds even if the user speaks. The decision to stop the
    // hint is made after the 3-second window in PartnerSession.handleStuck.
  }, [clearStuckTimer, clearSilenceTimer]);

  const onSpeechEndCallback = useCallback(() => {
    log('onSpeechEnd');
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

  dispatchLiveCompareRef.current = dispatchLiveCompare;

  const startListening = useCallback(() => {
    log('startListening');
    clearStuckState();
    clearWorkerResults();
    if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
    startSTT();
  }, [clearStuckState, clearWorkerResults, liveDebounceRef, startSTT]);

  const stopAndCheck = useCallback(() => {
    log('stopAndCheck');
    clearStuckState();
    if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
    stopRecognition();
    dispatchFinalCompare(transcriptRef.current);
  }, [clearStuckState, liveDebounceRef, stopRecognition, dispatchFinalCompare, transcriptRef]);

  const clearResults = useCallback(() => {
    log('clearResults');
    clearStuckState();
    clearWorkerResults();
  }, [clearStuckState, clearWorkerResults]);

  useEffect(() => {
    if (isActive) {
      startListening();
    } else {
      log('isActive became false, stopping');
      stopRecognition();
      clearStuckState();
      if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
      clearWorkerResults();
      setLiveResults(null);
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Immediate Verse-Boundary Accuracy Gate ─────────────────────────────
  // When liveResults updates, check if the frontier (lastMatchedExpIdx) has
  // reached or crossed the boundary of the current verse. If the verse is
  // fully completed by speech but its accuracy is below the threshold,
  // immediately fire the audio hint interrupt — do NOT wait for the stuck
  // timer (4.5s–9s) or silence detection.
  useEffect(() => {
    if (!liveResults?.verseStats || liveResults.verseStats.length === 0 || liveResults.lastMatchedExpIdx === undefined) {
      prevLastMatchedExpIdxRef.current = -1;
      return;
    }

    // Guard: only trigger hints during the user's turn
    if (turn !== 'user') {
      prevLastMatchedExpIdxRef.current = liveResults.lastMatchedExpIdx;
      return;
    }

    const currentFrontier = liveResults.lastMatchedExpIdx;
    const prevFrontier = prevLastMatchedExpIdxRef.current;

    for (let i = 0; i < liveResults.verseStats.length; i++) {
      const stat = liveResults.verseStats[i];
      const wordCount = ayahWordCounts[i] || 0;

      // Skip ayahs with no words
      if (wordCount === 0) continue;

      // Compute the word index of the last word in this verse
      let verseEndIdx = -1;
      let wordOffset = 0;
      for (let j = 0; j <= i; j++) {
        wordOffset += ayahWordCounts[j] || 0;
      }
      verseEndIdx = wordOffset - 1;

      // Frontier crossed this verse boundary
      const crossedBoundary = prevFrontier < verseEndIdx && currentFrontier >= verseEndIdx;
      const belowThreshold = stat.accuracy < accuracyThreshold;

      if (crossedBoundary && belowThreshold) {
        log('Boundary gate: verse', i, 'frontier crossed boundary (', prevFrontier, '->', currentFrontier, ') but accuracy', stat.accuracy, '% < threshold', accuracyThreshold, '— triggering hint immediately');
        triggerHint(i, transcriptRef, setLiveResults);
      }
    }

    prevLastMatchedExpIdxRef.current = currentFrontier;
  }, [liveResults, accuracyThreshold, ayahWordCounts, triggerHint, transcriptRef, setLiveResults, turn]);

  // Wrap notifyHintEnded so that when a hint finishes we immediately restart
  // the stuck timer. Without this, if the user stays silent after the hint,
  // the timer never fires again and the app appears stuck.
  const wrappedNotifyHintEnded = useCallback(() => {
    notifyHintEnded();
    restartStuckTimerExported(transcriptRef, setLiveResults);
  }, [notifyHintEnded, restartStuckTimerExported, transcriptRef, setLiveResults]);

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
    notifyHintEnded: wrappedNotifyHintEnded,
    dispatchFinalCompare,
  };
};
