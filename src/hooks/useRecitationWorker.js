import { useState, useRef, useEffect, useCallback } from 'react';
import { computeActiveVerseIndex } from '../utils/verseProgress';

const DEBUG = true;
const log = (...args) => { if (DEBUG) console.log('[RecitationWorker]', ...args); };

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
  latestPayloadRef,
  turn = 'user',
}) => {
  const [liveResults, setLiveResults] = useState(null);
  const [results, setResults] = useState(null);
  const liveDebounceRef = useRef(null);
  const workerRef = useRef(null);
  const pendingIdRef = useRef(0);
  const workerCompletedIdRef = useRef(0);
  const turnRef = useRef(turn);

  useEffect(() => { turnRef.current = turn; }, [turn]);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/recitationWorker.js', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = (event) => {
      const { type, payload, id } = event.data;
      if (type === 'RESULT' && id === pendingIdRef.current) {
        // Guard: ignore worker results if it's not the user's turn
        if (turnRef.current !== 'user') {
          log('Worker result ignored - not user turn');
          return;
        }

        workerCompletedIdRef.current = id;
        latestPayloadRef.current = payload;

        let processedPayload = payload;
        if (hintedVerseIndexRef.current !== null && payload && payload.results) {
          const verseIdx = hintedVerseIndexRef.current;
          if (hintPayloadSnapshotRef.current) {
            let passedWordCount = 0;
            const counts = ayahWordCounts || [];
            for (let i = 0; i < verseIdx; i++) passedWordCount += counts[i] || 0;
            for (let i = 0; i < passedWordCount && i < payload.results.length && i < hintPayloadSnapshotRef.current.results.length; i++) {
              payload.results[i] = hintPayloadSnapshotRef.current.results[i];
            }
            if (payload.verseStats && hintPayloadSnapshotRef.current.verseStats) {
              for (let i = 0; i < verseIdx && i < payload.verseStats.length && i < hintPayloadSnapshotRef.current.verseStats.length; i++) {
                payload.verseStats[i] = hintPayloadSnapshotRef.current.verseStats[i];
              }
            }
            const correct = payload.results.filter(r => r.status === 'correct').length;
            payload.accuracy = payload.results.length > 0 ? Math.round((correct / payload.results.length) * 100) : 100;
          }
          const rawStat = payload.verseStats?.[verseIdx];
          if (!hintPassedRef.current && rawStat && !rawStat.hasPending && rawStat.accuracy >= threshold) {
            hintPassedRef.current = true;
            log('Hint passed for verse:', verseIdx);
          }
          processedPayload = payload;
        }

        setLiveResults(processedPayload);

        const activeVerseIndex = computeActiveVerseIndex(processedPayload?.verseStats, threshold);
        const verseStats = processedPayload?.verseStats || [];
        
        if (activeVerseIndex < verseStats.length) {
          const activeVerseStat = verseStats[activeVerseIndex];
          if (activeVerseStat?.hasPending) {
            let plowedAhead = false;
            for (let i = activeVerseIndex + 1; i < verseStats.length; i++) {
              const stat = verseStats[i];
              const hasStarted = stat.hasStarted !== undefined ? stat.hasStarted : !stat.hasPending;
              if (hasStarted) { plowedAhead = true; break; }
            }
            if (plowedAhead) {
                log('Worker triggering hint (plowedAhead) for verse:', activeVerseIndex);
                triggerHint(activeVerseIndex, null, setLiveResults);
            }
          }
          // Note: The "below threshold" boundary gate check is now handled in
          // useRecitationCheck.js via a useEffect on liveResults for immediate
          // triggering when a verse boundary is crossed.
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
  }, [ayahWordCounts, checkAutoFinish, threshold, triggerHint, turn]);

  const dispatchLiveCompare = useCallback((spoken) => {
    if (!workerRef.current || !expectedText) return;
    if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
    liveDebounceRef.current = setTimeout(() => {
      const id = ++pendingIdRef.current;
      let spokenForWorker = spoken;
      if (hintedVerseIndexRef.current !== null && hintTranscriptSnapshotRef.current !== undefined) {
        const hintVerseIdx = hintedVerseIndexRef.current;
        const snapshot = hintTranscriptSnapshotRef.current;
        const newWords = spoken.length > snapshot.length ? spoken.slice(snapshot.length).trim() : '';
        const expWords = expectedText.trim().split(/\s+/).filter(Boolean);
        let passedWordCount = 0;
        for (let i = 0; i < hintVerseIdx; i++) passedWordCount += (ayahWordCounts || [])[i] || 0;
        const passedExpected = expWords.slice(0, passedWordCount).join(' ');
        spokenForWorker = passedExpected + (newWords ? ' ' + newWords : '');
      }
      workerRef.current.postMessage({
        type: 'COMPARE',
        expected: expectedText,
        spoken: spokenForWorker,
        id,
        ayahWordCounts,
      });
    }, 100); // Reduced from 350ms to 100ms for more immediate verse-boundary feedback
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
