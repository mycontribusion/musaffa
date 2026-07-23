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
  log('useRecitationCheck INIT/RENDER', { isActive, turn, expectedTextLength: expectedText?.length, ayahWordCountsLength: ayahWordCounts?.length });
  const {
    clearStuckTimer,
    clearSilenceTimer,
    triggerHint,
    notifyHintEnded,
    clearStuckState,
    checkAutoFinish,
    latestPayloadRef,
    hintedVerseIndexRef,
    hintTranscriptSnapshotRef,
    hintPayloadSnapshotRef,
    hintPassedRef,
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
    // NOTE: restartStuckTimer is disabled — silence during recitation
    // must never trigger an audio hint. Hints fire only from the
    // verse-boundary gate below when a verse is fully completed.
  }, []);

  const onSpeechStartCallback = useCallback(() => {
    log('onSpeechStart');
    clearStuckTimer();
    clearSilenceTimer();
  }, [clearStuckTimer, clearSilenceTimer]);

  const onSpeechEndCallback = useCallback(() => {
    log('onSpeechEnd');
    clearSilenceTimer();
    // NOTE: restartStuckTimer is disabled — silence during recitation
    // must never trigger an audio hint.
  }, [clearSilenceTimer]);

  const {
    isSupported,
    isListening,
    transcript,
    transcriptRef,
    startListening: startSTT,
    stopRecognition,
    pauseRecognition,
    resumeRecognition,
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
    log('useRecitationCheck isActive effect', { isActive, turn });
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

  // ── Single Strict Condition: Verse-Boundary Accuracy Gate ─────────────
  // Audio hints fire IF AND ONLY IF:
  //   1. The user's speech frontier has reached the end of a verse (100% attempted).
  //   2. The final accuracy for that completed verse is strictly below threshold.
  // This is the ONLY trigger path — silence timers and plow-ahead are disabled.
  useEffect(() => {
    log('useRecitationCheck verse-boundary effect', { hasLiveResults: !!liveResults, turn, lastMatchedExpIdx: liveResults?.lastMatchedExpIdx });
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

    // Find the highest-indexed verse whose boundary was just crossed.
    // This ensures we fire exactly once per completed verse, even if the
    // frontier jumps across multiple boundaries in a single update.
    let completedVerseIndex = -1;
    for (let i = 0; i < liveResults.verseStats.length; i++) {
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
      if (crossedBoundary) {
        completedVerseIndex = i; // Keep updating to get the highest index
      }
    }

    // Fire hint exactly once for the completed verse, if below threshold
    if (completedVerseIndex >= 0) {
      const stat = liveResults.verseStats[completedVerseIndex];
      const belowThreshold = stat.accuracy < accuracyThreshold;

      if (belowThreshold) {
        log('Boundary gate: verse', completedVerseIndex, 'frontier crossed boundary (', prevFrontier, '->', currentFrontier, ') accuracy', stat.accuracy, '% < threshold', accuracyThreshold, '— triggering hint');
        triggerHint(completedVerseIndex, transcriptRef, setLiveResults);
      }
    }

    prevLastMatchedExpIdxRef.current = currentFrontier;
  }, [liveResults, accuracyThreshold, ayahWordCounts, triggerHint, transcriptRef, setLiveResults, turn]);

  // Wrap notifyHintEnded — when a hint finishes, just release the lock.
  // The stuck timer is disabled, so there is nothing to restart.
  // The user's next spoken word will flow through the normal live-results
  // pipeline and the boundary gate will re-evaluate if needed.
  const wrappedNotifyHintEnded = useCallback(() => {
    notifyHintEnded();
  }, [notifyHintEnded]);

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
    hintedVerseIndexRef,
  };
};
