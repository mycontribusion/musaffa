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
  triggerHint,
  checkAutoFinish,
  latestPayloadRef
}) => {
  const [liveResults, setLiveResults] = useState(null);
  const [results, setResults] = useState(null);
  const liveDebounceRef = useRef(null);
  const workerRef = useRef(null);
  const pendingIdRef = useRef(0);
  const workerCompletedIdRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/recitationWorker.js', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = (event) => {
      const { type, payload, id } = event.data;
      if (type === 'RESULT' && id === pendingIdRef.current) {
        workerCompletedIdRef.current = id;
        latestPayloadRef.current = payload;

        let processedPayload = payload;
        if (hintedVerseIndexRef.current !== null && payload && payload.results) {
          const verseIdx = hintedVerseIndexRef.current;
          const rawStat = payload.verseStats?.[verseIdx];
          if (!hintPassedRef.current && rawStat && !rawStat.hasPending && rawStat.accuracy >= threshold) {
            hintPassedRef.current = true;
          }
        }

        setLiveResults(processedPayload);

        const activeVerseIndex = computeActiveVerseIndex(processedPayload?.verseStats, threshold);
        const verseStats = processedPayload?.verseStats || [];
        
        if (activeVerseIndex < verseStats.length) {
          const activeVerseStat = verseStats[activeVerseIndex];
          if (
            activeVerseStat?.hasStarted &&
            !activeVerseStat?.hasPending &&
            activeVerseStat?.accuracy < threshold
          ) {
            triggerHint(activeVerseIndex, null, setLiveResults);
          }
        }

        checkAutoFinish(processedPayload);
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
  // Refs (hintedVerseIndexRef, hintPassedRef, etc.) are intentionally excluded
  // from deps — they are stable mutable objects, not reactive values.
  }, [ayahWordCounts, checkAutoFinish, threshold, triggerHint]);

  const dispatchLiveCompare = useCallback((spoken) => {
    if (!workerRef.current || !expectedText) return;
    if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
    liveDebounceRef.current = setTimeout(() => {
      const id = ++pendingIdRef.current;
      let spokenForWorker = spoken;
      workerRef.current.postMessage({
        type: 'COMPARE',
        expected: expectedText,
        spoken: spokenForWorker,
        id,
        ayahWordCounts,
      });
    }, 350);
  // hintedVerseIndexRef and hintTranscriptSnapshotRef are refs — excluded from deps intentionally.
  }, [ayahWordCounts, expectedText]);

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
        spoken: spoken.trim(),
        id,
        ayahWordCounts,
      });
    }
  }, [ayahWordCounts, expectedText]);

  const clearWorkerResults = useCallback(() => {
    pendingIdRef.current++;
    setResults(null);
    setLiveResults(null);
  }, []);

  return {
    liveResults,
    setLiveResults,
    results,
    dispatchLiveCompare,
    dispatchFinalCompare,
    clearWorkerResults,
    pendingIdRef,
    workerCompletedIdRef,
    liveDebounceRef
  };
};
