import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useRecitationWorker } from './useRecitationWorker';
import { useStuckDetection } from './useStuckDetection';
import { buildVoskGrammar, getSingleAyahGrammar } from '../utils/quranUtils';
import { computeActiveVerseIndex } from '../utils/verseProgress';

export const useRecitationCheck = (
  isActive,
  expectedText,
  onAutoFinish,
  accuracyThreshold = 100,
  ayahWordCounts = [],
  onStuck = null,
  interruptHint = null,
  onUserSpeechAfterHint = null,
  /**
   * Fired when the user has recited to the end of the portion and then gone
   * quiet. This is the exit that was missing: without it a turn could only end
   * by passing the accuracy threshold on *every* ayah, so any shortfall left
   * the session open indefinitely with no way to move on.
   */
  onTurnSettled = null,
  modelReady = false,
  modelStatus = 'idle',
  ensureModelReady = null,
  activeChunkSlice = [],
  quranSimple = null,
) => {
  // ── liveResults state is OWNED HERE, not inside useRecitationWorker ────────
  const [liveResults, setLiveResults] = useState(null);

  const {
    clearStuckTimer,
    clearSilenceTimer,
    armStuckTimer,
    armSettleTimer,
    notifyHintEnded,
    clearStuckState,
    checkAutoFinish,
    latestPayloadRef,
    interruptHintRef,
    hintedVerseIndexRef,
    hintTranscriptSnapshotRef,
    hintPayloadSnapshotRef,
    hintPassedRef,
  } = useStuckDetection({
    onStuck,
    interruptHint,
    onAutoFinish,
    onTurnSettled,
    threshold: accuracyThreshold,
    ayahWordCounts,
    lastMatchedExpIdx: liveResults?.lastMatchedExpIdx ?? -1,
  });

  // ── useSpeechRecognition MUST come before useRecitationWorker ─────────────
  // transcriptRef is read by the wrappers handed to the worker, so it must exist
  // before the worker is created. Callbacks are defined after both hooks; they
  // read transcriptRef.current (always fresh, no stale closure).
  const dispatchLiveCompareRef = useRef(null);

  const onResultCallback = useCallback((combined) => {
    if (combined) dispatchLiveCompareRef.current?.(combined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSpeechStartCallback = useCallback(() => {
    clearStuckTimer();
    clearSilenceTimer();
    if (interruptHintRef.current) interruptHintRef.current();
  }, [clearStuckTimer, clearSilenceTimer, interruptHintRef]);

  /**
   * Speech stopped. Disarm the stuck countdown — the user is mid-thought, not
   * stuck — but deliberately leave the settle timer alone.
   *
   * It used to cancel the silence timer here, which is now the very signal we
   * rely on to end a turn: the absence of new results *is* the silence. Killing
   * it on speech end meant a completed recitation could never settle.
   */
  const onSpeechEndCallback = useCallback(() => {
    clearStuckTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearStuckTimer]);

  // Compute active verse index reactively from liveResults state.
  // Reading liveResults as *state* (not a ref snapshot) ensures this useMemo
  // re-evaluates on every worker update, so the grammar is re-scoped to the
  // currently active ayah instead of staying pinned to the full-chunk
  // vocabulary for the entire session.
  const activeVerseIndex = useMemo(() => {
    return computeActiveVerseIndex(liveResults?.verseStats, accuracyThreshold);
  }, [liveResults, accuracyThreshold]);

  // Build single-verse Vosk grammar restricted strictly to active Ayah words.
  // On session start (liveResults === null), activeVerseIndex=0, so we immediately
  // scope to the first verse's words without waiting for the first worker result.
  const grammar = useMemo(() => {
    if (activeChunkSlice && activeChunkSlice.length > 0) {
      const idx = Math.min(activeVerseIndex, activeChunkSlice.length - 1);
      const activeAyah = activeChunkSlice[idx];
      const singleGrammar = getSingleAyahGrammar(activeAyah, quranSimple);
      if (singleGrammar) return singleGrammar;
    }
    return buildVoskGrammar(expectedText);
  }, [activeChunkSlice, activeVerseIndex, quranSimple, expectedText]);

  const {
    isSupported,
    isListening,
    transcript,
    transcriptRef,
    startListening: startSTT,
    resumeListening: resumeSTT,
    stopRecognition,
    pauseRecognition,
    setIsListening,
    setTranscript,
    clearTranscript
  } = useSpeechRecognition({
    onResult: onResultCallback,
    onSpeechStart: onSpeechStartCallback,
    onSpeechEnd: onSpeechEndCallback,
    modelReady,
    modelStatus,
    ensureModelReady,
    grammar,
  });

  const {
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
    // Both wrappers read transcriptRef (a stable ref object) at call time, so
    // they stay referentially stable for the life of the hook — which is what
    // lets the worker be created exactly once instead of on every render.
    armStuckTimer: (verseIndex, _transcript, _delay, matchedIdx) => armStuckTimer(verseIndex, transcriptRef.current, _delay, matchedIdx),
    checkAutoFinish,
    armSettleTimer,
    latestPayloadRef,
    // The worker owns no liveResults state of its own — the setter is supplied
    // by this hook (see the ownership note above) so that activeVerseIndex and
    // grammar can be derived before useRecitationWorker is ever called.
    setLiveResults,
  });

  dispatchLiveCompareRef.current = dispatchLiveCompare;

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

  /**
   * Full reset of the current attempt — used when the user chooses "Try Again"
   * on a verse.
   *
   * `clearResults` alone was not enough: it reset the scoring but left the
   * accumulated transcript in place. The retry therefore re-compared the
   * *previous* attempt's words against the new expected text, which had been
   * re-sliced to start at the retried ayah. The DP then aligned old, already
   * recited text against a different expected sequence, so the verse appeared
   * to pass instantly and the retry prompt was worthless. Clearing the
   * transcript is what makes the retry mean anything.
   */
  const resetTurn = useCallback(() => {
    clearStuckState();
    clearWorkerResults();
    clearTranscript();
    if (liveDebounceRef.current) {
      clearTimeout(liveDebounceRef.current);
      liveDebounceRef.current = null;
    }
  }, [clearStuckState, clearWorkerResults, clearTranscript, liveDebounceRef]);

  // Resume without clearing stuck/worker state or resetting the transcript.
  // This preserves the full conversation history across temporary pauses
  // (e.g. hint playback) during the user's recitation turn.
  const resumeRecognition = useCallback(async (isActive) => {
    if (!isActive) return;
    await resumeSTT();
  }, [resumeSTT]);

  useEffect(() => {
    if (isActive) {
      startListening();
    } else {
      stopRecognition();
      clearStuckState();
      if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
      clearWorkerResults();
    }
  }, [isActive, startListening]);

   return {
     isSupported,
     isListening,
     transcript,
     liveResults,
     results,
     startListening,
     stopAndCheck,
     clearResults,
     resetTurn,
     pauseRecognition,
     resumeRecognition,
     notifyHintEnded,
     clearTranscript,
   };
};
