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
  modelReady = false,
  modelStatus = 'idle',
  ensureModelReady = null,
  activeChunkSlice = [],
  quranSimple = null,
) => {
  const {
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
  const dispatchLiveCompareRef = useRef(null);

  // ── liveResults state is OWNED HERE, not inside useRecitationWorker ────────
  // `grammar` is an input to useSpeechRecognition, `grammar` needs
  // `activeVerseIndex`, and `activeVerseIndex` needs `liveResults` — but
  // liveResults used to be produced by the useRecitationWorker() call further
  // DOWN this function. Reading it from the memos above therefore hit the
  // temporal dead zone on every single render:
  //
  //   ReferenceError: Cannot access 'liveResults' before initialization
  //
  // which crashed PartnerSession and therefore the whole Musaffa route.
  //
  // Owning the state here breaks that render-order cycle: it is declared before
  // both memos, and useRecitationWorker only ever needs its setter — a stable
  // useState reference that it invokes from worker.onmessage — which is now
  // passed in as a parameter. No behaviour changes; only ownership does.
  const [liveResults, setLiveResults] = useState(null);

  const onResultCallback = useCallback((combined) => {
    if (combined) dispatchLiveCompareRef.current?.(combined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSpeechStartCallback = useCallback(() => {
    clearStuckTimer();
    clearSilenceTimer();
    if (interruptHintRef.current) interruptHintRef.current();
  }, [clearStuckTimer, clearSilenceTimer, interruptHintRef]);

  const onSpeechEndCallback = useCallback(() => {
    clearSilenceTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSilenceTimer]);

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
    // Pass transcriptRef (stable ref object) so the worker closure always reads
    // the current transcript without creating a stale-closure dependency.
    triggerHint: (idx) => triggerHint(idx, transcriptRef, setLiveResults),
    checkAutoFinish,
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
     pauseRecognition,
     resumeRecognition,
     notifyHintEnded,
     clearTranscript,
   };
};
