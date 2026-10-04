import { useState, useRef, useEffect, useCallback } from 'react';
import { computeActiveVerseIndex } from '../utils/verseProgress';

export const useRecitationWorker = ({
  expectedText,
  ayahWordCounts,
  threshold,
  hintedVerseIndexRef,
  hintTranscriptSnapshotRef,
  hintPayloadSnapshotRef,
  hintPassedRef,
  armStuckTimer,
  checkAutoFinish,
  armSettleTimer,
  latestPayloadRef,
  // Injected by useRecitationCheck, which owns the liveResults state. It must be
  // owned there because activeVerseIndex/grammar are derived from liveResults and
  // must be computed BEFORE useSpeechRecognition runs, i.e. before this hook is
  // called. setLiveResults is a stable useState setter, so it is safe to close over.
  setLiveResults,
}) => {
  const [results, setResults] = useState(null);
  const liveDebounceRef = useRef(null);
  const workerRef = useRef(null);
  const pendingIdRef = useRef(0);
  const workerCompletedIdRef = useRef(0);

  /**
   * The three behaviours the `onmessage` handler has to reach, mirrored into refs.
   *
   * The worker used to be created inside an effect keyed on `ayahWordCounts`,
   * `threshold` and the hint callbacks. `ayahWordCounts` is rebuilt by
   * `buildAyahWordCounts` on every render of PartnerSession, so that effect's
   * cleanup ran — `worker.terminate()` — and constructed a brand new Worker on
   * every single render. PartnerSession re-renders on each STT partial result
   * and each `liveResults` update, i.e. several times per second while the user
   * recites, so comparisons posted to the old worker were terminated
   * mid-flight and their RESULT messages never arrived. The live highlighting
   * froze or flickered and the turn appeared to hang.
   *
   * The worker is therefore created exactly once, and these refs keep the
   * handler pointed at the current callbacks without rebuilding it. They are
   * synced in an effect rather than during render: the rule exists because a
   * render can be thrown away before committing, and these are committed-work
   * inputs, not render output.
   *
   * The comparison *inputs* need no such treatment — they travel with each
   * message, so the handler uses the values the comparison was actually run
   * against instead of whatever the latest render happens to hold.
   */
  const armStuckTimerRef = useRef(armStuckTimer);
  const checkAutoFinishRef = useRef(checkAutoFinish);
  const armSettleTimerRef = useRef(armSettleTimer);

  useEffect(() => {
    armStuckTimerRef.current = armStuckTimer;
    checkAutoFinishRef.current = checkAutoFinish;
    armSettleTimerRef.current = armSettleTimer;
  });

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/recitationWorker.js', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event) => {
      const { type, payload, id, threshold } = event.data;

      if (type === 'RESULT' && id === pendingIdRef.current) {
        workerCompletedIdRef.current = id;
        latestPayloadRef.current = payload;

        // The threshold travels with the comparison rather than being read from
        // this closure, so a mid-session change to the accuracy target takes
        // effect immediately instead of one session-start render late.
        const activeThreshold = threshold ?? 0;

        // Record whether the user has since got the hinted verse right, so a
        // hint is never replayed for a verse that has already been corrected.
        if (hintedVerseIndexRef.current !== null && payload && payload.results) {
          const verseIdx = hintedVerseIndexRef.current;
          const rawStat = payload.verseStats?.[verseIdx];
          if (!hintPassedRef.current && rawStat && !rawStat.hasPending && rawStat.accuracy >= activeThreshold) {
            hintPassedRef.current = true;
          }
        }

        setLiveResults(payload);

        const verseStats = payload?.verseStats || [];
        const activeVerseIndex = computeActiveVerseIndex(verseStats, activeThreshold);

        // Stuck detection: arm only while the active verse has been attempted
        // and is still short of target, and disarm on every other result. The
        // hint is now reached through a real countdown rather than firing on
        // the first under-threshold result and talking over the user.
        let stuckVerseIndex = null;
        if (activeVerseIndex < verseStats.length) {
          const activeVerseStat = verseStats[activeVerseIndex];
          if (
            activeVerseStat?.hasStarted &&
            !activeVerseStat?.hasPending &&
            activeVerseStat?.accuracy < activeThreshold
          ) {
            stuckVerseIndex = activeVerseIndex;
          }
        }
        armStuckTimerRef.current?.(stuckVerseIndex);

        // Turn completion: the user has recited to the end of the portion once
        // the final ayah has been started with nothing left pending. Accuracy is
        // deliberately not part of this test — a below-target finish must be
        // *reported*, not silently swallowed, and not left hanging either.
        const lastStat = verseStats.length > 0 ? verseStats[verseStats.length - 1] : null;
        const reachedEndOfPortion = !!lastStat && !!lastStat.hasStarted && !lastStat.hasPending;

        checkAutoFinishRef.current?.(payload);
        armSettleTimerRef.current?.(reachedEndOfPortion);
      } else if (type === 'RESULT_FINAL' && id === pendingIdRef.current) {
        workerCompletedIdRef.current = id;
        setResults(payload);
        setLiveResults(payload);
      }
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  // Intentionally mount/unmount only. The handler reads all reactive inputs
  // through the refs above, so re-running this would only throw away in-flight
  // comparisons. `setLiveResults` is a stable useState setter.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dispatchLiveCompare = useCallback((spoken) => {
    if (!workerRef.current || !expectedText) return;
    if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
    liveDebounceRef.current = setTimeout(() => {
      const id = ++pendingIdRef.current;
      workerRef.current?.postMessage({
        type: 'COMPARE',
        expected: expectedText,
        spoken,
        id,
        ayahWordCounts,
        threshold,
      });
    }, 350);
  }, [expectedText, ayahWordCounts, threshold]);

  const dispatchFinalCompare = useCallback((spoken) => {
    if (liveDebounceRef.current) {
      clearTimeout(liveDebounceRef.current);
      liveDebounceRef.current = null;
    }
    if (workerRef.current && expectedText) {
      const id = ++pendingIdRef.current;
      workerRef.current.postMessage({
        type: 'COMPARE_FINAL',
        expected: expectedText,
        spoken: (spoken || '').trim(),
        id,
        ayahWordCounts,
        threshold,
      });
    }
  }, [expectedText, ayahWordCounts, threshold]);

  const clearWorkerResults = useCallback(() => {
    // Invalidate any comparison still in flight so a late RESULT cannot land
    // after the turn has been reset.
    pendingIdRef.current++;
    setResults(null);
    setLiveResults(null);
  }, [setLiveResults]);

  return {
    results,
    dispatchLiveCompare,
    dispatchFinalCompare,
    clearWorkerResults,
    pendingIdRef,
    workerCompletedIdRef,
    liveDebounceRef
  };
};
